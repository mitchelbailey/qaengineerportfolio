import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { sessionQuery } from '@/lib/queries';
import { ApiRequestError } from '@/lib/api';
import { useLogout } from '@/lib/admin-queries';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';

const adminNav = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
];

/**
 * Route guard and chrome for the admin area.
 *
 * An unauthenticated visitor is redirected to sign in, carrying the route they
 * were trying to reach. The redirect also distinguishes "you were never signed
 * in" from "your session expired" — the second is a different message for the
 * user, and it is reproducible on demand via POST /api/test/session/expire
 * rather than by waiting out the 30-minute token.
 */
export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useQuery(sessionQuery());
  const logout = useLogout();

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    // The server tells us *why* the request was unauthenticated, so this still
    // works after a hard refresh, when no client-side state survives.
    const expired = error instanceof ApiRequestError && error.code === 'session_expired';
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search, ...(expired ? { reason: 'expired' } : {}) }}
      />
    );
  }

  const { user } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl">Admin</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Signed in as <span className="text-fg">{user.name}</span>
          </p>
        </div>

        <Badge tone={user.role === 'admin' ? 'accent' : 'neutral'}>
          {user.role === 'admin' ? 'Full access' : 'Read only'}
        </Badge>

        <button
          type="button"
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => void navigate('/admin/login', { replace: true }),
            })
          }
          className="ml-auto text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Sign out
        </button>
      </div>

      <nav aria-label="Admin sections" className="mt-6">
        <ul className="flex gap-1">
          {adminNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent-subtle text-accent' : 'text-fg-muted hover:text-fg',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {user.role === 'viewer' ? (
        <p
          data-testid="viewer-notice"
          className="mt-6 rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-fg-muted"
        >
          You have read-only access. Editing controls are hidden, and the API rejects writes from this
          account.
        </p>
      ) : null}

      <div className="mt-8">
        <Outlet context={{ user }} />
      </div>
    </div>
  );
}
