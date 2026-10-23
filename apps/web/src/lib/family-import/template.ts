import type { Border, Borders, DataValidation, Fill, Workbook, Worksheet } from 'exceljs';

import {
  GENDER_LABELS,
  GUIDE_SHEET,
  PEOPLE_COLUMNS,
  PEOPLE_SHEET,
  PICK_SEPARATOR,
  ageFromDates,
  YES_NO_LABELS,
  headerLabel,
  type ColumnKind,
  type ColumnSpec,
  type PeopleField,
  WIFE_FIELDS,
} from '@/lib/family-import/columns';

/** One row of the people sheet; picker fields hold plain codes, turned into labels when written. */
export type SheetPerson = Partial<Record<PeopleField, string>>;

/** Rows that get dropdowns and borders at least, and the blank rows left under a member list. */
const MIN_ROWS = 2000;
const SPARE_ROWS = 1000;

/** Row 1 holds the group bands, row 2 the column headers the parser matches. */
const HEADER_ROW = 2;
const FIRST_DATA_ROW = HEADER_ROW + 1;

/** How many data rows the sheet is formatted for: `lastRow` is the last one. */
type Layout = { rows: number; lastRow: number };

function layoutFor(filledRows: number): Layout {
  const rows = Math.max(MIN_ROWS, filledRows + SPARE_ROWS);
  return { rows, lastRow: FIRST_DATA_ROW + rows - 1 };
}

/** Hidden sheet that turns the member list into the “code - name” pickers. */
const PICKER_SHEET = 'Danh sách chọn';

const BRAND = 'FF7A4A1E';
const REQUIRED_TEXT = 'FF9F2D20';
const STRIPE = 'FFFAF6EF';
const EXISTING_FILL = 'FFEFEBE4';

const GRID: Partial<Border> = { style: 'thin', color: { argb: 'FFD9D0C3' } };
const GROUP_EDGE: Partial<Border> = { style: 'medium', color: { argb: 'FF8C7A66' } };

type ColumnGroup = { from: string; title: string; band: string; header: string };

const PEOPLE_GROUPS: ColumnGroup[] = [
  { from: 'code', title: 'Thông tin chính', band: BRAND, header: 'FFF3E6D3' },
  { from: 'honorific', title: 'Tên gọi', band: 'FF8A5A12', header: 'FFF5E7CC' },
  { from: 'fatherCode', title: 'Quan hệ gia đình', band: 'FF2F5D50', header: 'FFDCEBE4' },
  { from: 'wife1Code', title: 'Hôn nhân', band: 'FF8C3B5A', header: 'FFF3DFE7' },
  { from: 'birthDate', title: 'Sinh – mất', band: 'FF54467A', header: 'FFE6E1F0' },
  { from: 'burialPlace', title: 'Thờ cúng', band: 'FF6B3A3A', header: 'FFF0DEDE' },
  { from: 'phone', title: 'Liên hệ và tiểu sử', band: 'FF2F4F6F', header: 'FFDDE6EF' },
];

const CHOICES: Partial<Record<ColumnKind, readonly string[]>> = {
  gender: Object.values(GENDER_LABELS),
  yesNo: YES_NO_LABELS,
};

/** Shown as Excel's input message when a free-text date cell is selected (max 255 characters). */
const FORMAT_HINTS: Partial<Record<ColumnKind, string>> = {
  date: 'Nhập theo dạng dd/mm/yyyy (ví dụ 15/06/1950). Không rõ ngày thì nhập mm/yyyy (06/1950) hoặc chỉ năm (1950).',
  lunarDay: 'Ngày/tháng âm lịch dạng dd/mm, ví dụ 15/8 (rằm tháng Tám).',
};

/** A member's cell on the data sheet, as a picker-sheet formula reference. */
type CellRef = (field: PeopleField, row: number) => string;

/**
 * A picker lists the members `condition` accepts, in three helper columns from `firstColumn`;
 * `accepts` mirrors it for the cached results written with the rows.
 */
type Picker = {
  firstColumn: number;
  title: string;
  condition: (cell: CellRef, row: number, layout: Layout) => string;
  accepts: (person: SheetPerson, people: SheetPerson[]) => boolean;
};

const MAN_PICKER: Picker = {
  firstColumn: 1,
  title: 'Cha',
  condition: (cell, row) => `${cell('gender', row)}<>"${GENDER_LABELS.FEMALE}"`,
  accepts: (person) => person.gender !== GENDER_LABELS.FEMALE,
};

const MOTHER_PICKER: Picker = {
  firstColumn: 4,
  title: 'Mẹ',
  condition: (cell, row) => `${cell('gender', row)}<>"${GENDER_LABELS.MALE}"`,
  accepts: (person) => person.gender !== GENDER_LABELS.MALE,
};

/**
 * Wives come from outside the lineage, as in the tree designer: women with no parents in the
 * file, and not yet picked as anyone's wife. A husband's row so stops offering his own mother once
 * his father's row has picked her.
 */
const WIFE_PICKER: Picker = {
  firstColumn: 7,
  title: 'Vợ',
  condition: (cell, row, layout) => {
    const [first, last] = [WIFE_FIELDS[0], WIFE_FIELDS.at(-1)!].map((field) =>
      columnLetter(columnIndex(field) + 1),
    );
    const picked = `${sheetRef(PEOPLE_SHEET)}!$${first}$${FIRST_DATA_ROW}:$${last}$${layout.lastRow}`;
    const label = `${cell('code', row)}&"${PICK_SEPARATOR}"&${cell('name', row)}`;
    return [
      `${cell('gender', row)}<>"${GENDER_LABELS.MALE}"`,
      `TRIM(${cell('fatherCode', row)})=""`,
      `TRIM(${cell('motherCode', row)})=""`,
      `COUNTIF(${picked},${label})=0`,
    ].join(',');
  },
  accepts: (person, people) =>
    person.gender !== GENDER_LABELS.MALE &&
    !person.fatherCode &&
    !person.motherCode &&
    !people.some((husband) => WIFE_FIELDS.some((field) => husband[field] === person.code)),
};

const PICKERS: Partial<Record<string, Picker>> = {
  fatherCode: MAN_PICKER,
  motherCode: MOTHER_PICKER,
  ...Object.fromEntries(WIFE_FIELDS.map((field) => [field, WIFE_PICKER])),
};

const EXAMPLE_PEOPLE: SheetPerson[] = [
  {
    code: '1',
    name: 'Nguyễn Văn An',
    gender: 'Nam',
    generation: '1',
    orderInFamily: '1',
    wife1Code: '2',
    birthDate: '1890',
    isAlive: 'Không',
    deathDate: '1960',
    lunarDeath: '15/8',
    honorific: 'Cụ',
  },
  {
    code: '2',
    name: 'Trần Thị Bình',
    gender: 'Nữ',
    birthDate: '1895',
    isAlive: 'Không',
    deathDate: '1970',
    lunarDeath: '2/3',
    honorific: 'Cụ bà',
  },
  {
    code: '3',
    name: 'Nguyễn Văn Cường',
    gender: 'Nam',
    fatherCode: '1',
    motherCode: '2',
    orderInFamily: '1',
    wife1Code: '4',
    wife2Code: '6',
    birthDate: '1920',
    isAlive: 'Không',
    deathDate: '1990',
    honorific: 'Ông',
  },
  { code: '4', name: 'Lê Thị Dung', gender: 'Nữ', birthDate: '1925', honorific: 'Bà' },
  {
    code: '5',
    name: 'Nguyễn Văn Đức',
    gender: 'Nam',
    fatherCode: '3',
    motherCode: '4',
    orderInFamily: '1',
    birthDate: '15/06/1950',
    isAlive: 'Có',
  },
  { code: '6', name: 'Phạm Thị Em', gender: 'Nữ', birthDate: '1930', honorific: 'Bà' },
];

// Pre-filled rows so the blank template is not empty: a couple and their son, linked by code.
const SAMPLE_PEOPLE = EXAMPLE_PEOPLE.slice(0, 3);

const SAMPLE_FONT = { italic: true, color: { argb: 'FF6B7280' } } as const;

/** What the filled rows are: the blank template's samples, or members already in the tree. */
type RowKind = 'sample' | 'existing';

const columnIndex = (field: PeopleField): number =>
  PEOPLE_COLUMNS.findIndex((column) => column.field === field);
const CODE_INDEX = columnIndex('code');
const NAME_INDEX = columnIndex('name');
const GENDER_INDEX = columnIndex('gender');
const BIRTH_INDEX = columnIndex('birthDate');
const DEATH_INDEX = columnIndex('deathDate');
const LUNAR_INDEX = columnIndex('lunarDeath');

/** Examples leave Hưởng thọ out; it is computed the way the template's formula does. */
function exampleValue(person: SheetPerson, field: PeopleField): string {
  if (field !== 'ageAtDeath') return person[field] ?? '';
  const age = ageFromDates(person.birthDate ?? null, person.deathDate ?? null);
  return age === null ? '' : String(age);
}

function cellsOf(person: SheetPerson, columns: ColumnSpec<PeopleField>[]): string[] {
  return columns.map((column) => exampleValue(person, column.field));
}

/** A date cell's year: typed text ends in it, a bare number up to 2200 is one, larger is a date. */
function yearFormula(ref: string): string {
  return `IF(ISNUMBER(${ref}),IF(${ref}>2200,YEAR(${ref}),${ref}),IFERROR(VALUE(RIGHT(TRIM(${ref}),4)),""))`;
}

/** Hưởng thọ = death year − birth year, blank unless both years give an age from 0 to 150. */
function ageFormula(row: number): string {
  const born = yearFormula(columnLetter(BIRTH_INDEX + 1) + row);
  const died = yearFormula(columnLetter(DEATH_INDEX + 1) + row);
  const age = `(${died}-${born})`;
  return `IFERROR(IF(AND(${age}>=0,${age}<=150),${age},""),"")`;
}

/** “Không” as soon as a death date or death anniversary is filled; picking a value replaces it. */
function aliveFormula(row: number): string {
  const died = columnLetter(DEATH_INDEX + 1) + row;
  const lunar = columnLetter(LUNAR_INDEX + 1) + row;
  return `IF(OR(TRIM(${died})<>"",TRIM(${lunar})<>""),"Không","")`;
}

/** Columns that compute themselves on blank rows: the formula, and its value for written rows. */
const FORMULA_COLUMNS: Partial<
  Record<
    PeopleField,
    { formula: (row: number) => string; result: (values: string[]) => string | number }
  >
> = {
  ageAtDeath: {
    formula: ageFormula,
    result: (values) =>
      ageFromDates(values[BIRTH_INDEX] ?? null, values[DEATH_INDEX] ?? null) ?? '',
  },
  isAlive: {
    formula: aliveFormula,
    result: (values) => (values[DEATH_INDEX] || values[LUNAR_INDEX] ? 'Không' : ''),
  },
};

function solid(argb: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function box(left: Partial<Border> = GRID): Partial<Borders> {
  return { top: GRID, bottom: GRID, right: GRID, left };
}

/** 1 → A, 27 → AA. */
function columnLetter(index: number): string {
  let rest = index;
  let letters = '';
  while (rest > 0) {
    const digit = (rest - 1) % 26;
    letters = String.fromCharCode(65 + digit) + letters;
    rest = Math.floor((rest - 1) / 26);
  }
  return letters;
}

function sheetRef(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

function pickLabel(person: SheetPerson): string {
  return `${person.code}${PICK_SEPARATOR}${person.name}`;
}

/** A cell on the picker sheet kept blank: the wife list a woman's row offers. */
const EMPTY_LIST = `${sheetRef(PICKER_SHEET)}!$K$1`;

function isWifeField(field: string): boolean {
  return (WIFE_FIELDS as readonly string[]).includes(field);
}

/** The list a picker cell offers: the filled part of its helper column, without trailing blanks. */
function pickerFormula(picker: Picker, layout: Layout): string {
  const list = sheetRef(PICKER_SHEET);
  const flag = columnLetter(picker.firstColumn);
  const label = columnLetter(picker.firstColumn + 2);
  return `OFFSET(${list}!$${label}$2,0,0,MAX(1,COUNT(${list}!$${flag}$2:$${flag}$${layout.rows + 1})),1)`;
}

/**
 * Per picker: a flag column holding the member's row when eligible, the flags sorted, and the
 * “code - name” label. Cached results cover the filled rows for apps that skip recalculating.
 */
function addPickerSheet(workbook: Workbook, people: SheetPerson[], layout: Layout): void {
  const sheet = workbook.addWorksheet(PICKER_SHEET, { state: 'hidden' });
  const data = sheetRef(PEOPLE_SHEET);
  const code = columnLetter(CODE_INDEX + 1);
  const name = columnLetter(NAME_INDEX + 1);
  const cell: CellRef = (field, row) => `${data}!$${columnLetter(columnIndex(field) + 1)}${row}`;

  for (const picker of [MAN_PICKER, MOTHER_PICKER, WIFE_PICKER]) {
    const [flag, sorted] = [0, 1].map((offset) => columnLetter(picker.firstColumn + offset));
    const isEligible = (person: SheetPerson | undefined): boolean =>
      person !== undefined && Boolean(person.code) && picker.accepts(person, people);
    const eligible = people
      .map((person, index) => ({ person, row: FIRST_DATA_ROW + index }))
      .filter(({ person }) => isEligible(person));

    sheet.getRow(1).getCell(picker.firstColumn).value = picker.title;
    for (let offset = 0; offset < layout.rows; offset += 1) {
      const row = sheet.getRow(offset + 2);
      const dataRow = FIRST_DATA_ROW + offset;
      const pick = eligible[offset];
      const condition = `AND(TRIM(${cell('code', dataRow)})<>"",${picker.condition(cell, dataRow, layout)})`;
      row.getCell(picker.firstColumn).value = {
        formula: `IF(${condition},ROW(${data}!$${code}${dataRow}),"")`,
        result: isEligible(people[offset]) ? dataRow : '',
      };
      row.getCell(picker.firstColumn + 1).value = {
        formula: `IFERROR(SMALL($${flag}$2:$${flag}$${layout.rows + 1},ROW()-1),"")`,
        result: pick ? pick.row : '',
      };
      row.getCell(picker.firstColumn + 2).value = {
        formula: `IF(${sorted}${offset + 2}="","",INDEX(${data}!$${code}:$${code},${sorted}${offset + 2})&"${PICK_SEPARATOR}"&INDEX(${data}!$${name}:$${name},${sorted}${offset + 2}))`,
        result: pick ? pickLabel(pick.person) : '',
      };
    }
  }
}

/**
 * Rows as cell text: picked members become “code - name”, the way the pickers fill them, and
 * picks of people left out of the rows are dropped so the file still imports cleanly.
 */
function rowCells(people: SheetPerson[]): string[][] {
  const byCode = new Map(people.map((person) => [person.code, person]));
  return people.map((person) =>
    PEOPLE_COLUMNS.map((column) => {
      const value = person[column.field] ?? '';
      if (!PICKERS[column.field] || value === '') return value;
      const picked = byCode.get(value);
      return picked ? pickLabel(picked) : '';
    }),
  );
}

/**
 * Excel's rule for a data column: a picker, a fixed list, an integer range or a format hint.
 * Parent pickers raise no error alert, so a typed code is still accepted beside a picked label.
 */
function columnValidation(column: ColumnSpec<string>, layout: Layout): DataValidation | null {
  const picker = PICKERS[column.field];
  if (picker && isWifeField(column.field)) {
    // A woman's row gets an empty list, and the stop alert rejects anything typed there instead.
    const gender = `$${columnLetter(GENDER_INDEX + 1)}${FIRST_DATA_ROW}`;
    return {
      type: 'list',
      allowBlank: true,
      formulae: [
        `IF(${gender}="${GENDER_LABELS.FEMALE}",${EMPTY_LIST},${pickerFormula(picker, layout)})`,
      ],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: column.header,
      error:
        'Hãy chọn người vợ trong danh sách. Dòng có giới tính Nữ không khai vợ; vợ chỉ khai ở dòng của người chồng.',
    };
  }
  if (picker) {
    return {
      type: 'list',
      allowBlank: true,
      formulae: [pickerFormula(picker, layout)],
      showErrorMessage: false,
    };
  }
  const choices = CHOICES[column.kind];
  if (choices) {
    return {
      type: 'list',
      allowBlank: true,
      formulae: ['"' + choices.join(',') + '"'],
      showErrorMessage: true,
      errorTitle: column.header,
      error: 'Hãy chọn một giá trị trong danh sách: ' + choices.join(', ') + '.',
    };
  }
  if (column.kind === 'int' && column.min !== undefined && column.max !== undefined) {
    return {
      type: 'whole',
      operator: 'between',
      allowBlank: true,
      formulae: [column.min, column.max],
      showErrorMessage: true,
      errorTitle: column.header,
      error: `Hãy nhập số nguyên từ ${column.min} đến ${column.max}.`,
    };
  }
  const hint = FORMAT_HINTS[column.kind];
  if (hint) {
    // Always-true rule: only there so Excel shows the format hint when the cell is selected.
    return {
      type: 'custom',
      allowBlank: true,
      formulae: ['TRUE'],
      showInputMessage: true,
      promptTitle: column.header,
      prompt: hint,
      showErrorMessage: false,
    };
  }
  return null;
}

/**
 * One rule for a whole range. Per-cell rules go through exceljs 4.4's range merger, which sorts
 * addresses as strings (C10 before C3) and writes overlapping ranges Excel flags as corrupt.
 * `dataValidations.add` exists at runtime but is missing from exceljs's type declarations.
 */
function addRangeValidation(sheet: Worksheet, range: string, validation: DataValidation): void {
  const { dataValidations } = sheet as unknown as {
    dataValidations: { add(address: string, rule: DataValidation): void };
  };
  dataValidations.add(range, validation);
}

/**
 * The people sheet. Sample rows are written in grey italics. Existing members are locked behind
 * sheet protection (no password: it guards against slips, and the API never rewrites them), except
 * a husband's empty wife cells so a wife can still be added to someone already in the tree.
 */
async function addDataSheet(
  workbook: Workbook,
  people: SheetPerson[],
  kind: RowKind,
  layout: Layout,
): Promise<void> {
  const columns = PEOPLE_COLUMNS;
  const sheet = workbook.addWorksheet(PEOPLE_SHEET, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: HEADER_ROW }],
  });
  const groupByStart = new Map(PEOPLE_GROUPS.map((group) => [group.from, group]));
  const groupOf: ColumnGroup[] = [];
  columns.forEach((column, index) => {
    groupOf.push(groupByStart.get(column.field) ?? groupOf[index - 1] ?? PEOPLE_GROUPS[0]!);
  });
  const startsGroup = (index: number): boolean => groupByStart.has(columns[index]!.field);
  const locked = kind === 'existing' && people.length > 0;

  sheet.columns = columns.map((column, index) => ({
    key: column.field,
    width: column.width,
    hidden: column.hidden ?? false,
    style: {
      // Text format stops Excel turning codes like 01 into 1 or lunar days like 15/8 into dates.
      ...(column.kind === 'int' ? {} : { numFmt: '@' }),
      border: box(startsGroup(index) ? GROUP_EDGE : GRID),
      alignment: { horizontal: 'left', vertical: 'middle' },
      ...(locked ? { protection: { locked: false } } : {}),
    },
  }));

  const bands = sheet.getRow(1);
  bands.height = 22;
  columns.forEach((column, index) => {
    if (!startsGroup(index)) return;
    const group = groupOf[index]!;
    let end = index;
    while (end + 1 < columns.length && !startsGroup(end + 1)) end += 1;
    if (end > index) sheet.mergeCells(1, index + 1, 1, end + 1);
    const cell = bands.getCell(index + 1);
    cell.value = group.title.toUpperCase();
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = solid(group.band);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = box(GROUP_EDGE);
  });

  const cells = rowCells(people);
  const header = sheet.getRow(HEADER_ROW);
  header.height = 34;
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = headerLabel(column);
    cell.font = { bold: true, color: { argb: column.required ? REQUIRED_TEXT : 'FF3B2A1A' } };
    cell.fill = solid(groupOf[index]!.header);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { ...box(startsGroup(index) ? GROUP_EDGE : GRID), bottom: GROUP_EDGE };
    if (column.note) cell.note = column.note;

    const validation = columnValidation(column, layout);
    if (validation) {
      const letter = columnLetter(index + 1);
      addRangeValidation(
        sheet,
        `${letter}${FIRST_DATA_ROW}:${letter}${layout.lastRow}`,
        validation,
      );
    }
    const formula = FORMULA_COLUMNS[column.field];
    if (formula) {
      for (let row = FIRST_DATA_ROW; row <= layout.lastRow; row += 1) {
        const values = cells[row - FIRST_DATA_ROW];
        // A filled value is kept as given; the formula fills the rest until someone types over it.
        if (values?.[index]) continue;
        sheet.getRow(row).getCell(index + 1).value = {
          formula: formula.formula(row),
          result: values ? formula.result(values) : '',
        };
      }
    }
  });

  // Wife cells on a woman's row: greyed out while empty, red once something got in (typed before
  // the gender changed, or pasted past the dropdown). Ranked above the other fills.
  const wifeColumns = columns.flatMap((column, index) =>
    isWifeField(column.field) ? [index + 1] : [],
  );
  const gender = `$${columnLetter(GENDER_INDEX + 1)}${FIRST_DATA_ROW}`;
  const firstWife = columnLetter(wifeColumns[0]!);
  const isWoman = `${gender}="${GENDER_LABELS.FEMALE}"`;
  sheet.addConditionalFormatting({
    ref: `${firstWife}${FIRST_DATA_ROW}:${columnLetter(wifeColumns.at(-1)!)}${layout.lastRow}`,
    rules: [
      {
        type: 'expression',
        priority: 1,
        formulae: [`AND(${isWoman},${firstWife}${FIRST_DATA_ROW}<>"")`],
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF8D0CB' } },
          font: { color: { argb: REQUIRED_TEXT }, strike: true },
        },
      },
      {
        type: 'expression',
        priority: 2,
        formulae: [isWoman],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE5E2DD' } } },
      },
    ],
  });
  const lastColumn = columnLetter(columns.length);
  if (locked) {
    sheet.addConditionalFormatting({
      ref: `A${FIRST_DATA_ROW}:${lastColumn}${FIRST_DATA_ROW + people.length - 1}`,
      rules: [
        {
          type: 'expression',
          priority: 3,
          formulae: ['TRUE'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: EXISTING_FILL } } },
        },
      ],
    });
  }
  sheet.addConditionalFormatting({
    ref: `A${FIRST_DATA_ROW}:${lastColumn}${layout.lastRow}`,
    rules: [
      {
        type: 'expression',
        priority: 4,
        formulae: ['MOD(ROW(),2)=0'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: STRIPE } } },
      },
    ],
  });

  cells.forEach((values, rowIndex) => {
    const row = sheet.getRow(FIRST_DATA_ROW + rowIndex);
    const isMan = values[GENDER_INDEX] !== GENDER_LABELS.FEMALE;
    values.forEach((value, index) => {
      const column = columns[index]!;
      const cell = row.getCell(index + 1);
      if (value !== '') {
        cell.value = column.kind === 'int' ? Number(value) : value;
        if (kind === 'sample') cell.font = SAMPLE_FONT;
      }
      if (locked && !(isMan && value === '' && isWifeField(column.field))) {
        cell.protection = { locked: true };
      }
    });
  });

  if (locked) {
    await sheet.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatColumns: true,
      formatRows: true,
    });
  }
}

function addSection(sheet: Worksheet, title: string): void {
  sheet.addRow([]);
  const row = sheet.addRow([title]);
  sheet.mergeCells(row.number, 1, row.number, 8);
  row.height = 20;
  row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.getCell(1).fill = solid(BRAND);
  row.getCell(1).alignment = { vertical: 'middle', indent: 1 };
}

/** `lastColumnTo` widens the last column by merging it up to that column, for long text. */
function addTable(
  sheet: Worksheet,
  headers: string[],
  rows: string[][],
  lastColumnTo = headers.length,
): void {
  [headers, ...rows].forEach((values, index) => {
    const row = sheet.addRow(values);
    if (lastColumnTo > headers.length) {
      sheet.mergeCells(row.number, headers.length, row.number, lastColumnTo);
    }
    for (let column = 1; column <= headers.length; column += 1) {
      const cell = row.getCell(column);
      cell.border = box();
      if (index === 0) {
        cell.font = { bold: true, color: { argb: 'FF3B2A1A' } };
        cell.fill = solid('FFF3E6D3');
        cell.alignment = { vertical: 'middle', wrapText: true };
      } else {
        cell.alignment = { vertical: 'top', wrapText: true };
        if (index % 2 === 0) cell.fill = solid(STRIPE);
      }
    }
  });
}

function guideSteps(kind: RowKind, existingCount: number): string[] {
  const first =
    kind === 'existing'
      ? [
          `1. ${existingCount} dòng đầu của sheet “${PEOPLE_SHEET}” (nền xám) là thành viên đã có trong cây, mã 1 đến ${existingCount}. Các dòng này bị khóa; muốn sửa thông tin của họ, hãy sửa trên trang thiết kế cây.`,
          `2. Thêm người mới vào các dòng trống bên dưới, mỗi người một dòng. Đặt Mã mới không trùng mã đã có, ví dụ tiếp tục từ ${existingCount + 1}. Cột có dấu * (chữ đỏ) là bắt buộc.`,
        ]
      : [
          `1. Mỗi người là một dòng trong sheet “${PEOPLE_SHEET}”. Cột có dấu * (chữ đỏ) là bắt buộc.`,
          '2. Đặt cho mỗi người một Mã riêng, không trùng nhau. Mã chỉ dùng trong file này.',
        ];
  const last =
    kind === 'existing'
      ? '10. Người mới có thể chọn cha, mẹ, vợ là thành viên đã có. Muốn thêm vợ cho một người chồng đã có, chọn ở ô Vợ còn trống trên dòng của người đó.'
      : `10. Sheet “${PEOPLE_SHEET}” có sẵn vài dòng mẫu (chữ nghiêng). Hãy xóa hoặc ghi đè chúng trước khi tải file lên, nếu không chúng sẽ được nhập vào cây.`;
  return [
    ...first,
    '3. Ở cột Mã cha và Mã mẹ, bấm vào ô rồi chọn người trong danh sách (hiện dạng “Mã - Họ tên”). Cũng có thể gõ thẳng Mã.',
    '4. Vợ chồng chỉ khai ở dòng của người chồng: chọn vợ cả ở cột Vợ 1, vợ thứ hai ở cột Vợ 2, vợ thứ ba ở cột Vợ 3. Ở dòng giới tính Nữ, các ô Vợ bị khóa (tô xám); ô tô đỏ là đã điền nhầm, hãy xóa đi.',
    '5. Danh sách chọn lấy từ chính sheet này: nhập người trước, rồi mới chọn được họ làm cha, mẹ hoặc vợ. Danh sách Vợ chỉ hiện người nữ chưa có Mã cha, Mã mẹ (người từ ngoài về làm dâu) và chưa được chọn làm vợ ở dòng khác.',
    '6. Đời thứ và Con thứ nên bỏ trống: đời tự tính theo cha mẹ (vợ cùng đời với chồng), con thứ tự đánh tiếp theo các anh chị em. Ai không có cha mẹ và không phải vợ thì là thủy tổ, điền Đời thứ = 1. Còn sống tự chuyển thành Không khi có Ngày mất hoặc Ngày giỗ.',
    '7. Không đổi tên sheet và tiêu đề cột. Có thể xóa các cột không dùng.',
    '8. Dữ liệu được thêm mới vào cây hiện có, không ghi đè hay gộp với người đã có.',
    '9. Rê chuột vào tiêu đề cột để xem giải thích chi tiết.',
    last,
  ];
}

function addGuideSheet(workbook: Workbook, kind: RowKind, existingCount: number): void {
  const sheet = workbook.addWorksheet(GUIDE_SHEET, { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 22 }, { width: 22 }, { width: 12 }, ...Array(20).fill({ width: 14 })];
  const title = sheet.addRow(['Hướng dẫn nhập dữ liệu gia phả']);
  sheet.mergeCells(1, 1, 1, 8);
  title.height = 30;
  title.getCell(1).font = { bold: true, size: 16, color: { argb: BRAND } };
  title.getCell(1).alignment = { vertical: 'middle' };

  addSection(sheet, 'Các bước');
  for (const line of guideSteps(kind, existingCount)) {
    const row = sheet.addRow([line]);
    sheet.mergeCells(row.number, 1, row.number, 8);
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    row.height = line.length > 110 ? 30 : 16;
  }

  const visible = PEOPLE_COLUMNS.filter((column) => !column.hidden);
  addSection(sheet, 'Ví dụ sheet ' + PEOPLE_SHEET);
  const shown = visible.filter((column) =>
    EXAMPLE_PEOPLE.some((person) => exampleValue(person, column.field)),
  );
  addTable(
    sheet,
    shown.map((column) => headerLabel(column)),
    EXAMPLE_PEOPLE.map((person) => cellsOf(person, shown)),
  );

  addSection(sheet, 'Mô tả các cột');
  addTable(
    sheet,
    ['Cột', 'Bắt buộc', 'Giải thích'],
    visible.map((column) => [column.header, column.required ? 'Có' : '', column.note]),
    10,
  );
}

async function buildWorkbook(people: SheetPerson[], kind: RowKind): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gia Phả';
  workbook.calcProperties = { fullCalcOnLoad: true };
  const layout = layoutFor(people.length);
  addGuideSheet(workbook, kind, people.length);
  await addDataSheet(workbook, people, kind, layout);
  addPickerSheet(workbook, people, layout);
  workbook.views = [
    { x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: 'visible' },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** The blank template with a few sample rows, for a family whose tree is still empty. */
export function buildImportTemplate(): Promise<Blob> {
  return buildWorkbook(SAMPLE_PEOPLE, 'sample');
}

/** The member list of a family that already has a tree, locked, with blank rows for new people. */
export function buildMemberWorkbook(people: SheetPerson[]): Promise<Blob> {
  return buildWorkbook(people, 'existing');
}
