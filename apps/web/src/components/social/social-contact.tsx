'use client';

import { ChevronRight, Clock, Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import { FacebookIcon, TiktokIcon, YoutubeIcon, ZaloIcon } from '@/components/social/social-icons';
import { useSiteContact } from '@/components/social/site-contact-provider';
import styles from '@/components/social/contact.module.css';
import { phoneHref, zaloHref } from '@/lib/site-contact';
import { displayPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import type { SiteContact } from '@/types/site-contact';

type Channel = {
  key: 'phone' | 'zalo' | 'facebook' | 'youtube' | 'tiktok' | 'email';
  label: string;
  value?: string;
  hint: string;
  /** Omitted for channels that are shown for reference only and cannot be opened. */
  href?: string;
  icon: ReactNode;
  tone?: 'jade';
  external?: true;
};

function channels(contact: SiteContact): Channel[] {
  const list: (Channel | null)[] = [
    {
      key: 'phone',
      label: 'Hotline',
      value: displayPhone(contact.phone),
      hint: 'Gọi ngay để được tư vấn',
      href: phoneHref(contact.phone),
      icon: <Phone className="size-7 fill-current" strokeWidth={1.5} aria-hidden="true" />,
      tone: 'jade',
    },
    {
      key: 'zalo',
      label: 'Zalo',
      value: displayPhone(contact.zalo ?? contact.phone),
      hint: 'Nhắn tin trực tiếp trên Zalo',
      href: zaloHref(contact),
      icon: <ZaloIcon size={34} />,
      external: true,
    },
    contact.facebookUrl
      ? {
          key: 'facebook',
          label: 'Facebook',
          hint: 'Nhắn tin qua fanpage',
          href: contact.facebookUrl,
          icon: <FacebookIcon size={30} />,
          external: true,
        }
      : null,
    contact.youtubeUrl
      ? {
          key: 'youtube',
          label: 'YouTube',
          hint: 'Video hướng dẫn',
          href: contact.youtubeUrl,
          icon: <YoutubeIcon size={30} />,
          external: true,
        }
      : null,
    contact.tiktokUrl
      ? {
          key: 'tiktok',
          label: 'TikTok',
          hint: 'Theo dõi kênh',
          href: contact.tiktokUrl,
          icon: <TiktokIcon size={26} />,
          external: true,
        }
      : null,
    {
      key: 'email',
      label: 'Email',
      value: contact.email,
      hint: 'Gửi yêu cầu hỗ trợ',
      icon: <Mail className="size-7" strokeWidth={1.75} aria-hidden="true" />,
    },
  ];
  return list.filter((channel): channel is Channel => channel !== null);
}

function ChannelCard({ channel, children }: { channel: Channel; children: ReactNode }) {
  if (!channel.href) {
    return (
      <div className={styles.card} data-tone={channel.tone} data-static="">
        {children}
      </div>
    );
  }
  return (
    <a
      href={channel.href}
      {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={styles.card}
      data-tone={channel.tone}
    >
      {children}
      <ChevronRight className={cn(styles.chevron, 'size-5')} aria-hidden="true" />
    </a>
  );
}

export function SocialContact({ className }: { className?: string }) {
  const contact = useSiteContact();
  return (
    <div className={cn('grid gap-5', className)}>
      <ul className={styles.channels}>
        {channels(contact).map((channel) => (
          <li key={channel.key}>
            <ChannelCard channel={channel}>
              <span className={styles.icon} data-channel={channel.key}>
                {channel.icon}
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{channel.label}</span>
                {channel.value ? (
                  <span className={styles.value} data-kind={channel.key} title={channel.value}>
                    {channel.value}
                  </span>
                ) : null}
                <span className={styles.hint}>{channel.hint}</span>
              </span>
            </ChannelCard>
          </li>
        ))}
      </ul>
      <p className={styles.hours}>
        <span className={styles.hoursIcon}>
          <Clock className="size-5" aria-hidden="true" />
        </span>
        <span className={styles.hoursText}>{contact.hours}</span>
      </p>
    </div>
  );
}
