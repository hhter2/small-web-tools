import { describe, expect, it } from 'vitest';
import {
  NAVIGATION_ROUTES,
  PUBLIC_ROUTE_IDS,
  STATIC_LAYOUT_IDS,
  TOOL_ROUTES,
  localizeToolRoute,
  getToolRoute,
} from '../toolRegistry.js';
import { TOOL_ICONS } from '../toolIcons.jsx';
import i18n from '../i18n/index.js';

describe('tool route registry', () => {
  it('owns unique public route and alias identifiers', () => {
    expect(new Set(PUBLIC_ROUTE_IDS).size).toBe(PUBLIC_ROUTE_IDS.length);
    expect(PUBLIC_ROUTE_IDS).toContain('tool-home');
    expect(PUBLIC_ROUTE_IDS).toContain('tool-markdown');
    expect(PUBLIC_ROUTE_IDS).toContain('tool-code-preview');
    expect(PUBLIC_ROUTE_IDS).toContain('privacy');
    expect(getToolRoute('tool-officemeta')?.id).toBe('tool-docmeta');
  });

  it('provides complete metadata and lazy loaders', () => {
    for (const route of TOOL_ROUTES) {
      expect(route).toMatchObject({
        id: expect.any(String),
        aliases: expect.any(Array),
        category: expect.any(String),
        loader: expect.any(Function),
        staticLayout: expect.any(Boolean),
        navigationVisible: expect.any(Boolean),
      });
      expect(localizeToolRoute(route, i18n.t.bind(i18n))).toMatchObject({
        title: expect.any(String),
        description: expect.any(String),
        searchMetadata: expect.any(Array),
      });
    }
  });

  it('derives navigation and static layout sets from registry flags', () => {
    expect(NAVIGATION_ROUTES.every((route) => route.navigationVisible)).toBe(true);
    for (const route of TOOL_ROUTES.filter((item) => item.staticLayout)) {
      expect(STATIC_LAYOUT_IDS.has(route.id)).toBe(true);
      for (const alias of route.aliases) expect(STATIC_LAYOUT_IDS.has(alias)).toBe(true);
    }
  });

  it('provides an icon for every visible navigation route', () => {
    for (const route of NAVIGATION_ROUTES) {
      expect(TOOL_ICONS[route.iconKey], route.id).toBeTruthy();
    }
  });
});
