import type { Metadata } from 'next';

import { LegalPage, type LegalSection } from '@/components/legal/legal-page';
import { pageMetadata } from '@/lib/seo';
import { SITE_BRAND } from '@/lib/site-brand';
import { SITE_POLICY_LINKS } from '@/lib/site-contact';

export const metadata: Metadata = pageMetadata({
  title: 'Chính sách bảo mật',
  description: `Cách ${SITE_BRAND.name} thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn và dòng họ.`,
  path: '/chinh-sach-bao-mat',
});

const sections: readonly LegalSection[] = [
  {
    id: 'pham-vi',
    title: 'Phạm vi áp dụng',
    body: (
      <p>
        Chính sách này áp dụng cho toàn bộ website {SITE_BRAND.name}, bao gồm trang giới thiệu dịch
        vụ, biểu mẫu đăng ký, các trang gia phả của từng dòng họ và khu vực quản trị. Khi sử dụng
        dịch vụ, bạn xác nhận đã đọc và đồng ý với cách chúng tôi xử lý dữ liệu được mô tả dưới đây.
      </p>
    ),
  },
  {
    id: 'thong-tin-thu-thap',
    title: 'Thông tin chúng tôi thu thập',
    body: (
      <>
        <p>Chúng tôi chỉ thu thập những thông tin cần thiết để cung cấp dịch vụ:</p>
        <ul>
          <li>
            <strong>Thông tin đăng ký dịch vụ:</strong> họ và tên, số điện thoại, email (không bắt
            buộc) và gói dịch vụ bạn quan tâm.
          </li>
          <li>
            <strong>Thông tin tài khoản:</strong> tên đăng nhập, tên hiển thị, email (nếu có) và mật
            khẩu đã được mã hóa. Chúng tôi không lưu mật khẩu ở dạng đọc được.
          </li>
          <li>
            <strong>Dữ liệu gia phả:</strong> thông tin về các thành viên dòng họ do ban quản trị
            dòng họ nhập, như họ tên, giới tính, ngày sinh, ngày mất, ngày giỗ, quê quán, nơi ở, nơi
            an táng, nghề nghiệp, tiểu sử, ảnh chân dung và quan hệ gia đình.
          </li>
          <li>
            <strong>Nội dung đăng tải:</strong> hình ảnh, tư liệu, bài viết, bình luận, thông tin
            quỹ họ và công đức do thành viên đưa lên.
          </li>
          <li>
            <strong>Dữ liệu kỹ thuật:</strong> cookie phiên đăng nhập và một số thiết lập lưu trên
            trình duyệt của bạn (ví dụ tên hiển thị khi bình luận) để website hoạt động đúng.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'muc-dich',
    title: 'Mục đích sử dụng thông tin',
    body: (
      <ul>
        <li>Liên hệ tư vấn, kích hoạt và hỗ trợ gói dịch vụ bạn đã đăng ký.</li>
        <li>Tạo, lưu trữ, hiển thị và in ấn gia phả cho dòng họ của bạn.</li>
        <li>Xác thực đăng nhập, khôi phục mật khẩu và bảo vệ tài khoản.</li>
        <li>Thông báo về thay đổi dịch vụ, thời hạn gói hoặc sự cố kỹ thuật.</li>
        <li>Phát hiện và ngăn chặn hành vi lạm dụng, truy cập trái phép.</li>
      </ul>
    ),
  },
  {
    id: 'chia-se',
    title: 'Ai được xem dữ liệu gia phả',
    body: (
      <>
        <p>
          Mỗi dòng họ có không gian dữ liệu riêng, tách biệt với các dòng họ khác. Thông tin chi
          tiết về thành viên, tư liệu và bảng tin chỉ hiển thị cho người có tài khoản do ban quản
          trị dòng họ cấp. Ban quản trị dòng họ chịu trách nhiệm quyết định ai được cấp quyền truy
          cập.
        </p>
        <p>
          Chúng tôi <strong>không bán, cho thuê hay trao đổi</strong> dữ liệu cá nhân với bên thứ
          ba. Dữ liệu chỉ được cung cấp khi có yêu cầu hợp pháp của cơ quan nhà nước có thẩm quyền
          hoặc khi cần thiết để bảo vệ quyền lợi hợp pháp của người dùng và của chúng tôi.
        </p>
      </>
    ),
  },
  {
    id: 'bao-ve',
    title: 'Bảo vệ và lưu trữ dữ liệu',
    body: (
      <>
        <ul>
          <li>Kết nối tới website được mã hóa; mật khẩu được băm một chiều trước khi lưu.</li>
          <li>
            Quyền thao tác dữ liệu được phân theo vai trò (quản trị dòng họ, quản lý chi, thành
            viên).
          </li>
          <li>
            Dữ liệu của mỗi dòng họ được tách biệt; tài khoản dòng họ này không xem được dữ liệu
            dòng họ khác.
          </li>
        </ul>
        <p>
          Dữ liệu được lưu trong suốt thời gian dòng họ sử dụng dịch vụ. Khi dòng họ ngừng sử dụng
          hoặc yêu cầu xóa, chúng tôi sẽ xóa hoặc ẩn danh dữ liệu trong thời gian hợp lý, trừ phần
          thông tin pháp luật yêu cầu phải lưu giữ.
        </p>
      </>
    ),
  },
  {
    id: 'quyen-nguoi-dung',
    title: 'Quyền của bạn',
    body: (
      <>
        <p>Theo quy định pháp luật Việt Nam về bảo vệ dữ liệu cá nhân, bạn có quyền:</p>
        <ul>
          <li>Được biết, truy cập và yêu cầu chỉnh sửa thông tin cá nhân của mình.</li>
          <li>Rút lại sự đồng ý hoặc yêu cầu xóa thông tin cá nhân.</li>
          <li>Phản đối hoặc yêu cầu hạn chế việc xử lý dữ liệu.</li>
          <li>Khiếu nại khi cho rằng dữ liệu của mình bị xử lý không đúng.</li>
        </ul>
        <p>
          Với thông tin trong gia phả, bạn có thể đề nghị ban quản trị dòng họ chỉnh sửa trực tiếp,
          hoặc liên hệ với chúng tôi theo thông tin ở cuối trang.
        </p>
      </>
    ),
  },
  {
    id: 'trach-nhiem-dong-ho',
    title: 'Trách nhiệm của ban quản trị dòng họ',
    body: (
      <p>
        Ban quản trị dòng họ là bên nhập và quản lý thông tin thành viên. Trước khi đưa thông tin
        của người còn sống lên gia phả, ban quản trị cần có sự đồng ý của người đó (hoặc người giám
        hộ với trẻ vị thành niên), và chỉ nên nhập những thông tin thực sự cần thiết.
      </p>
    ),
  },
  {
    id: 'thay-doi',
    title: 'Thay đổi chính sách',
    body: (
      <p>
        Chúng tôi có thể cập nhật chính sách này khi dịch vụ hoặc quy định pháp luật thay đổi. Phiên
        bản mới có hiệu lực kể từ khi đăng trên trang này; với thay đổi quan trọng, chúng tôi sẽ
        thông báo tới ban quản trị các dòng họ.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      path={SITE_POLICY_LINKS.privacy}
      title="Chính sách bảo mật"
      updatedAt="15/10/2026"
      intro={
        <p>
          Gia phả lưu giữ những thông tin riêng tư của nhiều thế hệ trong dòng họ. {SITE_BRAND.name}{' '}
          trân trọng sự tin tưởng đó và cam kết bảo vệ dữ liệu cá nhân của bạn cùng các thành viên
          trong gia đình.
        </p>
      }
      sections={sections}
    />
  );
}
