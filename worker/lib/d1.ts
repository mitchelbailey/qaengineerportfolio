/**
 * Helpers for reading `db.batch()` results.
 *
 * `noUncheckedIndexedAccess` is on, so every index into a batch result array is
 * `T | undefined`. Rather than scattering non-null assertions through the query
 * layer — which is how a real "cannot read property of undefined" eventually
 * ships — the uncertainty is handled once, here.
 */

export function rows<T>(result: D1Result | undefined): T[] {
  return (result?.results ?? []) as T[];
}

export function firstRow<T>(result: D1Result | undefined): T | undefined {
  return rows<T>(result)[0];
}

/** Read a single aggregate column, e.g. `SELECT COUNT(*) AS total`. */
export function scalar<T>(result: D1Result | undefined, column: string, fallback: T): T {
  const row = firstRow<Record<string, unknown>>(result);
  const value = row?.[column];
  return value === undefined || value === null ? fallback : (value as T);
}
