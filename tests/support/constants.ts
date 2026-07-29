export { DEMO_ACCOUNTS, SEED_PASSWORD } from '@shared/demo-accounts';
export { SEED_ANCHORS, LOW_STOCK_THRESHOLD } from '@shared/catalog-seed';
export { TEST_CARDS } from '@shared/payment';

/**
 * Tests import shared *contracts* (Zod schemas, seed data, domain constants)
 * but never import from `worker/` or `app/` directly. That boundary is
 * deliberate: it is what keeps these specs a black-box exercise of the
 * running application over HTTP, rather than a suite that quietly depends on
 * internal implementation details and breaks on a refactor that changes
 * nothing a user could observe.
 */
