import type { Workbook, Worksheet } from 'exceljs';

import {
  GENDER_LABELS,
  GUIDE_SHEET,
  PEOPLE_COLUMNS,
  PEOPLE_SHEET,
  RELATIONSHIP_COLUMNS,
  RELATIONSHIPS_SHEET,
  STATUS_LABELS,
  YES_NO_LABELS,
  headerLabel,
  type ColumnKind,
  type ColumnSpec,
} from '@/lib/family-import/columns';

/** Rows that get dropdowns; Excel keeps typing allowed beyond them. */
const VALIDATED_ROWS = 2000;

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7A4A1E' } } as const;
const REQUIRED_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F2D20' } } as const;

const CHOICES: Partial<Record<ColumnKind, readonly string[]>> = {
  gender: Object.values(GENDER_LABELS),
  yesNo: YES_NO_LABELS,
  status: Object.values(STATUS_LABELS),
};

// In PEOPLE_COLUMNS order: Mã … Con thứ, Ngày sinh, Còn sống, Ngày mất, Ngày giỗ, Hưởng thọ, Danh xưng.
const EXAMPLE_PEOPLE: string[][] = [
  ['1', 'Nguyễn Văn An', 'Nam', '', '', '1', '1', '1890', 'Không', '1960', '15/8', '70', 'Cụ'],
  ['2', 'Trần Thị Bình', 'Nữ', '', '', '', '', '1895', 'Không', '1970', '2/3', '75', 'Cụ bà'],
  ['3', 'Nguyễn Văn Cường', 'Nam', '1', '2', '', '1', '1920', 'Không', '1990', '', '', 'Ông'],
  ['4', 'Lê Thị Dung', 'Nữ', '', '', '', '', '1925', '', '', '', '', 'Bà'],
  ['5', 'Nguyễn Văn Đức', 'Nam', '3', '4', '', '1', '15/06/1950', 'Có', '', '', '', ''],
];

const EXAMPLE_RELATIONSHIPS: string[][] = [
  ['1', '2', '1', 'Đang kết hôn'],
  ['3', '4', '1', 'Đang kết hôn'],
];

function addDataSheet(workbook: Workbook, name: string, columns: ColumnSpec<string>[]): void {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({
    header: headerLabel(column),
    key: column.field,
    width: column.width,
    // Text format stops Excel turning codes like 01 into 1 or lunar days like 15/8 into dates.
    style: column.kind === 'int' ? {} : { numFmt: '@' },
  }));

  const header = sheet.getRow(1);
  header.height = 30;
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = column.required ? REQUIRED_FILL : HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    if (column.note) cell.note = column.note;

    const choices = CHOICES[column.kind];
    for (let row = 2; row <= VALIDATED_ROWS + 1; row += 1) {
      const target = sheet.getRow(row).getCell(index + 1);
      if (choices) {
        target.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"' + choices.join(',') + '"'],
          showErrorMessage: true,
          errorTitle: column.header,
          error: 'Hãy chọn một giá trị trong danh sách: ' + choices.join(', ') + '.',
        };
      } else if (column.kind === 'int' && column.min !== undefined && column.max !== undefined) {
        target.dataValidation = {
          type: 'whole',
          operator: 'between',
          allowBlank: true,
          formulae: [column.min, column.max],
          showErrorMessage: true,
          errorTitle: column.header,
          error: `Hãy nhập số nguyên từ ${column.min} đến ${column.max}.`,
        };
      }
    }
  });
}

function addTable(sheet: Worksheet, columns: ColumnSpec<string>[], rows: string[][]): void {
  const header = sheet.addRow(columns.map((column) => headerLabel(column)));
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.eachCell((cell) => {
    cell.fill = HEADER_FILL;
  });
  for (const row of rows) sheet.addRow(row);
}

function addGuideSheet(workbook: Workbook): void {
  const sheet = workbook.addWorksheet(GUIDE_SHEET);
  sheet.columns = [{ width: 22 }, { width: 22 }, { width: 12 }, ...Array(20).fill({ width: 14 })];
  const title = sheet.addRow(['Hướng dẫn nhập dữ liệu gia phả']);
  title.font = { bold: true, size: 16, color: { argb: 'FF7A4A1E' } };
  sheet.addRow([]);
  for (const line of [
    `1. Mỗi người là một dòng trong sheet “${PEOPLE_SHEET}”. Cột có dấu * là bắt buộc.`,
    '2. Đặt cho mỗi người một Mã riêng, không trùng nhau. Mã chỉ dùng trong file này.',
    '3. Nối cha mẹ con bằng cột Mã cha và Mã mẹ (điền Mã của cha/mẹ, không điền tên).',
    `4. Mỗi cặp vợ chồng là một dòng trong sheet “${RELATIONSHIPS_SHEET}”.`,
    '5. Cột Đời thứ có thể bỏ trống, hệ thống tự tính theo cha mẹ.',
    '6. Không đổi tên sheet và tiêu đề cột. Có thể xóa các cột không dùng.',
    '7. Dữ liệu được thêm mới vào cây hiện có, không ghi đè hay gộp với người đã có.',
    '8. Rê chuột vào tiêu đề cột để xem giải thích chi tiết.',
  ]) {
    sheet.addRow([line]);
  }

  sheet.addRow([]);
  sheet.addRow(['Ví dụ sheet ' + PEOPLE_SHEET]).font = { bold: true };
  addTable(sheet, PEOPLE_COLUMNS.slice(0, EXAMPLE_PEOPLE[0]!.length), EXAMPLE_PEOPLE);
  sheet.addRow([]);
  sheet.addRow(['Ví dụ sheet ' + RELATIONSHIPS_SHEET]).font = { bold: true };
  addTable(sheet, RELATIONSHIP_COLUMNS, EXAMPLE_RELATIONSHIPS);

  sheet.addRow([]);
  sheet.addRow(['Mô tả các cột']).font = { bold: true };
  const describe = sheet.addRow(['Cột', 'Sheet', 'Bắt buộc', 'Giải thích']);
  describe.font = { bold: true };
  for (const [sheetName, columns] of [
    [PEOPLE_SHEET, PEOPLE_COLUMNS],
    [RELATIONSHIPS_SHEET, RELATIONSHIP_COLUMNS],
  ] as const) {
    for (const column of columns) {
      sheet.addRow([column.header, sheetName, column.required ? 'Có' : '', column.note]);
    }
  }
}

/** Builds the downloadable .xlsx template; exceljs loads only when the button is pressed. */
export async function buildImportTemplate(): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gia Phả';
  addGuideSheet(workbook);
  addDataSheet(workbook, PEOPLE_SHEET, PEOPLE_COLUMNS);
  addDataSheet(workbook, RELATIONSHIPS_SHEET, RELATIONSHIP_COLUMNS);
  workbook.views = [
    { x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: 'visible' },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
