# Memory

## Snapshot

- Status: in-progress
- Last updated: 2026-09-17
- Current result: trang `/login` đã chuyển sang bố cục 2 cột, lint và typecheck sạch
- Next action: chờ người dùng xem giao diện thật, chỉnh tỉ lệ cột hoặc nội dung branding nếu cần

## Decisions

- Dựng bố cục ngay trong `AuthShell` thay vì tạo component mới: nó chỉ được `login/page.tsx`
  dùng, nên đổi trực tiếp rẻ hơn và không để lại lớp trừu tượng thừa.
- Bỏ `Card`/`CardHeader`/`CardContent` trong `AuthShell`. Card bọc padding `p-6` cố định
  nên không dựng được cột branding tràn viền; thay bằng một `div` lưới có `overflow-hidden`.
- Tỉ lệ cột `lg:grid-cols-[1.05fr_1fr]` — cột branding rộng hơn form một chút.
- Danh sách `highlights` bị ẩn dưới `lg` (`hidden lg:grid`) để trên điện thoại người dùng
  không phải cuộn qua phần giới thiệu mới tới được form.
- Đổi `min-h-screen` thành `min-h-[calc(100dvh-4rem)]`: `layout.tsx` có header `h-16` luôn
  hiển thị, `min-h-screen` cũ làm trang tràn dọc thêm đúng 4rem. Dùng `dvh` cho mobile.

## Files and contracts

- `apps/web/src/components/auth/auth-shell.tsx` — viết lại thành lưới 2 cột.
- `apps/web/src/app/login/page.tsx` — truyền `brandTitle`, `brandTagline`, `highlights`.
- Props mới của `AuthShell`: `brandTitle` và `brandTagline` bắt buộc, `highlights` tuỳ chọn.
  `AuthShell` chỉ có một nơi dùng nên không có consumer nào khác bị ảnh hưởng.
- Không đụng `login-form.tsx`, `auth-api.ts`, hay `apps/api`.

## Verification

- `npm run lint --workspace @giapha/web` — sạch
- `npm run typecheck --workspace @giapha/web` — sạch
- Chưa chạy thử trên trình duyệt thật.

## Blockers and risks

- Giao diện chưa được xem bằng mắt trên trình duyệt; các mốc responsive mới chỉ đúng trên lý thuyết.

## Handoff

Thay đổi nằm nguyên trong working tree trên branch `main`, chưa commit.
Đọc `ticket.md` để biết phạm vi đã chốt, `plan.md` để biết việc đã xong.
