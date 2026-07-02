import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { execSync } from 'child_process';

// Automatically obtain current version from git tags
let version = 'v1.0.0';
try {
  try {
    execSync('git fetch --unshallow --tags', { stdio: 'ignore' });
  } catch (fetchErr) {
    try {
      execSync('git fetch --tags', { stdio: 'ignore' });
    } catch (ignore) {}
  }
  version = execSync('git describe --tags --abbrev=0').toString().trim();
} catch (e) {
  try {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    version = `v${pkg.version}`;
  } catch (err) {
    version = 'v1.0.0';
  }
}

const showChannelAlert = version.includes('alpha') || version.includes('beta');
const appChannel = version.includes('alpha') ? 'alpha' : version.includes('beta') ? 'beta' : '';


// Server-side geo lookup — runs in Node.js, bypasses browser network restrictions
async function geoLookup(ip) {
  const withTimeout = (fn, ms = 5000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fn(ctrl.signal).finally(() => clearTimeout(timer));
  };

  const providers = [
    // 1. api.ip.sb — widely accessible, no key required
    () => withTimeout(async (signal) => {
      const url = ip ? `https://api.ip.sb/geoip/${ip}` : `https://api.ip.sb/geoip`;
      const r = await fetch(url, {
        signal,
        headers: { 'User-Agent': 'curl/7.88.1', 'Accept': 'application/json' },
      });
      if (!r.ok) throw new Error(`api.ip.sb ${r.status}`);
      const d = await r.json();
      return {
        ip: d.ip, city: d.city || '', region: d.region || '',
        country_name: d.country || '', country_code: d.country_code || '',
        postal: '', org: d.isp || d.organization || '',
        asn: d.asn ? `AS${d.asn}` : '', timezone: d.timezone || '',
        utc_offset: '', latitude: d.latitude, longitude: d.longitude,
      };
    }),

    // 2. ipapi.co
    () => withTimeout(async (signal) => {
      const url = ip ? `https://ipapi.co/${ip}/json/` : `https://ipapi.co/json/`;
      const r = await fetch(url, { signal, headers: { 'User-Agent': 'curl/7.88.1' } });
      if (!r.ok) throw new Error(`ipapi.co ${r.status}`);
      const d = await r.json();
      if (d.error) throw new Error(d.reason || 'ipapi.co error');
      return {
        ip: d.ip, city: d.city || '', region: d.region || '',
        country_name: d.country_name || '', country_code: d.country_code || '',
        postal: d.postal || '', org: d.org || '', asn: d.asn || '',
        timezone: d.timezone || '', utc_offset: d.utc_offset || '',
        latitude: d.latitude, longitude: d.longitude,
      };
    }),

    // 3. ipinfo.io
    () => withTimeout(async (signal) => {
      const url = ip ? `https://ipinfo.io/${ip}/json` : `https://ipinfo.io/json`;
      const r = await fetch(url, { signal, headers: { 'User-Agent': 'curl/7.88.1' } });
      if (!r.ok) throw new Error(`ipinfo.io ${r.status}`);
      const d = await r.json();
      const [lat, lon] = d.loc ? d.loc.split(',').map(Number) : [null, null];
      return {
        ip: d.ip, city: d.city || '', region: d.region || '',
        country_name: d.country || '', country_code: d.country || '',
        postal: d.postal || '', org: d.org || '', asn: '',
        timezone: d.timezone || '', utc_offset: '',
        latitude: lat, longitude: lon,
      };
    }),
  ];

  let lastErr = 'no providers';
  for (const p of providers) {
    try { return await p(); } catch (e) {
      lastErr = e.message;
      console.warn('[ip-lookup]', e.message);
    }
  }
  throw new Error(lastErr);
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __SHOW_CHANNEL_ALERT__: showChannelAlert,
    __APP_CHANNEL__: JSON.stringify(appChannel),
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
  plugins: [
    react(),
    {
      name: 'ip-lookup-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/iplookup')) return next();

          const urlObj = new URL(req.url, 'http://localhost');
          const ip = (urlObj.searchParams.get('ip') || '').trim();

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');

          try {
            const data = await geoLookup(ip);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, data }));
          } catch (e) {
            console.error('[ip-lookup] all providers failed:', e.message);
            res.statusCode = 502;
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
      }
    }
  ],
});

