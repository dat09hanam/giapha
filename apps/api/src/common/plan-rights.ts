import { BadRequestException } from '@nestjs/common';
import { PricingFeatureStyle, type Prisma } from '@prisma/client';

/**
 * The one catalog of what a plan may grant. A plan's feature lines may only use these keys, and
 * every right the app enforces for a family is derived from those lines by `resolvePlanRights`,
 * so what the pricing table shows is exactly what applies. Site sections (feed, fund, merit,
 * library, edit suggestions) are not plan rights: every family has them.
 */
export const PLAN_LIMIT_KEYS = ['maxMembers', 'durationMonths', 'maxManagers'] as const;
export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

export const PLAN_OPTION_KEYS = ['dataEntrySupport', 'printBook'] as const;
export type PlanOptionKey = (typeof PLAN_OPTION_KEYS)[number];

export type PlanFeatureKey = PlanLimitKey | PlanOptionKey;

type LimitEntry = {
  key: PlanLimitKey;
  kind: 'LIMIT';
  label: string;
  description: string;
  /** Display text; `{value}` is replaced by the formatted number. */
  template: string;
  /** Display text when the value is null (no limit). */
  unlimitedText: string;
  min: number;
  max: number;
};

/** Something a plan includes or not; included unless its line is missing or struck through. */
type OptionEntry = {
  key: PlanOptionKey;
  kind: 'OPTION';
  label: string;
  description: string;
  text: string;
};

export type PlanCatalogEntry = LimitEntry | OptionEntry;

const ENTRIES: Record<PlanFeatureKey, PlanCatalogEntry> = {
  maxMembers: {
    key: 'maxMembers',
    kind: 'LIMIT',
    label: 'Số lượng thành viên',
    description: 'Số người tối đa trên cây gia phả; đủ số thì không thêm người được nữa.',
    template: 'Tối đa {value} thành viên',
    unlimitedText: 'Không giới hạn thành viên',
    min: 1,
    max: 1_000_000,
  },
  durationMonths: {
    key: 'durationMonths',
    kind: 'LIMIT',
    label: 'Thời hạn của gói (tháng)',
    description: 'Hết thời hạn, dòng họ bị khóa cho tới khi gia hạn hoặc đổi gói.',
    template: 'Thời hạn {value} tháng',
    unlimitedText: 'Sử dụng vĩnh viễn',
    min: 1,
    max: 1200,
  },
  dataEntrySupport: {
    key: 'dataEntrySupport',
    kind: 'OPTION',
    label: 'Hỗ trợ nhập liệu',
    description:
      'Dịch vụ: quản trị viên nhập dữ liệu giúp dòng họ bằng tài khoản Trưởng họ. Hệ thống không tự áp dụng gì.',
    text: 'Hỗ trợ nhập liệu',
  },
  printBook: {
    key: 'printBook',
    kind: 'OPTION',
    label: 'Tạo & xuất cuốn gia phả',
    description: 'Trưởng họ có nút xuất cây gia phả thành cuốn sách để in hoặc lưu PDF.',
    text: 'Tạo & xuất cuốn gia phả',
  },
  maxManagers: {
    key: 'maxManagers',
    kind: 'LIMIT',
    label: 'Số lượng quản trị viên',
    description: 'Số tài khoản Trưởng họ được tạo để giao quản lý chi; đủ số thì không tạo thêm.',
    template: 'Tối đa {value} quản trị viên chi',
    unlimitedText: 'Không giới hạn quản trị viên chi',
    min: 0,
    max: 10_000,
  },
};

/** Catalog order is the order the editor offers and a new plan starts with. */
export const PLAN_CATALOG: readonly PlanCatalogEntry[] = (
  ['maxMembers', 'durationMonths', 'dataEntrySupport', 'printBook', 'maxManagers'] as const
).map((key) => ENTRIES[key]);

export const PLAN_FEATURE_KEYS: readonly PlanFeatureKey[] = PLAN_CATALOG.map((entry) => entry.key);

function catalogEntry(key: string): PlanCatalogEntry | undefined {
  return (PLAN_FEATURE_KEYS as readonly string[]).includes(key)
    ? ENTRIES[key as PlanFeatureKey]
    : undefined;
}

export type PlanFeatureLine = { key: string; value: number | null; style: PricingFeatureStyle };

export type PlanRights = {
  /** Null: no cap on people in the tree. */
  maxMembers: number | null;
  /** Null: the purchase never expires. */
  durationMonths: number | null;
  /** Null: no cap on branch-manager accounts. */
  maxManagers: number | null;
  /** Display only: a service the platform staff deliver by hand. */
  dataEntrySupport: boolean;
  /** The clan head may build and export the printable book. */
  printBook: boolean;
};

/** Select this on a plan wherever its rights are needed, then pass the rows to resolvePlanRights. */
export const planRightsSelect = {
  features: { select: { key: true, value: true, style: true } },
} satisfies Prisma.PricingPlanSelect;

/**
 * Refuses a feature list the catalog does not allow. Saved plans always pass, so resolving their
 * rights never has to guess.
 */
export function assertValidPlanFeatures(lines: readonly PlanFeatureLine[]): void {
  const seen = new Set<string>();
  for (const line of lines) {
    const entry = catalogEntry(line.key);
    if (!entry) throw new BadRequestException(`Tính năng “${line.key}” không có trong danh mục.`);
    if (seen.has(line.key)) {
      throw new BadRequestException(`Tính năng “${entry.label}” chỉ được có một dòng.`);
    }
    seen.add(line.key);
    if (entry.kind === 'OPTION') {
      if (line.value !== null) {
        throw new BadRequestException(`Tính năng “${entry.label}” không nhận giá trị số.`);
      }
      continue;
    }
    if (line.style === PricingFeatureStyle.STRIKETHROUGH) {
      throw new BadRequestException(
        `“${entry.label}” là giới hạn, không thể gạch ngang. Để trống giá trị nếu không giới hạn.`,
      );
    }
    if (
      line.value !== null &&
      (!Number.isInteger(line.value) || line.value < entry.min || line.value > entry.max)
    ) {
      throw new BadRequestException(
        `“${entry.label}” phải là số nguyên từ ${entry.min} đến ${entry.max}, hoặc để trống nếu không giới hạn.`,
      );
    }
  }
  for (const key of PLAN_LIMIT_KEYS) {
    if (!seen.has(key)) {
      throw new BadRequestException(`Gói phải có dòng “${ENTRIES[key].label}”.`);
    }
  }
}

/**
 * The rights a plan's feature lines grant. An option counts only when its line is present and not
 * struck through. A missing limit line (impossible for a saved plan) fails closed at zero.
 */
export function resolvePlanRights(lines: readonly PlanFeatureLine[]): PlanRights {
  const byKey = new Map(lines.map((line) => [line.key, line]));
  const limit = (key: PlanLimitKey): number | null => {
    const line = byKey.get(key);
    return line ? line.value : 0;
  };
  const included = (key: PlanOptionKey): boolean => {
    const line = byKey.get(key);
    return line !== undefined && line.style !== PricingFeatureStyle.STRIKETHROUGH;
  };
  return {
    maxMembers: limit('maxMembers'),
    durationMonths: limit('durationMonths'),
    maxManagers: limit('maxManagers'),
    dataEntrySupport: included('dataEntrySupport'),
    printBook: included('printBook'),
  };
}

/** The sentence the pricing table shows for a line. */
export function planFeatureText(line: Pick<PlanFeatureLine, 'key' | 'value'>): string {
  const entry = catalogEntry(line.key);
  if (!entry) return line.key;
  if (entry.kind === 'OPTION') return entry.text;
  return line.value === null
    ? entry.unlimitedText
    : entry.template.replace('{value}', line.value.toLocaleString('vi-VN'));
}
