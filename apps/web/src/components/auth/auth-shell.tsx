import Link from 'next/link';
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-5 inline-block text-sm font-medium text-emerald-900 hover:underline">
          ← Về trang chủ
        </Link>
        <Card className="border-emerald-950/10 bg-[#fffdf8]/95 shadow-2xl shadow-emerald-950/10">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              {eyebrow}
            </p>
            <CardTitle className="mt-2 text-3xl text-emerald-950">{title}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
          </CardHeader>
          <CardContent>
            {children}
            <div className="mt-6 border-t pt-5 text-center text-sm text-stone-600">{footer}</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
