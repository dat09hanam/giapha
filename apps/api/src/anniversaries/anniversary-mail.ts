import { escapeHtml } from '../common/html.js';
import { SITE_BRAND } from '../common/site-brand.js';
import type { MailMessage } from '../mail/mail.service.js';

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** “Thứ Ba, 22/09/2026” for an ISO day. */
export function formatSolarDay(isoDay: string): string {
  const [year, month, day] = isoDay.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export type AnniversaryMailInput = {
  to: string;
  personName: string;
  familyName: string;
  lunarDay: number;
  lunarMonth: number;
  /** ISO solar day of the anniversary. */
  date: string;
  daysLeft: number;
  calendarUrl: string;
  unsubscribeUrl: string;
};

function layout(title: string, body: string, input: AnniversaryMailInput): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2118;line-height:1.6;max-width:560px">
<p style="margin:0 0 4px;color:#8a2f1d;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase">${escapeHtml(input.familyName)}</p>
<h1 style="margin:0 0 16px;font-size:22px;color:#5a2412">${escapeHtml(title)}</h1>
${body}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;background:#fbf5ea;border:1px solid #eadfc8;border-radius:12px;width:100%">
<tr><td style="padding:14px 18px">
<div style="font-size:18px;font-weight:700;color:#5a2412">${escapeHtml(input.personName)}</div>
<div style="margin-top:6px">Ngày giỗ: <strong>${input.lunarDay}/${input.lunarMonth} âm lịch</strong></div>
<div>Dương lịch: <strong>${escapeHtml(formatSolarDay(input.date))}</strong></div>
</td></tr></table>
<p><a href="${escapeHtml(input.calendarUrl)}" style="display:inline-block;padding:10px 18px;background:#7a2e1a;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Xem lịch giỗ của dòng họ</a></p>
<p style="margin-top:28px;font-size:12px;color:#8a7c6e">Bạn nhận được email này vì đã bấm “Nhắc tôi” trên ${escapeHtml(SITE_BRAND.name)}. Không muốn nhận nữa? <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#8a7c6e">Hủy nhắc lịch giỗ này</a>.</p>
</div>`;
}

function footerText(input: AnniversaryMailInput): string[] {
  return [
    '',
    `Xem lịch giỗ của dòng họ: ${input.calendarUrl}`,
    '',
    `Bạn nhận được email này vì đã bấm “Nhắc tôi” trên ${SITE_BRAND.name}.`,
    `Hủy nhắc lịch giỗ này: ${input.unsubscribeUrl}`,
  ];
}

/** Sent a week ahead (or sooner, when the reminder was set later) of each anniversary. */
export function anniversaryReminderMail(input: AnniversaryMailInput): MailMessage {
  const when = input.daysLeft === 0 ? 'hôm nay' : `còn ${input.daysLeft} ngày`;
  return {
    to: input.to,
    subject: `Nhắc lịch giỗ ${input.personName} – ${formatSolarDay(input.date)} (${when})`,
    text: [
      `Kính gửi quý vị,`,
      '',
      `Ngày giỗ của ${input.personName} (${input.familyName}) sắp đến, ${when}:`,
      `- Âm lịch: ${input.lunarDay}/${input.lunarMonth}`,
      `- Dương lịch: ${formatSolarDay(input.date)}`,
      '',
      'Kính mong quý vị thu xếp thời gian về thắp nén hương tưởng nhớ.',
      ...footerText(input),
    ].join('\n'),
    html: layout(
      `Ngày giỗ sắp đến – ${when}`,
      `<p>Kính gửi quý vị,</p><p>Xin nhắc ngày giỗ trong dòng họ sắp đến. Kính mong quý vị thu xếp thời gian về thắp nén hương tưởng nhớ.</p>`,
      input,
    ),
  };
}

/** Confirms a new reminder, so a mistyped address is noticed and the owner can cancel it. */
export function anniversarySubscribedMail(input: AnniversaryMailInput): MailMessage {
  return {
    to: input.to,
    subject: `Đã đặt nhắc lịch giỗ ${input.personName}`,
    text: [
      'Kính gửi quý vị,',
      '',
      `Quý vị sẽ nhận email nhắc trước 1 tuần mỗi năm khi đến ngày giỗ của ${input.personName} (${input.familyName}).`,
      `Lần giỗ tới: ${input.lunarDay}/${input.lunarMonth} âm lịch, tức ${formatSolarDay(input.date)}.`,
      ...footerText(input),
    ].join('\n'),
    html: layout(
      'Đã đặt nhắc lịch giỗ',
      `<p>Kính gửi quý vị,</p><p>Quý vị sẽ nhận email nhắc <strong>trước 1 tuần</strong> mỗi năm khi đến ngày giỗ dưới đây. Lần giỗ tới:</p>`,
      input,
    ),
  };
}
