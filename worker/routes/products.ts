import { Hono } from 'hono';
import { productListQuerySchema } from '@shared/schemas';
import type { AppEnv } from '../types';
import { ApiError, parseOrThrow } from '../lib/http';
import { getFeaturedProducts, getProductBySlug, listProducts } from '../db/products';

export const productRoutes = new Hono<AppEnv>();

productRoutes.get('/', async (c) => {
  const query = parseOrThrow(productListQuerySchema, c.req.query());
  return c.json(await listProducts(c.env.DB, c.get('sessionId'), query));
});

/** Registered before `/:slug` so "featured" is never treated as a product slug. */
productRoutes.get('/featured', async (c) => {
  const items = await getFeaturedProducts(c.env.DB, c.get('sessionId'), 4);
  return c.json({ items });
});

productRoutes.get('/:slug', async (c) => {
  const product = await getProductBySlug(c.env.DB, c.get('sessionId'), c.req.param('slug'));
  if (!product) throw ApiError.notFound('We do not stock that product');
  return c.json(product);
});
