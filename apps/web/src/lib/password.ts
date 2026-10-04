export const MIN_PASSWORD_LENGTH = 6;

const GENERATED_PASSWORD_LENGTH = 10;
// Leaves out look-alike characters (0/O, 1/l/I) so a generated password survives being read aloud.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GENERATED_PASSWORD_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}
