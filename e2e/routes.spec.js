import { expect, test } from '@playwright/test';

const toolRoutes = [
  'tool-home', 'tool-slash', 'tool-wc', 'tool-casing', 'tool-typing',
  'tool-color', 'tool-ascii', 'tool-unicode', 'tool-fontextractor',
  'tool-base', 'tool-folder-analyzer', 'tool-dna', 'tool-codon',
  'tool-iplookup', 'tool-speedtest', 'tool-imgmeta', 'tool-docmeta',
  'tool-audiometa', 'tool-videometa', 'tool-mediasplit', 'tool-barcode',
  'tool-currency', 'tool-date', 'tool-password', 'tool-pwstrength',
  'tool-qrcode', 'tool-qrbarcodescan', 'tool-wheel',
];

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
