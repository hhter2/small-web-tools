import React, { useState } from 'react';

async function ipLookup(ip) {
  const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (isDev) {
    const qs = ip ? `?ip=${encodeURIComponent(ip.trim())}` : '';
    const res = await fetch(`/api/iplookup${qs}`);
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Server-side IP lookup failed');
    return result.data;
  }

  const tryProvider = async (url, normalize) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} returned ${r.status}`);
    return normalize(await r.json());
  };

  const providers = [
    () => tryProvider(
      ip ? `https://api.ip.sb/geoip/${ip}` : 'https://api.ip.sb/geoip',
      (d) => ({
        ip: d.ip, city: d.city || '', region: d.region || '',
        country_name: d.country || '', country_code: d.country_code || '',
        postal: '', org: d.isp || d.organization || '',
        asn: d.asn ? `AS${d.asn}` : '', timezone: d.timezone || '',
        utc_offset: '', latitude: d.latitude, longitude: d.longitude,
      })
    ),
    () => tryProvider(
      ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/',
      (d) => {
        if (d.error) throw new Error(d.reason || 'ipapi.co error');
        return {
          ip: d.ip, city: d.city || '', region: d.region || '',
          country_name: d.country_name || '', country_code: d.country_code || '',
          postal: d.postal || '', org: d.org || '', asn: d.asn || '',
          timezone: d.timezone || '', utc_offset: d.utc_offset || '',
          latitude: d.latitude, longitude: d.longitude,
        };
      }
    ),
  ];

  let lastErr = null;
  for (const p of providers) {
    try { return await p(); } catch (e) { lastErr = e; }
  }
  throw new Error(`IP lookup failed: ${lastErr?.message}`);
}

function getFlagEmoji(countryCode) {
  if (!countryCode) return "";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
}

export default function IpLookup() {
  const [ipInput, setIpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [copiedBtn, setCopiedBtn] = useState(null);
  const [result, setResult] = useState(null);

  const handleCopy = (val, key) => {
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      setCopiedBtn(key);
      setTimeout(() => setCopiedBtn(null), 1500);
    });
  };

  const doLookup = async () => {
    setLoading(true);
    setResult(null);
    setStatus('');

    try {
      const data = await ipLookup(ipInput);
      setResult(data);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render variables
  const showResults = result && !loading;

  let locationVal = '';
  let regionCountryVal = '';
  let timezoneVal = '';
  let coordsVal = '';
  let mapSrc = '';

  if (result) {
    const city = result.city || '';
    const postal = result.postal || '';
    locationVal = city && postal ? `${city} (${postal})` : (city || postal || "Unknown");

    const countryCode = result.country_code || '';
    const flag = getFlagEmoji(countryCode);
    const region = result.region || '';
    const country = result.country_name || '';
    regionCountryVal = `${region}${region && country ? ", " : ""}${country} ${flag}`.trim() || "Unknown";

    timezoneVal = result.timezone ? `${result.timezone} (UTC ${result.utc_offset || ""})` : "Unknown";

    if (result.latitude !== undefined && result.latitude !== null && result.longitude !== undefined && result.longitude !== null) {
      coordsVal = `${result.latitude}, ${result.longitude}`;
      const lat = result.latitude;
      const lon = result.longitude;
      mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.02}%2C${lon + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lon}`;
    } else {
      coordsVal = "Unknown";
    }
  }

  return (
    <article id="tool-iplookup" className="tool-card active">
      <h2>IP Address Lookup</h2>
      <div className="row">
        <div className="form-group flex-1">
          <label htmlFor="iplookup-input">IP Address</label>
          <div className="search-input-group">
            <input
              id="iplookup-input"
              type="text"
              placeholder="Enter IP address (leave blank for your current IP)..."
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  doLookup();
                }
              }}
            />
            <button
              id="iplookup-btn"
              type="button"
              className="btn-primary"
              onClick={doLookup}
              disabled={loading}
            >
              Lookup
            </button>
          </div>
        </div>
      </div>
      
      {loading && (
        <div id="iplookup-loader" className="loader-container">
          <div className="spinner"></div>
          <span>Fetching IP details...</span>
        </div>
      )}

      {showResults && (
        <div id="iplookup-results" className="results-container">
          <div className="iplookup-results-layout">
            <div className="grid-outputs">
              <div className="form-group">
                <div className="label-row-with-copy">
                  <label htmlFor="iplookup-res-ip">IP Address</label>
                  <button
                    className={`copy-btn-inline ${copiedBtn === 'ip' ? 'copied' : ''}`}
                    onClick={() => handleCopy(result.ip, 'ip')}
                  >
                    {copiedBtn === 'ip' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <input id="iplookup-res-ip" type="text" readOnly value={result.ip || "Unknown"} />
              </div>
              <div className="form-group">
                <div className="label-row-with-copy">
                  <label htmlFor="iplookup-res-location">Location (City / Zip)</label>
                  <button
                    className={`copy-btn-inline ${copiedBtn === 'location' ? 'copied' : ''}`}
                    onClick={() => handleCopy(locationVal, 'location')}
                  >
                    {copiedBtn === 'location' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <input id="iplookup-res-location" type="text" readOnly value={locationVal} />
              </div>
              <div className="form-group">
                <div className="label-row-with-copy">
                  <label htmlFor="iplookup-res-region-country">Region &amp; Country</label>
                  <button
                    className={`copy-btn-inline ${copiedBtn === 'regionCountry' ? 'copied' : ''}`}
                    onClick={() => handleCopy(regionCountryVal, 'regionCountry')}
                  >
                    {copiedBtn === 'regionCountry' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <input id="iplookup-res-region-country" type="text" readOnly value={regionCountryVal} />
              </div>
              <div className="form-group">
                <div className="label-row-with-copy">
                  <label htmlFor="iplookup-res-org">Organization (ISP)</label>
                  <button
                    className={`copy-btn-inline ${copiedBtn === 'org' ? 'copied' : ''}`}
                    onClick={() => handleCopy(result.org, 'org')}
                  >
                    {copiedBtn === 'org' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <input id="iplookup-res-org" type="text" readOnly value={result.org || "Unknown"} />
              </div>
              <div className="form-group">
                <div className="label-row-with-copy">
                  <label htmlFor="iplookup-res-timezone">Timezone</label>
                  <button
                    className={`copy-btn-inline ${copiedBtn === 'timezone' ? 'copied' : ''}`}
                    onClick={() => handleCopy(timezoneVal, 'timezone')}
                  >
                    {copiedBtn === 'timezone' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <input id="iplookup-res-timezone" type="text" readOnly value={timezoneVal} />
              </div>
              <div className="form-group">
                <div className="label-row-with-copy">
                  <label htmlFor="iplookup-res-coords">Coordinates</label>
                  <button
                    className={`copy-btn-inline ${copiedBtn === 'coords' ? 'copied' : ''}`}
                    onClick={() => handleCopy(coordsVal, 'coords')}
                  >
                    {copiedBtn === 'coords' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <input id="iplookup-res-coords" type="text" readOnly value={coordsVal} />
              </div>
            </div>

            {/* Interactive Map */}
            {mapSrc && (
              <div className="map-wrapper">
                <label>Map Preview</label>
                <div className="map-container">
                  <iframe
                    id="iplookup-map"
                    title="IP Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0, borderRadius: '10px' }}
                    allowFullScreen
                    src={mapSrc}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status && <p className="small status-msg" id="iplookup-status">{status}</p>}
    </article>
  );
}
