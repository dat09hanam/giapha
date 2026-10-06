import { redirect } from 'next/navigation';

import { FAMILY_ABOUT_ANCHOR } from '@/components/about/family-about';
import { familyHref } from '@/lib/family-nav';

type FamilyAboutPageProps = {
  params: Promise<{ slug: string }>;
};

/** Giới thiệu is now a section of the family's home page; old links land on it there. */
export default async function FamilyAboutPage({ params }: FamilyAboutPageProps) {
  const { slug } = await params;
  redirect(`${familyHref(slug, '')}#${FAMILY_ABOUT_ANCHOR}`);
}
