import { useEffect, useState } from 'react';

/**
 * Search input debounce.
 *
 * Exported so the test suite can document the delay it is dealing with. Tests
 * must never *wait* this long — the correct handling is a web-first assertion
 * on the resulting UI, which passes as soon as the debounce settles regardless
 * of the exact timing.
 */
export const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, delayMs: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
