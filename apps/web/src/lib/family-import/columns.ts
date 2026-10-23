import type { Gender } from '@/types/family-tree';

/**
 * The spreadsheet layout shared by the downloadable template and the parser. Columns are matched
 * by header text, so clan heads may reorder or hide columns without breaking the import.
 */

export const IMPORT_MAX_ROWS = 5000;

/** The template's member pickers fill “code - name”; the parser keeps only the code. */
export const PICK_SEPARATOR = ' - ';

/** A picked “code - name” value: code (50) + separator + full name (191). */
const PICKED_MAX_LENGTH = 50 + PICK_SEPARATOR.length + 191;

export const PEOPLE_SHEET = 'Thành viên';
export const GUIDE_SHEET = 'Hướng dẫn';

export type ColumnKind = 'code' | 'text' | 'int' | 'gender' | 'yesNo' | 'date' | 'lunarDay';

export type ColumnSpec<Field extends string> = {
  field: Field;
  header: string;
  kind: ColumnKind;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  width: number;
  note: string;
  example: string;
  /** Kept out of sight in the sheet and the guide; filled by the system, not by people. */
  hidden?: boolean;
};

export type PeopleField =
  | 'code'
  | 'name'
  | 'gender'
  | 'fatherCode'
  | 'motherCode'
  | 'generation'
  | 'orderInFamily'
  | 'wife1Code'
  | 'wife2Code'
  | 'wife3Code'
  | 'honorific'
  | 'nickname'
  | 'courtesyName'
  | 'birthDate'
  | 'isAlive'
  | 'deathDate'
  | 'lunarDeath'
  | 'ageAtDeath'
  | 'burialPlace'
  | 'worshipPlace'
  | 'phone'
  | 'education'
  | 'occupation'
  | 'hometown'
  | 'currentAddress'
  | 'biography'
  | 'personId';

export const PEOPLE_COLUMNS: ColumnSpec<PeopleField>[] = [
  {
    field: 'code',
    header: 'Mã',
    kind: 'code',
    required: true,
    maxLength: 50,
    width: 10,
    note: 'Mã riêng của từng người trong file, không trùng nhau (ví dụ 1, 2, 3 hoặc A1, A2). Dùng để điền cột Mã cha, Mã mẹ và các cột Vợ.',
    example: '1',
  },
  {
    field: 'name',
    header: 'Họ và tên',
    kind: 'text',
    required: true,
    maxLength: 191,
    width: 26,
    note: 'Họ và tên đầy đủ.',
    example: 'Nguyễn Văn An',
  },
  {
    field: 'gender',
    header: 'Giới tính',
    kind: 'gender',
    width: 12,
    note: 'Nam, Nữ, Khác hoặc Không rõ. Bỏ trống thì hệ thống tự suy ra nếu người đó là cha/mẹ/chồng/vợ.',
    example: 'Nam',
  },
  {
    field: 'honorific',
    header: 'Danh xưng',
    kind: 'text',
    maxLength: 100,
    width: 14,
    note: 'Ví dụ: Cụ, Ông, Bà.',
    example: 'Cụ',
  },
  {
    field: 'nickname',
    header: 'Tên thường gọi',
    kind: 'text',
    maxLength: 191,
    width: 18,
    note: '',
    example: '',
  },
  {
    field: 'courtesyName',
    header: 'Tên tự',
    kind: 'text',
    maxLength: 191,
    width: 14,
    note: '',
    example: '',
  },
  {
    field: 'fatherCode',
    header: 'Mã cha',
    kind: 'code',
    maxLength: PICKED_MAX_LENGTH,
    width: 26,
    note: 'Chọn người cha trong danh sách, hoặc gõ Mã của cha. Bỏ trống nếu là thủy tổ hoặc người dâu/rể.',
    example: '',
  },
  {
    field: 'motherCode',
    header: 'Mã mẹ',
    kind: 'code',
    maxLength: PICKED_MAX_LENGTH,
    width: 26,
    note: 'Chọn người mẹ trong danh sách, hoặc gõ Mã của mẹ.',
    example: '',
  },
  {
    field: 'generation',
    header: 'Đời thứ',
    kind: 'int',
    min: 0,
    max: 1000,
    width: 10,
    note: 'Bỏ trống thì tự tính: con = đời cha + 1, dâu/rể = đời của vợ/chồng, thủy tổ = 1.',
    example: '1',
  },
  {
    field: 'orderInFamily',
    header: 'Con thứ',
    kind: 'int',
    min: 1,
    max: 100,
    width: 10,
    note: 'Thứ tự trong các anh chị em (1 = con cả).',
    example: '1',
  },
  {
    field: 'wife1Code',
    header: 'Vợ 1 (vợ cả)',
    kind: 'code',
    maxLength: PICKED_MAX_LENGTH,
    width: 26,
    note: 'Chỉ khai ở dòng của người chồng. Chọn người vợ trong danh sách; ở dòng giới tính Nữ ô này bị khóa (tô xám).',
    example: '2',
  },
  {
    field: 'wife2Code',
    header: 'Vợ 2',
    kind: 'code',
    maxLength: PICKED_MAX_LENGTH,
    width: 26,
    note: 'Vợ thứ hai của người chồng, nếu có.',
    example: '',
  },
  {
    field: 'wife3Code',
    header: 'Vợ 3',
    kind: 'code',
    maxLength: PICKED_MAX_LENGTH,
    width: 26,
    note: 'Vợ thứ ba của người chồng, nếu có.',
    example: '',
  },
  {
    field: 'birthDate',
    header: 'Ngày sinh',
    kind: 'date',
    maxLength: 100,
    width: 14,
    note: 'dd/mm/yyyy, mm/yyyy hoặc chỉ năm (yyyy).',
    example: '1890',
  },
  {
    field: 'isAlive',
    header: 'Còn sống',
    kind: 'yesNo',
    width: 11,
    note: 'Có hoặc Không. File mẫu tự chuyển thành Không khi điền Ngày mất hoặc Ngày giỗ. Bỏ trống: coi là đã mất nếu có ngày mất, ngày giỗ hoặc hưởng thọ.',
    example: 'Không',
  },
  {
    field: 'deathDate',
    header: 'Ngày mất',
    kind: 'date',
    maxLength: 100,
    width: 14,
    note: 'dd/mm/yyyy, mm/yyyy hoặc chỉ năm.',
    example: '1960',
  },
  {
    field: 'lunarDeath',
    header: 'Ngày giỗ (âm lịch)',
    kind: 'lunarDay',
    width: 16,
    note: 'Ngày/tháng âm lịch dạng dd/mm, ví dụ 15/8.',
    example: '15/8',
  },
  {
    field: 'ageAtDeath',
    header: 'Hưởng thọ',
    kind: 'int',
    min: 0,
    max: 150,
    width: 11,
    note: 'File mẫu tự tính = năm mất − năm sinh. Có thể gõ đè; bỏ trống thì hệ thống cũng tự tính khi có đủ hai năm.',
    example: '70',
  },
  {
    field: 'burialPlace',
    header: 'Nơi an táng',
    kind: 'text',
    maxLength: 255,
    width: 24,
    note: '',
    example: '',
  },
  {
    field: 'worshipPlace',
    header: 'Nơi thờ cúng',
    kind: 'text',
    maxLength: 255,
    width: 24,
    note: '',
    example: '',
  },
  {
    field: 'phone',
    header: 'Điện thoại',
    kind: 'text',
    maxLength: 30,
    width: 14,
    note: '',
    example: '',
  },
  {
    field: 'education',
    header: 'Học vấn',
    kind: 'text',
    maxLength: 191,
    width: 16,
    note: '',
    example: '',
  },
  {
    field: 'occupation',
    header: 'Nghề nghiệp',
    kind: 'text',
    maxLength: 191,
    width: 16,
    note: '',
    example: '',
  },
  {
    field: 'hometown',
    header: 'Quê quán',
    kind: 'text',
    maxLength: 255,
    width: 24,
    note: '',
    example: '',
  },
  {
    field: 'currentAddress',
    header: 'Nơi ở hiện nay',
    kind: 'text',
    maxLength: 255,
    width: 24,
    note: '',
    example: '',
  },
  {
    field: 'biography',
    header: 'Tiểu sử',
    kind: 'text',
    maxLength: 10000,
    width: 40,
    note: 'Ghi chú, tiểu sử ngắn.',
    example: '',
  },
  {
    field: 'personId',
    header: 'Mã hệ thống',
    kind: 'text',
    maxLength: 36,
    width: 38,
    note: 'Hệ thống điền cho thành viên đã có trong cây. Không sửa hay điền cột này.',
    example: '',
    hidden: true,
  },
];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
  UNKNOWN: 'Không rõ',
};

export const YES_NO_LABELS = ['Có', 'Không'] as const;

/** Lower case, no diacritics, single spaces: how headers and choice values are compared. */
export function looseKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** The four-digit year at the end of a free-text date (1890, 03/1920, 15/06/1950). */
export function yearOf(date: string | null): number | null {
  const match = /(\d{4})$/.exec(date?.trim() ?? '');
  return match ? Number(match[1]) : null;
}

/** Age at death from the birth and death years, as the template's Hưởng thọ formula computes it. */
export function ageFromDates(birthDate: string | null, deathDate: string | null): number | null {
  const born = yearOf(birthDate);
  const died = yearOf(deathDate);
  if (born === null || died === null) return null;
  const age = died - born;
  return age >= 0 && age <= 150 ? age : null;
}

/** Wife columns in order: the column a wife is picked in is her wife order. */
export const WIFE_FIELDS = [
  'wife1Code',
  'wife2Code',
  'wife3Code',
] as const satisfies readonly PeopleField[];

export type WifeField = (typeof WIFE_FIELDS)[number];

/** The template marks required columns with a trailing star. */
export function headerLabel(spec: ColumnSpec<string>): string {
  return spec.required ? spec.header + ' *' : spec.header;
}
