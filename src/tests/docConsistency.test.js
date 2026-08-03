import { describe, expect, it } from 'vitest';
import {
  extractRegistryRouteIds,
  findMissingRoutes,
  findMissingTokens,
} from '../../scripts/doc-consistency-lib.mjs';

describe('documentation consistency helpers', () => {
  it('extracts routes registered through route() calls', () => {
    const source = `
      route('tool-home', 'home', loader),
      route("tool-markdown", 'developer', loader),
      route('privacy', 'policy', loader),
    `;

    expect(extractRegistryRouteIds(source)).toEqual([
      'tool-home',
      'tool-markdown',
      'privacy',
    ]);
  });

  it('reports a route missing from the architecture inventory', () => {
    const registry = `route('tool-home', 'home', loader); route('tool-markdown', 'developer', loader);`;
    const architecture = '| `tool-home` | Dashboard | `HomeGrid.jsx` | Dashboard |';

    expect(findMissingRoutes(registry, architecture)).toEqual(['tool-markdown']);
  });

  it('reports technical tokens missing from a companion guide', () => {
    const english = 'Use `npm run verify`, visit `/home/privacy`, and call `/api/iplookup`. Requires Node.js 22.';
    const companion = '執行 `npm run verify`，並造訪 `/home/privacy`。需要 Node.js 22。';

    expect(findMissingTokens(english, companion)).toEqual(['/api/iplookup']);
  });
});
