import { sortLocalizedTools } from '../toolRegistry.js';

const iconButtonClass = 'flex h-7 w-7 items-center justify-center rounded-full border border-border bg-transparent text-text-muted transition-all duration-150 hover:border-accent hover:text-accent';

export default function AppFooter({
  activeTool,
  appVersion,
  categories,
  language,
  modeId,
  navItems,
  t,
  onEmailClick,
  onOpenConsent,
  onOpenPrivacy,
  onSelectCategory,
  onSelectTool,
}) {
  return (
    <footer className="mt-auto w-full border-t border-border bg-footer">
      {activeTool === 'tool-home' && modeId === 'all' && (
        <div className="mx-auto grid max-w-[1200px] grid-cols-6 gap-x-4 gap-y-6 px-12 py-7 max-[1200px]:grid-cols-4 max-md:grid-cols-3 max-md:px-8 max-md:py-6 max-[500px]:grid-cols-2 max-[500px]:px-4 max-[500px]:py-5">
          {categories.map((category) => {
            const categoryItems = navItems.filter((item) => item.category === category.id);
            if (categoryItems.length === 0) return null;
            const groups = categoryItems.reduce((result, item) => {
              const group = item.subGroup || 'Utilities';
              return { ...result, [group]: [...(result[group] || []), item] };
            }, {});
            return (
              <div key={category.id} className="flex flex-col gap-[10px]">
                <button type="button" className="mb-1 border-none bg-transparent p-0 text-left font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-accent" onClick={() => onSelectCategory(category.id)}>
                  {category.name}
                </button>
                {category.id === 'utilities'
                  ? Object.keys(groups).sort().flatMap((groupName) => [
                    <span key={`${groupName}-heading`} className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-muted opacity-50">{groupName}</span>,
                    ...sortLocalizedTools(groups[groupName], language).map((item) => (
                      <button type="button" key={item.id} className="border-none bg-transparent p-0 pl-2 text-left font-sans text-[0.83rem] leading-[1.5] text-text-muted transition-colors hover:text-accent" onClick={() => onSelectTool(item.id)}>{item.name}</button>
                    )),
                  ])
                  : categoryItems.map((item) => (
                    <button type="button" key={item.id} className="border-none bg-transparent p-0 text-left font-sans text-[0.83rem] leading-[1.5] text-text-muted transition-colors hover:text-accent" onClick={() => onSelectTool(item.id)}>{item.name}</button>
                  ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-12 py-2 text-[0.78rem] text-text-muted max-md:flex max-md:flex-col max-md:gap-2 max-md:px-8 max-md:py-3 max-md:text-center max-[500px]:px-4 max-[500px]:py-[10px]">
        <div />
        <div className="flex items-center justify-center max-md:flex-col max-md:gap-1">
          <span className="font-display font-bold text-text-main">Small Web Tools</span>
          <span className="mx-1 text-text-muted max-md:hidden">&nbsp;·&nbsp;</span>
          <span>{t('navigation:footer.tagline')} &nbsp;© Rhosiqs · {new Date().getFullYear()} · {appVersion}</span>
        </div>
        <div className="ml-auto flex items-center justify-end gap-3 max-md:mx-auto max-md:justify-center">
          <a href="https://rhosiqs.com" target="_blank" rel="noopener noreferrer" className={iconButtonClass} title={t('navigation:footer.website')} aria-label={t('navigation:footer.website')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
          </a>
          <a href="mailto:emailforvirtualmachine@gmail.com" onClick={onEmailClick} className={iconButtonClass} title={t('navigation:footer.email')} aria-label={t('navigation:footer.email')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          </a>
          <button type="button" onClick={onOpenConsent} className={iconButtonClass} title={t('navigation:footer.consent')} aria-label={t('navigation:footer.consent')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
          </button>
          <button type="button" onClick={onOpenPrivacy} className={iconButtonClass} title={t('navigation:footer.privacy')} aria-label={t('tools:privacy.title')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </button>
          <a href="https://github.com/hhter2/small-web-tools" target="_blank" rel="noopener noreferrer" className={iconButtonClass} title="GitHub" aria-label="GitHub">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48 1 .11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.01 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" /></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
