import { describe, expect, it } from 'vitest';
import { NAVIGATION_ROUTES } from '../toolRegistry.js';
import {
  TOOL_MODES,
  buildModeUrl,
  filterToolsForMode,
  getModeIdFromSearch,
  getToolMode,
} from '../toolModes.js';

describe('tool modes', () => {
  it('defines every requested audience plus the simplified workspace', () => {
    expect(TOOL_MODES.map(({ id }) => id)).toEqual([
      'all',
      'daily',
      'developer',
      'bioinformatics',
      'designer',
      'student',
      'simple',
    ]);
    expect(getToolMode('simple').simplified).toBe(true);
    expect(getToolMode('unknown').id).toBe('all');
  });

  it('references only registered tools and provides a useful set for every mode', () => {
    const registeredIds = new Set(NAVIGATION_ROUTES.map(({ id }) => id));
    for (const mode of TOOL_MODES.filter(({ id }) => id !== 'all')) {
      expect(mode.toolIds.length, mode.id).toBeGreaterThanOrEqual(7);
      expect(mode.toolIds.every((id) => registeredIds.has(id)), mode.id).toBe(true);
      expect(filterToolsForMode(NAVIGATION_ROUTES, mode.id).map(({ id }) => id))
        .toEqual(NAVIGATION_ROUTES.filter(({ id }) => mode.toolIds.includes(id)).map(({ id }) => id));
    }
    expect(getToolMode('simple').toolIds.length)
      .toBeLessThan(getToolMode('daily').toolIds.length);
  });

  it('builds complete bookmarkable addresses and reads the selected mode', () => {
    expect(buildModeUrl('https://tools.example/app?ref=test#tool-wc', 'developer'))
      .toBe('https://tools.example/app?ref=test&mode=developer#tool-home');
    expect(buildModeUrl('https://tools.example/app?mode=developer#tool-wc', 'developer', 'tool-code-preview'))
      .toBe('https://tools.example/app?mode=developer#tool-code-preview');
    expect(buildModeUrl('https://tools.example/app?mode=simple#tool-home', 'all'))
      .toBe('https://tools.example/app');
    expect(getModeIdFromSearch('?ref=test&mode=bioinformatics')).toBe('bioinformatics');
    expect(getModeIdFromSearch('?mode=unknown')).toBe('all');
  });
});
