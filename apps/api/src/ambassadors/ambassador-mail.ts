import type { MailMessage } from '../mail/mail.service.js';
import { escapeHtml } from '../common/html.js';
import { SITE_BRAND } from '../common/site-brand.js';

export type CommissionLine = { planName: string; percent: number; amount: number };

const MONEY = new Intl.NumberFormat('vi-VN');

function money(amount: number): string {
  return `${MONEY.format(amount)}đ`;
}

/** The welcome email carrying the ambassador's code and a link that fills it in for visitors. */
export function ambassadorWelcomeMail(input: {
  to: string;
  fullName: string;
  code: string;
  siteUrl: string;
  commissions: readonly CommissionLine[];
}): MailMessage {
  const { to, fullName, code, siteUrl, commissions } = input;
  const referralLink = `${siteUrl}/?ref=${encodeURIComponent(code)}`;
  const programLink = `${siteUrl}/dai-su`;

  const textCommissions = commissions.length
    ? [
        'Mức hoa hồng hiện tại:',
        ...commissions.map(
          (line) => `- Gói ${line.planName}: ${line.percent}% (${money(line.amount)})`,
        ),
        '',
      ]
    : [];
  const htmlCommissions = commissions.length
    ? `<p style="margin:20px 0 8px;font-weight:700">Mức hoa hồng hiện tại</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:420px">
${commissions
  .map(
    (line) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #eadfc8">Gói ${escapeHtml(line.planName)}</td><td style="padding:8px 12px;border-bottom:1px solid #eadfc8;text-align:right;font-weight:700;color:#8a2f1d">${line.percent}% <span style="font-weight:400;color:#6f6258">(${money(line.amount)})</span></td></tr>`,
  )
  .join('\n')}
</table>`
    : '';

  return {
    to,
    subject: `Chào mừng bạn trở thành Đại Sứ ${SITE_BRAND.name}`,
    text: [
      `Xin chào ${fullName},`,
      '',
      `Cảm ơn bạn đã đăng ký làm Đại Sứ ${SITE_BRAND.name}. Từ hôm nay, bạn đồng hành cùng chúng tôi giúp các gia đình, dòng họ Việt lưu giữ cội nguồn cho muôn đời con cháu.`,
      '',
      'Mã đại sứ của bạn là:',
      '',
      code,
      '',
      'Cách nhận hoa hồng:',
      '1. Giới thiệu dịch vụ tới gia đình, dòng họ bạn quen biết.',
      '2. Khi đăng ký hoặc tạo gia phả mới, họ nhập mã đại sứ của bạn — hoặc mở đường link giới thiệu dưới đây, mã sẽ được điền sẵn:',
      `   ${referralLink}`,
      '3. Khi dòng họ tạo gia phả bằng mã của bạn trên gói có hoa hồng, chúng tôi ghi nhận và chuyển khoản hoa hồng cho bạn. Hoa hồng tính một lần theo gói lúc tạo; gia hạn hay nâng cấp gói về sau không tính thêm.',
      '',
      ...textCommissions,
      `Xem chi tiết chương trình: ${programLink}`,
      '',
      'Vui lòng giữ email này để tra cứu mã khi cần. Nếu cần hỗ trợ, bạn chỉ cần trả lời email này.',
      '',
      'Thân mến,',
      SITE_BRAND.name,
      SITE_BRAND.tagline,
    ].join('\n'),
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#3b2a1a">
<p>Xin chào ${escapeHtml(fullName)},</p>
<p>Cảm ơn bạn đã đăng ký làm <strong>Đại Sứ ${SITE_BRAND.name}</strong>. Từ hôm nay, bạn đồng hành cùng chúng tôi giúp các gia đình, dòng họ Việt lưu giữ cội nguồn cho muôn đời con cháu.</p>
<p style="margin:20px 0 4px">Mã đại sứ của bạn là:</p>
<p style="display:inline-block;margin:0;padding:10px 20px;border:2px dashed #b8862e;border-radius:10px;background:#fbf4e4;font-size:28px;font-weight:700;letter-spacing:4px;color:#8a2f1d">${escapeHtml(code)}</p>
<p style="margin:20px 0 8px;font-weight:700">Cách nhận hoa hồng</p>
<ol style="margin:0;padding-left:20px">
<li>Giới thiệu dịch vụ tới gia đình, dòng họ bạn quen biết.</li>
<li>Khi đăng ký hoặc tạo gia phả mới, họ nhập mã đại sứ của bạn — hoặc mở <a href="${escapeHtml(referralLink)}" style="color:#8a2f1d">đường link giới thiệu của bạn</a>, mã sẽ được điền sẵn.</li>
<li>Khi dòng họ tạo gia phả bằng mã của bạn trên gói có hoa hồng, chúng tôi ghi nhận và chuyển khoản hoa hồng cho bạn. Hoa hồng tính một lần theo gói lúc tạo; gia hạn hay nâng cấp gói về sau không tính thêm.</li>
</ol>
${htmlCommissions}
<p style="margin-top:20px">Link giới thiệu của bạn:<br><a href="${escapeHtml(referralLink)}" style="color:#8a2f1d;word-break:break-all">${escapeHtml(referralLink)}</a></p>
<p>Xem chi tiết chương trình tại <a href="${escapeHtml(programLink)}" style="color:#8a2f1d">${escapeHtml(programLink)}</a>.</p>
<p>Vui lòng giữ email này để tra cứu mã khi cần. Nếu cần hỗ trợ, bạn chỉ cần trả lời email này.</p>
<p>Thân mến,<br><strong>${SITE_BRAND.name}</strong><br><em>${SITE_BRAND.tagline}</em></p>
</div>`,
  };
}
