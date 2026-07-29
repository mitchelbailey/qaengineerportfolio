/**
 * The seeded demo accounts, surfaced on the sign-in page.
 *
 * These are throwaway credentials for a session-isolated demo — every visitor
 * gets their own private copy of these two users, and nothing they do is
 * visible to anyone else. Publishing them is the point: a reviewer should be
 * able to open the live demo and get into the admin area without asking.
 *
 * Kept in sync with SEED_USERS / SEED_PASSWORD in worker/db/session.ts.
 */

export const SEED_PASSWORD_HINT = 'Password123!';

export const DEMO_ACCOUNTS = [
  { email: 'admin@yarra.test', description: 'Full access' },
  { email: 'viewer@yarra.test', description: 'Read only' },
] as const;
