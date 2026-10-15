import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

import { HomeFooter } from '@/components/home/home-footer';
import { HomeHeader } from '@/components/home/home-header';
import { LegalContact } from '@/components/legal/legal-contact';
import { SITE_POLICY_LINKS } from '@/lib/site-contact';

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

type LegalPageProps = {
  /** This page's own path, so the related-documents list leaves it out. */
  path: string;
  title: string;
  intro: ReactNode;
  updatedAt: string;
  sections: readonly LegalSection[];
};

const OTHER_DOCUMENTS = [
  { href: SITE_POLICY_LINKS.privacy, label: 'Chính sách bảo mật' },
  { href: SITE_POLICY_LINKS.terms, label: 'Quy định sử dụng dịch vụ' },
];

export function LegalPage({ path, title, intro, updatedAt, sections }: LegalPageProps) {
  return (
    <>
      <HomeHeader onHomePage={false} />
      <main className="pb-16">
        <article className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-wood-700 hover:text-brand-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Trang chủ
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-brand-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-stone-500">Cập nhật lần cuối: {updatedAt}</p>
          <div className="mt-6 text-base leading-8 text-wood-800">{intro}</div>

          <nav
            aria-label="Mục lục"
            className="mt-8 rounded-2xl border border-gold-500/30 bg-paper/70 p-5"
          >
            <p className="font-display text-lg font-bold text-brand-900">Mục lục</p>
            <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-wood-700 hover:text-brand-700 hover:underline"
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="mt-10 scroll-mt-24">
              <h2 className="font-display text-2xl font-bold text-brand-900">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-base leading-8 text-wood-800 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-wood-900 [&_ul]:space-y-1.5">
                {section.body}
              </div>
            </section>
          ))}

          <LegalContact />

          <nav
            aria-label="Văn bản liên quan"
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm"
          >
            {OTHER_DOCUMENTS.filter((doc) => doc.href !== path).map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
              >
                Xem {doc.label} →
              </Link>
            ))}
          </nav>
        </article>
      </main>
      <HomeFooter />
    </>
  );
}
