import type { Gender } from '@/types/family-tree';
import type { RelationshipStatus } from '@/types/family-import';

/**
 * The spreadsheet layout shared by the downloadable template and the parser. Columns are matched
 * by header text, so clan heads may reorder or hide columns without breaking the import.
 */

export const IMPORT_MAX_ROWS = 5000;

export const PEOPLE_SHEET = 'Thành viên';
export const RELATIONSHIPS_SHEET = 'Hôn nhân';
export const GUIDE_SHEET = 'Hướng dẫn';

export type ColumnKind =
  'code' | 'text' | 'int' | 'gender' | 'yesNo' | 'date' | 'lunarDay' | 'status';

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
};

export type PeopleField =
  | 'code'
  | 'name'
  | 'gender'
  | 'fatherCode'
  | 'motherCode'
  | 'generation'
  | 'orderInFamily'
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
  | 'biography';

export type RelationshipField = 'husbandCode' | 'wifeCode' | 'wifeOrder' | 'status';

export const PEOPLE_COLUMNS: ColumnSpec<PeopleField>[] = [
  {
    field: 'code',
    header: 'Mã',
    kind: 'code',
    required: true,
    maxLength: 50,
    width: 10,
    note: 'Mã riêng của từng người trong file, không trùng nhau (ví dụ 1, 2, 3 hoặc A1, A2). Dùng để điền cột Mã cha, Mã mẹ và sheet Hôn nhân.',
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
    field: 'fatherCode',
    header: 'Mã cha',
    kind: 'code',
    maxLength: 50,
    width: 10,
    note: 'Mã của người cha trong cùng file. Bỏ trống nếu là thủy tổ hoặc người dâu/rể.',
    example: '',
  },
  {
    field: 'motherCode',
    header: 'Mã mẹ',
    kind: 'code',
    maxLength: 50,
    width: 10,
    note: 'Mã của người mẹ trong cùng file.',
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
    note: 'Có hoặc Không. Bỏ trống: coi là đã mất nếu có ngày mất, ngày giỗ hoặc tuổi thọ.',
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
    note: 'Số tuổi khi mất.',
    example: '70',
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
];

export const RELATIONSHIP_COLUMNS: ColumnSpec<RelationshipField>[] = [
  {
    field: 'husbandCode',
    header: 'Mã chồng',
    kind: 'code',
    required: true,
    maxLength: 50,
    width: 12,
    note: 'Mã của người chồng trong sheet Thành viên.',
    example: '1',
  },
  {
    field: 'wifeCode',
    header: 'Mã vợ',
    kind: 'code',
    required: true,
    maxLength: 50,
    width: 12,
    note: 'Mã của người vợ trong sheet Thành viên.',
    example: '2',
  },
  {
    field: 'wifeOrder',
    header: 'Vợ thứ',
    kind: 'int',
    min: 1,
    max: 20,
    width: 10,
    note: 'Thứ tự vợ khi người chồng có nhiều vợ (1 = vợ cả).',
    example: '1',
  },
  {
    field: 'status',
    header: 'Tình trạng',
    kind: 'status',
    width: 16,
    note: 'Đang kết hôn, Ly thân, Ly hôn hoặc Góa. Bỏ trống = Đang kết hôn.',
    example: 'Đang kết hôn',
  },
];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
  UNKNOWN: 'Không rõ',
};

export const STATUS_LABELS: Record<RelationshipStatus, string> = {
  MARRIED: 'Đang kết hôn',
  SEPARATED: 'Ly thân',
  DIVORCED: 'Ly hôn',
  WIDOWED: 'Góa',
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

/** The template marks required columns with a trailing star. */
export function headerLabel(spec: ColumnSpec<string>): string {
  return spec.required ? spec.header + ' *' : spec.header;
}
