import { redirect } from 'next/navigation';

import { FAMILY_ABOUT_ANCHOR } from '@/components/about/family-about';
import { familyHref } from '@/lib/family-nav';

type FamilyAboutPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function FamilyAboutPage({ params }: FamilyAboutPageProps) {
  const { slug } = await params;
  redirect(`${familyHref(slug, '')}#${FAMILY_ABOUT_ANCHOR}`);
}
