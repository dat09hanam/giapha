import { Clock, Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

import { FacebookIcon, TiktokIcon, YoutubeIcon, ZaloIcon } from '@/components/social/social-icons';
import { SITE_CONTACT, phoneHref, zaloHref } from '@/lib/site-contact';
import { cn } from '@/lib/utils';

type Channel = {
  key: string;
  label: string;
  value: string;
  href: string;
  icon: ReactNode;
  tint: string;
  external?: true;
};

function channels(): Channel[] {
  const list: (Channel | null)[] = [
    {
      key: 'phone',
      label: 'Hotline',
      value: SITE_CONTACT.phone,
      href: phoneHref(SITE_CONTACT.phone),
      icon: <Phone className="size-5" aria-hidden="true" />,
      tint: 'bg-brand-700 text-white',
    },
    {
      key: 'zalo',
      label: 'Zalo',
      value: SITE_CONTACT.phone,
      href: zaloHref(SITE_CONTACT.phone),
      icon: <ZaloIcon size={24} />,
      tint: 'bg-[#0068ff] text-white [--zalo-ink:#0068ff]',
      external: true,
    },
    SITE_CONTACT.facebook
      ? {
          key: 'facebook',
          label: 'Facebook',
          value: 'Nhắn tin qua fanpage',
          href: SITE_CONTACT.facebook,
          icon: <FacebookIcon size={20} />,
          tint: 'bg-[#1877f2] text-white',
          external: true,
        }
      : null,
    SITE_CONTACT.youtube
      ? {
          key: 'youtube',
          label: 'YouTube',
          value: 'Video hướng dẫn',
          href: SITE_CONTACT.youtube,
          icon: <YoutubeIcon size={22} />,
          tint: 'bg-[#ff0000] text-white',
          external: true,
        }
      : null,
    SITE_CONTACT.tiktok
      ? {
          key: 'tiktok',
          label: 'TikTok',
          value: 'Theo dõi kênh',
          href: SITE_CONTACT.tiktok,
          icon: <TiktokIcon size={20} />,
          tint: 'bg-stone-900 text-white',
          external: true,
        }
      : null,
    {
      key: 'email',
      label: 'Email',
      value: SITE_CONTACT.email,
      href: `mailto:${SITE_CONTACT.email}`,
      icon: <Mail className="size-5" aria-hidden="true" />,
      tint: 'bg-gold-100 text-wood-800',
    },
  ];
  return list.filter((channel): channel is Channel => channel !== null);
}

export function SocialContact({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4', className)}>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {channels().map((channel) => (
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
        {SITE_CONTACT.hours}
      </p>
    </div>
  );
}
