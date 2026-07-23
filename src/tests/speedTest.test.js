import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DATA_CONFIG,
  MAX_HISTORY_SAMPLES,
  appendBoundedSample,
  formatDecimalMb,
  getDataPlan,
  isConstrainedConnection,
} from '../lib/speedTest.js';
import {
  runDownloadTest,
  runPingTest,
  runUploadTest,
} from '../components/NetworkSpeedTest.jsx';

afterEach(() => vi.unstubAllGlobals());

describe('speed-test data plans', () => {
  it('uses decimal MB consistently and reports total caps', () => {
    expect(DATA_CONFIG.light).toEqual({
      downloadBytes: 20_000_000,
      uploadBytes: 5_000_000,
    });
    expect(getDataPlan('heavy')).toEqual({
      downloadBytes: 100_000_000,
      uploadBytes: 25_000_000,
      totalBytes: 125_000_000,
    });
    expect(getDataPlan('custom', 12.5, 3)).toEqual({
      downloadBytes: 12_500_000,
      uploadBytes: 3_000_000,
      totalBytes: 15_500_000,
    });
    expect(formatDecimalMb(12_500_000)).toBe('12.50 MB');
  });

  it('detects save-data and cellular connections', () => {
    expect(isConstrainedConnection({ saveData: true })).toBe(true);
    expect(isConstrainedConnection({ type: 'cellular' })).toBe(true);
    expect(isConstrainedConnection({ effectiveType: '3g' })).toBe(true);
    expect(isConstrainedConnection({ effectiveType: '4g' })).toBe(false);
  });

  it.each([1_000_000, Infinity, NaN, -1, 0, '', 'not-a-number'])(
    'rejects hostile custom values without silently clamping: %s',
    (value) => {
      expect(() => getDataPlan('custom', value, 1)).toThrow(RangeError);
      expect(() => getDataPlan('custom', 1, value)).toThrow(RangeError);
    },
  );

  it('keeps chart history bounded without changing aggregate samples', () => {
    let history = [];
    for (let index = 0; index < 1000; index += 1) {
      history = appendBoundedSample(history, { speed: index });
    }
    expect(history.length).toBeLessThanOrEqual(MAX_HISTORY_SAMPLES);
    expect(history.at(-1)).toEqual({ speed: 999 });
  });
});

describe('speed-test cancellation', () => {
  it.each([
    ['download', runDownloadTest],
    ['upload', runUploadTest],
  ])('aborts the active %s request', async (_name, runner) => {
    let requestSignal;
    vi.stubGlobal('fetch', vi.fn((_url, options) => {
      requestSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    }));

    const controller = new AbortController();
    const running = runner(10_000, 1_000_000, () => {}, controller.signal);
    await Promise.resolve();
    controller.abort();
    await running;
    expect(requestSignal.aborted).toBe(true);
  });

  it('reports latency as unavailable when every ping is non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 503 })));
    expect(await runPingTest(new AbortController().signal)).toBeNull();
  });

  it.each([
    ['download', runDownloadTest],
    ['upload', runUploadTest],
  ])('rejects a non-2xx %s response', async (_name, runner) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 503 })));
    await expect(runner(100, 1_000_000, () => {}, new AbortController().signal))
      .rejects.toThrow(/server returned error status/i);
  });
});
