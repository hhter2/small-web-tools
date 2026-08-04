import { expect, test } from '@playwright/test';

test('mobile language control is mounted in the real header and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home');

  const switcher = page.locator('[data-language-switcher="mobile"]');
  const trigger = switcher.locator('button[aria-haspopup="menu"]');
  await expect(switcher).toBeVisible();

  await trigger.focus();
  await trigger.press('ArrowDown');
  const options = page.getByRole('menuitemradio');
  await expect(options).toHaveCount(2);
  await expect(options.first()).toBeFocused();

  await options.first().press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();
  await options.nth(1).press('Enter');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(trigger).toBeFocused();
});

test('desktop language control follows the workspace visibility contract', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/home');
  await expect(page.locator('[data-language-switcher="desktop"]')).toBeVisible();

  await page.goto('/simple');
  await expect(page.locator('[data-language-switcher="desktop"]')).toHaveCount(0);
});
