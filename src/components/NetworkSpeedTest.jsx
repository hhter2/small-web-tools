import React, { useState, useEffect, useRef } from 'react';

// ─── Ping Test ───────────────────────────────────────────────────────────────
const runPingTest = async (signal) => {
  const pings = [];
  for (let i = 0; i < 4; i++) {
    if (signal.aborted) return null;
    const start = performance.now();
    try {
      const r = await fetch('https://speed.cloudflare.com/__down?bytes=0', {
        cache: 'no-store', signal,
      });
      await r.text();
      const elapsed = performance.now() - start;
      if (i > 0) pings.push(elapsed); // skip first (TCP warm-up)
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }
    // 80ms gap between pings
    if (i < 3) {
      await new Promise((res, rej) => {
        const t = setTimeout(res, 80);
        signal.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true });
      });
    }
  }
  return pings.length ? pings.reduce((a, b) => a + b) / pings.length : 0;
};

// ─── IP and ISP Lookup ────────────────────────────────────────────────────────
const fetchIpInfo = async () => {
  const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (isDev) {
    const res = await fetch('/api/iplookup');
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
      'https://api.ip.sb/geoip',
      (d) => ({
        ip: d.ip,
        org: d.isp || d.organization || '',
      })
    ),
    () => tryProvider(
      'https://ipapi.co/json/',
      (d) => {
        if (d.error) throw new Error(d.reason || 'ipapi.co error');
        return {
          ip: d.ip,
          org: d.org || '',
        };
      }
    ),
  ];

  let lastErr = null;
  for (const p of providers) {
    try { return await p(); } catch (e) { lastErr = e; }
  }
  throw new Error(`IP lookup failed: ${lastErr?.message}`);
};

// ─── Speed Test Data Size Configurations ──────────────────────────────────────
const DATA_CONFIG = {
  light: {
    downloadBytes: 30_000_000,
    downloadLabel: '30MB',
    uploadBytes: 8 * 1024 * 1024,
    uploadLabel: '8MB',
  },
  standard: {
    downloadBytes: 100_000_000,
    downloadLabel: '100MB',
    uploadBytes: 25 * 1024 * 1024,
    uploadLabel: '25MB',
  },
  heavy: {
    downloadBytes: 200_000_000,
    downloadLabel: '200MB',
    uploadBytes: 50 * 1024 * 1024,
    uploadLabel: '50MB',
  }
};

// ─── Time-boxed Download Test (streams for `durationMs` ms, then aborts) ────
const runDownloadTest = (durationMs, downloadBytes, onProgress, outerSignal) => {
  return new Promise((resolve, reject) => {
    const innerController = new AbortController();
    let bytes = 0;
    let startTime = null;
    const samples = [];
    let lastSample = 0;

    // abort inner when outer signals
    const onOuter = () => innerController.abort();
    outerSignal.addEventListener('abort', onOuter, { once: true });

    // stop after durationMs
    const timer = setTimeout(() => innerController.abort(), durationMs);

    fetch(`https://speed.cloudflare.com/__down?bytes=${downloadBytes}`, {
      cache: 'no-store',
      signal: innerController.signal,
    })
      .then(async (res) => {
        if (!res.body) throw new Error('ReadableStream not supported');
        const reader = res.body.getReader();
        startTime = performance.now();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          const now = performance.now();
          const elapsed = (now - startTime) / 1000;
          const speedMbps = elapsed > 0 ? (bytes * 8) / elapsed / (1024 * 1024) : 0;

          if (now - lastSample > 150) {
            samples.push(speedMbps);
            const timePct = (elapsed / (durationMs / 1000)) * 100;
            const bytesPct = (bytes / downloadBytes) * 100;
            onProgress({ bytes, elapsed, speedMbps, pct: Math.min(Math.max(timePct, bytesPct), 100) });
            lastSample = now;
          }
        }
      })
      .catch((e) => {
        if (e.name !== 'AbortError') { reject(e); return; }
        // expected – time limit hit or outer abort
      })
      .finally(() => {
        clearTimeout(timer);
        outerSignal.removeEventListener('abort', onOuter);
        if (outerSignal.aborted && bytes === 0) { reject(new DOMException('Aborted', 'AbortError')); return; }
        const totalElapsed = startTime ? (performance.now() - startTime) / 1000 : 0;
        const avgMbps = totalElapsed > 0 ? (bytes * 8) / totalElapsed / (1024 * 1024) : 0;
        resolve({ avgMbps, bytes, samples });
      });
  });
};

// ─── Time-boxed Upload Test (using chunked fetch POST to avoid CORS preflight) ───
const runUploadTest = async (durationMs, maxUploadBytes, onProgress, outerSignal) => {
  const startTime = performance.now();
  let totalBytes = 0;
  const samples = [];

  let currentChunkSize = 256 * 1024; // start with 256 KB
  const maxChunkSize = 4 * 1024 * 1024; // 4 MB max chunk size to avoid server limits
  const minChunkSize = 64 * 1024; // 64 KB min chunk size

  const innerController = new AbortController();
  const onOuter = () => innerController.abort();
  outerSignal.addEventListener('abort', onOuter, { once: true });

  try {
    while (performance.now() - startTime < durationMs && !outerSignal.aborted && totalBytes < maxUploadBytes) {
      const remainingBytes = maxUploadBytes - totalBytes;
      const nextChunkSize = Math.min(currentChunkSize, remainingBytes);

      // Build a text blob of nextChunkSize
      const data = new Uint8Array(nextChunkSize);
      const blob = new Blob([data], { type: 'text/plain' });

      const chunkStart = performance.now();

      // Perform the upload. Since method is POST and body is text/plain Blob,
      // this is a simple CORS request and does not trigger OPTIONS preflight.
      const response = await fetch('https://speed.cloudflare.com/__up', {
        method: 'POST',
        body: blob,
        cache: 'no-store',
        signal: innerController.signal,
      });

      if (!response.ok) {
        throw new Error('Upload server returned error status');
      }

      const chunkEnd = performance.now();
      const chunkDurationSec = (chunkEnd - chunkStart) / 1000;

      if (chunkDurationSec > 0) {
        const speedMbps = (nextChunkSize * 8) / chunkDurationSec / (1024 * 1024);
        samples.push(speedMbps);
        totalBytes += nextChunkSize;

        const elapsed = (chunkEnd - startTime) / 1000;
        const timePct = (elapsed / (durationMs / 1000)) * 100;
        const bytesPct = (totalBytes / maxUploadBytes) * 100;
        const pct = Math.min(Math.max(timePct, bytesPct), 100);

        onProgress({ bytes: totalBytes, elapsed, speedMbps, pct });

        // Dynamically adjust chunk size for the next request to target ~0.3 seconds upload duration
        const targetDuration = 0.3; // seconds
        let targetSize = Math.round((speedMbps * 1024 * 1024 * targetDuration) / 8);
        // Clamp the size
        currentChunkSize = Math.max(minChunkSize, Math.min(maxChunkSize, targetSize));
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError' && !outerSignal.aborted) {
      throw e;
    }
  } finally {
    outerSignal.removeEventListener('abort', onOuter);
  }

  const totalElapsed = (performance.now() - startTime) / 1000;
  const avgMbps = totalElapsed > 0 && totalBytes > 0 ? (totalBytes * 8) / totalElapsed / (1024 * 1024) : 0;

  return { avgMbps, bytes: totalBytes, samples };
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function NetworkSpeedTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | ping | download | upload | complete | error
  const [pingVal, setPingVal] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [avgDownloadSpeed, setAvgDownloadSpeed] = useState(null);
  const [avgUploadSpeed, setAvgUploadSpeed] = useState(null);
  const [error, setError] = useState(null);
  const [speedHistory, setSpeedHistory] = useState([]); // { phase, speed }[]
  const [clientIp, setClientIp] = useState(null);
  const [clientOrg, setClientOrg] = useState(null);
  const [dataLimit, setDataLimit] = useState('standard'); // light | standard | heavy

  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const startTest = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    setIsRunning(true);
    setPhase('ping');
    setError(null);
    setPingVal(null);
    setCurrentSpeed(0);
    setProgress(0);
    setAvgDownloadSpeed(null);
    setAvgUploadSpeed(null);
    setSpeedHistory([]);
    setClientIp(null);
    setClientOrg(null);

    // Fetch client IP and ISP in the background
    fetchIpInfo()
      .then(info => {
        setClientIp(info.ip);
        setClientOrg(info.org);
      })
      .catch(err => {
        console.warn('IP lookup failed:', err);
      });

    try {
      // 1. Ping
      const ping = await runPingTest(signal);
      setPingVal(ping);
      if (signal.aborted) return;

      // 2. Download (10 seconds)
      setPhase('download');
      setProgress(0);
      setCurrentSpeed(0);

      const config = DATA_CONFIG[dataLimit];

      const dl = await runDownloadTest(
        10_000,
        config.downloadBytes,
        ({ speedMbps, pct }) => {
          setCurrentSpeed(speedMbps);
          setProgress(pct);
          setSpeedHistory(prev => [...prev, { phase: 'download', speed: speedMbps }]);
        },
        signal,
      );
      setAvgDownloadSpeed(dl.avgMbps);
      if (signal.aborted) { setPhase('complete'); return; }

      // 3. Upload (10 seconds)
      setPhase('upload');
      setProgress(0);
      setCurrentSpeed(0);

      const ul = await runUploadTest(
        10_000,
        config.uploadBytes,
        ({ speedMbps, pct }) => {
          setCurrentSpeed(speedMbps);
          setProgress(pct);
          setSpeedHistory(prev => [...prev, { phase: 'upload', speed: speedMbps }]);
        },
        signal,
      );
      setAvgUploadSpeed(ul.avgMbps);
      setPhase('complete');

    } catch (err) {
      if (err.name === 'AbortError') {
        setPhase('complete'); // show whatever we've gathered
      } else {
        setError(err.message || 'An error occurred');
        setPhase('error');
      }
    } finally {
      setIsRunning(false);
      setCurrentSpeed(0);
      setProgress(0);
    }
  };

  const stopTest = () => abortRef.current?.abort();

  // ── Speedometer math ────────────────────────────────────────────────────────
  const maxScale = Math.max(100, Math.ceil(currentSpeed / 100) * 100);
  const ratio = Math.min(currentSpeed / maxScale, 1);
  const needleAngle = -120 + ratio * 240;
  const rad = (needleAngle * Math.PI) / 180;
  const needleLength = 55;
  const needleX = 100 + needleLength * Math.sin(rad);
  const needleY = 95  - needleLength * Math.cos(rad);

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = ((-120 + i * 24) * Math.PI) / 180;
    return {
      key: i,
      x1: 100 + 63 * Math.sin(a), y1: 95 - 63 * Math.cos(a),
      x2: 100 + 70 * Math.sin(a), y2: 95 - 70 * Math.cos(a),
    };
  });

  // ── Chart math ──────────────────────────────────────────────────────────────
  const peakSpeed = Math.max(...speedHistory.map(h => h.speed), 10);
  const chartW = 270, chartH = 90, chartX0 = 15, chartY0 = 15;

  const toXY = (idx, total, speed) => ({
    x: total > 1 ? chartX0 + (idx / (total - 1)) * chartW : chartX0,
    y: (chartY0 + chartH) - (speed / peakSpeed) * chartH,
  });

  const dlPoints = speedHistory
    .map((h, i) => ({ ...h, i }))
    .filter(h => h.phase === 'download');
  const ulPoints = speedHistory
    .map((h, i) => ({ ...h, i }))
    .filter(h => h.phase === 'upload');

  const total = speedHistory.length;
  const makePath = (pts) =>
    pts.length < 2 ? '' :
    'M ' + pts.map(({ i, speed }) => { const p = toXY(i, total, speed); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' L ');

  const dlPath = makePath(dlPoints);
  const ulPath = makePath(ulPoints);
  const areaBase = chartY0 + chartH;

  const allPts = speedHistory.map((h, i) => toXY(i, total, h.speed));
  const areaPath = allPts.length > 1
    ? `M ${chartX0},${areaBase} L ${allPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} L ${allPts[allPts.length - 1].x.toFixed(1)},${areaBase} Z`
    : '';

  const showViz = isRunning || phase === 'complete';

  return (
    <article id="tool-speedtest" className="tool-card active">
      <h2>Network Speed Test</h2>

      <p className="small note">
        Measures your real-time network download &amp; upload speed and server latency.
        Each phase runs for 10 seconds.
      </p>

      <div className="form-group" style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="data-limit-select" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>
            Test Size Limit
          </label>
          <select
            id="data-limit-select"
            value={dataLimit}
            onChange={(e) => setDataLimit(e.target.value)}
            disabled={isRunning}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              outline: 'none',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <option value="light">Light (30MB Down / 8MB Up)</option>
            <option value="standard">Standard (100MB Down / 25MB Up)</option>
            <option value="heavy">Heavy (200MB Down / 50MB Up)</option>
          </select>
        </div>

        <div>
          {isRunning ? (
            <button className="btn-primary" onClick={stopTest} type="button">Stop Test</button>
          ) : (
            <button className="btn-primary" onClick={startTest} type="button">Start Test</button>
          )}
        </div>
      </div>

      {/* ── Speedometer + Line Chart ── */}
      {showViz && (
        <div className="row" style={{ marginBottom: '20px', gap: '20px', alignItems: 'flex-start' }}>

          {/* Speedometer */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="0 0 200 140" style={{ width: '200px', height: 'auto' }}>
              {/* Track */}
              <path d="M 39.38,130 A 70,70 0 1,1 160.62,130"
                fill="none" stroke="var(--border-color)" strokeWidth="8" strokeLinecap="round" />
              {/* Speed arc (filled) */}
              {ratio > 0 && (() => {
                // compute arc end point at current needle angle
                const startRad = (-120 * Math.PI) / 180;
                const endRad = rad;
                const r = 70;
                const sx = 100 + r * Math.sin(startRad);
                const sy = 95  - r * Math.cos(startRad);
                const ex = 100 + r * Math.sin(endRad);
                const ey = 95  - r * Math.cos(endRad);
                const largeArc = ratio > 0.75 ? 1 : 0;
                return (
                  <path
                    d={`M ${sx.toFixed(2)},${sy.toFixed(2)} A 70,70 0 ${largeArc},1 ${ex.toFixed(2)},${ey.toFixed(2)}`}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                );
              })()}
              {/* Ticks */}
              {ticks.map(t => (
                <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke="var(--border-color)" strokeWidth="1.5" />
              ))}
              {/* Labels */}
              <text x="24"  y="137" fontSize="8" textAnchor="middle" fill="var(--text-muted)">0</text>
              <text x="100" y="18"  fontSize="8" textAnchor="middle" fill="var(--text-muted)">{Math.round(maxScale / 2)}</text>
              <text x="176" y="137" fontSize="8" textAnchor="middle" fill="var(--text-muted)">{maxScale}</text>
              {/* Needle */}
              <line x1="100" y1="95" x2={needleX.toFixed(2)} y2={needleY.toFixed(2)}
                stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="100" cy="95" r="7"   fill="var(--accent)" />
              <circle cx="100" cy="95" r="2.5" fill="var(--bg-card)" />
              {/* Speed text */}
              <text x="100" y="124" fontSize="13" fontWeight="700" textAnchor="middle"
                fill="var(--text-main)" id="speed-display">
                {currentSpeed.toFixed(1)} Mbps
              </text>
              <text x="100" y="135" fontSize="8" textAnchor="middle" fill="var(--text-muted)">
                {phase === 'download' ? '↓ Downloading' : phase === 'upload' ? '↑ Uploading' : 'Speed'}
              </text>
            </svg>
          </div>

          {/* Line Chart */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <svg viewBox="0 0 300 120" style={{ width: '100%', height: 'auto' }}>
              {/* Grid */}
              <line x1="15" y1="15"  x2="285" y2="15"  stroke="var(--border-color)" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="15" y1="60"  x2="285" y2="60"  stroke="var(--border-color)" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="15" y1="105" x2="285" y2="105" stroke="var(--border-color)" strokeWidth="0.8" />
              {/* Y labels */}
              <text x="10" y="18"  fontSize="7" textAnchor="end" fill="var(--text-muted)">{peakSpeed.toFixed(0)}</text>
              <text x="10" y="63"  fontSize="7" textAnchor="end" fill="var(--text-muted)">{(peakSpeed / 2).toFixed(0)}</text>
              <text x="10" y="108" fontSize="7" textAnchor="end" fill="var(--text-muted)">0</text>
              {/* Area fill */}
              {areaPath && <path d={areaPath} fill="var(--accent)" opacity="0.07" />}
              {/* Download line – solid */}
              {dlPath && (
                <path d={dlPath} fill="none" stroke="var(--accent)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              )}
              {/* Upload line – dashed */}
              {ulPath && (
                <path d={ulPath} fill="none" stroke="var(--accent)" strokeWidth="2"
                  strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="var(--accent)" strokeWidth="2" /></svg>
                Download
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" /></svg>
                Upload
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {(phase === 'download' || phase === 'upload') && (
        <div className="progress-container" style={{ marginBottom: '20px' }}>
          <div id="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Phase labels */}
      {phase === 'ping' && (
        <div className="loader-container" style={{ marginBottom: '20px' }}>
          <div className="spinner" />
          <span>Testing latency (ping)…</span>
        </div>
      )}
      {phase === 'download' && (
        <div className="loader-container" style={{ marginBottom: '20px' }}>
          <div className="spinner" />
          <span>Measuring download speed ({progress.toFixed(0)}%)…</span>
        </div>
      )}
      {phase === 'upload' && (
        <div className="loader-container" style={{ marginBottom: '20px' }}>
          <div className="spinner" />
          <span>Measuring upload speed ({progress.toFixed(0)}%)…</span>
        </div>
      )}

      {/* Results */}
      {phase === 'complete' && (
        <div className="results-container">
          <h3>Test Results</h3>
          {/* Row 1: Speed Performance Metrics */}
          <div className="row count-results" style={{ marginBottom: '16px' }}>
            <div className="result-box" style={{ flex: '1 1 180px' }}>
              <span className="result-label">↓ Avg Download</span>
              <span className="result-val">
                {avgDownloadSpeed != null ? `${avgDownloadSpeed.toFixed(2)} Mbps` : 'N/A'}
              </span>
            </div>
            <div className="result-box" style={{ flex: '1 1 180px' }}>
              <span className="result-label">↑ Avg Upload</span>
              <span className="result-val">
                {avgUploadSpeed != null ? `${avgUploadSpeed.toFixed(2)} Mbps` : 'N/A'}
              </span>
            </div>
            <div className="result-box" style={{ flex: '1 1 180px' }}>
              <span className="result-label">Latency (Ping)</span>
              <span className="result-val">
                {pingVal != null ? `${pingVal.toFixed(0)} ms` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Row 2: Connection Details */}
          <div className="row count-results">
            <div className="result-box" style={{ flex: '1 1 250px' }}>
              <span className="result-label">IP Address</span>
              <span className="result-val" style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                {clientIp || 'Fetching…'}
              </span>
            </div>
            <div className="result-box" style={{ flex: '1 1 250px' }}>
              <span className="result-label">Provider (ISP)</span>
              <span className="result-val" style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                {clientOrg || 'Fetching…'}
              </span>
            </div>
          </div>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>
      )}
    </article>
  );
}
