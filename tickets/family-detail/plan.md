# Plan

## Current objective

Áp migration bỏ soft delete rồi QA trang thiết kế bằng phiên trưởng họ.

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
- [x] Đặt mặc định Nam cho khung khởi điểm khi gia phả chưa có người nào.
- [x] Thay `select` giới tính bằng hai checkbox Nam/Nữ loại trừ nhau trong panel thông tin.
- [x] Suy giới tính thành viên mới từ giới tính thành viên gốc thay vì chỉ từ nhãn quan hệ.
- [x] Làm mờ, vô hiệu hóa và giải thích lựa chọn Vợ/Chồng không hợp lệ theo giới tính gốc.
- [x] Chạy formatter (theo style hiện có của tệp), lint và typecheck web.
- [x] Gỡ `deletedAt` khỏi model Person/Relationship và mọi filter/ghi trong `family-tree.service.ts`.
- [x] Viết migration dọn dữ liệu đã soft delete rồi drop index và cột.
- [x] Gom việc gỡ tham chiếu trước khi xóa cứng vào helper `detachPersonReferences`.
- [x] Cập nhật `docs/architecture.md` cho chiến lược xóa mới.
- [x] Mở rộng `FamilyTreeResponse`, `FamilyTreeDesignPersonDto` và service để mang đủ trường Person.
- [x] Thêm prop `label`/`maxDayInMonth` cho `DeathAnniversaryPicker` để tái dùng cho ngày giỗ âm lịch của cá nhân.
- [x] Dựng panel chỉnh sửa đầy đủ trường và nối cả hai luồng lưu.
- [x] Chạy prisma validate, db:generate, lint và typecheck cả hai workspace.
- [x] Ẩn và xóa ngày mất/ngày giỗ/nơi an táng khi tick “Còn sống”.
- [x] Thêm `MEDIA_ROOT`, module media (upload + đọc ảnh) và nâng body limit của Fastify.
- [x] Đổi validation `avatarUrl` sang pattern dùng chung chấp nhận cả `/media/...` và http(s).
- [x] Thay ô nhập đường dẫn bằng nút thêm ảnh có xem trước, trạng thái tải và nút xóa.
- [x] Chạy lint, typecheck cả hai workspace và probe endpoint media.
- [x] Gom trường của người đã mất vào khung riêng và chuyển ô “Còn sống” lên trên khung đó.
- [x] Thêm khung “Danh sách con” với nhãn Thứ N và nút đổi thứ tự.
- [x] Bỏ nút và luồng lưu riêng thành viên, dọn client/type không còn dùng.
- [x] Theo dõi thay đổi bằng snapshot payload và gắn trạng thái enable/disable cho nút lưu.
- [x] Viết primitive toast dùng chung và gắn provider ở root layout.
- [x] Chuyển designer, form hồ sơ, form tạo dòng họ, đăng nhập và đăng xuất sang toast; gỡ `FormError`.
- [x] Viết cropper vuông tự cắt bằng canvas và nối vào luồng thêm ảnh của designer.
- [x] Thêm endpoint xóa media có kiểm tra tham chiếu và nối vào nút xóa/đổi ảnh.
- [x] Hoãn tải ảnh tới lúc “Lưu tất cả”, giữ ảnh đã cắt trong bộ nhớ kèm xem trước cục bộ.
- [x] Sửa lỗi hộp cắt báo “Không mở được ảnh này” do StrictMode chạy effect hai lần.
- [ ] Chạy `npm run db:migrate` (hoặc `db:deploy`) để áp migration lên database.

## Owned paths and coordination hotspots

- Media: `apps/api/src/media/**`, `apps/api/src/common/validation/avatar-url.ts`, `apps/api/media/`, `apps/web/src/lib/media-api.ts`

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
- PASS: web lint và typecheck sau thay đổi quy tắc giới tính; `git diff --check` sạch.
- PASS: kiểm tra nguồn xác nhận khung khởi điểm mặc định `MALE`, panel chỉ còn hai checkbox Nam/Nữ, `relationshipGender` lấy giới tính ngược lại của gốc cho vợ/chồng và `addRelationship` chặn cả lựa chọn bị làm mờ.
- NOTE: `.prettierrc.json` gốc (single quote, width 100) khác style đã commit của `family-tree-designer.tsx` (double quote, width 80); giữ nguyên style tệp để diff chỉ chứa thay đổi giới tính.
- PASS: `npm run prisma:validate --workspace @giapha/api` và `npm run db:generate` sau khi bỏ `deletedAt`.
- PASS: lint và TypeScript compiler của cả API và web sau khi bỏ soft delete và mở rộng trường Person.
- PASS: `grep` xác nhận `family-tree.service.ts` chỉ còn lọc `deletedAt` cho Family; Person/Relationship không còn chỗ nào.
- PENDING: migration `20260918120000_drop_person_relationship_soft_delete` chưa được áp lên database; thao tác drop cột là phá hủy nên chờ developer chạy.
- PASS: lint và TypeScript của cả hai workspace sau khi thêm luồng tải ảnh.
- PASS: probe API đang chạy: `POST` và `GET /api/families/ho-nguyen/media/...` không có session đều trả 401 tiếng Việt, xác nhận module được nạp và guard hoạt động.
- FIXED: ảnh tải lên thành công nhưng không hiện preview vì `Cross-Origin-Resource-Policy: same-origin` của helmet; route đọc ảnh nay trả `cross-origin`.
- PASS: script fastify độc lập xác nhận `reply.header()` trong handler ghi đè được CORP của helmet và chỉ ảnh hưởng route đó.
- PENDING: xác nhận lại preview ảnh trên trình duyệt sau khi sửa CORP.
- PASS: lint, typecheck và prettier web sau khi cho khung canvas hiển thị ảnh đại diện.
- PASS: lint, typecheck API và web sau khi thêm luồng xóa tệp ảnh.
- PASS: probe `DELETE /api/families/ho-nguyen/media/<file>` không có session trả 401 và không đụng vào tệp nào trên đĩa.
- PENDING: chưa kiểm thử trên trình duyệt nhánh 409 (xóa ảnh đã lưu rồi lưu lại để dọn).
- PASS: lint, typecheck và build web sau khi hoãn tải ảnh tới lúc lưu.
- PASS: lint, typecheck và prettier web sau khi thêm khung danh sách con.
- PASS: lint, typecheck, prettier và `npm run build --workspace @giapha/web` sau khi thêm cropper.
- PASS: lint, typecheck, prettier và `npm run build --workspace @giapha/web` sau khi chuyển sang toast; build cần chạy vì provider client được gắn vào root layout.
- PASS: rà soát `role="alert"|role="status"` chỉ còn hai chỗ cố ý giữ: panel kết quả tạo dòng họ và `api-error-state`.
- PASS: lint, typecheck và prettier web sau khi thêm trạng thái dirty cho nút lưu.
- PASS: lint, typecheck và prettier web sau khi bỏ nút lưu thành viên; không còn tham chiếu `savingMemberId`/`saveSelectedMember`/`saveDesignerPerson`.
- PASS: kiểm tra nguồn xác nhận thứ tự mảng `children` vừa quyết định vị trí trong `createFlowElements` vừa quyết định `orderInFamily` trong `buildDesignPayload`, nên đổi thứ tự là nhất quán giữa canvas và dữ liệu lưu.

## Next action

Chạy `npm run db:migrate` để áp migration bỏ `deletedAt`, sau đó đăng nhập `/ho-nguyen/thiet_ke`, kiểm tra khung khởi điểm là Nam, đổi giới tính bằng checkbox, thêm quan hệ để xác nhận lựa chọn bị làm mờ đúng chiều, rồi thử “Lưu thành viên”, “Lưu tất cả” và tải lại; đồng thời hoàn tất QA lưu hồ sơ còn tồn.
