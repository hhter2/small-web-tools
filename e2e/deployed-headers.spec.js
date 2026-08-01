import { expect, test } from '@playwright/test';

const deployedBaseUrl = process.env.DEPLOYED_BASE_URL;

test.describe('deployed security headers', () => {
  test.skip(!deployedBaseUrl, 'Set DEPLOYED_BASE_URL to run operational header checks.');

  test('HTTPS serves the staged HSTS policy', async ({ request }) => {
    const url = new URL(deployedBaseUrl);
    expect(url.protocol).toBe('https:');
    const response = await request.get(url.toString());
    expect(response.ok()).toBe(true);
    expect(response.headers()['strict-transport-security']).toBe('max-age=86400');
  });

  test('HTTP redirects to the same HTTPS hostname', async ({ request }) => {
    const httpsUrl = new URL(deployedBaseUrl);
    const httpUrl = new URL(httpsUrl);
    httpUrl.protocol = 'http:';
    const response = await request.get(httpUrl.toString(), { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(response.status());
    const location = new URL(response.headers().location, httpUrl);
    expect(location.protocol).toBe('https:');
    expect(location.hostname).toBe(httpsUrl.hostname);
  });
});
