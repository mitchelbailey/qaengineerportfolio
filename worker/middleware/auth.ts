import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import type { User } from '@shared/schemas';
import type { AppEnv } from '../types';
import { ApiError } from '../lib/http';
import { AUTH_COOKIE, verifyToken, type TokenFailure } from '../auth/token';

/**
 * A 401 that says why.
 *
 * `session_expired` is a distinct code from plain `unauthorized` so the client
 * can show "your session expired, sign in again" rather than a generic prompt —
 * including after a full page reload, where no client state survives to infer
 * it from. Reproducible on demand via POST /api/test/session/expire.
 */
export function unauthenticatedError(failure: TokenFailure | null): ApiError {
  if (failure === 'expired') {
    return new ApiError(401, 'session_expired', 'Your session has expired. Please sign in again.');
  }
  return ApiError.unauthorised();
}

/**
 * Resolves the auth cookie into `c.var.user`, or leaves it null.
 *
 * Never rejects on its own — an anonymous request to a public route is
 * perfectly valid. Enforcement is the job of `requireRole` below.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('authFailure', null);

  const token = getCookie(c, AUTH_COOKIE);
  if (!token) return next();

  const result = await verifyToken(token, c.env.AUTH_SECRET, c.get('sessionId'));
  if (!result.ok) {
    c.set('authFailure', result.reason);
    return next();
  }

  const user = await c.env.DB.prepare(
    'SELECT id, email, name, role FROM users WHERE session_id = ? AND id = ?',
  )
    .bind(c.get('sessionId'), result.payload.uid)
    .first<{ id: string; email: string; name: string; role: 'admin' | 'viewer' }>();

  if (user) c.set('user', user satisfies User);
  return next();
});

/**
 * Route guard.
 *
 * Distinguishing 401 from 403 matters here and is tested: an anonymous caller
 * gets 401 (sign in), a signed-in viewer attempting a write gets 403 (you are
 * signed in, but not allowed). Collapsing the two is a common authorisation bug
 * and hides privilege problems behind a login prompt.
 */
export function requireRole(...roles: Array<'admin' | 'viewer'>) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    if (!user) throw unauthenticatedError(c.get('authFailure'));
    if (!roles.includes(user.role)) {
      throw ApiError.forbidden(`This action requires the ${roles.join(' or ')} role`);
    }
    return next();
  });
}
