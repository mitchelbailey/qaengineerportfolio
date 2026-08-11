# Traceability matrix

Requirement → test case → implementing spec → status. Read alongside
[doc 03 — test cases](03-test-cases.md), which holds each case's preconditions and
expected results.

Every ID here appears verbatim in a test title, so a row in this table can be traced
to a live result in the
[published report](https://mitchelbailey.github.io/qaengineerportfolio/) and back
again.

**Coverage summary**

|                                           | Count                                     |
| ----------------------------------------- | ----------------------------------------- |
| Requirements                              | 29                                        |
| Fully Covered                             | 28                                        |
| Partially Covered                         | 1 (REQ-05 / DEF-004)                      |
| Automated cases                           | 78 (`TC` × 64, `VIS` × 14)                |
| Active                                    | 77                                        |
| Skipped pending a defect                  | 1 (`TC-022` → DEF-004)                    |
| Executions per CI run                     | 144 (E2E cases run on 4 browser projects) |
| Unit/component tests (untraced by design) | 22                                        |

Requirements: 29
Fully covered: 28
Partially covered: 1 (REQ-05 / DEF-004)
---

## 1. Product catalogue and browsing

| Req        | Requirement                                                                   | Cases                  | Specs                                                           | Status                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-01** | The catalogue exposes products over a documented, versioned JSON contract     | TC-001, TC-008         | `api/example-products.spec.ts`                                  | ✅ Covered                                                                                                                               |
| **REQ-02** | The seed catalogue contains 24 products across 5 categories                   | TC-002, TC-005         | `api/example-products.spec.ts`                                  | ✅ Covered                                                                                                                               |
| **REQ-03** | Customers can search products by keyword, with an accurate result count       | TC-020                 | `e2e/products-browsing.spec.ts`                                 | ✅ Covered                                                                                                                               |
| **REQ-04** | Customers can filter by category, and facet counts stay useful while filtered | TC-021, TC-005         | `e2e/products-browsing.spec.ts`, `api/example-products.spec.ts` | ✅ Covered                                                                                                                               |
| **REQ-05** | Customers can filter by price range and stock availability, in combination    | TC-004, **TC-022**     | `api/example-products.spec.ts`, `e2e/products-browsing.spec.ts` | ⚠️ **Partial** — API boundary covered; UI combination blocked by [DEF-004](05-defect-reports/DEF-004-instock-filter-checkbox-reverts.md) |
| **REQ-06** | Customers can sort results, and sorting applies to the whole result set       | TC-006, TC-024         | `api/example-products.spec.ts`, `e2e/products-browsing.spec.ts` | ✅ Covered                                                                                                                               |
| **REQ-07** | Results paginate, with a bounded page size                                    | TC-003, TC-026, TC-042 | `api/example-products.spec.ts`, `e2e/products-browsing.spec.ts` | ✅ Covered                                                                                                                               |
| **REQ-08** | Filters can be cleared, restoring the unfiltered catalogue                    | TC-023                 | `e2e/products-browsing.spec.ts`                                 | ✅ Covered                                                                                                                               |
| **REQ-09** | A filter matching nothing shows an empty state, never stale results           | TC-025                 | `e2e/products-browsing.spec.ts`                                 | ✅ Covered                                                                                                                               |

## 2. Product detail

| Req        | Requirement                                                              | Cases          | Specs                                                        | Status     |
| ---------- | ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------ | ---------- |
| **REQ-10** | A product page is addressable by slug and works on a cold load           | TC-033, TC-007 | `e2e/product-detail.spec.ts`, `api/example-products.spec.ts` | ✅ Covered |
| **REQ-11** | Quantity selection is bounded by available stock                         | TC-027, TC-009 | `e2e/product-detail.spec.ts`, `api/example-products.spec.ts` | ✅ Covered |
| **REQ-12** | Out-of-stock products cannot be added to the cart                        | TC-028         | `e2e/product-detail.spec.ts`                                 | ✅ Covered |
| **REQ-13** | Adding a chosen quantity puts exactly that many units in the cart        | TC-029         | `e2e/product-detail.spec.ts`                                 | ✅ Covered |
| **REQ-14** | A failing third-party reviews widget degrades gracefully and can recover | TC-030         | `e2e/product-detail.spec.ts`                                 | ✅ Covered |

## 3. Cart, pricing and promotions

| Req        | Requirement                                                                | Cases          | Specs                                               | Status     |
| ---------- | -------------------------------------------------------------------------- | -------------- | --------------------------------------------------- | ---------- |
| **REQ-15** | Cart totals are correct: subtotal, GST at 10%, shipping, total             | TC-014         | `e2e/example-cart.spec.ts` + `shared/money.test.ts` | ✅ Covered |
| **REQ-16** | Shipping is free at or above $150, assessed on the **discounted** subtotal | TC-018         | `e2e/example-cart.spec.ts` + `shared/money.test.ts` | ✅ Covered |
| **REQ-17** | Valid promo codes discount the order correctly, percentage and fixed       | TC-015         | `e2e/example-cart.spec.ts` + `shared/money.test.ts` | ✅ Covered |
| **REQ-18** | Rejected promo codes state **why** — unknown vs expired vs minimum spend   | TC-016, TC-017 | `e2e/example-cart.spec.ts`                          | ✅ Covered |
| **REQ-19** | Removing the last item shows an empty-cart state                           | TC-019, TC-067 | `e2e/example-cart.spec.ts`, `a11y/cart.spec.ts`     | ✅ Covered |

## 4. Checkout and orders

| Req        | Requirement                                                                  | Cases  | Specs                          | Status     |
| ---------- | ---------------------------------------------------------------------------- | ------ | ------------------------------ | ---------- |
| **REQ-20** | A customer can complete a three-step checkout and receive an order reference | TC-032 | `e2e/checkout.spec.ts`         | ✅ Covered |
| **REQ-21** | The server always re-prices an order; client-supplied totals are ignored     | TC-010 | `api/example-products.spec.ts` | ✅ Covered |
| **REQ-22** | The storefront loads with no failed requests                                 | TC-034 | `e2e/storefront.spec.ts`       | ✅ Covered |

## 5. Admin — authentication and authorisation

| Req        | Requirement                                                                             | Cases                                                  | Specs                     | Status     |
| ---------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------- | ---------- |
| **REQ-23** | An admin can sign in through the UI and reach the admin area                            | TC-031                                                 | `e2e/admin-login.spec.ts` | ✅ Covered |
| **REQ-24** | Admin endpoints reject anonymous callers with 401 and under-privileged callers with 403 | TC-045, TC-046, TC-047, TC-055, TC-058, TC-059, TC-060 | `api/admin.spec.ts`       | ✅ Covered |

## 6. Admin — product and order management

| Req        | Requirement                                                                 | Cases                                  | Specs               | Status     |
| ---------- | --------------------------------------------------------------------------- | -------------------------------------- | ------------------- | ---------- |
| **REQ-25** | An admin can create, partially update and delete products without data loss | TC-043, TC-044, TC-048, TC-049, TC-050 | `api/admin.spec.ts` | ✅ Covered |
| **REQ-26** | Product image upload enforces type and size, and says what the limits are   | TC-051, TC-052, TC-053, TC-054         | `api/admin.spec.ts` | ✅ Covered |
| **REQ-27** | An admin can transition an order's status; invalid filters are rejected     | TC-056, TC-057                         | `api/admin.spec.ts` | ✅ Covered |

## 7. Accessibility (cross-cutting)

WCAG 2.1 AA applies to every page, so this is tracked as one requirement across all
scanned surfaces rather than duplicated per feature.

| Req        | Requirement                                                                     | Cases                                                                                                          | Status     |
| ---------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| **REQ-28** | Every key page and interactive state has zero `axe-core` WCAG 2.1 AA violations | TC-035, TC-036, TC-037, TC-038, TC-039, TC-061, TC-062, TC-063, TC-064, TC-065, TC-066, TC-067, TC-068, TC-069 | ✅ Covered |

Coverage deliberately includes the states that regress unnoticed: a form
**displaying an error** (TC-062, TC-065), an **open modal** (TC-039, TC-068), an
**empty collection** (TC-067), and the **404** (TC-069).

## 8. Visual consistency (cross-cutting)

| Req        | Requirement                                                                | Cases             | Status     |
| ---------- | -------------------------------------------------------------------------- | ----------------- | ---------- |
| **REQ-29** | Key pages render consistently in light and dark themes and at mobile width | VIS-001 – VIS-014 | ✅ Covered |

---

## Defect traceability

| Defect                                                                                                          | Found by                              | Regression coverage                                                   | Status      |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------- | ----------- |
| [DEF-001](05-defect-reports/DEF-001-patch-defaults-erase-fields.md) — partial `PATCH` erased unsent fields      | API exercise of the phase 2 endpoints | **TC-043** (fields preserved), **TC-044** (empty body rejected)       | ✅ Closed   |
| [DEF-002](05-defect-reports/DEF-002-validation-layout-shift-swallows-click.md) — layout shift swallowed a click | Exploratory charter **CH-01**         | **TC-032** (wizard completes), **TC-062** (a11y of the error state)   | ✅ Closed   |
| [DEF-003](05-defect-reports/DEF-003-accent-text-contrast.md) — WCAG AA contrast failure                         | First run of **TC-035**               | **TC-035** – **TC-039** (the scans that found it now guard it)        | ✅ Closed   |
| [DEF-004](05-defect-reports/DEF-004-instock-filter-checkbox-reverts.md) — in-stock checkbox self-reverts        | **TC-022**, intermittently            | **TC-022**, currently `test.fixme` and naming the defect in its title | 🔴 **Open** |

## Coverage gaps, stated explicitly

An unstated gap is the dangerous kind. These are known and accepted.

| Gap                                  | Why                                           | Mitigation                                                                                                                |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **REQ-05** UI combination path       | Blocked by DEF-004, root cause unconfirmed    | API-level boundary is covered by TC-004; the skipped case names the defect so the gap is visible in every report          |
| Payment processing                   | No real gateway exists in this application    | Out of scope, stated in [doc 01](01-test-strategy.md)                                                                     |
| Email delivery                       | No transactional email is sent                | Out of scope                                                                                                              |
| Load / performance                   | No throughput or soak testing                 | Out of scope; timeouts provide a crude ceiling only                                                                       |
| Cross-engine visual baselines        | Visual project is Chromium-only               | Deliberate — see [doc 01](01-test-strategy.md); functional parity across engines is covered by the 4-browser E2E projects |
| Upload content-vs-extension mismatch | API trusts the reported MIME type             | Recorded as a risk decision, covered by standing charter **CH-09**                                                        |
| `TC-011`–`TC-013`, `TC-040`–`TC-041` | Reserved identifiers, folded into other cases | Not recycled — reusing a number would invalidate older references to it                                                   |
