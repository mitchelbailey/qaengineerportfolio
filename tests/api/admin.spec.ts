import type { ErrorResponse } from '@shared/schemas';
import { errorResponseSchema, orderSchema, productSchema } from '@shared/schemas';
import { readJson } from '../support/api-client';
import { test, expect } from './api-test';
import { MAX_IMAGE_BYTES } from '@shared/upload';

test.describe('PATCH /api/admin/products/:id', () => {
  test('TC-043 | a price-only PATCH leaves featured, material, and dimensions untouched', async ({ api }) => {
    await api.reset();
    await api.loginAsAdmin();

    const slug = 'brunswick-stoneware-mug';
    const patchedPrice = 4205;
    const product = await api.getProduct(slug);

    const priceCents = product.priceCents;
    const featured = product.featured;
    const material = product.material;
    const dimensions = product.dimensions;

    const response = await api.request.patch(`/api/admin/products/${product.id}`, {
      data: { priceCents: patchedPrice },
    });

    expect(response.status()).toBe(200);

    const patchedProduct = await api.getProduct(slug);
    expect(patchedProduct.priceCents).not.toBe(priceCents);
    expect(patchedProduct.priceCents).toBe(patchedPrice);
    expect(patchedProduct.featured).toBe(featured);
    expect(patchedProduct.material).toBe(material);
    expect(patchedProduct.dimensions).toBe(dimensions);
  });

  test('TC-044 | PATCH with an empty body is rejected as a validation error, not accepted as a no-op', async ({
    api,
  }) => {
    await api.reset();
    await api.loginAsAdmin();

    const slug = 'brunswick-stoneware-mug';
    const before = await api.getProduct(slug);

    const response = await api.request.patch(`/api/admin/products/${before.id}`, {
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('empty_update');

    const after = await api.getProduct(slug);
    expect(after).toEqual(before);
  });
});

test.describe('GET /api/admin/products', () => {
  test('TC-045 | an anonymous request to the admin product list is rejected with 401', async ({ api }) => {
    await api.reset();
    const response = await api.request.get('/api/admin/products');
    expect(response.status()).toBe(401);
    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('unauthorized');
  });

  test('TC-047 | a viewer can read the admin product list', async ({ api }) => {
    await api.reset();
    await api.loginAsViewer();
    const response = await api.request.get('/api/admin/products');
    expect(response.status()).toBe(200);

    const body = await readJson<{ items: unknown[]; total: number }>(response);
    expect(body.items.length).toBeGreaterThan(0);

    const violations = body.items
      .map((item) => ({ item, issues: productSchema.safeParse(item).error?.issues }))
      .filter(({ issues }) => issues !== undefined);
    expect(violations).toEqual([]);
  });

  test('TC-058 | an admin can read the admin product list', async ({ api }) => {
    await api.reset();
    await api.loginAsAdmin();
    const response = await api.request.get('/api/admin/products');
    expect(response.status()).toBe(200);

    const body = await readJson<{ items: unknown[]; total: number }>(response);
    expect(body.items.length).toBeGreaterThan(0);

    const violations = body.items
      .map((item) => ({ item, issues: productSchema.safeParse(item).error?.issues }))
      .filter(({ issues }) => issues !== undefined);
    expect(violations).toEqual([]);
  });
});

test.describe('POST /api/admin/products', () => {
  test('TC-059 | a viewer creating a product is rejected with 403', async ({ api }) => {
    await api.reset();
    await api.loginAsViewer();

    const postResponse = await api.request.post('/api/admin/products', {
      data: {
        name: 'Prahan Cast Iron Skillet',
        slug: 'prahan-cast-iron-skillet',
        category: 'kitchen',
        priceCents: 12905,
        stock: 12,
        featured: true,
        summary: 'Pre-seasoned, machine-polished cooking surface. No enamel to chip.',
        description:
          'Sand-cast then machine-polished, so the cooking surface starts smooth instead of pebbled',
        material: 'Sand-cast iron, pre-seasoned',
        dimensions: '26 cm · 2.4 kg',
      },
    });

    expect(postResponse.status()).toBe(403);
    const postBody = await readJson<ErrorResponse>(postResponse);
    expect(postBody.error).toBe('forbidden');
  });

  test('TC-048 | an admin can create a product and it appears in the admin list', async ({ api }) => {
    await api.reset();
    await api.loginAsAdmin();

    const slug = 'prahan-cast-iron-skillet';
    const newProduct = {
      name: 'Prahan Cast Iron Skillet',
      slug: slug,
      category: 'kitchen',
      priceCents: 12905,
      stock: 12,
      featured: true,
      summary: 'Pre-seasoned, machine-polished cooking surface. No enamel to chip.',
      description: 'Sand-cast then machine-polished, so the cooking surface starts smooth instead of pebbled',
      material: 'Sand-cast iron, pre-seasoned',
      dimensions: '26 cm · 2.4 kg',
    };

    const postResponse = await api.request.post('/api/admin/products', {
      data: newProduct,
    });

    expect(postResponse.status()).toBe(201);

    const response = await api.request.get('/api/admin/products');
    expect(response.status()).toBe(200);

    const body = await readJson<{ items: unknown[]; total: number }>(response);

    const matched = body.items.find((item) => {
      const result = productSchema.safeParse(item);
      return result.success && result.data.slug === slug;
    });

    expect(matched).toBeDefined();
    expect(matched).toEqual({
      ...newProduct,
      id: expect.any(String),
      imageUrl: '/products/prahan-cast-iron-skillet.svg',
      inStock: true,
      lowStock: false,
      rating: 0,
      reviewCount: 0,
    });
  });

  test('TC-049 | creating a product with an invalid payload is a validation error', async ({ api }) => {
    await api.reset();
    await api.loginAsAdmin();

    const missingResponse = await api.request.post('/api/admin/products', {
      data: {},
    });

    expect(missingResponse.status()).toBe(422);
    const missingBody = await readJson<ErrorResponse>(missingResponse);
    expect(missingBody.error).toBe('validation_failed');
    expect(missingBody.fieldErrors).toEqual({
      name: ['Invalid input'],
      slug: ['Invalid input'],
      category: ['Invalid input'],
      priceCents: ['Invalid input'],
      stock: ['Invalid input'],
      summary: ['Invalid input'],
      description: ['Invalid input'],
    });

    const response = await api.request.post('/api/admin/products', {
      data: {
        name: 123,
        slug: 123,
        category: 'not-a-category',
        priceCents: '123',
        stock: '123',
        summary: 123,
        description: 123,
      },
    });

    expect(response.status()).toBe(422);
    const postBody = await readJson<ErrorResponse>(response);
    expect(postBody.error).toBe('validation_failed');
    expect(postBody.fieldErrors).toEqual({
      name: ['Invalid input'],
      slug: ['Invalid input'],
      category: ['Invalid input'],
      priceCents: ['Invalid input'],
      stock: ['Invalid input'],
      summary: ['Invalid input'],
      description: ['Invalid input'],
    });
  });
});

test.describe('POST /api/admin/products/:id/image', () => {
  test("TC-051 | uploading a valid image sets the product's image, reflected on the next GET", async ({
    api,
  }) => {
    await api.reset();
    await api.loginAsAdmin();

    const imageBuffer = Buffer.from('fake-image-data');
    const file = new File([imageBuffer], 'new-image.png', { type: 'image/png' });

    const formData = new FormData();
    formData.set('image', file);

    const slug = 'brunswick-stoneware-mug';
    const product = await api.getProduct(slug);
    expect(product.imageUrl).toBe('/products/brunswick-stoneware-mug.svg');

    const postResponse = await api.request.post(`/api/admin/products/${product.id}/image`, {
      multipart: formData,
    });

    expect(postResponse.status()).toBe(200);
    const updatedProduct = await api.getProduct(slug);
    expect(updatedProduct.imageUrl).toBe(`data:image/png;base64,${imageBuffer.toString('base64')}`);
  });

  test('TC-052 | uploading a non-image file type is rejected, naming the allowed types', async ({ api }) => {
    await api.reset();
    await api.loginAsAdmin();

    const imageBuffer = Buffer.from('non-image-data');
    const file = new File([imageBuffer], 'non-image.pdf', { type: 'image/pdf' });

    const formData = new FormData();
    formData.set('image', file);

    const product = await api.getProduct('brunswick-stoneware-mug');

    const response = await api.request.post(`/api/admin/products/${product.id}/image`, {
      multipart: formData,
    });

    expect(response.status()).toBe(422);
    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('validation_failed');
    expect(body.fieldErrors).toEqual({
      image: ['Upload a jpeg, png, webp file'],
    });
  });

  test('TC-053 | uploading an oversized image is rejected, stating the size limit', async ({ api }) => {
    await api.reset();
    await api.loginAsAdmin();

    const imageBuffer = Buffer.alloc(MAX_IMAGE_BYTES + 1);
    expect(imageBuffer.byteLength).toBeGreaterThan(MAX_IMAGE_BYTES);

    const file = new File([imageBuffer], 'large-image.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('image', file);

    const product = await api.getProduct('brunswick-stoneware-mug');
    const response = await api.request.post(`/api/admin/products/${product.id}/image`, {
      multipart: formData,
    });

    expect(response.status()).toBe(422);
    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('validation_failed');
    expect(body.fieldErrors).toEqual({
      image: ['Images must be 500 KB or smaller (yours is 500 KB)'],
    });
  });

  test('TC-054 | submitting the image upload with no file attached is rejected', async ({ api }) => {
    await api.reset();
    await api.loginAsAdmin();

    const product = await api.getProduct('brunswick-stoneware-mug');
    const response = await api.request.post(`/api/admin/products/${product.id}/image`, {});

    expect(response.status()).toBe(422);
    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('validation_failed');
    expect(body.fieldErrors).toEqual({
      image: ['Choose an image to upload'],
    });
  });
});

test.describe('DELETE /api/admin/products', () => {
  test('TC-046 | a viewer attempting to delete a product receives 403', async ({ api }) => {
    await api.reset();
    await api.loginAsViewer();

    const slug = 'brunswick-stoneware-mug';
    const product = await api.getProduct(slug);

    const response = await api.request.delete(`/api/admin/products/${product.id}`);

    expect(response.status()).toBe(403);
    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('forbidden');
  });

  test('TC-050 | an admin can delete a product', async ({ api }) => {
    await api.reset();
    await api.loginAsAdmin();

    const slug = 'brunswick-stoneware-mug';
    const product = await api.getProduct(slug);

    const deleteResponse = await api.request.delete(`/api/admin/products/${product.id}`);
    expect(deleteResponse.status()).toBe(204);

    const response = await api.request.get(`/api/products/${slug}`);
    expect(response.status()).toBe(404);
    const body = await readJson<ErrorResponse>(response);
    expect(errorResponseSchema.safeParse(body).success).toBe(true);
  });
});

test.describe('GET /api/admin/orders', () => {
  test('TC-055 | a viewer can read the admin order list', async ({ api }) => {
    await api.reset();

    const { orderReferences } = await api.seed({
      orders: [{ items: [{ slug: 'brunswick-stoneware-mug', quantity: 1 }] }],
    });
    await api.loginAsViewer();

    const response = await api.request.get('/api/admin/orders');
    expect(response.status()).toBe(200);
    const body = await readJson<{ items: Array<{ reference: string }> }>(response);
    expect(body.items.some((o) => o.reference === orderReferences[0])).toBe(true);

    const violations = body.items
      .map((item) => ({ item, issues: orderSchema.safeParse(item).error?.issues }))
      .filter(({ issues }) => issues !== undefined);
    expect(violations).toEqual([]);
  });

  test('TC-056 | filtering orders by an unknown status value is a validation error, not silently ignored', async ({
    api,
  }) => {
    await api.reset();
    await api.loginAsViewer();

    const response = await api.request.get('/api/admin/orders?status=invalid-status');
    expect(response.status()).toBe(422);

    const body = await readJson<ErrorResponse>(response);
    expect(body.error).toBe('validation_failed');
    expect(body.fieldErrors).toEqual({
      status: ['\"invalid-status\" is not a valid status'],
    });
  });
});

test.describe('PATCH /api/admin/orders', () => {
  test("TC-060 | a viewer attempting to update an order's status is rejected with 403", async ({ api }) => {
    await api.reset();
    const { orderReferences } = await api.seed({
      orders: [{ items: [{ slug: 'brunswick-stoneware-mug', quantity: 1 }] }],
    });
    await api.loginAsViewer();

    const response = await api.request.get('/api/admin/orders');

    expect(response.status()).toBe(200);
    const body = await readJson<{ items: Array<{ id: string; reference: string }> }>(response);
    const order = body.items.find((o) => o.reference === orderReferences[0]);
    expect(order).toBeDefined();

    const patchResponse = await api.request.patch(`/api/admin/orders/${order?.id}`, {
      data: { status: 'paid' },
    });
    expect(patchResponse.status()).toBe(403);
  });

  test("TC-057 | an admin updates an order's status and the change is reflected on re-fetch", async ({
    api,
  }) => {
    await api.reset();
    const { orderReferences } = await api.seed({
      orders: [{ items: [{ slug: 'brunswick-stoneware-mug', quantity: 1 }] }],
    });
    await api.loginAsAdmin();

    const response = await api.request.get('/api/admin/orders');

    expect(response.status()).toBe(200);
    const body = await readJson<{ items: Array<{ id: string; reference: string; status: string }> }>(
      response,
    );
    const order = body.items.find((o) => o.reference === orderReferences[0]);
    expect(order).toBeDefined();
    expect(order!.status).toBe('placed');

    const patchResponse = await api.request.patch(`/api/admin/orders/${order?.id}`, {
      data: { status: 'paid' },
    });
    expect(patchResponse.status()).toBe(200);

    const updatedResponse = await api.request.get('/api/admin/orders');
    expect(updatedResponse.status()).toBe(200);
    const updatedBody = await readJson<{ items: Array<{ id: string; reference: string; status: string }> }>(
      updatedResponse,
    );
    const updatedOrder = updatedBody.items.find((o) => o.reference === orderReferences[0]);
    expect(updatedOrder).toBeDefined();
    expect(updatedOrder!.status).toBe('paid');
  });
});
