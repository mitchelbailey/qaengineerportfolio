/**
 * The two accounts every session is seeded with.
 *
 * Single source of truth, read by three consumers that must never drift apart:
 *   worker/db/session.ts  — creates these rows when a session is seeded
 *   app/routes/admin/AdminLogin.tsx — displays them on the sign-in page
 *   tests/support/*        — logs in as them via the API in fixtures
 *
 * These are throwaway credentials for a session-isolated demo: every visitor
 * gets a private copy of these two users, and publishing the password here is
 * intentional so a reviewer (or a test) can sign in without asking.
 */

export const SEED_PASSWORD = 'Password123!';

export const DEMO_ACCOUNTS = [
  { email: 'admin@yarra.test', name: 'Avery Chen', role: 'admin' as const, description: 'Full access' },
  { email: 'viewer@yarra.test', name: 'Sam Okafor', role: 'viewer' as const, description: 'Read only' },
] as const;
