/**
 * PBKDF2-SHA256 password hashing using Web Crypto, which is available in
 * workerd without any Node compatibility shim.
 */

const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

/** Encoded as `pbkdf2$sha256$<iterations>$<salt>$<hash>`, both parts base64. */
export async function hashPassword(password: string, saltOverride?: Uint8Array): Promise<string> {
  const salt = saltOverride ?? crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt);
  return `pbkdf2$sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Length-independent, constant-time-ish comparison. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 5) return false;
  const [scheme, algorithm, iterationsRaw, saltRaw, hashRaw] = parts;
  if (scheme !== 'pbkdf2' || algorithm !== 'sha256' || !saltRaw || !hashRaw) return false;
  if (Number(iterationsRaw) !== ITERATIONS) return false;

  const derived = await derive(password, fromBase64(saltRaw));
  return timingSafeEqual(derived, fromBase64(hashRaw));
}

/**
 * Seed accounts are recreated for every visitor session, so hashing them with
 * 100k iterations on each first request would add a visible delay. The salt for
 * seed users is fixed and the resulting hash is memoised for the lifetime of
 * the isolate — same password, same salt, same hash, computed once.
 *
 * This shortcut applies only to the two throwaway demo accounts. Accounts
 * created through the admin API get a fresh random salt.
 */
const SEED_SALT = encoder.encode('yarra-co-demo-salt');
const seedHashCache = new Map<string, Promise<string>>();

export function seedPasswordHash(password: string): Promise<string> {
  let cached = seedHashCache.get(password);
  if (!cached) {
    cached = hashPassword(password, SEED_SALT);
    seedHashCache.set(password, cached);
  }
  return cached;
}
