import type { AdminProductInput, AdminProductUpdate, Product } from '@shared/schemas';
import { ApiError } from '../lib/http';
import { getProductById, PRODUCT_COLUMNS, toProduct, type ProductRow } from './products';

async function assertSlugAvailable(
  db: D1Database,
  sessionId: string,
  slug: string,
  exceptId?: string,
): Promise<void> {
  const clash = await db
    .prepare('SELECT id FROM products WHERE session_id = ? AND slug = ? AND id IS NOT ?')
    .bind(sessionId, slug, exceptId ?? null)
    .first<{ id: string }>();

  if (clash) {
    throw ApiError.conflict(`The slug "${slug}" is already used by another product`, 'duplicate_slug');
  }
}

export async function createProduct(
  db: D1Database,
  sessionId: string,
  input: AdminProductInput,
): Promise<Product> {
  await assertSlugAvailable(db, sessionId, input.slug);

  const id = crypto.randomUUID();
  const now = Date.now();

  // New products sort to the front of the admin list.
  const lowest = await db
    .prepare('SELECT MIN(sort_order) AS lowest FROM products WHERE session_id = ?')
    .bind(sessionId)
    .first<{ lowest: number | null }>();

  await db
    .prepare(
      `INSERT INTO products (
         session_id, id, slug, name, category, price_cents, stock, featured, rating,
         review_count, material, dimensions, summary, description, image_path,
         sort_order, created_at, updated_at
       ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,0,0,?9,?10,?11,?12,?13,?14,?15,?15)`,
    )
    .bind(
      sessionId,
      id,
      input.slug,
      input.name,
      input.category,
      input.priceCents,
      input.stock,
      input.featured ? 1 : 0,
      input.material,
      input.dimensions,
      input.summary,
      input.description,
      `/products/${input.slug}.webp`,
      (lowest?.lowest ?? 0) - 1,
      now,
    )
    .run();

  const created = await getProductById(db, sessionId, id);
  if (!created) throw new Error('Product was written but could not be read back');
  return created;
}

const UPDATABLE_COLUMNS: Record<keyof AdminProductUpdate, string> = {
  name: 'name',
  slug: 'slug',
  category: 'category',
  priceCents: 'price_cents',
  stock: 'stock',
  featured: 'featured',
  summary: 'summary',
  description: 'description',
  material: 'material',
  dimensions: 'dimensions',
};

export async function updateProduct(
  db: D1Database,
  sessionId: string,
  id: string,
  input: AdminProductUpdate,
): Promise<Product> {
  const existing = await getProductById(db, sessionId, id);
  if (!existing) throw ApiError.notFound('That product does not exist');

  if (input.slug !== undefined && input.slug !== existing.slug) {
    await assertSlugAvailable(db, sessionId, input.slug, id);
  }

  const assignments: string[] = [];
  const params: unknown[] = [];

  // Only keys the caller actually sent are written. An absent key means "leave
  // it alone", never "reset it to a default" — see DEF-001.
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS) as Array<[keyof AdminProductUpdate, string]>) {
    const value = input[key];
    if (value === undefined) continue;
    assignments.push(`${column} = ?`);
    params.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
  }

  if (assignments.length === 0) {
    throw ApiError.badRequest('No fields to update', 'empty_update');
  }

  assignments.push('updated_at = ?');
  params.push(Date.now(), sessionId, id);

  await db
    .prepare(`UPDATE products SET ${assignments.join(', ')} WHERE session_id = ? AND id = ?`)
    .bind(...params)
    .run();

  const updated = await getProductById(db, sessionId, id);
  if (!updated) throw new Error('Product disappeared during update');
  return updated;
}

/**
 * Deleting a product also drops it from the cart.
 *
 * Without this the cart join silently hides the line while the row lingers,
 * and the item reappears the moment an admin recreates the same id.
 */
export async function deleteProduct(db: D1Database, sessionId: string, id: string): Promise<void> {
  const existing = await db
    .prepare('SELECT id FROM products WHERE session_id = ? AND id = ?')
    .bind(sessionId, id)
    .first<{ id: string }>();
  if (!existing) throw ApiError.notFound('That product does not exist');

  await db.batch([
    db.prepare('DELETE FROM cart_items WHERE session_id = ? AND product_id = ?').bind(sessionId, id),
    db.prepare('DELETE FROM products WHERE session_id = ? AND id = ?').bind(sessionId, id),
  ]);
}

export async function setProductImage(
  db: D1Database,
  sessionId: string,
  id: string,
  dataUrl: string,
): Promise<Product> {
  const result = await db
    .prepare('UPDATE products SET image_upload = ?, updated_at = ? WHERE session_id = ? AND id = ?')
    .bind(dataUrl, Date.now(), sessionId, id)
    .run();

  if (result.meta.changes === 0) throw ApiError.notFound('That product does not exist');

  const updated = await getProductById(db, sessionId, id);
  if (!updated) throw new Error('Product disappeared during image upload');
  return updated;
}

/** Admin listing: every product, newest edits first, no storefront filtering. */
export async function listAllProducts(
  db: D1Database,
  sessionId: string,
): Promise<Product[]> {
  const result = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE session_id = ? ORDER BY sort_order ASC`)
    .bind(sessionId)
    .all<ProductRow>();
  return result.results.map(toProduct);
}
