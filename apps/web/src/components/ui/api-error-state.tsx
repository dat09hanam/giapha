import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

type ApiErrorStateProps = {
  title: string;
  message: string;
  retryHref: string;
};

export function ApiErrorState({ title, message, retryHref }: ApiErrorStateProps) {
  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-2xl place-items-center px-4 py-12">
      <section className="w-full rounded-3xl border bg-white/80 p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-emerald-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-700" role="alert">
          {message}
        </p>
        <Button asChild className="mt-6">
          <Link href={retryHref}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử tải lại
          </Link>
        </Button>
      </section>
    </main>
  );
}
