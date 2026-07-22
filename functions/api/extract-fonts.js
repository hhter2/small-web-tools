import { safeExternalFetch, validateTargetUrl } from '../_shared/safeExternalFetch';
import { signFontToken } from '../_shared/fontToken';
import { enforceRateLimit } from '../_shared/rateLimit';

function sameOriginCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  return origin && origin === new URL(request.url).origin
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
    : {};
}

// Font Extractor API — POST /api/extract-fonts
export async function onRequestOptions(context) {
  const corsHeaders = sameOriginCorsHeaders(context.request);
  if (!corsHeaders['Access-Control-Allow-Origin']) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...sameOriginCorsHeaders(request),
  };

  try {
    const limited = await enforceRateLimit(context, { name: 'extract-fonts', limit: 20 });
    if (limited) return limited;

    const secretStr = env?.FONT_PROXY_SIGNING_SECRET;
    if (typeof secretStr !== 'string' || secretStr.length < 32) {
      return new Response(JSON.stringify({ ok: false, error: 'Font proxy is not configured' }), {
        status: 503,
        headers: corsHeaders
      });
    }

    let parsed;
    try {
      parsed = await request.json();
    } catch {
      parsed = {};
    }

    const rawUrl = (parsed.url || '').trim();
    if (!rawUrl) {
      return new Response(JSON.stringify({ ok: false, error: 'URL is required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    let targetUrl;
    try {
      targetUrl = validateTargetUrl(rawUrl);
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 400,
        headers: corsHeaders
      });
    }

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
        const stretch = blk.match(/font-stretch\s*:\s*([^;]+)/i);
        const unicodeRange = blk.match(/unicode-range\s*:\s*([^;]+)/i);
        const variationSettings = blk.match(/font-variation-settings\s*:\s*([^;]+)/i);
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
          weight: wgt ? wgt[1].trim() : 'unknown',
          style: sty ? sty[1].trim() : 'unknown',
          stretch: stretch ? stretch[1].trim() : 'unknown',
          unicodeRange: unicodeRange ? unicodeRange[1].trim() : 'unknown',
          variationSettings: variationSettings ? variationSettings[1].trim() : 'unknown',
          isVariable: Boolean(
            (wgt && /\s/.test(wgt[1].trim()))
            || variationSettings,
          ),
          referer: base
        });
      }
      return { fonts, imports };
    }

    const fetchedCss = new Set();

    async function fetchAndParseCss(url, depth = 0) {
      if (depth > 3 || fetchedCss.size >= 20 || fetchedCss.has(url)) return [];
      fetchedCss.add(url);
      try {
        const { buffer } = await safeExternalFetch(url, {
          maxBytes: 1 * 1024 * 1024,
          timeoutMs: 5000,
          allowedContentTypes: ['text/css'],
        });
        const decoder = new TextDecoder('utf-8');
        const css = decoder.decode(buffer);
        const { fonts, imports } = extractFontsFromCSS(css, url);
        const nested = await Promise.all(imports.map(i => fetchAndParseCss(i, depth + 1)));
        return [...fonts, ...nested.flat()];
      } catch { return []; }
    }

    // ── Fetch HTML safely ──
    let html = '';
    try {
      const { buffer } = await safeExternalFetch(targetUrl.href, {
        maxBytes: 2 * 1024 * 1024,
        timeoutMs: 8000,
        allowedContentTypes: ['text/html', 'application/xhtml+xml'],
      });
      const decoder = new TextDecoder('utf-8');
      html = decoder.decode(buffer);
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: `Website fetch failed: ${err.message}` }), {
        status: 400,
        headers: corsHeaders
      });
    }

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
        allFonts.push({
          name: nm,
          family: nm.split('.')[0] || 'Unknown',
          format: fmt,
          url: resolved,
          weight: 'unknown',
          style: 'unknown',
          stretch: 'unknown',
          unicodeRange: 'unknown',
          variationSettings: 'unknown',
          isVariable: false,
          referer: targetUrl.href,
        });
      }
    }
    const linked = await Promise.all(cssUrls.map(u => fetchAndParseCss(u)));
    allFonts.push(...linked.flat().map(f => ({ ...f, referer: targetUrl.href })));

    // ── Deduplicate by (url + family + weight + style) ────────
    const fontMap = new Map();
    for (const f of allFonts) {
      const key = [
        f.url,
        (f.family || '').toLowerCase().trim(),
        f.weight,
        f.style,
        f.stretch,
        f.format,
        f.unicodeRange,
        f.variationSettings,
      ].join('|');
      if (!fontMap.has(key)) {
        fontMap.set(key, f);
      }
    }

    const deduplicatedFonts = Array.from(fontMap.values()).sort((a, b) => {
      const famComp = a.family.localeCompare(b.family);
      if (famComp !== 0) return famComp;
      const wgtComp = (a.weight || '').localeCompare(b.weight || '', undefined, { numeric: true });
      if (wgtComp !== 0) return wgtComp;
      return (a.style || '').localeCompare(b.style || '');
    });

    // Generate signed token for proxy URL
    const result = await Promise.all(
      deduplicatedFonts.map(async (f) => {
        if (f.url.startsWith('data:')) {
          return { ...f, proxyUrl: f.url };
        }
        const token = await signFontToken(f.url, secretStr, {
          audience: new URL(request.url).origin,
        });
        return {
          ...f,
          token,
          proxyUrl: `/api/font-proxy?token=${encodeURIComponent(token)}`
        };
      })
    );

    return new Response(JSON.stringify({ ok: true, fonts: result, total: result.length, sourceUrl: targetUrl.href }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (e) {
    console.error('[font-extractor]', e.message);
    return new Response(JSON.stringify({ ok: false, error: 'Extraction failed: ' + e.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
