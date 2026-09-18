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
- 2026-09-18: Bỏ soft delete (`deletedAt`) của Person và Relationship để tránh dữ liệu rác; hai bảng này xóa thật.
- 2026-09-18: Panel “Thông tin thành viên” phải hiển thị đầy đủ các trường của Person để chỉnh sửa.
- 2026-09-18: Khi tick “Còn sống”, ẩn các trường tên tự/hiệu, ngày mất, ngày giỗ và nơi an táng.
- 2026-09-18: Gom bốn trường chỉ dùng cho người đã mất vào một khung riêng, đặt cạnh nhau.
- 2026-09-18: Khi chọn một thành viên có con, hiển thị danh sách con trong một khung riêng, đánh rõ “Thứ 1, Thứ 2…” và có nút sắp xếp thứ tự.
- 2026-09-18: Bỏ nút “Lưu thành viên”, chỉ giữ “Lưu tất cả” để tránh lưu thiếu.
- 2026-09-18: Nút “Lưu tất cả” bị vô hiệu hóa khi không có thay đổi, và chỉ sáng lên khi bản thiết kế khác với trạng thái đã lưu.
- 2026-09-18: Bỏ các khối thông báo inline, chuyển toàn bộ thông báo của web sang toast.
- 2026-09-18: Khi thêm ảnh đại diện, hiển thị ảnh để cắt và chọn vị trí, bấm lưu thì dùng ảnh sau khi cắt và hiện preview trong khung.
- 2026-09-18: Khung thành viên trên canvas hiển thị ảnh đại diện thay cho icon mặc định nếu người đó đã có ảnh.
- 2026-09-18: Xóa hoặc đổi ảnh đại diện phải xóa luôn tệp ảnh cũ, không để lại ảnh rác.
- 2026-09-18: Ảnh chỉ được ghi vào thư mục media khi bấm “Lưu tất cả”, không ghi ngay lúc bấm “Lưu ảnh” trong hộp cắt.
- 2026-09-18: Thư mục media giữ nguyên vị trí nhưng không đưa vào git.
- 2026-09-18: Ảnh đại diện phải là nút thêm ảnh thay vì ô nhập đường dẫn; tạo thư mục `media` để lưu ảnh.
- 2026-09-18: Áp quy tắc giới tính cho trang thiết kế: khung khởi điểm mặc định là Nam; chọn giới tính bằng hai checkbox Nam/Nữ thay cho select; giới tính thành viên mới suy ra từ giới tính thành viên gốc; làm mờ lựa chọn Chồng khi gốc là Nam và lựa chọn Vợ khi gốc là Nữ.
- 2026-09-18: Thêm trường Person “Danh xưng” tùy chọn (ví dụ Cụ tổ, Cụ, Ông, Bà), cho phép chỉnh sửa, lưu và hiển thị trên các khung thành viên.

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
- Quy tắc giới tính của canvas: mặc định khung khởi điểm, bộ chọn Nam/Nữ và ràng buộc quan hệ vợ/chồng theo giới tính.
- Xóa cứng Person/Relationship cùng migration dọn dữ liệu đã soft delete.
- Panel chỉnh sửa đầy đủ trường Person, gồm “Danh xưng”, và mở rộng contract lưu để giữ được các trường đó.
- API tenant-scoped để lưu một thành viên hoặc toàn bộ bản thiết kế cùng quan hệ.

### Out

- Cho phép thay đổi slug/URL công khai.
- Quét dọn định kỳ các tệp ảnh đã mồ côi từ trước khi có luồng xóa.
- Đưa ảnh lên object storage; giai đoạn này lưu trên đĩa của API.

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
- [x] Panel không còn nút lưu riêng thành viên; mọi thay đổi chỉ ghi qua “Lưu tất cả” để không lưu thiếu quan hệ hoặc thứ tự.
- [x] Thanh tiêu đề có nút “Lưu tất cả” lưu nguyên tử toàn bộ thành viên và quan hệ của bản thiết kế.
- [x] Mọi mutation lưu đều tenant-scoped, yêu cầu quyền trưởng họ và hiển thị trạng thái đang lưu/thành công/lỗi tiếng Việt.
- [x] Khung khởi điểm của bản thiết kế trống mặc định giới tính Nam.
- [x] Panel thông tin dùng hai checkbox Nam/Nữ loại trừ nhau, không còn thẻ `select` giới tính.
- [x] Thành viên thêm mới nhận giới tính suy ra từ giới tính thành viên gốc: vợ/chồng là giới tính ngược lại, con trai là Nam và con gái là Nữ.
- [x] Hộp chọn quan hệ làm mờ và vô hiệu hóa “Chồng” khi gốc là Nam, “Vợ” khi gốc là Nữ, kèm lý do tiếng Việt.
- [x] Model Person và Relationship không còn cột `deletedAt`; không còn read path nào lọc `deletedAt` cho hai bảng này.
- [x] Migration mới dọn sạch các dòng đã soft delete trước khi drop cột, và gỡ các khóa ngoại trỏ tới Person bị xóa.
- [x] Xóa thành viên (một người hoặc theo nhánh khi “Lưu tất cả”) thực sự xóa dòng dữ liệu trong cùng transaction.
- [x] Panel “Thông tin thành viên” cho chỉnh sửa tên, tên thường gọi, tên tự/hiệu, giới tính, còn sống, ngày sinh, ngày mất, ngày giỗ âm lịch, nơi an táng, điện thoại, ảnh đại diện và tiểu sử.
- [x] Cả “Lưu thành viên” và “Lưu tất cả” đều ghi được toàn bộ các trường trên; không có trường nào chỉnh được mà bị bỏ khi lưu.
- [x] Tick “Còn sống” ẩn tên tự/hiệu, ngày mất, ngày giỗ và nơi an táng, đồng thời xóa giá trị của bốn trường đó để không lưu dữ liệu mâu thuẫn.
- [x] Bốn trường đó nằm chung trong một khung “Thông tin người đã mất”, ngay dưới ô “Còn sống”.
- [x] Chọn một thành viên có con sẽ hiện khung “Danh sách con”, mỗi dòng có nhãn “Thứ N” theo đúng thứ tự hiện tại.
- [x] Mỗi dòng có nút lên/xuống để đổi thứ tự; nút bị vô hiệu hóa ở đầu và cuối danh sách.
- [x] Đổi thứ tự cập nhật ngay vị trí khung con trên canvas và `orderInFamily` khi lưu.
- [x] Thành viên không có con thì không hiện khung này.
- [x] Không còn nút “Lưu thành viên”; mọi chỉ dẫn trong UI đều nói tới một nút lưu duy nhất.
- [x] Nút lưu bị vô hiệu hóa và hiển thị “Đã lưu” khi bản thiết kế trùng với trạng thái đã lưu.
- [x] Mọi thay đổi (sửa trường, thêm/xóa thành viên, đổi thứ tự con, tải ảnh) đều làm nút lưu sáng lại.
- [x] Sửa rồi hoàn tác về đúng trạng thái cũ thì nút lưu tắt trở lại.
- [x] Gia phả chưa có thành viên nào thì nút lưu sáng ngay từ đầu.
- [x] Có primitive toast dùng chung, gắn ở root layout, tự đóng và có nút đóng thủ công.
- [x] Mọi thông báo thành công/lỗi tạm thời ở web đều hiển thị bằng toast; không còn khối thông báo inline trong form.
- [x] Lý do hết phiên khi bị chuyển về trang đăng nhập cũng hiện bằng toast.
- [x] Chọn tệp ảnh sẽ mở hộp cắt ảnh hiển thị ảnh gốc, cho kéo để chỉnh vị trí và phóng to thu nhỏ.
- [x] Bấm “Lưu ảnh” thì ảnh sau khi cắt được tải lên và hiện preview trong khung ảnh đại diện.
- [x] Hủy hộp cắt ảnh thì không tải gì lên và ảnh đại diện hiện tại giữ nguyên.
- [x] Khung trên canvas hiển thị ảnh đại diện nếu có, giữ icon mặc định nếu chưa có, và vòng màu theo giới tính vẫn còn.
- [x] Cả ba chỗ hiển thị chân dung (khung canvas, biểu tượng đầu panel, ô xem trước ảnh) đều dùng ảnh đại diện khi có; icon mặc định chỉ còn là fallback.
- [x] Icon mặc định là minh họa chân dung phẳng: nam tóc ngắn com-lê xanh navy, nữ tóc dài áo hồng; nhận biết giới tính không cần dựa vào màu và vẫn đọc được ở 28px.
- [x] Bấm “Xóa ảnh đại diện” hoặc “Đổi ảnh” sẽ xóa tệp cũ khỏi thư mục media.
- [x] Bấm “Lưu ảnh” trong hộp cắt chỉ giữ ảnh trong bộ nhớ và hiện xem trước; thư mục media chưa có tệp nào.
- [x] Ảnh chỉ được tải lên khi “Lưu tất cả” chạy; bỏ dở hoặc rời trang thì không sinh tệp nào.
- [x] Ảnh đang chờ làm nút lưu sáng lên, và hiện xem trước ở cả khung canvas lẫn panel.
- [x] API từ chối xóa tệp mà một Person đã lưu vẫn trỏ tới; web xếp hàng và xóa lại ngay sau lần lưu kế tiếp.
- [x] Endpoint xóa yêu cầu đăng nhập, quyền `MEMBER_PLUS` và chỉ chạm được thư mục của đúng dòng họ.
- [x] `apps/api/media/` nằm trong `.gitignore` gốc và không còn xuất hiện trong `git status`.
- [x] Panel có nút “Thêm ảnh”/“Đổi ảnh” kèm xem trước và nút xóa ảnh; không còn ô nhập đường dẫn.
- [x] Ảnh tải lên được lưu vào thư mục `media` theo từng dòng họ, tên tệp do server sinh.
- [x] Endpoint tải lên và đọc ảnh đều tenant-scoped, yêu cầu đăng nhập; tải lên yêu cầu quyền `MEMBER_PLUS`.
- [x] Server kiểm tra định dạng, dung lượng tối đa 2 MB và magic bytes trước khi ghi tệp.
- [x] Person có cột `honorific` nullable, DTO/API và luồng “Lưu tất cả” giữ được giá trị tối đa 100 ký tự.
- [x] Panel có ô “Danh xưng”; cây thiết kế và cây gia phả hiển thị danh xưng khi có.
- [x] Migration `drop_person_relationship_soft_delete` và `add_person_honorific` đã áp dụng thành công vào database phát triển.
- [ ] QA lại trang thiết kế bằng phiên trưởng họ, gồm lưu/tải lại Danh xưng.
