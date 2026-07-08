import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
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
  const tags = execSync('git tag --sort=-v:refname').toString().trim().split(/\r?\n/);
  version = tags[0] ? tags[0].trim() : 'v1.0.0';
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

function resolvePathByName(folderName) {
  const currentDir = process.cwd();
  if (path.basename(currentDir).toLowerCase() === folderName.toLowerCase()) {
    return currentDir;
  }
  
  const childPath = path.join(currentDir, folderName);
  if (fs.existsSync(childPath) && fs.statSync(childPath).isDirectory()) {
    return childPath;
  }
  
  let parent = path.dirname(currentDir);
  while (parent && parent !== currentDir) {
    if (path.basename(parent).toLowerCase() === folderName.toLowerCase()) {
      return parent;
    }
    const siblingPath = path.join(parent, folderName);
    if (fs.existsSync(siblingPath) && fs.statSync(siblingPath).isDirectory()) {
      return siblingPath;
    }
    const nextParent = path.dirname(parent);
    if (nextParent === parent) break;
    parent = nextParent;
  }
  
  return null;
}

function createGitignoreMatcher(gitignoreContent) {
  if (!gitignoreContent) return () => false;

  const lines = gitignoreContent.split(/\r?\n/);
  const rules = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    let isNegated = false;
    if (line.startsWith('!')) {
      isNegated = true;
      line = line.slice(1);
    }

    let isDirOnly = false;
    if (line.endsWith('/')) {
      isDirOnly = true;
      line = line.slice(0, -1);
    }

    let regexStr = line
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    if (line.startsWith('/')) {
      regexStr = '^' + regexStr.slice(1);
    } else {
      regexStr = '(^|\\/)' + regexStr;
    }

    regexStr += '(\\/|$)';

    try {
      rules.push({
        regex: new RegExp(regexStr),
        isNegated,
        isDirOnly
      });
    } catch (e) {
      // ignore
    }
  }

  return (filePath, isDir) => {
    let ignored = false;
    const parts = filePath.split('/');
    const relPath = parts.slice(1).join('/');

    if (!relPath) return false;

    for (const rule of rules) {
      if (rule.isDirOnly && !isDir) continue;

      if (rule.regex.test(relPath)) {
        ignored = !rule.isNegated;
      }
    }
    return ignored;
  };
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
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  plugins: [
    react(),
    {
      name: 'scan-local-dir-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/resolve-local-path')) {
            const urlObj = new URL(req.url, 'http://localhost');
            const name = urlObj.searchParams.get('name') || '';
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            if (!name) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Name parameter is required' }));
              return;
            }
            
            const resolved = resolvePathByName(name);
            if (resolved) {
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, path: resolved }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ ok: false, error: 'Path could not be resolved locally' }));
            }
            return;
          }

          if (!req.url?.startsWith('/api/scan-local-dir')) return next();

          const urlObj = new URL(req.url, 'http://localhost');
          const targetPath = urlObj.searchParams.get('path') || '';

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');

          if (!targetPath) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'Path parameter is required' }));
            return;
          }

          try {
            if (!fs.existsSync(targetPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ ok: false, error: 'Directory does not exist' }));
              return;
            }

            const stat = fs.statSync(targetPath);
            if (!stat.isDirectory()) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Path is not a directory' }));
              return;
            }

            const rootFolderName = path.basename(targetPath) || 'root';

            const TEXT_EXTENSIONS = new Set([
              'txt', 'md', 'markdown', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 
              'scss', 'sass', 'less', 'svg', 'xml', 'yaml', 'yml', 'py', 'java', 'c', 
              'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'rb', 'pl', 'sh', 'bat', 
              'ps1', 'sql', 'ini', 'conf', 'cfg', 'env', 'gitignore', 'gitattributes', 
              'editorconfig', 'toml', 'csv', 'jsonl', 'graphql', 'prisma'
            ]);

            const BINARY_EXTENSIONS = new Set([
              'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'rar', 'tar', 
              'gz', '7z', 'mp3', 'mp4', 'wav', 'flac', 'avi', 'mov', 'wmv', 'ogg', 
              'm4a', 'webm', 'exe', 'dll', 'so', 'dylib', 'bin', 'dat', 'db', 'sqlite', 
              'class', 'jar', 'war', 'eot', 'ttf', 'woff', 'woff2'
            ]);

            let gitignoreText = '';
            const gitignorePath = path.join(targetPath, '.gitignore');
            if (fs.existsSync(gitignorePath)) {
              try {
                gitignoreText = fs.readFileSync(gitignorePath, 'utf8');
              } catch {}
            }

            const isIgnoredFile = createGitignoreMatcher(gitignoreText);

            function scanDir(dir, prefix = '', parentIgnored = false) {
              const results = [];
              const items = fs.readdirSync(dir);
              for (const item of items) {
                if (item === '.git') {
                  continue;
                }
                const full = path.join(dir, item);
                const rel = prefix ? `${prefix}/${item}` : `${rootFolderName}/${item}`;
                const itemStat = fs.statSync(full);
                const isDir = itemStat.isDirectory();
                
                const selfIgnored = isIgnoredFile(rel, isDir);
                const itemIgnored = parentIgnored || selfIgnored;

                if (isDir) {
                  results.push(...scanDir(full, rel, itemIgnored));
                } else if (itemStat.isFile()) {
                  const ext = item.split('.').pop().toLowerCase();
                  let isText = false;
                  let lines = 0;

                  if (!itemIgnored) {
                    if (!BINARY_EXTENSIONS.has(ext)) {
                      if (TEXT_EXTENSIONS.has(ext)) {
                        isText = true;
                      } else {
                        try {
                          const fd = fs.openSync(full, 'r');
                          const buf = Buffer.alloc(1024);
                          const read = fs.readSync(fd, buf, 0, 1024, 0);
                          fs.closeSync(fd);
                          isText = true;
                          for (let j = 0; j < read; j++) {
                            if (buf[j] === 0) {
                              isText = false;
                              break;
                            }
                          }
                        } catch {
                          isText = false;
                        }
                      }
                    }

                    if (isText && itemStat.size < 5 * 1024 * 1024) {
                      try {
                        const content = fs.readFileSync(full, 'utf8');
                        lines = content.split(/\r?\n/).length;
                      } catch {
                        lines = 0;
                      }
                    }
                  } else {
                    isText = !BINARY_EXTENSIONS.has(ext) && TEXT_EXTENSIONS.has(ext);
                  }

                  results.push({
                    name: item,
                    path: rel.replace(/\\/g, '/'),
                    size: itemStat.size,
                    lineCount: lines,
                    isText
                  });
                }
              }
              return results;
            }

            const files = scanDir(targetPath);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, files, gitignoreText }));
          } catch (e) {
            console.error('[scan-local-dir] failed:', e.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
      }
    },
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

