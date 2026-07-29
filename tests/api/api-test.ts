import { test as base, expect } from '@playwright/test';
import { ApiClient } from '../support/api-client';

/**
 * Fixtures for the `api` project (tests/api/**), which runs with no browser.
 *
 * This `api` client is built from the bare `request` fixture, which gets its
 * own isolated `APIRequestContext` — its own cookie jar, and therefore its own
 * server-side session — independent of any `page`. That is the correct choice
 * here: these specs *are* the client; there is no UI to keep in sync with.
 *
 * Contrast with tests/fixtures/test.ts, where the equivalent `api` fixture is
 * built from `page.request` so that seeding and the browser share one session.
 * Using this file's version in an E2E test would seed a session the page
 * never sees; using that file's version here would launch a browser this
 * project is specifically configured to avoid. The two are not interchangeable
 * despite having the same name and shape — worth remembering if a spec
 * "mysteriously" can't see data it just seeded.
 */
export const test = base.extend<{ api: ApiClient }>({
  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
});

export { expect };
