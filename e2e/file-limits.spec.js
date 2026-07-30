import { expect, test } from '@playwright/test';

test('repeated media additions cannot bypass the queue limit', async ({ page }) => {
  await page.goto('/home/tool-mediasplit');
  const input = page.locator('input[type="file"]');
  const firstBatch = Array.from({ length: 10 }, (_, index) => ({
    name: `queued-${index}.mp4`,
    mimeType: 'video/mp4',
    buffer: Buffer.from([index]),
  }));

  await input.setInputFiles(firstBatch);
  await expect(page.getByText('10 files', { exact: false })).toBeVisible();
  await input.setInputFiles({
    name: 'over-limit.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('must not be read'),
  });
  await expect(page.getByText(/exceed the limit of 10/)).toBeVisible();
  await expect(page.getByText('over-limit.mp4')).toHaveCount(0);
});
