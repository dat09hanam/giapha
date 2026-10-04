'use client';

import {
  Check,
  Copy,
  GitBranch,
  KeyRound,
  Lock,
  LockOpen,
  Plus,
  Trash2,
  TriangleAlert,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { BranchRootPicker, type ClaimedBranch } from '@/components/admin/branch-root-picker';
import { Field, NewPasswordField } from '@/components/auth/form-fields';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createFamilyAccount,
  deleteFamilyAccount,
  resetFamilyAccountPassword,
  setFamilyAccountBranches,
  updateFamilyAccount,
  type FamilyAccount,
} from '@/lib/family-accounts-api';
import { displayPersonName } from '@/lib/person-name';
import { cn } from '@/lib/utils';
import type { FamilyTreeResponse } from '@/types/family-tree';

type Credential = { displayName: string; username: string; password: string };

/**
 * The clan head's accounts tab: member accounts, their passwords, and the chi/nhánh each one
 * manages in the designer. A branch may not overlap one already given out; the API says which.
 */
export function FamilyAccountsPanel({
  familySlug,
  initialAccounts,
  tree,
}: {
  familySlug: string;
  initialAccounts: FamilyAccount[];
  /** Drawn in the dialog where the clan head picks who heads a branch. */
  tree: FamilyTreeResponse;
}) {
  const showToast = useToast();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [copied, setCopied] = useState(false);
  /** The account whose "giao chi" tree dialog is open. */
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const assigning = accounts.find((account) => account.id === assigningId) ?? null;
  /** Every root given out, so the dialog can grey out branches that would overlap them. */
  const claimed = useMemo<ClaimedBranch[]>(
    () =>
      accounts.flatMap((account) =>
        account.branches.map((branch) => ({
          rootPersonId: branch.rootPersonId,
          owner: account.id === assigningId ? 'tài khoản này' : account.displayName,
        })),
      ),
    [accounts, assigningId],
  );

  function replaceAccount(next: FamilyAccount): void {
    setAccounts((current) => current.map((account) => (account.id === next.id ? next : account)));
  }

  function reveal(account: FamilyAccount, newPassword: string): void {
    setCredential({
      displayName: account.displayName,
      username: account.username,
      password: newPassword,
    });
    setCopied(false);
  }

  async function run(accountId: string, action: string, task: () => Promise<void>): Promise<void> {
    setBusyId(accountId);
    try {
      await task();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, action) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setCreating(true);
    try {
      const result = await createFamilyAccount(familySlug, {
        username: String(form.get('username') ?? '').trim(),
        displayName: String(form.get('displayName') ?? '').trim(),
        ...(password.trim() ? { password } : {}),
      });
      setAccounts((current) => [...current, result.account]);
      reveal(result.account, result.password);
      formElement.reset();
      setPassword('');
      showToast({ kind: 'success', message: `Đã tạo tài khoản ${result.account.displayName}.` });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'tạo tài khoản') });
    } finally {
      setCreating(false);
    }
  }

  function saveBranches(account: FamilyAccount, rootPersonIds: string[], message: string): void {
    void run(account.id, 'giao chi/nhánh', async () => {
      replaceAccount(await setFamilyAccountBranches(familySlug, account.id, rootPersonIds));
      setAssigningId(null);
      showToast({ kind: 'success', message });
    });
  }

  function resetPassword(account: FamilyAccount): void {
    if (
      !window.confirm(`Đặt lại mật khẩu cho ${account.displayName}? Mật khẩu cũ sẽ hết hiệu lực.`)
    )
      return;
    void run(account.id, 'đặt lại mật khẩu', async () => {
      const result = await resetFamilyAccountPassword(familySlug, account.id);
      replaceAccount(result.account);
      reveal(result.account, result.password);
    });
  }

  function toggleLock(account: FamilyAccount): void {
    const status = account.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    void run(account.id, 'cập nhật tài khoản', async () => {
      replaceAccount(await updateFamilyAccount(familySlug, account.id, { status }));
    });
  }

  function remove(account: FamilyAccount): void {
    if (!window.confirm(`Xóa tài khoản ${account.displayName} (${account.username})?`)) return;
    void run(account.id, 'xóa tài khoản', async () => {
      await deleteFamilyAccount(familySlug, account.id);
      setAccounts((current) => current.filter((entry) => entry.id !== account.id));
      if (credential?.username === account.username) setCredential(null);
    });
  }

  async function copyCredential(): Promise<void> {
    if (!credential) return;
    await navigator.clipboard.writeText(
      `Tên đăng nhập: ${credential.username}\nMật khẩu: ${credential.password}`,
    );
    setCopied(true);
  }

  return (
    <div className="grid gap-6">
      <SectionCard
        icon={<UserPlus aria-hidden="true" />}
        title="Tạo tài khoản quản lý chi"
        description="Tạo tài khoản cho người phụ trách một chi/nhánh, rồi giao chi cho họ ở danh sách bên dưới. Họ chỉ chỉnh sửa được thành viên trong chi đó."
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
          <form className="grid content-start gap-5" onSubmit={handleCreate}>
            <Field
              id="account-display-name"
              name="displayName"
              label="Tên hiển thị"
              placeholder="Chi trưởng - Nguyễn Văn A"
              minLength={2}
              maxLength={191}
              required
            />
            <Field
              id="account-username"
              name="username"
              label="Tên đăng nhập"
              placeholder="chitruong.hoNguyen"
              pattern="[A-Za-z0-9][A-Za-z0-9_.@\-]*"
              minLength={3}
              maxLength={191}
              autoComplete="off"
              hint="Chữ không dấu, số và các ký tự . _ @ -"
              required
            />
            <NewPasswordField
              id="account-password"
              label="Mật khẩu"
              value={password}
              onChange={setPassword}
            />
            <Button type="submit" className="sm:justify-self-start" disabled={creating}>
              <Plus className="size-4" aria-hidden="true" />
              {creating ? 'Đang tạo…' : 'Tạo tài khoản'}
            </Button>
          </form>

          {credential ? (
            <div
              className="grid content-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"
              role="status"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-emerald-950">{credential.displayName}</p>
                <Button type="button" size="sm" variant="outline" onClick={copyCredential}>
                  {copied ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3.5" aria-hidden="true" />
                  )}
                  {copied ? 'Đã sao chép' : 'Sao chép'}
                </Button>
              </div>
              <dl className="grid gap-1.5 rounded-xl border bg-white p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-stone-500">Tên đăng nhập</dt>
                  <dd className="break-all font-mono font-medium">{credential.username}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-stone-500">Mật khẩu</dt>
                  <dd className="break-all font-mono font-medium">{credential.password}</dd>
                </div>
              </dl>
              <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Mật khẩu chỉ hiển thị một lần tại đây. Hãy lưu và gửi riêng cho đúng người dùng.
              </p>
            </div>
          ) : (
            <div className="grid content-start gap-3 rounded-2xl border border-dashed border-emerald-900/20 bg-stone-50/60 p-5 text-sm leading-6 text-stone-600">
              <p className="font-medium text-emerald-950">Một chi gồm những ai?</p>
              <p>
                Người được chọn làm gốc chi, toàn bộ con cháu của người đó và vợ/chồng của họ. Mỗi
                chi chỉ giao cho một người; không thể giao một chi nằm trong chi đã giao cho người
                khác.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={<UsersRound aria-hidden="true" />}
        title="Tài khoản của dòng họ"
        description="Giao chi/nhánh, đặt lại mật khẩu, khóa hoặc xóa tài khoản thành viên."
      >
        <ul className="grid gap-3">
          {accounts.map((account) => {
            const isHead = account.role === 'MEMBER_PLUS';
            const busy = busyId === account.id;
            const assignedIds = account.branches.map((branch) => branch.rootPersonId);
            return (
              <li
                key={account.id}
                className={cn(
                  'grid gap-3 rounded-2xl border bg-white p-4',
                  account.status === 'SUSPENDED' && 'bg-stone-50',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-emerald-950">
                      {account.displayName}
                      {isHead ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          Trưởng họ
                        </span>
                      ) : null}
                      {account.status === 'SUSPENDED' ? (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-700">
                          Đã khóa
                        </span>
                      ) : null}
                    </p>
                    <p className="break-all font-mono text-xs text-stone-500">{account.username}</p>
                  </div>
                  {isHead ? null : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => resetPassword(account)}
                      >
                        <KeyRound className="size-3.5" aria-hidden="true" />
                        Đặt lại mật khẩu
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => toggleLock(account)}
                      >
                        {account.status === 'ACTIVE' ? (
                          <Lock className="size-3.5" aria-hidden="true" />
                        ) : (
                          <LockOpen className="size-3.5" aria-hidden="true" />
                        )}
                        {account.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        disabled={busy}
                        onClick={() => remove(account)}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Xóa
                      </Button>
                    </div>
                  )}
                </div>

                {isHead ? (
                  <p className="text-sm text-stone-600">Quản lý toàn bộ dòng họ.</p>
                ) : (
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-stone-600">Chi/nhánh quản lý:</span>
                      {account.branches.length === 0 ? (
                        <span className="text-sm text-stone-400">Chưa giao (chỉ xem gia phả)</span>
                      ) : null}
                      {account.branches.map((branch) => (
                        <span
                          key={branch.rootPersonId}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 py-1 pl-3 pr-1 text-sm text-emerald-950"
                        >
                          <GitBranch className="size-3.5" aria-hidden="true" />
                          Chi {displayPersonName(branch.rootName)}
                          <button
                            type="button"
                            className="grid size-6 place-items-center rounded-full text-emerald-800 transition hover:bg-emerald-200 disabled:opacity-40"
                            disabled={busy}
                            aria-label={`Bỏ giao chi ${branch.rootName}`}
                            onClick={() =>
                              saveBranches(
                                account,
                                assignedIds.filter((id) => id !== branch.rootPersonId),
                                `Đã bỏ giao chi ${branch.rootName}.`,
                              )
                            }
                          >
                            <X className="size-3.5" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                      {assigningId === account.id ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setAssigningId(account.id)}
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          Giao chi
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </SectionCard>

      {assigning ? (
        <BranchRootPicker
          tree={tree}
          accountName={assigning.displayName}
          currentRootIds={assigning.branches.map((branch) => branch.rootPersonId)}
          claimed={claimed}
          saving={busyId === assigning.id}
          onClose={() => setAssigningId(null)}
          onConfirm={(personId) => {
            const person = tree.people.find((entry) => entry.id === personId);
            saveBranches(
              assigning,
              [...assigning.branches.map((branch) => branch.rootPersonId), personId],
              `Đã giao chi ${person ? displayPersonName(person.name) : ''} cho ${assigning.displayName}.`,
            );
          }}
        />
      ) : null}
    </div>
  );
}
