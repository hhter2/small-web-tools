import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('consent dialog traps focus, announces changes, closes with Escape, and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Manage third-party service consent' });
  await opener.click();

  const dialog = page.getByRole('dialog', { name: /Third-Party Service Consent Manager/ });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close consent manager' })).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close consent manager' })).toBeFocused();

  const allowButton = dialog.getByRole('button', { name: /^Allow / }).first();
  const serviceName = (await allowButton.getAttribute('aria-label')).replace(/^Allow /, '');
  await allowButton.click();
  await expect(dialog.getByText(`${serviceName} is now allowed.`)).toBeAttached();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('brand and folder-selection controls use native button semantics', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Go to home' }).first()).toBeVisible();
  await page.goto('/home/folder-analyzer');
  await expect(page.getByRole('button', { name: 'Select a folder to analyze' })).toBeVisible();
});

for (const route of ['/home', '/simple', '/simple/color', '/home/privacy', '/home/currency', '/home/folder-analyzer']) {
  test(`${route} has no serious or critical automated accessibility findings`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const highImpact = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(highImpact).toEqual([]);
  });
}
