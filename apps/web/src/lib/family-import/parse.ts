import type { CellValue, Workbook, Worksheet } from 'exceljs';

import {
  GENDER_LABELS,
  IMPORT_MAX_ROWS,
  PEOPLE_COLUMNS,
  PEOPLE_SHEET,
  PICK_SEPARATOR,
  WIFE_FIELDS,
  ageFromDates,
  looseKey,
  type ColumnSpec,
  type PeopleField,
  type WifeField,
} from '@/lib/family-import/columns';
import type { Gender } from '@/types/family-tree';
import type {
  ImportExistingPersonInput,
  ImportIssue,
  ImportPersonInput,
  ImportRelationshipInput,
  ImportSheet,
} from '@/types/family-import';

export type ParsedImport = {
  /** New people only; rows standing for stored members are in `existingPeople`. */
  people: ImportPersonInput[];
  relationships: ImportRelationshipInput[];
  existingPeople: ImportExistingPersonInput[];
  issues: ImportIssue[];
};

/** A cell as read from the sheet, keeping Excel dates apart from text. */
type RawCell = { text: string; date: Date | null; number: number | null };

const EMPTY_CELL: RawCell = { text: '', date: null, number: null };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDate(value: Date): string {
  return `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()}`;
}

/** Excel stores dates as days since 1899-12-30; such numbers show up when a date was pasted as a value. */
function serialToDate(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000);
}

function rawCell(value: CellValue): RawCell {
  if (value === null || value === undefined) return EMPTY_CELL;
  if (value instanceof Date) return { text: formatDate(value), date: value, number: null };
  if (typeof value === 'number') return { text: String(value), date: null, number: value };
  if (typeof value === 'string') return { text: value.trim(), date: null, number: null };
  if (typeof value === 'boolean') return { text: value ? 'Có' : 'Không', date: null, number: null };
  if ('richText' in value) {
    return {
      text: value.richText
        .map((part) => part.text)
        .join('')
        .trim(),
      date: null,
      number: null,
    };
  }
  if ('hyperlink' in value) return { text: String(value.text).trim(), date: null, number: null };
  if ('result' in value) return rawCell(value.result ?? null);
  return EMPTY_CELL;
}

function findSheet(workbook: Workbook, name: string): Worksheet | undefined {
  return workbook.worksheets.find((sheet) => looseKey(sheet.name) === looseKey(name));
}

class RowReader<Field extends string> {
  constructor(
    private readonly sheet: ImportSheet,
    private readonly row: number,
    private readonly cells: Map<Field, RawCell>,
    private readonly specs: Map<Field, ColumnSpec<Field>>,
    private readonly issues: ImportIssue[],
  ) {}

  private flag(field: Field, message: string): void {
    const header = this.specs.get(field)?.header ?? field;
    this.issues.push({ sheet: this.sheet, row: this.row, message: `Cột “${header}”: ${message}` });
  }

  private raw(field: Field): RawCell {
    return this.cells.get(field) ?? EMPTY_CELL;
  }

  /** A real date cell, or a number above `plainNumberLimit` read as an Excel date serial. */
  private asDate(cell: RawCell, plainNumberLimit: number): Date | null {
    if (cell.date) return cell.date;
    return cell.number !== null && cell.number > plainNumberLimit
      ? serialToDate(cell.number)
      : null;
  }

  /** Free-text date kept as typed (1890, 03/1920, 15/06/1950); bare years stay years. */
  date(field: Field): string | null {
    const date = this.asDate(this.raw(field), 2200);
    return date ? formatDate(date) : this.text(field);
  }

  text(field: Field): string | null {
    const value = this.raw(field).text;
    if (!value) {
      if (this.specs.get(field)?.required) this.flag(field, 'không được để trống.');
      return null;
    }
    const maxLength = this.specs.get(field)?.maxLength;
    if (maxLength !== undefined && value.length > maxLength) {
      this.flag(field, `dài quá ${maxLength} ký tự.`);
      return null;
    }
    return value;
  }

  int(field: Field): number | null {
    const cell = this.raw(field);
    if (!cell.text) return null;
    const value = cell.number ?? Number(cell.text.replace(',', '.'));
    const { min, max } = this.specs.get(field) ?? {};
    if (
      !Number.isInteger(value) ||
      (min !== undefined && value < min) ||
      (max !== undefined && value > max)
    ) {
      this.flag(field, `“${cell.text}” không phải số nguyên từ ${min ?? 0} đến ${max ?? '∞'}.`);
      return null;
    }
    return value;
  }

  choice<Value extends string>(field: Field, labels: Record<Value, string>): Value | null {
    const cell = this.raw(field);
    if (!cell.text) return null;
    const entry = (Object.entries(labels) as [Value, string][]).find(
      ([, label]) => looseKey(label) === looseKey(cell.text),
    );
    if (!entry) {
      this.flag(
        field,
        `“${cell.text}” không hợp lệ; hãy chọn ${Object.values(labels).join(', ')}.`,
      );
      return null;
    }
    return entry[0];
  }

  yesNo(field: Field): boolean | null {
    const cell = this.raw(field);
    if (!cell.text) return null;
    const key = looseKey(cell.text);
    if (['co', 'x', 'yes', 'con song'].includes(key)) return true;
    if (['khong', 'no', 'da mat'].includes(key)) return false;
    this.flag(field, `“${cell.text}” không hợp lệ; hãy điền Có hoặc Không.`);
    return null;
  }

  /** dd/mm for the lunar death day; a cell Excel already turned into a date reads day and month. */
  dayMonth(field: Field): { day: number; month: number } | null {
    const cell = this.raw(field);
    if (!cell.text) return null;
    const date = this.asDate(cell, 31);
    if (date) return { day: date.getUTCDate(), month: date.getUTCMonth() + 1 };
    const match = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})$/.exec(cell.text);
    const day = Number(match?.[1]);
    const month = Number(match?.[2]);
    if (!match || day < 1 || day > 30 || month < 1 || month > 12) {
      this.flag(field, `“${cell.text}” không hợp lệ; hãy điền ngày/tháng âm lịch dạng dd/mm.`);
      return null;
    }
    return { day, month };
  }
}

/** Rows searched for headers: the template puts group titles above them, older files do not. */
const HEADER_SEARCH_ROWS = 5;

/** The first row holding every required header, else row 1 so its gaps get reported. */
function findHeaders<Field extends string>(
  sheet: Worksheet,
  columns: ColumnSpec<Field>[],
): { headerRow: number; fieldByColumn: Map<number, Field>; missing: ColumnSpec<Field>[] } {
  const specByHeader = new Map(columns.map((column) => [looseKey(column.header), column]));
  let first: ReturnType<typeof findHeaders<Field>> | null = null;
  for (let headerRow = 1; headerRow <= HEADER_SEARCH_ROWS; headerRow += 1) {
    const fieldByColumn = new Map<number, Field>();
    sheet.getRow(headerRow).eachCell((cell, column) => {
      const spec = specByHeader.get(looseKey(rawCell(cell.value).text));
      if (spec) fieldByColumn.set(column, spec.field);
    });
    const found = new Set(fieldByColumn.values());
    const missing = columns.filter((column) => column.required && !found.has(column.field));
    const result = { headerRow, fieldByColumn, missing };
    if (missing.length === 0) return result;
    first ??= result;
  }
  return first!;
}

/** Reads a data sheet by header text and hands each non-blank row to `build`. */
function readSheet<Field extends string, Row>(
  sheet: Worksheet,
  sheetKey: ImportSheet,
  columns: ColumnSpec<Field>[],
  issues: ImportIssue[],
  build: (reader: RowReader<Field>, row: number) => Row | null,
): Row[] {
  const { headerRow, fieldByColumn, missing } = findHeaders(sheet, columns);
  if (missing.length > 0) {
    issues.push({
      sheet: sheetKey,
      row: headerRow,
      message: `Thiếu cột bắt buộc: ${missing.map((column) => column.header).join(', ')}. Hãy dùng file mẫu.`,
    });
    return [];
  }

  const specs = new Map(columns.map((column) => [column.field, column]));
  const rows: Row[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const cells = new Map<Field, RawCell>();
    for (const [column, field] of fieldByColumn)
      cells.set(field, rawCell(row.getCell(column).value));
    if ([...cells.values()].every((cell) => !cell.text)) return;
    const built = build(new RowReader(sheetKey, rowNumber, cells, specs, issues), rowNumber);
    if (built) rows.push(built);
  });
  return rows;
}

function codeKey(code: string | null): string {
  return (code ?? '').trim().toLocaleUpperCase('vi');
}

/** A wife picked on her husband's row; the wife column she sits in is her wife order. */
type WifeLink = {
  row: number;
  husbandCode: string;
  wifeCode: string;
  field: WifeField;
  wifeOrder: number;
};

function headerOf(field: PeopleField): string {
  return PEOPLE_COLUMNS.find((column) => column.field === field)?.header ?? field;
}

/** Turns a picked “code - name” back into the code, but only when that code is in the file. */
function resolvePickedCodes(people: ImportPersonInput[], links: WifeLink[]): void {
  const codes = new Set(people.map((person) => codeKey(person.code)));
  const resolve = (value: string): string => {
    if (codes.has(codeKey(value))) return value;
    const cut = value.indexOf(PICK_SEPARATOR);
    const code = cut > 0 ? value.slice(0, cut).trim() : value;
    return codes.has(codeKey(code)) ? code : value;
  };
  for (const person of people) {
    if (person.fatherCode) person.fatherCode = resolve(person.fatherCode);
    if (person.motherCode) person.motherCode = resolve(person.motherCode);
  }
  for (const link of links) link.wifeCode = resolve(link.wifeCode);
}

/** Fills a blank gender from a parent role: whoever is named as a father is male, and so on. */
function inferParentGenders(people: ImportPersonInput[]): void {
  const role = new Map<string, Gender>();
  for (const person of people) {
    if (person.fatherCode) role.set(codeKey(person.fatherCode), 'MALE');
    if (person.motherCode) role.set(codeKey(person.motherCode), 'FEMALE');
  }
  for (const person of people) {
    if (person.gender === 'UNKNOWN') person.gender = role.get(codeKey(person.code)) ?? 'UNKNOWN';
  }
}

/**
 * Turns wife links into couples, as the tree designer allows them: only a man takes wives, and a
 * blank gender on either side is filled in from that role.
 */
function buildRelationships(
  people: ImportPersonInput[],
  links: WifeLink[],
  issues: ImportIssue[],
): ImportRelationshipInput[] {
  const byCode = new Map(people.map((person) => [codeKey(person.code), person]));
  const couples = new Map<string, WifeLink>();
  for (const link of links) {
    const flag = (message: string): void => {
      issues.push({
        sheet: 'people',
        row: link.row,
        message: `Cột “${headerOf(link.field)}”: ${message}`,
      });
    };
    const husband = byCode.get(codeKey(link.husbandCode));
    const wife = byCode.get(codeKey(link.wifeCode));
    if (!husband) continue;
    if (husband.gender !== 'MALE' && husband.gender !== 'UNKNOWN') {
      flag('chỉ khai vợ ở dòng của người chồng (giới tính Nam).');
      continue;
    }
    if (!wife) {
      flag(`không có thành viên nào mang Mã “${link.wifeCode}”.`);
      continue;
    }
    if (wife === husband) {
      flag('không thể chọn chính người này.');
      continue;
    }
    if (wife.gender !== 'FEMALE' && wife.gender !== 'UNKNOWN') {
      flag(`${wife.name} không phải nữ nên không thể là vợ.`);
      continue;
    }
    const key = codeKey(husband.code) + '|' + codeKey(wife.code);
    const known = couples.get(key);
    if (known) {
      flag(`${wife.name} đã được chọn ở cột “${headerOf(known.field)}”.`);
      continue;
    }
    husband.gender = 'MALE';
    wife.gender = 'FEMALE';
    couples.set(key, link);
  }
  return [...couples.values()].map((link) => ({
    row: link.row,
    husbandCode: link.husbandCode,
    wifeCode: link.wifeCode,
    wifeOrder: link.wifeOrder,
    status: null,
  }));
}

/** A stored member's row keeps only what links rows; the rest of it is never sent back. */
function existingPerson(read: RowReader<PeopleField>, row: number): ImportPersonInput {
  return {
    row,
    code: read.text('code') ?? '',
    name: read.text('name') ?? '',
    gender: read.choice<Gender>('gender', GENDER_LABELS) ?? 'UNKNOWN',
    fatherCode: read.text('fatherCode'),
    motherCode: read.text('motherCode'),
    generation: null,
    orderInFamily: null,
    honorific: null,
    nickname: null,
    courtesyName: null,
    birthDate: null,
    deathDate: null,
    isAlive: null,
    lunarDeathDay: null,
    lunarDeathMonth: null,
    ageAtDeath: null,
    burialPlace: null,
    worshipPlace: null,
    phone: null,
    education: null,
    occupation: null,
    hometown: null,
    currentAddress: null,
    biography: null,
  };
}

function parsePeople(
  sheet: Worksheet,
  issues: ImportIssue[],
): { people: ImportPersonInput[]; links: WifeLink[]; existingIds: Map<ImportPersonInput, string> } {
  const existingIds = new Map<ImportPersonInput, string>();
  const rows = readSheet(sheet, 'people', PEOPLE_COLUMNS, issues, (read, row) => {
    const before = issues.length;
    const personId = read.text('personId');
    const links = (husbandCode: string): WifeLink[] =>
      WIFE_FIELDS.flatMap((field, index): WifeLink[] => {
        const wifeCode = read.text(field);
        return wifeCode ? [{ row, husbandCode, wifeCode, field, wifeOrder: index + 1 }] : [];
      });
    if (personId) {
      const person = existingPerson(read, row);
      existingIds.set(person, personId);
      return issues.length === before ? { person, links: links(person.code) } : null;
    }
    const lunar = read.dayMonth('lunarDeath');
    const birthDate = read.date('birthDate');
    const deathDate = read.date('deathDate');
    const person: ImportPersonInput = {
      row,
      code: read.text('code') ?? '',
      name: read.text('name') ?? '',
      gender: read.choice<Gender>('gender', GENDER_LABELS) ?? 'UNKNOWN',
      fatherCode: read.text('fatherCode'),
      motherCode: read.text('motherCode'),
      generation: read.int('generation'),
      orderInFamily: read.int('orderInFamily'),
      honorific: read.text('honorific'),
      nickname: read.text('nickname'),
      courtesyName: read.text('courtesyName'),
      birthDate,
      deathDate,
      isAlive: read.yesNo('isAlive'),
      lunarDeathDay: lunar?.day ?? null,
      lunarDeathMonth: lunar?.month ?? null,
      ageAtDeath: read.int('ageAtDeath') ?? ageFromDates(birthDate, deathDate),
      burialPlace: read.text('burialPlace'),
      worshipPlace: read.text('worshipPlace'),
      phone: read.text('phone'),
      education: read.text('education'),
      occupation: read.text('occupation'),
      hometown: read.text('hometown'),
      currentAddress: read.text('currentAddress'),
      biography: read.text('biography'),
    };
    const wives = links(person.code);
    return issues.length === before ? { person, links: wives } : null;
  });
  return {
    people: rows.map((row) => row.person),
    links: rows.flatMap((row) => row.links),
    existingIds,
  };
}

/** Parses an uploaded .xlsx in the browser; the API re-checks everything that links rows. */
export async function parseImportFile(file: File): Promise<ParsedImport> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return {
      people: [],
      relationships: [],
      existingPeople: [],
      issues: [
        {
          sheet: 'people',
          row: null,
          message: 'Không đọc được file. Hãy chọn file Excel .xlsx (không hỗ trợ .xls hay .csv).',
        },
      ],
    };
  }

  const issues: ImportIssue[] = [];
  const peopleSheet = findSheet(workbook, PEOPLE_SHEET);
  if (!peopleSheet) {
    issues.push({
      sheet: 'people',
      row: null,
      message: `Không tìm thấy sheet “${PEOPLE_SHEET}”. Hãy dùng file mẫu.`,
    });
    return { people: [], relationships: [], existingPeople: [], issues };
  }
  const { people: everyone, links, existingIds } = parsePeople(peopleSheet, issues);
  resolvePickedCodes(everyone, links);
  inferParentGenders(everyone);
  const relationships = buildRelationships(everyone, links, issues);
  const people = everyone.filter((person) => !existingIds.has(person));
  const existingPeople = [...existingIds].map(([person, personId]) => ({
    row: person.row,
    code: person.code,
    personId,
  }));

  if (people.length === 0 && issues.length === 0) {
    const message =
      existingPeople.length > 0 && relationships.length === 0
        ? `Chưa có người mới nào; hãy thêm người vào các dòng trống bên dưới sheet “${PEOPLE_SHEET}”.`
        : existingPeople.length === 0
          ? `Sheet “${PEOPLE_SHEET}” chưa có dòng dữ liệu nào.`
          : null;
    if (message) issues.push({ sheet: 'people', row: null, message });
  }
  if (people.length > IMPORT_MAX_ROWS) {
    issues.push({
      sheet: 'people',
      row: null,
      message: `Mỗi lần chỉ nhập được tối đa ${IMPORT_MAX_ROWS} người; file có ${people.length} người.`,
    });
  }
  if (relationships.length > IMPORT_MAX_ROWS) {
    issues.push({
      sheet: 'people',
      row: null,
      message: `Mỗi lần chỉ nhập được tối đa ${IMPORT_MAX_ROWS} cặp vợ chồng.`,
    });
  }
  return { people, relationships, existingPeople, issues };
}
