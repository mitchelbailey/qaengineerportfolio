import { z } from 'zod';
import { PRODUCT_CATEGORIES } from './catalog-seed';
import { ORDER_STATUSES } from './order-status';

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

export const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;
export type AuState = (typeof AU_STATES)[number];

export const ORDER_REFERENCE_PATTERN = /^YC-[A-Z0-9]{6}$/;

const idSchema = z.uuid();
const centsSchema = z.int().nonnegative();

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

export const PRODUCT_SORT_OPTIONS = [
  'featured',
  'price-asc',
  'price-desc',
  'name-asc',
  'rating-desc',
  'stock-asc',
  'stock-desc',
] as const;
export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];

export const MAX_PAGE_SIZE = 48;

/**
 * Query params arrive as strings, so everything here coerces. Invalid values are
 * a 400 rather than a silent fallback: a filter that quietly ignores garbage is
 * indistinguishable from a filter that is broken.
 */
export const productListQuerySchema = z
  .object({
    search: z.string().trim().max(80).optional(),
    category: z.enum(PRODUCT_CATEGORIES).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    sort: z.enum(PRODUCT_SORT_OPTIONS).default('featured'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(12),
    inStockOnly: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
    message: 'Minimum price cannot be greater than maximum price',
    path: ['minPrice'],
  });
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const MAX_CART_QUANTITY = 20;

export const addCartItemSchema = z.object({
  productId: idSchema,
  quantity: z.int().min(1).max(MAX_CART_QUANTITY).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.int().min(1).max(MAX_CART_QUANTITY),
});

export const applyPromoSchema = z.object({
  code: z.string().trim().min(1, 'Enter a promo code').max(32),
});

export const shippingMethodSchema = z.enum(['standard', 'express']);

export const shippingMethodUpdateSchema = z.object({ method: shippingMethodSchema });

export const addressSchema = z.object({
  line1: z.string().trim().min(1, 'Street address is required').max(120),
  line2: z.string().trim().max(120).optional().or(z.literal('')),
  suburb: z.string().trim().min(1, 'Suburb is required').max(80),
  state: z.enum(AU_STATES, { error: 'Select a state' }),
  postcode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Postcode must be 4 digits'),
});
export type Address = z.infer<typeof addressSchema>;

export const customerSchema = z.object({
  email: z.email('Enter a valid email address'),
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  phone: z
    .string()
    .trim()
    .regex(/^0[2-478]\d{8}$/, 'Enter a valid Australian phone number')
    .optional()
    .or(z.literal('')),
});

export const paymentSchema = z.object({
  cardName: z.string().trim().min(1, 'Name on card is required').max(80),
  cardNumber: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^\d{16}$/, 'Card number must be 16 digits')),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY'),
  cvc: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, 'CVC must be 3 or 4 digits'),
});

export const checkoutSchema = z.object({
  customer: customerSchema,
  shippingAddress: addressSchema,
  shippingMethod: shippingMethodSchema,
  payment: paymentSchema,
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(200),
});

/**
 * Field definitions with NO defaults attached.
 *
 * Defaults are applied only by the create schema below. This split exists
 * because of a defect found while building: `.partial()` does not suppress
 * `.default()`, so a PATCH carrying only `{ priceCents }` still parsed as
 * `{ priceCents, featured: false, material: '', dimensions: '' }` and silently
 * erased three fields the caller never mentioned. See
 * docs/06-defect-reports/DEF-001-patch-defaults-erase-fields.md.
 */
const productFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain lowercase letters, numbers and hyphens')
    .max(120),
  category: z.enum(PRODUCT_CATEGORIES),
  priceCents: z.int().min(1, 'Price must be more than zero').max(1_000_000),
  stock: z.int().min(0).max(9_999),
  featured: z.boolean(),
  summary: z.string().trim().min(1, 'Summary is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(4_000),
  material: z.string().trim().max(120),
  dimensions: z.string().trim().max(120),
};

/** Create: defaults fill in the fields a caller may legitimately omit. */
export const adminProductInputSchema = z.object({
  ...productFields,
  featured: productFields.featured.default(false),
  material: productFields.material.default(''),
  dimensions: productFields.dimensions.default(''),
});
export type AdminProductInput = z.infer<typeof adminProductInputSchema>;

/** Update: every field optional, and an absent field means "leave it alone". */
export const adminProductUpdateSchema = z.object(productFields).partial();
export type AdminProductUpdate = z.infer<typeof adminProductUpdateSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

/* -------------------------------------------------------------------------- */
/* Responses                                                                   */
/*                                                                            */
/* Exported so the API suite can assert the *shape* of every payload, not just */
/* a couple of hand-picked fields. A response that gains, loses or retypes a   */
/* field fails a contract test instead of silently breaking the UI.           */
/* -------------------------------------------------------------------------- */

export const productSchema = z.object({
  id: idSchema,
  slug: z.string(),
  name: z.string(),
  category: z.enum(PRODUCT_CATEGORIES),
  priceCents: centsSchema,
  stock: z.int().nonnegative(),
  featured: z.boolean(),
  rating: z.number().min(0).max(5),
  reviewCount: z.int().nonnegative(),
  material: z.string(),
  dimensions: z.string(),
  summary: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  inStock: z.boolean(),
  lowStock: z.boolean(),
});
export type Product = z.infer<typeof productSchema>;

export const productListResponseSchema = z.object({
  items: z.array(productSchema),
  page: z.int().min(1),
  pageSize: z.int().min(1),
  total: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
  categories: z.array(z.object({ category: z.enum(PRODUCT_CATEGORIES), count: z.int().nonnegative() })),
  priceRange: z.object({ minCents: centsSchema, maxCents: centsSchema }),
});
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const cartItemSchema = z.object({
  id: idSchema,
  productId: idSchema,
  slug: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  unitPriceCents: centsSchema,
  quantity: z.int().min(1),
  lineTotalCents: centsSchema,
  availableStock: z.int().nonnegative(),
});

export const cartTotalsSchema = z.object({
  itemCount: z.int().nonnegative(),
  subtotalCents: centsSchema,
  discountCents: centsSchema,
  shippingCents: centsSchema,
  totalCents: centsSchema,
  gstCents: centsSchema,
  appliedPromoCode: z.string().nullable(),
});

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  totals: cartTotalsSchema,
  promoCode: z.string().nullable(),
  shippingMethod: shippingMethodSchema,
  freeShippingThresholdCents: centsSchema,
  amountUntilFreeShippingCents: centsSchema,
});
export type Cart = z.infer<typeof cartSchema>;

export const orderItemSchema = z.object({
  id: idSchema,
  productId: idSchema,
  slug: z.string(),
  name: z.string(),
  unitPriceCents: centsSchema,
  quantity: z.int().min(1),
  lineTotalCents: centsSchema,
});

export const orderSchema = z.object({
  id: idSchema,
  reference: z.string().regex(ORDER_REFERENCE_PATTERN),
  status: z.enum(ORDER_STATUSES),
  placedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  customer: z.object({
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable(),
  }),
  shippingAddress: addressSchema.extend({ line2: z.string().nullable() }),
  shippingMethod: shippingMethodSchema,
  items: z.array(orderItemSchema),
  totals: cartTotalsSchema,
  cardLast4: z.string().regex(/^\d{4}$/),
});
export type Order = z.infer<typeof orderSchema>;

export const userSchema = z.object({
  id: idSchema,
  email: z.email(),
  name: z.string(),
  role: z.enum(['admin', 'viewer']),
});
export type User = z.infer<typeof userSchema>;

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  /** Present on 422 responses: field path -> messages. */
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
