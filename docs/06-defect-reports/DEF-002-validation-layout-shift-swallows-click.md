# DEF-002 — Clearing a validation error shifts the layout and swallows the user's click

|                  |                                                                       |
| ---------------- | --------------------------------------------------------------------- |
| **Reported**     | 2026-07-28                                                            |
| **Reported by**  | Mitchel Bailey                                                        |
| **Component**    | Checkout — step navigation / shared `Field` component                 |
| **Severity**     | **S2 — Significant** (user is blocked until they click a second time) |
| **Priority**     | **P1** (sits on the revenue path)                                     |
| **Status**       | Closed — fixed and covered by a regression test                       |
| **Found during** | Exploratory browser walkthrough of the checkout wizard                |
| **Environment**  | Local dev, Chromium 1.62, Node 24.18.0, viewport 1280×720             |

## Summary

On the checkout form, if a field still shows a validation error and the user
corrects it and then clicks **Continue**, the first click does nothing. The
button only works on the second click.

The cause is a layout shift: clicking the button blurs the field, blur triggers
re-validation, the error message is removed from the DOM, everything below it
moves up by 22px, and the button is no longer under the pointer when the mouse
button is released — so no `click` event is ever dispatched.

## Steps to reproduce

1. Add any item to the cart and go to `/checkout`.
2. On step 1, click **Continue** with all fields empty. Three validation errors
   appear.
3. Fill in Email, First name and Last name. (Email and First name clear their
   errors as focus moves on; **Last name's error is still displayed**, because
   the field has not been blurred yet.)
4. Click **Continue** once.

## Expected result

The form advances to step 2.

## Actual result

Nothing happens. The Last name error disappears, but the step does not change.
Clicking **Continue** a second time works.

## Evidence

Measured position of the Continue button across the interaction:

```
Continue button y, error displayed :  608px
Continue button y, error removed   :  586px
LAYOUT SHIFT                       :   22px
```

Instrumenting the form's click handler confirmed the click event is never
dispatched on the first attempt — the count of button clicks seen by the form
stays at 1 (from step 2 of the repro) until the second click, when it becomes 2.
Blurring the field explicitly _before_ clicking makes the button work on the
first click, which isolates the shift as the cause.

## Root cause

The shared `Field` component rendered its error message conditionally with no
reserved space:

```tsx
{
  error ? (
    <p role="alert" className="text-xs …">
      {error}
    </p>
  ) : null;
}
```

Inside a `flex flex-col gap-1.5` column, removing that paragraph removes both
the line of text and its gap — 22px. React Hook Form's `mode: 'onBlur'` means
blur is exactly when errors get cleared, and blur is exactly what a click on
another control causes. The two combine so that the act of clicking the button
moves the button.

## Fix

`app/components/ui/primitives.tsx` — the message row is now always present and
always occupies at least one line, so the column height does not change when a
message appears or disappears:

```tsx
<div className="min-h-4">
  {error ? <p role="alert" …>{error}</p> : hint ? <p …>{hint}</p> : null}
</div>
```

## Regression coverage

Automated in the E2E suite (see `docs/05-traceability-matrix.md`):

- **TC-021** — with an error displayed, correcting the field and clicking
  Continue **once** advances to step 2.
- **TC-022** — the vertical position of the Continue button is unchanged
  between the error-shown and error-cleared states.

## Notes for review

This is the most interesting defect found so far, for reasons that go beyond the
bug itself.

**It is a real product bug that presents as test flakiness.** The natural
reaction to "the click sometimes doesn't register" is to add a wait, a retry, or
`{ force: true }` — all of which make the symptom disappear while leaving users
clicking twice on the checkout page. The failing test was correct and the
application was wrong. Reaching for a `force` click here would have hidden a
genuine revenue-path defect.

**It is invisible to unit tests.** React Testing Library dispatches click events
directly on the element; there is no pointer, no coordinates and no layout, so
the click can never miss. It only reproduces in a real browser with real
geometry — which is the argument for having E2E coverage at all rather than
testing the wizard purely at the component level.

**The class of bug is general.** Any conditionally rendered message above an
interactive control — validation errors, inline alerts, "only N left" warnings —
can do this. Reserving space for transient content is the fix, and it is worth
checking the admin forms for the same pattern when they are built.
