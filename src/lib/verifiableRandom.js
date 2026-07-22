export const WHEEL_ALGORITHM_VERSION = 'SWT-WHEEL-SHA256-REJECTION-v1';
const UINT32_RANGE = 0x1_0000_0000;

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error('Seed must be exactly 256 bits encoded as 64 hex characters');
  }
  return Uint8Array.from(hex.match(/.{2}/g), (pair) => parseInt(pair, 16));
}

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

export function createSeed() {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  return bytesToHex(seed);
}

export function selectUnbiasedIndexFromValues(max, values) {
  if (!Number.isSafeInteger(max) || max < 1) throw new Error('At least one item is required');
  if (max === 1) return 0;
  const limit = Math.floor(UINT32_RANGE / max) * max;
  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
      throw new Error('Random value is outside the uint32 range');
    }
    if (value < limit) return value % max;
  }
  throw new Error('Random stream was exhausted before an unbiased value was found');
}

export async function selectWinnerIndex(seedHex, itemCount) {
  if (!Number.isSafeInteger(itemCount) || itemCount < 1) {
    throw new Error('At least one item is required');
  }
  if (itemCount === 1) return 0;

  const seed = hexToBytes(seedHex);
  const domain = new TextEncoder().encode(WHEEL_ALGORITHM_VERSION);
  const limit = Math.floor(UINT32_RANGE / itemCount) * itemCount;

  for (let counter = 0; counter < 0x1_0000_0000; counter += 1) {
    const input = new Uint8Array(domain.length + seed.length + 4);
    input.set(domain);
    input.set(seed, domain.length);
    new DataView(input.buffer).setUint32(domain.length + seed.length, counter);
    const block = await sha256(input);
    const view = new DataView(block.buffer);
    for (let offset = 0; offset < block.byteLength; offset += 4) {
      const value = view.getUint32(offset);
      if (value < limit) return value % itemCount;
    }
  }
  throw new Error('Unable to derive an unbiased winner');
}

export async function hashItemSnapshot(items) {
  return bytesToHex(await sha256(new TextEncoder().encode(JSON.stringify(items))));
}

export async function createDrawRecord(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('At least one item is required');
  const snapshot = items.map((item) => String(item).trim()).filter(Boolean);
  if (snapshot.length !== items.length) throw new Error('Draw items cannot be blank');
  const seed = options.seed || createSeed();
  const winnerIndex = await selectWinnerIndex(seed, snapshot.length);
  return {
    algorithm: WHEEL_ALGORITHM_VERSION,
    seed,
    items: snapshot,
    itemsHash: await hashItemSnapshot(snapshot),
    winnerIndex,
    winnerName: snapshot[winnerIndex],
    timestamp: options.timestamp || new Date().toISOString(),
  };
}

export async function verifyDrawRecord(record) {
  if (record?.algorithm !== WHEEL_ALGORITHM_VERSION) {
    return { valid: false, error: 'Unsupported algorithm version' };
  }
  try {
    const expectedHash = await hashItemSnapshot(record.items);
    const winnerIndex = await selectWinnerIndex(record.seed, record.items.length);
    const valid = (
      expectedHash === record.itemsHash
      && winnerIndex === record.winnerIndex
      && record.items[winnerIndex] === record.winnerName
    );
    return valid
      ? { valid: true, winnerIndex, winnerName: record.items[winnerIndex] }
      : { valid: false, error: 'Record contents or winner do not match' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
