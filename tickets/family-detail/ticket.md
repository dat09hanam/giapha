---
name: 'family-detail'
slug: 'family-detail'
status: 'in-progress'
created: '2026-09-17'
updated: '2026-09-18'
---

# Ticket: family-detail

## Request

- 2026-09-17: Trên màn quản trị của trưởng họ tại `/admin/ho-nguyen`, bổ sung UI để quản lý và chỉnh sửa thông tin của dòng họ hiện tại.
- 2026-09-17: Chuẩn hóa toàn hệ thống để mọi API call thất bại đều hiển thị lỗi tiếng Việt cụ thể, không dùng thông báo chung chung.
- 2026-09-17: Sửa lỗi trình duyệt không thể cập nhật hồ sơ vì CORS preflight chưa cho phép phương thức PATCH.
- 2026-09-17: Thống nhất trường ngày giỗ họ ở mọi form thành hai bánh xe chọn ngày/tháng; không cho nhập tay.
- 2026-09-17: Thêm nút từ màn quản trị dòng họ tới trang thiết kế tại `/{slug}/thiet_ke`.
- 2026-09-18: Xây trang thiết kế gia phả tương tác tại `/{slug}/thiet_ke`: bắt đầu bằng một khung thành viên, thêm vợ/chồng cùng hàng và thêm con trai/con gái ở hàng dưới; không hiển thị chú thích vai trò trên khung.
- 2026-09-18: Khi bấm vào một khung thành viên, khung đó phải được highlight rõ để dễ theo dõi.
- 2026-09-18: Bổ sung nút xóa thành viên trong panel thông tin của khung đang chọn.
- 2026-09-18: Bổ sung hai thao tác lưu thật xuống database: lưu toàn bộ bản thiết kế và lưu riêng thành viên đang chọn.

## Outcome

- Trưởng họ đăng nhập có thể xem, chỉnh sửa và lưu tên, quê quán/nguồn gốc, địa chỉ, ngày giỗ họ và phần giới thiệu của đúng dòng họ đang quản trị.
- Mọi lỗi API được chuẩn hóa thành thông báo tiếng Việt cụ thể theo validation, quyền truy cập, trạng thái HTTP, lỗi mạng hoặc response không hợp lệ.
- Trưởng họ có một canvas trực quan để dựng cấu trúc gia đình theo thế hệ, lưu riêng từng thành viên hoặc lưu nguyên tử toàn bộ thành viên và quan hệ.

## Scope

### In

- Giao diện xem/chỉnh sửa thông tin dòng họ trong tenant admin hiện có.
- Kết nối API đọc và cập nhật hồ sơ tenant.
- Trạng thái tải, lưu, lỗi và phản hồi thành công rõ ràng.
- Kiểm soát quyền và cô lập dữ liệu theo `tenantId` đáng tin cậy từ phiên đăng nhập.
- Chuẩn hóa payload lỗi API và bộ phân tích lỗi dùng chung ở web.
- Việt hóa các exception, validation và fallback theo trạng thái HTTP.
- Route thiết kế được bảo vệ theo phiên trưởng họ và tenant slug.
- Canvas tương tác, khung thành viên, chọn loại quan hệ và bố cục vợ/chồng/con theo hàng.
- API tenant-scoped để lưu một thành viên hoặc toàn bộ bản thiết kế cùng quan hệ.

### Out

- Cho phép thay đổi slug/URL công khai.
- Xây dựng luồng tải tệp mới.

## Acceptance criteria

- [x] Route admin tải dữ liệu hồ sơ hiện tại và hiển thị khu vực quản lý cho trưởng họ sau bước xác thực.
- [x] Form có nhãn và validation cho tên, quê quán/nguồn gốc, địa chỉ, ngày giỗ họ và phần giới thiệu.
- [ ] Xác minh thủ công bằng phiên trưởng họ rằng lưu thành công vẫn giữ dữ liệu sau khi tải lại trang.
- [x] Mutation dùng `FamilyAccessGuard`, quyền `MEMBER_PLUS` và `familyId` từ ngữ cảnh xác thực.
- [x] UI có trạng thái tải, đang lưu, thành công và lỗi; bố cục đáp ứng màn hình nhỏ.
- [x] Lint và TypeScript compiler của mọi workspace bị thay đổi đều vượt qua.
- [x] Mọi điểm gọi API ở web sử dụng bộ phân tích lỗi chung và hiển thị thông báo tiếng Việt có ngữ cảnh.
- [x] Backend không còn trả thông báo exception tiếng Anh cho các lỗi nghiệp vụ/xác thực đã biết.
- [x] Lỗi validation nhiều trường được tổng hợp rõ ràng; lỗi mạng, timeout và response không hợp lệ có fallback tiếng Việt riêng.
- [x] CORS cho phép đầy đủ các method API đang dùng và preflight PATCH trả thành công cho web origin.
- [x] Form tạo và chỉnh sửa dùng cùng một bộ chọn ngày/tháng, tự giới hạn ngày hợp lệ theo tháng và không có ô nhập tự do.
- [x] Cụm thao tác trên màn quản trị có nút dẫn đúng tới `/{slug}/thiet_ke`.
- [x] Route `/{slug}/thiet_ke` chỉ cho trưởng họ của đúng tenant truy cập.
- [x] Canvas khởi tạo một khung thành viên và mỗi khung có nút “Thêm quan hệ”.
- [x] Bộ chọn quan hệ có vợ, chồng, con trai và con gái; khung mới không hiển thị chú thích vai trò.
- [x] Vợ/chồng được xếp cùng hàng; con được xếp ở hàng thế hệ phía dưới và có đường nối.
- [x] Trang có thể chỉnh sửa thông tin khung tại chỗ và đáp ứng trên màn hình nhỏ.
- [x] Bấm vào bất kỳ vùng nào của khung sẽ chọn và highlight rõ duy nhất khung đó.
- [x] Panel có nút “Xóa thành viên”, yêu cầu xác nhận trước khi xóa và không cho xóa khung khởi điểm.
- [x] Xóa vợ/chồng chỉ bỏ khung đó; xóa thành viên ở thế hệ dưới bỏ cả nhánh phụ thuộc và chọn lại khung cha.
- [x] Panel “Thông tin thành viên” có nút lưu riêng thành viên đang chọn xuống database, hỗ trợ cả tạo mới và cập nhật.
- [x] Thanh tiêu đề có nút “Lưu tất cả” lưu nguyên tử toàn bộ thành viên và quan hệ của bản thiết kế.
- [x] Mọi mutation lưu đều tenant-scoped, yêu cầu quyền trưởng họ và hiển thị trạng thái đang lưu/thành công/lỗi tiếng Việt.
