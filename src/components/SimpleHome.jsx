import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SIMPLE_WORKSPACE } from '../toolModes.js';

export default function SimpleHome({ tools = [], onSelectTool }) {
  const { t, i18n } = useTranslation('navigation');
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase(i18n.resolvedLanguage);
  const essentialIds = new Set(SIMPLE_WORKSPACE.toolIds);
  const essentialTools = tools.filter((tool) => essentialIds.has(tool.id));
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return tools.filter((tool) => (
      (tool.searchMetadata ?? [tool.name, tool.desc, tool.category]).some((term) =>
        term.toLocaleLowerCase(i18n.resolvedLanguage).includes(normalizedQuery))
    ));
  }, [i18n.resolvedLanguage, normalizedQuery, tools]);

  const openTool = (toolId) => {
    setQuery('');
    onSelectTool(toolId);
  };

  return (
    <div id="simple-home" className="mx-auto w-full max-w-[980px]">
      <header className="mx-auto mb-8 max-w-[720px] text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">{t('simpleHome.eyebrow')}</p>
        <h1 className="text-3xl font-bold tracking-[-0.025em] text-text-main sm:text-4xl">
          {t('simpleHome.heading')}
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          {t('simpleHome.description')}
        </p>
      </header>

      <section className="relative mx-auto mb-10 max-w-[720px]" aria-label={t('simpleHome.searchLabel')}>
        <label htmlFor="simple-tool-search" className="sr-only">{t('simpleHome.searchLabel')}</label>
        <svg
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-text-muted"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="simple-tool-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('simpleHome.searchPlaceholder')}
          autoComplete="off"
          className="h-14 w-full rounded-xl border border-border bg-card !pl-12 !pr-4 text-base text-text-main shadow-card outline-none transition focus:border-accent focus:ring-2 focus:ring-focus"
        />
        {normalizedQuery && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-border bg-[var(--bg-card-solid,var(--bg-card))] p-2 shadow-xl">
            {searchResults.length > 0 ? searchResults.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => openTool(tool.id)}
                className="flex w-full items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-sm text-text-main transition hover:bg-accent-light hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent [&_svg]:h-4 [&_svg]:w-4">
                  {tool.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{tool.name}</span>
                  <span className="block truncate text-xs text-text-muted">{tool.desc}</span>
                </span>
              </button>
            )) : (
              <p className="px-3 py-5 text-center text-sm text-text-muted">{t('simpleHome.noResults')}</p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="simple-essentials-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="simple-essentials-heading" className="text-lg font-bold text-text-main">
            {t('simpleHome.essentials')}
          </h2>
          <span className="text-xs font-semibold text-text-muted">{t('homeGrid.toolCount', { count: essentialTools.length })}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {essentialTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => openTool(tool.id)}
              className="group flex min-h-[112px] flex-col items-start rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent [&_svg]:h-[18px] [&_svg]:w-[18px]">
                {tool.icon}
              </span>
              <span className="text-sm font-bold text-text-main transition group-hover:text-accent">
                {tool.name}
              </span>
              <span className="mt-1 line-clamp-2 text-xs leading-5 text-text-muted">{tool.desc}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
