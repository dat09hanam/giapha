---
name: "login"
slug: "login"
status: "in-progress"
created: "2026-09-14"
updated: "2026-09-17"
---

# Ticket: login

## Request

- Đổi giao diện trang đăng nhập sang bố cục 2 cột (split-screen): cột trái là mảng
  branding của dòng họ, cột phải là form đăng nhập. Trên màn hình hẹp thì xếp dọc.

## Outcome

Người dùng mở `/login` thấy một thẻ 2 cột: bên trái giới thiệu sản phẩm bằng tông
xanh emerald, bên phải là form đăng nhập hiện có. Trên điện thoại hai phần xếp
chồng, phần branding thu gọn lại, form vẫn dùng được bình thường.

## Scope

### In

- `apps/web/src/components/auth/auth-shell.tsx` — dựng lại bố cục 2 cột.
- `apps/web/src/app/login/page.tsx` — truyền nội dung branding cho cột trái.

### Out

- Logic đăng nhập, `login-form.tsx`, `auth-api.ts`, và mọi thứ trong `apps/api`.
- Ghi nhớ đăng nhập, quên mật khẩu, đăng ký — chưa có backend tương ứng.
- Đổi bảng màu hay font của hệ thống.

## Acceptance criteria

- [x] Từ `lg` trở lên, branding và form nằm cạnh nhau trên cùng một thẻ.
- [x] Dưới `lg`, hai phần xếp dọc, branding ở trên, không tràn ngang.
- [x] Form đăng nhập giữ nguyên hành vi: submit, trạng thái `Đang đăng nhập…`, hiển thị lỗi.
- [x] Trang không bị tràn dọc do thanh header `h-16` của `layout.tsx`.
- [x] `npm run lint --workspace @giapha/web` và `npm run typecheck --workspace @giapha/web` sạch.
