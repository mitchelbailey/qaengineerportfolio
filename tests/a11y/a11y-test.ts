import AxeBuilder from '@axe-core/playwright';
import { test as base, expect } from '../fixtures/test';

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface A11yFixtures {
  /**
   * A pre-configured `AxeBuilder`, scoped to WCAG 2.1 A/AA. Call `.analyze()`
   * and assert `violations` is empty — see tests/a11y/example-storefront.spec.ts.
   *
   * A factory function rather than a ready-made builder: axe scans the page in
   * its state *at the moment `.analyze()` runs*, so a spec that opens a modal
   * or triggers an error state needs a fresh builder bound to that later
   * moment, not one built at the top of the test before anything happened.
   */
  makeAxeBuilder: () => AxeBuilder;
}

export const test = base.extend<A11yFixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags(WCAG_TAGS));
  },
});

export { expect };
