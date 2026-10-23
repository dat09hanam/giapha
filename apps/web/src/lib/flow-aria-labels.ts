import type { AriaLabelConfig } from '@xyflow/react';

/**
 * Vietnamese replacements for React Flow's built-in screen-reader text. The defaults are English
 * and are server-rendered, so search engines would otherwise quote them as the page snippet.
 */
export const FLOW_ARIA_LABELS: Partial<AriaLabelConfig> = {
  'node.a11yDescription.default': 'Nhấn Enter hoặc phím cách để chọn thành viên.',
  'node.a11yDescription.keyboardDisabled': 'Nhấn Enter hoặc phím cách để chọn thành viên.',
  'node.a11yDescription.ariaLiveMessage': ({ direction }) =>
    `Đã di chuyển khung về phía ${direction}.`,
  'edge.a11yDescription.default': 'Đường nối quan hệ giữa các thành viên.',
  'controls.ariaLabel': 'Bảng điều khiển',
  'controls.zoomIn.ariaLabel': 'Phóng to',
  'controls.zoomOut.ariaLabel': 'Thu nhỏ',
  'controls.fitView.ariaLabel': 'Vừa khung nhìn',
  'controls.interactive.ariaLabel': 'Bật/tắt tương tác',
  'minimap.ariaLabel': 'Bản đồ thu nhỏ',
  'handle.ariaLabel': 'Điểm nối',
};
