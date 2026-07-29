import type { User } from '@shared/schemas';
import type { TokenFailure } from './auth/token';

/** Hono generics used by every route file in this Worker. */
export interface AppEnv {
  Bindings: Env;
  Variables: {
    /** Data-isolation session id. Set by the session middleware on every request. */
    sessionId: string;
    /** Authenticated admin/viewer, when a valid auth cookie was presented. */
    user: User | null;
    /**
     * Why authentication failed, when a cookie was presented but rejected.
     * Null when no cookie was sent at all.
     *
     * This is what lets the client tell "your session expired" apart from "you
     * were never signed in" *after a page reload*, when no client-side state
     * survives to infer it from.
     */
    authFailure: TokenFailure | null;
  };
}
