import { describe, expect, it, vi } from 'vitest';
import { createObjectUrlRegistry } from '../hooks/useObjectUrlRegistry.js';

describe('object URL registry', () => {
  it('owns and deterministically revokes URLs', () => {
    const urlApi = {
      createObjectURL: vi.fn()
        .mockReturnValueOnce('blob:first')
        .mockReturnValueOnce('blob:second'),
      revokeObjectURL: vi.fn(),
    };
    const registry = createObjectUrlRegistry(urlApi);
    const first = registry.create(new Blob());
    registry.create(new Blob());
    expect(registry.size).toBe(2);
    expect(registry.revoke(first)).toBe(true);
    expect(registry.revoke(first)).toBe(false);
    registry.revokeAll();
    expect(registry.size).toBe(0);
    expect(urlApi.revokeObjectURL.mock.calls).toEqual([
      ['blob:first'],
      ['blob:second'],
    ]);
  });
});
