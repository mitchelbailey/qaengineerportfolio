import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

/* An explicit BASE_URL means "test something that is already running" — the
   post-deploy smoke run in CI points at the live Worker. In that case there is
   nothing to build and no server to start locally. */
const targetsExternalDeployment = Boolean(process.env.BASE_URL);

/**
 * Playwright configuration for Yarra & Co.
 *
 * Two decisions worth understanding before reading the suites:
 *
 * 1. Tests run against the *production build* (`vite preview`), not the dev
 *    server. The built Worker serves the SPA and the API exactly as deployed,
 *    there is no HMR client injecting itself into the page, and the file
 *    watcher cannot reload the page mid-test when a spec writes a fixture file.
 *
 * 2. `fullyParallel` is safe without any per-test cleanup, because the
 *    application gives every browser context its own isolated data universe
 *    (see worker/middleware/session.ts). A fresh context means a fresh session
 *    cookie, which means a private copy of the catalog. No shared database
 *    state, so no serial mode, no test ordering, and no truncate-between-tests.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,

  /* A `test.only` left in a commit must fail CI, not silently skip the suite. */
  forbidOnly: Boolean(process.env.CI),

  /* Retries in CI only. Locally a flaky test should be visibly flaky, not
     quietly retried into a pass. */
  retries: process.env.CI ? 2 : 0,
  /* Pinned rather than left to auto-detect: the webServer below is a single
     `vite preview` process (Miniflare/workerd with a local SQLite-backed D1),
     not a horizontally scaled server. Playwright's local default is half the
     machine's logical CPU count, which on a high-core-count dev box can spin
     up dozens of workers and overwhelm that single process with concurrent
     connections, producing intermittent ECONNREFUSED. A fixed low count keeps
     the run reliable regardless of what machine it's run on. */
  workers: 2,

  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: process.env.CI ? [['blob'], ['github'], ['list']] : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL,
    testIdAttribute: 'data-testid',
    /* Artefacts on failure only, and a trace on the first retry — enough to
       debug a CI failure without ballooning artefact storage. */
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      /* No browser at all: these drive the API through Playwright's request
         context, which is faster and makes the failure point unambiguous. */
      use: {},
    },
    {
      name: 'chromium',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testDir: './tests/e2e',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'a11y',
      testDir: './tests/a11y',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testDir: './tests/visual',
      use: {
        ...devices['Desktop Chrome'],
        /* Animations and transitions are the main source of screenshot noise.
           The app honours prefers-reduced-motion, so asking for it here makes
           baselines deterministic rather than needing per-shot masking.
           As of Playwright 1.6x this option lives under contextOptions rather
           than flat on `use`. */
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],

  webServer: targetsExternalDeployment
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
