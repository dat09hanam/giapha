import {
  Crown,
  FilePenLine,
  FileSpreadsheet,
  Frame,
  Landmark,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export type FamilyAdminSectionId =
  'thong-tin' | 'trang-tri' | 'tai-khoan' | 'goi-dich-vu' | 'nhap-excel' | 'de-xuat';

export type FamilyAdminSection = {
  id: FamilyAdminSectionId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

/** Tabs of the family admin page (`/admin/{slug}#{id}`), shared with the mobile "Menu" sheet. */
export const FAMILY_ADMIN_SECTIONS: readonly FamilyAdminSection[] = [
  { id: 'thong-tin', label: 'Thông tin dòng họ', shortLabel: 'Thông tin', icon: Landmark },
  { id: 'trang-tri', label: 'Trang trí phả đồ', shortLabel: 'Trang trí', icon: Frame },
  { id: 'tai-khoan', label: 'Tài khoản & phân chi', shortLabel: 'Tài khoản', icon: UsersRound },
  { id: 'goi-dich-vu', label: 'Gói dịch vụ', shortLabel: 'Gói dịch vụ', icon: Crown },
  {
    id: 'nhap-excel',
    label: 'Nhập dữ liệu Excel',
    shortLabel: 'Nhập Excel',
    icon: FileSpreadsheet,
  },
  { id: 'de-xuat', label: 'Đề xuất chỉnh sửa', shortLabel: 'Đề xuất', icon: FilePenLine },
];

export function familyAdminSection(id: FamilyAdminSectionId): FamilyAdminSection {
  const section = FAMILY_ADMIN_SECTIONS.find((entry) => entry.id === id);
  if (!section) throw new Error(`Unknown family admin section: ${id}`);
  return section;
}
