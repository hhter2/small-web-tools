import { describe, expect, it, vi } from 'vitest';
import {
  estimateMp3Duration,
  parseID3v1,
  parseID3v2,
} from '../components/AudioMeta/lib/id3.js';
import { parseWav } from '../components/AudioMeta/lib/audioFormats.js';
import { stripMp3Metadata } from '../components/AudioMeta/lib/stripMetadata.js';
import {
  attachAudioPreviewUrl,
  createReplacementAudioUrl,
  revokeAudioFileUrls,
} from '../components/AudioMeta/lib/audioObjectUrls.js';

function writeAscii(target, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    target[offset + index] = value.charCodeAt(index);
  }
}

describe('audio metadata domain', () => {
  it('parses ID3v1 fields and track numbers', () => {
    const bytes = new Uint8Array(128);
    writeAscii(bytes, 0, 'TAG');
    writeAscii(bytes, 3, 'Example title');
    writeAscii(bytes, 33, 'Example artist');
    bytes[125] = 0;
    bytes[126] = 7;
    bytes[127] = 17;

    expect(parseID3v1(bytes)).toMatchObject({
      hasV1: true,
      tags: {
        TIT2: 'Example title',
        TPE1: 'Example artist',
        TRCK: '7',
        TCON: 'Rock',
      },
    });
  });

  it('parses representative UTF-8 ID3v2 text frames', () => {
    const text = new TextEncoder().encode('Example song');
    const frameSize = text.length + 1;
    const bytes = new Uint8Array(10 + 10 + frameSize);
    writeAscii(bytes, 0, 'ID3');
    bytes[3] = 3;
    bytes[9] = 10 + frameSize;
    writeAscii(bytes, 10, 'TIT2');
    bytes[17] = frameSize;
    bytes[20] = 3;
    bytes.set(text, 21);

    expect(parseID3v2(bytes).tags).toEqual({ TIT2: 'Example song' });
  });

  it('returns empty metadata for malformed input', () => {
    expect(parseID3v2(new Uint8Array([1, 2, 3]))).toEqual({ tags: {}, coverArt: null });
    expect(parseWav(new Uint8Array([1, 2, 3]))).toEqual({ tags: {}, technical: {}, coverArt: null });
  });

  it('estimates constant-bitrate MP3 duration from a valid frame header', () => {
    const bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x00]);

    expect(estimateMp3Duration(bytes, 16_000)).toMatchObject({
      bitrate: '128 kbps',
      sampleRate: 44_100,
      durationSec: 1,
    });
  });

  it('strips leading ID3v2 and trailing ID3v1 data without touching audio bytes', () => {
    const bytes = new Uint8Array(10 + 4 + 3 + 128);
    writeAscii(bytes, 0, 'ID3');
    bytes[9] = 4;
    bytes.set([9, 8, 7], 14);
    writeAscii(bytes, 17, 'TAG');

    expect([...new Uint8Array(stripMp3Metadata(bytes.buffer))]).toEqual([9, 8, 7]);
  });

  it('makes preview and derived URL ownership explicit', () => {
    const createObjectUrl = vi.fn()
      .mockReturnValueOnce('blob:preview')
      .mockReturnValueOnce('blob:replacement');
    const revokeObjectUrl = vi.fn();
    const record = attachAudioPreviewUrl(
      { arrayBuffer: new Uint8Array([1]).buffer, strippedInfo: null },
      { type: 'audio/mpeg' },
      createObjectUrl,
    );

    expect(record.objectUrl).toBe('blob:preview');
    expect(createReplacementAudioUrl('blob:old', new Blob(), createObjectUrl, revokeObjectUrl))
      .toBe('blob:replacement');
    revokeAudioFileUrls({ ...record, strippedInfo: { url: 'blob:replacement' } }, revokeObjectUrl);
    expect(revokeObjectUrl.mock.calls).toEqual([
      ['blob:old'],
      ['blob:preview'],
      ['blob:replacement'],
    ]);
  });
});
