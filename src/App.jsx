import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import BioinfoIcon from './components/BioinfoIcon.jsx';
import SimpleHome from './components/SimpleHome.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import ThirdPartyConsentModal from './components/ui/ThirdPartyConsentModal';
import Spinner from './components/ui/Spinner';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { PUBLIC_ROUTE_IDS, STATIC_LAYOUT_IDS, getLocalizedToolRoutes, getToolRoute, localizeToolRoute, sortLocalizedTools } from './toolRegistry.js';
import { TOOL_ICONS } from './toolIcons.jsx';
import {
  buildModeUrl,
  filterToolsForMode,
  getModeIdFromLocation,
  getRouteIdFromLocation,
  getToolMode,
  isToolPath,
  localizeToolMode,
} from './toolModes.js';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
const SHOW_CHANNEL_ALERT = typeof __SHOW_CHANNEL_ALERT__ !== 'undefined' ? __SHOW_CHANNEL_ALERT__ : false;
const APP_CHANNEL = typeof __APP_CHANNEL__ !== 'undefined' ? __APP_CHANNEL__ : '';


const categories = [
  {
    id: 'text',
    nameKey: 'text',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  },
  {
    id: 'developer',
    nameKey: 'developer',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    )
  },
  {
    id: 'network',
    nameKey: 'network',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    )
  },
  {
    id: 'media',
    nameKey: 'media',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    )
  },
  {
    id: 'bioinfo',
    nameKey: 'bioinfo',
    icon: <BioinfoIcon />
  },
  {
    id: 'utilities',
    nameKey: 'utilities',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="2" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M16.24 7.76l-8.48 8.48"></path>
        <path d="M7.76 7.76l8.48 8.48"></path>
      </svg>
    )
  }
];

const staticTools = STATIC_LAYOUT_IDS;

const VALID_TOOL_IDS = new Set(PUBLIC_ROUTE_IDS);

function getValidToolId(rawId) {
  if (rawId && VALID_TOOL_IDS.has(rawId)) {
    return rawId;
  }
  return 'tool-home';
}

export default function App() {
  const { t, i18n } = useTranslation(['common', 'navigation', 'tools', 'errors']);
  const [activeTool, setActiveTool] = useState(() => {
    try {
      const locationRouteId = getRouteIdFromLocation(
        window.location.pathname,
        window.location.hash,
      );
      if (locationRouteId) {
        if (VALID_TOOL_IDS.has(locationRouteId)) {
          return locationRouteId;
        }
        window.history.replaceState(
          null,
          '',
          buildModeUrl(
            window.location.href,
            getModeIdFromLocation(window.location.pathname, window.location.search),
          ),
        );
        return 'tool-home';
      }
      if (isToolPath(window.location.pathname)) {
        return 'tool-home';
      }
      const saved = sessionStorage.getItem("activeTool");
      if (saved && VALID_TOOL_IDS.has(saved)) {
        return saved;
      }
      return "tool-home";
    } catch {
      return "tool-home";
    }
  });

  const [toolMode, setToolMode] = useState(() => {
    try {
      return getModeIdFromLocation(window.location.pathname, window.location.search);
    } catch {
      return 'all';
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) return savedTheme;
    } catch {
      // Storage access can be blocked by the browser; keep the in-memory default.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [tooltipState, setTooltipState] = useState({ text: '', top: 0, left: 0, visible: false });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedHomeTab, setSelectedHomeTab] = useState('all');
  const [toastMessage, setToastMessage] = useState('');
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (message) => {
    setToastMessage(message);
  };

  const handleEmailClick = () => {
    navigator.clipboard.writeText("emailforvirtualmachine@gmail.com")
      .then(() => {
        showToast(t('navigation:toast.emailCopied'));
      })
      .catch(() => {});
  };

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      setOpenDropdown(null);
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Sync theme to document element and localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Storage access can be blocked by the browser; keep the current state.
    }
  }, [theme]);

  const modeProfile = localizeToolMode(getToolMode(toolMode), t);
  const categoriesLocalized = useMemo(() => categories.map((category) => ({
    ...category,
    name: t(`navigation:categories.${category.nameKey}`),
  })), [i18n.resolvedLanguage, t]);
  const navItems = useMemo(() => getLocalizedToolRoutes(t)
    .filter((route) => route.navigationVisible)
    .map((route) => ({
      ...route,
      name: route.title,
      desc: route.description,
      icon: TOOL_ICONS[route.iconKey],
    })), [i18n.resolvedLanguage, t]);

  // Sync activeTool state, sessionStorage, and document title
  useEffect(() => {
    try {
      sessionStorage.setItem("activeTool", activeTool);
      const route = getToolRoute(activeTool);
      const localizedRoute = route ? localizeToolRoute(route, t) : null;
      document.title = localizedRoute?.id === 'tool-home' && modeProfile.id === 'all'
        ? t('navigation:titles.default')
        : t('navigation:titles.tool', {
          tool: localizedRoute?.id === 'tool-home' ? modeProfile.label : localizedRoute?.title,
        });
    } catch {
      // Storage access can be blocked by the browser; navigation still works.
    }
  }, [activeTool, modeProfile.id, modeProfile.label, i18n.resolvedLanguage, t]);

  // Listen for address changes to sync the active tool and audience/simple mode.
  useEffect(() => {
    const handleLocationChange = () => {
      try {
        const nextModeId = getModeIdFromLocation(
          window.location.pathname,
          window.location.search,
        );
        const locationRouteId = getRouteIdFromLocation(
          window.location.pathname,
          window.location.hash,
        );
        if (locationRouteId && !VALID_TOOL_IDS.has(locationRouteId)) {
          window.history.replaceState(
            null,
            '',
            buildModeUrl(window.location.href, nextModeId),
          );
          setActiveTool('tool-home');
          setToolMode(nextModeId);
          return;
        }
        const validId = getValidToolId(locationRouteId);
        const canonicalAddress = buildModeUrl(window.location.href, nextModeId, validId);
        if (canonicalAddress !== window.location.href) {
          window.history.replaceState(null, '', canonicalAddress);
        }
        setActiveTool(validId);
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

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        /** @type {HTMLInputElement | null} */
        const searchInput = document.querySelector('.header-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
          setIsSearchFocused(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keep tool and mode navigation in one canonical, bookmarkable address.
  useEffect(() => {
    try {
      sessionStorage.setItem("activeTool", activeTool);
      const nextAddress = buildModeUrl(window.location.href, toolMode, activeTool);
      if (nextAddress !== window.location.href) {
        window.history.replaceState(null, '', nextAddress);
      }
    } catch {
      // Storage access can be blocked by the browser; the UI remains usable.
    }
  }, [activeTool, toolMode]);

  // Sync sidebarCollapsed to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", isSidebarCollapsed ? "true" : "false");
    } catch {
      // Storage access can be blocked by the browser; the UI remains usable.
    }
  }, [isSidebarCollapsed]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const handleNavClick = (toolId) => {
    const nextAddress = buildModeUrl(window.location.href, toolMode, toolId);
    if (nextAddress !== window.location.href) {
      window.history.pushState(null, '', nextAddress);
    }
    setActiveTool(toolId);
    setMobileSidebarOpen(false);
  };

  const handleModeChange = (nextModeId) => {
    const nextMode = getToolMode(nextModeId);
    const nextAddress = buildModeUrl(window.location.href, nextMode.id);
    window.history.pushState(null, '', nextAddress);
    setToolMode(nextMode.id);
    setActiveTool('tool-home');
    setSelectedHomeTab('all');
    setSearchQuery('');
    setMobileSidebarOpen(false);
  };

  const handleAllToolsHomeClick = () => {
    handleModeChange('all');
  };

  // Tooltip logic for collapsed sidebar
  const handleMouseEnter = (e, item) => {
    if (isSidebarCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipState({
        text: item.tooltip,
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
        visible: true
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltipState(prev => ({ ...prev, visible: false }));
  };

  // Audience modes filter the home, sidebar, and search; header shortcuts stay complete.
  const modeNavItems = filterToolsForMode(navItems, toolMode);
  const searchNavItems = modeProfile.simplified ? navItems : modeNavItems;
  const normalizedQuery = searchQuery.toLocaleLowerCase(i18n.resolvedLanguage).trim();
  const matchesSearch = (item) => item.searchMetadata.some((term) =>
    term.toLocaleLowerCase(i18n.resolvedLanguage).includes(normalizedQuery));
  const filteredModeNavItems = modeNavItems.filter(matchesSearch);
  const filteredSearchNavItems = searchNavItems.filter(matchesSearch);
  // Render the active registry component.
  const renderActiveTool = () => {
    const route = getToolRoute(activeTool) || getToolRoute('tool-home');
    if (route.id === 'tool-home' && modeProfile.simplified) {
      return (
        <ErrorBoundary key="simple-home">
          <SimpleHome tools={navItems} onSelectTool={handleNavClick} />
        </ErrorBoundary>
      );
    }
    const ToolComponent = route.component;
    const componentProps = route.id === 'tool-home'
      ? {
        tools: filteredModeNavItems,
        onSelectTool: handleNavClick,
        activeTab: selectedHomeTab,
        modeId: modeProfile.id,
        onSelectMode: handleModeChange,
      }
      : route.componentProps;
    return (
      <ErrorBoundary key={activeTool}>
        <Suspense fallback={<div className="flex flex-col items-center justify-center p-12 gap-3"><Spinner /><span className="text-xs text-text-muted">{t('common:states.loadingTool')}</span></div>}>
          <ToolComponent {...componentProps} key={activeTool} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  const activeTitle = activeTool === 'tool-home' && modeProfile.id !== 'all'
    ? modeProfile.label
    : (() => {
      const route = getToolRoute(activeTool);
      return route ? localizeToolRoute(route, t).title : '';
    })();

  // --banner-height is 0px by default, 36px when SHOW_CHANNEL_ALERT is true
  // We must use inline styles for calc() expressions using this CSS variable
  const bannerHeightStyle = { marginTop: 'var(--banner-height)' };
  const sidebarHeightStyle = {
    height: 'calc(100vh - var(--banner-height))',
    top: 'var(--banner-height)',
  };
  const mainContentHeightStyle = { height: 'calc(100vh - var(--banner-height))' };

  // Nav item — shared classes
  const navItemBase =
    'flex items-center gap-[9px] py-[7px] px-[10px] border-none bg-transparent rounded-sm text-text-sidebar-muted cursor-pointer text-left transition-[background,color] duration-150 ease-linear font-medium text-[0.84rem] font-sans w-full [&_svg]:w-[15px] [&_svg]:h-[15px] [&_svg]:flex-shrink-0 [&_svg]:opacity-70';
  const navItemActive =
    'bg-nav-active-bg text-nav-active-text font-semibold border border-[rgba(16,185,129,0.25)] shadow-[0_0_10px_rgba(16,185,129,0.08)] [&_svg]:opacity-100 [&_svg]:text-nav-active-text';
  const navItemHover =
    'hover:bg-nav-hover-bg hover:text-text-sidebar [&:hover_svg]:opacity-100';

  return (
    <div className={SHOW_CHANNEL_ALERT ? 'has-banner' : ''}>
      {/* Warning Banner */}
      {SHOW_CHANNEL_ALERT && (
        <div
          id="channel-alert-banner"
          className="fixed top-0 left-0 right-0 h-9 bg-warning-bg border-b border-warning-border text-warning-text flex items-center justify-center gap-2 text-[0.82rem] font-semibold z-[9999] px-4 box-border"
        >
          <svg
            className="flex-shrink-0"
            viewBox="0 0 24 24" width="16" height="16"
            stroke="currentColor" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {/* Desktop text */}
          <span className="hidden sm:inline">
            {t('navigation:banner.desktop', { channel: APP_CHANNEL, version: APP_VERSION })}
          </span>
          {/* Mobile text */}
          <span className="sm:hidden">
            {t('navigation:banner.mobile', { channel: APP_CHANNEL, version: APP_VERSION })}
          </span>
        </div>
      )}

      {/* App layout: flex row, offset below banner */}
      <div
        className={`flex overflow-x-hidden ${isSidebarCollapsed ? 'collapsed-sidebar' : ''}`}
        style={{ ...bannerHeightStyle, minHeight: 'calc(100vh - var(--banner-height))' }}
      >

        {/* Mobile Header — hidden on desktop (md+) */}
        <header
          id="mobile-header"
          className="hidden max-md:flex bg-sidebar border-b border-border-sidebar px-5 py-3 items-center gap-4 fixed left-0 right-0 z-[90] h-[60px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          style={{ top: 'var(--banner-height)' }}
        >
          <button
            id="sidebar-toggle"
            className="bg-transparent border-none text-text-main cursor-pointer p-1 flex items-center justify-center rounded-sm transition-colors duration-200 hover:bg-accent-light hover:text-accent"
            aria-label={t('navigation:sidebar.toggle')}
            onClick={() => setMobileSidebarOpen(prev => !prev)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span className="min-w-0 flex-1 truncate font-['TASA_Orbiter',sans-serif] font-bold text-[1.15rem] text-accent">Small Web Tools</span>
          <LanguageSwitcher variant="mobile" />
          <button
            type="button"
            onClick={() => (
              modeProfile.simplified
                ? handleAllToolsHomeClick()
                : handleModeChange('simple')
            )}
            className="shrink-0 rounded-lg border border-border bg-app px-2.5 py-1.5 text-xs font-bold text-text-main transition hover:border-accent hover:bg-accent-light hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {t(modeProfile.simplified ? 'navigation:exitSimpleMode' : 'navigation:simpleMode')}
          </button>
        </header>

        {/* Sidebar — hidden on desktop (md+), slide-in on mobile */}
        <aside
          id="sidebar"
          className={`
            w-[260px] flex-shrink-0 bg-sidebar border-r border-border-sidebar flex flex-col
            shadow-sidebar z-[100]
            transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            md:hidden
            max-md:fixed max-md:bottom-0
            ${mobileSidebarOpen ? 'max-md:left-0 max-md:shadow-[10px_0_30px_rgba(0,0,0,0.15)]' : 'max-md:-left-[280px]'}
          `}
          style={sidebarHeightStyle}
        >
          {/* Sidebar Brand */}
          <div className={`px-[18px] py-4 flex items-center justify-between border-b border-border-sidebar gap-3 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarCollapsed ? 'md:flex-col md:justify-center md:px-0 md:py-4 md:gap-[10px]' : ''}`}>
            <button
              type="button"
              className={`flex items-center gap-[10px] cursor-pointer bg-transparent border-none p-0 text-left ${isSidebarCollapsed ? 'md:justify-center' : ''}`}
              id="brand-logo-btn"
              title={t('navigation:goHome')}
              aria-label={t('navigation:goHome')}
              onClick={() => {
                handleAllToolsHomeClick();
              }}
            >
              {/* Brand Icon Box */}
              <div className="bg-accent-gradient text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_4px_10px_rgba(99,102,241,0.15)] flex-shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:[stroke-width:2.2]">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              {/* Brand Text — hidden when collapsed on desktop */}
              <span className={`font-display text-[0.95rem] font-extrabold tracking-[-0.02em] text-text-sidebar ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Small Web Tools</span>
            </button>

            {/* Collapse button — hidden on mobile */}
            <button
              id="sidebar-collapse-btn"
              className={`
                hidden md:flex bg-transparent border-none text-text-sidebar-muted cursor-pointer
                w-[30px] h-[30px] rounded-sm items-center justify-center
                transition-all duration-200
                hover:bg-nav-hover-bg hover:text-text-sidebar
                ${isSidebarCollapsed ? 'md:bg-accent md:text-white md:rotate-180 hover:md:bg-accent-hover hover:md:text-white hover:md:scale-105' : ''}
              `}
              aria-label={t('navigation:sidebar.collapse')}
              onClick={toggleSidebarCollapse}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          </div>

          {/* Sidebar Search — hidden when collapsed on desktop */}
          <div className={`px-4 pt-[10px] pb-[6px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
            <div className="relative flex items-center">
              <svg className="absolute left-[10px] text-text-muted pointer-events-none" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                id="tool-search"
                className="w-full !py-2 !pl-8 !pr-3 text-[0.83rem] rounded-[7px] bg-[var(--bg-search-sidebar)] border border-border-sidebar text-text-sidebar outline-none transition-all duration-200 placeholder:text-text-sidebar-muted focus:border-accent focus:shadow-[0_0_0_2px_var(--focus-ring)]"
                placeholder={t('navigation:search.placeholder')}
                aria-label={t('navigation:search.label')}
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Sidebar Nav */}
          <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--scrollbar-thumb)] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            {searchQuery.trim() !== '' ? (
              filteredModeNavItems.map(item => (
                <button
                  key={item.id}
                  className={`${navItemBase} ${navItemHover} ${activeTool === item.id ? navItemActive : ''} ${isSidebarCollapsed ? 'md:justify-center md:px-0 md:py-2' : ''}`}
                  data-tool={item.id}
                  data-tooltip={item.tooltip}
                  onClick={() => handleNavClick(item.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, item)}
                  onMouseLeave={handleMouseLeave}
                >
                  {item.icon}
                  <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{item.name}</span>
                </button>
              ))
            ) : (
              categoriesLocalized.map(cat => {
                const catItems = filteredModeNavItems.filter(item => item.category === cat.id);
                if (catItems.length === 0) return null;

                if (cat.id === 'utilities') {
                  const subGroups = {};
                  catItems.forEach(item => {
                    const sg = item.subGroup || 'Utilities';
                    if (!subGroups[sg]) subGroups[sg] = [];
                    subGroups[sg].push(item);
                  });
                  const sortedSubGroupNames = Object.keys(subGroups).sort();

                  return (
                    <div key={cat.id} className={`flex flex-col gap-0.5 mb-3 last:mb-0 ${isSidebarCollapsed ? 'md:mb-2 md:relative md:after:content-[""] md:after:block md:after:w-6 md:after:h-px md:after:bg-border-sidebar md:after:mx-auto md:after:mt-2 md:after:opacity-50 md:last:after:hidden' : ''}`} data-category={cat.id}>
                      {/* Category Header — hidden when collapsed on desktop */}
                      <div className={`flex items-center gap-[10px] px-3 pt-[10px] pb-[6px] text-text-sidebar-muted font-display select-none ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                        <span className="inline-flex items-center justify-center w-[15px] h-[15px] text-text-sidebar-muted opacity-80 [&_svg]:w-full [&_svg]:h-full">
                          {cat.icon}
                        </span>
                        <span className="text-[0.82rem] font-semibold text-text-sidebar-muted flex-1 capitalize tracking-normal">{cat.name}</span>
                        <svg className="w-3 h-3 text-text-sidebar-muted opacity-60" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                      {sortedSubGroupNames.map(sgName => (
                        <div key={sgName} className={`flex flex-col gap-0.5 mt-1 ${isSidebarCollapsed ? 'md:mt-0' : ''}`}>
                          {/* Subcategory header — hidden when collapsed on desktop */}
                          <div className={`px-3 py-[2px] flex items-center select-none ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                            <span className="text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-sidebar-muted opacity-55">
                              {sgName}
                            </span>
                          </div>
                          {sortLocalizedTools(subGroups[sgName], i18n.resolvedLanguage).map(item => (
                            <button
                              key={item.id}
                              className={`${navItemBase} ${navItemHover} pl-5 ${activeTool === item.id ? navItemActive : ''} ${isSidebarCollapsed ? 'md:justify-center md:pl-0 md:px-0 md:py-2' : ''}`}
                              data-tool={item.id}
                              data-tooltip={item.tooltip}
                              onClick={() => handleNavClick(item.id)}
                              onMouseEnter={(e) => handleMouseEnter(e, item)}
                              onMouseLeave={handleMouseLeave}
                            >
                              {item.icon}
                              <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{item.name}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div key={cat.id} className={`flex flex-col gap-0.5 mb-3 last:mb-0 ${isSidebarCollapsed ? 'md:mb-2 md:relative md:after:content-[""] md:after:block md:after:w-6 md:after:h-px md:after:bg-border-sidebar md:after:mx-auto md:after:mt-2 md:after:opacity-50 md:last:after:hidden' : ''}`} data-category={cat.id}>
                    {/* Category Header — hidden when collapsed on desktop */}
                    <div className={`flex items-center gap-[10px] px-3 pt-[10px] pb-[6px] text-text-sidebar-muted font-display select-none ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                      <span className="inline-flex items-center justify-center w-[15px] h-[15px] text-text-sidebar-muted opacity-80 [&_svg]:w-full [&_svg]:h-full">
                        {cat.icon}
                      </span>
                      <span className="text-[0.82rem] font-semibold text-text-sidebar-muted flex-1 capitalize tracking-normal">{cat.name}</span>
                      <svg className="w-3 h-3 text-text-sidebar-muted opacity-60" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    {catItems.map(item => (
                      <button
                        key={item.id}
                        className={`${navItemBase} ${navItemHover} ${activeTool === item.id ? navItemActive : ''} ${isSidebarCollapsed ? 'md:justify-center md:px-0 md:py-2' : ''}`}
                        data-tool={item.id}
                        data-tooltip={item.tooltip}
                        onClick={() => handleNavClick(item.id)}
                        onMouseEnter={(e) => handleMouseEnter(e, item)}
                        onMouseLeave={handleMouseLeave}
                      >
                        {item.icon}
                        <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{item.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className={`px-[14px] py-3 border-t border-border-sidebar flex flex-col gap-[10px] transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarCollapsed ? 'md:px-0 md:items-center' : ''}`}>
            <div className={`flex items-center justify-between ${isSidebarCollapsed ? 'md:justify-center md:w-full' : ''}`}>
              {/* Theme label — hidden when collapsed on desktop */}
              <span className={`text-[0.82rem] font-medium text-text-sidebar-muted ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{t('navigation:theme')}</span>
              <button
                id="theme-toggle"
                className="bg-[var(--bg-search-sidebar)] border border-border-sidebar text-text-sidebar-muted cursor-pointer w-[34px] h-[34px] rounded flex items-center justify-center transition-all duration-200 hover:bg-nav-hover-bg hover:text-text-sidebar"
                aria-label={t('navigation:toggleTheme')}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Sidebar Overlay for mobile */}
        <div
          id="sidebar-overlay"
          className={`fixed top-0 left-0 right-0 bottom-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-[4px] z-[95] transition-opacity duration-300 ${mobileSidebarOpen ? 'block opacity-100' : 'hidden opacity-0'}`}
          style={{ top: 'var(--banner-height)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 p-0 flex flex-col overflow-x-hidden ${staticTools.has(activeTool) ? 'overflow-y-auto md:overflow-y-hidden' : 'overflow-y-auto'}`}
          style={mainContentHeightStyle}
        >
          {/* Desktop Top Header — hidden on mobile (max-md) */}
          <header className="hidden min-w-0 border-b border-border bg-header px-4 py-[6px] md:flex md:items-center md:justify-between md:min-h-[48px] md:px-8 xl:px-12 backdrop-blur-[10px] z-[1000] transition-all duration-300">
            {/* Left: Brand */}
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                id="desktop-brand-logo"
                className="flex items-center gap-[10px] cursor-pointer text-accent transition-opacity duration-200 hover:opacity-85 bg-transparent border-none p-0"
                title={t('navigation:goHome')}
                aria-label={t('navigation:goHome')}
                onClick={handleAllToolsHomeClick}
              >
                <div className="bg-accent-gradient text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_4px_10px_rgba(99,102,241,0.15)] flex-shrink-0 [&_svg]:w-[18px] [&_svg]:[stroke-width:2.2]">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span className="hidden font-['TASA_Orbiter',sans-serif] text-[0.95rem] font-bold tracking-[-0.02em] text-accent xl:inline">Small Web Tools</span>
              </button>
            </div>

            {/* Center: category navigation */}
            <nav className={`${modeProfile.simplified ? 'hidden' : 'flex'} min-w-0 items-center gap-0 min-[1380px]:gap-2`}>
              {categoriesLocalized.map(cat => {
                const catItems = navItems.filter(item => item.category === cat.id);
                if (catItems.length === 0) return null;
                const isOpen = openDropdown === cat.id;
                return (
                  <div
                    key={cat.id}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(cat.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      aria-label={cat.name}
                      aria-expanded={isOpen}
                      aria-haspopup="menu"
                      className={`flex items-center gap-1.5 rounded border-none bg-transparent px-1.5 py-[6px] text-[0.82rem] font-medium text-text-muted transition-all duration-200 hover:bg-accent-light hover:text-accent min-[1380px]:gap-2 min-[1380px]:px-3 ${isOpen ? 'bg-accent-light text-accent' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavClick('tool-home');
                        setSelectedHomeTab(cat.id);
                        setOpenDropdown(null);
                      }}
                    >
                      <span className="inline-flex items-center justify-center w-4 h-4 [&_svg]:w-full [&_svg]:h-full">
                        {cat.icon}
                      </span>
                      <span className="hidden font-display font-semibold min-[1380px]:inline">{cat.name}</span>
                      <span className={`inline-flex items-center justify-center ml-0.5 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-text-muted [&_svg]:w-[10px] [&_svg]:h-[10px] ${isOpen ? 'rotate-180 text-accent' : ''}`}>
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </button>

                    <div
                      className={`absolute top-full left-0 bg-[var(--bg-card-solid,var(--bg-card))] border border-border rounded-lg p-2 min-w-[200px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] z-[1100] flex flex-col gap-1 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'opacity-100 visible translate-y-1' : 'opacity-0 invisible translate-y-[10px]'}`}
                    >
                      {cat.id === 'utilities' ? (
                        (() => {
                          const subGroups = {};
                          catItems.forEach(item => {
                            const sg = item.subGroup || 'Utilities';
                            if (!subGroups[sg]) subGroups[sg] = [];
                            subGroups[sg].push(item);
                          });
                          const sortedSubGroupNames = Object.keys(subGroups).sort();
                          return sortedSubGroupNames.map(sgName => (
                            <div key={sgName} className="flex flex-col gap-0.5 border-b border-border pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
                              <div className="px-3 py-[2px] pt-1 text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-muted opacity-50">
                                {sgName}
                              </div>
                              {subGroups[sgName].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                                <button
                                  key={item.id}
                                  className={`flex items-center gap-[10px] w-full pl-[18px] pr-3 py-2 bg-transparent border-none rounded-sm text-[0.82rem] font-medium text-text-muted cursor-pointer transition-all duration-150 text-left font-sans whitespace-nowrap [&_.item-icon]:inline-flex [&_.item-icon]:items-center [&_.item-icon]:justify-center [&_.item-icon]:w-[14px] [&_.item-icon]:h-[14px] [&_.item-icon_svg]:w-full [&_.item-icon_svg]:h-full hover:bg-accent-light hover:text-accent ${activeTool === item.id ? 'bg-accent-light text-accent' : ''}`}
                                  onClick={() => {
                                    handleNavClick(item.id);
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <span className="item-icon">{item.icon}</span>
                                  <span className="font-medium">{item.name}</span>
                                </button>
                              ))}
                            </div>
                          ));
                        })()
                      ) : (
                        catItems.map(item => (
                          <button
                            key={item.id}
                            className={`flex items-center gap-[10px] w-full px-3 py-2 bg-transparent border-none rounded-sm text-[0.82rem] font-medium text-text-muted cursor-pointer transition-all duration-150 text-left font-sans whitespace-nowrap [&_.item-icon]:inline-flex [&_.item-icon]:items-center [&_.item-icon]:justify-center [&_.item-icon]:w-[14px] [&_.item-icon]:h-[14px] [&_.item-icon_svg]:w-full [&_.item-icon_svg]:h-full hover:bg-accent-light hover:text-accent ${activeTool === item.id ? 'bg-accent-light text-accent' : ''}`}
                            onClick={() => {
                              handleNavClick(item.id);
                              setOpenDropdown(null);
                            }}
                          >
                            <span className="item-icon">{item.icon}</span>
                            <span className="font-medium">{item.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Right: Search + Language + Theme */}
            <div className="flex shrink-0 items-center gap-2 xl:gap-4">
              <button
                type="button"
                onClick={() => (
                  modeProfile.simplified
                    ? handleAllToolsHomeClick()
                    : handleModeChange('simple')
                )}
                className="flex h-8 shrink-0 items-center rounded border border-border bg-app px-2.5 text-xs font-bold text-text-main transition hover:border-accent hover:bg-accent-light hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus xl:px-3"
              >
                <span>{t(modeProfile.simplified ? 'navigation:exitSimpleMode' : 'navigation:simpleMode')}</span>
              </button>
              {/* Header Search */}
              <div
                ref={searchRef}
                className="relative hidden w-[180px] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:w-[240px] lg:block"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex items-center">
                  <svg className="absolute left-[10px] text-text-muted pointer-events-none" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    className="header-search-input w-full !h-8 !pl-8 !pr-8 !py-0 border border-border rounded bg-[var(--bg-search-sidebar)] text-text-main text-[0.8rem] outline-none font-sans transition-all duration-200 focus:border-accent focus:bg-card focus:shadow-[0_0_0_2px_var(--focus-ring)]"
                    placeholder={t('navigation:search.placeholder')}
                    aria-label={t('navigation:search.label')}
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                  />
                  {/* Keyboard badge */}
                  <kbd className="absolute right-[10px] top-1/2 -translate-y-1/2 bg-[rgba(255,255,255,0.05)] border border-border text-text-muted rounded-[4px] px-[5px] py-[1px] text-[0.65rem] font-sans font-semibold pointer-events-none transition-opacity duration-150 [.header-search-input:focus~&]:opacity-0 html:not([data-theme='dark'])_&:bg-white">
                    /
                  </kbd>
                </div>
                {searchQuery.trim() !== '' && isSearchFocused && (
                  <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-md w-[280px] max-h-[300px] overflow-y-auto shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] p-[6px] z-[1200] flex flex-col gap-0.5">
                    {filteredSearchNavItems.length > 0 ? (
                      filteredSearchNavItems.map(item => (
                        <button
                          key={item.id}
                          className="flex items-center gap-[10px] w-full px-3 py-2 bg-transparent border-none rounded-sm text-[0.82rem] text-text-main cursor-pointer text-left font-sans transition-colors duration-150 hover:bg-accent-light hover:text-accent [&_.item-icon]:inline-flex [&_.item-icon]:items-center [&_.item-icon]:justify-center [&_.item-icon]:w-[14px] [&_.item-icon]:h-[14px] [&_.item-icon]:text-text-muted [&_.item-icon_svg]:w-full [&_.item-icon_svg]:h-full hover:[&_.item-icon]:text-accent"
                          onClick={() => {
                            handleNavClick(item.id);
                            setSearchQuery('');
                          }}
                        >
                          <span className="item-icon">{item.icon}</span>
                          <span>{item.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-[0.8rem] text-text-muted">{t('navigation:search.noResults')}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Language Selector */}
              {!modeProfile.simplified && (
                <LanguageSwitcher
                  variant="desktop"
                  onOpen={() => setOpenDropdown(null)}
                />
              )}

              {/* Theme Toggle (Desktop Header) */}
              <button
                className="bg-transparent border border-border rounded-full w-8 h-8 flex items-center justify-center text-text-muted cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent-light"
                aria-label={t('navigation:toggleTheme')}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>
            </div>
          </header>

          {/* Mobile Top Bar — shown only on mobile (max-md) */}
          <div
            id="mobile-breadcrumb"
            className="hidden max-md:flex items-center justify-between py-3 border-b border-border min-h-[52px] sticky bg-app z-10 px-4"
            style={{ top: '60px' }}
          >
            <div className="flex items-center gap-2">
              {/* Brand logo for mobile breadcrumb */}
              <button
                type="button"
                id="top-brand-logo"
                className="cursor-pointer bg-transparent border-none p-0 text-accent"
                title={t('navigation:goHome')}
                aria-label={t('navigation:goHome')}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  handleAllToolsHomeClick();
                }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </button>
              {activeTool !== 'tool-home' && (
                <>
                  <button
                    className="flex items-center gap-1 bg-transparent border-none text-text-muted cursor-pointer text-[0.82rem] font-sans px-2 py-1 rounded-sm transition-[color,background] duration-150 hover:text-accent hover:bg-accent-light"
                    onClick={() => handleNavClick('tool-home')}
                    title={t('navigation:backHome')}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    {t('navigation:home')}
                  </button>
                  <span className="text-text-muted text-[0.82rem] opacity-50">/</span>
                </>
              )}
              <span className="text-[0.9rem] font-semibold text-text-main">{activeTitle}</span>
            </div>
            <div className="flex items-center gap-[10px]"></div>
          </div>

          {/* Tool Stage */}
          <section className={`tool-stage w-full flex-1 flex flex-col items-center px-12 max-md:px-[14px] max-[500px]:px-[10px] ${staticTools.has(activeTool) ? 'tool-stage--static py-4 md:py-1.5 max-md:pt-[100px] md:max-h-[calc(100vh-var(--banner-height)-98px)] md:overflow-y-auto' : 'py-8 max-md:pt-[100px]'}`}>
            {renderActiveTool()}
          </section>

          {/* Footer */}
          <footer className="mt-auto w-full bg-footer border-t border-border">
            {/* Footer Links Grid */}
            {activeTool === 'tool-home' && modeProfile.id === 'all' && (
              <div className="grid grid-cols-6 max-[1200px]:grid-cols-4 max-md:grid-cols-3 max-[500px]:grid-cols-2 max-w-[1200px] mx-auto gap-x-4 gap-y-6 px-12 py-7 max-md:px-8 max-md:py-6 max-[500px]:px-4 max-[500px]:py-5">
                {categoriesLocalized.map(cat => {
                  const catItems = modeNavItems.filter(item => item.category === cat.id);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat.id} className="flex flex-col gap-[10px]">
                      <button
                        className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted mb-1 bg-transparent border-none cursor-pointer p-0 text-left font-sans transition-colors duration-150 hover:text-accent"
                        onClick={() => {
                          setActiveTool('tool-home');
                          setSelectedHomeTab(cat.id);
                        }}
                      >
                        {cat.name}
                      </button>
                      {cat.id === 'utilities' ? (
                        (() => {
                          const subGroups = {};
                          catItems.forEach(item => {
                            const sg = item.subGroup || 'Utilities';
                            if (!subGroups[sg]) subGroups[sg] = [];
                            subGroups[sg].push(item);
                          });
                          const sortedSubGroupNames = Object.keys(subGroups).sort();
                          return sortedSubGroupNames.map(sgName => (
                            <div key={sgName} className="flex flex-col gap-2 mt-2 mb-2 last:mb-0">
                              <span className="text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-muted opacity-50 mb-0.5">{sgName}</span>
                              {sortLocalizedTools(subGroups[sgName], i18n.resolvedLanguage).map(item => (
                                <button
                                  key={item.id}
                                  className="text-[0.83rem] text-text-muted bg-transparent border-none cursor-pointer p-0 text-left font-sans transition-colors duration-150 leading-[1.5] pl-2 hover:text-accent"
                                  onClick={() => handleNavClick(item.id)}
                                >
                                  {item.name}
                                </button>
                              ))}
                            </div>
                          ));
                        })()
                      ) : (
                        catItems.map(item => (
                          <button
                            key={item.id}
                            className="text-[0.83rem] text-text-muted bg-transparent border-none cursor-pointer p-0 text-left font-sans transition-colors duration-150 leading-[1.5] hover:text-accent"
                            onClick={() => handleNavClick(item.id)}
                          >
                            {item.name}
                          </button>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer Bottom Bar */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-12 py-2 text-[0.78rem] text-text-muted max-md:flex max-md:flex-col max-md:gap-2 max-md:text-center max-md:px-8 max-md:py-3 max-[500px]:px-4 max-[500px]:py-[10px]">
              {/* Left spacer */}
              <div></div>
              {/* Center: Brand & Copyright */}
              <div className="flex items-center justify-center max-md:flex-col max-md:gap-1">
                <span className="font-display font-bold text-text-main">Small Web Tools</span>
                <span className="text-text-muted mx-1 max-md:hidden">&nbsp;·&nbsp;</span>
                <span className="text-text-muted">{t('navigation:footer.tagline')} &nbsp;© Rhosiqs · {new Date().getFullYear()} · {APP_VERSION}</span>
              </div>
              {/* Right: Social Links */}
              <div className="flex gap-3 items-center ml-auto justify-end max-md:mx-auto max-md:justify-center">
                {/* Personal Website */}
                <a href="https://rhosiqs.com" target="_blank" rel="noopener noreferrer" className="bg-transparent border border-border rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-text-muted transition-all duration-150 hover:border-accent hover:text-accent" title={t('navigation:footer.website')} aria-label={t('navigation:footer.website')}>
                  <svg className="pointer-events-none" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </a>
                {/* Email: copy the address and open the configured mail client */}
                <a
                  href="mailto:emailforvirtualmachine@gmail.com"
                  onClick={handleEmailClick}
                  className="bg-transparent border border-border rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-text-muted transition-all duration-150 hover:border-accent hover:text-accent"
                  title={t('navigation:footer.email')}
                  aria-label={t('navigation:footer.email')}
                >
                  <svg className="pointer-events-none" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </a>
                {/* Consent Settings Button */}
                <button
                  type="button"
                  onClick={() => setIsConsentModalOpen(true)}
                  className="bg-transparent border border-border rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-text-muted transition-all duration-150 hover:border-accent hover:text-accent"
                  title={t('navigation:footer.consent')}
                  aria-label={t('navigation:footer.consent')}
                >
                  <svg className="pointer-events-none" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('privacy')}
                  className="bg-transparent border border-border rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-text-muted transition-all duration-150 hover:border-accent hover:text-accent"
                  title={t('navigation:footer.privacy')}
                  aria-label={t('tools:privacy.title')}
                >
                  <svg className="pointer-events-none" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </button>
                {/* GitHub */}
                <a href="https://github.com/hhter2/small-web-tools" target="_blank" rel="noopener noreferrer" className="bg-transparent border border-border rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-text-muted transition-all duration-150 hover:border-accent hover:text-accent" title="GitHub" aria-label="GitHub">
                  <svg className="pointer-events-none" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48 1 .11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.01 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
              </div>
            </div>
          </footer>
        </main>

        {/* Third Party Consent Manager Modal */}
        <ThirdPartyConsentModal
          isOpen={isConsentModalOpen}
          onClose={() => setIsConsentModalOpen(false)}
          onOpenPrivacy={() => {
            setIsConsentModalOpen(false);
            handleNavClick('privacy');
          }}
        />

        {/* Collapsed Sidebar Hover Tooltip */}
        {tooltipState.visible && (
          <div
            className="fixed bg-card text-text-main px-3 py-[6px] rounded text-[0.8rem] font-semibold whitespace-nowrap border border-border shadow-card opacity-100 pointer-events-none -translate-y-1/2 z-[1000] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ top: `${tooltipState.top}px`, left: `${tooltipState.left}px` }}
          >
            {tooltipState.text}
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-[var(--bg-card-solid,var(--bg-card))] border border-border px-4 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-2 text-text-main text-[0.85rem] font-medium animate-fade-in">
            <svg className="text-[#10b981] w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
