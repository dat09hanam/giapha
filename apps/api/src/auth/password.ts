import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const HASH_VERSION = 'scrypt-v1';

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
