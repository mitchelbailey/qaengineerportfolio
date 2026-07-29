import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';

export type FieldErrors = Record<string, string[]>;

/**
 * Every failure the API returns deliberately is an ApiError, so error responses
 * have one consistent shape: `{ error, message, fieldErrors? }`. The API suite
 * asserts against that shape, which is only worth doing if it never varies.
 */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code = 'bad_request'): ApiError {
    return new ApiError(400, code, message);
  }

  static unauthorised(message = 'You must be signed in to do that'): ApiError {
    return new ApiError(401, 'unauthorized', message);
  }

  static forbidden(message = 'Your account does not have permission to do that'): ApiError {
    return new ApiError(403, 'forbidden', message);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, 'not_found', message);
  }

  /** Business-rule conflicts: illegal status transitions, duplicate slugs, stock races. */
  static conflict(message: string, code = 'conflict'): ApiError {
    return new ApiError(409, code, message);
  }

  static validation(message: string, fieldErrors: FieldErrors): ApiError {
    return new ApiError(422, 'validation_failed', message, fieldErrors);
  }
}

/**
 * Flatten a Zod issue list into `{ "customer.email": ["Enter a valid email address"] }`.
 * Dotted paths let the React form map server errors straight onto fields.
 */
function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : '_';
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** Parse input against a schema, or throw a 422 carrying per-field messages. */
export function parseOrThrow<Schema extends z.ZodType>(schema: Schema, data: unknown): z.output<Schema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw ApiError.validation('The submitted data is not valid', toFieldErrors(result.error));
  }
  return result.data;
}

/** Read and parse a JSON body, turning malformed JSON into a clean 400. */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.output<Schema>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw ApiError.badRequest('Request body must be valid JSON', 'invalid_json');
  }
  return parseOrThrow(schema, body);
}
