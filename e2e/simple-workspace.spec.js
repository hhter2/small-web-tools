import { expect, test } from '@playwright/test';

test('Quick Home opens the separate simple launcher', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: 'Quick Home' }).click();

  await expect(page).toHaveURL(/\/simple$/);
  await expect(page.getByRole('heading', { name: 'Find a tool and get started' })).toBeVisible();
  await expect(page.locator('[aria-labelledby="simple-essentials-heading"] button')).toHaveCount(8);
  await expect(page.getByRole('navigation', { name: 'Choose audience' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Full Home' })).toBeVisible();
});

test('all-tool search keeps advanced tools in the simple shell', async ({ page }) => {
  await page.goto('/simple');
  await page.getByRole('searchbox', { name: 'Search every tool' }).fill('code preview');
  await page.getByRole('button', { name: /VS Code Preview/ }).click();

  await expect(page).toHaveURL(/\/simple\/code-preview$/);
  await expect(page.getByRole('heading', { name: 'VS Code Preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Full Home' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Choose audience' })).toHaveCount(0);
});

test('legacy simple addresses redirect and mobile stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home/simple/tool-color');

  await expect(page).toHaveURL(/\/simple\/color$/);
  await expect(page.getByText('Color Code Converter & HSL Selector')).toBeVisible();
  await expect(page.locator('#mobile-audience-switcher')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Full Home' })).toBeVisible();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});
