# DEF-003 — Accent-coloured text fails WCAG AA contrast on tinted backgrounds

|                  |                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Reported**     | 2026-07-29                                                                                                                               |
| **Reported by**  | Mitchel Bailey / Claude (automated a11y scan)                                                                                            |
| **Component**    | Design tokens — `--accent` used as a text colour                                                                                         |
| **Severity**     | **S3 — Minor** (perceivable but below WCAG AA for some users; no functional blockage)                                                    |
| **Priority**     | **P2**                                                                                                                                   |
| **Status**       | Closed — fixed and covered by a regression test                                                                                          |
| **Found during** | First run of the accessibility example spec (`tests/a11y/example-storefront.spec.ts`), while building the Phase 5 Playwright foundations |
| **Environment**  | Chromium, `axe-core` via `@axe-core/playwright`, light theme                                                                             |

## Summary

`axe-core` flagged `color-contrast` violations (WCAG 1.4.3, serious impact) on
three elements, all sharing the same cause: the accent colour
(`--accent`, terracotta-500, `#B4553C`) was used as _text_ against
`--surface-muted` and `--accent-subtle` backgrounds, both of which are too
light for it to clear the 4.5:1 ratio WCAG AA requires for normal-size text.

## Failing elements

| Element                                     | Foreground / background | Measured ratio | Required |
| ------------------------------------------- | ----------------------- | -------------- | -------- |
| Footer "View the test suite on GitHub" link | `#B4553C` on `#F3EFE9`  | 4.26:1         | 4.5:1    |
| Home hero kicker ("Made in Melbourne")      | `#B4553C` on `#F3EFE9`  | 4.26:1         | 4.5:1    |
| Products page active category filter button | `#B4553C` on `#F6E9E3`  | 4.11:1         | 4.5:1    |

All three appear on pages the example a11y spec scans (home, product grid),
which is exactly why an automated scan catches this class of defect and a
manual click-through usually does not — 4.26:1 is not visibly "broken" to
someone without a vision impairment; it fails a specific, cited numeric
threshold that a manual reviewer has no reason to compute by eye.

## Root cause

The design token `--accent` (`shared` styling in `app/styles/globals.css`) is
tuned for one job: white text on top of a solid accent-coloured button
(`--accent-fg` on `--accent`, which has plenty of contrast). It was then
reused, via Tailwind's `text-accent` utility, everywhere the codebase wanted
"the accent colour" applied to _text_ — a second job the same shade was never
checked against.

## Fix

Added a dedicated `--accent-text` token in `app/styles/globals.css`, mapped to
the darker `terracotta-600` in light mode (`--accent-hover`'s value — already
proven to clear 4.5:1 against every background in the palette) and left equal
to `--accent` in dark mode, where the existing colour already passes (5.12:1
–5.99:1 measured across every dark surface). Every use of `text-accent` as a
standalone text colour across the app was swapped to the new
`text-accent-text` utility; `text-accent-fg` (white text on a solid accent
button) was untouched, since that pairing was never the problem.

## Regression coverage

`tests/a11y/example-storefront.spec.ts` — TC-035 through TC-038 scan the home
page, product grid, product detail page and a populated cart with
`axe-core`, scoped to WCAG 2.1 A/AA. All four are expected to report zero
violations; a colour token regressing back below 4.5:1 anywhere those pages
render text will fail the suite again immediately.

## Notes for review

Worth calling out in an interview: this was not manually eyeballed or guessed
at. Contrast ratios were computed with the actual WCAG relative-luminance
formula for every accent-on-background combination in the palette before
touching any code, which is also what caught that a fourth, superficially
similar-looking case — the amber "low stock" badge — was _not_ actually
failing once its real 15%-opacity-blended background was accounted for rather
than approximated against a solid colour. Fixing the badge would have been a
wasted, unverified change; not fixing the accent text would have shipped a
real, cheaply-avoidable accessibility defect. The discipline was checking
before acting in both directions, not just the direction that found a bug.
