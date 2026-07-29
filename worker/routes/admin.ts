import { Hono } from 'hono';
import { z } from 'zod';
import { isOrderStatus, type OrderStatus } from '@shared/order-status';
import { adminProductInputSchema, adminProductUpdateSchema, orderStatusUpdateSchema } from '@shared/schemas';
import { ALLOWED_IMAGE_TYPES, formatBytes, isAllowedImageType, MAX_IMAGE_BYTES } from '@shared/upload';
import type { AppEnv } from '../types';
import { ApiError, parseJsonBody, parseOrThrow } from '../lib/http';
import { requireRole } from '../middleware/auth';
import { createProduct, deleteProduct, listAllProducts, setProductImage, updateProduct } from '../db/product-admin';
import { listOrders, updateOrderStatus } from '../db/orders';

export const adminRoutes = new Hono<AppEnv>();

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

// Reads are open to both roles; writes are admin-only. Splitting the guard per
// method rather than per router is what makes the viewer role meaningful.
adminRoutes.get('/products', requireRole('admin', 'viewer'), async (c) => {
  const items = await listAllProducts(c.env.DB, c.get('sessionId'));
  return c.json({ items, total: items.length });
});

adminRoutes.post('/products', requireRole('admin'), async (c) => {
  const input = await parseJsonBody(c.req.raw, adminProductInputSchema);
  const product = await createProduct(c.env.DB, c.get('sessionId'), input);
  return c.json(product, 201);
});

adminRoutes.patch('/products/:id', requireRole('admin'), async (c) => {
  const input = await parseJsonBody(c.req.raw, adminProductUpdateSchema);
  const product = await updateProduct(c.env.DB, c.get('sessionId'), c.req.param('id'), input);
  return c.json(product);
});

adminRoutes.delete('/products/:id', requireRole('admin'), async (c) => {
  await deleteProduct(c.env.DB, c.get('sessionId'), c.req.param('id'));
  return c.body(null, 204);
});

/**
 * Product image upload.
 *
 * The file is stored as a data URL on the product row. Object storage would be
 * the right answer for a real shop, but the point of this endpoint is to give
 * the suite a genuine multipart upload to drive with `setInputFiles`, including
 * the rejection paths for wrong type and oversized file.
 */
adminRoutes.post('/products/:id/image', requireRole('admin'), async (c) => {
  const body = await c.req.parseBody();
  const file = body['image'];

  if (!(file instanceof File)) {
    throw ApiError.validation('Choose an image to upload', { image: ['Choose an image to upload'] });
  }
  if (!isAllowedImageType(file.type)) {
    throw ApiError.validation('That file type is not supported', {
      image: [`Upload a ${ALLOWED_IMAGE_TYPES.map((type) => type.replace('image/', '')).join(', ')} file`],
    });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw ApiError.validation('That image is too large', {
      image: [`Images must be ${formatBytes(MAX_IMAGE_BYTES)} or smaller (yours is ${formatBytes(file.size)})`],
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  // Chunked so a large file cannot blow the argument limit of String.fromCharCode.
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const dataUrl = `data:${file.type};base64,${btoa(binary)}`;

  const product = await setProductImage(c.env.DB, c.get('sessionId'), c.req.param('id'), dataUrl);
  return c.json(product);
});

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

adminRoutes.get('/orders', requireRole('admin', 'viewer'), async (c) => {
  const query = parseOrThrow(orderListQuerySchema, c.req.query());

  let status: OrderStatus | undefined;
  if (query.status !== undefined && query.status !== '') {
    if (!isOrderStatus(query.status)) {
      throw ApiError.validation('Unknown order status', { status: [`"${query.status}" is not a valid status`] });
    }
    status = query.status;
  }

  return c.json(
    await listOrders(c.env.DB, c.get('sessionId'), {
      page: query.page,
      pageSize: query.pageSize,
      ...(status ? { status } : {}),
    }),
  );
});

adminRoutes.patch('/orders/:id', requireRole('admin'), async (c) => {
  const body = await parseJsonBody(c.req.raw, orderStatusUpdateSchema);
  const order = await updateOrderStatus(c.env.DB, c.get('sessionId'), c.req.param('id'), body.status);
  return c.json(order);
});
