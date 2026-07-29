import { useOutletContext } from 'react-router';
import type { User } from '@shared/schemas';

/**
 * The signed-in staff member, provided by AdminLayout via route context.
 *
 * Reading the user from the guarded layout rather than re-querying means a
 * child route cannot render before the guard has decided, so there is no window
 * where admin-only controls flash on screen for a viewer.
 */
export function useAdminUser(): User {
  return useOutletContext<{ user: User }>().user;
}
