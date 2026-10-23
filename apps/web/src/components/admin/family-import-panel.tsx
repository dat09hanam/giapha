'use client';

import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { getFamilyTreeForExport, importFamilyTree } from '@/lib/family-import-api';
import { GENDER_LABELS, PEOPLE_SHEET } from '@/lib/family-import/columns';
import type { ParsedImport } from '@/lib/family-import/parse';
import type { FamilyImportResult, ImportIssue } from '@/types/family-import';

const SHOWN_ISSUES = 200;
const PREVIEW_ROWS = 10;
const TEMPLATE_FILE_NAME = 'mau-nhap-gia-pha.xlsx';

type ImportState =
  | { step: 'idle' }
  | { step: 'checking'; fileName: string }
  | {
      step: 'checked';
      fileName: string;
      parsed: ParsedImport;
      issues: ImportIssue[];
      result: FamilyImportResult | null;
    }
  | { step: 'importing'; fileName: string; parsed: ParsedImport; result: FamilyImportResult }
  | { step: 'done'; result: FamilyImportResult };

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * An empty tree gets the blank template; a tree with members gets them as a locked list, so new
 * rows can pick existing people as parents or wives.
 */
function TemplateCard({ familySlug, memberCount }: { familySlug: string; memberCount: number }) {
  const [building, setBuilding] = useState(false);
  const showToast = useToast();
  const hasMembers = memberCount > 0;

  async function download(): Promise<void> {
    setBuilding(true);
    try {
      const template = await import('@/lib/family-import/template');
      if (hasMembers) {
        const [{ treeToSheetPeople }, tree] = await Promise.all([
          import('@/lib/family-import/members'),
          getFamilyTreeForExport(familySlug),
        ]);
        const people = treeToSheetPeople(tree);
        downloadBlob(await template.buildMemberWorkbook(people), `gia-pha-${familySlug}.xlsx`);
      } else {
        downloadBlob(await template.buildImportTemplate(), TEMPLATE_FILE_NAME);
      }
    } catch (error: unknown) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(error, hasMembers ? 'tạo file thành viên' : 'tạo file mẫu'),
      });
    } finally {
      setBuilding(false);
    }
  }

  return (
    <SectionCard
      icon={<FileSpreadsheet aria-hidden="true" />}
      title={hasMembers ? 'Tải file thành viên' : 'Tải file mẫu'}
      description={
        hasMembers
          ? `File Excel gồm ${memberCount} thành viên đang có trong cây (đã khóa, không sửa được), kèm danh sách chọn và sheet hướng dẫn. Thêm người mới vào các dòng trống bên dưới, có thể chọn cha, mẹ, vợ là người đã có, rồi tải lên ở mục bên dưới.`
          : 'File Excel có sẵn tiêu đề cột, danh sách chọn và một sheet hướng dẫn kèm ví dụ. Điền dữ liệu vào sheet “Thành viên” (gồm cả vợ chồng) rồi tải lên ở mục bên dưới.'
      }
    >
      <Button type="button" variant="outline" onClick={() => void download()} disabled={building}>
        {building ? (
          <InlineLoader className="size-4" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {building
          ? 'Đang tạo file…'
          : hasMembers
            ? 'Tải file thành viên (.xlsx)'
            : 'Tải file mẫu (.xlsx)'}
      </Button>
    </SectionCard>
  );
}

function IssueList({ issues }: { issues: ImportIssue[] }) {
  return (
    <div
      role="alert"
      className="grid gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900 sm:px-5"
    >
      <p className="flex items-center gap-2 font-semibold">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        File có {issues.length} lỗi cần sửa trước khi nhập
      </p>
      <ul className="grid max-h-80 gap-1.5 overflow-y-auto pr-1">
        {issues.slice(0, SHOWN_ISSUES).map((issue, index) => (
          <li key={index} className="leading-6">
            <span className="font-medium">
              {PEOPLE_SHEET}
              {issue.row === null ? '' : `, dòng ${issue.row}`}:
            </span>{' '}
            {issue.message}
          </li>
        ))}
      </ul>
      {issues.length > SHOWN_ISSUES ? (
        <p>…và {issues.length - SHOWN_ISSUES} lỗi khác. Sửa các lỗi trên rồi tải lại file.</p>
      ) : null}
    </div>
  );
}

function PeoplePreview({ parsed }: { parsed: ParsedImport }) {
  const rows = parsed.people.slice(0, PREVIEW_ROWS);
  if (rows.length === 0) return null;
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-brand-950">
        Xem trước {rows.length}/{parsed.people.length} dòng đầu
      </p>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-gold-50 text-stone-700">
            <tr>
              {['Dòng', 'Mã', 'Họ và tên', 'Giới tính', 'Đời', 'Mã cha', 'Mã mẹ'].map((label) => (
                <th key={label} scope="col" className="px-3 py-2 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((person) => (
              <tr key={person.row} className="border-t border-line">
                <td className="px-3 py-2 text-stone-500">{person.row}</td>
                <td className="px-3 py-2">{person.code}</td>
                <td className="px-3 py-2 font-medium text-stone-900">{person.name}</td>
                <td className="px-3 py-2">{GENDER_LABELS[person.gender]}</td>
                <td className="px-3 py-2">{person.generation ?? '—'}</td>
                <td className="px-3 py-2">{person.fatherCode ?? '—'}</td>
                <td className="px-3 py-2">{person.motherCode ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportCard({ familySlug }: { familySlug: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({ step: 'idle' });

  function reset(): void {
    setState({ step: 'idle' });
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setState({ step: 'checking', fileName: file.name });
    try {
      const { parseImportFile } = await import('@/lib/family-import/parse');
      const parsed = await parseImportFile(file);
      if (
        parsed.issues.length > 0 ||
        (parsed.people.length === 0 && parsed.relationships.length === 0)
      ) {
        setState({
          step: 'checked',
          fileName: file.name,
          parsed,
          issues: parsed.issues,
          result: null,
        });
        return;
      }
      const result = await importFamilyTree(familySlug, {
        dryRun: true,
        people: parsed.people,
        relationships: parsed.relationships,
        existingPeople: parsed.existingPeople,
      });
      setState({ step: 'checked', fileName: file.name, parsed, issues: result.issues, result });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'kiểm tra file nhập liệu') });
      reset();
    }
  }

  async function runImport(): Promise<void> {
    if (state.step !== 'checked' || !state.result || state.issues.length > 0) return;
    const { parsed, result, fileName } = state;
    const confirmed = await confirm({
      title: `Nhập ${result.peopleCount} thành viên và ${result.relationshipCount} cặp vợ chồng vào gia phả?`,
      message:
        result.existingPeopleCount > 0
          ? `Cây hiện có ${result.existingPeopleCount} người. Dữ liệu trong file sẽ được thêm mới bên cạnh, không gộp với người đã có.`
          : 'Dữ liệu sẽ được thêm vào cây gia phả của dòng họ.',
      confirmLabel: 'Nhập dữ liệu',
    });
    if (!confirmed) return;

    setState({ step: 'importing', fileName, parsed, result });
    try {
      const imported = await importFamilyTree(familySlug, {
        dryRun: false,
        people: parsed.people,
        relationships: parsed.relationships,
        existingPeople: parsed.existingPeople,
      });
      if (!imported.imported) {
        setState({ step: 'checked', fileName, parsed, issues: imported.issues, result: imported });
        return;
      }
      setState({ step: 'done', result: imported });
      if (inputRef.current) inputRef.current.value = '';
      showToast({
        kind: 'success',
        message: `Đã nhập ${imported.peopleCount} thành viên và ${imported.relationshipCount} cặp vợ chồng.`,
      });
      router.refresh();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'nhập dữ liệu gia phả') });
      setState({ step: 'checked', fileName, parsed, issues: [], result });
    }
  }

  const busy = state.step === 'checking' || state.step === 'importing';
  const ready = state.step === 'checked' && state.result !== null && state.issues.length === 0;
  const summary = state.step === 'checked' || state.step === 'importing' ? state : null;

  return (
    <SectionCard
      icon={<Upload aria-hidden="true" />}
      title="Nhập dữ liệu từ file Excel"
      description="Chọn file .xlsx đã điền theo mẫu. Hệ thống kiểm tra toàn bộ file trước; chỉ khi không còn lỗi mới cho phép nhập."
      footer={
        summary ? (
          <>
            <Button type="button" variant="outline" onClick={reset} disabled={busy}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Chọn file khác
            </Button>
            <Button type="button" onClick={() => void runImport()} disabled={!ready || busy}>
              {state.step === 'importing' ? (
                <InlineLoader className="size-4" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {state.step === 'importing'
                ? 'Đang nhập…'
                : summary.result
                  ? `Nhập ${summary.result.peopleCount} thành viên, ${summary.result.relationshipCount} cặp vợ chồng`
                  : `Nhập ${summary.parsed.people.length} thành viên`}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="grid gap-5">
        <label
          className={
            'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gold-500/50 bg-gold-50/40 px-4 py-8 text-center transition hover:border-brand-700 hover:bg-gold-50 ' +
            (busy ? 'pointer-events-none opacity-60' : '')
          }
        >
          {state.step === 'checking' ? (
            <InlineLoader className="size-6" />
          ) : (
            <FileSpreadsheet className="size-8 text-brand-700" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold text-brand-950">
            {state.step === 'checking'
              ? `Đang kiểm tra ${state.fileName}…`
              : summary
                ? summary.fileName
                : 'Bấm để chọn file Excel (.xlsx)'}
          </span>
          <span className="text-xs text-stone-500">Tối đa 5.000 thành viên mỗi lần nhập</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => void handleFile(event)}
            disabled={busy}
          />
        </label>

        {state.step === 'done' ? (
          <p
            role="status"
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900"
          >
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            Đã nhập {state.result.peopleCount} thành viên và {state.result.relationshipCount} cặp vợ
            chồng.
            <Link
              className="font-semibold underline"
              href={`/${encodeURIComponent(familySlug)}/gia-pha`}
            >
              Xem cây gia phả
            </Link>
          </p>
        ) : null}

        {state.step === 'checked' && state.issues.length > 0 ? (
          <IssueList issues={state.issues} />
        ) : null}

        {summary?.result && (summary.step === 'importing' || summary.issues.length === 0) ? (
          <div
            role="status"
            className="grid gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900"
          >
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              File hợp lệ: {summary.result.peopleCount} thành viên,{' '}
              {summary.result.relationshipCount} cặp vợ chồng.
            </p>
            {summary.result.existingPeopleCount > 0 ? (
              <p>
                Cây hiện có {summary.result.existingPeopleCount} người; dữ liệu mới sẽ được thêm bên
                cạnh, không gộp với người đã có.
              </p>
            ) : null}
          </div>
        ) : null}

        {summary ? <PeoplePreview parsed={summary.parsed} /> : null}
      </div>
    </SectionCard>
  );
}

/** Clan-head tab for bulk-importing the tree from the spreadsheet template. */
export function FamilyImportPanel({
  familySlug,
  memberCount,
}: {
  familySlug: string;
  memberCount: number;
}) {
  return (
    <div className="grid gap-6">
      <TemplateCard familySlug={familySlug} memberCount={memberCount} />
      <ImportCard familySlug={familySlug} />
    </div>
  );
}
