import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { loginSchema, type User } from '@shared/schemas';
import type { AppEnv } from '../types';
import { ApiError, parseJsonBody } from '../lib/http';
import { unauthenticatedError } from '../middleware/auth';
import { verifyPassword } from '../auth/password';
import { AUTH_COOKIE, AUTH_TTL_MS, signToken } from '../auth/token';

export const authRoutes = new Hono<AppEnv>();

function authCookieOptions(url: string) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    path: '/',
    maxAge: Math.floor(AUTH_TTL_MS / 1000),
    secure: new URL(url).protocol === 'https:',
  };
}

authRoutes.post('/login', async (c) => {
  const body = await parseJsonBody(c.req.raw, loginSchema);
  const sessionId = c.get('sessionId');

  const row = await c.env.DB.prepare(
    'SELECT id, email, name, role, password_hash FROM users WHERE session_id = ? AND email = ?',
  )
    .bind(sessionId, body.email.toLowerCase())
    .first<{ id: string; email: string; name: string; role: 'admin' | 'viewer'; password_hash: string }>();

  // The same message and the same code for "no such user" and "wrong password",
  // so the endpoint cannot be used to enumerate accounts.
  const invalid = ApiError.unauthorised('Email or password is incorrect');
  if (!row) throw invalid;
  if (!(await verifyPassword(body.password, row.password_hash))) throw invalid;

  const token = await signToken(
    { sid: sessionId, uid: row.id, role: row.role, exp: Date.now() + AUTH_TTL_MS },
    c.env.AUTH_SECRET,
  );
  setCookie(c, AUTH_COOKIE, token, authCookieOptions(c.req.url));

  const user: User = { id: row.id, email: row.email, name: row.name, role: row.role };
  return c.json({ user, expiresInSeconds: Math.floor(AUTH_TTL_MS / 1000) });
});

authRoutes.post('/logout', (c) => {
  deleteCookie(c, AUTH_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

authRoutes.get('/me', (c) => {
  const user = c.get('user');
  if (!user) throw unauthenticatedError(c.get('authFailure'));
  return c.json({ user });
});
