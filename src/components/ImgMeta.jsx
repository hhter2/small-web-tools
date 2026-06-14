import React, { useState, useRef } from 'react';
import ExifReader from 'exifreader';

function isCR3(arrayBuffer) {
  if (arrayBuffer.byteLength < 12) return false;
  const view = new DataView(arrayBuffer);
  try {
    const type = view.getUint32(4);
    const brand = view.getUint32(8);
    return type === 0x66747970 && brand === 0x63727820; // 'ftyp' and 'crx '
  } catch (e) {
    return false;
  }
}

function extractCR3Boxes(buffer) {
  const view = new DataView(buffer);
  const cmtBoxes = {};
  let jpegThumbnail = null;

  function readString(offset, length) {
    let str = "";
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(view.getUint8(offset + i));
    }
    return str;
  }

  function scan(offset, end) {
    while (offset + 8 <= end) {
      const size = view.getUint32(offset);
      const type = readString(offset + 4, 4);
      let boxSize = size;
      let headerSize = 8;
      if (size === 1) {
        const high = view.getUint32(offset + 8);
        const low = view.getUint32(offset + 12);
        boxSize = high * 4294967296 + low;
        headerSize = 16;
      } else if (size === 0) {
        boxSize = end - offset;
      }

      if (boxSize < headerSize || offset + boxSize > end) {
        break;
      }

      const trimmedType = type.trim();

      if (trimmedType === 'moov' || trimmedType === 'uuid') {
        let subStart = offset + headerSize;
        const subEnd = offset + boxSize;
        if (trimmedType === 'uuid') {
          subStart += 16; // Skip UUID
        }
        scan(subStart, subEnd);
      } else if (['CMT1', 'CMT2', 'CMT3', 'CMT4'].includes(trimmedType)) {
        const dataStart = offset + headerSize;
        cmtBoxes[trimmedType] = buffer.slice(dataStart, offset + boxSize);
      } else if (trimmedType === 'THMB') {
        const dataStart = offset + headerSize;
        const dataEnd = offset + boxSize;
        const thmbBytes = new Uint8Array(buffer, dataStart, dataEnd - dataStart);
        
        let jpegOffset = -1;
        for (let i = 0; i < thmbBytes.length - 1; i++) {
          if (thmbBytes[i] === 0xFF && thmbBytes[i+1] === 0xD8) {
            jpegOffset = i;
            break;
          }
        }
        if (jpegOffset !== -1) {
          jpegThumbnail = buffer.slice(dataStart + jpegOffset, dataEnd);
        }
      }

      offset += boxSize;
    }
  }

  scan(0, buffer.byteLength);
  return { cmtBoxes, jpegThumbnail };
}

function parseCR3Metadata(arrayBuffer) {
  const { cmtBoxes, jpegThumbnail } = extractCR3Boxes(arrayBuffer);
  const combinedTags = {};
  
  for (const [name, cmtData] of Object.entries(cmtBoxes)) {
    try {
      const tags = ExifReader.load(cmtData);
      Object.assign(combinedTags, tags);
    } catch (err) {
      console.warn(`Failed to parse ${name} tag:`, err);
    }
  }
  
  if (jpegThumbnail) {
    const bytes = new Uint8Array(jpegThumbnail);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    combinedTags['Thumbnail'] = {
      image: jpegThumbnail,
      base64: base64,
      type: 'image/jpeg'
    };
  }
  
  combinedTags['FileType'] = {
    value: 'cr3',
    description: 'Canon CR3 RAW'
  };
  
  return combinedTags;
}

// EXIF Smart Value Formatters
function exifGet(tags, ...keys) {
  for (const k of keys) {
    if (tags[k] !== undefined) return tags[k];
  }
  return null;
}

function fmtVal(tag) {
  if (!tag) return null;
  const d = tag.description;
  const v = tag.value;
  if (d !== undefined && d !== null && String(d).trim() !== '') return String(d).trim();
  if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  return null;
}

function fmtShutterSpeed(tags) {
  const tag = exifGet(tags, 'ExposureTime', 'ShutterSpeedValue');
  if (!tag) return null;
  if (tag.value !== undefined) {
    const num = Array.isArray(tag.value) ? tag.value[0] / tag.value[1] : Number(tag.value);
    if (isNaN(num)) return fmtVal(tag);
    if (num >= 1) return num % 1 === 0 ? `${num}"` : `${num.toFixed(1)}"`;
    return `1/${Math.round(1/num)}`;
  }
  return fmtVal(tag);
}

function fmtAperture(tags) {
  const tag = exifGet(tags, 'FNumber', 'ApertureValue');
  if (!tag) return null;
  if (tag.value !== undefined) {
    let num;
    if (Array.isArray(tag.value)) num = tag.value[0] / tag.value[1];
    else if (typeof tag.value === 'number') num = tag.value;
    else if (tag.description) {
      const d = parseFloat(tag.description);
      return isNaN(d) ? fmtVal(tag) : `f/${d}`;
    }
    if (num !== undefined && !isNaN(num)) {
      if (String(Object.keys(tags).find(k => tags[k] === tag)).includes('Aperture'))
        num = Math.pow(2, num / 2);
      return `f/${parseFloat(num.toFixed(1))}`;
    }
  }
  return fmtVal(tag);
}

function fmtISO(tags) {
  const tag = exifGet(tags, 'ISOSpeedRatings', 'PhotographicSensitivity', 'ISO');
  if (!tag) return null;
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return v !== undefined ? `ISO ${v}` : fmtVal(tag);
}

function fmtFocalLength(tags) {
  const tag = exifGet(tags, 'FocalLength');
  if (!tag) return null;
  if (Array.isArray(tag.value)) {
    const mm = tag.value[0] / tag.value[1];
    return isNaN(mm) ? fmtVal(tag) : `${parseFloat(mm.toFixed(1))} mm`;
  }
  return fmtVal(tag);
}

function fmtFocalLength35(tags) {
  const tag = exifGet(tags, 'FocalLengthIn35mmFilm', 'FocalLengthIn35mmFormat');
  if (!tag) return null;
  const v = Array.isArray(tag.value) ? tag.value[0] : Number(tag.value);
  return isNaN(v) ? fmtVal(tag) : `${v} mm`;
}

function fmtCropFactor(tags) {
  const fl = exifGet(tags, 'FocalLength');
  const fl35 = exifGet(tags, 'FocalLengthIn35mmFilm', 'FocalLengthIn35mmFormat');
  if (!fl || !fl35) return null;
  const flMm = Array.isArray(fl.value) ? fl.value[0] / fl.value[1] : Number(fl.value);
  const fl35Mm = Array.isArray(fl35.value) ? fl35.value[0] : Number(fl35.value);
  if (!flMm || !fl35Mm) return null;
  const crop = fl35Mm / flMm;
  return `${parseFloat(crop.toFixed(2))}×`;
}

function getImageWidth(tags) {
  const tag = exifGet(tags, 'Image Width', 'ImageWidth', 'PixelXDimension', 'ExifImageWidth');
  if (!tag) return null;
  const val = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function getImageHeight(tags) {
  const tag = exifGet(tags, 'Image Height', 'ImageLength', 'PixelYDimension', 'ExifImageHeight');
  if (!tag) return null;
  const val = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function fmtAspectRatio(tags) {
  const w = getImageWidth(tags);
  const h = getImageHeight(tags);
  if (!w || !h) return null;
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const g = gcd(w, h);
  return `${w/g}:${h/g} (${w}×${h})`;
}

function fmtResolution(tags) {
  const w = getImageWidth(tags);
  const h = getImageHeight(tags);
  if (!w || !h) return null;
  const mp = ((w * h) / 1_000_000).toFixed(1);
  return `${w} × ${h} px (${mp} MP)`;
}

function fmtMeteringMode(tags) {
  const tag = exifGet(tags, 'MeteringMode');
  if (!tag) return null;
  const map = { 0:'Unknown', 1:'Average', 2:'Center-weighted', 3:'Spot', 4:'Multi-spot', 5:'Multi-zone', 6:'Partial', 255:'Other' };
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return map[v] || fmtVal(tag);
}

function fmtFlash(tags) {
  const tag = exifGet(tags, 'Flash');
  if (!tag) return null;
  if (tag.description) return tag.description;
  const v = Array.isArray(tag.value) ? tag.value[0] : Number(tag.value);
  const fired = (v & 0x01) ? 'Flash fired' : 'No flash';
  return fired;
}

function fmtWhiteBalance(tags) {
  const tag = exifGet(tags, 'WhiteBalance');
  if (!tag) return null;
  const map = { 0:'Auto', 1:'Manual' };
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return map[v] || fmtVal(tag);
}

function fmtColorSpace(tags) {
  const iccDesc = fmtVal(exifGet(tags, 'ICC Description'));
  if (iccDesc) return iccDesc;

  const iccSpace = fmtVal(exifGet(tags, 'Color Space'));
  if (iccSpace?.trim()) return iccSpace.trim();

  const tag = exifGet(tags, 'ColorSpace', 'exif:ColorSpace');
  if (!tag) return null;
  const map = { 1:'sRGB', 65535:'Uncalibrated', 2:'Adobe RGB' };
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return map[v] || fmtVal(tag);
}

function fmtColorDepth(tags) {
  const bpsTag = exifGet(tags, 'Bits Per Sample', 'BitsPerSample');
  if (!bpsTag) return null;
  const bps = Number(Array.isArray(bpsTag.value) ? bpsTag.value[0] : bpsTag.value);
  if (isNaN(bps)) return fmtVal(bpsTag);

  const compTag = exifGet(tags, 'Color Components', 'SamplesPerPixel', 'ColorComponents');
  let comp = 1;
  if (compTag) {
    const c = Number(Array.isArray(compTag.value) ? compTag.value[0] : compTag.value);
    if (!isNaN(c)) comp = c;
  } else if (bps === 8) {
    comp = 3;
  }

  const totalBits = bps * comp;
  return `${totalBits}-bit`;
}

function fmtDPI(tags) {
  const xResTag = exifGet(tags, 'XResolution', 'X Resolution');
  if (!xResTag) return null;
  
  let val = xResTag.value;
  if (Array.isArray(val)) {
    val = val[0] / val[1];
  } else {
    val = Number(val);
  }
  
  if (isNaN(val)) return fmtVal(xResTag);
  
  const unitTag = exifGet(tags, 'ResolutionUnit', 'Resolution Unit');
  const unit = unitTag ? (Array.isArray(unitTag.value) ? unitTag.value[0] : unitTag.value) : 2;
  
  if (unit === 3) {
    const dpi = Math.round(val * 2.54);
    return `${dpi} dpi`;
  }
  
  return `${Math.round(val)} dpi`;
}

function fmtGPS(tags) {
  const lat = exifGet(tags, 'GPSLatitude');
  const lon = exifGet(tags, 'GPSLongitude');
  if (!lat || !lon) return null;
  
  const getDirSign = (ref, defaultSign) => {
    if (!ref) return defaultSign;
    const s = String(ref).trim().toUpperCase();
    if (s.startsWith('S') || s.startsWith('W')) return '-';
    if (s.startsWith('N') || s.startsWith('E')) return '';
    return defaultSign;
  };

  const latSign = getDirSign(fmtVal(exifGet(tags, 'GPSLatitudeRef')), '');
  const lonSign = getDirSign(fmtVal(exifGet(tags, 'GPSLongitudeRef')), '');

  const formatCoord = (raw, sign) => {
    const n = Math.abs(parseFloat(raw));
    if (isNaN(n)) return raw;
    return `${sign}${n.toFixed(6)}`;
  };

  const latFormatted = formatCoord(fmtVal(lat), latSign);
  const lonFormatted = formatCoord(fmtVal(lon), lonSign);

  return `${latFormatted}, ${lonFormatted}`;
}

function fmtDateTime(tags) {
  const tag = exifGet(tags, 'DateTimeOriginal', 'DateTimeDigitized', 'DateTime');
  if (!tag) return null;
  const v = fmtVal(tag);
  if (!v) return null;
  return v.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
}

function fmtEditTime(tags) {
  const tag = exifGet(tags, 'DateTime', 'FileModifyDate');
  if (!tag) return null;
  return fmtVal(tag)?.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3') || null;
}

function fmtExposureMode(tags) {
  const tag = exifGet(tags, 'ExposureProgram');
  if (!tag) return null;
  const map = { 0:'Not defined', 1:'Manual', 2:'Program AE', 3:'Aperture priority', 4:'Shutter priority', 5:'Creative', 6:'Action', 7:'Portrait', 8:'Landscape', 9:'Bulb' };
  const v = Array.isArray(tag.value) ? tag.value[0] : tag.value;
  return map[v] || fmtVal(tag);
}

const EXIF_GROUPS = [
  {
    id: 'exposure',
    label: 'Exposure',
    icon: '📷',
    tabs: ['exposure', 'all'],
    params: [
      { label: 'Shutter Speed', fn: fmtShutterSpeed },
      { label: 'Aperture',      fn: fmtAperture },
      { label: 'ISO',           fn: fmtISO },
      { label: 'Exp. Bias',     fn: (t) => fmtVal(exifGet(t, 'ExposureBiasValue', 'ExposureCompensation')) },
      { label: 'Exposure Mode', fn: fmtExposureMode },
      { label: 'Metering Mode', fn: fmtMeteringMode },
      { label: 'Flash',         fn: fmtFlash },
    ],
  },
  {
    id: 'colors',
    label: 'Colors',
    icon: '🎨',
    tabs: ['colors', 'all'],
    params: [
      { label: 'White Balance', fn: fmtWhiteBalance },
      { label: 'Color Space',   fn: fmtColorSpace },
      { label: 'Color Depth',   fn: fmtColorDepth },
      { label: 'DPI',           fn: fmtDPI },
    ],
  },
  {
    id: 'optics',
    label: 'Optics',
    icon: '🔭',
    tabs: ['optics', 'all'],
    params: [
      { label: 'Focal Length',   fn: fmtFocalLength },
      { label: 'Focal (35mm eq.)', fn: fmtFocalLength35 },
      { label: 'Image Ratio',    fn: fmtAspectRatio },
      { label: 'Crop Factor',    fn: fmtCropFactor },
    ],
  },
  {
    id: 'others',
    label: 'Others',
    icon: '🗂️',
    tabs: ['others', 'all'],
    params: [
      { label: 'Resolution',    fn: fmtResolution },
      { label: 'Shooting Time', fn: fmtDateTime },
      { label: 'Last Edit Time',fn: fmtEditTime },
      { label: 'Manufacturer',  fn: (t) => fmtVal(exifGet(t, 'Make')) },
      { label: 'File Type',     fn: (t) => fmtVal(exifGet(t, 'FileType')) },
      { label: 'GPS',           fn: fmtGPS },
    ],
  },
];

function downloadJson(tags, filename) {
  const cleanedTags = {};
  for (const [key, val] of Object.entries(tags)) {
    if (key === 'Thumbnail') {
      cleanedTags[key] = {
        base64: val.base64 ? val.base64.substring(0, 100) + '... [truncated]' : undefined,
        type: val.type
      };
    } else {
      cleanedTags[key] = val;
    }
  }
  const jsonString = JSON.stringify(cleanedTags, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/\.[^/.]+$/, "") + "_metadata.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export default function ImgMeta() {
  const [dragOver, setDragOver] = useState(false);
  const [fileMeta, setFileMeta] = useState(null); // { name, type, size }
  const [previewSrc, setPreviewSrc] = useState('');
  const [isRaw, setIsRaw] = useState(false);
  
  const [tags, setTags] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');

  const fileInputRef = useRef(null);

  const processFile = (file) => {
    setStatus('');
    setFileMeta({
      name: file.name,
      type: file.name.split('.').pop().toUpperCase() || 'Unknown',
      size: formatBytes(file.size),
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      try {
        if (isCR3(arrayBuffer)) {
          setFileMeta(prev => ({ ...prev, type: 'Canon CR3 RAW' }));
          const parsedTags = parseCR3Metadata(arrayBuffer);
          setTags(parsedTags);
          
          if (parsedTags.Thumbnail && parsedTags.Thumbnail.base64) {
            setPreviewSrc('data:image/jpeg;base64,' + parsedTags.Thumbnail.base64);
            setIsRaw(false);
          } else {
            setPreviewSrc('');
            setIsRaw(true);
          }
        } else {
          let parsedTags = {};
          try {
            parsedTags = ExifReader.load(arrayBuffer);
          } catch (exifErr) {
            console.warn("ExifReader failed:", exifErr);
            parsedTags = { 'Error': { value: exifErr.message, description: 'No EXIF metadata found or format unsupported.' } };
          }
          setTags(parsedTags);

          const imgReader = new FileReader();
          imgReader.onload = (ev) => {
            setPreviewSrc(ev.target.result);
            setIsRaw(false);
          };
          imgReader.readAsDataURL(file);
        }
      } catch (err) {
        console.error("Processing error:", err);
        setStatus("Error processing file: " + err.message);
      }
    };
    reader.onerror = () => { setStatus("Failed to read file."); };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDropzoneClick = (e) => {
    if (e.target === fileInputRef.current || e.target.closest('label')) {
      return;
    }
    fileInputRef.current.click();
  };

  const handleClear = () => {
    setFileMeta(null);
    setPreviewSrc('');
    setIsRaw(false);
    setTags(null);
    setActiveTab('all');
    setSearchQuery('');
    setStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render helpers
  const query = searchQuery.toLowerCase().trim();

  const renderCamView = () => {
    if (!tags) return null;
    let anyGroup = false;
    const groupsToRender = [];

    for (const group of EXIF_GROUPS) {
      if (!group.tabs.includes(activeTab)) continue;

      const params = group.params.map(p => ({
        label: p.label,
        value: p.fn(tags),
      })).filter(p => {
        if (!query) return true;
        return p.label.toLowerCase().includes(query) || (p.value || '').toLowerCase().includes(query);
      });

      if (params.length === 0) continue;
      anyGroup = true;

      groupsToRender.push(
        <div key={group.id} className="imgmeta-param-group">
          <div className="imgmeta-param-group-header">
            <span className="group-icon">{group.icon}</span>
            {group.label}
          </div>
          <div className="imgmeta-param-grid">
            {params.map((p, idx) => (
              <div key={idx} className="imgmeta-stat-cell">
                <div className="imgmeta-stat-label">{p.label}</div>
                <div className={`imgmeta-stat-value ${p.value ? '' : 'not-available'}`} title={p.value || ''}>
                  {p.value || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!anyGroup) {
      return <div className="imgmeta-no-tags-cam">No matching parameters found.</div>;
    }

    return groupsToRender;
  };

  const renderTableRows = () => {
    if (!tags) return null;
    const sortedKeys = Object.keys(tags).sort();
    const rows = [];
    let matchCount = 0;

    sortedKeys.forEach(tagName => {
      if (tagName === 'Thumbnail' || tagName === 'thumbnail') return;

      const tagData = tags[tagName];
      const valStr = String(tagData.value !== undefined ? tagData.value : '');
      const descStr = String(tagData.description !== undefined ? tagData.description : '');

      if (query) {
        if (!tagName.toLowerCase().includes(query) &&
            !valStr.toLowerCase().includes(query) &&
            !descStr.toLowerCase().includes(query)) return;
      }

      matchCount++;
      rows.push(
        <tr key={tagName}>
          <td>{tagName}</td>
          <td title={valStr}>{valStr}</td>
          <td title={descStr}>{descStr || '—'}</td>
        </tr>
      );
    });

    return { rows, matchCount };
  };

  const tableData = activeTab === 'advanced' ? renderTableRows() : null;

  return (
    <article id="tool-imgmeta" className="tool-card active">
      <h2>ImgMeta</h2>
      <div className="imgmeta-container">
        
        {/* Drag and Drop Zone */}
        {!tags && (
          <div
            id="imgmeta-dropzone"
            className={`imgmeta-dropzone ${dragOver ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleDropzoneClick}
          >
            <div className="dropzone-content">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p className="dropzone-title">Drag &amp; drop an image here</p>
              <p className="dropzone-or">or</p>
              <label htmlFor="imgmeta-file-input" className="btn-secondary" onClick={(e) => e.stopPropagation()}>
                Browse File
              </label>
              <input
                type="file"
                id="imgmeta-file-input"
                accept="image/*,.cr3,.CR3"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <p className="dropzone-note">Supports JPG, PNG, WebP, HEIC, AVIF, and Canon CR3 RAW</p>
            </div>
          </div>
        )}

        {/* Results Area */}
        {tags && (
          <div id="imgmeta-results" className="imgmeta-results-grid" style={{ display: 'grid' }}>
            {/* Left Column: File Info & Preview */}
            <div className="imgmeta-preview-col">
              <div className="card-glass imgmeta-preview-card">
                <div className="imgmeta-img-container">
                  {previewSrc && (
                    <img id="imgmeta-preview-img" alt="Preview" src={previewSrc} style={{ display: 'block' }} />
                  )}
                  {isRaw && (
                    <div id="imgmeta-raw-icon" className="imgmeta-raw-icon" style={{ display: 'flex' }}>
                      <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      <span>RAW IMAGE</span>
                    </div>
                  )}
                </div>
                <div className="imgmeta-file-meta">
                  <h3 id="imgmeta-file-name">{fileMeta?.name}</h3>
                  <p><span className="label">Format:</span> <span>{fileMeta?.type}</span></p>
                  <p><span className="label">Size:</span> <span>{fileMeta?.size}</span></p>
                </div>
              </div>
              <div className="imgmeta-actions">
                <button
                  id="imgmeta-download-json"
                  className="btn-primary flex-1"
                  onClick={() => downloadJson(tags, fileMeta?.name)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export JSON
                </button>
                <button id="imgmeta-clear" className="btn-secondary" onClick={handleClear}>Clear</button>
              </div>
            </div>

            {/* Right Column: Metadata Tabs & Table */}
            <div className="imgmeta-data-col">
              <div className="imgmeta-header-actions">
                <div className="imgmeta-tabs">
                  {['all', 'exposure', 'colors', 'optics', 'others', 'advanced'].map(tab => (
                    <button
                      key={tab}
                      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="imgmeta-search-wrapper">
                  <input
                    type="text"
                    id="imgmeta-tag-search"
                    placeholder="Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Param Group View */}
              {activeTab !== 'advanced' && (
                <div id="imgmeta-cam-view" className="imgmeta-cam-view" style={{ display: 'flex' }}>
                  {renderCamView()}
                </div>
              )}

              {/* Advanced Table View */}
              {activeTab === 'advanced' && tableData && (
                <div id="imgmeta-table-wrapper" className="imgmeta-table-container scrollable" style={{ display: 'block' }}>
                  <table className="imgmeta-table">
                    <thead>
                      <tr>
                        <th>Tag Name</th>
                        <th>Value</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows}
                    </tbody>
                  </table>
                  {tableData.matchCount === 0 && (
                    <div id="imgmeta-no-tags" className="imgmeta-no-tags-msg" style={{ display: 'block' }}>
                      No matching tags found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {status && <p className="small status-msg" id="imgmeta-status">{status}</p>}
    </article>
  );
}
