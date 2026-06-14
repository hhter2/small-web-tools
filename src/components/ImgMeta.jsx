import React, { useState, useRef, useEffect } from 'react';
import ExifReader from 'exifreader';
import JSZip from 'jszip';

// Jpeg Metadata Stripping Logic
function stripJpegMetadata(arrayBuffer, mode) {
  // mode can be: 'private' (strips APP1, APP13) or 'all' (strips APP1, APP2, APP13)
  const view = new DataView(arrayBuffer);
  const length = arrayBuffer.byteLength;
  
  if (length < 2 || view.getUint16(0) !== 0xFFD8) {
    throw new Error("Lossless stripping is only supported for JPEG/JPG images.");
  }
  
  const chunks = [];
  chunks.push(new Uint8Array(arrayBuffer, 0, 2)); // Add SOI (0xFFD8)
  
  let offset = 2;
  while (offset < length) {
    if (offset + 2 > length) {
      chunks.push(new Uint8Array(arrayBuffer, offset));
      break;
    }
    
    const marker = view.getUint16(offset);
    if ((marker & 0xFF00) !== 0xFF00) {
      // Find next 0xFF marker
      let nextFF = offset + 1;
      while (nextFF < length && view.getUint8(nextFF) !== 0xFF) {
        nextFF++;
      }
      chunks.push(new Uint8Array(arrayBuffer, offset, nextFF - offset));
      offset = nextFF;
      continue;
    }
    
    if (marker === 0xFFD9) { // EOI (End of Image)
      chunks.push(new Uint8Array(arrayBuffer, offset, 2));
      break;
    }
    
    if (marker === 0xFFDA) { // SOS (Start of Scan) - copy rest of file
      chunks.push(new Uint8Array(arrayBuffer, offset));
      break;
    }
    
    if (marker >= 0xFFD0 && marker <= 0xFFD7) { // RST markers
      chunks.push(new Uint8Array(arrayBuffer, offset, 2));
      offset += 2;
      continue;
    }
    
    if (offset + 4 > length) {
      chunks.push(new Uint8Array(arrayBuffer, offset));
      break;
    }
    
    const segLength = view.getUint16(offset + 2);
    const totalSegSize = 2 + segLength;
    if (offset + totalSegSize > length) {
      chunks.push(new Uint8Array(arrayBuffer, offset));
      break;
    }
    
    // Determine whether to strip this segment
    let strip = false;
    if (marker === 0xFFE1) { // APP1 (EXIF, GPS, XMP)
      strip = true;
    } else if (marker === 0xFFED) { // APP13 (IPTC)
      strip = true;
    } else if (marker === 0xFFE2) { // APP2 (ICC Profile)
      if (mode === 'all') {
        strip = true;
      }
    }
    
    if (!strip) {
      chunks.push(new Uint8Array(arrayBuffer, offset, totalSegSize));
    }
    
    offset += totalSegSize;
  }
  
  // Combine all chunks into a single Uint8Array
  let totalBytes = 0;
  for (const chunk of chunks) {
    totalBytes += chunk.byteLength;
  }
  
  const result = new Uint8Array(totalBytes);
  let writeOffset = 0;
  for (const chunk of chunks) {
    result.set(chunk, writeOffset);
    writeOffset += chunk.byteLength;
  }
  
  return result.buffer;
}

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
  const combinedExpanded = {
    exif: {},
    gps: {},
    iptc: {},
    xmp: {},
    icc: {},
    file: {},
    makerNotes: {},
    composite: {}
  };
  
  for (const [name, cmtData] of Object.entries(cmtBoxes)) {
    try {
      const tags = ExifReader.load(cmtData);
      Object.assign(combinedTags, tags);
      
      const expTags = ExifReader.load(cmtData, { expanded: true });
      for (const groupName of Object.keys(expTags)) {
        if (expTags[groupName]) {
          combinedExpanded[groupName] = {
            ...combinedExpanded[groupName],
            ...expTags[groupName]
          };
        }
      }
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
  
  return { tags: combinedTags, expandedTags: combinedExpanded };
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
  const dpi = fmtDPI(tags);
  return dpi ? `${mp} MP (${dpi})` : `${mp} MP`;
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

const ADVANCED_GROUPS = [
  { id: 'exif', label: 'EXIF Metadata', icon: '📷' },
  { id: 'gps', label: 'GPS Metadata', icon: '📍' },
  { id: 'iptc', label: 'IPTC Metadata', icon: '📰' },
  { id: 'xmp', label: 'XMP Metadata', icon: '📝' },
  { id: 'icc', label: 'ICC Color Profile', icon: '🎨' },
  { id: 'file', label: 'File & Format Info', icon: '💾' },
  { id: 'makerNotes', label: 'Maker Notes (Camera Specific)', icon: '⚙️' },
  { id: 'composite', label: 'Composite / Calculated', icon: '🧮' },
  { id: 'other', label: 'Other Metadata', icon: '🗂️' },
];

function getTagGroup(tagName, expandedTags) {
  if (!expandedTags) return 'other';
  if (expandedTags.gps && tagName in expandedTags.gps) return 'gps';
  if (expandedTags.exif && tagName in expandedTags.exif) return 'exif';
  if (expandedTags.iptc && tagName in expandedTags.iptc) return 'iptc';
  if (expandedTags.xmp && tagName in expandedTags.xmp) return 'xmp';
  if (expandedTags.icc && tagName in expandedTags.icc) return 'icc';
  if (expandedTags.makerNotes && tagName in expandedTags.makerNotes) return 'makerNotes';
  if (expandedTags.composite && tagName in expandedTags.composite) return 'composite';
  
  if (
    (expandedTags.file && tagName in expandedTags.file) ||
    (expandedTags.jfif && tagName in expandedTags.jfif) ||
    (expandedTags.png && tagName in expandedTags.png) ||
    (expandedTags.riff && tagName in expandedTags.riff) ||
    (expandedTags.gif && tagName in expandedTags.gif)
  ) {
    return 'file';
  }
  
  const nameLower = tagName.toLowerCase();
  if (nameLower.startsWith('gps')) return 'gps';
  if (nameLower.startsWith('icc')) return 'icc';
  if (nameLower.startsWith('xmp')) return 'xmp';
  if (nameLower.startsWith('iptc')) return 'iptc';
  if (nameLower.includes('maker') || nameLower.includes('canon') || nameLower.includes('nikon') || nameLower.includes('sony')) return 'makerNotes';
  
  return 'other';
}

function getDecimalCoords(tags, expandedTags) {
  if (expandedTags?.gps?.Latitude !== undefined && expandedTags?.gps?.Longitude !== undefined) {
    return {
      lat: expandedTags.gps.Latitude,
      lon: expandedTags.gps.Longitude
    };
  }
  
  const formatted = fmtGPS(tags);
  if (!formatted) return null;
  const parts = formatted.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { lat: parts[0], lon: parts[1] };
  }
  
  return null;
}

const COMPARE_FIELDS = [
  { label: 'Filename', fn: (img) => img.name },
  { label: 'Preview', fn: (img) => (
      <div className="compare-preview-thumb">
        {img.previewSrc ? (
          <img src={img.previewSrc} alt={img.name} />
        ) : (
          <div className="compare-raw-thumb">RAW</div>
        )}
      </div>
    )
  },
  { label: 'Format', fn: (img) => img.type },
  { label: 'File Size', fn: (img) => img.strippedInfo ? img.strippedInfo.formattedSize : img.formattedSize },
  { label: 'Resolution', fn: (img) => fmtResolution(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Aspect Ratio', fn: (img) => fmtAspectRatio(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Camera', fn: (img) => {
      const tags = img.strippedInfo ? img.strippedInfo.tags : img.tags;
      const make = fmtVal(exifGet(tags, 'Make'));
      const model = fmtVal(exifGet(tags, 'Model'));
      if (make && model) return `${make} ${model}`;
      return make || model || null;
    }
  },
  { label: 'Lens', fn: (img) => fmtVal(exifGet(img.strippedInfo ? img.strippedInfo.tags : img.tags, 'LensModel', 'LensType')) },
  { label: 'Date Taken', fn: (img) => fmtDateTime(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Shutter Speed', fn: (img) => fmtShutterSpeed(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Aperture', fn: (img) => fmtAperture(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'ISO', fn: (img) => fmtISO(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Exp. Bias', fn: (img) => fmtVal(exifGet(img.strippedInfo ? img.strippedInfo.tags : img.tags, 'ExposureBiasValue', 'ExposureCompensation')) },
  { label: 'Exposure Mode', fn: (img) => fmtExposureMode(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Metering Mode', fn: (img) => fmtMeteringMode(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Focal Length', fn: (img) => fmtFocalLength(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Color Space', fn: (img) => fmtColorSpace(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Color Depth', fn: (img) => fmtColorDepth(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'GPS', fn: (img) => fmtGPS(img.strippedInfo ? img.strippedInfo.tags : img.tags) },
  { label: 'Software', fn: (img) => fmtVal(exifGet(img.strippedInfo ? img.strippedInfo.tags : img.tags, 'Software')) },
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
  const [images, setImages] = useState([]); // Array of parsed image objects
  const [selectedImageId, setSelectedImageId] = useState(null); // Active single-view image
  const [compareMode, setCompareMode] = useState(false); // Toggle side-by-side view
  const [compareSelectedIds, setCompareSelectedIds] = useState([]); // Selected image IDs for comparison
  const [showMap, setShowMap] = useState(false); // GPS Map toggle
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');

  // Synchronize compareSelectedIds with loaded images
  useEffect(() => {
    setCompareSelectedIds(prev => {
      const activeIds = images.map(img => img.id);
      const kept = prev.filter(id => activeIds.includes(id));
      const newIds = activeIds.filter(id => !prev.includes(id));
      return [...kept, ...newIds];
    });
  }, [images]);

  const handleToggleCompareSelection = (id) => {
    setCompareSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const [collapsedGroups, setCollapsedGroups] = useState({
    exif: false,
    gps: false,
    iptc: false,
    xmp: false,
    icc: false,
    file: false,
    makerNotes: false,
    composite: false,
    other: false,
  });

  const fileInputRef = useRef(null);

  // Reset map view state when selected image changes
  React.useEffect(() => {
    setShowMap(false);
  }, [selectedImageId]);

  const processFiles = async (files) => {
    setStatus('');
    const newImages = [];
    
    for (const file of files) {
      const loadPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target.result;
          let parsedTags = {};
          let expandedTags = {};
          let previewSrc = '';
          let isRaw = false;
          let type = file.name.split('.').pop().toUpperCase() || 'Unknown';
          
          try {
            if (isCR3(arrayBuffer)) {
              type = 'Canon CR3 RAW';
              const result = parseCR3Metadata(arrayBuffer);
              parsedTags = result.tags;
              expandedTags = result.expandedTags;
              
              if (parsedTags.Thumbnail && parsedTags.Thumbnail.base64) {
                previewSrc = 'data:image/jpeg;base64,' + parsedTags.Thumbnail.base64;
                isRaw = false;
              } else {
                isRaw = true;
              }
            } else {
              try {
                parsedTags = ExifReader.load(arrayBuffer);
              } catch (exifErr) {
                console.warn("ExifReader failed:", exifErr);
                parsedTags = { 'Error': { value: exifErr.message, description: 'No EXIF metadata found or format unsupported.' } };
              }
              
              try {
                expandedTags = ExifReader.load(arrayBuffer, { expanded: true });
              } catch (e) {
                expandedTags = {};
              }
              
              // Load preview URL
              previewSrc = await new Promise((resPreview) => {
                const imgReader = new FileReader();
                imgReader.onload = (ev) => resPreview(ev.target.result);
                imgReader.onerror = () => resPreview('');
                imgReader.readAsDataURL(file);
              });
              isRaw = false;
            }
            
            resolve({
              id: Date.now() + Math.random().toString(36).substr(2, 9),
              file: file,
              name: file.name,
              type: type,
              size: file.size,
              formattedSize: formatBytes(file.size),
              tags: parsedTags,
              expandedTags: expandedTags,
              previewSrc: previewSrc,
              isRaw: isRaw,
              originalBuffer: arrayBuffer,
              strippedInfo: null
            });
            
          } catch (err) {
            console.error("Processing error:", err);
            setStatus(`Error processing ${file.name}: ${err.message}`);
            resolve(null);
          }
        };
        reader.onerror = () => {
          setStatus(`Failed to read ${file.name}`);
          resolve(null);
        };
        reader.readAsArrayBuffer(file);
      });
      
      const res = await loadPromise;
      if (res) {
        newImages.push(res);
      }
    }
    
    if (newImages.length > 0) {
      setImages(prev => {
        const updated = [...prev, ...newImages];
        if (!selectedImageId && updated.length > 0) {
          setSelectedImageId(updated[0].id);
        }
        return updated;
      });
    }
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
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDropzoneClick = (e) => {
    if (e.target === fileInputRef.current || e.target.closest('label') || e.target.closest('button')) {
      return;
    }
    fileInputRef.current.click();
  };

  const handleRemoveImage = (id) => {
    const imgToRemove = images.find(img => img.id === id);
    if (imgToRemove?.strippedInfo?.previewSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(imgToRemove.strippedInfo.previewSrc);
    }
    
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      if (selectedImageId === id) {
        setSelectedImageId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleClear = () => {
    images.forEach(img => {
      if (img.strippedInfo?.previewSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(img.strippedInfo.previewSrc);
      }
    });
    setImages([]);
    setSelectedImageId(null);
    setCompareMode(false);
    setActiveTab('all');
    setSearchQuery('');
    setStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStripMetadata = (image, mode) => {
    try {
      const isJpeg = image.type === 'JPEG' || image.type === 'JPG' || image.name.toLowerCase().endsWith('.jpg') || image.name.toLowerCase().endsWith('.jpeg');
      
      if (!isJpeg) {
        setStatus("Lossless stripping is only supported for JPEG/JPG images.");
        return;
      }
      
      const strippedBuffer = stripJpegMetadata(image.originalBuffer, mode);
      
      let strippedTags = {};
      let strippedExpanded = {};
      try {
        strippedTags = ExifReader.load(strippedBuffer);
      } catch (e) {
        console.log("Verified: No EXIF tags found in stripped image.");
      }
      try {
        strippedExpanded = ExifReader.load(strippedBuffer, { expanded: true });
      } catch (e) {
        strippedExpanded = {};
      }
      
      const removedTags = [];
      const retainedTags = [];
      
      for (const tagName of Object.keys(image.tags)) {
        if (tagName === 'Thumbnail' || tagName === 'thumbnail' || tagName === 'FileType') continue;
        if (tagName in strippedTags) {
          retainedTags.push(tagName);
        } else {
          removedTags.push(tagName);
        }
      }
      
      const blob = new Blob([strippedBuffer], { type: 'image/jpeg' });
      const strippedPreviewSrc = URL.createObjectURL(blob);
      
      setImages(prev => prev.map(img => {
        if (img.id === image.id) {
          return {
            ...img,
            strippedInfo: {
              mode: mode,
              buffer: strippedBuffer,
              tags: strippedTags,
              expandedTags: strippedExpanded,
              removedTags: removedTags,
              retainedTags: retainedTags,
              previewSrc: strippedPreviewSrc,
              formattedSize: formatBytes(strippedBuffer.byteLength),
            }
          };
        }
        return img;
      }));
      
      setStatus(`Successfully stripped ${mode === 'private' ? 'private info' : 'all metadata'} losslessly!`);
    } catch (err) {
      console.error(err);
      setStatus("Error stripping metadata: " + err.message);
    }
  };

  const handleRestoreOriginal = (imageId) => {
    setImages(prev => prev.map(img => {
      if (img.id === imageId) {
        if (img.strippedInfo && img.strippedInfo.previewSrc && img.strippedInfo.previewSrc.startsWith('blob:')) {
          URL.revokeObjectURL(img.strippedInfo.previewSrc);
        }
        return {
          ...img,
          strippedInfo: null
        };
      }
      return img;
    }));
    setStatus("Restored original metadata.");
  };

  const downloadStrippedFile = (image) => {
    if (!image.strippedInfo) return;
    const blob = new Blob([image.strippedInfo.buffer], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const ext = image.name.split('.').pop();
    const nameWithoutExt = image.name.substring(0, image.name.lastIndexOf('.'));
    a.download = `${nameWithoutExt}_stripped.${ext}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportZip = async () => {
    if (images.length === 0) return;
    setStatus('Generating ZIP file...');
    try {
      const zip = new JSZip();
      
      for (const image of images) {
        const buffer = image.strippedInfo ? image.strippedInfo.buffer : image.originalBuffer;
        
        let filename = image.name;
        if (image.strippedInfo) {
          const ext = image.name.split('.').pop();
          const nameWithoutExt = image.name.substring(0, image.name.lastIndexOf('.'));
          filename = `${nameWithoutExt}_stripped.${ext}`;
        }
        
        zip.file(filename, buffer);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imgmeta_exported_images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus('ZIP file exported successfully!');
    } catch (err) {
      console.error(err);
      setStatus('Error generating ZIP: ' + err.message);
    }
  };

  const activeImage = images.find(img => img.id === selectedImageId) || images[0];
  const displayedTags = activeImage ? (activeImage.strippedInfo ? activeImage.strippedInfo.tags : activeImage.tags) : null;
  const displayedExpanded = activeImage ? (activeImage.strippedInfo ? activeImage.strippedInfo.expandedTags : activeImage.expandedTags) : null;
  const displayedPreviewSrc = activeImage ? (activeImage.strippedInfo ? activeImage.strippedInfo.previewSrc : activeImage.previewSrc) : '';
  const displayedSize = activeImage ? (activeImage.strippedInfo ? activeImage.strippedInfo.formattedSize : activeImage.formattedSize) : '';
  const isRaw = activeImage ? activeImage.isRaw : false;

  const gpsCoords = displayedTags ? getDecimalCoords(displayedTags, displayedExpanded) : null;
  const gpsCoord = displayedTags ? fmtGPS(displayedTags) : null;

  const query = searchQuery.toLowerCase().trim();

  const renderCamView = () => {
    if (!displayedTags) return null;
    let anyGroup = false;
    const groupsToRender = [];

    for (const group of EXIF_GROUPS) {
      if (!group.tabs.includes(activeTab)) continue;

      const params = group.params.map(p => ({
        label: p.label,
        value: p.fn(displayedTags),
      })).filter(p => {
        // If there is an isolated GPS block, do not show GPS in the Other/All tables
        if (p.label === 'GPS' && gpsCoord) return false;
        
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

  const getGroupedAdvancedTags = () => {
    if (!displayedTags) return {};
    
    const groups = {
      exif: [],
      gps: [],
      iptc: [],
      xmp: [],
      icc: [],
      file: [],
      makerNotes: [],
      composite: [],
      other: []
    };
    
    let matchCount = 0;
    
    Object.keys(displayedTags).forEach(tagName => {
      if (tagName === 'Thumbnail' || tagName === 'thumbnail') return;
      
      const tagData = displayedTags[tagName];
      const valStr = String(tagData.value !== undefined ? tagData.value : '');
      const descStr = String(tagData.description !== undefined ? tagData.description : '');
      
      if (query) {
        if (!tagName.toLowerCase().includes(query) &&
            !valStr.toLowerCase().includes(query) &&
            !descStr.toLowerCase().includes(query)) return;
      }
      
      const groupKey = getTagGroup(tagName, displayedExpanded);
      groups[groupKey].push({
        name: tagName,
        value: valStr,
        description: descStr
      });
      matchCount++;
    });
    
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return { groups, matchCount };
  };

  const toggleExpandAll = () => {
    const anyCollapsed = Object.values(collapsedGroups).some(v => v);
    const target = !anyCollapsed;
    setCollapsedGroups({
      exif: target,
      gps: target,
      iptc: target,
      xmp: target,
      icc: target,
      file: target,
      makerNotes: target,
      composite: target,
      other: target,
    });
  };

  const renderAdvancedGroups = () => {
    const { groups, matchCount } = getGroupedAdvancedTags();
    
    if (matchCount === 0) {
      return (
        <div id="imgmeta-no-tags" className="imgmeta-no-tags-msg" style={{ display: 'block' }}>
          No matching tags found.
        </div>
      );
    }
    
    return (
      <div className="imgmeta-advanced-wrapper">
        <div className="advanced-toolbar">
          <span className="match-count">Found {matchCount} metadata tags</span>
          <button className="btn-secondary btn-sm" onClick={toggleExpandAll}>
            {Object.values(collapsedGroups).every(v => !v) ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        
        <div className="advanced-groups-list">
          {ADVANCED_GROUPS.map(g => {
            const list = groups[g.id] || [];
            if (list.length === 0) return null;
            
            const isCollapsed = collapsedGroups[g.id];
            
            return (
              <div key={g.id} className={`advanced-group-card ${isCollapsed ? 'collapsed' : ''}`}>
                <div
                  className="advanced-group-header"
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                >
                  <div className="header-label">
                    <span className="group-icon">{g.icon}</span>
                    <span className="group-name">{g.label}</span>
                    <span className="group-count">({list.length})</span>
                  </div>
                  <span className="collapse-arrow">{isCollapsed ? '▼' : '▲'}</span>
                </div>
                
                {!isCollapsed && (
                  <div className="advanced-group-body">
                    <table className="imgmeta-table">
                      <thead>
                        <tr>
                          <th>Tag Name</th>
                          <th>Value</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map(tag => (
                          <tr key={tag.name}>
                            <td>{tag.name}</td>
                            <td title={tag.value}>{tag.value}</td>
                            <td title={tag.description}>{tag.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCompareView = () => {
    const comparedImages = images.filter(img => compareSelectedIds.includes(img.id));

    return (
      <div className="imgmeta-compare-container card-glass">
        <div className="compare-header">
          <h3>⚖️ Side-by-Side Metadata Comparison</h3>
          <button className="btn-secondary btn-sm" onClick={() => setCompareMode(false)}>
            Back to Detail View
          </button>
        </div>
        <div className="imgmeta-table-container compare-table-wrapper">
          {comparedImages.length > 0 ? (
            <table className="imgmeta-table compare-table">
              <thead>
                <tr>
                  <th>Field / Parameter</th>
                  {comparedImages.map(img => (
                    <th key={img.id} className={img.id === selectedImageId ? 'active-col' : ''}>
                      <div className="compare-th-content">
                        <span className="compare-filename" title={img.name}>{img.name}</span>
                        <button
                          className="btn-close-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCompareSelection(img.id);
                          }}
                          title="Exclude from comparison"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_FIELDS.map((field, fIdx) => (
                  <tr key={fIdx}>
                    <td className="compare-field-label">{field.label}</td>
                    {comparedImages.map(img => {
                      const val = field.fn(img);
                      return (
                        <td
                          key={img.id}
                          className={`${img.id === selectedImageId ? 'active-col' : ''} ${!val ? 'not-available' : ''}`}
                        >
                          {val || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="compare-empty-state">
              <p>No images selected for comparison.</p>
              <p className="small text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Use the checkboxes on the thumbnails above to select images to compare.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderThumbnailsBar = () => {
    if (images.length === 0) return null;
    
    const isJpeg = activeImage && (activeImage.type === 'JPEG' || activeImage.type === 'JPG' || activeImage.name.toLowerCase().endsWith('.jpg') || activeImage.name.toLowerCase().endsWith('.jpeg'));
    
    return (
      <div className="imgmeta-top-bar card-glass">
        <div className="thumbnails-scroll-container">
          {images.map(img => (
            <div
              key={img.id}
              className={`thumbnail-card ${img.id === selectedImageId ? 'selected' : ''}`}
              onClick={() => {
                setSelectedImageId(img.id);
              }}
            >
              {images.length > 1 && (
                <input
                  type="checkbox"
                  className="thumb-compare-checkbox"
                  checked={compareSelectedIds.includes(img.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggleCompareSelection(img.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title="Include in comparison"
                />
              )}
              <div className="thumb-img-wrapper">
                {img.previewSrc ? (
                  <img src={img.previewSrc} alt={img.name} />
                ) : (
                  <div className="thumb-raw-icon">RAW</div>
                )}
                <button
                  className="thumb-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(img.id);
                  }}
                  title="Remove image"
                >
                  ×
                </button>
              </div>
              <div className="thumb-info">
                <span className="thumb-name" title={img.name}>{img.name}</span>
                <span className="thumb-size">{img.strippedInfo ? img.strippedInfo.formattedSize : img.formattedSize}</span>
              </div>
            </div>
          ))}
          
          <div className="thumbnail-add-card" onClick={handleDropzoneClick}>
            <div className="add-icon">+</div>
            <span>Add More</span>
          </div>
        </div>
        
        <div className="top-bar-actions">
          {/* Metadata Stripping inline */}
          {activeImage && isJpeg && (
            <div className="top-bar-stripper">
              {!activeImage.strippedInfo ? (
                <>
                  <span className="stripper-mini-label">Strip:</span>
                  <button
                    className="btn-accent btn-sm"
                    onClick={() => handleStripMetadata(activeImage, 'private')}
                  >
                    🔒 Private
                  </button>
                  <button
                    className="btn-accent-outline btn-sm"
                    onClick={() => handleStripMetadata(activeImage, 'all')}
                  >
                    🗑️ All
                  </button>
                </>
              ) : (
                <>
                  <span className="stripper-mini-status">
                    ✓ {activeImage.strippedInfo.mode === 'private' ? 'Private' : 'All'}
                  </span>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => downloadStrippedFile(activeImage)}
                  >
                    💾 Download
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => handleRestoreOriginal(activeImage.id)}
                  >
                    🔄 Restore
                  </button>
                </>
              )}
            </div>
          )}

          <button
            className={`btn-secondary ${compareMode ? 'active' : ''}`}
            onClick={() => setCompareMode(!compareMode)}
            title="Toggle side-by-side comparison"
          >
            ⚖️ Compare {images.length > 1 ? `(${compareSelectedIds.length})` : ''}
          </button>
          <button
            className="btn-primary"
            onClick={handleExportZip}
            title="Export all images as a ZIP archive"
          >
            📦 Export to Folder (.zip)
          </button>
          <button className="btn-secondary" onClick={handleClear}>
            Clear All
          </button>
        </div>
      </div>
    );
  };

  return (
    <article id="tool-imgmeta" className="tool-card active">
      <h2>ImgMeta</h2>
      <div 
        className="imgmeta-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Always render the file input so it is accessible via Ref */}
        <input
          type="file"
          id="imgmeta-file-input"
          accept="image/*,.cr3,.CR3"
          multiple
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {/* Full-width drag over overlay when files are already present */}
        {dragOver && images.length > 0 && (
          <div className="imgmeta-drag-overlay">
            <div className="overlay-content">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p>Drop files to add to ImgMeta</p>
            </div>
          </div>
        )}

        {/* Thumbnails list bar at the top */}
        {renderThumbnailsBar()}

        {/* Drag and Drop Zone */}
        {images.length === 0 && (
          <div
            id="imgmeta-dropzone"
            className={`imgmeta-dropzone ${dragOver ? 'dragover' : ''}`}
            onClick={handleDropzoneClick}
          >
            <div className="dropzone-content">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p className="dropzone-title">Drag &amp; drop images here</p>
              <p className="dropzone-or">or</p>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
              >
                Browse Files
              </button>
              <p className="dropzone-note">Supports JPG, PNG, WebP, HEIC, AVIF, and Canon CR3 RAW</p>
            </div>
          </div>
        )}

        {/* Results Area */}
        {images.length > 0 && compareMode && renderCompareView()}

        {images.length > 0 && !compareMode && activeImage && (
          <div id="imgmeta-results" className="imgmeta-results-grid" style={{ display: 'grid' }}>
            {/* Left Column: File Info & Preview & Stripper Diff */}
            <div className="imgmeta-preview-col">
              <div className="card-glass imgmeta-preview-card">
                <div className="imgmeta-img-container">
                  {displayedPreviewSrc && (
                    <img id="imgmeta-preview-img" alt="Preview" src={displayedPreviewSrc} style={{ display: 'block' }} />
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
                  <h3 id="imgmeta-file-name">{activeImage.name}</h3>
                  <p><span className="label">Format:</span> <span>{activeImage.type}</span></p>
                  <p><span className="label">Size:</span> <span>{displayedSize}</span></p>
                </div>
              </div>

              {/* Stripper Diff (Visual list of removed vs retained tags) */}
              {activeImage.strippedInfo && (
                <div className="card-glass imgmeta-stripper-card">
                  <h4>Stripped Tags Verification</h4>
                  <div className="stripper-result">
                    <div className="stripper-diff">
                      <div className="diff-section removed">
                        <span className="diff-label">Removed ({activeImage.strippedInfo.removedTags.length})</span>
                        <div className="diff-tags-list">
                          {activeImage.strippedInfo.removedTags.slice(0, 10).map(t => (
                            <span key={t} className="tag-pill removed">{t}</span>
                          ))}
                          {activeImage.strippedInfo.removedTags.length > 10 && (
                            <span className="tag-pill more">+{activeImage.strippedInfo.removedTags.length - 10} more</span>
                          )}
                          {activeImage.strippedInfo.removedTags.length === 0 && <span className="no-tags">None</span>}
                        </div>
                      </div>
                      <div className="diff-section retained">
                        <span className="diff-label">Retained ({activeImage.strippedInfo.retainedTags.length})</span>
                        <div className="diff-tags-list">
                          {activeImage.strippedInfo.retainedTags.slice(0, 10).map(t => (
                            <span key={t} className="tag-pill retained">{t}</span>
                          ))}
                          {activeImage.strippedInfo.retainedTags.length > 10 && (
                            <span className="tag-pill more">+{activeImage.strippedInfo.retainedTags.length - 10} more</span>
                          )}
                          {activeImage.strippedInfo.retainedTags.length === 0 && <span className="no-tags">None</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Actions */}
              <div className="imgmeta-actions">
                <button
                  id="imgmeta-download-json"
                  className="btn-primary flex-1"
                  onClick={() => downloadJson(displayedTags, activeImage.name)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export JSON
                </button>
                <button id="imgmeta-clear" className="btn-secondary" onClick={() => handleRemoveImage(activeImage.id)}>Remove</button>
              </div>
            </div>

            {/* Right Column: Metadata Tabs, Table & GPS Map */}
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
                  
                  {/* GPS Coordinates & Interactive Map (embedded OpenStreetMap) */}
                  {gpsCoords && (
                    <div className="card-glass imgmeta-gps-card green-region-gps">
                      <div className="green-region-gps-inner">
                        <div className="gps-header">
                          <h4>📍 GPS Location</h4>
                          <p className="coords-text">{gpsCoord}</p>
                          <div className="gps-actions">
                            <button
                              type="button"
                              className="btn-accent-outline btn-sm"
                              onClick={() => setShowMap(!showMap)}
                            >
                              {showMap ? '🙈 Hide Map' : '🗺️ Show Map'}
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${gpsCoords.lat},${gpsCoords.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                            >
                              Google Maps ↗
                            </a>
                          </div>
                        </div>
                        {showMap && (
                          <div className="gps-map-container large-map">
                            <iframe
                              title="GPS Location Map"
                              width="100%"
                              height="380"
                              frameBorder="0"
                              scrolling="no"
                              marginHeight="0"
                              marginWidth="0"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsCoords.lon-0.01}%2C${gpsCoords.lat-0.01}%2C${gpsCoords.lon+0.01}%2C${gpsCoords.lat+0.01}&layer=mapnik&marker=${gpsCoords.lat}%2C${gpsCoords.lon}`}
                              style={{ border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '12px' }}
                            ></iframe>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Table View - Collapsible Groups */}
              {activeTab === 'advanced' && (
                <div className="imgmeta-advanced-wrapper-outer" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {renderAdvancedGroups()}
                  
                  {/* GPS Coordinates & Interactive Map (embedded OpenStreetMap) */}
                  {gpsCoords && (
                    <div className="card-glass imgmeta-gps-card green-region-gps">
                      <div className="green-region-gps-inner">
                        <div className="gps-header">
                          <h4>📍 GPS Location</h4>
                          <p className="coords-text">{gpsCoord}</p>
                          <div className="gps-actions">
                            <button
                              type="button"
                              className="btn-accent-outline btn-sm"
                              onClick={() => setShowMap(!showMap)}
                            >
                              {showMap ? '🙈 Hide Map' : '🗺️ Show Map'}
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${gpsCoords.lat},${gpsCoords.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                            >
                              Google Maps ↗
                            </a>
                          </div>
                        </div>
                        {showMap && (
                          <div className="gps-map-container large-map">
                            <iframe
                              title="GPS Location Map"
                              width="100%"
                              height="380"
                              frameBorder="0"
                              scrolling="no"
                              marginHeight="0"
                              marginWidth="0"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsCoords.lon-0.01}%2C${gpsCoords.lat-0.01}%2C${gpsCoords.lon+0.01}%2C${gpsCoords.lat+0.01}&layer=mapnik&marker=${gpsCoords.lat}%2C${gpsCoords.lon}`}
                              style={{ border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '12px' }}
                            ></iframe>
                          </div>
                        )}
                      </div>
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
