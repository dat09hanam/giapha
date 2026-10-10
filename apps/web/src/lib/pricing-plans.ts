import {
  Crown,
  Flower2,
  Landmark,
  Leaf,
  Sprout,
  TreeDeciduous,
  type LucideIcon,
} from 'lucide-react';

import type { PricingPlanTone } from '@/types/pricing';

export const PRICING_PLAN_ICONS: ReadonlyArray<{ key: string; label: string; icon: LucideIcon }> = [
  { key: 'sprout', label: 'Mầm non', icon: Sprout },
  { key: 'bamboo', label: 'Lá tre', icon: Leaf },
  { key: 'tree', label: 'Cây cổ thụ', icon: TreeDeciduous },
  { key: 'pagoda', label: 'Đình làng', icon: Landmark },
  { key: 'lotus', label: 'Hoa sen', icon: Flower2 },
  { key: 'crown', label: 'Vương miện', icon: Crown },
];

export function pricingPlanIcon(key: string): LucideIcon {
  return PRICING_PLAN_ICONS.find((choice) => choice.key === key)?.icon ?? Sprout;
}

export const PRICING_PLAN_TONES: ReadonlyArray<{ value: PricingPlanTone; label: string }> = [
  { value: 'WOOD', label: 'Gỗ trầm' },
  { value: 'JADE', label: 'Xanh ngọc' },
  { value: 'GOLD', label: 'Vàng đồng' },
  { value: 'LACQUER', label: 'Đỏ son' },
];

export function formatPlanPrice(price: number): string {
  return price === 0 ? 'Miễn phí' : `${price.toLocaleString('vi-VN')}đ`;
}
