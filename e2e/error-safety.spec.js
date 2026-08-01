import { expect, test } from '@playwright/test';

test('production media errors never render raw stack or filename details', async ({ page }) => {
  await page.route('https://unpkg.com/**', (route) => route.abort('failed'));
  await page.goto('/home/mediasplit');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'sensitive-customer-name.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('local media'),
  });
  await page.getByRole('button', { name: 'Start Processing Queue' }).click();
  const errorMessage = page.getByText(/^Error:/);
  await expect(errorMessage).toContainText('Processing failed');
  await expect(errorMessage).not.toContainText(/sensitive-customer-name|at .*\.js:\d+/);
});
