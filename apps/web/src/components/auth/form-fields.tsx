import { RefreshCw } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { generatePassword, MIN_PASSWORD_LENGTH } from '@/lib/password';

type FieldProps = ComponentProps<'input'> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, ...props }: FieldProps) {
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-emerald-950">{label}</span>
      <input
        id={id}
        className="h-11 rounded-xl border bg-white px-3 text-base outline-none transition placeholder:text-stone-400 sm:text-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
        {...props}
      />
      {hint ? <span className="text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

/**
 * A new account's password: typed in, generated with the button, or left blank for the server
 * to generate. The value is shown in clear so it can be read out to the account's owner.
 */
export function NewPasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Field
        id={id}
        label={label}
        placeholder="Để trống để hệ thống tự sinh"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={128}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        hint={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="justify-self-start"
        onClick={() => onChange(generatePassword())}
      >
        <RefreshCw className="size-3.5" aria-hidden="true" />
        Tạo mật khẩu ngẫu nhiên
      </Button>
    </div>
  );
}
