import type { Metadata } from 'next';

import { LegalPage, type LegalSection } from '@/components/legal/legal-page';
import { pageMetadata } from '@/lib/seo';
import { SITE_BRAND } from '@/lib/site-brand';
import { SITE_POLICY_LINKS } from '@/lib/site-contact';

export const metadata: Metadata = pageMetadata({
  title: 'Quy định sử dụng dịch vụ',
  description: `Các điều khoản khi đăng ký và sử dụng dịch vụ gia phả trực tuyến ${SITE_BRAND.name}.`,
  path: '/quy-dinh-su-dung',
});

const sections: readonly LegalSection[] = [
  {
    id: 'chap-thuan',
    title: 'Chấp thuận điều khoản',
    body: (
      <p>
        Khi đăng ký hoặc sử dụng {SITE_BRAND.name}, bạn đồng ý tuân thủ quy định này cùng{' '}
        <a href={SITE_POLICY_LINKS.privacy} className="font-medium text-brand-700 hover:underline">
          Chính sách bảo mật
        </a>
        . Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.
      </p>
    ),
  },
  {
    id: 'dich-vu',
    title: 'Mô tả dịch vụ',
    body: (
      <p>
        {SITE_BRAND.name} cung cấp công cụ trực tuyến giúp các dòng họ xây dựng và lưu giữ gia phả:
        sơ đồ phả hệ, hồ sơ thành viên, tư liệu hình ảnh, bảng tin, quỹ họ, công đức và in gia phả.
        Tính năng và giới hạn (số thành viên, dung lượng lưu trữ…) phụ thuộc vào gói dịch vụ dòng họ
        đã đăng ký.
      </p>
    ),
  },
  {
    id: 'dang-ky-goi',
    title: 'Đăng ký, thanh toán và thời hạn gói',
    body: (
      <ul>
        <li>
          Sau khi bạn gửi thông tin đăng ký, chúng tôi sẽ liên hệ để xác nhận và hướng dẫn thanh
          toán. Gói dịch vụ được kích hoạt sau khi thanh toán thành công.
        </li>
        <li>Phí dịch vụ được tính theo chu kỳ ghi trên bảng giá tại thời điểm đăng ký.</li>
        <li>
          Khi gói hết hạn mà chưa gia hạn, trang gia phả của dòng họ sẽ tạm ngừng truy cập cho tới
          khi gia hạn; dữ liệu đã nhập vẫn được giữ lại.
        </li>
        <li>
          Phí đã thanh toán không được hoàn lại, trừ khi dịch vụ không thể cung cấp do lỗi từ phía
          chúng tôi.
        </li>
      </ul>
    ),
  },
  {
    id: 'tai-khoan',
    title: 'Tài khoản và bảo mật',
    body: (
      <ul>
        <li>Bạn cung cấp thông tin đăng ký chính xác và cập nhật khi có thay đổi.</li>
        <li>
          Bạn tự bảo quản tên đăng nhập, mật khẩu và chịu trách nhiệm về mọi hoạt động thực hiện
          bằng tài khoản của mình.
        </li>
        <li>
          Ban quản trị dòng họ chịu trách nhiệm cấp, thu hồi tài khoản thành viên và tài khoản dùng
          chung của dòng họ.
        </li>
        <li>Hãy báo ngay cho chúng tôi nếu phát hiện tài khoản bị truy cập trái phép.</li>
      </ul>
    ),
  },
  {
    id: 'noi-dung',
    title: 'Nội dung do người dùng đăng tải',
    body: (
      <>
        <p>
          Dòng họ giữ quyền sở hữu với dữ liệu gia phả và tư liệu đã đưa lên. Bạn cho phép chúng tôi
          lưu trữ, xử lý và hiển thị nội dung đó trong phạm vi cần thiết để cung cấp dịch vụ.
        </p>
        <p>Bạn cam kết không đăng tải nội dung:</p>
        <ul>
          <li>Vi phạm pháp luật Việt Nam, thuần phong mỹ tục hoặc xúc phạm danh dự người khác.</li>
          <li>Chứa thông tin cá nhân của người khác khi chưa được người đó đồng ý.</li>
          <li>Vi phạm bản quyền, quyền sở hữu trí tuệ của bên thứ ba.</li>
          <li>Chứa mã độc, quảng cáo trái phép hoặc nội dung gây hại cho hệ thống.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'hanh-vi-cam',
    title: 'Hành vi bị nghiêm cấm',
    body: (
      <ul>
        <li>Truy cập hoặc cố truy cập dữ liệu của dòng họ khác khi không được phép.</li>
        <li>Can thiệp, dò quét, tấn công hoặc làm quá tải hệ thống.</li>
        <li>Thu thập dữ liệu hàng loạt bằng công cụ tự động.</li>
        <li>Mua bán, chuyển nhượng tài khoản hoặc dùng dịch vụ cho mục đích lừa đảo.</li>
      </ul>
    ),
  },
  {
    id: 'tam-ngung',
    title: 'Tạm ngừng và chấm dứt dịch vụ',
    body: (
      <p>
        Chúng tôi có quyền tạm khóa hoặc chấm dứt tài khoản, trang dòng họ vi phạm quy định này sau
        khi đã thông báo, trừ trường hợp vi phạm nghiêm trọng cần xử lý ngay. Dòng họ có thể ngừng
        sử dụng dịch vụ bất kỳ lúc nào và đề nghị xuất hoặc xóa dữ liệu của mình.
      </p>
    ),
  },
  {
    id: 'trach-nhiem',
    title: 'Giới hạn trách nhiệm',
    body: (
      <>
        <p>
          Chúng tôi nỗ lực duy trì dịch vụ ổn định, nhưng không bảo đảm dịch vụ luôn liên tục, không
          gián đoạn. Lịch bảo trì sẽ được thông báo trước khi có thể.
        </p>
        <p>
          Tính chính xác của thông tin gia phả thuộc trách nhiệm của dòng họ nhập liệu. Chúng tôi
          không chịu trách nhiệm về tranh chấp phát sinh từ nội dung do người dùng cung cấp.
        </p>
      </>
    ),
  },
  {
    id: 'thay-doi',
    title: 'Sửa đổi và luật áp dụng',
    body: (
      <p>
        Quy định này có thể được cập nhật và có hiệu lực kể từ khi đăng trên trang này. Việc bạn
        tiếp tục sử dụng dịch vụ đồng nghĩa với việc chấp nhận bản cập nhật. Quy định được điều
        chỉnh bởi pháp luật Việt Nam; tranh chấp được ưu tiên giải quyết bằng thương lượng, nếu
        không thành sẽ đưa ra cơ quan có thẩm quyền.
      </p>
    ),
  },
];

export default function TermsOfUsePage() {
  return (
    <LegalPage
      path={SITE_POLICY_LINKS.terms}
      title="Quy định sử dụng dịch vụ"
      updatedAt="15/10/2026"
      intro={
        <p>
          Quy định này nêu quyền và trách nhiệm giữa {SITE_BRAND.name} và các dòng họ, thành viên sử
          dụng dịch vụ, nhằm cùng nhau gìn giữ gia phả một cách an toàn và đúng đắn.
        </p>
      }
      sections={sections}
    />
  );
}
