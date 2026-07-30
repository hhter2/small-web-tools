import { describe, expect, it } from 'vitest';
import { NAVIGATION_ROUTES } from '../toolRegistry.js';
import {
  AUDIENCE_MODES,
  TOOL_MODES,
  buildModeUrl,
  filterToolsForMode,
  getModeIdFromLocation,
  getRouteIdFromLocation,
  getToolMode,
  isToolPath,
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
    expect(AUDIENCE_MODES.map(({ id }) => id)).toEqual([
      'all',
      'daily',
      'developer',
      'bioinformatics',
      'designer',
      'student',
    ]);
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
      .toBe('https://tools.example/home/developer');
    expect(buildModeUrl('https://tools.example/app?mode=developer#tool-wc', 'developer', 'tool-code-preview'))
      .toBe('https://tools.example/home/developer/code-preview');
    expect(buildModeUrl('https://tools.example/app#tool-wc', 'all', 'tool-color'))
      .toBe('https://tools.example/home/color');
    expect(buildModeUrl('https://tools.example/app?mode=simple#tool-home', 'all'))
      .toBe('https://tools.example/home');
    expect(getModeIdFromLocation('/home/bioinformatics')).toBe('bioinformatics');
    expect(getModeIdFromLocation('/home/student/wc')).toBe('student');
    expect(getModeIdFromLocation('/home/unknown')).toBe('all');
    expect(getModeIdFromLocation('/', '?mode=designer')).toBe('designer');
    expect(getRouteIdFromLocation('/home/developer/code-preview')).toBe('tool-code-preview');
    expect(getRouteIdFromLocation('/home/color')).toBe('tool-color');
    expect(getRouteIdFromLocation('/home/tool-color')).toBe('tool-color');
    expect(getRouteIdFromLocation('/home/developer')).toBe('tool-home');
    expect(getRouteIdFromLocation('/', '#tool-wc')).toBe('tool-wc');
    expect(isToolPath('/home/developer/code-preview')).toBe(true);
    expect(isToolPath('/')).toBe(false);
  });
});
