import React, { useState, useEffect, useRef } from 'react';
import Card from './ui/Card';
import ToolHeader from './ui/ToolHeader';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import ResultDisplay from './ui/ResultDisplay';

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
    let warmUpBytes = 0;
    let warmUpTime = 0;
    let isWarmedUp = false;

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

          if (!isWarmedUp) {
            if (elapsed >= 0.5) {
              warmUpBytes = bytes;
              warmUpTime = elapsed;
              isWarmedUp = true;
            }
            continue;
          }

          const activeElapsed = elapsed - warmUpTime;
          const activeBytes = bytes - warmUpBytes;
          const speedMbps = activeElapsed > 0 ? (activeBytes * 8) / activeElapsed / (1024 * 1024) : 0;

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
        const activeElapsed = totalElapsed - warmUpTime;
        const activeBytes = bytes - warmUpBytes;
        const avgMbps = isWarmedUp && activeElapsed > 0 && activeBytes > 0
          ? (activeBytes * 8) / activeElapsed / (1024 * 1024)
          : (totalElapsed > 0 ? (bytes * 8) / totalElapsed / (1024 * 1024) : 0);
        resolve({ avgMbps, bytes, samples });
      });
  });
};

// ─── Time-boxed Upload Test (using chunked fetch POST to avoid CORS preflight) ───
const runUploadTest = async (durationMs, maxUploadBytes, onProgress, outerSignal) => {
  const startTime = performance.now();
  let totalBytes = 0;
  const samples = [];
  let warmUpBytes = 0;
  let warmUpTime = 0;
  let isWarmedUp = false;

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
      totalBytes += nextChunkSize;

      const elapsed = (chunkEnd - startTime) / 1000;

      if (!isWarmedUp) {
        if (elapsed >= 0.5) {
          warmUpBytes = totalBytes;
          warmUpTime = elapsed;
          isWarmedUp = true;
        }
        continue;
      }

      if (chunkDurationSec > 0) {
        const activeElapsed = elapsed - warmUpTime;
        const activeBytes = totalBytes - warmUpBytes;
        const speedMbps = activeElapsed > 0 ? (activeBytes * 8) / activeElapsed / (1024 * 1024) : 0;

        samples.push(speedMbps);

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
  const activeElapsed = totalElapsed - warmUpTime;
  const activeBytes = totalBytes - warmUpBytes;
  const avgMbps = isWarmedUp && activeElapsed > 0 && activeBytes > 0
    ? (activeBytes * 8) / activeElapsed / (1024 * 1024)
    : (totalElapsed > 0 && totalBytes > 0 ? (totalBytes * 8) / totalElapsed / (1024 * 1024) : 0);

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
  const [dataLimit, setDataLimit] = useState('standard'); // light | standard | heavy | custom
  const [customDownload, setCustomDownload] = useState(100);
  const [customUpload, setCustomUpload] = useState(25);

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

      let downloadBytes = 100_000_000;
      let uploadBytes = 25 * 1024 * 1024;

      if (dataLimit === 'custom') {
        const dlMB = parseFloat(customDownload) || 100;
        const ulMB = parseFloat(customUpload) || 25;
        downloadBytes = Math.round(dlMB * 1024 * 1024);
        uploadBytes = Math.round(ulMB * 1024 * 1024);
      } else {
        const config = DATA_CONFIG[dataLimit];
        downloadBytes = config.downloadBytes;
        uploadBytes = config.uploadBytes;
      }

      const dl = await runDownloadTest(
        10_000,
        downloadBytes,
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
        uploadBytes,
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

  // ── Chart math (Separate Download and Upload) ────────────────────────────────
  const chartW = 260, chartH = 70, chartX0 = 25, chartY0 = 10;
  const areaBase = chartY0 + chartH;

  const makeChartData = (points, peak) => {
    const total = points.length;
    const pts = points.map((p, idx) => {
      const x = total > 1 ? chartX0 + (idx / (total - 1)) * chartW : chartX0;
      const y = areaBase - (p.speed / peak) * chartH;
      return { x, y };
    });

    const linePath = pts.length < 2 ? '' : 'M ' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
    const areaPath = pts.length > 1
      ? `M ${chartX0},${areaBase} L ${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} L ${pts[pts.length - 1].x.toFixed(1)},${areaBase} Z`
      : '';

    return { linePath, areaPath, pts };
  };

  const dlPoints = speedHistory.filter(h => h.phase === 'download');
  const peakDl = Math.max(...dlPoints.map(h => h.speed), 10);
  const dlChart = makeChartData(dlPoints, peakDl);

  const ulPoints = speedHistory.filter(h => h.phase === 'upload');
  const peakUl = Math.max(...ulPoints.map(h => h.speed), 10);
  const ulChart = makeChartData(ulPoints, peakUl);

  const showViz = isRunning || phase === 'complete';

  return (
    <Card id="tool-speedtest" variant="tool" size="wide">
      <ToolHeader 
        title="Network Speed Test" 
      />

      <div className="flex flex-row flex-wrap gap-4 items-end justify-start mb-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="data-limit-select" className="text-xs font-bold text-text-muted">
            Test Size Limit
          </label>
          <select
            id="data-limit-select"
            value={dataLimit}
            onChange={(e) => setDataLimit(e.target.value)}
            disabled={isRunning}
            className="px-3 py-2 rounded-md border border-border bg-card text-text-main outline-none text-sm disabled:cursor-not-allowed cursor-pointer"
          >
            <option value="light">Light (30MB Down / 8MB Up)</option>
            <option value="standard">Standard (100MB Down / 25MB Up)</option>
            <option value="heavy">Heavy (200MB Down / 50MB Up)</option>
            <option value="custom">Custom Size…</option>
          </select>
        </div>

        {dataLimit === 'custom' && (
          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-down-input" className="text-xs font-bold text-text-muted">
                Download (MB)
              </label>
              <input
                id="custom-down-input"
                type="number"
                min="1"
                max="1000"
                value={customDownload}
                onChange={(e) => setCustomDownload(e.target.value)}
                disabled={isRunning}
                className="px-3 py-2 rounded-md border border-border bg-card text-text-main outline-none w-[95px] text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="custom-up-input" className="text-xs font-bold text-text-muted">
                Upload (MB)
              </label>
              <input
                id="custom-up-input"
                type="number"
                min="1"
                max="1000"
                value={customUpload}
                onChange={(e) => setCustomUpload(e.target.value)}
                disabled={isRunning}
                className="px-3 py-2 rounded-md border border-border bg-card text-text-main outline-none w-[95px] text-sm"
              />
            </div>
          </div>
        )}

        <div>
          {isRunning ? (
            <Button variant="primary" onClick={stopTest}>Stop Test</Button>
          ) : (
            <Button variant="primary" onClick={startTest}>Start Test</Button>
          )}
        </div>
      </div>

      {/* ── Speedometer + Line Charts ── */}
      {showViz && (
        <div className="flex flex-col md:flex-row gap-4 w-full mb-5 items-stretch">

          {/* Speedometer Box */}
          <div className="flex-[2_1_280px] flex flex-col items-center justify-center bg-card rounded-md border border-border p-3">
            <svg viewBox="0 0 200 140" style={{ width: '100%', height: 'auto', maxHeight: '150px' }}>
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
                    stroke={phase === 'download' ? '#3b82f6' : phase === 'upload' ? '#ef4444' : 'var(--accent)'}
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
                stroke={phase === 'download' ? '#3b82f6' : phase === 'upload' ? '#ef4444' : 'var(--accent)'}
                strokeWidth="3" strokeLinecap="round" />
              <circle cx="100" cy="95" r="7"
                fill={phase === 'download' ? '#3b82f6' : phase === 'upload' ? '#ef4444' : 'var(--accent)'} />
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

          {/* Download Speed Chart */}
          <div className="flex-[2_1_280px] flex flex-col gap-1 bg-card rounded-md border border-border p-3">
            <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-wider">
              ↓ Download Speed ({peakDl.toFixed(1)} Mbps max)
            </span>
            <div className="flex-1 flex items-center">
              <svg viewBox="0 0 300 90" style={{ width: '100%', height: 'auto' }}>
                {/* Grid */}
                <line x1="25" y1="10"  x2="285" y2="10"  stroke="var(--border-color)" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="25" y1="45"  x2="285" y2="45"  stroke="var(--border-color)" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="25" y1="80"  x2="285" y2="80"  stroke="var(--border-color)" strokeWidth="0.8" />
                {/* Y labels */}
                <text x="20" y="13"  fontSize="7" textAnchor="end" fill="var(--text-muted)">{peakDl.toFixed(0)}</text>
                <text x="20" y="48"  fontSize="7" textAnchor="end" fill="var(--text-muted)">{(peakDl / 2).toFixed(0)}</text>
                <text x="20" y="83"  fontSize="7" textAnchor="end" fill="var(--text-muted)">0</text>
                {/* Area fill */}
                {dlChart.areaPath && <path d={dlChart.areaPath} fill="#3b82f6" opacity="0.08" />}
                {/* Line */}
                {dlChart.linePath && (
                  <path d={dlChart.linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
          </div>

          {/* Upload Speed Chart */}
          <div className="flex-[2_1_280px] flex flex-col gap-1 bg-card rounded-md border border-border p-3">
            <span className="text-[0.72rem] font-bold text-text-muted uppercase tracking-wider">
              ↑ Upload Speed ({peakUl.toFixed(1)} Mbps max)
            </span>
            <div className="flex-1 flex items-center">
              <svg viewBox="0 0 300 90" style={{ width: '100%', height: 'auto' }}>
                {/* Grid */}
                <line x1="25" y1="10"  x2="285" y2="10"  stroke="var(--border-color)" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="25" y1="45"  x2="285" y2="45"  stroke="var(--border-color)" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="25" y1="80"  x2="285" y2="80"  stroke="var(--border-color)" strokeWidth="0.8" />
                {/* Y labels */}
                <text x="20" y="13"  fontSize="7" textAnchor="end" fill="var(--text-muted)">{peakUl.toFixed(0)}</text>
                <text x="20" y="48"  fontSize="7" textAnchor="end" fill="var(--text-muted)">{(peakUl / 2).toFixed(0)}</text>
                <text x="20" y="83"  fontSize="7" textAnchor="end" fill="var(--text-muted)">0</text>
                {/* Area fill */}
                {ulChart.areaPath && <path d={ulChart.areaPath} fill="#ef4444" opacity="0.08" />}
                {/* Line */}
                {ulChart.linePath && (
                  <path d={ulChart.linePath} fill="none" stroke="#ef4444" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
          </div>

        </div>
      )}

      {/* Progress bar */}
      {(phase === 'download' || phase === 'upload') && (
        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden mb-5">
          <div style={{
            width: `${progress}%`,
            background: phase === 'download' ? '#3b82f6' : '#ef4444',
          }} className="h-full transition-all duration-100" />
        </div>
      )}

      {/* Phase labels */}
      {phase === 'ping' && (
        <Spinner container label="Testing latency (ping)…" className="mb-5" />
      )}
      {phase === 'download' && (
        <Spinner container label={`Measuring download speed (${progress.toFixed(0)}%)…`} className="mb-5" />
      )}
      {phase === 'upload' && (
        <Spinner container label={`Measuring upload speed (${progress.toFixed(0)}%)…`} className="mb-5" />
      )}

      {/* Results */}
      {phase === 'complete' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-text-main">Test Results</h3>
          {/* Row 1: Speed Performance Metrics */}
          <div className="flex flex-col md:flex-row gap-4 w-full mb-4">
            <ResultDisplay
              label="↓ Avg Download"
              value={avgDownloadSpeed != null ? `${avgDownloadSpeed.toFixed(2)} Mbps` : 'N/A'}
              className="flex-[1_1_180px]"
            />
            <ResultDisplay
              label="↑ Avg Upload"
              value={avgUploadSpeed != null ? `${avgUploadSpeed.toFixed(2)} Mbps` : 'N/A'}
              className="flex-[1_1_180px]"
            />
            <ResultDisplay
              label="Latency (Ping)"
              value={pingVal != null ? `${pingVal.toFixed(0)} ms` : 'N/A'}
              className="flex-[1_1_180px]"
            />
          </div>

          {/* Row 2: Connection Details */}
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <ResultDisplay
              label="IP Address"
              value={clientIp || 'Fetching…'}
              className="flex-[1_1_250px]"
              valueClassName="text-[1.25rem] font-bold"
            />
            <ResultDisplay
              label="Provider (ISP)"
              value={clientOrg || 'Fetching…'}
              className="flex-[1_1_250px]"
              valueClassName="text-[1.25rem] font-bold"
            />
          </div>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="text-red-500 font-semibold p-4 rounded bg-red-500/10 border border-red-500/20 mb-5">{error}</div>
      )}
    </Card>
  );
}

