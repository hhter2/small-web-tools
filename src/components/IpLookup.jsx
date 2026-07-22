import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ToolHeader from './ui/ToolHeader';
import { hasConsent, grantConsent } from '../lib/thirdPartyServices';

function isValidIp(str) {
  if (!str || !str.trim()) return true;
  const trimmed = str.trim();
  if (trimmed.length > 45 || /[/\s?#%]/g.test(trimmed)) return false;
  const ipv4 = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6 = /^(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv4.test(trimmed) || ipv6.test(trimmed);
}

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
      ip ? `https://api.ip.sb/geoip/${encodeURIComponent(ip.trim())}` : 'https://api.ip.sb/geoip',
      (d) => ({
        ip: d.ip, city: d.city || '', region: d.region || '',
        country_name: d.country || '', country_code: d.country_code || '',
        postal: '', org: d.isp || d.organization || '',
        asn: d.asn ? `AS${d.asn}` : '', timezone: d.timezone || '',
        utc_offset: '', latitude: d.latitude, longitude: d.longitude,
      })
    ),
    () => tryProvider(
      ip ? `https://ipapi.co/${encodeURIComponent(ip.trim())}/json/` : 'https://ipapi.co/json/',
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

function CopyBtn({ value, copiedKey, thisKey, onCopy }) {
  const isCopied = copiedKey === thisKey;
  return (
    <button
      type="button"
      onClick={() => onCopy(value, thisKey)}
      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 leading-none border
        ${isCopied
          ? 'bg-[#10b981] text-white border-[#10b981]'
          : 'bg-accent-light text-accent border-accent/15 hover:bg-accent hover:text-white hover:border-accent'
        }`}
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function IpLookup() {
  const [ipInput, setIpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [copiedBtn, setCopiedBtn] = useState(null);
  const [result, setResult] = useState(null);
  const [mapAllowed, setMapAllowed] = useState(() => hasConsent('osm'));

  useEffect(() => {
    const handleConsentUpdate = () => setMapAllowed(hasConsent('osm'));
    window.addEventListener('consent_updated', handleConsentUpdate);
    return () => window.removeEventListener('consent_updated', handleConsentUpdate);
  }, []);

  const handleCopy = (val, key) => {
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      setCopiedBtn(key);
      setTimeout(() => setCopiedBtn(null), 1500);
    });
  };

  const doLookup = async () => {
    if (ipInput.trim() && !isValidIp(ipInput)) {
      setStatus('Error: Invalid IP address format. Please enter a valid IPv4 or IPv6 address.');
      setResult(null);
      return;
    }

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

  const showResults = result && !loading;

  let locationVal = '';
  let regionCountryVal = '';
  let timezoneVal = '';
  let coordsVal = '';
  let mapSrc = '';
  let googleMapsUrl = '';

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
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    } else {
      coordsVal = "Unknown";
    }
  }

  return (
    <Card id="tool-iplookup" variant="tool" size="wide">
      <ToolHeader title="IP Address Lookup" />
      <div className="flex flex-col gap-2 w-full">
        <label htmlFor="iplookup-input" className="text-sm font-semibold text-text-main">IP Address</label>
        <div className="flex gap-3 w-full">
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
            className="flex-1 px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none transition-all duration-200 hover:border-border-hover focus:border-accent focus:ring-2 focus:ring-focus focus:bg-card"
          />
          <Button
            id="iplookup-btn"
            type="button"
            variant="primary"
            onClick={doLookup}
            disabled={loading}
          >
            Lookup
          </Button>
        </div>
      </div>

      {loading && (
        <div id="iplookup-loader" className="flex flex-col items-center justify-center gap-3 py-6">
          <div className="w-10 h-10 border-4 border-border border-t-accent rounded-full animate-spin" />
          <span>Fetching IP details...</span>
        </div>
      )}

      {showResults && (
        <div id="iplookup-results" className="w-full">
          <div className="grid grid-cols-[1.2fr_1fr] gap-6 w-full max-[900px]:grid-cols-1 max-[900px]:gap-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'iplookup-res-ip', label: 'IP Address', val: result.ip || "Unknown", copyKey: 'ip' },
                { id: 'iplookup-res-location', label: 'Location (City / Zip)', val: locationVal, copyKey: 'location' },
                { id: 'iplookup-res-region-country', label: 'Region & Country', val: regionCountryVal, copyKey: 'regionCountry' },
                { id: 'iplookup-res-org', label: 'Organization (ISP)', val: result.org || "Unknown", copyKey: 'org' },
                { id: 'iplookup-res-timezone', label: 'Timezone', val: timezoneVal, copyKey: 'timezone' },
                { id: 'iplookup-res-coords', label: 'Coordinates', val: coordsVal, copyKey: 'coords' },
              ].map(({ id, label, val, copyKey }) => (
                <div key={copyKey} className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center mb-0.5">
                    <label htmlFor={id} className="text-sm font-semibold text-text-main">{label}</label>
                    <CopyBtn value={val} copiedKey={copiedBtn} thisKey={copyKey} onCopy={handleCopy} />
                  </div>
                  <input
                    id={id}
                    type="text"
                    readOnly
                    value={val}
                    className="w-full px-3.5 py-2.5 text-[0.92rem] rounded border border-border bg-app text-text-main outline-none read-only:opacity-80"
                  />
                </div>
              ))}
            </div>

            {/* Interactive Map Section */}
            {mapSrc && (
              <div className="flex flex-col gap-2 w-full h-full">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-text-main">Map Preview</label>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      External Map ↗ (Leaves Site)
                    </a>
                  )}
                </div>
                <div className="rounded-xl overflow-hidden border border-border bg-app flex-1 min-h-[250px] flex items-center justify-center p-4">
                  {mapAllowed ? (
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
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center p-4">
                      <span className="text-sm text-text-main font-semibold">🗺️ OpenStreetMap Preview</span>
                      <p className="text-xs text-text-muted max-w-[260px]">
                        Loading map tiles sends tile requests to OpenStreetMap Foundation.
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => grantConsent('osm')}
                        className="text-xs"
                      >
                        Enable Map Preview
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status && <p className="min-h-[18px] text-red-500 font-medium text-sm mt-2" id="iplookup-status">{status}</p>}
    </Card>
  );
}
