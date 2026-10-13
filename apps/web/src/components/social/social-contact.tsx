'use client';

import { Clock, Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import { FacebookIcon, TiktokIcon, YoutubeIcon, ZaloIcon } from '@/components/social/social-icons';
import { useSiteContact } from '@/components/social/site-contact-provider';
import { phoneHref, zaloHref } from '@/lib/site-contact';
import { cn } from '@/lib/utils';
import type { SiteContact } from '@/types/site-contact';

type Channel = {
  key: string;
  label: string;
  value: string;
  href: string;
  icon: ReactNode;
  tint: string;
  external?: true;
};

function channels(contact: SiteContact): Channel[] {
  const list: (Channel | null)[] = [
    {
      key: 'phone',
      label: 'Hotline',
      value: contact.phone,
      href: phoneHref(contact.phone),
      icon: <Phone className="size-5" aria-hidden="true" />,
      tint: 'bg-brand-700 text-white',
    },
    {
      key: 'zalo',
      label: 'Zalo',
      value: contact.zalo ?? contact.phone,
      href: zaloHref(contact),
      icon: <ZaloIcon size={24} />,
      tint: 'bg-[#0068ff] text-white [--zalo-ink:#0068ff]',
      external: true,
    },
    contact.facebookUrl
      ? {
          key: 'facebook',
          label: 'Facebook',
          value: 'Nhắn tin qua fanpage',
          href: contact.facebookUrl,
          icon: <FacebookIcon size={20} />,
          tint: 'bg-[#1877f2] text-white',
          external: true,
        }
      : null,
    contact.youtubeUrl
      ? {
          key: 'youtube',
          label: 'YouTube',
          value: 'Video hướng dẫn',
          href: contact.youtubeUrl,
          icon: <YoutubeIcon size={22} />,
          tint: 'bg-[#ff0000] text-white',
          external: true,
        }
      : null,
    contact.tiktokUrl
      ? {
          key: 'tiktok',
          label: 'TikTok',
          value: 'Theo dõi kênh',
          href: contact.tiktokUrl,
          icon: <TiktokIcon size={20} />,
          tint: 'bg-stone-900 text-white',
          external: true,
        }
      : null,
    {
      key: 'email',
      label: 'Email',
      value: contact.email,
      href: `mailto:${contact.email}`,
      icon: <Mail className="size-5" aria-hidden="true" />,
      tint: 'bg-gold-100 text-wood-800',
    },
  ];
  return list.filter((channel): channel is Channel => channel !== null);
}

export function SocialContact({ className }: { className?: string }) {
  const contact = useSiteContact();
  return (
    <div className={cn('grid gap-4', className)}>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {channels(contact).map((channel) => (
          <li key={channel.key}>
            <a
              href={channel.href}
              {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex items-center gap-3 rounded-xl border border-gold-500/30 bg-[var(--card)] p-3 transition hover:border-gold-500/70 hover:bg-gold-50"
            >
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-full',
                  channel.tint,
                )}
              >
                {channel.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-stone-900">{channel.label}</span>
                <span className="block truncate text-sm text-stone-600">{channel.value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 text-sm text-stone-600">
        <Clock className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
        {contact.hours}
      </p>
    </div>
  );
}
