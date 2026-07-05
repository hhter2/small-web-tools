// Server-side geo lookup — runs on Cloudflare Pages, bypasses browser network restrictions
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

export async function onRequestGet(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const ip = (urlObj.searchParams.get('ip') || '').trim();

  // If no IP parameter is requested, we can use request.cf to optimize speed and bypass limits
  if (!ip && request.cf) {
    const cf = request.cf;
    const clientIp = request.headers.get('cf-connecting-ip') || '';
    return new Response(JSON.stringify({
      ok: true,
      data: {
        ip: clientIp,
        city: cf.city || '',
        region: cf.region || '',
        country_name: cf.country || '',
        country_code: cf.country || '',
        postal: cf.postalCode || '',
        org: cf.asOrganization || '',
        asn: cf.asn ? `AS${cf.asn}` : '',
        timezone: cf.timezone || '',
        utc_offset: '',
        latitude: cf.latitude ? parseFloat(cf.latitude) : null,
        longitude: cf.longitude ? parseFloat(cf.longitude) : null,
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const data = await geoLookup(ip);
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    console.error('[ip-lookup] all providers failed:', e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
