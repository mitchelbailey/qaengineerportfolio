/**
 * Stateless, HMAC-signed auth tokens.
 *
 * No server-side session table: the token carries its own expiry, which means
 * the test suite can mint an already-expired token and assert the exact
 * behaviour a user sees when their admin session lapses mid-task — a scenario
 * that is otherwise painful to reproduce.
 *
 * The token is bound to the *data* session id as well as the user id, so a
 * token minted in one isolated session cannot be replayed against another.
 */

export interface AuthTokenPayload {
  /** Data session this token belongs to. */
  sid: string;
  /** User id. */
  uid: string;
  role: 'admin' | 'viewer';
  /** Expiry, epoch milliseconds. */
  exp: number;
}

export const AUTH_COOKIE = 'yarra_auth';
export const AUTH_TTL_MS = 30 * 60 * 1000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function getKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ]);
    keyCache.set(secret, key);
  }
  return key;
}

export async function signToken(payload: AuthTokenPayload, secret: string): Promise<string> {
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export type TokenFailure = 'malformed' | 'bad_signature' | 'expired' | 'wrong_session';

export type TokenResult =
  | { ok: true; payload: AuthTokenPayload }
  | { ok: false; reason: TokenFailure };

export async function verifyToken(
  token: string,
  secret: string,
  sessionId: string,
  now: number = Date.now(),
): Promise<TokenResult> {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [body, signature] = parts;
  if (!body || !signature) return { ok: false, reason: 'malformed' };

  const key = await getKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(signature),
    encoder.encode(body),
  );
  if (!valid) return { ok: false, reason: 'bad_signature' };

  let payload: AuthTokenPayload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlDecode(body))) as AuthTokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  // Expiry is checked before session binding so an expired token reports as
  // expired regardless of which session presents it.
  if (typeof payload.exp !== 'number' || payload.exp <= now) return { ok: false, reason: 'expired' };
  if (payload.sid !== sessionId) return { ok: false, reason: 'wrong_session' };

  return { ok: true, payload };
}
