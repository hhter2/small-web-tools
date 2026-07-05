import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// ── Supported format labels for display ──────────────────────────────────────
const FORMAT_LABELS = {
  QR_CODE: 'QR Code',
  DATA_MATRIX: 'Data Matrix',
  AZTEC: 'Aztec',
  PDF_417: 'PDF 417',
  CODE_128: 'Code 128',
  CODE_39: 'Code 39',
  CODE_93: 'Code 93',
  EAN_13: 'EAN-13',
  EAN_8: 'EAN-8',
  UPC_A: 'UPC-A',
  UPC_E: 'UPC-E',
  ITF: 'ITF',
  RSS_14: 'RSS 14',
  RSS_EXPANDED: 'RSS Expanded',
  CODABAR: 'Codabar',
  MAXICODE: 'MaxiCode',
};

// ── Play a retro beep sound using the Web Audio API ──────────────────────────
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1046, ctx.currentTime); // C6
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.12);
  } catch (_) {
    // Audio API not available — silently skip
  }
};

// ── Parse structured QR payload types ────────────────────────────────────────
const parseQRPayload = (text) => {
  if (!text) return { type: 'text', raw: text };

  // URL
  if (/^https?:\/\//i.test(text) || /^ftp:\/\//i.test(text)) {
    return { type: 'url', raw: text, url: text };
  }

  // WiFi: WIFI:S:<SSID>;T:<Auth>;P:<Password>;H:<Hidden>;;
  const wifiMatch = text.match(/^WIFI:(?:.*?S:(.*?);)?(?:.*?T:(.*?);)?(?:.*?P:(.*?);)?(?:.*?H:(.*?);)?/i);
  if (wifiMatch && text.toUpperCase().startsWith('WIFI:')) {
    const ssid = (wifiMatch[1] || '').replace(/\\(.)/g, '$1');
    const security = wifiMatch[2] || 'nopass';
    const password = (wifiMatch[3] || '').replace(/\\(.)/g, '$1');
    const hidden = wifiMatch[4] === 'true';
    return { type: 'wifi', raw: text, ssid, security, password, hidden };
  }

  // Email: mailto:...
  if (/^mailto:/i.test(text)) {
    const url = new URL(text.replace(/^mailto:/i, 'mailto:'));
    const to = url.pathname || '';
    const subject = url.searchParams.get('subject') || '';
    const body = url.searchParams.get('body') || '';
    return { type: 'email', raw: text, to, subject, body };
  }

  // Phone: tel:...
  if (/^tel:/i.test(text)) {
    const phone = text.replace(/^tel:/i, '').trim();
    return { type: 'phone', raw: text, phone };
  }

  // SMS: sms:...
  if (/^sms:/i.test(text)) {
    const parts = text.replace(/^sms:/i, '').split('?');
    const phone = parts[0] || '';
    const bodyMatch = (parts[1] || '').match(/body=([^&]*)/);
    const message = bodyMatch ? decodeURIComponent(bodyMatch[1]) : '';
    return { type: 'sms', raw: text, phone, message };
  }

  return { type: 'text', raw: text };
};

// ── Content-Aware Result Widget ───────────────────────────────────────────────
function ResultWidget({ parsed }) {
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const { type } = parsed;

  if (type === 'url') {
    return (
      <div className="qrscan-result-widget qrscan-url-widget">
        <div className="qrscan-widget-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div className="qrscan-widget-content">
          <div className="qrscan-widget-label">URL Detected</div>
          <div className="qrscan-widget-value qrscan-url-text">{parsed.url}</div>
          <div className="qrscan-widget-actions">
            <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="qrscan-action-btn qrscan-action-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open Link
            </a>
            <button className="qrscan-action-btn" onClick={() => copyText(parsed.url)}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'wifi') {
    return (
      <div className="qrscan-result-widget qrscan-wifi-widget">
        <div className="qrscan-widget-icon qrscan-wifi-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
        </div>
        <div className="qrscan-widget-content">
          <div className="qrscan-widget-label">Wi-Fi Network</div>
          <div className="qrscan-wifi-table">
            <div className="qrscan-wifi-row">
              <span className="qrscan-wifi-key">Network (SSID)</span>
              <span className="qrscan-wifi-val">{parsed.ssid || '(hidden)'}</span>
            </div>
            <div className="qrscan-wifi-row">
              <span className="qrscan-wifi-key">Security</span>
              <span className="qrscan-wifi-val">{parsed.security || 'None'}</span>
            </div>
            {parsed.password && (
              <div className="qrscan-wifi-row">
                <span className="qrscan-wifi-key">Password</span>
                <span className="qrscan-wifi-val qrscan-wifi-pass-row">
                  <span className="qrscan-wifi-password">
                    {showPassword ? parsed.password : '•'.repeat(parsed.password.length)}
                  </span>
                  <button className="qrscan-icon-btn" onClick={() => setShowPassword(v => !v)} title={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                  <button className="qrscan-icon-btn" onClick={() => copyText(parsed.password)} title="Copy Password">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </span>
              </div>
            )}
            {parsed.hidden && (
              <div className="qrscan-wifi-row">
                <span className="qrscan-wifi-key">Hidden</span>
                <span className="qrscan-wifi-val">Yes</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'email') {
    return (
      <div className="qrscan-result-widget qrscan-email-widget">
        <div className="qrscan-widget-icon qrscan-email-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div className="qrscan-widget-content">
          <div className="qrscan-widget-label">Email Detected</div>
          <div className="qrscan-email-table">
            {parsed.to && <div className="qrscan-email-row"><span className="qrscan-email-key">To</span><span className="qrscan-email-val">{parsed.to}</span></div>}
            {parsed.subject && <div className="qrscan-email-row"><span className="qrscan-email-key">Subject</span><span className="qrscan-email-val">{parsed.subject}</span></div>}
            {parsed.body && <div className="qrscan-email-row"><span className="qrscan-email-key">Body</span><span className="qrscan-email-val">{parsed.body}</span></div>}
          </div>
          <div className="qrscan-widget-actions">
            <a href={parsed.raw} className="qrscan-action-btn qrscan-action-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Compose Email
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'phone') {
    return (
      <div className="qrscan-result-widget qrscan-phone-widget">
        <div className="qrscan-widget-icon qrscan-phone-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.95a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/>
          </svg>
        </div>
        <div className="qrscan-widget-content">
          <div className="qrscan-widget-label">Phone Number</div>
          <div className="qrscan-widget-value">{parsed.phone}</div>
          <div className="qrscan-widget-actions">
            <a href={parsed.raw} className="qrscan-action-btn qrscan-action-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/>
              </svg>
              Call
            </a>
            <button className="qrscan-action-btn" onClick={() => copyText(parsed.phone)}>
              {copied ? 'Copied!' : 'Copy Number'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'sms') {
    return (
      <div className="qrscan-result-widget qrscan-sms-widget">
        <div className="qrscan-widget-icon qrscan-sms-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div className="qrscan-widget-content">
          <div className="qrscan-widget-label">SMS Message</div>
          <div className="qrscan-email-table">
            {parsed.phone && <div className="qrscan-email-row"><span className="qrscan-email-key">To</span><span className="qrscan-email-val">{parsed.phone}</span></div>}
            {parsed.message && <div className="qrscan-email-row"><span className="qrscan-email-key">Message</span><span className="qrscan-email-val">{parsed.message}</span></div>}
          </div>
          <div className="qrscan-widget-actions">
            <a href={parsed.raw} className="qrscan-action-btn qrscan-action-primary">Send SMS</a>
          </div>
        </div>
      </div>
    );
  }

  // Default: plain text
  return (
    <div className="qrscan-result-widget qrscan-text-widget">
      <div className="qrscan-widget-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="17" y1="10" x2="3" y2="10"/>
          <line x1="21" y1="6" x2="3" y2="6"/>
          <line x1="21" y1="14" x2="3" y2="14"/>
          <line x1="17" y1="18" x2="3" y2="18"/>
        </svg>
      </div>
      <div className="qrscan-widget-content">
        <div className="qrscan-widget-label">Text / Data</div>
        <pre className="qrscan-text-pre">{parsed.raw}</pre>
        <div className="qrscan-widget-actions">
          <button className="qrscan-action-btn qrscan-action-primary" onClick={() => copyText(parsed.raw)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Scanner Component ────────────────────────────────────────────────────
const SCAN_MODE_CAMERA = 'camera';
const SCAN_MODE_FILE = 'file';
const READER_ID = 'qrscan-camera-reader';

export default function QrBarcodeScanner() {
  const [scanMode, setScanMode] = useState(SCAN_MODE_CAMERA);

  // Camera state
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [permissionRequested, setPermissionRequested] = useState(false);

  // File state
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [fileScanning, setFileScanning] = useState(false);

  // Result state
  const [lastResult, setLastResult] = useState(null); // { text, format }
  const [history, setHistory] = useState([]);

  const html5QrcodeRef = useRef(null);
  const scannerMountedRef = useRef(false);
  const fileInputRef = useRef(null);

  // ── Cleanup scanner on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && scannerMountedRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
        scannerMountedRef.current = false;
      }
    };
  }, []);

  // ── Stop camera when switching scan mode ───────────────────────────────────
  const switchMode = (mode) => {
    if (mode === scanMode) return;
    if (isScanning) {
      stopScanning();
    }
    setScanMode(mode);
    setLastResult(null);
    setFilePreviewUrl(null);
    setFileError(null);
    setCameraError(null);
  };

  // ── Handle successful scan ─────────────────────────────────────────────────
  const onScanSuccess = useCallback((decodedText, decodedResult) => {
    // Prevent duplicate consecutive results
    setLastResult(prev => {
      if (prev && prev.text === decodedText) return prev;
      playBeep();
      const format = decodedResult?.result?.format?.formatName || 'Unknown';
      const newResult = { text: decodedText, format };
      setHistory(h => [newResult, ...h].slice(0, 10));
      return newResult;
    });
  }, []);

  // ── Request camera permission & list cameras ───────────────────────────────
  const requestCamerasAndStart = async () => {
    setCameraError(null);
    setPermissionRequested(true);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('No cameras detected on this device.');
        return;
      }
      setCameras(devices);
      // Prefer back camera on mobile
      const backCamera = devices.find(d =>
        /back|rear|environment/i.test(d.label)
      );
      const preferredId = backCamera ? backCamera.id : devices[0].id;
      setSelectedCamera(preferredId);
      startScanning(preferredId);
    } catch (err) {
      setCameraError(`Camera access denied: ${err?.message || err}`);
    }
  };

  // ── Start camera scanning ──────────────────────────────────────────────────
  const startScanning = async (cameraId) => {
    if (isScanning) return;
    const readerEl = document.getElementById(READER_ID);
    if (!readerEl) return;

    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode(READER_ID, { verbose: false });
      }
      await html5QrcodeRef.current.start(
        cameraId || selectedCamera || { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onScanSuccess,
        () => {} // ignore per-frame errors
      );
      scannerMountedRef.current = true;
      setIsScanning(true);
      setCameraError(null);
    } catch (err) {
      setCameraError(`Failed to start camera: ${err?.message || err}`);
    }
  };

  // ── Stop camera scanning ───────────────────────────────────────────────────
  const stopScanning = async () => {
    if (!html5QrcodeRef.current || !scannerMountedRef.current) return;
    try {
      await html5QrcodeRef.current.stop();
      scannerMountedRef.current = false;
      setIsScanning(false);
    } catch (_) {
      setIsScanning(false);
      scannerMountedRef.current = false;
    }
  };

  // ── Change selected camera ─────────────────────────────────────────────────
  const handleCameraChange = async (e) => {
    const newId = e.target.value;
    setSelectedCamera(newId);
    if (isScanning) {
      await stopScanning();
      // Brief timeout to allow DOM cleanup
      setTimeout(() => startScanning(newId), 200);
    }
  };

  // ── File scanning ──────────────────────────────────────────────────────────
  const scanFile = async (file) => {
    if (!file) return;
    if (!/^image\//i.test(file.type)) {
      setFileError('Please select an image file (JPEG, PNG, GIF, WebP, BMP, etc.).');
      return;
    }
    setFileError(null);
    setLastResult(null);
    setFileScanning(true);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);

    try {
      // Create a temporary, off-screen div for Html5Qrcode file scanning
      let tempDiv = document.getElementById('qrscan-file-reader-temp');
      if (!tempDiv) {
        tempDiv = document.createElement('div');
        tempDiv.id = 'qrscan-file-reader-temp';
        tempDiv.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
        document.body.appendChild(tempDiv);
      }

      const fileScanner = new Html5Qrcode('qrscan-file-reader-temp', { verbose: false });
      const result = await fileScanner.scanFile(file, false);
      playBeep();
      const newResult = { text: result, format: 'Unknown' };
      setLastResult(newResult);
      setHistory(h => [newResult, ...h].slice(0, 10));
    } catch (err) {
      setFileError(`No QR code or barcode found in this image. (${err?.message || 'Unknown error'})`);
    } finally {
      setFileScanning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) scanFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) scanFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearResult = () => {
    setLastResult(null);
    setFilePreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileError(null);
  };

  const clearHistory = () => setHistory([]);

  const parsed = lastResult ? parseQRPayload(lastResult.text) : null;

  return (
    <article id="tool-qrbarcodescan" className="tool-card tool-card--wide active">
      <h2>QR &amp; Barcode Scanner</h2>

      {/* Mode Tabs — matching the generator tab style */}
      <div className="generator-tabs">
        <button
          id="qrscan-tab-camera"
          className={`gen-tab-btn ${scanMode === SCAN_MODE_CAMERA ? 'active' : ''}`}
          onClick={() => switchMode(SCAN_MODE_CAMERA)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Camera Scan
        </button>
        <button
          id="qrscan-tab-file"
          className={`gen-tab-btn ${scanMode === SCAN_MODE_FILE ? 'active' : ''}`}
          onClick={() => switchMode(SCAN_MODE_FILE)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Image
        </button>
      </div>

      <div className="qrscan-main-layout">
        {/* ── Left: Scanner / Upload Panel ── */}
        <div className="qrscan-scanner-col">

          {/* ──── Camera Mode ──── */}
          {scanMode === SCAN_MODE_CAMERA && (
            <div className="qrscan-camera-panel">
              {!permissionRequested ? (
                <div className="qrscan-permission-prompt">
                  <div className="qrscan-perm-icon">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <p className="qrscan-perm-title">Camera Access Required</p>
                  <p className="qrscan-perm-desc">Allow camera access to scan QR codes and barcodes in real time. No data is sent to any server.</p>
                  <button id="qrscan-start-camera-btn" className="qrscan-primary-btn" onClick={requestCamerasAndStart}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    Enable Camera
                  </button>
                  {cameraError && <p className="qrscan-error-msg">{cameraError}</p>}
                </div>
              ) : (
                <>
                  {/* Camera controls */}
                  <div className="qrscan-camera-controls">
                    {cameras.length > 1 && (
                      <select
                        id="qrscan-camera-select"
                        className="qrscan-select"
                        value={selectedCamera}
                        onChange={handleCameraChange}
                      >
                        {cameras.map(cam => (
                          <option key={cam.id} value={cam.id}>
                            {cam.label || `Camera ${cam.id.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    )}
                    {isScanning ? (
                      <button id="qrscan-stop-btn" className="qrscan-stop-btn" onClick={stopScanning}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="1"/>
                        </svg>
                        Stop Camera
                      </button>
                    ) : (
                      <button id="qrscan-start-btn" className="qrscan-primary-btn qrscan-small-btn" onClick={() => startScanning()}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        Start Camera
                      </button>
                    )}
                  </div>

                  {cameraError && <p className="qrscan-error-msg">{cameraError}</p>}

                  {/* Camera viewfinder */}
                  <div className="qrscan-viewfinder-wrapper">
                    <div id={READER_ID} className="qrscan-reader-container" />
                    {isScanning && (
                      <div className="qrscan-overlay-frame">
                        <div className="qrscan-corner qrscan-corner-tl" />
                        <div className="qrscan-corner qrscan-corner-tr" />
                        <div className="qrscan-corner qrscan-corner-bl" />
                        <div className="qrscan-corner qrscan-corner-br" />
                        <div className="qrscan-laser" />
                      </div>
                    )}
                  </div>

                  {!isScanning && !cameraError && (
                    <p className="qrscan-hint-text">Camera is stopped. Press "Start Camera" to resume.</p>
                  )}
                  {isScanning && !lastResult && (
                    <p className="qrscan-hint-text qrscan-scanning-hint">
                      <span className="qrscan-pulse-dot" /> Scanning… Point your camera at a QR code or barcode.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ──── File Upload Mode ──── */}
          {scanMode === SCAN_MODE_FILE && (
            <div className="qrscan-file-panel">
              <div
                id="qrscan-dropzone"
                className={`qrscan-dropzone ${isDragging ? 'qrscan-dropzone-active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  id="qrscan-file-input"
                  type="file"
                  accept="image/*"
                  className="qrscan-hidden-input"
                  onChange={handleFileChange}
                />
                {filePreviewUrl ? (
                  <div className="qrscan-preview-wrapper">
                    <img src={filePreviewUrl} alt="Uploaded image preview" className="qrscan-preview-img" />
                    {fileScanning && (
                      <div className="qrscan-file-scanning-overlay">
                        <div className="qrscan-file-laser" />
                        <span>Scanning…</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="qrscan-dropzone-placeholder">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    <p className="qrscan-dropzone-title">Drop an image here</p>
                    <p className="qrscan-dropzone-sub">or click to browse files</p>
                    <p className="qrscan-dropzone-formats">Supports JPEG, PNG, GIF, WebP, BMP</p>
                  </div>
                )}
              </div>

              {filePreviewUrl && (
                <div className="qrscan-file-actions">
                  <button className="qrscan-secondary-btn" onClick={() => fileInputRef.current?.click()}>
                    Choose Different Image
                  </button>
                  <button className="qrscan-ghost-btn" onClick={clearResult}>Clear</button>
                </div>
              )}

              {fileError && (
                <div className="qrscan-error-box">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {fileError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Results Panel ── */}
        <div className="qrscan-results-col">
          {lastResult ? (
            <div className="qrscan-result-card">
              <div className="qrscan-result-header">
                <div className="qrscan-result-badge">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Decoded
                </div>
                {lastResult.format && lastResult.format !== 'Unknown' && (
                  <span className="qrscan-format-badge">{FORMAT_LABELS[lastResult.format] || lastResult.format}</span>
                )}
                <button className="qrscan-clear-result-btn" onClick={clearResult} title="Clear result">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              {parsed && <ResultWidget parsed={parsed} />}
            </div>
          ) : (
            <div className="qrscan-empty-result">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <path d="M14 14h3v3m0 4h4m0 0v-4m-7 4h3"/>
              </svg>
              <p className="qrscan-empty-title">No result yet</p>
              <p className="qrscan-empty-desc">
                {scanMode === SCAN_MODE_CAMERA
                  ? 'Start the camera and point it at a QR code or barcode.'
                  : 'Upload an image containing a QR code or barcode.'}
              </p>
            </div>
          )}

          {/* Supported Formats */}
          <div className="qrscan-formats-card">
            <div className="qrscan-formats-title">Supported Formats</div>
            <div className="qrscan-formats-grid">
              <span className="qrscan-format-chip qrscan-chip-2d">QR Code</span>
              <span className="qrscan-format-chip qrscan-chip-2d">Data Matrix</span>
              <span className="qrscan-format-chip qrscan-chip-2d">Aztec</span>
              <span className="qrscan-format-chip qrscan-chip-2d">PDF 417</span>
              <span className="qrscan-format-chip qrscan-chip-1d">Code 128</span>
              <span className="qrscan-format-chip qrscan-chip-1d">Code 39</span>
              <span className="qrscan-format-chip qrscan-chip-1d">Code 93</span>
              <span className="qrscan-format-chip qrscan-chip-1d">EAN-13</span>
              <span className="qrscan-format-chip qrscan-chip-1d">EAN-8</span>
              <span className="qrscan-format-chip qrscan-chip-1d">UPC-A</span>
              <span className="qrscan-format-chip qrscan-chip-1d">UPC-E</span>
              <span className="qrscan-format-chip qrscan-chip-1d">ITF</span>
              <span className="qrscan-format-chip qrscan-chip-1d">Codabar</span>
              <span className="qrscan-format-chip qrscan-chip-1d">RSS 14</span>
            </div>
            <div className="qrscan-formats-legend">
              <span className="qrscan-legend-item"><span className="qrscan-legend-dot qrscan-dot-2d" />2D Codes</span>
              <span className="qrscan-legend-item"><span className="qrscan-legend-dot qrscan-dot-1d" />1D Barcodes</span>
            </div>
          </div>

          {/* Scan History */}
          {history.length > 0 && (
            <div className="qrscan-history-card">
              <div className="qrscan-history-header">
                <span className="qrscan-history-title">Scan History</span>
                <button className="qrscan-ghost-btn qrscan-ghost-sm" onClick={clearHistory}>Clear</button>
              </div>
              <ul className="qrscan-history-list">
                {history.map((item, idx) => {
                  const p = parseQRPayload(item.text);
                  const typeIcon = {
                    url: '🔗',
                    wifi: '📶',
                    email: '✉️',
                    phone: '📞',
                    sms: '💬',
                    text: '📄',
                  }[p.type] || '📄';
                  return (
                    <li key={idx} className="qrscan-history-item" onClick={() => setLastResult(item)} title="Click to view">
                      <span className="qrscan-history-icon">{typeIcon}</span>
                      <span className="qrscan-history-text">{item.text.length > 60 ? item.text.slice(0, 60) + '…' : item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
