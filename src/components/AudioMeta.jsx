import React, { useState, useRef, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ToolHeader from './ui/ToolHeader';
import FieldInput from './ui/FieldInput';

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
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

function readUint32LE(buf, offset) {
  return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
}

function readUint16LE(buf, offset) {
  return (buf[offset] | (buf[offset + 1] << 8)) >>> 0;
}

function readUint16BE(buf, offset) {
  return ((buf[offset] << 8) | buf[offset + 1]) >>> 0;
}

// Read syncsafe integer (ID3v2)
function readSyncsafeInt(buf, offset) {
  return ((buf[offset] & 0x7f) << 21) |
         ((buf[offset + 1] & 0x7f) << 14) |
         ((buf[offset + 2] & 0x7f) << 7) |
         (buf[offset + 3] & 0x7f);
}

function latin1ToString(bytes) {
  return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
}



function decodeTextFrame(encoding, data) {
  try {
    if (encoding === 0) {
      // ISO-8859-1 / Latin-1 (windows-1252 is a compatible superset)
      const td = new TextDecoder('windows-1252');
      return td.decode(data).replace(/\0+$/, '').trim();
    } else if (encoding === 1) {
      // UTF-16 with BOM (detected automatically by TextDecoder)
      const td = new TextDecoder('utf-16');
      return td.decode(data).replace(/\0+$/, '').trim();
    } else if (encoding === 2) {
      // UTF-16BE without BOM
      const td = new TextDecoder('utf-16be');
      return td.decode(data).replace(/\0+$/, '').trim();
    } else if (encoding === 3) {
      // UTF-8
      const td = new TextDecoder('utf-8');
      return td.decode(data).replace(/\0+$/, '').trim();
    }
    return new TextDecoder('utf-8').decode(data).replace(/\0+$/, '').trim();
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ID3v2 Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseID3v2(uint8) {
  const tags = {};
  let coverArt = null;

  if (uint8.length < 10) return { tags, coverArt };

  // Scan first 1024 bytes for 'ID3' identifier to handle prepended junk/headers
  let startOffset = -1;
  const scanLimit = Math.min(uint8.length - 10, 1024);
  for (let i = 0; i < scanLimit; i++) {
    if (uint8[i] === 0x49 && uint8[i+1] === 0x44 && uint8[i+2] === 0x33) {
      startOffset = i;
      break;
    }
  }

  if (startOffset === -1) return { tags, coverArt };

  const majorVersion = uint8[startOffset + 3];
  // const minorVersion = uint8[startOffset + 4];
  const flags = uint8[startOffset + 5];
  const hasExtHeader = (flags & 0x40) !== 0;
  let tagSize = ((uint8[startOffset + 6] & 0x7f) << 21) |
                 ((uint8[startOffset + 7] & 0x7f) << 14) |
                 ((uint8[startOffset + 8] & 0x7f) << 7) |
                 (uint8[startOffset + 9] & 0x7f);
  let pos = startOffset + 10;

  if (hasExtHeader) {
    if (majorVersion === 4) {
      const extSize = ((uint8[pos] & 0x7f) << 21) |
                      ((uint8[pos + 1] & 0x7f) << 14) |
                      ((uint8[pos + 2] & 0x7f) << 7) |
                      (uint8[pos + 3] & 0x7f);
      pos += extSize;
    } else {
      const extSize = ((uint8[pos] << 24) | (uint8[pos + 1] << 16) | (uint8[pos + 2] << 8) | uint8[pos + 3]) >>> 0;
      pos += 4 + extSize;
    }
  }

  const end = Math.min(startOffset + 10 + tagSize, uint8.length);

  while (pos < end - 10) {
    let frameId, frameSize, frameFlags;

    if (majorVersion === 2) {
      // ID3v2.2 has 3-char IDs and 3-byte sizes
      frameId = latin1ToString(uint8.slice(pos, pos + 3));
      if (frameId === '\0\0\0') break;
      frameSize = (uint8[pos + 3] << 16) | (uint8[pos + 4] << 8) | uint8[pos + 5];
      frameFlags = 0;
      pos += 6;
    } else {
      frameId = latin1ToString(uint8.slice(pos, pos + 4));
      if (frameId === '\0\0\0\0') break;
      frameSize = (majorVersion === 4)
        ? readSyncsafeInt(uint8, pos + 4)
        : readUint32BE(uint8, pos + 4);
      frameFlags = readUint16BE(uint8, pos + 8);
      pos += 10;
    }

    if (frameSize <= 0 || pos + frameSize > end) break;

    const frameData = uint8.slice(pos, pos + frameSize);
    pos += frameSize;

    const encoding = frameData[0];
    const textData = frameData.slice(1);

    // Text frames
    if (frameId[0] === 'T' && frameId !== 'TXX' && frameId !== 'TXXX') {
      const text = decodeTextFrame(encoding, textData);
      if (text) tags[frameId] = text;
    }

    // ID3v2.2 picture frame PIC
    if (frameId === 'PIC' && !coverArt) {
      try {
        const picEnc = frameData[0];
        // 3-char image format
        const imgFmt = latin1ToString(frameData.slice(1, 4)).toLowerCase();
        const mimeType = imgFmt === 'jpg' || imgFmt === 'jpeg' ? 'image/jpeg' : `image/${imgFmt}`;
        // pictureType
        let dataStart = 5;
        // Skip description
        const descEnd = frameData.indexOf(0, dataStart);
        dataStart = descEnd >= 0 ? descEnd + 1 : dataStart;
        const imgBytes = frameData.slice(dataStart);
        if (imgBytes.length > 0) {
          const b64 = btoa(String.fromCharCode(...imgBytes));
          coverArt = `data:${mimeType};base64,${b64}`;
        }
      } catch { /* ignore */ }
    }

    // APIC picture frame (ID3v2.3+)
    if (frameId === 'APIC' && !coverArt) {
      try {
        const picEncoding = frameData[0];
        let dataPos = 1;
        // Read MIME type (null-terminated Latin-1)
        const mimeEnd = frameData.indexOf(0, dataPos);
        const mimeType = mimeEnd > dataPos
          ? latin1ToString(frameData.slice(dataPos, mimeEnd))
          : 'image/jpeg';
        dataPos = mimeEnd + 1;
        // Picture type byte
        dataPos += 1;
        // Description (null-terminated, encoding-dependent)
        if (picEncoding === 1 || picEncoding === 2) {
          // UTF-16: find null word
          while (dataPos + 1 < frameData.length) {
            if (frameData[dataPos] === 0 && frameData[dataPos + 1] === 0) { dataPos += 2; break; }
            dataPos += 2;
          }
        } else {
          const descEnd2 = frameData.indexOf(0, dataPos);
          dataPos = descEnd2 >= 0 ? descEnd2 + 1 : dataPos;
        }
        const imgBytes = frameData.slice(dataPos);
        if (imgBytes.length > 0) {
          const b64 = btoa(String.fromCharCode(...imgBytes));
          coverArt = `data:${mimeType};base64,${b64}`;
        }
      } catch { /* ignore */ }
    }

    // COMM comment frame
    if ((frameId === 'COMM' || frameId === 'COM') && !tags['COMM']) {
      try {
        const commEnc = frameData[0];
        // 3 lang bytes + description + null + text
        const langAndDesc = frameData.slice(4);
        const nullIdx = langAndDesc.indexOf(0);
        const textPart = nullIdx >= 0 ? langAndDesc.slice(nullIdx + 1) : langAndDesc;
        const text = decodeTextFrame(commEnc, textPart);
        if (text) tags['COMM'] = text;
      } catch { /* ignore */ }
    }
  }

  return { tags, coverArt };
}

// ─────────────────────────────────────────────────────────────────────────────
// ID3v1 Parser (last 128 bytes)
// ─────────────────────────────────────────────────────────────────────────────

function parseID3v1(uint8) {
  const tags = {};
  if (uint8.length < 128) return { tags, hasV1: false };
  const tail = uint8.slice(uint8.length - 128);
  if (tail[0] !== 0x54 || tail[1] !== 0x41 || tail[2] !== 0x47) return { tags, hasV1: false };

  const readFixed = (start, len) =>
    latin1ToString(tail.slice(start, start + len)).replace(/\0+$/, '').trim();

  tags['TIT2'] = tags['TIT2'] || readFixed(3, 30);
  tags['TPE1'] = tags['TPE1'] || readFixed(33, 30);
  tags['TALB'] = tags['TALB'] || readFixed(63, 30);
  tags['TDRC'] = tags['TDRC'] || readFixed(93, 4);
  tags['COMM'] = tags['COMM'] || readFixed(97, 28);
  // ID3v1.1 track number
  if (tail[125] === 0 && tail[126] !== 0) {
    tags['TRCK'] = tags['TRCK'] || String(tail[126]);
  }

  const GENRES = [
    'Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop','Jazz','Metal',
    'New Age','Oldies','Other','Pop','R&B','Rap','Reggae','Rock','Techno','Industrial',
    'Alternative','Ska','Death Metal','Pranks','Soundtrack','Euro-Techno','Ambient','Trip-Hop',
    'Vocal','Jazz+Funk','Fusion','Trance','Classical','Instrumental','Acid','House','Game',
    'Sound Clip','Gospel','Noise','AlternRock','Bass','Soul','Punk','Space','Meditative',
    'Instrumental Pop','Instrumental Rock','Ethnic','Gothic','Darkwave','Techno-Industrial',
    'Electronic','Pop-Folk','Eurodance','Dream','Southern Rock','Comedy','Cult','Gangsta',
    'Top 40','Christian Rap','Pop/Funk','Jungle','Native American','Cabaret','New Wave',
    'Psychedelic','Rave','Showtunes','Trailer','Lo-Fi','Tribal','Acid Punk','Acid Jazz',
    'Polka','Retro','Musical','Rock & Roll','Hard Rock'
  ];
  const genreIdx = tail[127];
  if (genreIdx < GENRES.length) tags['TCON'] = tags['TCON'] || GENRES[genreIdx];

  return { tags, hasV1: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// MP3 Duration Estimator (scans for first valid MPEG frame header)
// ─────────────────────────────────────────────────────────────────────────────

function estimateMp3Duration(uint8, fileSizeBytes) {
  const BITRATES = [
    null, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, null
  ];
  const SAMPLE_RATES = [44100, 48000, 32000];

  let offset = 0;
  const maxScan = Math.min(uint8.length, 200000);

  while (offset < maxScan - 4) {
    if (uint8[offset] === 0xFF && (uint8[offset + 1] & 0xE0) === 0xE0) {
      const header = readUint32BE(uint8, offset);
      const version = (header >> 19) & 0x3;  // 3=MPEG1, 2=MPEG2
      const layer = (header >> 17) & 0x3;    // 3=Layer1, 2=Layer2, 1=Layer3
      const bitrateIdx = (header >> 12) & 0xF;
      const sampleRateIdx = (header >> 10) & 0x3;

      if (layer === 1 && version !== 1 && bitrateIdx > 0 && bitrateIdx < 15 && sampleRateIdx < 3) {
        const bitrate = BITRATES[bitrateIdx];
        const sampleRate = SAMPLE_RATES[sampleRateIdx] / (version === 2 ? 2 : 1);
        if (bitrate && sampleRate) {
          const id3v1Size = uint8[uint8.length - 128] === 0x54 && uint8[uint8.length - 127] === 0x41 && uint8[uint8.length - 126] === 0x47 ? 128 : 0;
          const audioDataSize = fileSizeBytes - offset - id3v1Size;
          return {
            durationSec: (audioDataSize * 8) / (bitrate * 1000),
            bitrate: bitrate + ' kbps',
            sampleRate: sampleRate,
          };
        }
      }
    }
    offset++;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WAV / RIFF Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseWav(uint8) {
  const result = { technical: {}, tags: {}, coverArt: null };
  if (uint8.length < 44) return result;

  const riff = latin1ToString(uint8.slice(0, 4));
  const wave = latin1ToString(uint8.slice(8, 12));
  if (riff !== 'RIFF' || wave !== 'WAVE') return result;

  const fileSize = readUint32LE(uint8, 4) + 8;
  let pos = 12;

  while (pos + 8 <= uint8.length) {
    const chunkId = latin1ToString(uint8.slice(pos, pos + 4));
    const chunkSize = readUint32LE(uint8, pos + 4);
    pos += 8;

    if (chunkId === 'fmt ') {
      const audioFormat = readUint16LE(uint8, pos);
      const numChannels = readUint16LE(uint8, pos + 2);
      const sampleRate = readUint32LE(uint8, pos + 4);
      const byteRate = readUint32LE(uint8, pos + 8);
      const bitsPerSample = readUint16LE(uint8, pos + 14);
      result.technical = {
        numChannels,
        sampleRate,
        bitsPerSample,
        bitrate: Math.round(byteRate * 8 / 1000) + ' kbps',
        audioFormat: audioFormat === 1 ? 'PCM' : audioFormat === 3 ? 'IEEE Float' : `Format ${audioFormat}`,
      };
    } else if (chunkId === 'data') {
      // Duration from data chunk
      if (result.technical.sampleRate && result.technical.numChannels && result.technical.bitsPerSample) {
        const bytesPerSample = result.technical.bitsPerSample / 8;
        const totalSamples = chunkSize / (result.technical.numChannels * bytesPerSample);
        result.technical.durationSec = totalSamples / result.technical.sampleRate;
      }
    } else if (chunkId === 'LIST') {
      const listType = latin1ToString(uint8.slice(pos, pos + 4));
      if (listType === 'INFO') {
        let infoPos = pos + 4;
        const infoEnd = pos + chunkSize;
        while (infoPos + 8 <= infoEnd) {
          const infoId = latin1ToString(uint8.slice(infoPos, infoPos + 4));
          const infoSize = readUint32LE(uint8, infoPos + 4);
          infoPos += 8;
          const infoVal = latin1ToString(uint8.slice(infoPos, infoPos + infoSize)).replace(/\0+$/, '').trim();
          const infoMap = {
            'INAM': 'TIT2', 'IART': 'TPE1', 'IPRD': 'TALB', 'ICRD': 'TDRC',
            'IGNR': 'TCON', 'ITRK': 'TRCK', 'ICMT': 'COMM', 'ISFT': 'TSSE',
          };
          if (infoMap[infoId] && infoVal) result.tags[infoMap[infoId]] = infoVal;
          infoPos += infoSize + (infoSize % 2);
        }
      }
    } else if (chunkId === 'id3 ' || chunkId === 'ID3 ') {
      const id3Data = uint8.slice(pos, pos + chunkSize);
      const { tags, coverArt } = parseID3v2(id3Data);
      Object.assign(result.tags, tags);
      if (coverArt) result.coverArt = coverArt;
    }

    pos += chunkSize + (chunkSize % 2);
    if (pos >= uint8.length) break;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLAC Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseFlac(uint8) {
  const result = { technical: {}, tags: {}, coverArt: null };
  if (uint8.length < 4) return result;
  if (latin1ToString(uint8.slice(0, 4)) !== 'fLaC') return result;

  let pos = 4;

  while (pos + 4 <= uint8.length) {
    const headerByte = uint8[pos];
    const isLast = (headerByte & 0x80) !== 0;
    const blockType = headerByte & 0x7F;
    const blockLen = (uint8[pos + 1] << 16) | (uint8[pos + 2] << 8) | uint8[pos + 3];
    pos += 4;

    if (pos + blockLen > uint8.length) break;

    const block = uint8.slice(pos, pos + blockLen);

    if (blockType === 0) {
      // STREAMINFO
      const minBlockSize = (block[0] << 8) | block[1];
      const maxBlockSize = (block[2] << 8) | block[3];
      const sampleRate = ((block[10] << 12) | (block[11] << 4) | (block[12] >> 4));
      const numChannels = ((block[12] >> 1) & 0x7) + 1;
      const bitsPerSample = (((block[12] & 0x1) << 4) | (block[13] >> 4)) + 1;
      // Total samples (36-bit, stored in 5 bytes somewhat awkwardly)
      const totalSamplesHigh = block[13] & 0xF;
      const totalSamplesLow = readUint32BE(block, 14);
      const totalSamples = totalSamplesHigh * 4294967296 + totalSamplesLow;
      result.technical = {
        sampleRate,
        numChannels,
        bitsPerSample,
        durationSec: sampleRate > 0 ? totalSamples / sampleRate : null,
        bitrate: null, // Filled later
        audioFormat: 'FLAC (Lossless)',
      };
    } else if (blockType === 4) {
      // VORBIS_COMMENT
      let vPos = 0;
      const vendorLen = readUint32LE(block, vPos); vPos += 4;
      vPos += vendorLen;
      const commentCount = readUint32LE(block, vPos); vPos += 4;
      const td = new TextDecoder('utf-8');
      const vorbisMap = {
        'TITLE': 'TIT2', 'ARTIST': 'TPE1', 'ALBUMARTIST': 'TPE2', 'ALBUM': 'TALB',
        'DATE': 'TDRC', 'GENRE': 'TCON', 'TRACKNUMBER': 'TRCK', 'COMMENT': 'COMM',
        'COMPOSER': 'TCOM', 'DISCNUMBER': 'TPOS', 'ENCODER': 'TSSE',
      };
      for (let i = 0; i < commentCount && vPos + 4 <= block.length; i++) {
        const len = readUint32LE(block, vPos); vPos += 4;
        const comment = td.decode(block.slice(vPos, vPos + len)); vPos += len;
        const eqIdx = comment.indexOf('=');
        if (eqIdx >= 0) {
          const key = comment.slice(0, eqIdx).toUpperCase();
          const val = comment.slice(eqIdx + 1).trim();
          const mapped = vorbisMap[key] || ('VC_' + key);
          if (val) result.tags[mapped] = val;
        }
      }
    } else if (blockType === 6) {
      // PICTURE
      if (!result.coverArt) {
        try {
          let pPos = 4; // Skip picture type
          const mimeLen = readUint32BE(block, pPos); pPos += 4;
          const mimeType = latin1ToString(block.slice(pPos, pPos + mimeLen)); pPos += mimeLen;
          const descLen = readUint32BE(block, pPos); pPos += 4 + descLen;
          pPos += 16; // width, height, color depth, colors used
          const dataLen = readUint32BE(block, pPos); pPos += 4;
          const imgBytes = block.slice(pPos, pPos + dataLen);
          const b64 = btoa(String.fromCharCode(...imgBytes));
          result.coverArt = `data:${mimeType};base64,${b64}`;
        } catch { /* ignore */ }
      }
    }

    pos += blockLen;
    if (isLast) break;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// M4A / MP4 Atom Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseM4a(uint8) {
  const result = { technical: {}, tags: {}, coverArt: null };

  function readString(start, len) {
    return latin1ToString(uint8.slice(start, start + len));
  }

  function parseAtoms(start, end, depth) {
    let pos = start;
    while (pos + 8 <= end) {
      let atomSize = readUint32BE(uint8, pos);
      const atomType = readString(pos + 4, 4);

      if (atomSize === 1) {
        // 64-bit size
        const high = readUint32BE(uint8, pos + 8);
        const low = readUint32BE(uint8, pos + 12);
        atomSize = high * 4294967296 + low;
      } else if (atomSize === 0) {
        atomSize = end - pos;
      }

      if (atomSize < 8 || pos + atomSize > end) break;

      const atomStart = pos + 8;
      const atomEnd = pos + atomSize;
      const atomType4 = atomType.trim();

      if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'meta', 'ilst'].includes(atomType4)) {
        let childStart = atomStart;
        if (atomType4 === 'meta') childStart += 4; // version+flags
        parseAtoms(childStart, atomEnd, depth + 1);
      } else if (atomType4 === 'mvhd') {
        // Movie header - duration and timescale
        const version = uint8[atomStart];
        if (version === 0) {
          const timescale = readUint32BE(uint8, atomStart + 12);
          const duration = readUint32BE(uint8, atomStart + 16);
          result.technical.durationSec = timescale > 0 ? duration / timescale : null;
          result.technical.timescale = timescale;
        } else {
          const timescale = readUint32BE(uint8, atomStart + 20);
          const durHigh = readUint32BE(uint8, atomStart + 24);
          const durLow = readUint32BE(uint8, atomStart + 28);
          const duration = durHigh * 4294967296 + durLow;
          result.technical.durationSec = timescale > 0 ? duration / timescale : null;
        }
      } else if (atomType4 === 'mp4a' || atomType4 === 'alac') {
        // Audio sample entry: channels and sample rate
        const channels = readUint16BE(uint8, atomStart + 8);
        const sampleSize = readUint16BE(uint8, atomStart + 10);
        const sampleRate = readUint32BE(uint8, atomStart + 16) >> 16;
        result.technical.numChannels = channels;
        result.technical.bitsPerSample = sampleSize;
        result.technical.sampleRate = sampleRate;
        result.technical.audioFormat = atomType4 === 'alac' ? 'Apple Lossless (ALAC)' : 'AAC';
      } else if (atomType4 === 'ftyp') {
        const brand = readString(atomStart, 4).trim();
        result.technical.brand = brand;
      } else {
        // ilst item atoms: look for data atoms inside
        const ilstTags = {
          '\u00a9nam': 'TIT2', '\u00a9ART': 'TPE1', 'aART': 'TPE2', '\u00a9alb': 'TALB',
          '\u00a9day': 'TDRC', '\u00a9gen': 'TCON', 'trkn': 'TRCK', '\u00a9cmt': 'COMM',
          '\u00a9wrt': 'TCOM', 'disk': 'TPOS', '\u00a9too': 'TSSE', 'cprt': 'TCOP',
          '\u00a9lyr': 'USLT', 'desc': 'TIT3', 'ldes': 'COMM',
        };
        if (ilstTags[atomType4] !== undefined) {
          // Find 'data' sub-atom
          let dPos = atomStart;
          while (dPos + 8 <= atomEnd) {
            const dSize = readUint32BE(uint8, dPos);
            const dType = readString(dPos + 4, 4);
            if (dType === 'data' && dSize > 16) {
              const dataType = readUint32BE(uint8, dPos + 8);
              const payload = uint8.slice(dPos + 16, dPos + dSize);
              if (dataType === 1) {
                // UTF-8 text
                const td = new TextDecoder('utf-8');
                result.tags[ilstTags[atomType4]] = td.decode(payload).trim();
              } else if (atomType4 === 'trkn' && payload.length >= 4) {
                result.tags['TRCK'] = `${readUint16BE(payload, 2)}/${readUint16BE(payload, 4)}`.replace('/0', '');
              } else if (atomType4 === 'disk' && payload.length >= 4) {
                result.tags['TPOS'] = `${readUint16BE(payload, 2)}/${readUint16BE(payload, 4)}`.replace('/0', '');
              }
            }
            if (dSize === 0) break;
            dPos += dSize;
          }
        }

        // Cover art 'covr'
        if (atomType4 === 'covr' && !result.coverArt) {
          let dPos = atomStart;
          while (dPos + 8 <= atomEnd) {
            const dSize = readUint32BE(uint8, dPos);
            const dType = readString(dPos + 4, 4);
            if (dType === 'data' && dSize > 16) {
              const dataType = readUint32BE(uint8, dPos + 8);
              const imgBytes = uint8.slice(dPos + 16, dPos + dSize);
              const mimeType = dataType === 13 ? 'image/jpeg' : 'image/png';
              try {
                const b64 = btoa(String.fromCharCode(...imgBytes));
                result.coverArt = `data:${mimeType};base64,${b64}`;
              } catch { /* too big for btoa */ }
            }
            if (dSize === 0) break;
            dPos += dSize;
          }
        }
      }

      pos += atomSize;
    }
  }

  try {
    parseAtoms(0, uint8.length, 0);
  } catch { /* ignore parse errors */ }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lossless MP3 Metadata Stripper
// ─────────────────────────────────────────────────────────────────────────────

function stripMp3Metadata(arrayBuffer, mode) {
  const uint8 = new Uint8Array(arrayBuffer);
  let start = 0;
  let end = uint8.length;

  // Strip ID3v2 from start
  if (uint8[0] === 0x49 && uint8[1] === 0x44 && uint8[2] === 0x33) {
    const tagSize = readSyncsafeInt(uint8, 6);
    start = 10 + tagSize;
  }

  // Strip ID3v1 from end
  if (end >= 128 && uint8[end - 128] === 0x54 && uint8[end - 127] === 0x41 && uint8[end - 126] === 0x47) {
    end = end - 128;
  }

  // mode === 'all' strips both; mode === 'id3v2only' strips only v2
  const sliced = uint8.slice(start, end);
  return sliced.buffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Master file parser dispatcher
// ─────────────────────────────────────────────────────────────────────────────

async function parseAudioFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  /** @type {Record<string, any>} */
  let technical = {};
  /** @type {Record<string, any>} */
  let tags = {};
  let coverArt = null;
  let format = ext.toUpperCase();

  if (ext === 'mp3') {
    // Parse ID3v2 from start
    const id3 = parseID3v2(uint8);
    tags = { ...tags, ...id3.tags };
    if (id3.coverArt) coverArt = id3.coverArt;
    // Parse ID3v1 from end
    const id3v1 = parseID3v1(uint8);
    tags = { ...tags, ...id3v1.tags };
    // Estimate technical from MPEG frames
    const mp3tech = estimateMp3Duration(uint8, file.size);
    if (mp3tech) {
      technical = {
        durationSec: mp3tech.durationSec,
        bitrate: mp3tech.bitrate,
        sampleRate: mp3tech.sampleRate,
        numChannels: 2, // Default; proper VBR/Xing parsing would refine this
        bitsPerSample: 0,
        audioFormat: 'MP3 (MPEG Layer III)',
      };
    }
    format = 'MP3';
  } else if (ext === 'wav' || ext === 'wave') {
    const wavResult = parseWav(uint8);
    technical = wavResult.technical;
    tags = { ...tags, ...wavResult.tags };
    if (wavResult.coverArt) coverArt = wavResult.coverArt;
    format = 'WAV';
  } else if (ext === 'flac') {
    const flacResult = parseFlac(uint8);
    technical = flacResult.technical;
    tags = { ...tags, ...flacResult.tags };
    if (flacResult.coverArt) coverArt = flacResult.coverArt;
    if (technical.durationSec && file.size > 0) {
      const audioBitrate = Math.round((file.size * 8) / technical.durationSec / 1000);
      technical.bitrate = audioBitrate + ' kbps';
    }
    format = 'FLAC';
  } else if (['m4a', 'aac', 'm4b', 'm4p', 'mp4'].includes(ext)) {
    const m4aResult = parseM4a(uint8);
    technical = m4aResult.technical;
    tags = { ...tags, ...m4aResult.tags };
    if (m4aResult.coverArt) coverArt = m4aResult.coverArt;
    if (technical.durationSec && file.size > 0) {
      const audioBitrate = Math.round((file.size * 8) / technical.durationSec / 1000);
      technical.bitrate = audioBitrate + ' kbps';
    }
    format = ext.toUpperCase();
  } else if (ext === 'ogg' || ext === 'oga' || ext === 'opus') {
    // OGG: Try to find Vorbis comment block via simple scan
    format = ext === 'opus' ? 'Opus' : 'OGG Vorbis';
    // OGG is complex to parse fully; use HTML5 for duration
  } else if (ext === 'aiff' || ext === 'aif') {
    format = 'AIFF';
    // AIFF is similar to RIFF, parse COMM and NAME/AUTH chunks
    if (latin1ToString(uint8.slice(0, 4)) === 'FORM') {
      const fileType = latin1ToString(uint8.slice(8, 12));
      if (fileType === 'AIFF' || fileType === 'AIFC') {
        let pos = 12;
        while (pos + 8 <= uint8.length) {
          const chunkId = latin1ToString(uint8.slice(pos, pos + 4));
          const chunkSize = readUint32BE(uint8, pos + 4);
          pos += 8;
          if (chunkId === 'COMM') {
            technical.numChannels = readUint16BE(uint8, pos);
            const numSampleFrames = readUint32BE(uint8, pos + 2);
            technical.bitsPerSample = readUint16BE(uint8, pos + 6);
            // 80-bit extended sampleRate (IEEE 754)
            const exp = ((readUint16BE(uint8, pos + 8) & 0x7FFF) - 16383);
            const mantHigh = readUint32BE(uint8, pos + 10);
            technical.sampleRate = Math.round(mantHigh * Math.pow(2, exp - 31));
            if (technical.sampleRate > 0) {
              technical.durationSec = numSampleFrames / technical.sampleRate;
              technical.bitrate = Math.round(technical.sampleRate * technical.numChannels * technical.bitsPerSample / 1000) + ' kbps';
            }
            technical.audioFormat = fileType === 'AIFC' ? 'AIFF-C (Compressed)' : 'AIFF (Uncompressed)';
          } else if (chunkId === 'ID3 ' || chunkId === 'id3 ') {
            const id3Data = uint8.slice(pos, pos + chunkSize);
            const id3Result = parseID3v2(id3Data);
            Object.assign(tags, id3Result.tags);
            if (id3Result.coverArt) coverArt = id3Result.coverArt;
          } else if (chunkId === 'NAME') {
            tags['TIT2'] = tags['TIT2'] || latin1ToString(uint8.slice(pos, pos + chunkSize)).replace(/\0+$/, '').trim();
          } else if (chunkId === 'AUTH') {
            tags['TPE1'] = tags['TPE1'] || latin1ToString(uint8.slice(pos, pos + chunkSize)).replace(/\0+$/, '').trim();
          } else if (chunkId === 'ANNO') {
            tags['COMM'] = tags['COMM'] || latin1ToString(uint8.slice(pos, pos + chunkSize)).replace(/\0+$/, '').trim();
          }
          pos += chunkSize + (chunkSize % 2);
          if (pos >= uint8.length) break;
        }
      }
    }
  } else if (ext === 'wma' || ext === 'asf') {
    format = 'WMA/ASF';
    // WMA/ASF has a complex binary structure; basic detection only
  } else {
    // Try ID3v2 as fallback for unknown types
    const id3 = parseID3v2(uint8);
    if (Object.keys(id3.tags).length > 0) {
      tags = id3.tags;
      if (id3.coverArt) coverArt = id3.coverArt;
    }
  }

  // Use HTML5 Audio element as fallback for duration if not parsed
  const durationFromAudio = await getAudioDuration(file);
  if (!technical.durationSec && durationFromAudio) {
    technical.durationSec = durationFromAudio;
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    size: file.size,
    formattedSize: formatBytes(file.size),
    format,
    ext,
    technical,
    tags,
    coverArt,
    arrayBuffer,
    objectUrl: null, // Created lazily for audio preview
    strippedInfo: null,
  };
}

async function getAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    audio.src = url;
    setTimeout(() => { URL.revokeObjectURL(url); resolve(null); }, 5000);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag display name mapping
// ─────────────────────────────────────────────────────────────────────────────

const TAG_LABELS = {
  TIT2: 'Title', TIT3: 'Subtitle', TPE1: 'Artist', TPE2: 'Album Artist',
  TALB: 'Album', TDRC: 'Year', TCON: 'Genre', TRCK: 'Track Number',
  TPOS: 'Disc Number', TCOM: 'Composer', COMM: 'Comment', TSSE: 'Encoder',
  TCOP: 'Copyright', USLT: 'Lyrics', TSRC: 'ISRC',
  TBPM: 'BPM', TKEY: 'Initial Key', TLAN: 'Language', TMED: 'Media Type',
  TOAL: 'Original Album', TOPE: 'Original Artist', TOFN: 'Original Filename',
  TPUB: 'Publisher', TOWN: 'File Owner', TRSN: 'Radio Station',
  WCOM: 'Commercial URL', WCOP: 'Copyright URL', WOAS: 'Source URL',
  VC_TITLE: 'Title (Vorbis)', VC_ARTIST: 'Artist (Vorbis)',
};

function getTagLabel(key) {
  return TAG_LABELS[key] || (key.startsWith('VC_') ? key.slice(3) : key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Audio Player Component
// ─────────────────────────────────────────────────────────────────────────────

function MiniPlayer({ file, objectUrl }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef(null);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [objectUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => setPlaying(false);

  const handleSeek = (e) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  };

  const formatTime = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!objectUrl) return null;

  return (
    <div className="flex items-center gap-4 bg-app border border-border rounded-xl p-3 w-full mt-4">
      <audio
        ref={audioRef}
        src={objectUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button 
        className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-white border-none cursor-pointer transition-all hover:bg-accent-hover hover:scale-105 shrink-0 shadow-md" 
        onClick={togglePlay} 
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        )}
      </button>
      <div className="flex flex-col gap-1.5 flex-1">
        <div
          className="relative h-1.5 bg-border rounded-full cursor-pointer"
          ref={progressRef}
          onClick={handleSeek}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
        >
          <div className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all duration-75" style={{ width: `${progress}%` }} />
          <div className="absolute top-1/2 w-3 h-3 rounded-full bg-white border-2 border-accent shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75" style={{ left: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-text-muted font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Cover Art Placeholder
// ─────────────────────────────────────────────────────────────────────────────

function DefaultCoverArt({ format, size = 120 }) {
  const colors = {
    MP3: ['#4ade80', '#16a34a'],
    FLAC: ['#818cf8', '#4338ca'],
    WAV: ['#fb923c', '#c2410c'],
    M4A: ['#f472b6', '#be185d'],
    AAC: ['#f472b6', '#be185d'],
    OGG: ['#34d399', '#059669'],
    OPUS: ['#38bdf8', '#0369a1'],
    AIFF: ['#fbbf24', '#b45309'],
    WMA: ['#a78bfa', '#6d28d9'],
    DEFAULT: ['#94a3b8', '#475569'],
  };
  const [c1, c2] = colors[format] || colors.DEFAULT;
  const id = `grad-${format}-${size}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style={{ width: size, height: size, display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1}/>
          <stop offset="100%" stopColor={c2}/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="12" fill={`url(#${id})`}/>
      {/* Vinyl grooves */}
      <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6"/>
      <circle cx="60" cy="60" r="32" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
      <circle cx="60" cy="60" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      {/* Center label */}
      <circle cx="60" cy="60" r="14" fill="rgba(255,255,255,0.25)"/>
      <circle cx="60" cy="60" r="5" fill="rgba(255,255,255,0.7)"/>
      {/* Format label */}
      <text x="60" y="102" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.05em">
        {format}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Format-specific badge colors
// ─────────────────────────────────────────────────────────────────────────────

function FormatBadge({ format }) {
  const badgeColors = {
    MP3: 'bg-green-500/15 text-green-700 dark:text-green-400 dark:bg-green-500/10',
    FLAC: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 dark:bg-indigo-500/10',
    WAV: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 dark:bg-orange-500/10',
    M4A: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 dark:bg-pink-500/10',
    AAC: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 dark:bg-pink-500/10',
    OGG: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/10',
    OPUS: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/10',
    AIFF: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 dark:bg-amber-500/10',
    WMA: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 dark:bg-purple-500/10',
    DEFAULT: 'bg-secondary text-text-muted',
  };
  const colorClass = badgeColors[format] || badgeColors.DEFAULT;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[0.68rem] font-bold uppercase tracking-wider ${colorClass}`}>
      {format}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const COMPARE_FIELDS = [
  { label: 'Format', fn: (f) => f.format },
  { label: 'File Size', fn: (f) => f.formattedSize },
  { label: 'Title', fn: (f) => f.tags['TIT2'] || '—' },
  { label: 'Artist', fn: (f) => f.tags['TPE1'] || '—' },
  { label: 'Album', fn: (f) => f.tags['TALB'] || '—' },
  { label: 'Year', fn: (f) => f.tags['TDRC'] || '—' },
  { label: 'Genre', fn: (f) => f.tags['TCON'] || '—' },
  { label: 'Track', fn: (f) => f.tags['TRCK'] || '—' },
  { label: 'Duration', fn: (f) => formatDuration(f.technical.durationSec) },
  { label: 'Bitrate', fn: (f) => f.technical.bitrate || '—' },
  { label: 'Sample Rate', fn: (f) => f.technical.sampleRate ? `${f.technical.sampleRate.toLocaleString()} Hz` : '—' },
  { label: 'Channels', fn: (f) => f.technical.numChannels ? (f.technical.numChannels === 1 ? 'Mono' : f.technical.numChannels === 2 ? 'Stereo' : `${f.technical.numChannels} ch`) : '—' },
  { label: 'Bit Depth', fn: (f) => f.technical.bitsPerSample ? `${f.technical.bitsPerSample}-bit` : '—' },
  { label: 'Codec', fn: (f) => f.technical.audioFormat || '—' },
];

export default function AudioMeta() {
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'all' | 'compare'
  const [searchQuery, setSearchQuery] = useState('');
  const [compareSelectedIds, setCompareSelectedIds] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const fileInputRef = useRef(null);

  const ACCEPTED = '.mp3,.wav,.wave,.flac,.m4a,.aac,.m4b,.m4p,.mp4,.ogg,.oga,.opus,.aiff,.aif,.wma,.asf';

  const activeFile = files.find(f => f.id === selectedId) || null;

  // Create / revoke object URL for audio preview
  useEffect(() => {
    files.forEach(f => {
      if (!f.objectUrl && f.arrayBuffer) {
        const blob = new Blob([f.arrayBuffer]);
        const url = URL.createObjectURL(blob);
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, objectUrl: url } : x));
      }
    });
  }, [files.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => { if (f.objectUrl) URL.revokeObjectURL(f.objectUrl); });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const processFiles = async (fileList) => {
    setLoading(true);
    setStatus('Parsing files...');
    const newFiles = [];
    for (const file of fileList) {
      const ext = file.name.split('.').pop().toLowerCase();
      const supportedExts = ['mp3', 'wav', 'wave', 'flac', 'm4a', 'aac', 'm4b', 'm4p', 'mp4', 'ogg', 'oga', 'opus', 'aiff', 'aif', 'wma', 'asf'];
      if (!supportedExts.includes(ext)) {
        setStatus(`Skipped unsupported file: ${file.name}`);
        continue;
      }
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        setStatus(`Already loaded: ${file.name}`);
        continue;
      }
      try {
        const parsed = await parseAudioFile(file);
        newFiles.push(parsed);
      } catch (err) {
        console.error('Error parsing', file.name, err);
        setStatus(`Failed to parse ${file.name}: ${err.message}`);
      }
    }
    if (newFiles.length > 0) {
      setFiles(prev => {
        const updated = [...prev, ...newFiles];
        setSelectedId(newFiles[0].id);
        setCompareSelectedIds(curr => [...curr, ...newFiles.map(f => f.id)]);
        return updated;
      });
      setStatus(`Loaded ${newFiles.length} file(s).`);
    }
    setLoading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileChange = (e) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleRemove = (id) => {
    setFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      const updated = prev.filter(f => f.id !== id);
      if (selectedId === id) setSelectedId(updated.length > 0 ? updated[0].id : null);
      return updated;
    });
    setCompareSelectedIds(prev => prev.filter(x => x !== id));
  };

  const handleClearAll = () => {
    files.forEach(f => { if (f.objectUrl) URL.revokeObjectURL(f.objectUrl); });
    setFiles([]);
    setSelectedId(null);
    setCompareSelectedIds([]);
    setStatus('Cleared all files.');
  };

  const handleExportJson = () => {
    if (!activeFile) return;
    const data = {
      filename: activeFile.name,
      format: activeFile.format,
      fileSize: activeFile.size,
      technical: activeFile.technical,
      tags: activeFile.tags,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name.replace(/\.[^/.]+$/, '') + '_metadata.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStripMp3 = () => {
    if (!activeFile || activeFile.ext !== 'mp3') return;
    try {
      const stripped = stripMp3Metadata(activeFile.arrayBuffer, 'all');
      const blob = new Blob([stripped], { type: 'audio/mpeg' });
      const strippedUrl = URL.createObjectURL(blob);
      setFiles(prev => prev.map(f => f.id === activeFile.id ? {
        ...f,
        strippedInfo: {
          blob,
          url: strippedUrl,
          size: blob.size,
          formattedSize: formatBytes(blob.size),
        }
      } : f));
      setStatus('Metadata stripped from MP3. Download the stripped file below.');
    } catch (err) {
      setStatus(`Stripping failed: ${err.message}`);
    }
  };

  const handleDownloadStripped = () => {
    if (!activeFile?.strippedInfo) return;
    const a = document.createElement('a');
    a.href = activeFile.strippedInfo.url;
    const nameBase = activeFile.name.replace(/\.[^/.]+$/, '');
    a.download = `${nameBase}_stripped.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRestoreOriginal = () => {
    if (!activeFile) return;
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, strippedInfo: null } : f));
    setStatus('Restored original file info.');
  };

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleCompare = (id) => {
    setCompareSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Build advanced parameter table
  const buildAllParams = (file) => {
    if (!file) return [];
    const groups = [
      {
        key: 'technical',
        label: 'Technical Parameters',
        icon: '🔧',
        rows: [
          ['Format', file.format],
          ['Duration', formatDuration(file.technical.durationSec)],
          ['Bitrate', file.technical.bitrate],
          ['Sample Rate', file.technical.sampleRate ? `${file.technical.sampleRate.toLocaleString()} Hz` : null],
          ['Channels', file.technical.numChannels ? (file.technical.numChannels === 1 ? 'Mono (1)' : file.technical.numChannels === 2 ? 'Stereo (2)' : `${file.technical.numChannels} channels`) : null],
          ['Bit Depth', file.technical.bitsPerSample ? `${file.technical.bitsPerSample}-bit` : null],
          ['Codec / Encoding', file.technical.audioFormat],
          ['File Size', file.formattedSize],
          ['Filename', file.name],
        ].filter(([, v]) => v != null && v !== '' && v !== '—'),
      },
      {
        key: 'tags',
        label: 'Metadata Tags',
        icon: '🏷️',
        rows: Object.entries(file.tags)
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => [getTagLabel(k), String(v)]),
      },
    ];
    return groups;
  };

  const compareFiles = files.filter(f => compareSelectedIds.includes(f.id));

  const displayFile = activeFile
    ? (activeFile.strippedInfo ? { ...activeFile, ...activeFile.strippedInfo } : activeFile)
    : null;

  const allParamGroups = buildAllParams(activeFile);

  const filteredParamGroups = allParamGroups.map(group => ({
    ...group,
    rows: searchQuery
      ? group.rows.filter(([k, v]) =>
          k.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.toLowerCase().includes(searchQuery.toLowerCase()))
      : group.rows,
  })).filter(g => g.rows.length > 0);

  // Channel display helper
  const channelLabel = (num) => {
    if (!num) return '—';
    if (num === 1) return 'Mono';
    if (num === 2) return 'Stereo';
    return `${num} channels`;
  };

  return (
    <Card id="tool-audio-meta" variant="tool" size="wide"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        id="audiometa-file-input"
      />

      <ToolHeader 
        title="Audio Metadata &amp; Tags Reader" 
      />

      {/* Full-width drag over overlay when files are already present */}
      {dragOver && files.length > 0 && (
        <div className="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent rounded-xl flex flex-col items-center justify-center gap-3 z-50 backdrop-blur-sm">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent animate-bounce">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          <p className="text-lg font-bold text-text-main">Drop audio files to add to list</p>
        </div>
      )}

      {/* Drop zone shown only when empty */}
      {files.length === 0 && (
        <div
          className={`border-2 border-dashed border-border rounded-xl p-8 cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-4 min-h-[220px] hover:border-accent hover:bg-accent-light/5 mt-4 ${dragOver ? 'border-accent bg-accent-light/5' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="Upload audio files"
        >
          <div className="flex flex-col items-center gap-3">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted transition-transform duration-300 hover:scale-110">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <p className="text-lg font-bold text-text-main">Drop audio files here</p>
            <p className="text-sm text-text-muted">or</p>
            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</Button>
            <p className="text-xs text-text-muted mt-2">Supports MP3, WAV, FLAC, M4A, AAC, OGG, Opus, AIFF, WMA and more</p>
          </div>
        </div>
      )}

      {status && (
        <p className={`mt-3 p-3 rounded-lg text-sm font-medium ${status.startsWith('Failed') || status.startsWith('Error') ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-accent-light/10 text-accent'}`}>
          {status}
        </p>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start mt-4">
          {/* Sidebar: file list */}
          <aside className="flex flex-col bg-card border border-border rounded-xl max-h-[600px] overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b border-border bg-app/50">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{files.length} file{files.length !== 1 ? 's' : ''}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} title="Add audio files" className="p-1 px-2 text-[0.75rem]">
                  Add
                </Button>
                <Button variant="secondary" size="sm" onClick={handleClearAll} title="Clear all" className="p-1 px-2 text-[0.75rem]">
                  Clear All
                </Button>
              </div>
            </div>
            <ul className="flex flex-col overflow-y-auto divide-y divide-border">
              {files.map(f => (
                <li
                  key={f.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-hover-bg relative group ${f.id === selectedId ? 'bg-accent-light/10 border-l-4 border-accent pl-2' : ''}`}
                  onClick={() => setSelectedId(f.id)}
                >
                  <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0">
                    {f.coverArt
                      ? <img src={f.coverArt} className="w-full h-full object-cover" alt="cover" />
                      : <DefaultCoverArt format={f.format} size={36} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-text-main truncate" title={f.name}>{f.name}</span>
                    <span className="flex items-center gap-1.5 mt-0.5">
                      <FormatBadge format={f.format} />
                      <span className="text-xs text-text-muted">{f.formattedSize}</span>
                    </span>
                  </div>
                  <button
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-500 rounded transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleRemove(f.id); }}
                    aria-label="Remove file"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Main panel */}
          <main className="flex flex-col gap-4 min-w-0">
            {/* Tab bar */}
            <div className="flex flex-wrap gap-2 items-center justify-between pb-3 border-b border-border">
              <div className="flex gap-2">
                {[
                  { id: 'overview', label: '📋 Overview' },
                  { id: 'all', label: '🗂 All Parameters' },
                  { id: 'compare', label: `⚖️ Compare (${compareFiles.length})` },
                ].map(tab => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    id={`audiometa-tab-${tab.id}`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {activeFile && (
                  <>
                    <Button variant="secondary" size="sm" onClick={handleExportJson} title="Export metadata as JSON">
                      ⬇ JSON
                    </Button>
                    {activeFile.ext === 'mp3' && !activeFile.strippedInfo && (
                      <Button variant="secondary" size="sm" onClick={handleStripMp3} title="Strip all ID3 metadata from MP3">
                        ✂ Strip Tags
                      </Button>
                    )}
                    {activeFile.strippedInfo && (
                      <>
                        <Button variant="secondary" size="sm" onClick={handleDownloadStripped}>
                          ⬇ Download Stripped
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleRestoreOriginal}>
                          ↩ Restore
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Overview Tab ── */}
            {activeTab === 'overview' && activeFile && (
              <div className="flex flex-col gap-4">
                {/* Header card: cover + basic info */}
                <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                  <div className="w-[120px] h-[120px] rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                    {activeFile.coverArt
                      ? <img src={activeFile.coverArt} className="w-full h-full object-cover" alt="Album art" />
                      : <DefaultCoverArt format={activeFile.format} size={120} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-text-main truncate">
                      {activeFile.tags['TIT2'] || activeFile.name}
                    </h2>
                    {activeFile.tags['TPE1'] && (
                      <p className="text-text-muted font-medium mt-1">{activeFile.tags['TPE1']}</p>
                    )}
                    {activeFile.tags['TALB'] && (
                      <p className="text-sm text-text-muted mt-1">
                        {activeFile.tags['TALB']}
                        {activeFile.tags['TDRC'] && ` · ${activeFile.tags['TDRC']}`}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <FormatBadge format={activeFile.format} />
                      {activeFile.strippedInfo && (
                        <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider">Tags Stripped</span>
                      )}
                    </div>
                    {/* Mini Player */}
                    <MiniPlayer file={activeFile} objectUrl={activeFile.objectUrl} />
                  </div>
                </div>

                {/* Metadata cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tags card */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>🏷️</span> Metadata
                    </h3>
                    <dl className="flex flex-col gap-2">
                      {[
                        ['Title', activeFile.tags['TIT2']],
                        ['Artist', activeFile.tags['TPE1']],
                        ['Album Artist', activeFile.tags['TPE2']],
                        ['Album', activeFile.tags['TALB']],
                        ['Year', activeFile.tags['TDRC']],
                        ['Genre', activeFile.tags['TCON']],
                        ['Track #', activeFile.tags['TRCK']],
                        ['Disc #', activeFile.tags['TPOS']],
                        ['Composer', activeFile.tags['TCOM']],
                        ['Comment', activeFile.tags['COMM']],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div className="flex justify-between py-1.5 border-b border-border last:border-0" key={k}>
                          <dt className="text-xs text-text-muted font-medium">{k}</dt>
                          <dd className="text-sm text-text-main font-semibold max-w-[70%] text-right truncate" title={v}>{v}</dd>
                        </div>
                      ))}
                      {Object.keys(activeFile.tags).filter(k =>
                        !['TIT2','TPE1','TPE2','TALB','TDRC','TCON','TRCK','TPOS','TCOM','COMM'].includes(k)
                      ).slice(0, 8).map(k => (
                        <div className="flex justify-between py-1.5 border-b border-border last:border-0" key={k}>
                          <dt className="text-xs text-text-muted font-medium">{getTagLabel(k)}</dt>
                          <dd className="text-sm text-text-main font-semibold max-w-[70%] text-right truncate" title={String(activeFile.tags[k])}>{String(activeFile.tags[k])}</dd>
                        </div>
                      ))}
                      {Object.keys(activeFile.tags).length === 0 && (
                        <p className="text-sm text-text-muted italic">No metadata tags found in this file.</p>
                      )}
                    </dl>
                  </div>

                  {/* Technical card */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>🔧</span> Technical
                    </h3>
                    <dl className="flex flex-col gap-2">
                      {[
                        ['Format', activeFile.format],
                        ['Duration', formatDuration(activeFile.technical.durationSec)],
                        ['Bitrate', activeFile.technical.bitrate],
                        ['Sample Rate', activeFile.technical.sampleRate ? `${activeFile.technical.sampleRate.toLocaleString()} Hz` : null],
                        ['Channels', channelLabel(activeFile.technical.numChannels)],
                        ['Bit Depth', activeFile.technical.bitsPerSample ? `${activeFile.technical.bitsPerSample}-bit` : null],
                        ['Codec', activeFile.technical.audioFormat],
                        ['File Size', activeFile.strippedInfo ? `${activeFile.strippedInfo.formattedSize} (stripped)` : activeFile.formattedSize],
                      ].filter(([, v]) => v && v !== '—').map(([k, v]) => (
                        <div className="flex justify-between py-1.5 border-b border-border last:border-0" key={k}>
                          <dt className="text-xs text-text-muted font-medium">{k}</dt>
                          <dd className="text-sm text-text-main font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>

                {/* MP3 Stripping info */}
                {activeFile.strippedInfo && (
                  <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-3.5 text-sm text-text-main">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 shrink-0">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>Metadata stripped. Original: {activeFile.formattedSize} → Stripped: {activeFile.strippedInfo.formattedSize}</span>
                    <Button size="sm" variant="primary" onClick={handleDownloadStripped} className="ml-auto">Download</Button>
                  </div>
                )}
              </div>
            )}

            {/* ── All Parameters Tab ── */}
            {activeTab === 'all' && activeFile && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 px-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search parameters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 border-none bg-transparent text-sm text-text-main outline-none placeholder-text-muted/50"
                    id="audiometa-search-input"
                  />
                  {searchQuery && (
                    <button className="bg-none border-none text-text-muted cursor-pointer text-base hover:text-text-main" onClick={() => setSearchQuery('')}>×</button>
                  )}
                </div>
                {filteredParamGroups.length === 0 ? (
                  <p className="text-sm text-text-muted italic text-center p-4">No parameters match your search.</p>
                ) : (
                  filteredParamGroups.map(group => (
                    <div key={group.key} className="bg-card border border-border rounded-xl overflow-hidden">
                      <button
                        className="flex items-center gap-2 w-full p-3.5 px-5 bg-none border-none cursor-pointer text-sm font-semibold text-text-main text-left transition-colors hover:bg-hover-bg"
                        onClick={() => toggleGroup(group.key)}
                        id={`audiometa-group-${group.key}`}
                      >
                        <span>{group.icon} {group.label}</span>
                        <span className="ml-auto text-xs text-text-muted bg-app px-2 py-0.5 rounded-full mr-2">{group.rows.length}</span>
                        <svg
                          className={`text-text-muted shrink-0 transition-transform duration-200 ${collapsedGroups[group.key] ? '-rotate-90' : ''}`}
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {!collapsedGroups[group.key] && (
                        <div className="border-t border-border overflow-x-auto">
                          <table className="w-full border-collapse">
                            <tbody>
                              {group.rows.map(([k, v]) => (
                                <tr key={k} className="hover:bg-hover-bg/30">
                                  <td className="p-2.5 px-5 w-[200px] text-xs text-text-muted font-medium border-b border-border last:border-0 vertical-align-top">{k}</td>
                                  <td className="p-2.5 px-5 text-xs text-text-main border-b border-border last:border-0 break-all vertical-align-top">{v}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Compare Tab ── */}
            {activeTab === 'compare' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-text-muted">Select files to compare:</p>
                  <div className="flex flex-wrap gap-2">
                    {files.map(f => (
                      <button
                        key={f.id}
                        className={`flex items-center gap-1.5 p-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors max-w-[200px] truncate ${compareSelectedIds.includes(f.id) ? 'border-accent bg-accent-light/10 text-text-main' : 'border-border bg-card text-text-muted hover:border-accent hover:text-text-main'}`}
                        onClick={() => toggleCompare(f.id)}
                      >
                        <FormatBadge format={f.format} />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {compareFiles.length >= 1 ? (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full border-collapse min-w-[400px]">
                      <thead>
                        <tr>
                          <th className="p-3 px-4 bg-app text-xs font-semibold text-text-muted text-left border-b border-border">Parameter</th>
                          {compareFiles.map(f => (
                            <th key={f.id} className="p-3 px-4 bg-app text-xs font-semibold text-text-muted text-left border-b border-border max-w-[180px] truncate">
                              <div className="flex items-center gap-2 truncate">
                                {f.coverArt
                                  ? <img src={f.coverArt} className="w-8 h-8 rounded object-cover shrink-0" alt="" />
                                  : <DefaultCoverArt format={f.format} size={32} />
                                }
                                <span className="truncate" title={f.name}>{f.name}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARE_FIELDS.map(field => (
                          <tr key={field.label} className="hover:bg-hover-bg/30">
                            <td className="p-2.5 px-4 text-xs font-medium text-text-muted border-b border-border last:border-0 w-[130px] truncate">{field.label}</td>
                            {compareFiles.map(f => (
                              <td key={f.id} className="p-2.5 px-4 text-xs text-text-main border-b border-border last:border-0 min-w-[140px] vertical-align-top">
                                {field.fn(f)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic text-center p-4">Select at least one file above to compare.</p>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </Card>
  );
}
