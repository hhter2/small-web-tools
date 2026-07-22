import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

let version = process.env.VITE_APP_VERSION || '';

if (!version) {
  try {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    if (pkg.version) {
      version = pkg.version.startsWith('v') ? pkg.version : `v${pkg.version}`;
    }
  } catch (err) {
    version = 'v0.5.4';
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('exifreader') || id.includes('jszip') || id.includes('pdf-lib') || id.includes('docx') || id.includes('xlsx')) {
              return 'vendor-meta';
            }
            if (id.includes('ffmpeg')) {
              return 'vendor-ffmpeg';
            }
          }
        }
      }
    }
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
    },
    {
      // Font Extractor API — POST /api/extract-fonts
      name: 'font-extractor-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/extract-fonts')) return next();

          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method !== 'POST') return next();

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');

          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              let parsed;
              try { parsed = JSON.parse(body); } catch { parsed = {}; }

              const rawUrl = (parsed.url || '').trim();
              if (!rawUrl) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: 'URL is required' }));
                return;
              }

              let targetUrl;
              try { targetUrl = new URL(rawUrl); } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: 'Invalid URL format' }));
                return;
              }

              const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

              // ── Helpers ────────────────────────────────────────────────
              function resolveUrl(base, relative) {
                try {
                  if (relative.startsWith('data:')) return relative;
                  return new URL(relative, base).href;
                } catch { return relative; }
              }

              function getFormatFromUrl(u) {
                const ext = u.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
                return { woff2:'WOFF2', woff:'WOFF', ttf:'TrueType', otf:'OpenType', eot:'EOT', svg:'SVG' }[ext] || 'Unknown';
              }

              const FORMAT_PREF = ['WOFF2','WOFF','OPENTYPE','TRUETYPE','OTF','TTF','EOT','SVG'];
              const fontSourceRe = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)\s*(?:format\s*\(\s*['"]?([^'")\s]+)['"]?\s*\))?/gi;

              function pickBestSource(src, base) {
                const candidates = [];
                const re = new RegExp(fontSourceRe.source, 'gi');
                let m;
                while ((m = re.exec(src)) !== null) {
                  const rawU = m[1]?.trim();
                  if (!rawU || rawU.startsWith('local(')) continue;
                  const resolved = resolveUrl(base, rawU);
                  const fmt = (m[2]?.replace(/['"]/g,'').trim().toUpperCase()) || getFormatFromUrl(rawU);
                  candidates.push({ url: resolved, format: fmt });
                }
                if (!candidates.length) return null;
                candidates.sort((a, b) => {
                  const ai = FORMAT_PREF.indexOf(a.format.toUpperCase());
                  const bi = FORMAT_PREF.indexOf(b.format.toUpperCase());
                  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                });
                return candidates[0];
              }

              function normFamily(f) { return f.replace(/['"]/g,'').trim(); }

              function extractFontsFromCSS(css, base) {
                const fonts = [];
                const imports = [];
                const importRe = /@import\s+(?:url\(['"]?|['"])([^'")\s]+\.css[^'")]*?)(?:['"]?\)['"]?|['"])\s*[^;]*;/gi;
                let im;
                while ((im = importRe.exec(css)) !== null) imports.push(resolveUrl(base, im[1]));

                const faceRe = /@font-face\s*\{([\s\S]*?)\}/gi;
                let bm;
                while ((bm = faceRe.exec(css)) !== null) {
                  const blk = bm[1];
                  const fam = blk.match(/font-family\s*:\s*['"]?([^'";]+)['"]?/i);
                  const src = blk.match(/src\s*:\s*([^;]+)/i);
                  const wgt = blk.match(/font-weight\s*:\s*([^;]+)/i);
                  const sty = blk.match(/font-style\s*:\s*([^;]+)/i);
                  if (!fam || !src) continue;
                  const family = normFamily(fam[1]);
                  const best = pickBestSource(src[1], base);
                  if (!best) continue;
                  const fileName = best.url.startsWith('data:') ? 'embedded-font'
                    : best.url.split('/').pop()?.split('?')[0] || '';
                  fonts.push({
                    name: fileName || `${family}-${best.format}`,
                    family,
                    format: best.format,
                    url: best.url,
                    weight: wgt ? wgt[1].trim() : '400',
                    style: sty ? sty[1].trim() : 'normal',
                    referer: base
                  });
                }
                return { fonts, imports };
              }

              const fetchedCss = new Set();

              async function fetchAndParseCss(url, depth = 0) {
                if (depth > 3 || fetchedCss.has(url)) return [];
                fetchedCss.add(url);
                try {
                  const r = await fetch(url, { headers: { 'User-Agent': UA } });
                  if (!r.ok) return [];
                  const css = await r.text();
                  const { fonts, imports } = extractFontsFromCSS(css, url);
                  const nested = await Promise.all(imports.map(i => fetchAndParseCss(i, depth + 1)));
                  return [...fonts, ...nested.flat()];
                } catch { return []; }
              }

              // ── Fetch HTML ─────────────────────────────────────────────
              const htmlRes = await fetch(targetUrl.href, {
                headers: {
                  'User-Agent': UA,
                  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8'
                }
              });
              if (!htmlRes.ok) {
                res.statusCode = 400;
                res.end(JSON.stringify({ ok: false, error: `Website returned HTTP ${htmlRes.status}` }));
                return;
              }
              const html = await htmlRes.text();
              const allFonts = [];

              // 1. Inline <style> blocks
              const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
              let sm;
              while ((sm = styleRe.exec(html)) !== null) {
                const { fonts, imports } = extractFontsFromCSS(sm[1], targetUrl.href);
                allFonts.push(...fonts.map(f => ({ ...f, referer: targetUrl.href })));
                const imp = await Promise.all(imports.map(i => fetchAndParseCss(i)));
                allFonts.push(...imp.flat().map(f => ({ ...f, referer: targetUrl.href })));
              }

              // 2. <link> stylesheet / preload tags
              const linkRe = /<link[^>]+>/gi;
              const cssUrls = [];
              let lm;
              while ((lm = linkRe.exec(html)) !== null) {
                const tag = lm[0];
                const rel = (tag.match(/rel=["']?([^"'\s>]+)["']?/i)?.[1] || '').toLowerCase();
                const href = tag.match(/href=["']?([^"'\s>]+)["']?/i)?.[1] || '';
                const as = (tag.match(/as=["']?([^"'\s>]+)["']?/i)?.[1] || '').toLowerCase();
                if (!href) continue;
                const resolved = resolveUrl(targetUrl.href, href);
                if (rel === 'stylesheet' || (rel === 'preload' && as === 'style')) {
                  cssUrls.push(resolved);
                } else if ((rel === 'preload' || rel === 'prefetch') && as === 'font') {
                  const fmt = getFormatFromUrl(resolved);
                  const nm = resolved.split('/').pop()?.split('?')[0] || 'preloaded-font';
                  allFonts.push({ name: nm, family: nm.split('.')[0] || 'Unknown', format: fmt, url: resolved, weight: '400', style: 'normal', referer: targetUrl.href });
                }
              }
              const linked = await Promise.all(cssUrls.map(u => fetchAndParseCss(u)));
              allFonts.push(...linked.flat().map(f => ({ ...f, referer: targetUrl.href })));

              // ── Deduplicate by URL ────────────────────────────────────
              const byUrl = new Map();
              for (const f of allFonts) if (!byUrl.has(f.url)) byUrl.set(f.url, f);
              const unique = Array.from(byUrl.values());

              // ── Sort & deduplicate by family (normal/400 first) ───────
              unique.sort((a, b) => {
                const ai = a.style?.toLowerCase().includes('italic') ? 1 : 0;
                const bi = b.style?.toLowerCase().includes('italic') ? 1 : 0;
                if (ai !== bi) return ai - bi;
                return Math.abs(parseInt(a.weight||'400')-400) - Math.abs(parseInt(b.weight||'400')-400);
              });
              const byFamily = new Map();
              for (const f of unique) {
                const key = f.family.toLowerCase().trim();
                if (!byFamily.has(key)) byFamily.set(key, f);
              }
              const result = Array.from(byFamily.values()).sort((a,b) => a.family.localeCompare(b.family));

              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, fonts: result, total: result.length, sourceUrl: targetUrl.href }));
            } catch (e) {
              console.error('[font-extractor]', e.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: 'Extraction failed: ' + e.message }));
            }
          });
        });
      }
    },
    {
      // Font Proxy API — GET /api/font-proxy?url=...&referer=...
      name: 'font-proxy-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/font-proxy')) return next();

          const urlObj = new URL(req.url, 'http://localhost');
          const fontUrl = urlObj.searchParams.get('url') || '';
          const referer = urlObj.searchParams.get('referer') || '';

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=31536000');

          if (!fontUrl) {
            res.statusCode = 400;
            res.end('Missing url param');
            return;
          }

          try {
            const origin = referer ? new URL(referer).origin : undefined;
            const fontRes = await fetch(fontUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Referer': referer || new URL(fontUrl).origin,
                ...(origin ? { 'Origin': origin } : {})
              }
            });
            if (!fontRes.ok) {
              res.statusCode = fontRes.status;
              res.end('Font fetch failed');
              return;
            }
            const buf = Buffer.from(await fontRes.arrayBuffer());
            const ct = fontRes.headers.get('content-type') || 'font/woff2';
            res.setHeader('Content-Type', ct);
            res.statusCode = 200;
            res.end(buf);
          } catch (e) {
            console.error('[font-proxy]', e.message);
            res.statusCode = 502;
            res.end('Proxy error');
          }
        });
      }
    }
  ],
});

