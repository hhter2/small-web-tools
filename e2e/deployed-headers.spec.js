import { expect, test } from '@playwright/test';
import { BASELINE_RESPONSE_HEADERS } from '../functions/_shared/responseHeaders.js';

const productionHost = process.env.PRODUCTION_HOST;
const productionOrigin = productionHost ? `https://${productionHost}` : null;

function expectBaselineHeaders(response) {
  const actual = response.headers();
  for (const [name, value] of Object.entries(BASELINE_RESPONSE_HEADERS)) {
    expect(actual[name.toLowerCase()], name).toBe(value);
  }
}

test.describe('deployed response policy', () => {
  test.skip(!productionHost, 'Set PRODUCTION_HOST to the tested custom-domain hostname.');

  test.beforeAll(() => {
    expect(productionHost).toMatch(/^(?!-)(?:[a-z0-9-]+\.)+[a-z]{2,}$/iu);
  });

  test('HTTPS static and Function responses expose the baseline headers', async ({ request }) => {
    const staticResponse = await request.get(`${productionOrigin}/`);
    expect(staticResponse.ok()).toBe(true);
    expectBaselineHeaders(staticResponse);

    const functionResponse = await request.get(`${productionOrigin}/api/iplookup?ip=not-an-ip`);
    expect(functionResponse.status()).toBe(400);
    expectBaselineHeaders(functionResponse);
  });

  test('HTTP redirects to the canonical HTTPS origin', async ({ request }) => {
    const response = await request.get(`http://${productionHost}/`, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(response.status());
    expect(new URL(response.headers().location, `http://${productionHost}`).origin).toBe(productionOrigin);
  });

  test('candidate CSP loads representative bundled routes without violations', async ({ page }) => {
    const violations = [];
    page.on('console', (message) => {
      if (/content security policy|refused to/iu.test(message.text())) violations.push(message.text());
    });
    for (const route of ['/home/mermaid', '/home/code-preview', '/home/mediasplit', '/home/imgmeta', '/home/iplookup']) {
      await page.goto(`${productionOrigin}${route}`);
      await expect(page.locator('main')).toBeVisible();
    }
    expect(violations).toEqual([]);
  });
});
