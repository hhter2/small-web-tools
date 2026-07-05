// Font Extractor API — POST /api/extract-fonts
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestPost(context) {
  const { request } = context;

  // Set up common CORS headers helper
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
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
      targetUrl = new URL(rawUrl);
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid URL format' }), {
        status: 400,
        headers: corsHeaders
      });
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
      return new Response(JSON.stringify({ ok: false, error: `Website returned HTTP ${htmlRes.status}` }), {
        status: 400,
        headers: corsHeaders
      });
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
