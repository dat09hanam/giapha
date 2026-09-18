# Memory

## Snapshot

- Status: in-progress
- Last updated: 2026-09-18
- Current result: route thiết kế tải cây đã lưu, cho lưu riêng thành viên hoặc lưu nguyên tử toàn bộ người/quan hệ/xóa mềm; lint và TypeScript của web/API đã qua
- Next action: QA hai nút lưu và tải lại trang bằng phiên trưởng họ trên dữ liệu thật

## Decisions

- Form hồ sơ cho phép sửa tên, quê quán/nguồn gốc, địa chỉ, ngày giỗ họ và phần giới thiệu; slug chỉ đọc.
- Mutation hồ sơ tiếp tục dựa trên `FamilyAccessGuard` và `request.familyAccess.familyId`; client không gửi `tenantId`.
- Backend dùng global `ApiExceptionFilter` và `validationExceptionFactory` để mọi lỗi HTTP/validation có payload tiếng Việt thống nhất.
- Web chỉ gọi `fetch` qua `apiFetch`; fallback phân biệt HTTP status, lỗi mạng, timeout và response rỗng/không hợp lệ.
- 401 chuyển tới login kèm `reason=session-expired`; 403 được giữ lại để hiển thị lỗi quyền truy cập tại đúng trang.
- CORS khai báo rõ GET/HEAD/POST/PATCH/DELETE/OPTIONS; lỗi cập nhật hồ sơ trước đây do preflight không cho PATCH.
- Logout thất bại không còn bị bỏ qua hoặc chuyển trang giả thành công.
- Tách `FamilyDetails` khỏi `FamilySummary` để không làm sai contract cây gia phả.
- Ngày giỗ họ dùng một component gồm hai `select` Ngày/Tháng; trình duyệt di động hiển thị bánh xe hệ điều hành và người dùng không thể nhập văn bản.
- Component tự giới hạn ngày theo tháng, kẹp ngày khi đổi sang tháng ngắn hơn và tiếp tục gửi contract `DD/MM` hiện có.
- Nút “Thiết kế gia phả” tạo URL từ slug trong phiên đã xác thực và trỏ tới `/<slug>/thiet_ke`.
- `requireFamilyManager` dùng chung cho route quản trị và thiết kế, kiểm tra phiên, vai trò `MEMBER_PLUS` và canonical tenant slug.
- Designer dùng React Flow và state dạng nhánh gia đình: spouse nằm cùng độ sâu, child tăng một độ sâu; node không hiển thị nhãn vai trò.
- “Lưu thành viên” dùng POST/PATCH Person hiện có, ghi các trường đang chỉnh sửa và đồng bộ ID database về node để lần sau là update.
- “Lưu tất cả” gọi `POST /families/:slug/tree/design`; service xác thực client ID, parent graph, spouse graph và quyền tenant rồi ghi trong transaction serializable.
- Xóa trên canvas được giữ trong draft; các Person đã lưu chỉ bị soft-delete khi bấm “Lưu tất cả”.
- Chọn node được xử lý cả ở nội dung khung và `ReactFlow.onNodeClick`; một `selectedMemberId` duy nhất điều khiển highlight.
- Khung gốc không thể xóa. Xóa spouse chỉ lọc spouse khỏi branch; xóa primary ở thế hệ dưới loại toàn branch và chuyển selection về primary của branch cha.
- Mọi thao tác xóa cần xác nhận qua `alertdialog`; cảnh báo rõ khi cả nhánh phụ thuộc sẽ bị xóa.

## Files and contracts

- `apps/api/src/common/filters/api-exception.filter.ts`: payload `{ statusCode, message }`, fallback tiếng Việt theo status và chặn message tiếng Anh ngoài dự kiến.
- `apps/api/src/common/validation/validation-error.ts`: Việt hóa validation theo tên trường và constraint.
- `apps/api/src/main.ts`: đăng ký filter/validation factory và cho phép đầy đủ method CORS đang dùng.
- Các service/controller/guard/pipe trong `apps/api/src`: exception nghiệp vụ và xác thực đã Việt hóa.
- `apps/web/src/lib/api-error.ts`: `ApiRequestError`, `apiFetch`, parser message và fallback theo hành động.
- `apps/web/src/lib/api.ts`, `auth-api.ts`, `family-api.ts`: toàn bộ API client dùng parser chung.
- `apps/web/src/components/ui/api-error-state.tsx`: hiển thị lỗi API cho server-rendered routes.
- Login, logout, tạo dòng họ và cập nhật hồ sơ hiển thị lỗi cụ thể qua `getApiErrorMessage`.
- `apps/web/src/components/ui/death-anniversary-picker.tsx`: bộ chọn Ngày/Tháng dùng chung, hỗ trợ bắt buộc hoặc cho phép xóa giá trị.
- Form tạo dòng họ và form chỉnh sửa hồ sơ đều dùng bộ chọn chung; không còn logic nhập/mask ngày giỗ bằng bàn phím.
- Các route gia phả/admin bắt `ApiRequestError`; login nhận lý do hết phiên.
- `apps/web/src/app/admin/[slug]/page.tsx`: thêm nút outline “Thiết kế gia phả” giữa nút xem cây và đăng xuất.
- `apps/web/src/lib/family-manager.ts`: guard server dùng chung cho hai khu vực của trưởng họ.
- `apps/web/src/app/[slug]/thiet_ke/`: page, loading và error state của route thiết kế.
- `apps/web/src/components/tree/family-tree-designer.tsx`: canvas, node, layout quan hệ, modal chọn quan hệ, panel chỉnh sửa và hai luồng lưu.
- `apps/web/src/lib/family-tree-design-api.ts`: client lưu riêng Person và lưu toàn bộ thiết kế qua parser lỗi chung.
- `apps/api/src/family-tree/dto/save-family-tree-design.dto.ts`: contract tối đa 500 Person/Relationship cùng danh sách ID xóa.
- `apps/api/src/family-tree/family-tree.service.ts`: tải spouse relationships và transaction ánh xạ client ID sang Person ID, cập nhật parent/spouse, soft-delete an toàn theo familyId.
- Không có migration hoặc dependency mới.

## Verification

- Web lint/typecheck: pass.
- API lint và `tsc --noEmit`: pass.
- API workspace typecheck wrapper trước đó bị `EPERM` ở `prisma generate` do query engine DLL đang bị tiến trình dev giữ; compiler trực tiếp đã qua.
- API test runner: repository không có tệp test nên thoát mã 1; không tạo `*.spec.ts` theo quy ước repository.
- Live API: invalid slug 400, thiếu session 401, endpoint không tồn tại 404 và validation nhiều trường đều trả tiếng Việt cụ thể.
- Web parser probe: message nghiệp vụ và lỗi mất kết nối đều được mô tả tiếng Việt theo hành động.
- Session giả trên `/admin`: redirect có `reason=session-expired`; login render thông báo hết phiên.
- CORS preflight PATCH: 204, đúng web origin, có credentials và danh sách method đầy đủ.
- PATCH không session: tới controller/guard và trả 401 tiếng Việt, xác nhận trình duyệt không còn bị chặn ở preflight.
- Prettier scoped files và `git diff --check`: pass.
- Bộ chọn ngày giỗ họ: web lint/typecheck pass; tìm kiếm toàn bộ web xác nhận chỉ hai form nhập liệu và cả hai dùng component chung.
- Nút trang thiết kế: formatter, web lint/typecheck và `git diff --check` pass; href khớp `/<slug>/thiet_ke`.
- Trang thiết kế: web lint/typecheck pass; dev SSR biên dịch route và redirect người chưa đăng nhập về đúng login next URL.
- Kiểm tra tĩnh xác nhận node không có nhãn vai trò, đủ bốn lựa chọn và quy tắc depth đúng.
- Browser backend không khả dụng nên chưa click/chụp ảnh trực quan.
- Highlight node: formatter, web lint/typecheck pass; kiểm tra nguồn xác nhận click toàn node và trạng thái selected duy nhất.
- Xóa thành viên: formatter, web lint/typecheck và `git diff --check` pass; kiểm tra nguồn xác nhận đủ guard gốc, confirm và hai nhánh xóa.
- Hai chế độ lưu: Prettier scoped files, TypeScript web/API và lint đầy đủ web/API pass.
- Kiểm tra quyền/tenancy: endpoint bulk yêu cầu `MEMBER_PLUS`, lấy `familyId` từ `FamilyAccessGuard`; mọi query/update/delete đều kèm familyId.
- API không có tệp test hiện hữu, nên chưa có test runner case cho transaction mới.
- Visual/authenticated save check: chưa chạy vì không có browser backend/session.

## Blockers and risks

- Cần một lần QA bằng tài khoản trưởng họ để xác nhận PATCH hồ sơ, refresh và nút thiết kế trên dữ liệu thật.
- Chưa có kiểm thử trực quan có session vì browser backend không khả dụng.
- Nếu cần chạy wrapper API typecheck sạch, dừng tiến trình dev đang giữ Prisma query engine trước.

## Handoff

Đăng nhập `/ho-nguyen/thiet_ke`, lưu riêng một node mới, lưu toàn bộ cây, tải lại và xác nhận Person/parent/spouse/xóa mềm được giữ đúng; sau đó kiểm tra lưu/tải lại hồ sơ admin.
