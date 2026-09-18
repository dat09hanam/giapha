# Plan

## Current objective

Thiết kế contract và triển khai lưu một thành viên hoặc toàn bộ bản thiết kế xuống database.

## Work items

- [x] Ghi nhận yêu cầu, phạm vi và tiêu chí chấp nhận.
- [x] Khảo sát route admin, model tenant, contract API và quy ước UI liên quan.
- [x] Chốt tập trường chỉnh sửa dựa trên domain model hiện có.
- [x] Mở rộng API tenant-scoped để cập nhật ngày giỗ họ, kể cả xóa giá trị.
- [x] Xây UI form quản lý thông tin dòng họ tại route admin.
- [x] Bổ sung trạng thái loading và error cho route.
- [x] Kiểm tra diff, formatter, lint và TypeScript compiler.
- [ ] Đăng nhập bằng tài khoản trưởng họ, lưu một thay đổi an toàn rồi tải lại để xác nhận.
- [x] Đồng bộ trạng thái ticket và memory cho handoff.
- [x] Kiểm kê toàn bộ điểm gọi API, error parser và exception backend.
- [x] Xây contract/parser lỗi dùng chung với fallback cụ thể theo status và lỗi mạng.
- [x] Chuyển mọi API client/component sang parser dùng chung.
- [x] Việt hóa các exception và validation backend còn trả tiếng Anh.
- [x] Chạy tìm kiếm chống sót, lint, typecheck và kiểm tra các kịch bản lỗi tiêu biểu.
- [x] Mở CORS cho PATCH/DELETE/OPTIONS và xác minh preflight cập nhật hồ sơ.
- [x] Tạo bộ chọn ngày/tháng dùng chung và thay cả hai ô nhập ngày giỗ họ.
- [x] Kiểm tra giới hạn ngày theo tháng, trạng thái bắt buộc/tùy chọn và contract DD/MM.
- [x] Xác định cụm thao tác quản trị và trạng thái route thiết kế hiện có.
- [x] Thêm nút dẫn tới `/{slug}/thiet_ke`, giữ bố cục đáp ứng màn hình nhỏ.
- [x] Chạy formatter, lint và typecheck web.
- [x] Tách guard server dùng chung cho route quản trị và route thiết kế.
- [x] Tạo route `/{slug}/thiet_ke` cùng loading/error state.
- [x] Xây canvas client với khung khởi điểm, panel chỉnh sửa và modal chọn quan hệ.
- [x] Bố trí vợ/chồng cùng hàng, con ở hàng dưới và vẽ đường nối không có nhãn vai trò.
- [x] Kiểm tra tương tác, responsive, formatter, lint và typecheck web.
- [x] Bắt sự kiện chọn trên toàn khung và tăng độ tương phản của trạng thái selected.
- [x] Chạy formatter, lint và typecheck web sau thay đổi highlight.
- [x] Thêm nút xóa trong panel và hộp xác nhận.
- [x] Cài quy tắc xóa spouse/nhánh con, bảo vệ khung khởi điểm và chuyển selection hợp lệ.
- [x] Chạy formatter, lint và typecheck web sau thay đổi xóa thành viên.
- [x] Khảo sát model Person/Relationship và chốt contract lưu draft không cần migration.
- [x] Xây API tenant-scoped lưu riêng thành viên và lưu toàn bộ draft trong transaction.
- [x] Mở rộng web API client và gắn hai nút lưu với trạng thái phản hồi tiếng Việt.
- [x] Đồng bộ database id trở lại state để lần lưu sau là update, không tạo trùng.
- [x] Chạy formatter, lint và typecheck cho cả API và web; kiểm tra các nhánh validation/quyền.

## Owned paths and coordination hotspots

- Ticket workspace: `tickets/family-detail/**`
- API: `apps/api/src/families/dto/update-family.dto.ts`, `apps/api/src/families/families.service.ts`
- Web route: `apps/web/src/app/admin/[slug]/**`, `apps/web/src/app/[slug]/thiet_ke/**`
- Designer UI/auth: `apps/web/src/components/tree/family-tree-designer.tsx`, `apps/web/src/lib/family-manager.ts`
- Web form/API/types: `apps/web/src/components/admin/family-profile-form.tsx`, `apps/web/src/lib/family-api.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/types/family-tree.ts`
- Coordination hotspot: response contract `FamilyDetails` giữa `GET/PATCH /families/:slug` và web.
- Error contract: `apps/api/src/common/filters/api-exception.filter.ts`, `apps/api/src/common/validation/validation-error.ts`, `apps/web/src/lib/api-error.ts`.
- API consumers: `apps/web/src/lib/api.ts`, `auth-api.ts`, `family-api.ts` và các form/page gọi chúng.

## Verification

- PASS: `npm run lint --workspace @giapha/web`
- PASS: `npm run typecheck --workspace @giapha/web`
- PASS: `npm run lint --workspace @giapha/api`
- PASS: `tsc --noEmit` trực tiếp trong `apps/api`.
- ENVIRONMENT: `npm run typecheck --workspace @giapha/api` dừng tại `prisma generate` vì query engine DLL đang bị tiến trình dev giữ; compiler chạy trực tiếp đã qua.
- NOT AVAILABLE: `npm run test --workspace @giapha/api` không tìm thấy test nào; repository cấm tạo tệp `*.spec.ts`.
- PASS: live `GET /api/families/ho-nguyen` trả 200 và đủ trường `FamilyDetails`.
- PASS: truy cập route admin không có session dẫn về `/login`.
- PASS: live 400, 401 và 404 đều trả message tiếng Việt cụ thể; validation nhiều trường trả mảng message.
- PASS: parser web giữ message nghiệp vụ, tổng hợp validation và chuyển lỗi kết nối thành thông báo tiếng Việt theo hành động.
- PASS: session giả trên `/admin` redirect với `reason=session-expired`; trang login hiển thị lý do tiếng Việt.
- PASS: preflight PATCH từ web origin trả 204 và `Access-Control-Allow-Methods` gồm PATCH/DELETE/OPTIONS.
- PASS: PATCH không session đi qua CORS tới API và trả 401 tiếng Việt thay vì lỗi kết nối.
- PASS: form tạo và chỉnh sửa đều dùng `DeathAnniversaryPicker`; không còn ô nhập tay cho ngày giỗ họ.
- PASS: bộ chọn giới hạn ngày theo tháng, chấp nhận 29/02 và giữ contract API `DD/MM`.
- PASS: lint và typecheck web sau thay đổi bộ chọn ngày/tháng.
- PASS: cụm thao tác quản trị có nút “Thiết kế gia phả” trỏ tới `/<slug>/thiet_ke`; slug lấy từ tenant đã xác thực.
- PASS: formatter, lint và typecheck web sau thay đổi nút thiết kế.
- PASS: route thiết kế dùng guard trưởng họ chung; request không session chứa redirect 307 tới `/login?next=%2Fho-nguyen%2Fthiet_ke`.
- PASS: kiểm tra nguồn xác nhận đủ bốn lựa chọn, vợ/chồng cùng độ sâu, con tăng một hàng và node không chứa nhãn vai trò.
- PASS: formatter, web lint, web typecheck và `git diff --check` sau khi thêm trang thiết kế.
- PASS: click toàn node gọi `selectMember`; đúng một node nhận `selected` và style highlight tương phản cao.
- PASS: web lint/typecheck sau thay đổi highlight.
- PASS: nút xóa bị vô hiệu hóa cho khung khởi điểm; hộp `alertdialog` yêu cầu xác nhận trước khi xóa.
- PASS: helper xóa lọc riêng spouse, loại toàn branch khi xóa primary ở thế hệ dưới và trả selection về primary của branch cha.
- PASS: formatter, web lint/typecheck và `git diff --check` sau thay đổi xóa thành viên.
- PASS: API và web TypeScript compiler sau khi nối hai chế độ lưu.
- PASS: lint đầy đủ cả web và API, không có lỗi/cảnh báo.
- PASS: kiểm tra nguồn xác nhận lưu riêng dùng POST/PATCH Person, lưu tất cả dùng transaction serializable tenant-scoped và đồng bộ database ID về state.
- NOT AVAILABLE: API hiện không có tệp test; không tạo `*.spec.ts` theo quy ước repository.
- NOT AVAILABLE: kiểm thử click/chụp ảnh vì phiên này không có browser backend.
- PENDING: kiểm tra trực quan và lưu/tải lại trong phiên trưởng họ; browser backend không khả dụng trong phiên này.

## Next action

Đăng nhập `/ho-nguyen/thiet_ke`, thử “Lưu thành viên”, “Lưu tất cả” rồi tải lại để QA dữ liệu thật; đồng thời hoàn tất QA lưu hồ sơ còn tồn.
