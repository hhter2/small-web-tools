import { expect, test } from '@playwright/test';

const supportedCurrencies = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'TWD', 'HKD', 'SGD', 'CAD', 'AUD', 'KRW',
  'INR', 'PHP', 'MYR', 'THB', 'VND', 'NZD', 'CHF', 'ZAR', 'BRL', 'MXN',
];

function validRatePayload() {
  return {
    ok: true,
    provider: 'Test exchange provider',
    base: 'USD',
    rates: Object.fromEntries(
      supportedCurrencies.map((code, index) => [code, code === 'USD' ? 1 : index + 2]),
    ),
    dataDate: '2026-07-23T00:00:00.000Z',
  };
}

test('does not request or fabricate live rates before consent', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/exchange-rates', async (route) => {
    requests += 1;
    await route.fulfill({ json: validRatePayload() });
  });

  await page.goto('/#tool-currency');
  await expect(page.getByText('Rate unavailable', { exact: true })).toBeVisible();
  expect(requests).toBe(0);
});

test('shows unavailable on provider failure and accepts only a valid manual rate', async ({ page }) => {
  await page.route('**/api/exchange-rates', (route) => route.fulfill({
    status: 502,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: 'Unable to retrieve live exchange rates' }),
  }));

  await page.goto('/#tool-currency');
  await page.getByRole('button', { name: 'Allow live rates' }).click();
  await expect(page.getByText('Rate unavailable', { exact: true })).toBeVisible();

  await page.getByLabel('Enable Manual Rate Override').check();
  const manualRate = page.locator('input[placeholder="Rate"]');
  await manualRate.fill('0');
  await expect(page.getByRole('alert')).toContainText('greater than zero');
  await expect(page.getByText('Rate unavailable', { exact: true })).toBeVisible();

  await manualRate.fill('2');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('$200.00', { exact: true })).toBeVisible();
});

test('retains a previously validated rate as visibly stale after refresh failure', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/api/exchange-rates', async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await route.fulfill({ json: validRatePayload() });
    } else {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Unable to retrieve live exchange rates' }),
      });
    }
  });

  await page.goto('/#tool-currency');
  await page.getByRole('button', { name: 'Allow live rates' }).click();
  await expect(page.getByText(/Test exchange provider$/)).toBeVisible();

  await page.getByLabel('Enable Manual Rate Override').check();
  await page.getByLabel('Enable Manual Rate Override').uncheck();
  await expect(page.getByText(/Test exchange provider \(stale\)$/)).toBeVisible();
  await expect(page.getByText('Rate unavailable', { exact: true })).toHaveCount(0);
});
