import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootLayout } from '@/components/layout/RootLayout';
import { Home } from '@/routes/Home';
import { Products } from '@/routes/Products';
import { ProductDetail } from '@/routes/ProductDetail';
import { Cart } from '@/routes/Cart';
import { Checkout } from '@/routes/Checkout';
import { OrderConfirmation } from '@/routes/OrderConfirmation';
import { NotFound } from '@/routes/NotFound';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // One retry so a genuine network blip self-heals, but not so many that
      // error-state tests have to wait through an exponential backoff.
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: 'products', Component: Products },
      { path: 'products/:slug', Component: ProductDetail },
      { path: 'cart', Component: Cart },
      { path: 'checkout', Component: Checkout },
      { path: 'order/:reference', Component: OrderConfirmation },
      { path: '*', Component: NotFound },
    ],
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
