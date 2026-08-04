import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderStatus } from '@shared/order-status';
import type { AdminProductInput, AdminProductUpdate, Order, Product, User } from '@shared/schemas';
import { apiFetch, toSearchParams, type ApiRequestError } from './api';
import { queryKeys } from './queries';

export const adminKeys = {
  products: () => ['admin', 'products'] as const,
  orders: (params: AdminOrderParams) => ['admin', 'orders', params] as const,
};

export interface AdminOrderParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminOrderListResponse {
  items: Order[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const adminProductsQuery = () =>
  queryOptions({
    queryKey: adminKeys.products(),
    queryFn: () => apiFetch<{ items: Product[]; total: number }>('/api/admin/products'),
    retry: false,
  });

export const adminOrdersQuery = (params: AdminOrderParams) =>
  queryOptions({
    queryKey: adminKeys.orders(params),
    queryFn: () => apiFetch<AdminOrderListResponse>(`/api/admin/orders${toSearchParams({ ...params })}`),
    retry: false,
    placeholderData: (previous) => previous,
  });

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<{ user: User }, ApiRequestError, { email: string; password: string }>({
    mutationFn: (credentials) => apiFetch('/api/auth/login', { method: 'POST', json: credentials }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.session(), data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, ApiRequestError, void>({
    mutationFn: () => apiFetch('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      // Drop everything scoped to the signed-in user rather than just the
      // session query, so a subsequent sign-in never renders the previous
      // user's cached admin data.
      queryClient.removeQueries({ queryKey: queryKeys.session() });
      queryClient.removeQueries({ queryKey: ['admin'] });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Product mutations                                                           */
/* -------------------------------------------------------------------------- */

function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    // The storefront reads the same rows, so its caches are stale too.
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['product'] });
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation<Product, ApiRequestError, AdminProductInput>({
    mutationFn: (input) => apiFetch('/api/admin/products', { method: 'POST', json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation<Product, ApiRequestError, { id: string; input: AdminProductUpdate }>({
    mutationFn: ({ id, input }) => apiFetch(`/api/admin/products/${id}`, { method: 'PATCH', json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateCatalog();
  const queryClient = useQueryClient();
  return useMutation<void, ApiRequestError, { id: string }>({
    mutationFn: ({ id }) => apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      // Deleting a product also drops it from carts server-side.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
  });
}

export function useUploadProductImage() {
  const invalidate = useInvalidateCatalog();
  return useMutation<Product, ApiRequestError, { id: string; file: File }>({
    mutationFn: ({ id, file }) => {
      const body = new FormData();
      body.set('image', file);
      // No Content-Type header: the browser must set the multipart boundary.
      return apiFetch(`/api/admin/products/${id}/image`, { method: 'POST', body });
    },
    onSuccess: invalidate,
  });
}

/* -------------------------------------------------------------------------- */
/* Order mutations                                                             */
/* -------------------------------------------------------------------------- */

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation<Order, ApiRequestError, { id: string; status: OrderStatus }>({
    mutationFn: ({ id, status }) =>
      apiFetch(`/api/admin/orders/${id}`, { method: 'PATCH', json: { status } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      // Cancelling or refunding returns stock to the catalog.
      void queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}
