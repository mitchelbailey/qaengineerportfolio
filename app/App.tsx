import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootLayout } from '@/components/layout/RootLayout';
import { Home } from '@/routes/Home';
import { NotFound } from '@/routes/NotFound';
import { ThemeProvider } from '@/lib/theme';

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
      { path: '*', Component: NotFound },
    ],
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
