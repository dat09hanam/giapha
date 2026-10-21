import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { escapeHtml } from '../common/html.js';
import { SITE_BRAND } from '../common/site-brand.js';
import { MailService } from '../mail/mail.service.js';

const TELEGRAM_TIMEOUT_MS = 5000;

/** Something the platform admin should follow up on. */
export type AdminEvent =
  | {
      kind: 'SERVICE_REGISTRATION';
      fullName: string;
      phone: string;
      email: string | null;
      planName: string;
      ambassadorCode: string | null;
    }
  | {
      kind: 'GOOGLE_SIGNUP';
      familyName: string;
      slug: string;
      email: string;
      planName: string;
    }
  | {
      kind: 'PLAN_CHANGE';
      familyName: string;
      slug: string;
      fromPlanName: string;
      planName: string;
      fullName: string;
      phone: string;
    };

type AdminMessage = { title: string; lines: [label: string, value: string][]; adminPath: string };

function messageFor(event: AdminEvent): AdminMessage {
  switch (event.kind) {
    case 'SERVICE_REGISTRATION':
      return {
        title: 'Đăng ký dịch vụ mới',
        lines: [
          ['Người liên hệ', event.fullName],
          ['Số điện thoại', event.phone],
          ...(event.email ? [['Email', event.email] as [string, string]] : []),
          ['Gói', event.planName],
          ...(event.ambassadorCode
            ? [['Mã đại sứ', event.ambassadorCode] as [string, string]]
            : []),
        ],
        adminPath: '/admin#dang-ky',
      };
    case 'GOOGLE_SIGNUP':
      return {
        title: 'Dòng họ mới tự đăng ký bằng Google',
        lines: [
          ['Dòng họ', event.familyName],
          ['Đường dẫn', `/${event.slug}`],
          ['Email trưởng họ', event.email],
          ['Gói', event.planName],
        ],
        adminPath: '/admin#dong-ho',
      };
    case 'PLAN_CHANGE':
      return {
        title: 'Yêu cầu đổi gói',
        lines: [
          ['Dòng họ', event.familyName],
          ['Đổi gói', `${event.fromPlanName} → ${event.planName}`],
          ['Người liên hệ', event.fullName],
          ['Số điện thoại', event.phone],
        ],
        adminPath: '/admin#dang-ky',
      };
  }
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Tells the platform admin about new sign-ups and plan requests on Telegram and by email. Either
 * channel is skipped when it is not configured; a failed notice is logged and never fails the
 * request that raised it.
 */
@Injectable()
export class AdminNotifyService {
  private readonly logger = new Logger(AdminNotifyService.name);

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  notify(event: AdminEvent): void {
    const message = messageFor(event);
    void Promise.allSettled([this.sendTelegram(message), this.sendEmail(message)]).then(
      (results) => {
        for (const result of results) {
          if (result.status === 'rejected') {
            // Only the event kind: the message itself carries contact details.
            this.logger.warn(
              `Admin notice "${event.kind}" was not delivered: ${
                result.reason instanceof Error ? result.reason.message : 'unknown error'
              }`,
            );
          }
        }
      },
    );
  }

  private async sendTelegram(message: AdminMessage): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatIds = splitList(this.config.get<string>('TELEGRAM_CHAT_ID'));
    if (!token || chatIds.length === 0) return;
    const text = [
      `<b>${escapeHtml(message.title)}</b>`,
      ...message.lines.map(([label, value]) => `${escapeHtml(label)}: ${escapeHtml(value)}`),
      `<a href="${escapeHtml(this.siteUrl() + message.adminPath)}">Mở trang quản trị</a>`,
    ].join('\n');
    await Promise.all(
      chatIds.map(async (chatId) => {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
          }),
          signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`Telegram answered ${response.status}`);
      }),
    );
  }

  private async sendEmail(message: AdminMessage): Promise<void> {
    const recipients = splitList(this.config.get<string>('ADMIN_NOTIFY_EMAIL'));
    if (recipients.length === 0 || !this.mail.isConfigured) return;
    const link = this.siteUrl() + message.adminPath;
    const rows = message.lines
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#6f6258">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600;color:#2c221e">${escapeHtml(value)}</td></tr>`,
      )
      .join('');
    await this.mail.send({
      to: recipients.join(', '),
      subject: `[${SITE_BRAND.name}] ${message.title}`,
      text: [
        message.title,
        '',
        ...message.lines.map(([label, value]) => `${label}: ${value}`),
        '',
        `Mở trang quản trị: ${link}`,
      ].join('\n'),
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5"><h2 style="margin:0 0 12px;color:#7a1c1c;font-size:18px">${escapeHtml(message.title)}</h2><table style="border-collapse:collapse">${rows}</table><p style="margin-top:16px"><a href="${escapeHtml(link)}" style="color:#7a1c1c;font-weight:700">Mở trang quản trị</a></p></div>`,
    });
  }

  private siteUrl(): string {
    const origin = this.config.getOrThrow<string>('WEB_ORIGIN').split(',')[0] ?? '';
    return origin.trim().replace(/\/$/, '');
  }
}
