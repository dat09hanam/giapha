import { randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';

const KEY_LENGTH = 64;
const HASH_VERSION = 'scrypt-v1';

export const MIN_PASSWORD_LENGTH = 6;
const GENERATED_PASSWORD_LENGTH = 10;
// Leaves out look-alike characters (0/O, 1/l/I) so a generated password survives being read aloud.
const GENERATED_PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePassword(): string {
  const bytes = randomBytes(GENERATED_PASSWORD_LENGTH);
  return Array.from(
    bytes,
    (byte) => GENERATED_PASSWORD_ALPHABET[byte % GENERATED_PASSWORD_ALPHABET.length],
  ).join('');
}

/**
 * The family's shared member password: "thanhvien" and six random digits, simple enough to pass
 * around the clan by word of mouth. It is never forced to change, since everyone shares it.
 */
export function generateSharedMemberPassword(): string {
  return `thanhvien${sixRandomDigits()}`;
}

/**
 * The clan head's first password: "truongho" and six random digits, in the same easy form as the
 * shared one. The head must still replace it on their first sign-in.
 */
export function generateClanHeadPassword(): string {
  return `truongho${sixRandomDigits()}`;
}

function sixRandomDigits(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** A password the account's owner chose themselves. */
export function validateOwnPassword(typed: string): string {
  if (typed.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(`Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
  }
  if (typed.trim() !== typed) {
    throw new BadRequestException('Mật khẩu không được bắt đầu hoặc kết thúc bằng khoảng trắng.');
  }
  return typed;
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `${HASH_VERSION}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [version, encodedSalt, encodedKey] = encodedHash.split('$');
  if (version !== HASH_VERSION || !encodedSalt || !encodedKey) {
    return false;
  }

  const expectedKey = Buffer.from(encodedKey, 'base64url');
  if (expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  const actualKey = await deriveKey(password, Buffer.from(encodedSalt, 'base64url'));
  return timingSafeEqual(actualKey, expectedKey);
}
