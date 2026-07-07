import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance = null;
let loadingPromise = null;

export function getFFmpeg() {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }
  return ffmpegInstance;
}

/**
 * Ensure the ffmpeg core is loaded, returning the FFmpeg instance.
 * Shares the load promise across calls to prevent redundant downloads.
 * @param {(message: string) => void} [onLog]
 */
export async function ensureFFmpegLoaded(onLog) {
  const ffmpeg = getFFmpeg();
  if (ffmpeg.loaded) return ffmpeg;

  if (!loadingPromise) {
    loadingPromise = (async () => {
      if (onLog) {
        ffmpeg.on('log', ({ message }) => onLog(message));
      }
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
        toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
    })();
  }

  await loadingPromise;
  return ffmpeg;
}

// Audio output formats. buildArgs returns ffmpeg parameters (excluding -i input and output filename).
export const AUDIO_FORMATS = [
  {
    value: 'source',
    label: 'Keep Original Codec (Lossless, Fastest)',
    outputExt: 'mka', // Packaging arbitrary codecs in Matroska avoids guessing compatibility
    buildArgs: () => ['-vn', '-acodec', 'copy'],
  },
  {
    value: 'mp3',
    label: 'MP3',
    outputExt: 'mp3',
    buildArgs: () => ['-vn', '-acodec', 'libmp3lame', '-q:a', '2'],
  },
  {
    value: 'wav',
    label: 'WAV (Uncompressed)',
    outputExt: 'wav',
    buildArgs: () => ['-vn', '-acodec', 'pcm_s16le'],
  },
  {
    value: 'aac',
    label: 'AAC / M4A',
    outputExt: 'm4a',
    buildArgs: () => ['-vn', '-acodec', 'aac', '-b:a', '192k'],
  },
  {
    value: 'ogg',
    label: 'OGG Vorbis',
    outputExt: 'ogg',
    buildArgs: () => ['-vn', '-acodec', 'libvorbis', '-q:a', '5'],
  },
];

// Video-only (silent) output formats.
export const VIDEO_FORMATS = [
  {
    value: 'source',
    label: 'Keep Original Codec (Lossless, Fastest)',
    outputExt: null, // null means use original extension
    buildArgs: () => ['-an', '-vcodec', 'copy'],
  },
  {
    value: 'mp4',
    label: 'MP4 (H.264 Re-encode)',
    outputExt: 'mp4',
    buildArgs: () => ['-an', '-vcodec', 'libx264', '-preset', 'veryfast', '-crf', '23'],
  },
  {
    value: 'webm',
    label: 'WebM (VP9 Re-encode)',
    outputExt: 'webm',
    buildArgs: () => ['-an', '-vcodec', 'libvpx-vp9', '-crf', '32', '-b:v', '0'],
  },
];

export function getExt(filename) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename || '');
  return match ? match[1].toLowerCase() : '';
}

const MIME_MAP = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  mka: 'audio/x-matroska',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
};

export function guessMime(ext, kind) {
  return MIME_MAP[ext] || (kind === 'audio' ? 'audio/octet-stream' : 'video/octet-stream');
}
