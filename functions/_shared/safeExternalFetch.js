// Shared Safe External Fetch Helper for SSRF Protection & Resource Limits

export function isPrivateHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase().trim();

  // Localhost & .local domains
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }

  // IPv4 Private & Reserved Ranges
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    if (a === 0 || a === 127) return true; // 0.0.0.0/8, 127.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Link-Local / AWS Metadata)
    if (a >= 224) return true; // Multicast & Reserved
  }

  // IPv6 Loopback & Private
  if (host === '::1' || host === '0:0:0:0:0:0:0:1' || host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:')) {
    return true;
  }

  return false;
}

export function validateTargetUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with user credentials are not allowed');
  }

  const port = parsed.port;
  if (port && port !== '80' && port !== '443') {
    throw new Error('Only standard HTTP (80) and HTTPS (443) ports are allowed');
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new Error('Access to internal, loopback, or local IP addresses is prohibited');
  }

  return parsed;
}

export async function safeExternalFetch(rawUrl, options = {}) {
  const maxBytes = options.maxBytes || 2 * 1024 * 1024; // Default 2 MB
  const timeoutMs = options.timeoutMs || 8000;
  const maxRedirects = options.maxRedirects || 3;

  let currentUrl = rawUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const validatedUrl = validateTargetUrl(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(validatedUrl.href, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          ...options.headers,
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      // Handle Redirects safely
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) {
          throw new Error('Redirect missing Location header');
        }
        currentUrl = new URL(location, validatedUrl.href).href;
        redirectCount++;
        continue;
      }

      if (!res.ok) {
        throw new Error(`Remote server responded with status ${res.status}`);
      }

      // Read response body with size limit check
      const contentLength = Number(res.headers.get('content-length') || 0);
      if (contentLength > maxBytes) {
        throw new Error(`Response size exceeds limit of ${Math.round(maxBytes / 1024 / 1024)} MB`);
      }

      if (!res.body) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > maxBytes) {
          throw new Error(`Response size exceeds limit of ${Math.round(maxBytes / 1024 / 1024)} MB`);
        }
        return { response: res, buffer: buf, url: validatedUrl.href };
      }

      const reader = res.body.getReader();
      const chunks = [];
      let totalRead = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalRead += value.length;
        if (totalRead > maxBytes) {
          controller.abort();
          throw new Error(`Response size exceeds limit of ${Math.round(maxBytes / 1024 / 1024)} MB`);
        }
        chunks.push(value);
      }

      const fullBuffer = new Uint8Array(totalRead);
      let offset = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      return { response: res, buffer: fullBuffer.buffer, url: validatedUrl.href };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('Too many redirects');
}
