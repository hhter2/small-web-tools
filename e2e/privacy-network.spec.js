import { expect, test } from '@playwright/test';

test('privacy route and consent manager expose the shared network inventory', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/#privacy$/);
  await expect(page.getByRole('heading', { name: 'Privacy & Network Services' })).toBeVisible();
  await expect(page.getByText('FFmpeg WebAssembly Runtime')).toBeVisible();
  await expect(page.getByText('Google Fonts Recommendations')).toBeVisible();

  await page.getByRole('button', { name: /Consent/ }).click();
  await page.getByRole('button', { name: /full Privacy/ }).click();
  await expect(page).toHaveURL(/#privacy$/);
});

test('FFmpeg is disclosed persistently and requested only after processing starts', async ({ page }) => {
  const unpkgRequests = [];
  const apiUploads = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://unpkg.com/')) unpkgRequests.push(request);
    if (request.url().includes('/api/') && request.postDataBuffer()?.length) apiUploads.push(request);
  });
  await page.route('https://unpkg.com/**', (route) => route.abort());

  await page.goto('/#tool-mediasplit');
  await expect(page.getByText(/downloads the pinned FFmpeg 0\.12\.6/)).toBeVisible();
  expect(unpkgRequests).toHaveLength(0);

  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: 'local-test.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('local media never uploaded'),
  });
  await page.getByRole('button', { name: 'Start Processing Queue' }).click();
  await expect.poll(() => unpkgRequests.length).toBeGreaterThan(0);
  expect(unpkgRequests.every((request) => request.method() === 'GET')).toBe(true);
  expect(apiUploads).toHaveLength(0);
});
