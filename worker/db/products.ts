import { LOW_STOCK_THRESHOLD, type ProductCategory } from '@shared/catalog-seed';
import type { Product, ProductListQuery } from '@shared/schemas';
import { firstRow, rows, scalar } from '../lib/d1';

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  price_cents: number;
  stock: number;
  featured: number;
  rating: number;
  review_count: number;
  material: string;
  dimensions: string;
  summary: string;
  description: string;
  image_path: string;
  image_upload: string | null;
}

export const PRODUCT_COLUMNS = `
  id, slug, name, category, price_cents, stock, featured, rating, review_count,
  material, dimensions, summary, description, image_path, image_upload
`;

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as ProductCategory,
    priceCents: row.price_cents,
    stock: row.stock,
    featured: row.featured === 1,
    rating: row.rating,
    reviewCount: row.review_count,
    material: row.material,
    dimensions: row.dimensions,
    summary: row.summary,
    description: row.description,
    // An uploaded image (admin) always wins over the seeded one.
    imageUrl: row.image_upload ?? row.image_path,
    inStock: row.stock > 0,
    lowStock: row.stock > 0 && row.stock <= LOW_STOCK_THRESHOLD,
  };
}

const SORT_CLAUSES: Record<ProductListQuery['sort'], string> = {
  featured: 'featured DESC, sort_order ASC',
  'price-asc': 'price_cents ASC, name ASC',
  'price-desc': 'price_cents DESC, name ASC',
  'name-asc': 'name ASC',
  'rating-desc': 'rating DESC, review_count DESC',
  'stock-asc': 'stock ASC, name ASC',
  'stock-desc': 'stock DESC, name ASC',
};

interface WhereClause {
  sql: string;
  params: unknown[];
}

/**
 * Build the filter predicate.
 *
 * `includeCategory: false` is used for the category facet counts, which must
 * reflect every *other* active filter but not the category selection itself —
 * otherwise selecting a category collapses the facet list to one entry and the
 * user can never switch to a different one.
 */
function buildWhere(
  sessionId: string,
  query: ProductListQuery,
  { includeCategory }: { includeCategory: boolean },
): WhereClause {
  const conditions = ['session_id = ?'];
  const params: unknown[] = [sessionId];

  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push('(name LIKE ? OR summary LIKE ? OR description LIKE ? OR material LIKE ?)');
    params.push(term, term, term, term);
  }
  if (includeCategory && query.category) {
    conditions.push('category = ?');
    params.push(query.category);
  }
  if (query.minPrice !== undefined) {
    conditions.push('price_cents >= ?');
    params.push(query.minPrice);
  }
  if (query.maxPrice !== undefined) {
    conditions.push('price_cents <= ?');
    params.push(query.maxPrice);
  }
  if (query.inStockOnly) {
    conditions.push('stock > 0');
  }

  return { sql: conditions.join(' AND '), params };
}

export interface ProductListResult {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  categories: Array<{ category: ProductCategory; count: number }>;
  priceRange: { minCents: number; maxCents: number };
}

export async function listProducts(
  db: D1Database,
  sessionId: string,
  query: ProductListQuery,
): Promise<ProductListResult> {
  const filtered = buildWhere(sessionId, query, { includeCategory: true });
  const facetFilter = buildWhere(sessionId, query, { includeCategory: false });
  const offset = (query.page - 1) * query.pageSize;

  const [itemsResult, countResult, facetResult, rangeResult] = await db.batch([
    db
      .prepare(
        `SELECT ${PRODUCT_COLUMNS} FROM products WHERE ${filtered.sql}
         ORDER BY ${SORT_CLAUSES[query.sort]} LIMIT ? OFFSET ?`,
      )
      .bind(...filtered.params, query.pageSize, offset),
    db.prepare(`SELECT COUNT(*) AS total FROM products WHERE ${filtered.sql}`).bind(...filtered.params),
    db
      .prepare(
        `SELECT category, COUNT(*) AS count FROM products WHERE ${facetFilter.sql}
         GROUP BY category ORDER BY category`,
      )
      .bind(...facetFilter.params),
    db
      .prepare(
        'SELECT MIN(price_cents) AS min_cents, MAX(price_cents) AS max_cents FROM products WHERE session_id = ?',
      )
      .bind(sessionId),
  ]);

  const total = scalar(countResult, 'total', 0);
  const range = firstRow<{ min_cents: number | null; max_cents: number | null }>(rangeResult);

  return {
    items: rows<ProductRow>(itemsResult).map(toProduct),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
    categories: rows<{ category: string; count: number }>(facetResult).map((row) => ({
      category: row.category as ProductCategory,
      count: row.count,
    })),
    priceRange: { minCents: range?.min_cents ?? 0, maxCents: range?.max_cents ?? 0 },
  };
}

export async function getProductBySlug(
  db: D1Database,
  sessionId: string,
  slug: string,
): Promise<Product | null> {
  const row = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE session_id = ? AND slug = ?`)
    .bind(sessionId, slug)
    .first<ProductRow>();
  return row ? toProduct(row) : null;
}

export async function getProductById(db: D1Database, sessionId: string, id: string): Promise<Product | null> {
  const row = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE session_id = ? AND id = ?`)
    .bind(sessionId, id)
    .first<ProductRow>();
  return row ? toProduct(row) : null;
}

export async function getFeaturedProducts(
  db: D1Database,
  sessionId: string,
  limit: number,
): Promise<Product[]> {
  const result = await db
    .prepare(
      `SELECT ${PRODUCT_COLUMNS} FROM products WHERE session_id = ? AND featured = 1
       ORDER BY sort_order ASC LIMIT ?`,
    )
    .bind(sessionId, limit)
    .all<ProductRow>();
  return result.results.map(toProduct);
}
