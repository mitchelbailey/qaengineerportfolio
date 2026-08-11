import { test, expect } from '../fixtures/test';

test.describe('not found 404 page visual baselines', () => {
  test('VIS-014 | not found 404 page, light theme', async ({ api, notFoundPage, page }) => {
    await api.reset();

    await notFoundPage.goto();
    await notFoundPage.notFoundMessage.waitFor();
    await expect(page).toHaveScreenshot('not-found-desktop.png', { fullPage: true });
  });
});
