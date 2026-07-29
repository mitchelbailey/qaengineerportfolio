import type { User } from '@shared/schemas';

/** Hono generics used by every route file in this Worker. */
export interface AppEnv {
  Bindings: Env;
  Variables: {
    /** Data-isolation session id. Set by the session middleware on every request. */
    sessionId: string;
    /** Authenticated admin/viewer, when a valid auth cookie was presented. */
    user: User | null;
  };
}
