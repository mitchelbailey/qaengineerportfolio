import type { Page } from '@playwright/test';

/**
 * Every page object in this suite follows the same shape, decided after
 * running the same cart spec both ways against the live app (see the project
 * history / docs/08-selector-and-flake-policy.md for the comparison):
 *
 *   - Locators are readonly properties, built once in the constructor.
 *   - Methods are for genuine multi-step *interactions* only
 *     (fill this, then click that). A method that only reads and returns a
 *     value is not worth having — call `.textContent()` or, better, assert on
 *     the locator directly in the spec.
 *   - No assertions live here. `expect(locator)` stays visible at the call
 *     site in every spec, which is what keeps retry-ability from silently
 *     disappearing inside a helper method, and keeps failures pointing at the
 *     spec line that actually broke rather than one level removed into a POM.
 *
 * BasePage exists only to give every page object a consistent constructor
 * signature so the fixtures file (tests/fixtures/test.ts) can instantiate them
 * uniformly.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}
}
