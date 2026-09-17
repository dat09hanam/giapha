# Plan

## Current objective

Đổi `/login` sang bố cục split-screen mà không đụng vào logic xác thực.

## Work items

- [x] Ghi yêu cầu và acceptance criteria vào `ticket.md`.
- [x] Dựng lại `AuthShell` thành lưới 2 cột, thêm prop `highlights` tuỳ chọn cho cột trái.
- [x] Sửa chiều cao: dùng `calc(100dvh-4rem)` để trừ header `h-16` thay cho `min-h-screen`.
- [x] Truyền nội dung branding từ `login/page.tsx`.
- [x] Chạy lint và typecheck cho workspace web.

## Owned paths and coordination hotspots

- Ticket workspace: `tickets/login/**`
- Source paths: `apps/web/src/components/auth/auth-shell.tsx`, `apps/web/src/app/login/page.tsx`
- Coordination hotspots: không có. Không đụng schema, contract, hay lockfile.

## Verification

- `npm run lint --workspace @giapha/web`
- `npm run typecheck --workspace @giapha/web`

## Next action

Chờ người dùng xem giao diện thực tế và cho biết có cần chỉnh tỉ lệ cột hay nội dung branding không.
