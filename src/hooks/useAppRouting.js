import { useCallback, useEffect, useState } from 'react';
import { PUBLIC_ROUTE_IDS } from '../toolRouteMetadata.js';
import {
  buildModeUrl,
  getModeIdFromLocation,
  getRouteIdFromLocation,
  getToolMode,
  isToolPath,
} from '../toolModes.js';

const VALID_TOOL_IDS = new Set(PUBLIC_ROUTE_IDS);

function validToolId(rawId) {
  return rawId && VALID_TOOL_IDS.has(rawId) ? rawId : 'tool-home';
}

function initialToolId(readStoredActiveTool) {
  try {
    const routeId = getRouteIdFromLocation(window.location.pathname, window.location.hash);
    if (routeId) {
      if (VALID_TOOL_IDS.has(routeId)) return routeId;
      window.history.replaceState(null, '', buildModeUrl(
        window.location.href,
        getModeIdFromLocation(window.location.pathname, window.location.search),
      ));
      return 'tool-home';
    }
    if (isToolPath(window.location.pathname)) return 'tool-home';
    return validToolId(readStoredActiveTool());
  } catch {
    return 'tool-home';
  }
}

export function useAppRouting(readStoredActiveTool) {
  const [activeTool, setActiveTool] = useState(() => initialToolId(readStoredActiveTool));
  const [toolMode, setToolMode] = useState(() => {
    try {
      return getModeIdFromLocation(window.location.pathname, window.location.search);
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    const handleLocationChange = () => {
      try {
        const nextModeId = getModeIdFromLocation(window.location.pathname, window.location.search);
        const routeId = getRouteIdFromLocation(window.location.pathname, window.location.hash);
        if (routeId && !VALID_TOOL_IDS.has(routeId)) {
          window.history.replaceState(null, '', buildModeUrl(window.location.href, nextModeId));
          setActiveTool('tool-home');
          setToolMode(nextModeId);
          return;
        }
        const nextToolId = validToolId(routeId);
        const canonicalAddress = buildModeUrl(window.location.href, nextModeId, nextToolId);
        if (canonicalAddress !== window.location.href) {
          window.history.replaceState(null, '', canonicalAddress);
        }
        setActiveTool(nextToolId);
        setToolMode(nextModeId);
      } catch {
        setActiveTool('tool-home');
        setToolMode('all');
      }
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    const nextAddress = buildModeUrl(window.location.href, toolMode, activeTool);
    if (nextAddress !== window.location.href) {
      window.history.replaceState(null, '', nextAddress);
    }
  }, [activeTool, toolMode]);

  const navigateToTool = useCallback((toolId) => {
    const nextAddress = buildModeUrl(window.location.href, toolMode, toolId);
    if (nextAddress !== window.location.href) {
      window.history.pushState(null, '', nextAddress);
    }
    setActiveTool(validToolId(toolId));
  }, [toolMode]);

  const changeMode = useCallback((nextModeId) => {
    const nextMode = getToolMode(nextModeId);
    window.history.pushState(null, '', buildModeUrl(window.location.href, nextMode.id));
    setToolMode(nextMode.id);
    setActiveTool('tool-home');
  }, []);

  return { activeTool, toolMode, navigateToTool, changeMode };
}
