import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DATA_CONFIG,
  formatDecimalMb,
  getDataPlan,
  isConstrainedConnection,
} from '../lib/speedTest.js';
import { runDownloadTest, runUploadTest } from '../components/NetworkSpeedTest.jsx';

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
});
