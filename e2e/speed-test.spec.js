import { expect, test } from '@playwright/test';

test('rejects hostile custom plans and confirms the exact high-traffic total', async ({ page }) => {
  let speedRequests = 0;
  page.on('request', (request) => {
    if (request.url().startsWith('https://speed.cloudflare.com/')) speedRequests += 1;
  });
  await page.goto('/home/speedtest');
  await page.getByRole('button', { name: 'Allow speed test' }).click();
  await page.getByLabel('Test Size Limit').selectOption('custom');

  await page.getByLabel('Download (MB)').fill('1000000');
  await expect(page.getByRole('alert')).toContainText('between 1 and 1000 MB');
  await page.getByRole('button', { name: 'Start Test' }).click();
  expect(speedRequests).toBe(0);

  await page.getByLabel('Download (MB)').fill('1000');
  await page.getByLabel('Upload (MB)').fill('1000');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('2000 MB total');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Start Test' }).click();
  expect(speedRequests).toBe(0);
});

test('stop immediately aborts a hanging active request', async ({ page }) => {
  await page.route('https://speed.cloudflare.com/**', () => new Promise(() => {}));
  await page.route('**/api/iplookup', (route) => route.fulfill({
    json: { ok: true, data: { ip: '192.0.2.1', org: 'Example' } },
  }));
  await page.goto('/home/speedtest');
  await page.getByRole('button', { name: 'Allow speed test' }).click();
  await page.getByRole('button', { name: 'Start Test' }).click();
  await page.getByRole('button', { name: 'Stop Test' }).click();
  await expect(page.getByText(/Test cancelled/)).toBeVisible();
});
