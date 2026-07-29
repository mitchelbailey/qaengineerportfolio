import { Hono } from 'hono';
import type { AppEnv } from './types';
import { ApiError } from './lib/http';
import { sessionMiddleware } from './middleware/session';
import { authMiddleware } from './middleware/auth';
import { latencyMiddleware } from './middleware/latency';
import { productRoutes } from './routes/products';
import { cartRoutes } from './routes/cart';
import { orderRoutes } from './routes/orders';
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import { reviewRoutes } from './routes/reviews';
import { testRoutes } from './routes/test';

/**
 * The one and only Worker: it serves the React SPA *and* the JSON API, so the
 * deployed artefact and the local dev stack are the same thing.
 *
 * Routing order:
 *   1. Static assets that exist on disk never reach this Worker at all.
 *   2. `/api/*` is handled here.
 *   3. Everything else falls through to ASSETS, which returns index.html
 *      (`not_found_handling: "single-page-application"`) so client-side routes
 *      such as /products/brunswick-stoneware-mug survive a hard refresh.
 */
const app = new Hono<AppEnv>();

/* Middleware, in order. Latency wraps everything so it also covers errors —
   an error path that returns instantly while the success path takes 200ms is
   a timing oracle, and tests would come to depend on it. */
app.use('/api/*', latencyMiddleware);
app.use('/api/*', sessionMiddleware);
app.use('/api/*', authMiddleware);

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    bindings: {
      db: Boolean(c.env.DB),
      assets: Boolean(c.env.ASSETS),
      authSecret: Boolean(c.env.AUTH_SECRET),
    },
    testApiEnabled: c.env.ENABLE_TEST_API === 'true',
    simulatedLatencyMs: Number(c.env.SIMULATED_LATENCY_MS) || 0,
    timestamp: new Date().toISOString(),
  }),
);

app.route('/api/products', productRoutes);
app.route('/api/cart', cartRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/reviews', reviewRoutes);
app.route('/api/test', testRoutes);

app.all('/api/*', (c) => c.json({ error: 'not_found', message: 'No such API route' }, 404));

/** Single error shape for the whole API: `{ error, message, fieldErrors? }`. */
app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json(
      {
        error: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
      error.status,
    );
  }

  console.error('Unhandled worker error', error);
  return c.json({ error: 'internal_error', message: 'Something went wrong on our end' }, 500);
});

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
