import { queryOptions, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import type { ShippingMethod } from '@shared/cart-math';
import type { Cart, CheckoutInput, Order, Product, User } from '@shared/schemas';
import { apiFetch, toSearchParams, type ApiRequestError } from './api';

export interface ProductListParams {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  categories: Array<{ category: string; count: number }>;
  priceRange: { minCents: number; maxCents: number };
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  body: string;
  postedAt: string;
}

/**
 * Query keys in one place, so a cache invalidation can never silently miss a
 * key because two call sites spelled it differently.
 */
export const queryKeys = {
  products: (params: ProductListParams) => ['products', params] as const,
  featured: () => ['products', 'featured'] as const,
  product: (slug: string) => ['product', slug] as const,
  reviews: (slug: string) => ['reviews', slug] as const,
  cart: () => ['cart'] as const,
  order: (reference: string) => ['order', reference] as const,
  session: () => ['session'] as const,
};

export const productsQuery = (params: ProductListParams) =>
  queryOptions({
    queryKey: queryKeys.products(params),
    queryFn: () => apiFetch<ProductListResponse>(`/api/products${toSearchParams({ ...params })}`),
    // Keeps the previous page on screen while the next one loads, so the grid
    // does not collapse to zero height and bounce the scroll position.
    placeholderData: (previous) => previous,
  });

export const featuredProductsQuery = () =>
  queryOptions({
    queryKey: queryKeys.featured(),
    queryFn: () => apiFetch<{ items: Product[] }>('/api/products/featured'),
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.product(slug),
    queryFn: () => apiFetch<Product>(`/api/products/${slug}`),
    retry: false,
  });

export const reviewsQuery = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.reviews(slug),
    queryFn: () => apiFetch<{ slug: string; reviews: Review[] }>(`/api/reviews/${slug}`),
    // The reviews service is deliberately unreliable. One retry, then show the
    // error state — the rest of the page must not depend on it.
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

export const cartQuery = () =>
  queryOptions({
    queryKey: queryKeys.cart(),
    queryFn: () => apiFetch<Cart>('/api/cart'),
  });

export const orderQuery = (reference: string) =>
  queryOptions({
    queryKey: queryKeys.order(reference),
    queryFn: () => apiFetch<Order>(`/api/orders/${reference}`),
    retry: false,
  });

export const sessionQuery = () =>
  queryOptions({
    queryKey: queryKeys.session(),
    queryFn: () => apiFetch<{ user: User }>('/api/auth/me'),
    retry: false,
  });

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every cart mutation responds with the whole cart, so the result is written
 * straight into the cache. No refetch round-trip, and no chance of the header
 * badge disagreeing with the cart page.
 */
function useCartMutation<Variables>(
  mutationFn: (variables: Variables) => Promise<Cart>,
  options?: Omit<UseMutationOptions<Cart, ApiRequestError, Variables>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  return useMutation<Cart, ApiRequestError, Variables>({
    mutationFn,
    ...options,
    // Rest args rather than a fixed arity: TanStack has changed the number of
    // callback parameters between minor versions, and forwarding blindly means
    // this wrapper does not need to care.
    onSuccess: (...args) => {
      queryClient.setQueryData(queryKeys.cart(), args[0]);
      void options?.onSuccess?.(...args);
    },
  });
}

export const useAddToCart = () =>
  useCartMutation<{ productId: string; quantity: number }>((variables) =>
    apiFetch<Cart>('/api/cart/items', { method: 'POST', json: variables }),
  );

export const useUpdateCartItem = () =>
  useCartMutation<{ itemId: string; quantity: number }>(({ itemId, quantity }) =>
    apiFetch<Cart>(`/api/cart/items/${itemId}`, { method: 'PATCH', json: { quantity } }),
  );

export const useRemoveCartItem = () =>
  useCartMutation<{ itemId: string }>(({ itemId }) =>
    apiFetch<Cart>(`/api/cart/items/${itemId}`, { method: 'DELETE' }),
  );

export const useApplyPromo = () =>
  useCartMutation<{ code: string }>((variables) =>
    apiFetch<Cart>('/api/cart/promo', { method: 'PUT', json: variables }),
  );

export const useRemovePromo = () =>
  useCartMutation<void>(() => apiFetch<Cart>('/api/cart/promo', { method: 'DELETE' }));

export const useSetShippingMethod = () =>
  useCartMutation<{ method: ShippingMethod }>((variables) =>
    apiFetch<Cart>('/api/cart/shipping-method', { method: 'PUT', json: variables }),
  );

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation<Order, ApiRequestError, CheckoutInput>({
    mutationFn: (input) => apiFetch<Order>('/api/orders', { method: 'POST', json: input }),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(order.reference), order);
      // Stock changed and the cart was emptied server-side.
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}
