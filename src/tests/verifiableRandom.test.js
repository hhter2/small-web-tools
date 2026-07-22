import { describe, expect, it } from 'vitest';
import {
  createDrawRecord,
  selectUnbiasedIndexFromValues,
  selectWinnerIndex,
  verifyDrawRecord,
  WHEEL_ALGORITHM_VERSION,
} from '../lib/verifiableRandom.js';

const SEED_A = '00'.repeat(32);
const SEED_B = '01'.repeat(32);

describe('verifiable wheel randomness', () => {
  it('is deterministic for a fixed seed and list', async () => {
    const first = await selectWinnerIndex(SEED_A, 7);
    const second = await selectWinnerIndex(SEED_A, 7);
    expect(second).toBe(first);
    expect(await selectWinnerIndex(SEED_B, 7)).not.toBe(first);
  });

  it('handles one and zero items explicitly', async () => {
    await expect(selectWinnerIndex(SEED_A, 1)).resolves.toBe(0);
    await expect(selectWinnerIndex(SEED_A, 0)).rejects.toThrow('At least one');
  });

  it('rejects out-of-range uint32 values before applying modulo', () => {
    expect(selectUnbiasedIndexFromValues(10, [0xffff_ffff, 24])).toBe(4);
    expect(() => selectUnbiasedIndexFromValues(0, [1])).toThrow('At least one');
  });

  it('creates and verifies a versioned immutable list snapshot', async () => {
    const record = await createDrawRecord(['Alice', 'Alice', 'Bob'], {
      seed: SEED_A,
      timestamp: '2026-07-22T00:00:00.000Z',
    });
    expect(record.algorithm).toBe(WHEEL_ALGORITHM_VERSION);
    expect(record.items).toEqual(['Alice', 'Alice', 'Bob']);
    await expect(verifyDrawRecord(record)).resolves.toMatchObject({ valid: true });

    record.items[0] = 'Mallory';
    await expect(verifyDrawRecord(record)).resolves.toMatchObject({ valid: false });
  });
});
