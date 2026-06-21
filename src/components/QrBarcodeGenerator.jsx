import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

// Helper to escape WiFi strings for standard encoding format
const escapeWifiString = (str) => {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/:/g, '\\:')
            .replace(/,/g, '\\,')
            .replace(/"/g, '\\"');
};

// Barcode input validator
const validateBarcode = (value, format) => {
  if (!value) return "Input cannot be empty";
  switch (format) {
    case 'EAN13':
      if (!/^\d{12,13}$/.test(value)) {
        return "EAN-13 must be 12 or 13 digits";
      }
      break;
    case 'EAN8':
      if (!/^\d{7,8}$/.test(value)) {
        return "EAN-8 must be 7 or 8 digits";
      }
      break;
    case 'UPC':
      if (!/^\d{11,12}$/.test(value)) {
        return "UPC-A must be 11 or 12 digits";
      }
      break;
    case 'CODE39':
      if (!/^[0-9A-Z\-.\s$/+%=]+$/.test(value.toUpperCase())) {
        return "Code 39 only supports A-Z (uppercase), 0-9, space, and characters: - . $ / + % =";
      }
      break;
    case 'ITF':
      if (!/^\d+$/.test(value)) {
        return "ITF must be digits only";
      }
      if (value.length % 2 !== 0) {
        return "ITF must contain an even number of digits";
      }
      break;
    case 'CODABAR':
      if (!/^[0-9\-$:/.+ABCD]+$/i.test(value)) {
        return "Codabar only supports digits, - $ : / . +, and A/B/C/D start/stop characters";
      }
      break;
    case 'CODE128':
    default:
      if (/[^\x00-\x7F]/.test(value)) {
        return "Code 128 only supports standard ASCII characters";
      }
      break;
  }
  return null;
};

// Custom canvas rendering for QR Code
const renderCustomQR = (canvas, text, options) => {
  const {
    size = 400,
    margin = 4,
    errorCorrectionLevel = 'H',
    dotsStyle = 'square', // 'square' | 'circle'
    eyesStyle = 'square',  // 'square' | 'rounded' | 'circle'
    fgType = 'solid',      // 'solid' | 'gradient'
    fgColor = '#111827',
    fgGradient = { type: 'linear', color1: '#4338ca', color2: '#06b6d4', angle: 45 },
    bgColor = '#ffffff',
    logoImg = null,
    logoScale = 0.18,
    logoBgShape = 'circle',
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let qr;
  try {
    qr = QRCode.create(text, { errorCorrectionLevel });
  } catch (err) {
    console.error(err);
    throw err;
  }

  const { modules } = qr;
  const numModules = modules.size;
  const totalModules = numModules + margin * 2;
  const moduleSize = size / totalModules;

  canvas.width = size;
  canvas.height = size;

  ctx.clearRect(0, 0, size, size);
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  const applyFgStyle = () => {
    if (fgType === 'gradient') {
      let grad;
      if (fgGradient.type === 'linear') {
        const angleRad = (fgGradient.angle * Math.PI) / 180;
        const x1 = size / 2 - (Math.cos(angleRad) * size) / 2;
        const y1 = size / 2 - (Math.sin(angleRad) * size) / 2;
        const x2 = size / 2 + (Math.cos(angleRad) * size) / 2;
        const y2 = size / 2 + (Math.sin(angleRad) * size) / 2;
        grad = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.7);
      }
      grad.addColorStop(0, fgGradient.color1);
      grad.addColorStop(1, fgGradient.color2);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = fgColor;
    }
  };

  applyFgStyle();

  const isEye = (r, c) => {
    if (r >= 0 && r < 7 && c >= 0 && c < 7) return 'tl';
    if (r >= 0 && r < 7 && c >= numModules - 7 && c < numModules) return 'tr';
    if (r >= numModules - 7 && r < numModules && c >= 0 && c < 7) return 'bl';
    return null;
  };

  const logoModules = logoImg ? numModules * logoScale : 0;
  const logoStart = (numModules - logoModules) / 2;
  const logoEnd = logoStart + logoModules;
  const isInsideLogoArea = (r, c) => {
    if (!logoImg) return false;
    const pad = 0.5; // padding in module counts
    return r >= logoStart - pad && r < logoEnd + pad && c >= logoStart - pad && c < logoEnd + pad;
  };

  // Draw Dots
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (modules.data[r * numModules + c] === 0) continue;
      if (isEye(r, c)) continue;
      if (isInsideLogoArea(r, c)) continue;

      const x = (margin + c) * moduleSize;
      const y = (margin + r) * moduleSize;

      ctx.beginPath();
      if (dotsStyle === 'circle') {
        const cx = x + moduleSize / 2;
        const cy = y + moduleSize / 2;
        const radius = (moduleSize / 2) * 0.85;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, moduleSize, moduleSize);
      }
    }
  }

  // Draw Position Eyes
  const drawEye = (startX, startY) => {
    const frameSize = 7 * moduleSize;
    const innerFrameSize = 5 * moduleSize;
    const centerBlockSize = 3 * moduleSize;

    if (eyesStyle === 'circle') {
      const cx = startX + frameSize / 2;
      const cy = startY + frameSize / 2;

      applyFgStyle();
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5 * moduleSize, 0, Math.PI * 2);
      ctx.fill();

      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5 * moduleSize, 0, Math.PI * 2);
      ctx.fill();

      if (bgColor === 'transparent') {
        ctx.globalCompositeOperation = 'source-over';
      }
      applyFgStyle();
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5 * moduleSize, 0, Math.PI * 2);
      ctx.fill();

    } else if (eyesStyle === 'rounded') {
      const drawRounded = (rx, ry, w, h, radius) => {
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, w, h, radius);
        } else {
          ctx.rect(rx, ry, w, h);
        }
        ctx.fill();
      };

      const radOuter = 1.6 * moduleSize;
      const radInner = 0.8 * moduleSize;
      const radCenter = 0.5 * moduleSize;

      applyFgStyle();
      drawRounded(startX, startY, frameSize, frameSize, radOuter);

      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
      }
      drawRounded(startX + moduleSize, startY + moduleSize, innerFrameSize, innerFrameSize, radInner);

      if (bgColor === 'transparent') {
        ctx.globalCompositeOperation = 'source-over';
      }
      applyFgStyle();
      drawRounded(startX + 2 * moduleSize, startY + 2 * moduleSize, centerBlockSize, centerBlockSize, radCenter);

    } else {
      // Classic Square
      applyFgStyle();
      ctx.fillRect(startX, startY, frameSize, frameSize);

      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.fillRect(startX + moduleSize, startY + moduleSize, innerFrameSize, innerFrameSize);

      if (bgColor === 'transparent') {
        ctx.globalCompositeOperation = 'source-over';
      }
      applyFgStyle();
      ctx.fillRect(startX + 2 * moduleSize, startY + 2 * moduleSize, centerBlockSize, centerBlockSize);
    }
  };

  // Render the three corner eyes
  drawEye(margin * moduleSize, margin * moduleSize);
  drawEye((margin + numModules - 7) * moduleSize, margin * moduleSize);
  drawEye(margin * moduleSize, (margin + numModules - 7) * moduleSize);

  // Draw Logo
  if (logoImg) {
    const centerPx = size / 2;
    const logoPx = size * logoScale;
    const logoX = centerPx - logoPx / 2;
    const logoY = centerPx - logoPx / 2;
    const padding = moduleSize * 0.5;

    if (logoBgShape !== 'none') {
      ctx.fillStyle = bgColor === 'transparent' ? '#ffffff' : bgColor;
      ctx.beginPath();
      if (logoBgShape === 'circle') {
        ctx.arc(centerPx, centerPx, logoPx / 2 + padding, 0, Math.PI * 2);
        ctx.fill();
      } else if (logoBgShape === 'square') {
        ctx.fillRect(logoX - padding, logoY - padding, logoPx + padding * 2, logoPx + padding * 2);
      }
    }

    ctx.save();
    ctx.beginPath();
    const clipRadius = logoPx * 0.2;
    if (ctx.roundRect) {
      ctx.roundRect(logoX, logoY, logoPx, logoPx, clipRadius);
    } else {
      ctx.rect(logoX, logoY, logoPx, logoPx);
    }
    ctx.clip();

    ctx.drawImage(logoImg, logoX, logoY, logoPx, logoPx);
    ctx.restore();
  }
};

// SVG Generator String for QR Code
const generateQRSVG = (text, options) => {
  const {
    margin = 4,
    errorCorrectionLevel = 'H',
    dotsStyle = 'square',
    eyesStyle = 'square',
    fgType = 'solid',
    fgColor = '#111827',
    fgGradient = { type: 'linear', color1: '#4338ca', color2: '#06b6d4', angle: 45 },
    bgColor = '#ffffff',
    logoImgData = null, // base64
    logoScale = 0.18,
    logoBgShape = 'circle',
  } = options;

  let qr;
  try {
    qr = QRCode.create(text, { errorCorrectionLevel });
  } catch (err) {
    return '';
  }

  const { modules } = qr;
  const numModules = modules.size;
  const totalModules = numModules + margin * 2;
  const size = 500;
  const moduleSize = size / totalModules;

  let svgContent = '';

  if (bgColor !== 'transparent') {
    svgContent += `<rect width="${size}" height="${size}" fill="${bgColor}" />\n`;
  }

  let fillAttr = fgColor;
  let defsContent = '';
  if (fgType === 'gradient') {
    fillAttr = 'url(#qr-gradient)';
    if (fgGradient.type === 'linear') {
      const angleRad = (fgGradient.angle * Math.PI) / 180;
      const x1 = Math.round(50 - Math.cos(angleRad) * 50);
      const y1 = Math.round(50 - Math.sin(angleRad) * 50);
      const x2 = Math.round(50 + Math.cos(angleRad) * 50);
      const y2 = Math.round(50 + Math.sin(angleRad) * 50);
      defsContent += `  <linearGradient id="qr-gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">\n`;
    } else {
      defsContent += `  <radialGradient id="qr-gradient" cx="50%" cy="50%" r="70%">\n`;
    }
    defsContent += `    <stop offset="0%" stop-color="${fgGradient.color1}" />\n`;
    defsContent += `    <stop offset="100%" stop-color="${fgGradient.color2}" />\n`;
    defsContent += fgGradient.type === 'linear' ? `  </linearGradient>\n` : `  </radialGradient>\n`;
  }

  if (defsContent) {
    svgContent += `<defs>\n${defsContent}</defs>\n`;
  }

  const isEye = (r, c) => {
    if (r >= 0 && r < 7 && c >= 0 && c < 7) return 'tl';
    if (r >= 0 && r < 7 && c >= numModules - 7 && c < numModules) return 'tr';
    if (r >= numModules - 7 && r < numModules && c >= 0 && c < 7) return 'bl';
    return null;
  };

  const logoModules = logoImgData ? numModules * logoScale : 0;
  const logoStart = (numModules - logoModules) / 2;
  const logoEnd = logoStart + logoModules;
  const isInsideLogoArea = (r, c) => {
    if (!logoImgData) return false;
    const pad = 0.5;
    return r >= logoStart - pad && r < logoEnd + pad && c >= logoStart - pad && c < logoEnd + pad;
  };

  // Draw Dots
  let pathD = '';
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (modules.data[r * numModules + c] === 0) continue;
      if (isEye(r, c)) continue;
      if (isInsideLogoArea(r, c)) continue;

      const x = (margin + c) * moduleSize;
      const y = (margin + r) * moduleSize;

      if (dotsStyle === 'circle') {
        const cx = x + moduleSize / 2;
        const cy = y + moduleSize / 2;
        const radius = (moduleSize / 2) * 0.85;
        pathD += `M ${cx} ${cy} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0 `;
      } else {
        pathD += `M ${x} ${y} h ${moduleSize} v ${moduleSize} h -${moduleSize} Z `;
      }
    }
  }

  if (pathD) {
    svgContent += `<path d="${pathD}" fill="${fillAttr}" />\n`;
  }

  // Draw Position Eyes
  const drawEyeSVG = (startX, startY) => {
    const frameSize = 7 * moduleSize;
    const innerFrameSize = 5 * moduleSize;
    const centerBlockSize = 3 * moduleSize;

    if (eyesStyle === 'circle') {
      const cx = startX + frameSize / 2;
      const cy = startY + frameSize / 2;
      const rOuter = 3.5 * moduleSize;
      const rInner = 2.5 * moduleSize;
      const rCenter = 1.5 * moduleSize;

      const eyePath = `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy + rOuter} A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy - rOuter} Z ` +
                      `M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 0 ${cx} ${cy + rInner} A ${rInner} ${rInner} 0 1 0 ${cx} ${cy - rInner} Z ` +
                      `M ${cx} ${cy - rCenter} A ${rCenter} ${rCenter} 0 1 1 ${cx} ${cy + rCenter} A ${rCenter} ${rCenter} 0 1 1 ${cx} ${cy - rCenter} Z`;

      svgContent += `<path d="${eyePath}" fill="${fillAttr}" fill-rule="evenodd" />\n`;
    } else if (eyesStyle === 'rounded') {
      const radOuter = 1.6 * moduleSize;
      const radInner = 0.8 * moduleSize;
      const radCenter = 0.5 * moduleSize;

      svgContent += `<rect x="${startX}" y="${startY}" width="${frameSize}" height="${frameSize}" rx="${radOuter}" ry="${radOuter}" fill="${fillAttr}" />\n`;
      const innerBgColor = bgColor === 'transparent' ? '#ffffff' : bgColor;
      svgContent += `<rect x="${startX + moduleSize}" y="${startY + moduleSize}" width="${innerFrameSize}" height="${innerFrameSize}" rx="${radInner}" ry="${radInner}" fill="${innerBgColor}" />\n`;
      svgContent += `<rect x="${startX + 2 * moduleSize}" y="${startY + 2 * moduleSize}" width="${centerBlockSize}" height="${centerBlockSize}" rx="${radCenter}" ry="${radCenter}" fill="${fillAttr}" />\n`;
    } else {
      svgContent += `<rect x="${startX}" y="${startY}" width="${frameSize}" height="${frameSize}" fill="${fillAttr}" />\n`;
      const innerBgColor = bgColor === 'transparent' ? '#ffffff' : bgColor;
      svgContent += `<rect x="${startX + moduleSize}" y="${startY + moduleSize}" width="${innerFrameSize}" height="${innerFrameSize}" fill="${innerBgColor}" />\n`;
      svgContent += `<rect x="${startX + 2 * moduleSize}" y="${startY + 2 * moduleSize}" width="${centerBlockSize}" height="${centerBlockSize}" fill="${fillAttr}" />\n`;
    }
  };

  drawEyeSVG(margin * moduleSize, margin * moduleSize);
  drawEyeSVG((margin + numModules - 7) * moduleSize, margin * moduleSize);
  drawEyeSVG(margin * moduleSize, (margin + numModules - 7) * moduleSize);

  if (logoImgData) {
    const centerPx = size / 2;
    const logoPx = size * logoScale;
    const logoX = centerPx - logoPx / 2;
    const logoY = centerPx - logoPx / 2;
    const padding = moduleSize * 0.5;

    if (logoBgShape === 'circle') {
      const bgFill = bgColor === 'transparent' ? '#ffffff' : bgColor;
      svgContent += `<circle cx="${centerPx}" cy="${centerPx}" r="${logoPx / 2 + padding}" fill="${bgFill}" />\n`;
    } else if (logoBgShape === 'square') {
      const bgFill = bgColor === 'transparent' ? '#ffffff' : bgColor;
      svgContent += `<rect x="${logoX - padding}" y="${logoY - padding}" width="${logoPx + padding * 2}" height="${logoPx + padding * 2}" fill="${bgFill}" />\n`;
    }

    const clipId = `logo-clip-svg`;
    const clipRadius = logoPx * 0.2;
    svgContent += `<clipPath id="${clipId}">\n`;
    svgContent += `  <rect x="${logoX}" y="${logoY}" width="${logoPx}" height="${logoPx}" rx="${clipRadius}" ry="${clipRadius}" />\n`;
    svgContent += `</clipPath>\n`;
    svgContent += `<image x="${logoX}" y="${logoY}" width="${logoPx}" height="${logoPx}" href="${logoImgData}" clip-path="url(#${clipId})" />\n`;
  }

  return `<svg width="100%" height="100%" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">\n${svgContent}</svg>`;
};

export default function QrBarcodeGenerator() {
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'barcode'

  // ================= QR State =================
  const [qrType, setQrType] = useState('url'); // 'text' | 'url' | 'wifi' | 'email' | 'phone' | 'sms'
  const [qrText, setQrText] = useState('Hello Antigravity!');
  const [qrUrl, setQrUrl] = useState('https://github.com');
  const [qrPhone, setQrPhone] = useState('');
  
  // WiFi states
  const [qrWifiSsid, setQrWifiSsid] = useState('MyHomeWiFi');
  const [qrWifiPassword, setQrWifiPassword] = useState('SecretPassword');
  const [qrWifiAuth, setQrWifiAuth] = useState('WPA'); // 'WPA' | 'WEP' | 'nopass'
  const [qrWifiHidden, setQrWifiHidden] = useState(false);

  // Email states
  const [qrEmailTo, setQrEmailTo] = useState('example@gmail.com');
  const [qrEmailSubject, setQrEmailSubject] = useState('Hello');
  const [qrEmailBody, setQrEmailBody] = useState('Just checking out the generator.');

  // SMS states
  const [qrSmsPhone, setQrSmsPhone] = useState('');
  const [qrSmsMessage, setQrSmsMessage] = useState('Send this code text.');

  // QR Styling states
  const [qrDotsStyle, setQrDotsStyle] = useState('square'); // 'square' | 'circle'
  const [qrEyesStyle, setQrEyesStyle] = useState('square'); // 'square' | 'rounded' | 'circle'
  const [qrFgType, setQrFgType] = useState('solid'); // 'solid' | 'gradient'
  const [qrFgColor, setQrFgColor] = useState('#111827');
  const [qrGradType, setQrGradType] = useState('linear'); // 'linear' | 'radial'
  const [qrGradColor1, setQrGradColor1] = useState('#4f46e5');
  const [qrGradColor2, setQrGradColor2] = useState('#06b6d4');
  const [qrGradAngle, setQrGradAngle] = useState(45);
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrBgTransparent, setQrBgTransparent] = useState(false);
  const [qrErrorCorrection, setQrErrorCorrection] = useState('H');
  const [qrExportSize, setQrExportSize] = useState(512);

  // QR Logo states
  const [logoFile, setLogoFile] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [logoImg, setLogoImg] = useState(null);
  const [logoScale, setLogoScale] = useState(0.18);
  const [logoBgShape, setLogoBgShape] = useState('circle');

  // Copy status
  const [copied, setCopied] = useState(false);

  // ================= Barcode State =================
  const [barcodeValue, setBarcodeValue] = useState('123456789012');
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128'); // CODE128, EAN13, EAN8, UPC, CODE39, ITF, CODABAR
  const [barcodeLineColor, setBarcodeLineColor] = useState('#111827');
  const [barcodeBgColor, setBarcodeBgColor] = useState('#ffffff');
  const [barcodeWidth, setBarcodeWidth] = useState(2);
  const [barcodeHeight, setBarcodeHeight] = useState(80);
  const [barcodeDisplayValue, setBarcodeDisplayValue] = useState(true);
  const [barcodeFontSize, setBarcodeFontSize] = useState(14);
  const [barcodeMargin, setBarcodeMargin] = useState(10);
  const [barcodeError, setBarcodeError] = useState(null);

  // Refs
  const qrCanvasRef = useRef(null);
  const barcodeCanvasRef = useRef(null);
  const barcodeSvgRef = useRef(null);

  // ================= QR Value Compiler =================
  const getQRValue = () => {
    switch (qrType) {
      case 'url':
        return qrUrl;
      case 'wifi':
        const ssidEsc = escapeWifiString(qrWifiSsid);
        const passEsc = escapeWifiString(qrWifiPassword);
        const hidden = qrWifiHidden ? 'true' : 'false';
        return `WIFI:S:${ssidEsc};T:${qrWifiAuth};P:${qrWifiPassword ? passEsc : ''};H:${hidden};;`;
      case 'email':
        return `mailto:${qrEmailTo}?subject=${encodeURIComponent(qrEmailSubject)}&body=${encodeURIComponent(qrEmailBody)}`;
      case 'phone':
        return `tel:${qrPhone}`;
      case 'sms':
        return `sms:${qrSmsPhone}?body=${encodeURIComponent(qrSmsMessage)}`;
      case 'text':
      default:
        return qrText;
    }
  };

  // Render QR Code inside useEffect
  useEffect(() => {
    if (activeTab === 'qr' && qrCanvasRef.current) {
      const value = getQRValue();
      if (!value) return;

      const renderOptions = {
        size: qrExportSize,
        margin: 4,
        errorCorrectionLevel: logoImg ? 'H' : qrErrorCorrection, // force high recovery if logo is present
        dotsStyle: qrDotsStyle,
        eyesStyle: qrEyesStyle,
        fgType: qrFgType,
        fgColor: qrFgColor,
        fgGradient: {
          type: qrGradType,
          color1: qrGradColor1,
          color2: qrGradColor2,
          angle: Number(qrGradAngle)
        },
        bgColor: qrBgTransparent ? 'transparent' : qrBgColor,
        logoImg: logoImg,
        logoScale: Number(logoScale),
        logoBgShape: logoBgShape,
      };

      try {
        renderCustomQR(qrCanvasRef.current, value, renderOptions);
      } catch (err) {
        console.error(err);
      }
    }
  }, [
    activeTab, qrType, qrText, qrUrl, qrPhone,
    qrWifiSsid, qrWifiPassword, qrWifiAuth, qrWifiHidden,
    qrEmailTo, qrEmailSubject, qrEmailBody,
    qrSmsPhone, qrSmsMessage,
    qrDotsStyle, qrEyesStyle, qrFgType, qrFgColor,
    qrGradType, qrGradColor1, qrGradColor2, qrGradAngle,
    qrBgColor, qrBgTransparent, qrErrorCorrection,
    logoImg, logoScale, logoBgShape, qrExportSize
  ]);

  // Render Barcode inside useEffect
  useEffect(() => {
    if (activeTab === 'barcode') {
      const err = validateBarcode(barcodeValue, barcodeFormat);
      setBarcodeError(err);

      if (!err && barcodeCanvasRef.current && barcodeSvgRef.current) {
        const options = {
          format: barcodeFormat,
          lineColor: barcodeLineColor,
          background: barcodeBgColor,
          width: Number(barcodeWidth),
          height: Number(barcodeHeight),
          displayValue: barcodeDisplayValue,
          fontSize: Number(barcodeFontSize),
          margin: Number(barcodeMargin),
        };

        try {
          // Render to Canvas for PNG download
          JsBarcode(barcodeCanvasRef.current, barcodeValue, options);
          // Render to SVG for vector download
          JsBarcode(barcodeSvgRef.current, barcodeValue, options);
        } catch (e) {
          console.error("Barcode drawing error: ", e);
          setBarcodeError("Barcode render failed. Check code parameters.");
        }
      }
    }
  }, [
    activeTab, barcodeValue, barcodeFormat, barcodeLineColor,
    barcodeBgColor, barcodeWidth, barcodeHeight,
    barcodeDisplayValue, barcodeFontSize, barcodeMargin
  ]);

  // Handle Logo Image Upload
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setLogoBase64(dataUrl);

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        setLogoImg(img);
      };
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoBase64(null);
    setLogoImg(null);
  };

  // Download QR Code PNG
  const handleQrDownloadPNG = () => {
    if (!qrCanvasRef.current) return;
    const url = qrCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qrcode_${qrType}_${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  // Download QR Code SVG
  const handleQrDownloadSVG = () => {
    const value = getQRValue();
    const svgString = generateQRSVG(value, {
      margin: 4,
      errorCorrectionLevel: logoImg ? 'H' : qrErrorCorrection,
      dotsStyle: qrDotsStyle,
      eyesStyle: qrEyesStyle,
      fgType: qrFgType,
      fgColor: qrFgColor,
      fgGradient: {
        type: qrGradType,
        color1: qrGradColor1,
        color2: qrGradColor2,
        angle: Number(qrGradAngle)
      },
      bgColor: qrBgTransparent ? 'transparent' : qrBgColor,
      logoImgData: logoBase64,
      logoScale: Number(logoScale),
      logoBgShape: logoBgShape,
    });

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qrcode_${qrType}_${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy QR Image to Clipboard
  const handleQrCopy = async () => {
    if (!qrCanvasRef.current) return;
    try {
      qrCanvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy image: ', err);
    }
  };

  // Download Barcode PNG
  const handleBarcodeDownloadPNG = () => {
    if (!barcodeCanvasRef.current || barcodeError) return;
    const url = barcodeCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `barcode_${barcodeFormat}_${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  // Download Barcode SVG
  const handleBarcodeDownloadSVG = () => {
    if (!barcodeSvgRef.current || barcodeError) return;
    const svgString = new XMLSerializer().serializeToString(barcodeSvgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `barcode_${barcodeFormat}_${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article id="tool-qrbarcode" className="tool-card tool-card--wide active">
      <h2>QR Code &amp; Barcode Generator</h2>
      
      {/* Primary Generator Tabs */}
      <div className="generator-tabs">
        <button 
          className={`gen-tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveTab('qr')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <rect x="7" y="7" width="3" height="3"></rect>
            <rect x="14" y="7" width="3" height="3"></rect>
            <rect x="7" y="14" width="3" height="3"></rect>
          </svg>
          QR Code Generator
        </button>
        <button 
          className={`gen-tab-btn ${activeTab === 'barcode' ? 'active' : ''}`}
          onClick={() => setActiveTab('barcode')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="5" x2="3" y2="19"></line>
            <line x1="6" y1="5" x2="6" y2="19"></line>
            <line x1="10" y1="5" x2="10" y2="19"></line>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="15" y1="5" x2="15" y2="19"></line>
            <line x1="18" y1="5" x2="18" y2="19"></line>
            <line x1="21" y1="5" x2="21" y2="19"></line>
          </svg>
          Barcode Generator
        </button>
      </div>

      <div className="generator-layout">
        
        {/* ================= LEFT SIDE: CONFIG PANEL ================= */}
        <div className="config-panel">
          
          {activeTab === 'qr' ? (
            <>
              {/* QR TYPE SELECTOR */}
              <div className="form-group">
                <label>Content Type</label>
                <div className="qr-type-grid">
                  {[
                    { id: 'url', name: 'Web Address' },
                    { id: 'text', name: 'Plain Text' },
                    { id: 'wifi', name: 'WiFi Network' },
                    { id: 'email', name: 'Email Address' },
                    { id: 'phone', name: 'Phone Link' },
                    { id: 'sms', name: 'SMS message' }
                  ].map(t => (
                    <button 
                      key={t.id}
                      className={`qr-type-btn ${qrType === t.id ? 'active' : ''}`}
                      onClick={() => setQrType(t.id)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* DYNAMIC CONTENT INPUTS */}
              <div className="content-inputs-card">
                {qrType === 'url' && (
                  <div className="form-group">
                    <label htmlFor="qr-url">URL Address</label>
                    <input 
                      id="qr-url"
                      type="url"
                      placeholder="https://example.com"
                      value={qrUrl}
                      onChange={(e) => setQrUrl(e.target.value)}
                    />
                  </div>
                )}

                {qrType === 'text' && (
                  <div className="form-group">
                    <label htmlFor="qr-text">Plain Text Content</label>
                    <textarea 
                      id="qr-text"
                      rows="3"
                      placeholder="Type your text content here..."
                      value={qrText}
                      onChange={(e) => setQrText(e.target.value)}
                    />
                  </div>
                )}

                {qrType === 'wifi' && (
                  <div className="wifi-inputs">
                    <div className="form-group">
                      <label htmlFor="wifi-ssid">Network Name (SSID)</label>
                      <input 
                        id="wifi-ssid"
                        type="text"
                        placeholder="SSID Name"
                        value={qrWifiSsid}
                        onChange={(e) => setQrWifiSsid(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="wifi-password">Password</label>
                      <input 
                        id="wifi-password"
                        type="text"
                        placeholder="Network Password"
                        disabled={qrWifiAuth === 'nopass'}
                        value={qrWifiPassword}
                        onChange={(e) => setQrWifiPassword(e.target.value)}
                      />
                    </div>
                    <div className="row">
                      <div className="form-group col">
                        <label htmlFor="wifi-auth">Security</label>
                        <select 
                          id="wifi-auth"
                          value={qrWifiAuth}
                          onChange={(e) => setQrWifiAuth(e.target.value)}
                        >
                          <option value="WPA">WPA/WPA2</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">Unsecured (No Password)</option>
                        </select>
                      </div>
                      <div className="form-group col-checkbox">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox"
                            checked={qrWifiHidden}
                            onChange={(e) => setQrWifiHidden(e.target.checked)}
                          />
                          Hidden Network
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {qrType === 'email' && (
                  <div className="email-inputs">
                    <div className="form-group">
                      <label htmlFor="email-to">Recipient Email</label>
                      <input 
                        id="email-to"
                        type="email"
                        placeholder="hello@example.com"
                        value={qrEmailTo}
                        onChange={(e) => setQrEmailTo(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email-subject">Subject</label>
                      <input 
                        id="email-subject"
                        type="text"
                        placeholder="Subject Line"
                        value={qrEmailSubject}
                        onChange={(e) => setQrEmailSubject(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email-body">Body Text</label>
                      <textarea 
                        id="email-body"
                        rows="3"
                        placeholder="Email contents..."
                        value={qrEmailBody}
                        onChange={(e) => setQrEmailBody(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {qrType === 'phone' && (
                  <div className="form-group">
                    <label htmlFor="qr-phone">Phone Number</label>
                    <input 
                      id="qr-phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={qrPhone}
                      onChange={(e) => setQrPhone(e.target.value)}
                    />
                  </div>
                )}

                {qrType === 'sms' && (
                  <div className="sms-inputs">
                    <div className="form-group">
                      <label htmlFor="sms-phone">Phone Number</label>
                      <input 
                        id="sms-phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={qrSmsPhone}
                        onChange={(e) => setQrSmsPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="sms-msg">Message</label>
                      <textarea 
                        id="sms-msg"
                        rows="2"
                        placeholder="Type SMS text..."
                        value={qrSmsMessage}
                        onChange={(e) => setQrSmsMessage(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* QR STYLE CUSTOMIZATION */}
              <div className="section-divider">Style Customization</div>

              <div className="style-card">
                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="qr-dots-style">Dots Style</label>
                    <select id="qr-dots-style" value={qrDotsStyle} onChange={(e) => setQrDotsStyle(e.target.value)}>
                      <option value="square">Classic Square</option>
                      <option value="circle">Rounded Circles</option>
                    </select>
                  </div>
                  <div className="form-group col">
                    <label htmlFor="qr-eyes-style">Corner Eyes Style</label>
                    <select id="qr-eyes-style" value={qrEyesStyle} onChange={(e) => setQrEyesStyle(e.target.value)}>
                      <option value="square">Standard Square</option>
                      <option value="rounded">Smooth Rounded</option>
                      <option value="circle">Circular Rings</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Foreground Color Type</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="fgType" 
                        value="solid" 
                        checked={qrFgType === 'solid'} 
                        onChange={() => setQrFgType('solid')}
                      />
                      Solid Color
                    </label>
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="fgType" 
                        value="gradient" 
                        checked={qrFgType === 'gradient'} 
                        onChange={() => setQrFgType('gradient')}
                      />
                      Gradient Color
                    </label>
                  </div>
                </div>

                {qrFgType === 'solid' ? (
                  <div className="form-group">
                    <label htmlFor="qr-fg-color">Foreground Color</label>
                    <div className="color-picker-input">
                      <input 
                        id="qr-fg-color"
                        type="color" 
                        value={qrFgColor} 
                        onChange={(e) => setQrFgColor(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="color-hex-text"
                        value={qrFgColor.toUpperCase()} 
                        onChange={(e) => setQrFgColor(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="gradient-inputs">
                    <div className="row">
                      <div className="form-group col">
                        <label htmlFor="qr-grad-1">Start Color</label>
                        <div className="color-picker-input">
                          <input 
                            id="qr-grad-1"
                            type="color" 
                            value={qrGradColor1} 
                            onChange={(e) => setQrGradColor1(e.target.value)}
                          />
                          <input 
                            type="text" 
                            className="color-hex-text"
                            value={qrGradColor1.toUpperCase()} 
                            onChange={(e) => setQrGradColor1(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group col">
                        <label htmlFor="qr-grad-2">End Color</label>
                        <div className="color-picker-input">
                          <input 
                            id="qr-grad-2"
                            type="color" 
                            value={qrGradColor2} 
                            onChange={(e) => setQrGradColor2(e.target.value)}
                          />
                          <input 
                            type="text" 
                            className="color-hex-text"
                            value={qrGradColor2.toUpperCase()} 
                            onChange={(e) => setQrGradColor2(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="form-group col">
                        <label htmlFor="qr-grad-style">Gradient Shape</label>
                        <select id="qr-grad-style" value={qrGradType} onChange={(e) => setQrGradType(e.target.value)}>
                          <option value="linear">Linear</option>
                          <option value="radial">Radial</option>
                        </select>
                      </div>
                      {qrGradType === 'linear' && (
                        <div className="form-group col">
                          <label htmlFor="qr-grad-angle">Angle ({qrGradAngle}°)</label>
                          <input 
                            id="qr-grad-angle"
                            type="range" 
                            min="0" 
                            max="360" 
                            step="15"
                            value={qrGradAngle} 
                            onChange={(e) => setQrGradAngle(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="qr-bg-color">Background Color</label>
                    <div className="color-picker-input" style={{ opacity: qrBgTransparent ? 0.4 : 1 }}>
                      <input 
                        id="qr-bg-color"
                        type="color" 
                        disabled={qrBgTransparent}
                        value={qrBgColor} 
                        onChange={(e) => setQrBgColor(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="color-hex-text"
                        disabled={qrBgTransparent}
                        value={qrBgColor.toUpperCase()} 
                        onChange={(e) => setQrBgColor(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group col col-checkbox">
                    <label className="checkbox-label" style={{ marginTop: '28px' }}>
                      <input 
                        type="checkbox"
                        checked={qrBgTransparent}
                        onChange={(e) => setQrBgTransparent(e.target.checked)}
                      />
                      Transparent BG
                    </label>
                  </div>
                </div>

                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="qr-error-correct">Error Correction</label>
                    <select 
                      id="qr-error-correct" 
                      disabled={logoImg !== null}
                      value={logoImg ? 'H' : qrErrorCorrection} 
                      onChange={(e) => setQrErrorCorrection(e.target.value)}
                    >
                      <option value="L">Low (7% recovery)</option>
                      <option value="M">Medium (15% recovery)</option>
                      <option value="Q">Quartile (25% recovery)</option>
                      <option value="H">High (30% recovery)</option>
                    </select>
                    {logoImg && <span className="small note warning-note">Locked to HIGH (H) to support center logo.</span>}
                  </div>
                  <div className="form-group col">
                    <label htmlFor="qr-export-size">Resolution</label>
                    <select id="qr-export-size" value={qrExportSize} onChange={(e) => setQrExportSize(Number(e.target.value))}>
                      <option value={256}>256 x 256 px</option>
                      <option value={512}>512 x 512 px</option>
                      <option value={1024}>1024 x 1024 px</option>
                      <option value={2048}>2048 x 2048 px</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* QR LOGO UPLOAD */}
              <div className="section-divider">Embed Logo / Image</div>
              
              <div className="logo-card">
                <div className="form-group">
                  <label>Upload Logo</label>
                  <div className="logo-upload-controls">
                    <label htmlFor="logo-file-picker" className="btn btn-secondary btn-small file-upload-btn">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                      {logoFile ? 'Change Logo' : 'Choose Logo'}
                    </label>
                    <input 
                      id="logo-file-picker"
                      type="file" 
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={handleLogoChange}
                      style={{ display: 'none' }}
                    />
                    {logoFile && (
                      <span className="uploaded-file-name">
                        {logoFile.name}
                      </span>
                    )}
                    {logoImg && (
                      <button className="btn btn-secondary btn-small danger-text" style={{ marginLeft: 'auto' }} onClick={removeLogo}>
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>

                {logoImg && (
                  <div className="logo-details">
                    <div className="row">
                      <div className="form-group col">
                        <label htmlFor="logo-scale">Logo Size ({Math.round(logoScale * 100)}%)</label>
                        <input 
                          id="logo-scale"
                          type="range" 
                          min="0.10" 
                          max="0.25" 
                          step="0.01"
                          value={logoScale} 
                          onChange={(e) => setLogoScale(e.target.value)}
                        />
                      </div>
                      <div className="form-group col">
                        <label htmlFor="logo-bg-shape">Logo Background</label>
                        <select id="logo-bg-shape" value={logoBgShape} onChange={(e) => setLogoBgShape(e.target.value)}>
                          <option value="none">None (Overlaid)</option>
                          <option value="circle">White Circle</option>
                          <option value="square">White Square</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // ================= BARCODE INPUTS & STYLING =================
            <>
              <div className="form-group">
                <label htmlFor="barcode-val">Barcode Value</label>
                <input 
                  id="barcode-val"
                  type="text" 
                  value={barcodeValue} 
                  onChange={(e) => setBarcodeValue(e.target.value)}
                />
                {barcodeError && <span className="error-text">{barcodeError}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="barcode-format">Format</label>
                <select id="barcode-format" value={barcodeFormat} onChange={(e) => setBarcodeFormat(e.target.value)}>
                  <option value="CODE128">Code 128 (Standard ASCII)</option>
                  <option value="EAN13">EAN-13 (13 Digits)</option>
                  <option value="EAN8">EAN-8 (8 Digits)</option>
                  <option value="UPC">UPC-A (12 Digits)</option>
                  <option value="CODE39">Code 39 (Alphanumeric)</option>
                  <option value="ITF">ITF (Interleaved 2 of 5)</option>
                  <option value="CODABAR">Codabar</option>
                </select>
              </div>

              <div className="section-divider">Barcode Styling</div>

              <div className="style-card">
                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="bc-line-color">Line Color</label>
                    <div className="color-picker-input">
                      <input 
                        id="bc-line-color"
                        type="color" 
                        value={barcodeLineColor} 
                        onChange={(e) => setBarcodeLineColor(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="color-hex-text"
                        value={barcodeLineColor.toUpperCase()} 
                        onChange={(e) => setBarcodeLineColor(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group col">
                    <label htmlFor="bc-bg-color">Background Color</label>
                    <div className="color-picker-input">
                      <input 
                        id="bc-bg-color"
                        type="color" 
                        value={barcodeBgColor} 
                        onChange={(e) => setBarcodeBgColor(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="color-hex-text"
                        value={barcodeBgColor.toUpperCase()} 
                        onChange={(e) => setBarcodeBgColor(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="bc-width">Bar Width ({barcodeWidth}px)</label>
                    <input 
                      id="bc-width"
                      type="range" 
                      min="1" 
                      max="4" 
                      step="1"
                      value={barcodeWidth} 
                      onChange={(e) => setBarcodeWidth(e.target.value)}
                    />
                  </div>
                  <div className="form-group col">
                    <label htmlFor="bc-height">Bar Height ({barcodeHeight}px)</label>
                    <input 
                      id="bc-height"
                      type="range" 
                      min="40" 
                      max="150" 
                      step="5"
                      value={barcodeHeight} 
                      onChange={(e) => setBarcodeHeight(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="form-group col col-checkbox">
                    <label className="checkbox-label" style={{ marginTop: '28px' }}>
                      <input 
                        type="checkbox"
                        checked={barcodeDisplayValue}
                        onChange={(e) => setBarcodeDisplayValue(e.target.checked)}
                      />
                      Show Text Label
                    </label>
                  </div>
                  {barcodeDisplayValue && (
                    <div className="form-group col">
                      <label htmlFor="bc-font-size">Font Size ({barcodeFontSize}px)</label>
                      <input 
                        id="bc-font-size"
                        type="range" 
                        min="10" 
                        max="24" 
                        step="1"
                        value={barcodeFontSize} 
                        onChange={(e) => setBarcodeFontSize(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="row">
                  <div className="form-group col">
                    <label htmlFor="bc-margin">Outer Margin ({barcodeMargin}px)</label>
                    <input 
                      id="bc-margin"
                      type="range" 
                      min="0" 
                      max="40" 
                      step="5"
                      value={barcodeMargin} 
                      onChange={(e) => setBarcodeMargin(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* ================= RIGHT SIDE: STICKY PREVIEW CARD ================= */}
        <div className="preview-panel">
          <div className="sticky-preview-card">
            <h3>Live Preview</h3>

            <div className="preview-area-container">
              {activeTab === 'qr' ? (
                <div className="canvas-wrapper">
                  <canvas ref={qrCanvasRef} id="qr-preview-canvas" className="preview-element" />
                </div>
              ) : (
                <div className="canvas-wrapper barcode-wrapper">
                  {barcodeError ? (
                    <div className="preview-error-placeholder">
                      <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <p>{barcodeError}</p>
                    </div>
                  ) : (
                    <>
                      <canvas ref={barcodeCanvasRef} className="preview-element barcode-canvas" />
                      {/* Hidden SVG reference specifically for high-fidelity export */}
                      <svg ref={barcodeSvgRef} style={{ display: 'none' }} />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="preview-actions">
              {activeTab === 'qr' ? (
                <>
                  <button className="btn btn-primary" onClick={handleQrDownloadPNG}>
                    Download PNG
                  </button>
                  <button className="btn btn-secondary" onClick={handleQrDownloadSVG}>
                    Download SVG (Vector)
                  </button>
                  <button className={`btn btn-secondary btn-copy ${copied ? 'copied' : ''}`} onClick={handleQrCopy}>
                    {copied ? 'Copied Image!' : 'Copy to Clipboard'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" disabled={!!barcodeError} onClick={handleBarcodeDownloadPNG}>
                    Download PNG
                  </button>
                  <button className="btn btn-secondary" disabled={!!barcodeError} onClick={handleBarcodeDownloadSVG}>
                    Download SVG (Vector)
                  </button>
                </>
              )}
            </div>
            
            <p className="small note center-text">
              {activeTab === 'qr' 
                ? "Scannable with any mobile camera. Transparent background works best on light sites."
                : "Vector SVG format provides crisp line borders for barcode scanners at any size."}
            </p>
          </div>
        </div>

      </div>
    </article>
  );
}
