'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Download, LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { downloadReportPdf, type PdfReport } from '@/lib/report-pdf';

const PdfFamilyContext = createContext<{ slug: string; name: string } | null>(null);

export function PdfFamilyScope({
  slug,
  name,
  children,
}: {
  slug: string;
  name: string;
  children: ReactNode;
}) {
  return <PdfFamilyContext.Provider value={{ slug, name }}>{children}</PdfFamilyContext.Provider>;
}

export function PdfExportButton({
  familySlug,
  familyName,
  filename,
  report,
  onExport,
  className,
  disabled = false,
}: {
  familySlug: string;
  familyName?: string;
  filename: string;
  report?: PdfReport;
  onExport?: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}) {
  const family = useContext(PdfFamilyContext);
  const showToast = useToast();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  async function exportPdf(): Promise<void> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (onExport) await onExport();
      else if (report)
        await downloadReportPdf(
          report,
          familyName ?? (family?.slug === familySlug ? family.name : familySlug),
          filename,
        );
      else throw new Error('Chưa có dữ liệu xuất PDF.');
      showToast({ kind: 'success', message: 'Đã xuất file PDF.' });
    } catch {
      showToast({ kind: 'error', message: 'Chưa thể xuất PDF. Vui lòng thử lại.' });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={disabled || busy}
      onClick={() => void exportPdf()}
    >
      {busy ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {busy ? 'Đang xuất…' : 'Xuất PDF'}
    </Button>
  );
}
