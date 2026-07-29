export type FieldErrors = Record<string, string[]>;

/**
 * Mirrors the API's single error shape: `{ error, message, fieldErrors? }`.
 *
 * Carrying the machine-readable `code` alongside the human message matters —
 * the UI branches on codes like `insufficient_stock` and `promo_expired`, and
 * branching on message text is how copy edits break behaviour.
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Serialised as JSON with the right content type. */
  json?: unknown;
  body?: BodyInit;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  let body = rest.body;

  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const response = await fetch(path, { ...rest, body, headers: requestHeaders });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiRequestError(response.status, 'invalid_response', 'The server returned an unreadable response');
    }
  }

  if (!response.ok) {
    const error = payload as { error?: string; message?: string; fieldErrors?: FieldErrors } | null;
    throw new ApiRequestError(
      response.status,
      error?.error ?? 'unknown_error',
      error?.message ?? 'Something went wrong',
      error?.fieldErrors,
    );
  }

  return payload as T;
}

/** Turn a query object into a search string, dropping empty values. */
export function toSearchParams(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const serialised = search.toString();
  return serialised ? `?${serialised}` : '';
}
