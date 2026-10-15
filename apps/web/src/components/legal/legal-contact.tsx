'use client';

import { Mail, MapPin, Phone } from 'lucide-react';

import { useSiteContact } from '@/components/social/site-contact-provider';
import { phoneHref } from '@/lib/site-contact';

/** Contact block at the end of the legal pages; values come from the admin-edited site contact. */
export function LegalContact() {
  const contact = useSiteContact();
  return (
    <section
      aria-labelledby="legal-contact-title"
      className="mt-12 rounded-2xl border border-gold-500/30 bg-paper/70 p-5 sm:p-6"
    >
      <h2 id="legal-contact-title" className="font-display text-xl font-bold text-brand-900">
        Liên hệ với chúng tôi
      </h2>
      <p className="mt-2 text-sm leading-7 text-wood-800">
        Mọi câu hỏi, yêu cầu hoặc khiếu nại liên quan đến văn bản này, vui lòng liên hệ:
      </p>
      <ul className="mt-3 grid gap-2 text-sm text-wood-800">
        <li className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
          <a href={phoneHref(contact.phone)} className="hover:text-brand-700 hover:underline">
            {contact.phone}
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Mail className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
          <a href={`mailto:${contact.email}`} className="hover:text-brand-700 hover:underline">
            {contact.email}
          </a>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
          <span>{contact.address}</span>
        </li>
      </ul>
    </section>
  );
}
