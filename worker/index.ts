import { Hono } from 'hono';

/**
 * The one and only Worker: it serves the React SPA *and* the JSON API, so the
 * deployed artefact and the local dev stack are the same thing.
 *
 * Routing order matters:
 *   1. Static assets that exist on disk never reach this Worker at all.
 *   2. `/api/*` is handled here.
 *   3. Everything else falls through to ASSETS, which returns index.html
 *      (`not_found_handling: "single-page-application"`) so client-side routes
 *      such as /products/stoneware-mug work on a hard refresh.
 */
const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    // Asserted by the API suite: catches a binding removed from wrangler.jsonc.
    bindings: {
      db: Boolean(c.env.DB),
      assets: Boolean(c.env.ASSETS),
    },
    testApiEnabled: c.env.ENABLE_TEST_API === 'true',
    timestamp: new Date().toISOString(),
  }),
);

app.all('/api/*', (c) => c.json({ error: 'not_found', message: 'No such API route' }, 404));

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
