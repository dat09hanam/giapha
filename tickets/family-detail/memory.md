# Memory

## Snapshot

- Status: in-progress
- Last updated: 2026-09-27
- Current result: Đã sửa orderGenerationMembers để chồng luôn là đầu nhóm, vợ theo sau và nhiều vợ xếp theo wifeOrder; sửa tên, danh xưng hoặc năm sinh không còn làm hai khung đổi trái–phải.
- Next action: QA trực quan bằng phiên trưởng họ với Cụ tổ Ông + Cụ tổ Bà, gồm sửa tên/danh xưng/năm sinh và trường hợp có nhiều vợ.

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
- Trạng thái “có thay đổi chưa lưu” tính bằng cách so `JSON.stringify(designPayload)` với `savedSnapshot` — snapshot của payload tại lần lưu thành công gần nhất. Cách này bắt được cả trường hợp sửa rồi hoàn tác, thay vì phải gắn cờ dirty thủ công ở từng chỗ mutate.
- `savedSnapshot` khởi tạo là `null` khi gia phả chưa có người nào, để khung khởi điểm chưa lưu vẫn được coi là thay đổi.
- Sau khi lưu, snapshot dựng từ `designPayload` đã gửi cộng database ID trả về, không dựng từ `rootBranch` hiện tại — người dùng có thể vẫn đang gõ trong lúc request bay, và `setRootBranch` vẫn phải dùng dạng functional để không nuốt mất chỉnh sửa đó.
- Chỉ còn một đường lưu duy nhất là “Lưu tất cả”. Nút “Lưu thành viên” đã bỏ vì lưu riêng một người sẽ bỏ sót quan hệ vợ/chồng, thứ tự con và danh sách xóa. `saveDesignerPerson` cùng các type của nó đã gỡ khỏi web; endpoint POST/PATCH Person ở API vẫn giữ nguyên.
- “Lưu tất cả” gọi `POST /families/:slug/tree/design`; service xác thực client ID, parent graph, spouse graph và quyền tenant rồi ghi trong transaction serializable.
- Xóa trên canvas chỉ nằm trong draft; các Person đã lưu chỉ thật sự bị xóa khỏi database khi bấm “Lưu tất cả”.
- Con thuộc về branch chứ không thuộc riêng primary hay spouse, nên chọn primary hay bất kỳ vợ/chồng nào cũng thấy cùng một danh sách con. `findBranchContainingMember` và `updateBranchContainingMember` dùng chung quy ước này.
- Thứ tự mảng `children` là nguồn duy nhất quyết định cả vị trí trái-phải trên canvas lẫn `orderInFamily` khi lưu, nên nút sắp xếp chỉ cần hoán vị mảng.
- Bấm tên con trong danh sách sẽ chọn luôn khung đó trên canvas.
- Chọn node được xử lý cả ở nội dung khung và `ReactFlow.onNodeClick`; một `selectedMemberId` duy nhất điều khiển highlight.
- Khung gốc không thể xóa. Xóa spouse chỉ lọc spouse khỏi branch; xóa primary ở thế hệ dưới loại toàn branch và chuyển selection về primary của branch cha.
- Mọi thao tác xóa cần xác nhận qua `alertdialog`; cảnh báo rõ khi cả nhánh phụ thuộc sẽ bị xóa.
- Khung khởi điểm của bản thiết kế trống mặc định `MALE` thay vì `UNKNOWN`.
- Ảnh thay thế khi chưa có avatar là ba PNG imagegen nền trong suốt tại apps/web/public/images/avatars/; bản 512×512 đã được làm sạch alpha và nén cho web.
- PersonAvatar ánh xạ MALE/FEMALE sang ảnh Nam/Nữ; OTHER và UNKNOWN dùng ảnh trung tính để không gán nhầm giới tính. Component dùng next/image và không còn chứa SVG.
- PersonAvatar nhận generation và birthDate theo số đời hiển thị 1-based: đời 1–3 luôn là người lớn tuổi; đời 4+ dùng currentYear - birthYear >= 70; thiếu năm sinh thì giữ avatar hiện tại. OTHER/UNKNOWN tiếp tục dùng ảnh trung tính.
- `GenderAvatarFallback` trong designer bọc `PersonAvatar` và thêm nhãn `sr-only`; dùng chung cho cả ba chỗ hiển thị chân dung.
- Panel chỉ phơi hai giá trị giới tính Nam/Nữ dưới dạng checkbox loại trừ nhau; `OTHER`/`UNKNOWN` từ dữ liệu cũ hiển thị là không ô nào được tick và người dùng chọn lại được. Không đổi enum `Gender` ở API.
- Giới tính thành viên mới suy từ thành viên gốc: vợ/chồng nhận giới tính ngược lại của gốc, con trai `MALE`, con gái `FEMALE`. Gốc `OTHER`/`UNKNOWN` quay về suy theo nhãn quan hệ.
- Lựa chọn quan hệ không hợp lệ theo giới tính bị `disabled` + `opacity-40` và hiển thị lý do tiếng Việt thay cho mô tả; `addRelationship` tự chặn lại nên không phụ thuộc riêng vào UI.
- Person và Relationship không còn `deletedAt`: xóa là xóa thật. Family, User và Media vẫn soft delete.
- Xóa cứng Person phải gỡ trước mọi tham chiếu vì các FK là `Restrict`: null `fatherId`/`motherId` của con, null `Media.personId`, xóa Relationship liên quan. Gom trong `detachPersonReferences` và dùng chung cho `deletePerson` lẫn `saveDesign`.
- Migration dọn các dòng đã soft delete trước khi drop cột, nếu không chúng sẽ hiện lại thành dữ liệu rác.
- Sau khi bỏ soft delete, `saveDesign` xóa hẳn quan hệ của những người được lưu rồi upsert lại, nên nhánh `update` của upsert không còn hồi sinh dòng cũ.
- Panel thiết kế chỉnh sửa đủ trường Person; `generation`/`orderInFamily`/cha mẹ vẫn do vị trí canvas quyết định và chỉ hiển thị read-only.
- Danh xưng dùng `Person.honorific` nullable `VARCHAR(100)`, tách khỏi họ tên/tên thường gọi/tên tự; panel cho nhập tự do và node chỉ hiển thị khi có giá trị.
- Node luôn render một hàng Danh xưng cao 1rem; trạng thái trống dùng invisible và khoảng trắng không ngắt dòng để giữ bố cục nhưng không tạo nội dung thừa cho người dùng.
- Ngày sinh/ngày mất chuyển từ ô nhập năm sang `input[type=date]`, nên contract design DTO dùng `birthDate`/`deathDate` thay cho `birthYear`/`deathYear`.
- Panel xếp theo thứ tự: họ tên, tên thường gọi, giới tính, ngày sinh, ô “Còn sống”, khung “Thông tin người đã mất”, rồi điện thoại/ảnh/tiểu sử. Ô “Còn sống” đặt ngay trên khung nó điều khiển để không có trường nào biến mất ở phía trên chỗ vừa bấm.
- `isAlive` điều khiển cả nhóm trường của người đã mất: tick “Còn sống” ẩn và xóa tên tự/hiệu, ngày mất, ngày giỗ, nơi an táng; nhập ngày mất thì tự bỏ tick. Phải xóa giá trị chứ không chỉ ẩn, nếu không dữ liệu bị ẩn vẫn được lưu xuống.
- `DeathAnniversaryPicker` nhận thêm `label` và `maxDayInMonth`; ngày giỗ âm lịch của cá nhân giới hạn 30 ngày đúng ràng buộc DTO.
- `.prettierrc.json` gốc dùng single quote/width 100 nhưng `family-tree-designer.tsx` đã commit theo double quote/width 80. Giữ style của tệp khi sửa; chạy prettier mặc định repo sẽ format lại toàn bộ tệp và làm nhiễu diff.

- Designer dùng draft chuẩn hóa gồm toàn bộ Person, fatherId/motherId và quan hệ vợ chồng; không còn dùng cây FamilyBranch làm nguồn dữ liệu vì cấu trúc đó không thể biểu diễn đồng thời tổ tiên của cả hai vợ chồng.
- Tính generation bằng cách gom vợ/chồng cùng một nhóm rồi chạy topo theo cạnh cha/mẹ; thêm tổ tiên phía trên sẽ dịch đồng bộ người đang chọn, vợ/chồng và con cháu.
- Logic vẫn chỉ cho tạo Bố mới. Modal hiển thị thêm ô Mẹ để đủ cặp Bố–Mẹ nhưng MOTHER luôn trả blocked reason tiếng Việt, nên nút bị mờ/disabled và addRelationship thoát trước khi sửa draft. motherId từ dữ liệu cũ vẫn được giữ trong draft/payload.
- Canvas chỉ dựng một cạnh cha–con: ưu tiên fatherId hợp lệ và chỉ dùng motherId làm phương án dự phòng cho dữ liệu cũ chưa có bố. Khi thêm con từ người mẹ đã có chồng, addRelationship đã gán người chồng vào fatherId nên đường nối vẫn xuất phát từ khung Bố; motherId vẫn được lưu nhưng không tạo cạnh thứ hai.
- “Con gái” trong quy tắc thêm quan hệ là Person có gender FEMALE và có ít nhất một trong fatherId/motherId. Với đối tượng này, option HUSBAND không được render và relationshipChoiceBlockedReason cũng từ chối thao tác để bảo vệ quy tắc ngoài UI.
- Modal dùng vị trí grid tường minh theo từng RelationshipKind: hàng 1 Bố–Mẹ, hàng 2 Chồng–Vợ, hàng 3 Con trai–Con gái. Nhờ vậy khi HUSBAND bị ẩn cho con gái, WIFE và các lựa chọn con không bị dồn sang ô khác.
- Trên canvas, spouse mới sao chép orderInFamily của người gốc. Khi generation và orderInFamily bằng nhau, sortMembers so name; orderGenerationMembers duyệt phần tử đứng trước rồi ghép spouse phía sau, và createFlowElements ánh xạ thứ tự đó trực tiếp sang trục x. Vì vậy đổi tên có thể đảo trái–phải dù relationship husbandId/wifeId không đổi.
- orderGenerationMembers hiện coi wifeId (và motherId trong cặp đồng cha mẹ) là thành viên phụ thuộc, lấy chồng/bố làm đầu nhóm và sắp các wifeId theo wifeOrder. Tên chỉ còn sắp giữa các nhóm độc lập; vòng fallback vẫn bảo đảm dữ liệu cũ không làm mất node.
- Trường deletesBranch chỉ tồn tại trong state web để giữ hành vi xóa cũ; cha/mẹ thêm mới và spouse xóa riêng, child branch vẫn xóa cả nhánh. Trường này không đi vào API payload.

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
- `apps/web/src/components/tree/family-tree-designer.tsx`: canvas, node, layout quan hệ, modal chọn quan hệ, panel chỉnh sửa, luồng “Lưu tất cả” và các helper giới tính `oppositeGender`/`relationshipGender`/`relationshipChoiceBlockedReason` cùng hằng `GENDER_CHOICES`/`SPOUSE_KINDS`.
- apps/web/src/components/ui/person-avatar.tsx và apps/web/public/images/avatars/: ánh xạ Gender, đời và năm sinh sang năm ảnh PNG imagegen; tree-layout truyền birthDate vào node công khai.
- `apps/web/src/lib/family-tree-design-api.ts`: client lưu toàn bộ thiết kế qua parser lỗi chung, gồm `honorific`.
- `apps/api/src/family-tree/dto/save-family-tree-design.dto.ts`: contract tối đa 500 Person/Relationship cùng danh sách ID xóa; mỗi Person mang đủ trường hồ sơ.
- `apps/api/prisma/schema.prisma` và `apps/api/prisma/migrations/20260918120000_drop_person_relationship_soft_delete/`: bỏ cột và index `deletedAt` của Person/Relationship.
- `apps/api/src/family-tree/family-tree.types.ts`: `FamilyTreeResponse.people` trả đủ trường để panel thiết kế nạp lại được.
- `apps/web/src/components/ui/death-anniversary-picker.tsx`: thêm `label` và `maxDayInMonth`, mặc định giữ nguyên hành vi cũ.
- `apps/api/src/family-tree/family-tree.service.ts`: tải spouse relationships và transaction ánh xạ client ID sang Person ID, cập nhật đủ trường Person/parent/spouse và xóa cứng theo familyId.
- Migration mới `20260918150000_add_person_honorific` thêm cột nullable; không có dependency mới.

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
- Quy tắc giới tính: web lint, web typecheck và `git diff --check` pass; prettier kiểm tra theo style hiện có của tệp cũng pass.
- Kiểm tra nguồn: `buildDesignPayload` vẫn suy husband/wife đúng vì vợ/chồng luôn ngược giới tính gốc.
- Bỏ soft delete + mở rộng trường: prisma validate, db:generate, lint và TypeScript của cả hai workspace pass; prettier pass theo style của từng tệp.
- `grep deletedAt` trong `family-tree.service.ts` chỉ còn ba chỗ lọc Family.
- Database phát triển đã áp cả migration bỏ soft delete và migration thêm `honorific`; Prisma Client generate bình thường sau migrate.
- Trường Danh xưng: prisma validate, lint toàn hệ thống, API/web TypeScript compiler và `git diff --check` pass.

- Chiều cao node có/không có Danh xưng: web lint, TypeScript compiler và kiểm tra diff đều pass.

- Bộ avatar imagegen: kiểm tra trực quan ảnh Nam/Nữ/Trung tính sau resize/alpha cleanup; web lint, web typecheck và git diff --check đều pass.

- Avatar các cụ: hai PNG 512×512 nền trong suốt đã kiểm tra trực quan; helper chọn avatar qua 6/6 ca, web lint/typecheck và git diff --check pass.

- Quy tắc chỉ thêm Bố và khóa thành viên nữ đã có chồng: web lint, web typecheck và git diff --check pass; chưa QA tương tác bằng phiên trưởng họ.
- Cạnh cha–con ưu tiên Bố: web lint, web typecheck và git diff --check pass; chưa QA trực quan bằng phiên trưởng họ.
- Ẩn option Chồng cho con gái: web lint, web typecheck và git diff --check pass; chưa QA trực quan bằng phiên trưởng họ.
- Lưới quan hệ ba hàng và ô Mẹ disabled: web lint, web typecheck và git diff --check pass. Không có browser khả dụng trong phiên nên chưa QA trực quan.
- Sửa vị trí spouse: web lint, web typecheck và git diff --check pass. Chồng luôn đứng trước vợ, nhiều vợ theo wifeOrder; chưa QA trực quan vì không có browser khả dụng trong phiên.

## Media

- Ảnh lưu trên đĩa tại `MEDIA_ROOT` (mặc định `apps/api/media`), chia theo thư mục `<familyId>/`. Toàn bộ `apps/api/media/` nằm trong `.gitignore` gốc, không theo dõi gì trong git. Không cần giữ folder trong repo vì `saveImage` dùng `mkdir(..., { recursive: true })` nên thư mục tự sinh khi cần. `MEDIA_ROOT` đã có trong `apps/api/.env.example`.
- Ảnh đã cắt được giữ trong state `pendingAvatars` (File + object URL để xem trước) và chỉ thật sự tải lên trong `saveAll`. Nhờ vậy bỏ dở hoặc rời trang không sinh tệp nào trong thư mục media. `hasUnsavedChanges` phải cộng thêm `pendingAvatars.size` vì payload chưa đổi khi ảnh còn đang chờ.
- Khi `saveAll` tải ảnh xong, payload được dựng lại từ branch đã gắn URL mới chứ không dùng `designPayload` đã memo, nếu không avatar mới sẽ không được ghi xuống.
- Hộp cắt ảnh từng báo nhầm “Không mở được ảnh này”: StrictMode chạy effect hai lần, cleanup lần đầu revoke object URL làm `onerror` của ảnh đang decode bắn ra. Đã chặn bằng cờ `cancelled`.
- Tải lên dùng JSON base64 chứ không dùng multipart, để không phải thêm `@fastify/multipart`; đổi lại phải nâng `bodyLimit` của Fastify lên 6 MB.
- Server tự sinh tên tệp `<uuid>.<ext>`, không dùng tên tệp của client, và kiểm tra magic bytes để chặn tệp khai sai định dạng. Giới hạn 2 MB.
- `Person.avatarUrl` lưu `/media/<uuid>.<ext>` — không chứa host, không chứa tenant. Thư mục dòng họ suy ra từ `familyId` của `FamilyAccessGuard` khi đọc, nên giá trị trong DB không thể dùng để đọc chéo tenant.
- `apps/web/src/components/ui/image-cropper.tsx` là cropper vuông tự viết (kéo bằng pointer event + thanh zoom, xuất qua canvas), không thêm dependency. Ảnh luôn xuất JPEG 512×512 chất lượng 0.9, tô nền trắng trước khi vẽ vì JPEG không có kênh alpha.
- Vì luôn cắt và nén lại trước khi gửi, giới hạn phía client áp lên tệp gốc là 12 MB (`MAX_SOURCE_IMAGE_BYTES`) chứ không phải 2 MB; 2 MB là giới hạn API áp lên thứ thật sự được tải lên, và ảnh sau khi cắt luôn nhỏ hơn nhiều.
- `@fastify/helmet` đặt `Cross-Origin-Resource-Policy: same-origin` cho mọi response, khiến `<img>` từ origin của API bị trình duyệt chặn dù request thành công. Route đọc ảnh tự ghi đè thành `cross-origin`; helmet gắn header ở hook `onRequest` nên handler ghi đè được, và các response khác vẫn giữ `same-origin`.
- Khung trên canvas nhận `avatarSrc` đã resolve sẵn trong `DesignerNodeData`, vì node không biết family slug; `createFlowElements` nhận thêm tham số `familySlug` để dựng URL.
- `familyMediaSrc()` ở web ghép URL API cho `<img>`. Ảnh đọc qua endpoint có guard; cookie `SameSite=Strict` vẫn được gửi vì web và API cùng site (cùng host `localhost`, cookie bỏ qua port). Nếu tách sang hai domain khác nhau thì mọi client-side API call cũng hỏng, không riêng ảnh.
- Validation `avatarUrl` chuyển từ `@IsUrl` sang `AVATAR_URL_PATTERN` dùng chung ở `apps/api/src/common/validation/avatar-url.ts`, chấp nhận cả ảnh đã tải lên lẫn http(s) của dữ liệu cũ.
- Model `Media` trong Prisma vẫn chưa dùng; ảnh đại diện chỉ nằm ở `Person.avatarUrl`.
- `DELETE /families/:slug/media/:fileName` từ chối (409) khi còn Person đã lưu trỏ tới tệp. Kiểm tra tham chiếu đặt trong `MediaService` chứ không ở client, để một client cũ hoặc lỗi cũng không xóa mất ảnh đang dùng.
- Web xóa tệp ngay khi người dùng gỡ hoặc đổi ảnh. Nếu API từ chối vì ảnh vẫn đang được tham chiếu, URL được xếp vào `pendingMediaCleanup` và xóa lại ngay sau lần “Lưu tất cả” thành công. Dọn tệp là best-effort: lỗi không bao giờ chặn người dùng.
- Thư mục `apps/api/media` đã được dọn sạch ngày 2026-09-18; lúc đó không Person nào có `avatarUrl` nên không còn tham chiếu treo.
- Cây công khai chưa render `avatarUrl`, nên chưa cần đổi gì ở `person-node.tsx`.

## Thông báo

- `apps/web/src/components/ui/toast.tsx` là primitive tự viết (context + `useToast`), không thêm dependency; `ToastProvider` bọc trong `app/layout.tsx`.
- Toast lỗi sống 7 giây, toast thành công 4 giây, cả hai đều có nút đóng; timer được dọn khi provider unmount.
- Đã gỡ `FormError` khỏi `auth/form-fields.tsx` vì không còn chỗ dùng.
- Hai chỗ cố ý KHÔNG chuyển sang toast: panel kết quả sau khi tạo dòng họ (chứa tài khoản/mật khẩu cần copy, không phải thông báo thoáng qua) và `api-error-state.tsx` (trạng thái lỗi cả trang, render từ server component nên không dùng được hook client).

## Blockers and risks

- Nếu người dùng gỡ ảnh đã lưu rồi bỏ đi mà không bấm lưu, tệp vẫn nằm lại vì API từ chối xóa khi Person còn trỏ tới. Đây là đánh đổi có chủ ý: thà còn tệp thừa hơn là hỏng ảnh mà database vẫn tham chiếu.
- Cần một lần QA bằng tài khoản trưởng họ để xác nhận PATCH hồ sơ, refresh và nút thiết kế trên dữ liệu thật.
- Chưa có kiểm thử trực quan có session vì browser backend không khả dụng.
- Nếu cần chạy wrapper API typecheck sạch, dừng tiến trình dev đang giữ Prisma query engine trước.

## Handoff

Bản sửa thứ tự vợ/chồng đã hoàn tất. Khi có browser/session trưởng họ, QA trường hợp Cụ tổ Ông + Cụ tổ Bà sau khi sửa tên/danh xưng/năm sinh và kiểm tra nhiều vợ vẫn theo wifeOrder.
