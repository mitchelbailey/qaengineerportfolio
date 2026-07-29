import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie } from 'hono/cookie';
import type { AppEnv } from '../types';
import { ensureSchema } from '../db/schema';
import { SESSION_COOKIE, SESSION_TTL_MS, seedSession, sweepExpiredSessions } from '../db/session';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Refresh `last_seen_at` at most this often, to keep writes off the hot path. */
const TOUCH_INTERVAL_MS = 60_000;

/**
 * Establishes the caller's isolated data universe.
 *
 * Runs before every API route. A caller with no cookie — or with a cookie
 * pointing at a session that has since been swept — gets a brand new session
 * seeded with a private copy of the catalog.
 */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  await ensureSchema(c.env.DB);

  const now = Date.now();
  const cookieValue = getCookie(c, SESSION_COOKIE);
  let sessionId: string | null = cookieValue && UUID_PATTERN.test(cookieValue) ? cookieValue : null;

  if (sessionId) {
    const existing = await c.env.DB.prepare('SELECT last_seen_at FROM sessions WHERE id = ?')
      .bind(sessionId)
      .first<{ last_seen_at: number }>();

    if (!existing) {
      sessionId = null;
    } else if (now - existing.last_seen_at > TOUCH_INTERVAL_MS) {
      await c.env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').bind(now, sessionId).run();
    }
  }

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO sessions (id, created_at, last_seen_at) VALUES (?1, ?2, ?2)')
      .bind(sessionId, now)
      .run();
    await seedSession(c.env.DB, sessionId, now);

    setCookie(c, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
      secure: new URL(c.req.url).protocol === 'https:',
    });

    // Garbage-collect abandoned sessions off the response path.
    try {
      c.executionCtx.waitUntil(sweepExpiredSessions(c.env.DB, now));
    } catch {
      /* executionCtx is unavailable in some test contexts; skipping is harmless. */
    }
  }

  c.set('sessionId', sessionId);
  c.set('user', null);

  await next();
});
