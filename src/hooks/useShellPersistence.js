import { useEffect } from 'react';

export function readStoredActiveTool() {
  try {
    return sessionStorage.getItem('activeTool');
  } catch {
    return null;
  }
}

export function useShellPersistence({ activeTool, theme, isSidebarCollapsed }) {
  useEffect(() => {
    try {
      sessionStorage.setItem('activeTool', activeTool);
    } catch {
      // Storage can be unavailable; route state remains authoritative in memory.
    }
  }, [activeTool]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Storage can be unavailable; keep the active in-memory theme.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', isSidebarCollapsed ? 'true' : 'false');
    } catch {
      // Storage can be unavailable; keep the current sidebar state.
    }
  }, [isSidebarCollapsed]);
}
