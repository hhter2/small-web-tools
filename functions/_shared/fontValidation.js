const FONT_SIGNATURES = [
  { bytes: [0x77, 0x4f, 0x46, 0x46], contentType: 'font/woff' },
  { bytes: [0x77, 0x4f, 0x46, 0x32], contentType: 'font/woff2' },
  { bytes: [0x4f, 0x54, 0x54, 0x4f], contentType: 'font/otf' },
  { bytes: [0x00, 0x01, 0x00, 0x00], contentType: 'font/ttf' },
  { bytes: [0x74, 0x72, 0x75, 0x65], contentType: 'font/ttf' },
  { bytes: [0x74, 0x79, 0x70, 0x31], contentType: 'font/ttf' },
];

export function detectFontContentType(buffer) {
  const bytes = new Uint8Array(buffer);
  const signature = FONT_SIGNATURES.find((candidate) => (
    candidate.bytes.every((byte, index) => bytes[index] === byte)
  ));
  if (!signature) throw new Error('Remote response is not a supported font file');
  return signature.contentType;
}
