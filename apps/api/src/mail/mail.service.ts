import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export type MailMessage = { to: string; subject: string; text: string; html: string };

/** Sends mail over SMTP; the server and sender come from the `SMTP_*` and `MAIL_FROM` settings. */
@Injectable()
export class MailService {
  private transporter: Transporter | null = null;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('SMTP_HOST'));
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport().sendMail({ from: this.config.get<string>('MAIL_FROM'), ...message });
  }

  private transport(): Transporter {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      throw new ServiceUnavailableException(
        'Hệ thống chưa được cấu hình gửi email. Vui lòng liên hệ Admin.',
      );
    }
    const user = this.config.get<string>('SMTP_USER');
    this.transporter = createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT'),
      secure: this.config.get<boolean>('SMTP_SECURE'),
      ...(user ? { auth: { user, pass: this.config.get<string>('SMTP_PASS') ?? '' } } : {}),
    });
    return this.transporter;
  }
}
