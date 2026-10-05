import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { FamilyFund } from '@/components/fund/family-fund';
import { ApiErrorState } from '@/components/ui/api-error-state';
import { ApiNotFoundError, ApiUnauthorizedError, getFamily, getFundLedger } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-error';
import type { FundLedger } from '@/lib/fund-api';

type FamilyFundPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: FamilyFundPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const family = await getFamily(slug);
    return { title: `Quỹ họ · ${family.name}` };
  } catch {
    return { title: 'Quỹ họ' };
  }
}

export default async function FamilyFundPage({ params }: FamilyFundPageProps) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}/quy-ho`;
  const sessionToken = (await cookies()).get('giapha_session')?.value;
  if (!sessionToken) redirect(`/login?next=${encodeURIComponent(path)}`);

  let ledger: FundLedger;
  try {
    ledger = await getFundLedger(slug, sessionToken);
  } catch (error: unknown) {
    if (error instanceof ApiNotFoundError) notFound();
    if (error instanceof ApiUnauthorizedError) {
      redirect(`/login?next=${encodeURIComponent(path)}&reason=session-expired`);
    }
    if (error instanceof ApiRequestError) {
      return <ApiErrorState title="Chưa thể tải quỹ họ" message={error.message} retryHref={path} />;
    }
    throw error;
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <FamilyFund familySlug={slug} initial={ledger} />
    </main>
  );
}
