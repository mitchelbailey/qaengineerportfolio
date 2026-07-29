import { Hono } from 'hono';
import type { AppEnv } from '../types';

/**
 * A stand-in for the flaky third-party review widget every real storefront
 * seems to have.
 *
 * It fails a configurable share of requests with a 503. That is not laziness —
 * it is the single most valuable thing in this codebase for demonstrating test
 * design. A suite that lets an unreliable third party decide whether it passes
 * is not a suite; the tests intercept this route with `page.route()` and pin the
 * response, and only the dedicated error-state test lets it fail.
 *
 * Review content is derived from the slug, so a given product always shows the
 * same reviews and screenshots stay stable.
 */
export const reviewRoutes = new Hono<AppEnv>();

const AUTHORS = ['Priya N.', 'Tom R.', 'Alex W.', 'Jo M.', 'Sam K.', 'Dani L.', 'Chris B.', 'Mei T.'];

const BODIES = [
  'Exactly as described. Been using it daily for a month with no complaints.',
  'Arrived quickly and well packed. Slightly smaller than I pictured, but that is on me for not reading the dimensions.',
  'Second one I have bought. The first was a gift and I wanted my own.',
  'Good quality for the price. Would buy again.',
  'Does the job well. The finish is nicer in person than in the photos.',
  'Solid and heavy in a way that feels reassuring. Happy with it.',
];

/** Deterministic 32-bit hash, so the same slug always yields the same reviews. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

reviewRoutes.get('/:slug', (c) => {
  const configured = Number(c.env.FLAKY_WIDGET_FAILURE_RATE);
  const failureRate = Number.isFinite(configured) ? configured : 0.3;

  if (Math.random() < failureRate) {
    return c.json(
      { error: 'upstream_unavailable', message: 'The reviews service is temporarily unavailable' },
      503,
    );
  }

  const slug = c.req.param('slug');
  const seed = hashString(slug);
  const count = 3 + (seed % 3);

  const reviews = Array.from({ length: count }, (_, index) => {
    const local = hashString(`${slug}:${index}`);
    return {
      id: `${slug}-review-${index}`,
      author: AUTHORS[local % AUTHORS.length] ?? 'Anonymous',
      rating: 4 + (local % 2),
      body: BODIES[local % BODIES.length] ?? '',
      // Fixed dates rather than relative ones, so nothing drifts over time.
      postedAt: new Date(Date.UTC(2026, local % 12, (local % 27) + 1)).toISOString(),
    };
  });

  return c.json({ slug, reviews });
});
