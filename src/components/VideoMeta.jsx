import React, { useState, useRef, useEffect } from 'react';
import { ensureFFmpegLoaded, guessMime } from './mediaSeparatorEngine';
import MediaSeparatorWaveform from './MediaSeparatorWaveform';
import Card from './ui/Card';
import Button from './ui/Button';

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

function readUint32BE(buf, offset) {
  return ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0;
}

function readUint16BE(buf, offset) {
  return ((buf[offset] << 8) | buf[offset + 1]) >>> 0;
}

function latin1ToString(bytes) {
  return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// ITU-T H.273 Color parameter mappings
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_PRIMARIES = {
  1: 'BT.709 (sRGB)', 2: 'Unspecified', 4: 'BT.470M', 5: 'BT.601 (PAL)',
  6: 'BT.601 (NTSC)', 7: 'SMPTE 240M', 8: 'Generic Film', 9: 'BT.2020',
  10: 'SMPTE ST 428', 11: 'SMPTE RP 431', 12: 'Display P3 (D65)', 22: 'EBU Tech 3213-E',
};

const TRANSFER_CHARACTERISTICS = {
  1: 'BT.709 (SDR)', 2: 'Unspecified', 4: 'BT.470M (Gamma 2.2)', 5: 'BT.470BG (Gamma 2.8)',
  6: 'BT.601 (SDR)', 7: 'SMPTE 240M', 8: 'Linear', 9: 'Log (100:1)', 10: 'Log (316:1)',
  11: 'IEC 61966-2-4', 13: 'IEC 61966-2-1 (sRGB)', 14: 'BT.2020 (10-bit)',
  15: 'BT.2020 (12-bit)', 16: 'SMPTE ST 2084 (PQ / HDR10)', 17: 'SMPTE ST 428',
  18: 'ARIB STD-B67 (HLG)',
};

const MATRIX_COEFFICIENTS = {
  0: 'Identity (RGB)', 1: 'BT.709', 2: 'Unspecified', 4: 'FCC', 5: 'BT.601 (PAL)',
  6: 'BT.601 (NTSC)', 7: 'SMPTE 240M', 8: 'YCgCo', 9: 'BT.2020 (NCL)',
  10: 'BT.2020 (CL)', 11: 'SMPTE ST 2085', 14: 'ICtCp (BT.2100)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Codec FourCC mapping
// ─────────────────────────────────────────────────────────────────────────────

const VIDEO_CODEC_MAP = {
  'avc1': 'H.264 (AVC)', 'avc2': 'H.264 (AVC)', 'avc3': 'H.264 (AVC)', 'avc4': 'H.264 (AVC)',
  'hev1': 'H.265 (HEVC)', 'hvc1': 'H.265 (HEVC)',
  'vp08': 'VP8', 'vp09': 'VP9', 'av01': 'AV1', 'mp4v': 'MPEG-4 Part 2', 's263': 'H.263',
  'dvhe': 'Dolby Vision HEVC', 'dvh1': 'Dolby Vision HEVC',
  'dva1': 'Dolby Vision AVC', 'dvav': 'Dolby Vision AVC',
  'ap4h': 'Apple ProRes 4444', 'ap4x': 'Apple ProRes 4444 XQ',
  'apch': 'Apple ProRes 422 HQ', 'apcn': 'Apple ProRes 422',
  'apcs': 'Apple ProRes 422 LT', 'apco': 'Apple ProRes 422 Proxy',
  'aprh': 'Apple ProRes RAW HQ', 'aprn': 'Apple ProRes RAW',
};

const AUDIO_CODEC_MAP = {
  'mp4a': 'AAC', 'ac-3': 'Dolby Digital (AC-3)', 'ec-3': 'Dolby Digital Plus (E-AC-3)',
  'alac': 'Apple Lossless (ALAC)', 'fLaC': 'FLAC', 'Opus': 'Opus', 'vorbis': 'Vorbis',
  'lpcm': 'Linear PCM', 'sowt': 'PCM (Little-Endian)', 'twos': 'PCM (Big-Endian)',
  'alaw': 'A-law PCM', 'ulaw': '\u00b5-law PCM',
  'dtsc': 'DTS Core', 'dtse': 'DTS-HD LBR', 'dtsh': 'DTS-HD', 'dtsl': 'DTS-HD Lossless',
};

const SUBTITLE_HANDLER_TYPES = ['sbtl', 'text', 'subt', 'clcp', 'subp'];

const getAudioExtension = (codecFourCC, codecName) => {
  const codecc = (codecFourCC || '').toLowerCase();
  const name = (codecName || '').toLowerCase();
  if (codecc === 'mp4a' || name.includes('aac')) return 'm4a';
  if (codecc === 'ac-3' || name.includes('ac-3') || name.includes('dolby digital')) return 'ac3';
  if (codecc === 'ec-3' || name.includes('e-ac-3')) return 'eac3';
  if (codecc === 'flac' || name.includes('flac')) return 'flac';
  if (codecc === 'opus' || name.includes('opus')) return 'opus';
  if (codecc === 'vorbis' || name.includes('vorbis')) return 'ogg';
  if (codecc === 'mp3' || name.includes('mp3')) return 'mp3';
  if (codecc === 'alac' || name.includes('alac')) return 'm4a';
  return 'mka';
};

// ─────────────────────────────────────────────────────────────────────────────
// SMPTE Timecode conversion
// ─────────────────────────────────────────────────────────────────────────────

function frameCountToTimecode(frameCount, fps, isDropFrame) {
  if (!fps || fps <= 0) return null;
  const roundedFps = Math.round(fps);
  const pad = (n) => n.toString().padStart(2, '0');

  if (isDropFrame && (roundedFps === 30 || roundedFps === 60)) {
    const dropFrames = roundedFps === 60 ? 4 : 2;
    const framesPerMinute = roundedFps * 60 - dropFrames;
    const framesPerTenMinutes = framesPerMinute * 10 + dropFrames;
    const d = Math.floor(frameCount / framesPerTenMinutes);
    let m = frameCount % framesPerTenMinutes;
    let adj = frameCount;
    if (m >= dropFrames) {
      adj += (18 * d) + (dropFrames * Math.floor((m - dropFrames) / framesPerMinute));
    } else {
      adj += 18 * d;
    }
    return `${pad(Math.floor(adj / (roundedFps * 3600)) % 24)}:${pad(Math.floor(adj / (roundedFps * 60)) % 60)}:${pad(Math.floor(adj / roundedFps) % 60)};${pad(adj % roundedFps)}`;
  }

  return `${pad(Math.floor(frameCount / (roundedFps * 3600)) % 24)}:${pad(Math.floor(frameCount / (roundedFps * 60)) % 60)}:${pad(Math.floor(frameCount / roundedFps) % 60)}:${pad(frameCount % roundedFps)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MP4/MOV Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseMP4(uint8) {
  const result = { brand: null, compatibleBrands: [], duration: null, timescale: null, creationTime: null, tracks: [], metadata: {} };

  function rs(start, len) { return latin1ToString(uint8.slice(start, start + len)); }

  const CONTAINER_ATOMS = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'meta', 'ilst', 'edts'];
  let currentTrack = null;
  const trackStack = [];

  function parseAtoms(start, end) {
    let pos = start;
    while (pos + 8 <= end) {
      let atomSize = readUint32BE(uint8, pos);
      const atomType = rs(pos + 4, 4).trim();
      let headerSize = 8;
      if (atomSize === 1 && pos + 16 <= end) {
        atomSize = readUint32BE(uint8, pos + 8) * 4294967296 + readUint32BE(uint8, pos + 12);
        headerSize = 16;
      } else if (atomSize === 0) { atomSize = end - pos; }
      if (atomSize < 8 || pos + atomSize > end) break;
      try { handleAtom(atomType, pos + headerSize, pos + atomSize); } catch { /* skip */ }
      pos += atomSize;
    }
  }

  function handleAtom(type, start, end) {
    if (type === 'ftyp') {
      result.brand = rs(start, 4).trim();
      const brands = [];
      for (let i = start + 8; i + 4 <= end; i += 4) { const b = rs(i, 4).trim(); if (b) brands.push(b); }
      result.compatibleBrands = brands;
    }
    if (type === 'mvhd') {
      const v = uint8[start];
      if (v === 0) {
        result.creationTime = readUint32BE(uint8, start + 4);
        result.timescale = readUint32BE(uint8, start + 12);
        result.duration = result.timescale > 0 ? readUint32BE(uint8, start + 16) / result.timescale : null;
      } else {
        result.timescale = readUint32BE(uint8, start + 20);
        const dur = readUint32BE(uint8, start + 24) * 4294967296 + readUint32BE(uint8, start + 28);
        result.duration = result.timescale > 0 ? dur / result.timescale : null;
      }
    }
    if (type === 'trak') {
      currentTrack = { type: null, handlerType: null, handlerName: '', codec: null, codecFourCC: null, width: null, height: null, sampleRate: null, channels: null, bitsPerSample: null, timescale: null, duration: null, sampleCount: null, colorPrimaries: null, transferCharacteristics: null, matrixCoefficients: null, fullRange: null, colorInfo: null, timecodeFlags: null, timecodeFrameDuration: null, timecodeTimescale: null, timecodeNumFrames: null, timecodeStartFrame: null, language: null, bitDepth: null, compressorName: null };
      trackStack.push(currentTrack);
      parseAtoms(start, end);
      result.tracks.push(currentTrack);
      trackStack.pop();
      currentTrack = trackStack.length > 0 ? trackStack[trackStack.length - 1] : null;
      return;
    }
    if (type === 'hdlr' && currentTrack) {
      const ht = rs(start + 8, 4).trim();
      currentTrack.handlerType = ht;
      const ns = start + 24;
      if (ns < end) { let ne = ns; while (ne < end && uint8[ne] !== 0) ne++; if (ne > ns) currentTrack.handlerName = rs(ns, ne - ns); }
      if (ht === 'vide') currentTrack.type = 'video';
      else if (ht === 'soun') currentTrack.type = 'audio';
      else if (ht === 'tmcd') currentTrack.type = 'timecode';
      else if (SUBTITLE_HANDLER_TYPES.includes(ht)) currentTrack.type = 'subtitle';
      else currentTrack.type = 'other';
    }
    if (type === 'mdhd' && currentTrack) {
      const v = uint8[start];
      if (v === 0) {
        currentTrack.timescale = readUint32BE(uint8, start + 12);
        const dur = readUint32BE(uint8, start + 16);
        currentTrack.duration = currentTrack.timescale > 0 ? dur / currentTrack.timescale : null;
        const lc = readUint16BE(uint8, start + 20);
        if (lc > 0) currentTrack.language = String.fromCharCode(((lc >> 10) & 0x1F) + 0x60, ((lc >> 5) & 0x1F) + 0x60, (lc & 0x1F) + 0x60);
      } else {
        currentTrack.timescale = readUint32BE(uint8, start + 20);
        const dur = readUint32BE(uint8, start + 24) * 4294967296 + readUint32BE(uint8, start + 28);
        currentTrack.duration = currentTrack.timescale > 0 ? dur / currentTrack.timescale : null;
        const lc = readUint16BE(uint8, start + 32);
        if (lc > 0) currentTrack.language = String.fromCharCode(((lc >> 10) & 0x1F) + 0x60, ((lc >> 5) & 0x1F) + 0x60, (lc & 0x1F) + 0x60);
      }
    }
    if (type === 'stsd' && currentTrack) {
      let ePos = start + 8;
      const eCount = readUint32BE(uint8, start + 4);
      for (let i = 0; i < eCount && ePos + 8 <= end; i++) {
        const eSize = readUint32BE(uint8, ePos);
        const eType = rs(ePos + 4, 4).trim();
        const eEnd = ePos + eSize;
        if (eSize < 8 || eEnd > end) break;
        if (currentTrack.type === 'video') {
          currentTrack.codecFourCC = eType;
          currentTrack.codec = VIDEO_CODEC_MAP[eType] || eType;
          if (eSize >= 78) {
            const bo = ePos + 8;
            currentTrack.width = readUint16BE(uint8, bo + 24);
            currentTrack.height = readUint16BE(uint8, bo + 26);
            const cl = uint8[bo + 42];
            if (cl > 0 && cl <= 31) currentTrack.compressorName = rs(bo + 43, cl).trim();
            currentTrack.bitDepth = readUint16BE(uint8, bo + 74);
          }
          const cs = ePos + 86;
          if (cs < eEnd) scanChildBoxes(cs, eEnd);
        } else if (currentTrack.type === 'audio') {
          currentTrack.codecFourCC = eType;
          currentTrack.codec = AUDIO_CODEC_MAP[eType] || eType;
          if (eSize >= 36) {
            const bo = ePos + 8;
            currentTrack.channels = readUint16BE(uint8, bo + 16);
            currentTrack.bitsPerSample = readUint16BE(uint8, bo + 18);
            currentTrack.sampleRate = readUint32BE(uint8, bo + 24) >> 16;
          }
        } else if (currentTrack.type === 'timecode') {
          if (eSize >= 34) {
            const bo = ePos + 8;
            currentTrack.timecodeFlags = readUint32BE(uint8, bo + 12);
            currentTrack.timecodeTimescale = readUint32BE(uint8, bo + 16);
            currentTrack.timecodeFrameDuration = readUint32BE(uint8, bo + 20);
            currentTrack.timecodeNumFrames = uint8[bo + 24];
          }
        } else if (currentTrack.type === 'subtitle') {
          currentTrack.codecFourCC = eType;
          currentTrack.codec = eType === 'tx3g' ? 'MPEG-4 Timed Text' : eType === 'c608' ? 'CEA-608' : eType === 'c708' ? 'CEA-708' : eType === 'wvtt' ? 'WebVTT' : eType === 'stpp' ? 'TTML' : eType;
        }
        ePos += eSize;
      }
    }
    if (type === 'stsz' && currentTrack) { currentTrack.sampleCount = readUint32BE(uint8, start + 8); }
    if (type === 'stco' && currentTrack && currentTrack.type === 'timecode') {
      const cnt = readUint32BE(uint8, start + 4);
      if (cnt > 0) { const off = readUint32BE(uint8, start + 8); if (off + 4 <= uint8.length) currentTrack.timecodeStartFrame = readUint32BE(uint8, off); }
    }
    if (type === 'co64' && currentTrack && currentTrack.type === 'timecode') {
      const cnt = readUint32BE(uint8, start + 4);
      if (cnt > 0) { const off = readUint32BE(uint8, start + 8) * 4294967296 + readUint32BE(uint8, start + 12); if (off + 4 <= uint8.length) currentTrack.timecodeStartFrame = readUint32BE(uint8, off); }
    }
    // ilst metadata
    const tagMap = { '\u00a9nam': 'Title', '\u00a9ART': 'Artist', '\u00a9alb': 'Album', '\u00a9day': 'Year', '\u00a9gen': 'Genre', '\u00a9cmt': 'Comment', '\u00a9too': 'Encoder', 'cprt': 'Copyright', 'desc': 'Description', '\u00a9wrt': 'Composer', '\u00a9lyr': 'Lyrics' };
    if (tagMap[type] !== undefined) {
      let dPos = start;
      while (dPos + 8 <= end) {
        const dSize = readUint32BE(uint8, dPos); const dType = rs(dPos + 4, 4);
        if (dType === 'data' && dSize > 16) {
          const dt = readUint32BE(uint8, dPos + 8);
          if (dt === 1) { const td = new TextDecoder('utf-8'); result.metadata[tagMap[type]] = td.decode(uint8.slice(dPos + 16, dPos + dSize)).trim(); }
        }
        if (dSize === 0) break; dPos += dSize;
      }
    }
    if (CONTAINER_ATOMS.includes(type) && type !== 'trak') {
      let cs = start; if (type === 'meta') cs += 4;
      parseAtoms(cs, end);
    }
  }

  function scanChildBoxes(start, end) {
    let pos = start;
    while (pos + 8 <= end) {
      const sz = readUint32BE(uint8, pos); const tp = rs(pos + 4, 4).trim();
      if (sz < 8 || pos + sz > end) break;
      if (tp === 'colr' && currentTrack) {
        const ct = rs(pos + 8, 4).trim();
        if ((ct === 'nclx' || ct === 'nclc') && sz >= 18) {
          currentTrack.colorPrimaries = readUint16BE(uint8, pos + 12);
          currentTrack.transferCharacteristics = readUint16BE(uint8, pos + 14);
          currentTrack.matrixCoefficients = readUint16BE(uint8, pos + 16);
          if (ct === 'nclx' && sz >= 19) currentTrack.fullRange = (uint8[pos + 18] & 0x80) !== 0;
          currentTrack.colorInfo = ct;
        }
      }
      pos += sz;
    }
  }

  try { parseAtoms(0, uint8.length); } catch { /* skip */ }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Log File Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseLogFile(text) {
  const lines = text.split(/\r?\n/);
  const params = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const match = trimmed.match(/^([^:=\t]+)\s*[:=\t]\s*(.+)$/);
    if (match) { const key = match[1].trim(); const val = match[2].trim(); if (key && val) params[key] = val; }
  }
  return { params, rawText: text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Master file parser dispatcher
// ─────────────────────────────────────────────────────────────────────────────

async function parseMediaFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const fr = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name, size: file.size, formattedSize: formatBytes(file.size), ext, format: ext.toUpperCase(), type: 'video',
    videoTracks: [], audioTracks: [], subtitleTracks: [], timecodeTracks: [], otherTracks: [],
    brand: null, compatibleBrands: [], containerDuration: null, containerTimescale: null, creationTime: null, metadata: {},
    logParams: null, logRawText: null, thumbnailUrl: null, objectUrl: null,
  };

  if (['log', 'txt'].includes(ext)) {
    fr.type = 'log'; fr.format = ext.toUpperCase();
    const text = new TextDecoder('utf-8').decode(uint8);
    const lr = parseLogFile(text); fr.logParams = lr.params; fr.logRawText = lr.rawText;
    return fr;
  }

  if (['mp4', 'mov', 'm4v', 'f4v', '3gp', '3g2'].includes(ext)) {
    const r = parseMP4(uint8);
    fr.brand = r.brand; fr.compatibleBrands = r.compatibleBrands; fr.containerDuration = r.duration;
    fr.containerTimescale = r.timescale; fr.creationTime = r.creationTime; fr.metadata = r.metadata;
    for (const t of r.tracks) {
      if (t.type === 'video') fr.videoTracks.push(t);
      else if (t.type === 'audio') fr.audioTracks.push(t);
      else if (t.type === 'subtitle') fr.subtitleTracks.push(t);
      else if (t.type === 'timecode') fr.timecodeTracks.push(t);
      else if (t.type === 'other') fr.otherTracks.push(t);
    }
    if (ext === 'mov') fr.format = 'MOV';
    else if (ext === 'm4v') fr.format = 'M4V';
    else if (ext === '3gp' || ext === '3g2') fr.format = ext.toUpperCase();
    else fr.format = 'MP4';
  } else if (['avi', 'mkv', 'webm', 'wmv', 'flv', 'ts', 'mts', 'm2ts', 'mxf'].includes(ext)) {
    fr.format = ext.toUpperCase(); fr.type = 'video';
  } else {
    // Try ftyp detection
    if (uint8.length >= 12 && latin1ToString(uint8.slice(4, 8)) === 'ftyp') {
      const r = parseMP4(uint8);
      fr.brand = r.brand; fr.compatibleBrands = r.compatibleBrands; fr.containerDuration = r.duration; fr.metadata = r.metadata;
      for (const t of r.tracks) {
        if (t.type === 'video') fr.videoTracks.push(t);
        else if (t.type === 'audio') fr.audioTracks.push(t);
        else if (t.type === 'subtitle') fr.subtitleTracks.push(t);
        else if (t.type === 'timecode') fr.timecodeTracks.push(t);
      }
    }
  }

  if (fr.type === 'video') {
    const hi = await getVideoInfo(file);
    if (hi) {
      if (!fr.containerDuration && hi.duration) fr.containerDuration = hi.duration;
      if (hi.videoWidth && fr.videoTracks.length > 0 && !fr.videoTracks[0].width) { fr.videoTracks[0].width = hi.videoWidth; fr.videoTracks[0].height = hi.videoHeight; }
      fr.thumbnailUrl = hi.thumbnail;
    }
  }
  return fr;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML5 Video info extraction (duration + thumbnail)
// ─────────────────────────────────────────────────────────────────────────────

async function getVideoInfo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata'; video.muted = true;
    let resolved = false;

    video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };

    video.onseeked = () => {
      if (resolved) return; resolved = true;
      let thumbnail = null;
      try {
        const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        thumbnail = c.toDataURL('image/jpeg', 0.7);
      } catch { /* skip */ }
      resolve({ duration: isFinite(video.duration) ? video.duration : null, videoWidth: video.videoWidth || null, videoHeight: video.videoHeight || null, thumbnail });
    };

    video.onerror = () => { if (resolved) return; resolved = true; URL.revokeObjectURL(url); resolve(null); };
    video.src = url;
    setTimeout(() => { if (!resolved) { resolved = true; resolve({ duration: isFinite(video.duration) ? video.duration : null, videoWidth: video.videoWidth || null, videoHeight: video.videoHeight || null, thumbnail: null }); } }, 8000);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Thumbnail Placeholder
// ─────────────────────────────────────────────────────────────────────────────

function DefaultThumbnail({ format, width = 120, height = 80 }) {
  const colors = { MP4: ['#6366f1', '#4338ca'], MOV: ['#a855f7', '#7c3aed'], M4V: ['#8b5cf6', '#6d28d9'], AVI: ['#0ea5e9', '#0369a1'], MKV: ['#ec4899', '#be185d'], WEBM: ['#eab308', '#a16207'], WMV: ['#14b8a6', '#0d9488'], FLV: ['#f97316', '#c2410c'], LOG: ['#94a3b8', '#475569'], TXT: ['#94a3b8', '#475569'], DEFAULT: ['#64748b', '#334155'] };
  const [c1, c2] = colors[format] || colors.DEFAULT;
  const id = `grad-vid-${format}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" style={{ width, height, display: 'block' }}>
      <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/></linearGradient></defs>
      <rect width="160" height="100" rx="10" fill={`url(#${id})`}/>
      <polygon points="65,35 65,65 95,50" fill="rgba(255,255,255,0.3)"/>
      <rect x="10" y="8" width="8" height="6" rx="1" fill="rgba(255,255,255,0.15)"/>
      <rect x="22" y="8" width="8" height="6" rx="1" fill="rgba(255,255,255,0.15)"/>
      <rect x="34" y="8" width="8" height="6" rx="1" fill="rgba(255,255,255,0.15)"/>
      <rect x="10" y="86" width="8" height="6" rx="1" fill="rgba(255,255,255,0.15)"/>
      <rect x="22" y="86" width="8" height="6" rx="1" fill="rgba(255,255,255,0.15)"/>
      <rect x="34" y="86" width="8" height="6" rx="1" fill="rgba(255,255,255,0.15)"/>
      <text x="130" y="92" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.05em">{format}</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Format badge
// ─────────────────────────────────────────────────────────────────────────────

function FormatBadge({ format }) {
  const styles = {
    MP4: 'bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-400',
    MOV: 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/12 dark:text-purple-400',
    M4V: 'bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-400',
    AVI: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/12 dark:text-sky-400',
    MKV: 'bg-pink-500/15 text-pink-700 dark:bg-pink-500/12 dark:text-pink-400',
    WEBM: 'bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/12 dark:text-yellow-400',
    LOG: 'bg-slate-500/15 text-slate-700 dark:bg-slate-500/12 dark:text-slate-400',
    TXT: 'bg-slate-500/15 text-slate-700 dark:bg-slate-500/12 dark:text-slate-400',
    '3GP': 'bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-400',
    WMV: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/12 dark:text-sky-400',
    FLV: 'bg-pink-500/15 text-pink-700 dark:bg-pink-500/12 dark:text-pink-400',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[0.68rem] font-bold uppercase tracking-wider ${styles[format] || 'bg-slate-500/15 text-slate-700 dark:bg-slate-500/12 dark:text-slate-400'}`}>
      {format}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare fields
// ─────────────────────────────────────────────────────────────────────────────

const COMPARE_FIELDS = [
  { label: 'Format', fn: (f) => f.format },
  { label: 'File Size', fn: (f) => f.formattedSize },
  { label: 'Duration', fn: (f) => formatDuration(f.containerDuration) },
  { label: 'Video Codec', fn: (f) => f.videoTracks[0]?.codec || '\u2014' },
  { label: 'Resolution', fn: (f) => { const v = f.videoTracks[0]; return v?.width ? `${v.width} \u00d7 ${v.height}` : '\u2014'; } },
  { label: 'FPS', fn: (f) => { const v = f.videoTracks[0]; return (v?.sampleCount && v?.duration) ? (v.sampleCount / v.duration).toFixed(2) : '\u2014'; } },
  { label: 'Audio Codec', fn: (f) => f.audioTracks[0]?.codec || '\u2014' },
  { label: 'Audio Channels', fn: (f) => { const a = f.audioTracks[0]; if (!a?.channels) return '\u2014'; if (a.channels === 1) return 'Mono'; if (a.channels === 2) return 'Stereo'; if (a.channels === 6) return '5.1'; if (a.channels === 8) return '7.1'; return `${a.channels} ch`; } },
  { label: 'Sample Rate', fn: (f) => { const a = f.audioTracks[0]; return a?.sampleRate ? `${a.sampleRate.toLocaleString()} Hz` : '\u2014'; } },
  { label: 'Color Primaries', fn: (f) => { const v = f.videoTracks[0]; return v?.colorPrimaries != null ? (COLOR_PRIMARIES[v.colorPrimaries] || `Code ${v.colorPrimaries}`) : '\u2014'; } },
  { label: 'Subtitles', fn: (f) => f.subtitleTracks.length > 0 ? `${f.subtitleTracks.length} track(s)` : '\u2014' },
  { label: 'Timecode', fn: (f) => { const tc = f.timecodeTracks[0]; if (!tc || tc.timecodeStartFrame == null) return '\u2014'; const fps = tc.timecodeTimescale && tc.timecodeFrameDuration ? tc.timecodeTimescale / tc.timecodeFrameDuration : tc.timecodeNumFrames || 30; return frameCountToTimecode(tc.timecodeStartFrame, fps, (tc.timecodeFlags & 0x01) !== 0) || '\u2014'; } },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function VideoMeta() {
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareSelectedIds, setCompareSelectedIds] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const fileInputRef = useRef(null);

  const [extractingTrack, setExtractingTrack] = useState(null); // { fileId, trackIndex }
  const [extractProgress, setExtractProgress] = useState(0);

  const [audioURLs, setAudioURLs] = useState({}); // { 'fileId-trackIndex': blobUrl }
  const [loadingURLs, setLoadingURLs] = useState({}); // { 'fileId-trackIndex': boolean }

  const audioURLsRef = useRef({});
  useEffect(() => {
    audioURLsRef.current = audioURLs;
  }, [audioURLs]);

  useEffect(() => {
    if (!activeFile || activeFile.type !== 'video' || activeFile.audioTracks.length === 0) return;

    let cancelled = false;

    const extractAll = async () => {
      for (let i = 0; i < activeFile.audioTracks.length; i++) {
        const key = `${activeFile.id}-${i}`;
        
        if (audioURLsRef.current[key]) continue;
        if (cancelled) break;

        setLoadingURLs(prev => ({ ...prev, [key]: true }));

        let ffmpeg = null;
        const trackInfo = activeFile.audioTracks[i];
        const sourceExt = activeFile.ext || 'mp4';
        const inputName = `input-wave-${activeFile.id}-${i}.${sourceExt}`;
        const targetExt = getAudioExtension(trackInfo.codecFourCC, trackInfo.codec);
        const outputName = `audio-wave-${activeFile.id}-${i}.${targetExt}`;

        try {
          ffmpeg = await ensureFFmpegLoaded();
          if (cancelled) break;

          const fileBuffer = new Uint8Array(await activeFile.file.arrayBuffer());
          await ffmpeg.writeFile(inputName, fileBuffer);

          const exitCode = await ffmpeg.exec([
            '-i', inputName,
            '-map', `0:a:${i}`,
            '-c:a', 'copy',
            outputName
          ]);

          if (exitCode === 0 && !cancelled) {
            const audioData = await ffmpeg.readFile(outputName);
            const mimeType = guessMime(targetExt, 'audio');
            const audioBlob = new Blob([audioData.buffer], { type: mimeType });
            const url = URL.createObjectURL(audioBlob);
            setAudioURLs(prev => ({ ...prev, [key]: url }));
          }

          try { await ffmpeg.deleteFile(inputName); } catch (e) {}
          try { await ffmpeg.deleteFile(outputName); } catch (e) {}
        } catch (err) {
          console.error(`Failed to extract audio track ${i} automatically:`, err);
        } finally {
          if (!cancelled) {
            setLoadingURLs(prev => ({ ...prev, [key]: false }));
          }
        }
      }
    };

    extractAll();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const downloadAudioTrack = async (file, trackIndex, trackInfo) => {
    if (extractingTrack) return;
    setExtractingTrack({ fileId: file.id, trackIndex });
    setExtractProgress(0);
    setStatus('Loading engine...');

    let ffmpeg = null;
    const sourceExt = file.ext || 'mp4';
    const inputName = `input-${file.id}-${trackIndex}.${sourceExt}`;
    const targetExt = getAudioExtension(trackInfo.codecFourCC, trackInfo.codec);
    const outputName = `audio-${file.id}-${trackIndex}.${targetExt}`;

    try {
      ffmpeg = await ensureFFmpegLoaded();
      setStatus('Extracting audio track...');

      const fileBuffer = new Uint8Array(await file.file.arrayBuffer());
      await ffmpeg.writeFile(inputName, fileBuffer);

      const onProgress = ({ progress }) => {
        const clamped = Math.min(1, Math.max(0, progress || 0));
        setExtractProgress(Math.round(clamped * 100));
      };
      ffmpeg.on('progress', onProgress);

      try {
        const exitCode = await ffmpeg.exec([
          '-i', inputName,
          '-map', `0:a:${trackIndex}`,
          '-c:a', 'copy',
          outputName
        ]);

        if (exitCode !== 0) {
          throw new Error('FFmpeg execution failed');
        }

        const audioData = await ffmpeg.readFile(outputName);
        const mimeType = guessMime(targetExt, 'audio');
        const audioBlob = new Blob([audioData.buffer], { type: mimeType });

        const downloadUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const codecLabel = (trackInfo.codec || 'audio').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        a.download = `${baseName}_track_${trackIndex + 1}_${codecLabel}.${targetExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        setStatus(`Successfully downloaded audio track ${trackIndex + 1}.`);
      } finally {
        ffmpeg.off('progress', onProgress);
        try { await ffmpeg.deleteFile(inputName); } catch (e) {}
        try { await ffmpeg.deleteFile(outputName); } catch (e) {}
      }
    } catch (err) {
      console.error(err);
      setStatus(`Failed to extract audio track: ${err.message}`);
    } finally {
      setExtractingTrack(null);
      setExtractProgress(0);
    }
  };

  const ACCEPTED = '.mp4,.mov,.m4v,.f4v,.3gp,.3g2,.avi,.mkv,.webm,.wmv,.flv,.ts,.mts,.m2ts,.mxf,.log,.txt';
  const activeFile = files.find(f => f.id === selectedId) || null;

  useEffect(() => {
    return () => {
      files.forEach(f => { if (f.objectUrl) URL.revokeObjectURL(f.objectUrl); });
      Object.values(audioURLsRef.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const processFiles = async (fileList) => {
    setLoading(true); setStatus('Parsing files...');
    const newFiles = [];
    const supportedExts = ['mp4', 'mov', 'm4v', 'f4v', '3gp', '3g2', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'ts', 'mts', 'm2ts', 'mxf', 'log', 'txt'];
    for (const file of fileList) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!supportedExts.includes(ext)) { setStatus(`Skipped unsupported file: ${file.name}`); continue; }
      if (files.some(f => f.name === file.name && f.size === file.size)) { setStatus(`Already loaded: ${file.name}`); continue; }
      try {
        const parsed = await parseMediaFile(file);
        parsed.file = file;
        if (parsed.type === 'video') parsed.objectUrl = URL.createObjectURL(file);
        newFiles.push(parsed);
      } catch (err) { console.error('Error parsing', file.name, err); setStatus(`Failed to parse ${file.name}: ${err.message}`); }
    }
    if (newFiles.length > 0) {
      setFiles(prev => { const updated = [...prev, ...newFiles]; setSelectedId(newFiles[0].id); setCompareSelectedIds(curr => [...curr, ...newFiles.map(f => f.id)]); return updated; });
      setStatus(`Loaded ${newFiles.length} file(s).`);
    }
    setLoading(false);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files)); };
  const handleFileChange = (e) => { if (e.target.files) processFiles(Array.from(e.target.files)); e.target.value = ''; };

  const handleRemove = (id) => {
    setFiles(prev => { const rm = prev.find(f => f.id === id); if (rm?.objectUrl) URL.revokeObjectURL(rm.objectUrl); const up = prev.filter(f => f.id !== id); if (selectedId === id) setSelectedId(up.length > 0 ? up[0].id : null); return up; });
    setCompareSelectedIds(prev => prev.filter(x => x !== id));
    setAudioURLs(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(key => {
        if (key.startsWith(`${id}-`)) {
          URL.revokeObjectURL(copy[key]);
          delete copy[key];
        }
      });
      return copy;
    });
  };

  const handleClearAll = () => {
    files.forEach(f => { if (f.objectUrl) URL.revokeObjectURL(f.objectUrl); });
    Object.values(audioURLs).forEach(url => URL.revokeObjectURL(url));
    setAudioURLs({});
    setFiles([]);
    setSelectedId(null);
    setCompareSelectedIds([]);
    setStatus('Cleared all files.');
  };

  const handleExportJson = () => {
    if (!activeFile) return;
    const data = { filename: activeFile.name, format: activeFile.format, fileSize: activeFile.size, duration: activeFile.containerDuration, brand: activeFile.brand, metadata: activeFile.metadata, videoTracks: activeFile.videoTracks.map(t => ({ codec: t.codec, codecFourCC: t.codecFourCC, width: t.width, height: t.height, duration: t.duration, sampleCount: t.sampleCount, colorPrimaries: t.colorPrimaries != null ? COLOR_PRIMARIES[t.colorPrimaries] : null, transferCharacteristics: t.transferCharacteristics != null ? TRANSFER_CHARACTERISTICS[t.transferCharacteristics] : null, matrixCoefficients: t.matrixCoefficients != null ? MATRIX_COEFFICIENTS[t.matrixCoefficients] : null, fullRange: t.fullRange, language: t.language })), audioTracks: activeFile.audioTracks.map(t => ({ codec: t.codec, channels: t.channels, sampleRate: t.sampleRate, bitsPerSample: t.bitsPerSample, language: t.language })), subtitleTracks: activeFile.subtitleTracks.map(t => ({ codec: t.codec, language: t.language })), logParams: activeFile.logParams };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = activeFile.name.replace(/\.[^/.]+$/, '') + '_metadata.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const toggleGroup = (gk) => { setCollapsedGroups(prev => ({ ...prev, [gk]: !prev[gk] })); };
  const toggleCompare = (id) => { setCompareSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

  const buildAllParams = (file) => {
    if (!file) return [];
    const groups = [];
    if (file.type === 'log') {
      groups.push({ key: 'log', label: 'Log File Parameters', icon: '\ud83d\udcc4', rows: Object.entries(file.logParams || {}).map(([k, v]) => [k, v]) });
      groups.push({ key: 'file', label: 'File Information', icon: '\ud83d\udcc1', rows: [['Filename', file.name], ['File Size', file.formattedSize], ['Format', file.format]] });
      return groups;
    }
    const cr = [['Format', file.format], ['Container Brand', file.brand], ['Compatible Brands', file.compatibleBrands.length > 0 ? file.compatibleBrands.join(', ') : null], ['Duration', formatDuration(file.containerDuration)], ['File Size', file.formattedSize], ['Filename', file.name]].filter(([, v]) => v != null && v !== '' && v !== '\u2014');
    if (cr.length > 0) groups.push({ key: 'container', label: '\ud83d\udce6 Container', icon: '', rows: cr });

    file.videoTracks.forEach((t, i) => {
      const pf = file.videoTracks.length > 1 ? `Video Track ${i + 1}` : 'Video';
      const fps = t.sampleCount && t.duration ? (t.sampleCount / t.duration).toFixed(3) : null;
      const rows = [['Codec', t.codec], ['Codec FourCC', t.codecFourCC], ['Resolution', t.width ? `${t.width} \u00d7 ${t.height}` : null], ['Frame Rate', fps ? `${fps} fps` : null], ['Duration', formatDuration(t.duration)], ['Sample Count', t.sampleCount ? t.sampleCount.toLocaleString() : null], ['Bit Depth', t.bitDepth ? `${t.bitDepth}-bit` : null], ['Compressor', t.compressorName], ['Language', t.language && t.language !== 'und' ? t.language : null], ['Color Primaries', t.colorPrimaries != null ? (COLOR_PRIMARIES[t.colorPrimaries] || `Code ${t.colorPrimaries}`) : null], ['Transfer', t.transferCharacteristics != null ? (TRANSFER_CHARACTERISTICS[t.transferCharacteristics] || `Code ${t.transferCharacteristics}`) : null], ['Matrix', t.matrixCoefficients != null ? (MATRIX_COEFFICIENTS[t.matrixCoefficients] || `Code ${t.matrixCoefficients}`) : null], ['Full Range', t.fullRange != null ? (t.fullRange ? 'Yes (Full)' : 'No (Limited)') : null], ['Color Info Type', t.colorInfo]].filter(([, v]) => v != null && v !== '' && v !== '\u2014');
      groups.push({ key: `video-${i}`, label: `\ud83c\udfac ${pf}`, icon: '', rows });
    });

    file.audioTracks.forEach((t, i) => {
      const pf = file.audioTracks.length > 1 ? `Audio Track ${i + 1}` : 'Audio';
      const cl = t.channels === 1 ? 'Mono' : t.channels === 2 ? 'Stereo' : t.channels === 6 ? '5.1 Surround' : t.channels === 8 ? '7.1 Surround' : `${t.channels} ch`;
      const rows = [['Codec', t.codec], ['Channels', t.channels ? cl : null], ['Sample Rate', t.sampleRate ? `${t.sampleRate.toLocaleString()} Hz` : null], ['Bit Depth', t.bitsPerSample ? `${t.bitsPerSample}-bit` : null], ['Duration', formatDuration(t.duration)], ['Language', t.language && t.language !== 'und' ? t.language : null]].filter(([, v]) => v != null && v !== '' && v !== '\u2014');
      groups.push({ key: `audio-${i}`, label: `\ud83d\udd0a ${pf}`, icon: '', rows });
    });

    if (file.subtitleTracks.length > 0) {
      const rows = file.subtitleTracks.map((t, i) => [`Track ${i + 1}`, [t.codec, t.language && t.language !== 'und' ? `(${t.language})` : ''].filter(Boolean).join(' ')]);
      groups.push({ key: 'subtitles', label: '\ud83d\udcac Subtitles', icon: '', rows });
    }

    file.timecodeTracks.forEach((t, i) => {
      const fps = t.timecodeTimescale && t.timecodeFrameDuration ? t.timecodeTimescale / t.timecodeFrameDuration : t.timecodeNumFrames || 30;
      const isDF = (t.timecodeFlags & 0x01) !== 0;
      const tc = t.timecodeStartFrame != null ? frameCountToTimecode(t.timecodeStartFrame, fps, isDF) : null;
      const rows = [['Start Timecode', tc], ['Frame Rate', fps ? `${fps} fps` : null], ['Drop Frame', isDF ? 'Yes' : 'No'], ['Start Frame', t.timecodeStartFrame != null ? t.timecodeStartFrame.toString() : null]].filter(([, v]) => v != null);
      groups.push({ key: `timecode-${i}`, label: '\u23f1\ufe0f Timecode', icon: '', rows });
    });

    if (Object.keys(file.metadata).length > 0) {
      groups.push({ key: 'metadata', label: '\ud83c\udff7\ufe0f Metadata Tags', icon: '', rows: Object.entries(file.metadata).map(([k, v]) => [k, String(v)]) });
    }
    return groups;
  };

  const compareFiles = files.filter(f => compareSelectedIds.includes(f.id));
  const allParamGroups = buildAllParams(activeFile);
  const filteredParamGroups = allParamGroups.map(g => ({ ...g, rows: searchQuery ? g.rows.filter(([k, v]) => k.toLowerCase().includes(searchQuery.toLowerCase()) || String(v).toLowerCase().includes(searchQuery.toLowerCase())) : g.rows })).filter(g => g.rows.length > 0);

  return (
    <Card variant="tool" size="wide" className="flex flex-col gap-5 w-full mt-2 relative" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      <input ref={fileInputRef} type="file" multiple accept={ACCEPTED} style={{ display: 'none' }} onChange={handleFileChange} id="videometa-file-input" />

      {dragOver && files.length > 0 && (
        <div className="absolute inset-0 bg-indigo-500/15 backdrop-blur-sm border-2 border-dashed border-indigo-500 rounded-2xl flex items-center justify-center z-[100] pointer-events-none font-semibold text-indigo-500 text-2xl">
          <div className="flex flex-col items-center gap-2.5">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            <p>Drop video or log files to add to list</p>
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer transition-all duration-250 flex items-center justify-center bg-indigo-500/[0.02] hover:border-indigo-500 hover:bg-indigo-500/[0.06] select-none" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()} aria-label="Upload video files">
          <div className="flex flex-col items-center">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            <p className="text-lg font-semibold text-text-main mt-0">Drop video or log files here</p>
            <p className="text-[0.85rem] text-text-muted my-2">or</p>
            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</Button>
            <p className="text-[0.8rem] text-text-muted mt-4 max-w-[320px]">Supports MP4, MOV, M4V, AVI, MKV, WebM, WMV, FLV, TS, LOG, TXT and more</p>
          </div>
        </div>
      )}

      {status && <p className={`text-[0.85rem] px-3.5 py-2 rounded-lg ${status.startsWith('Failed') || status.startsWith('Error') ? 'text-red-500 bg-red-500/[0.08]' : 'text-indigo-500 bg-indigo-500/[0.08]'}`}>{status}</p>}

      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5 min-h-[520px]">
          <aside className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-app">
              <span className="text-[0.8rem] font-semibold text-text-muted uppercase tracking-wider">{files.length} file{files.length !== 1 ? 's' : ''}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} title="Add files">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
                </Button>
                <Button variant="secondary" size="sm" onClick={handleClearAll} title="Clear all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>Clear All
                </Button>
              </div>
            </div>
            <ul className="list-none m-0 p-1.5 overflow-y-auto flex-1 flex flex-row flex-wrap md:flex-col gap-1.5 md:max-h-none max-h-[200px]">
              {files.map(f => (
                <li key={f.id} className={`flex flex-col md:flex-row items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors duration-180 relative group hover:bg-nav-hover-bg ${f.id === selectedId ? 'bg-indigo-500/10 outline outline-1 outline-indigo-500' : ''}`} onClick={() => setSelectedId(f.id)}>
                  <div className="w-11 h-7.5 rounded overflow-hidden flex-shrink-0 flex items-center justify-center bg-app">{f.thumbnailUrl ? <img src={f.thumbnailUrl} alt="thumb" className="w-full h-full object-cover" /> : <DefaultThumbnail format={f.format} width={44} height={30} />}</div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[0.82rem] font-medium text-text-main truncate max-w-[72px] md:max-w-[130px] text-center md:text-left" title={f.name}>{f.name}</span>
                    <span className="flex items-center gap-1 text-[0.75rem] text-text-muted justify-center md:justify-start"><FormatBadge format={f.format} />{f.formattedSize}</span>
                  </div>
                  <button className="hidden group-hover:flex items-center justify-center bg-none border-none text-text-muted cursor-pointer p-1 rounded shrink-0 transition-colors hover:text-red-500 hover:bg-red-500/10 absolute top-1 right-1 md:relative md:top-auto md:right-auto" onClick={(e) => { e.stopPropagation(); handleRemove(f.id); }} aria-label="Remove file"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </li>
              ))}
            </ul>
          </aside>

          <main className="flex flex-col gap-4 min-w-0">
            <div className="flex items-center gap-1 bg-app border border-border rounded-xl p-1 flex-wrap">
              {[{ id: 'overview', label: '\ud83d\udccb Overview' }, { id: 'all', label: '\ud83d\uddc2 All Parameters' }, { id: 'compare', label: `\u2696\ufe0f Compare (${compareFiles.length})` }].map(tab => (
                <button key={tab.id} className={`px-3.5 py-[7px] border-none rounded-lg bg-transparent text-[0.85rem] font-medium text-text-muted cursor-pointer transition-all duration-200 hover:bg-nav-hover-bg hover:text-text-main ${activeTab === tab.id ? 'bg-card text-text-main font-semibold shadow-sm' : ''}`} onClick={() => setActiveTab(tab.id)} id={`videometa-tab-${tab.id}`}>{tab.label}</button>
              ))}
              <div className="ml-auto flex items-center gap-1.5 flex-wrap">{activeFile && <Button variant="secondary" size="sm" onClick={handleExportJson} title="Export metadata as JSON">{'\u2b07'} JSON</Button>}</div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && activeFile && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-5 bg-card border border-border rounded-2xl p-5">
                  <div className="w-full max-w-[300px] md:w-[200px] rounded-lg overflow-hidden shrink-0 shadow-md bg-black relative">
                    {activeFile.type === 'video' && activeFile.objectUrl ? <video src={activeFile.objectUrl} controls preload="metadata" style={{ width: '100%' }} /> : activeFile.thumbnailUrl ? <img src={activeFile.thumbnailUrl} alt="Thumbnail" /> : <DefaultThumbnail format={activeFile.format} width={200} height={130} />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1 text-center md:text-left">
                    <h2 className="text-lg font-bold text-text-main m-0 truncate">{activeFile.metadata?.Title || activeFile.name}</h2>
                    {activeFile.metadata?.Artist && <p className="text-[0.95rem] text-indigo-500 font-medium m-0">{activeFile.metadata.Artist}</p>}
                    {activeFile.containerDuration && <p className="text-[0.85rem] text-text-muted m-0">Duration: {formatDuration(activeFile.containerDuration)}</p>}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-center md:justify-start"><FormatBadge format={activeFile.format} />{activeFile.brand && <span className="inline-block px-1.5 py-0.5 rounded text-[0.68rem] font-bold uppercase tracking-wider bg-slate-500/15 text-slate-700 dark:bg-slate-500/12 dark:text-slate-400">{activeFile.brand}</span>}</div>
                    {activeFile.type === 'video' && activeFile.videoTracks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 justify-center md:justify-start">
                        {activeFile.videoTracks[0].codec && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.75rem] font-semibold bg-app text-text-muted border border-border"><span className="text-text-muted font-normal mr-0.5">Codec:</span>{activeFile.videoTracks[0].codec}</span>}
                        {activeFile.videoTracks[0].width && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.75rem] font-semibold bg-app text-text-muted border border-border"><span className="text-text-muted font-normal mr-0.5">Res:</span>{activeFile.videoTracks[0].width}{'\u00d7'}{activeFile.videoTracks[0].height}</span>}
                        {(() => { const v = activeFile.videoTracks[0]; return (v.sampleCount && v.duration) ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.75rem] font-semibold bg-app text-text-muted border border-border"><span className="text-text-muted font-normal mr-0.5">FPS:</span>{(v.sampleCount / v.duration).toFixed(2)}</span> : null; })()}
                        {activeFile.audioTracks.length > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.75rem] font-semibold bg-app text-text-muted border border-border"><span className="text-text-muted font-normal mr-0.5">Audio:</span>{activeFile.audioTracks.length} track{activeFile.audioTracks.length !== 1 ? 's' : ''}</span>}
                        {activeFile.subtitleTracks.length > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.75rem] font-semibold bg-app text-text-muted border border-border"><span className="text-text-muted font-normal mr-0.5">Subs:</span>{activeFile.subtitleTracks.length}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {activeFile.type === 'video' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeFile.videoTracks.length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <h3 className="text-[0.88rem] font-bold text-text-main m-0 mb-3 flex items-center gap-1.5 uppercase tracking-wider"><span className="text-base">{'\ud83c\udfac'}</span> Video</h3>
                        {activeFile.videoTracks.map((t, i) => { const fps = t.sampleCount && t.duration ? (t.sampleCount / t.duration).toFixed(3) : null; return (
                          <dl className="flex flex-col m-0" key={i}>{[['Codec', t.codec], ['Resolution', t.width ? `${t.width} \u00d7 ${t.height}` : null], ['Frame Rate', fps ? `${fps} fps` : null], ['Bit Depth', t.bitDepth ? `${t.bitDepth}-bit` : null], ['Language', t.language && t.language !== 'und' ? t.language : null], ['Color Primaries', t.colorPrimaries != null ? (COLOR_PRIMARIES[t.colorPrimaries] || `Code ${t.colorPrimaries}`) : null], ['Transfer', t.transferCharacteristics != null ? (TRANSFER_CHARACTERISTICS[t.transferCharacteristics] || `Code ${t.transferCharacteristics}`) : null], ['Matrix', t.matrixCoefficients != null ? (MATRIX_COEFFICIENTS[t.matrixCoefficients] || `Code ${t.matrixCoefficients}`) : null], ['Full Range', t.fullRange != null ? (t.fullRange ? 'Yes (Full)' : 'No (Limited)') : null]].filter(([, v]) => v != null).map(([k, v]) => <div className="flex gap-2 py-1.5 border-b border-border last:border-b-0 text-[0.84rem]" key={k}><dt className="w-[100px] sm:w-[130px] shrink-0 text-text-muted font-medium">{k}</dt><dd className="text-text-main m-0 break-all flex-1">{v}</dd></div>)}</dl>
                        ); })}
                      </div>
                    )}

                    {activeFile.audioTracks.length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <h3 className="text-[0.88rem] font-bold text-text-main m-0 mb-3 flex items-center gap-1.5 uppercase tracking-wider"><span className="text-base">{'\ud83d\udd0a'}</span> Audio</h3>
                        <div className="flex flex-col gap-2">
                          {activeFile.audioTracks.map((t, i) => {
                            const cl = t.channels === 1 ? 'Mono' : t.channels === 2 ? 'Stereo' : t.channels === 6 ? '5.1' : t.channels === 8 ? '7.1' : `${t.channels}ch`;
                            const isExtracting = extractingTrack && extractingTrack.fileId === activeFile.id && extractingTrack.trackIndex === i;
                            const key = `${activeFile.id}-${i}`;
                            return (
                              <div className="flex flex-col gap-1.5" key={i}>
                                <div className="flex items-center gap-2.5 p-2 px-3 bg-app rounded-lg text-[0.84rem]">
                                  <span className="text-base shrink-0">{'\ud83c\udfb5'}</span>
                                  <span className="font-semibold text-text-main min-w-[50px]">Track {i + 1}</span>
                                  <span className="text-text-muted flex-1">
                                    {[t.codec, t.channels ? cl : null, t.sampleRate ? `${t.sampleRate.toLocaleString()} Hz` : null, t.language && t.language !== 'und' ? `(${t.language})` : null].filter(Boolean).join(' \u00b7 ')}
                                  </span>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="py-1 px-2.5 shrink-0"
                                    disabled={!!extractingTrack || loadingURLs[key]}
                                    onClick={() => downloadAudioTrack(activeFile, i, t)}
                                    title="Download audio track"
                                  >
                                    {isExtracting ? (
                                      <>
                                        <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-r-transparent rounded-full" />
                                        <span>{extractProgress}%</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                          <polyline points="7 10 12 15 17 10" />
                                          <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        <span>Download</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <div className="mt-1 bg-app border border-border rounded-lg p-2.5">
                                  {audioURLs[key] ? (
                                    <MediaSeparatorWaveform audioURL={audioURLs[key]} className="w-full" />
                                  ) : (
                                    <div className="flex justify-center items-center h-12">
                                      <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-r-transparent rounded-full mr-2" />
                                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Generating waveform...</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeFile.subtitleTracks.length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <h3 className="text-[0.88rem] font-bold text-text-main m-0 mb-3 flex items-center gap-1.5 uppercase tracking-wider"><span className="text-base">{'\ud83d\udcac'}</span> Subtitles</h3>
                        <div className="flex flex-col gap-2">{activeFile.subtitleTracks.map((t, i) => <div className="flex items-center gap-2.5 p-2 px-3 bg-app rounded-lg text-[0.84rem]" key={i}><span className="text-base shrink-0">{'\ud83d\udcdd'}</span><span className="font-semibold text-text-main min-w-[50px]">Track {i + 1}</span><span className="text-text-muted flex-1">{[t.codec, t.language && t.language !== 'und' ? `(${t.language})` : null].filter(Boolean).join(' ')}</span></div>)}</div>
                      </div>
                    )}

                    {activeFile.timecodeTracks.length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <h3 className="text-[0.88rem] font-bold text-text-main m-0 mb-3 flex items-center gap-1.5 uppercase tracking-wider"><span className="text-base">{'\u23f1\ufe0f'}</span> Timecode</h3>
                        {activeFile.timecodeTracks.map((t, i) => { const fps = t.timecodeTimescale && t.timecodeFrameDuration ? t.timecodeTimescale / t.timecodeFrameDuration : t.timecodeNumFrames || 30; const isDF = (t.timecodeFlags & 0x01) !== 0; const tc = t.timecodeStartFrame != null ? frameCountToTimecode(t.timecodeStartFrame, fps, isDF) : null; return (
                          <dl className="flex flex-col m-0" key={i}>{[['Start Timecode', tc], ['Frame Rate', fps ? `${fps} fps` : null], ['Type', isDF ? 'Drop Frame' : 'Non-Drop Frame']].filter(([, v]) => v != null).map(([k, v]) => <div className="flex gap-2 py-1.5 border-b border-border last:border-b-0 text-[0.84rem]" key={k}><dt className="w-[100px] sm:w-[130px] shrink-0 text-text-muted font-medium">{k}</dt><dd className="text-text-main m-0 break-all flex-1">{v}</dd></div>)}</dl>
                        ); })}
                      </div>
                    )}

                    {Object.keys(activeFile.metadata).length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <h3 className="text-[0.88rem] font-bold text-text-main m-0 mb-3 flex items-center gap-1.5 uppercase tracking-wider"><span className="text-base">{'\ud83c\udff7\ufe0f'}</span> Metadata</h3>
                        <dl className="flex flex-col m-0">{Object.entries(activeFile.metadata).map(([k, v]) => <div className="flex gap-2 py-1.5 border-b border-border last:border-b-0 text-[0.84rem]" key={k}><dt className="w-[100px] sm:w-[130px] shrink-0 text-text-muted font-medium">{k}</dt><dd className="text-text-main m-0 break-all flex-1">{String(v)}</dd></div>)}</dl>
                      </div>
                    )}

                    <div className="bg-card border border-border rounded-xl p-4">
                      <h3 className="text-[0.88rem] font-bold text-text-main m-0 mb-3 flex items-center gap-1.5 uppercase tracking-wider"><span className="text-base">{'\ud83d\udce6'}</span> Container</h3>
                      <dl className="flex flex-col m-0">{[['Format', activeFile.format], ['Brand', activeFile.brand], ['Compatible Brands', activeFile.compatibleBrands.length > 0 ? activeFile.compatibleBrands.join(', ') : null], ['Duration', formatDuration(activeFile.containerDuration)], ['File Size', activeFile.formattedSize], ['Total Tracks', (activeFile.videoTracks.length + activeFile.audioTracks.length + activeFile.subtitleTracks.length + activeFile.timecodeTracks.length).toString()]].filter(([, v]) => v != null && v !== '\u2014').map(([k, v]) => <div className="flex gap-2 py-1.5 border-b border-border last:border-b-0 text-[0.84rem]" key={k}><dt className="w-[100px] sm:w-[130px] shrink-0 text-text-muted font-medium">{k}</dt><dd className="text-text-main m-0 break-all flex-1">{v}</dd></div>)}</dl>
                    </div>
                  </div>
                )}

                {activeFile.type === 'log' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeFile.logParams && Object.keys(activeFile.logParams).length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <h3 className="text-[0.88rem] font-bold text-text-main m-0 mb-3 flex items-center gap-1.5 uppercase tracking-wider"><span className="text-base">{'\ud83d\udcc4'}</span> Parsed Parameters</h3>
                        <dl className="flex flex-col m-0">{Object.entries(activeFile.logParams).map(([k, v]) => <div className="flex gap-2 py-1.5 border-b border-border last:border-b-0 text-[0.84rem]" key={k}><dt className="w-[100px] sm:w-[130px] shrink-0 text-text-muted font-medium">{k}</dt><dd className="text-text-main m-0 break-all flex-1">{v}</dd></div>)}</dl>
                      </div>
                    )}
                    <div className="bg-card border border-border rounded-xl p-4">
                      <h3 className="text-[0.88rem] font-bold text-text-main m-0 mb-3 flex items-center gap-1.5 uppercase tracking-wider"><span className="text-base">{'\ud83d\udcdd'}</span> Raw Content</h3>
                      <div className="bg-app border border-border rounded-lg p-3.5 max-h-[400px] overflow-y-auto font-mono text-[0.8rem] leading-relaxed text-text-main whitespace-pre-wrap break-all">{activeFile.logRawText}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All Parameters Tab */}
            {activeTab === 'all' && activeFile && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3.5 py-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" placeholder="Search parameters..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 border-none bg-transparent text-[0.9rem] text-text-main outline-none placeholder:text-text-muted" id="videometa-search-input" />
                  {searchQuery && <button className="bg-none border-none text-text-muted cursor-pointer text-base px-0.5 leading-none hover:text-text-main" onClick={() => setSearchQuery('')}>{'\u00d7'}</button>}
                </div>
                {filteredParamGroups.length === 0 ? <p className="text-text-muted text-[0.85rem] italic mt-2">No parameters match your search.</p> : filteredParamGroups.map(group => (
                  <div key={group.key} className="bg-card border border-border rounded-xl overflow-hidden">
                    <button className="flex items-center gap-2 w-full px-4 py-3 bg-transparent border-none border-b border-border cursor-pointer text-[0.88rem] font-semibold text-text-main text-left transition-colors hover:bg-nav-hover-bg" onClick={() => toggleGroup(group.key)} id={`videometa-group-${group.key}`}>
                      <span>{group.icon} {group.label}</span>
                      <span className="ml-auto text-[0.75rem] text-text-muted bg-app px-1.5 py-0.5 rounded-lg mr-1">{group.rows.length}</span>
                      <svg className={`transition-transform duration-200 text-text-muted shrink-0${collapsedGroups[group.key] ? ' -rotate-90' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {!collapsedGroups[group.key] && <table className="w-full border-collapse"><tbody>{group.rows.map(([k, v]) => <tr key={k} className="hover:bg-nav-hover-bg/30"><td className="px-4 py-2 w-[150px] sm:w-[200px] text-[0.83rem] text-text-muted font-medium border-b border-border last:border-b-0 align-top">{k}</td><td className="px-4 py-2 text-[0.83rem] text-text-main border-b border-border last:border-b-0 break-all align-top">{v}</td></tr>)}</tbody></table>}
                  </div>
                ))}
              </div>
            )}

            {/* Compare Tab */}
            {activeTab === 'compare' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[0.85rem] text-text-muted m-0">Select files to compare:</p>
                  <div className="flex flex-wrap gap-2">{files.map(f => <button key={f.id} className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg border border-border bg-card text-[0.82rem] text-text-muted cursor-pointer transition-colors max-w-[200px] truncate hover:border-indigo-500 hover:text-text-main ${compareSelectedIds.includes(f.id) ? 'border-indigo-500 bg-indigo-500/10 text-text-main font-medium' : ''}`} onClick={() => toggleCompare(f.id)}><FormatBadge format={f.format} />{f.name}</button>)}</div>
                </div>
                {compareFiles.length >= 1 ? (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full border-collapse min-w-[400px]">
                      <thead><tr><th className="p-2.5 px-3.5 bg-app text-[0.8rem] font-semibold text-text-muted text-left border-b border-border whitespace-nowrap">Parameter</th>{compareFiles.map(f => <th key={f.id} className="p-2.5 px-3.5 bg-app text-[0.8rem] font-semibold text-text-muted text-left border-b border-border whitespace-nowrap"><div className="flex items-center gap-2 max-w-[180px] overflow-hidden">{f.thumbnailUrl ? <img src={f.thumbnailUrl} className="w-10 h-6.5 rounded object-cover shrink-0" alt="" /> : <DefaultThumbnail format={f.format} width={40} height={26} />}<span className="truncate" title={f.name}>{f.name}</span></div></th>)}</tr></thead>
                      <tbody>{COMPARE_FIELDS.map(field => <tr key={field.label} className="hover:bg-nav-hover-bg/30"><td className="p-2 px-3.5 text-[0.83rem] text-text-muted font-medium border-b border-border align-top whitespace-nowrap w-[130px]">{field.label}</td>{compareFiles.map(f => <td key={f.id} className="p-2 px-3.5 text-[0.83rem] text-text-main border-b border-border align-top min-w-[140px]">{field.fn(f)}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                ) : <p className="text-text-muted text-[0.85rem] italic mt-2">Select at least one file above to compare.</p>}
              </div>
            )}
          </main>
        </div>
      )}
    </Card>
  );
}
