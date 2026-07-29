import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';

/**
 * Artificial latency on API responses.
 *
 * Without it, a local Worker answers in single-digit milliseconds, skeleton
 * loaders never render, and the suite ends up "testing" loading states that no
 * real user ever sees. A consistent delay makes those states genuinely present
 * and forces the tests to rely on Playwright's auto-waiting rather than luck.
 *
 * Test-support routes are exempt: setup should be fast.
 */
export const latencyMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  await next();

  const configured = Number(c.env.SIMULATED_LATENCY_MS);
  if (!Number.isFinite(configured) || configured <= 0) return;
  if (c.req.path.startsWith('/api/test/') || c.req.path === '/api/health') return;

  // A little jitter, so nothing can accidentally depend on an exact duration.
  const jitter = Math.random() * 60;
  await new Promise((resolve) => setTimeout(resolve, configured + jitter));
});
