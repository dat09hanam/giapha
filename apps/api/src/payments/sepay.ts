import { randomInt, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/** A new payment code: the prefix, then 8 characters without look-alikes (0/O, 1/I/L). */
export function generatePaymentCode(prefix: string): string {
  let code = prefix;
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** Finds a payment code in a bank transfer's text; banks may change case or add words around it. */
export function findPaymentCode(text: string, prefix: string): string | null {
  const match = new RegExp(`${prefix}[A-Z0-9]{${CODE_LENGTH}}`).exec(text.toUpperCase());
  return match?.[0] ?? null;
}

/** Checks SePay's `Authorization: Apikey <key>` header without leaking timing. */
export function isSepayAuthorized(header: string | undefined, apiKey: string): boolean {
  const expected = Buffer.from(`Apikey ${apiKey}`);
  const given = Buffer.from(header?.trim() ?? '');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The fields of SePay's transaction webhook this app relies on; others are ignored. */
export const sepayWebhookSchema = z.object({
  id: z.union([z.number().int(), z.string().regex(/^\d+$/)]).transform(String),
  transferType: z.string(),
  transferAmount: z.coerce.number().int().nonnegative(),
  content: z.string().nullish().transform((value) => value ?? ''),
  code: z.string().nullish().transform((value) => value ?? ''),
});

export type SepayWebhook = z.infer<typeof sepayWebhookSchema>;

/** A VietQR image for the transfer, filled with account, amount and content. */
export function vietQrUrl(input: {
  bank: string;
  accountNumber: string;
  accountName: string | null;
  amount: number;
  content: string;
}): string {
  const query = new URLSearchParams({
    acc: input.accountNumber,
    bank: input.bank,
    amount: String(input.amount),
    des: input.content,
    template: 'compact',
  });
  if (input.accountName) query.set('holder', input.accountName);
  return `https://vietqr.app/img?${query.toString()}`;
}
