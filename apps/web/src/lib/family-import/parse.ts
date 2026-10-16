import type { CellValue, Workbook, Worksheet } from 'exceljs';

import {
  GENDER_LABELS,
  IMPORT_MAX_ROWS,
  PEOPLE_COLUMNS,
  PEOPLE_SHEET,
  RELATIONSHIP_COLUMNS,
  RELATIONSHIPS_SHEET,
  STATUS_LABELS,
  looseKey,
  type ColumnSpec,
} from '@/lib/family-import/columns';
import type { Gender } from '@/types/family-tree';
import type {
  ImportIssue,
  ImportPersonInput,
  ImportRelationshipInput,
  ImportSheet,
  RelationshipStatus,
} from '@/types/family-import';

export type ParsedImport = {
  people: ImportPersonInput[];
  relationships: ImportRelationshipInput[];
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

/** Reads a data sheet by header text and hands each non-blank row to `build`. */
function readSheet<Field extends string, Row>(
  sheet: Worksheet,
  sheetKey: ImportSheet,
  columns: ColumnSpec<Field>[],
  issues: ImportIssue[],
  build: (reader: RowReader<Field>, row: number) => Row | null,
): Row[] {
  const specByHeader = new Map(columns.map((column) => [looseKey(column.header), column]));
  const fieldByColumn = new Map<number, Field>();
  sheet.getRow(1).eachCell((cell, column) => {
    const spec = specByHeader.get(looseKey(rawCell(cell.value).text));
    if (spec) fieldByColumn.set(column, spec.field);
  });
  const found = new Set(fieldByColumn.values());
  const missing = columns.filter((column) => column.required && !found.has(column.field));
  if (missing.length > 0) {
    issues.push({
      sheet: sheetKey,
      row: 1,
      message: `Thiếu cột bắt buộc: ${missing.map((column) => column.header).join(', ')}. Hãy dùng file mẫu.`,
    });
    return [];
  }

  const specs = new Map(columns.map((column) => [column.field, column]));
  const rows: Row[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = new Map<Field, RawCell>();
    for (const [column, field] of fieldByColumn)
      cells.set(field, rawCell(row.getCell(column).value));
    if ([...cells.values()].every((cell) => !cell.text)) return;
    const built = build(new RowReader(sheetKey, rowNumber, cells, specs, issues), rowNumber);
    if (built) rows.push(built);
  });
  return rows;
}

/** Fills a blank gender from the role a person plays: father or husband is male, and so on. */
function inferGenders(people: ImportPersonInput[], relationships: ImportRelationshipInput[]): void {
  const role = new Map<string, Gender>();
  const key = (code: string | null): string => (code ?? '').trim().toLocaleUpperCase('vi');
  for (const person of people) {
    if (person.fatherCode) role.set(key(person.fatherCode), 'MALE');
    if (person.motherCode) role.set(key(person.motherCode), 'FEMALE');
  }
  for (const relationship of relationships) {
    role.set(key(relationship.husbandCode), 'MALE');
    role.set(key(relationship.wifeCode), 'FEMALE');
  }
  for (const person of people) {
    if (person.gender === 'UNKNOWN') person.gender = role.get(key(person.code)) ?? 'UNKNOWN';
  }
}

function parsePeople(sheet: Worksheet, issues: ImportIssue[]): ImportPersonInput[] {
  return readSheet(sheet, 'people', PEOPLE_COLUMNS, issues, (read, row) => {
    const before = issues.length;
    const lunar = read.dayMonth('lunarDeath');
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
      birthDate: read.date('birthDate'),
      deathDate: read.date('deathDate'),
      isAlive: read.yesNo('isAlive'),
      lunarDeathDay: lunar?.day ?? null,
      lunarDeathMonth: lunar?.month ?? null,
      ageAtDeath: read.int('ageAtDeath'),
      burialPlace: read.text('burialPlace'),
      worshipPlace: read.text('worshipPlace'),
      phone: read.text('phone'),
      education: read.text('education'),
      occupation: read.text('occupation'),
      hometown: read.text('hometown'),
      currentAddress: read.text('currentAddress'),
      biography: read.text('biography'),
    };
    return issues.length === before ? person : null;
  });
}

function parseRelationships(sheet: Worksheet, issues: ImportIssue[]): ImportRelationshipInput[] {
  return readSheet(sheet, 'relationships', RELATIONSHIP_COLUMNS, issues, (read, row) => {
    const before = issues.length;
    const relationship: ImportRelationshipInput = {
      row,
      husbandCode: read.text('husbandCode') ?? '',
      wifeCode: read.text('wifeCode') ?? '',
      wifeOrder: read.int('wifeOrder'),
      status: read.choice<RelationshipStatus>('status', STATUS_LABELS),
    };
    return issues.length === before ? relationship : null;
  });
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
    return { people: [], relationships: [], issues };
  }
  const people = parsePeople(peopleSheet, issues);
  const relationshipSheet = findSheet(workbook, RELATIONSHIPS_SHEET);
  const relationships = relationshipSheet ? parseRelationships(relationshipSheet, issues) : [];

  if (people.length === 0 && issues.length === 0) {
    issues.push({
      sheet: 'people',
      row: null,
      message: `Sheet “${PEOPLE_SHEET}” chưa có dòng dữ liệu nào.`,
    });
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
      sheet: 'relationships',
      row: null,
      message: `Mỗi lần chỉ nhập được tối đa ${IMPORT_MAX_ROWS} cặp vợ chồng.`,
    });
  }
  inferGenders(people, relationships);
  return { people, relationships, issues };
}
