'use client';

import {
  Check,
  Copy,
  Crown,
  GitBranch,
  KeyRound,
  Lock,
  LockOpen,
  Mail,
  Plus,
  Trash2,
  TriangleAlert,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { useConfirm } from '@/components/ui/confirm-dialog';
import { AccountEmailDialog } from '@/components/admin/account-email-dialog';
import { SectionCard } from '@/components/admin/admin-layout';
import { BranchRootPicker, type ClaimedBranch } from '@/components/admin/branch-root-picker';
import {
  PREFIX_MAX_LENGTH,
  UsernameField,
  useUsernameCheck,
} from '@/components/admin/username-field';
import { Field } from '@/components/auth/form-fields';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { useToast } from '@/components/ui/toast';
import { PlanLimitDialog } from '@/components/pricing/plan-limit-dialog';
import { getApiErrorMessage, isPlanLimitError } from '@/lib/api-error';
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

type Credential = {
  accountId: string;
  source: 'created' | 'reset';
  displayName: string;
  username: string;
  password: string;
  isShared: boolean;
};

export function FamilyAccountsPanel({
  familySlug,
  initialAccounts,
  usernameSuffix,
  tree,
}: {
  familySlug: string;
  initialAccounts: FamilyAccount[];
  usernameSuffix: string;
  tree: FamilyTreeResponse;
}) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState('');
  const usernameStatus = useUsernameCheck(familySlug, username);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [editingEmail, setEditingEmail] = useState<FamilyAccount | null>(null);
  const [copied, setCopied] = useState(false);
  const [planLimitMessage, setPlanLimitMessage] = useState<string | null>(null);
  const credentialRef = useRef<HTMLDivElement>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const assigning = accounts.find((account) => account.id === assigningId) ?? null;
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

  useEffect(() => {
    credentialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [credential]);

  function replaceAccount(next: FamilyAccount): void {
    setAccounts((current) => current.map((account) => (account.id === next.id ? next : account)));
  }

  function reveal(account: FamilyAccount, newPassword: string, source: Credential['source']): void {
    setCredential({
      accountId: account.id,
      source,
      displayName: account.displayName,
      username: account.username,
      password: newPassword,
      isShared: account.isShared,
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
      const email = String(form.get('email') ?? '').trim();
      const result = await createFamilyAccount(familySlug, {
        usernamePrefix: username.trim(),
        displayName: String(form.get('displayName') ?? '').trim(),
        ...(email ? { email } : {}),
      });
      setAccounts((current) => [...current, result.account]);
      reveal(result.account, result.password, 'created');
      formElement.reset();
      setUsername('');
      showToast({ kind: 'success', message: `Đã tạo tài khoản ${result.account.displayName}.` });
    } catch (error: unknown) {
      if (isPlanLimitError(error)) setPlanLimitMessage(error.message);
      else showToast({ kind: 'error', message: getApiErrorMessage(error, 'tạo tài khoản') });
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

  async function resetPassword(account: FamilyAccount): Promise<void> {
    if (
      !(await confirm({
        title: account.isShared
          ? `Đặt lại mật khẩu dùng chung của ${account.displayName}?`
          : `Đặt lại mật khẩu cho ${account.displayName}?`,
        message: account.isShared
          ? 'Mọi người đang dùng tài khoản này sẽ bị đăng xuất và cần mật khẩu mới để đăng nhập lại.'
          : 'Mật khẩu cũ sẽ hết hiệu lực và người dùng phải đổi mật khẩu ở lần đăng nhập tới.',
        confirmLabel: 'Đặt lại',
      }))
    )
      return;
    void run(account.id, 'đặt lại mật khẩu', async () => {
      const result = await resetFamilyAccountPassword(familySlug, account.id);
      replaceAccount(result.account);
      reveal(result.account, result.password, 'reset');
      showToast({
        kind: 'success',
        message: `Đã đặt lại mật khẩu cho ${result.account.displayName}.`,
      });
    });
  }

  function toggleLock(account: FamilyAccount): void {
    const status = account.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    void run(account.id, 'cập nhật tài khoản', async () => {
      replaceAccount(await updateFamilyAccount(familySlug, account.id, { status }));
    });
  }

  async function remove(account: FamilyAccount): Promise<void> {
    if (
      !(await confirm({
        title: `Xóa tài khoản ${account.displayName}?`,
        message: `Tên đăng nhập ${account.username} sẽ không dùng được nữa.`,
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;
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
      <PlanLimitDialog message={planLimitMessage} onClose={() => setPlanLimitMessage(null)} />
      <SectionCard icon={<UserPlus aria-hidden="true" />} title="Tạo tài khoản quản lý chi">
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
            <UsernameField
              id="account-username"
              name="username"
              label="Tên đăng nhập"
              placeholder="adminchi1"
              pattern="[A-Za-z0-9][A-Za-z0-9_.@\-]*"
              title="Chỉ dùng chữ không dấu, số và các ký tự _ . @ -, bắt đầu bằng chữ hoặc số."
              minLength={3}
              maxLength={PREFIX_MAX_LENGTH}
              suffix={usernameSuffix}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              status={usernameStatus}
              required
            />
            <Field
              id="account-email"
              name="email"
              type="email"
              label="Email (không bắt buộc)"
              placeholder="nguyenvana@gmail.com"
              maxLength={191}
              autoComplete="off"
            />
            <Button
              type="submit"
              className="sm:justify-self-start"
              disabled={creating || usernameStatus === 'taken'}
            >
              <Plus className="size-4" aria-hidden="true" />
              {creating ? 'Đang tạo…' : 'Tạo tài khoản'}
            </Button>
          </form>

          {credential?.source === 'created' ? (
            <div ref={credentialRef}>
              <CredentialCard
                title={credential.displayName}
                credential={credential}
                copied={copied}
                onCopy={copyCredential}
              />
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard icon={<UsersRound aria-hidden="true" />} title="Tài khoản của dòng họ">
        <ul className="grid gap-3">
          {accounts.map((account) => {
            const isHead = account.role === 'MEMBER_PLUS';
            const busy = busyId === account.id;
            const assignedIds = account.branches.map((branch) => branch.rootPersonId);
            const AccountIcon = isHead ? Crown : account.isShared ? UsersRound : UserRound;
            const actions: ActionMenuItem[] = [
              {
                key: 'reset',
                label: 'Đặt lại mật khẩu',
                icon: <KeyRound aria-hidden="true" />,
                onSelect: () => void resetPassword(account),
              },
              ...(account.isShared
                ? []
                : [
                    {
                      key: 'email',
                      label: account.email ? 'Đổi email' : 'Thêm email',
                      icon: <Mail aria-hidden="true" />,
                      onSelect: () => setEditingEmail(account),
                    },
                  ]),
              {
                key: 'lock',
                label: account.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
                icon:
                  account.status === 'ACTIVE' ? (
                    <Lock aria-hidden="true" />
                  ) : (
                    <LockOpen aria-hidden="true" />
                  ),
                onSelect: () => toggleLock(account),
              },
              {
                key: 'delete',
                label: 'Xóa tài khoản',
                icon: <Trash2 aria-hidden="true" />,
                onSelect: () => void remove(account),
              },
            ];
            const showBranches = !isHead && (!account.isShared || account.branches.length > 0);
            return (
              <li
                key={account.id}
                className={cn(
                  'grid gap-3 rounded-2xl border border-gold-500/25 bg-white/80 p-4 shadow-sm',
                  account.status === 'SUSPENDED' && 'bg-stone-50/80',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-inset',
                      isHead
                        ? 'bg-amber-50 text-amber-700 ring-amber-200'
                        : account.isShared
                          ? 'bg-sky-50 text-sky-700 ring-sky-200'
                          : 'bg-brand-50 text-brand-700 ring-brand-100',
                      account.status === 'SUSPENDED' && 'opacity-50 grayscale',
                    )}
                  >
                    <AccountIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-1">
                    <p className="truncate font-semibold text-brand-950">{account.displayName}</p>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      {isHead ? (
                        <span className="rounded-full bg-amber-100 px-2 text-[11px] font-semibold leading-5 text-amber-900">
                          Trưởng họ
                        </span>
                      ) : null}
                      {account.isShared ? (
                        <span className="rounded-full bg-sky-100 px-2 text-[11px] font-semibold leading-5 text-sky-900">
                          Dùng chung
                        </span>
                      ) : null}
                      {account.status === 'SUSPENDED' ? (
                        <span className="rounded-full bg-stone-200 px-2 text-[11px] font-semibold leading-5 text-stone-700">
                          Đã khóa
                        </span>
                      ) : null}
                      <span className="min-w-0 truncate font-mono text-xs text-stone-500">
                        {account.username}
                      </span>
                    </div>
                    {account.email ? (
                      <p className="flex min-w-0 items-center gap-1.5 text-xs text-stone-500">
                        <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{account.email}</span>
                      </p>
                    ) : null}
                  </div>
                  {isHead ? null : (
                    <ActionMenu
                      label={`Thao tác cho ${account.displayName}`}
                      items={actions}
                      disabled={busy}
                    />
                  )}
                </div>

                {showBranches ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-gold-500/20 pt-3 sm:ml-14">
                    {account.branches.length === 0 ? (
                      <span className="text-sm text-stone-400">Chưa giao chi</span>
                    ) : null}
                    {account.branches.map((branch) => (
                      <span
                        key={branch.rootPersonId}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-sm text-brand-900 ring-1 ring-inset ring-brand-100"
                      >
                        <GitBranch className="size-3.5" aria-hidden="true" />
                        Chi {displayPersonName(branch.rootName)}
                        <button
                          type="button"
                          className="grid size-6 place-items-center rounded-full text-brand-800 transition hover:bg-brand-100 disabled:opacity-40"
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
                    {assigningId === account.id || account.isShared ? null : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full border-dashed"
                        disabled={busy}
                        onClick={() => setAssigningId(account.id)}
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Giao chi
                      </Button>
                    )}
                  </div>
                ) : null}

                {credential?.source === 'reset' && credential.accountId === account.id ? (
                  <div ref={credentialRef}>
                    <CredentialCard
                      title="Mật khẩu mới"
                      credential={credential}
                      copied={copied}
                      onCopy={copyCredential}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <Presence>
        {editingEmail ? (
          <AccountEmailDialog
            familySlug={familySlug}
            account={editingEmail}
            onClose={() => setEditingEmail(null)}
            onSaved={(saved) => {
              replaceAccount(saved);
              setEditingEmail(null);
            }}
          />
        ) : null}
      </Presence>

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

function CredentialCard({
  title,
  credential,
  copied,
  onCopy,
}: {
  title: string;
  credential: Credential;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className="grid content-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 p-5"
      role="status"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-brand-950">{title}</p>
        <Button type="button" size="sm" variant="outline" onClick={onCopy}>
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
        {credential.isShared
          ? 'Mật khẩu chỉ hiển thị một lần tại đây. Hãy lưu lại và gửi cho con cháu trong họ.'
          : 'Mật khẩu tạm chỉ hiển thị một lần tại đây. Hãy gửi riêng cho đúng người dùng; họ sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.'}
      </p>
    </div>
  );
}
