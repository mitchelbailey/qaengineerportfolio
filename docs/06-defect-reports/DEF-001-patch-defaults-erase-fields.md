# DEF-001 — Partial product update silently erases fields the caller did not send

|                  |                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Reported**     | 2026-07-28                                                                                |
| **Reported by**  | Mitchel Bailey                                                                            |
| **Component**    | API — `PATCH /api/admin/products/:id`                                                     |
| **Severity**     | **S1 — Major** (silent data loss, no error surfaced)                                      |
| **Priority**     | **P1** (fix before the admin UI is built on top of it)                                    |
| **Status**       | Closed — fixed and covered by a regression test                                           |
| **Found during** | API smoke exercise of the phase 2 endpoints                                               |
| **Environment**  | Local dev, `npm run dev`, Node 24.18.0, Vite 8.1.5 + `@cloudflare/vite-plugin`, Zod 4.4.3 |

## Summary

A partial update carrying a single field silently reset `featured`, `material`
and `dimensions` to their default values. No error was returned; the endpoint
responded `200 OK` with a body that looked correct for the field that _was_
sent, which is what makes this hard to spot from the client side.

Separately, an update with an empty body `{}` was accepted with `200 OK` instead
of being rejected.

## Steps to reproduce

1. Sign in as `admin@yarra.test`.
2. Note the current values of a seeded product:
   `GET /api/products/abbotsford-cast-iron-skillet`
3. Send a price-only update:
   `PATCH /api/admin/products/:id` with body `{ "priceCents": 13900 }`
4. Re-read the product: `GET /api/products/abbotsford-cast-iron-skillet`

## Expected result

Only `priceCents` changes. `featured`, `material` and `dimensions` retain their
existing values, because the caller did not mention them.

## Actual result

```
BEFORE  featured=true   material='Sand-cast iron, pre-seasoned'  dimensions='26 cm · 2.4 kg'  price=12900
PATCH   status=200      body sent = { priceCents: 13900 }
AFTER   featured=false  material=''                             dimensions=''                price=13900
```

Three fields were erased. The response status was `200 OK` and no warning was
given.

Additionally: `PATCH` with body `{}` returned `200 OK`. Expected `400
empty_update`.

## Root cause

The update schema was derived from the create schema with `.partial()`:

```ts
adminProductInputSchema.partial(); // the defect
```

The create schema legitimately carries defaults for the optional-on-create
fields:

```ts
featured:   z.boolean().default(false),
material:   z.string().trim().max(120).default(''),
dimensions: z.string().trim().max(120).default(''),
```

The assumption was that `.partial()` makes a field optional and therefore stops
the default from firing. It does not — in Zod 4 the default is still applied
when the key is absent. Verified directly:

```js
const partial = z
  .object({
    name: z.string(),
    featured: z.boolean().default(false),
    material: z.string().default(''),
    priceCents: z.int(),
  })
  .partial();

partial.parse({}); // => { featured: false, material: '' }
partial.parse({ priceCents: 6500 }); // => { featured: false, material: '', priceCents: 6500 }
```

Because the parsed object then contained those keys, the SQL builder in
`updateProduct` treated them as fields the caller wanted written, and generated
`SET featured = 0, material = '', dimensions = '', price_cents = 13900`.

The empty-body case has the same cause: `{}` parsed into three defaulted keys,
so the `assignments.length === 0` guard that should have produced `400
empty_update` never triggered.

## Fix

`shared/schemas.ts` — field definitions were split out without defaults, and
defaults are now attached only by the create schema:

```ts
const productFields = {/* …no .default() anywhere… */};

export const adminProductInputSchema = z.object({
  ...productFields,
  featured: productFields.featured.default(false),
  material: productFields.material.default(''),
  dimensions: productFields.dimensions.default(''),
});

export const adminProductUpdateSchema = z.object(productFields).partial();
```

`worker/routes/admin.ts` now parses `PATCH` bodies with
`adminProductUpdateSchema`.

## Regression coverage

Automated in the API suite (see `docs/05-traceability-matrix.md`):

- **TC-042** — a price-only `PATCH` leaves `featured`, `material` and
  `dimensions` untouched.
- **TC-043** — `PATCH` with an empty body returns `400 empty_update`.

## Notes for review

This is worth flagging beyond the immediate fix. The pattern
`createSchema.partial()` for an update endpoint is extremely common, reads as
obviously correct, and is wrong wherever the create schema carries defaults. Any
other endpoint in a codebase following that pattern deserves the same check.

The defect is also invisible to a UI click-through test: the admin edit form
submits every field, so the form-driven path always sends `material` and
`dimensions` and never reproduces it. It only appears when the API is exercised
directly — which is the argument for having an API-level suite at all, rather
than driving everything through the browser.
