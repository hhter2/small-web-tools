import { expect, test } from '@playwright/test';
import { PUBLIC_ROUTE_IDS } from '../src/toolRegistry.js';

const toolRoutes = PUBLIC_ROUTE_IDS;

async function blockExternalRequests(page) {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {
      return route.continue();
    }
    return route.abort();
  });
}

for (const route of toolRoutes) {
  test(`${route} renders without an uncaught error`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await blockExternalRequests(page);
    await page.goto(`/#${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('text=Failed to load component')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('unknown hash is normalized to the dashboard', async ({ page }) => {
  await blockExternalRequests(page);
  await page.goto('/#tool-does-not-exist', { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/tool-does-not-exist/);
  await expect(page.locator('main')).toBeVisible();
});
