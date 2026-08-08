function ShortcutButton({ active, item, onSelect }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-[10px] whitespace-nowrap rounded-sm border-none bg-transparent px-3 py-2 text-left font-sans text-[0.82rem] font-medium text-text-muted transition-all duration-150 hover:bg-accent-light hover:text-accent [&_.item-icon]:inline-flex [&_.item-icon]:h-[14px] [&_.item-icon]:w-[14px] [&_.item-icon]:items-center [&_.item-icon]:justify-center [&_.item-icon_svg]:h-full [&_.item-icon_svg]:w-full ${active ? 'bg-accent-light text-accent' : ''}`}
      onClick={() => onSelect(item.id)}
    >
      <span className="item-icon">{item.icon}</span>
      <span className="font-medium">{item.name}</span>
    </button>
  );
}

export default function DesktopCategoryNav({
  activeTool,
  categories,
  navItems,
  openCategory,
  simplified,
  onOpenCategory,
  onSelectCategory,
  onSelectTool,
}) {
  return (
    <nav className={`${simplified ? 'hidden' : 'flex'} min-w-0 items-center gap-0 min-[1380px]:gap-2`}>
      {categories.map((category) => {
        const categoryItems = navItems.filter((item) => item.category === category.id);
        if (categoryItems.length === 0) return null;
        const isOpen = openCategory === category.id;
        const groups = category.id === 'utilities'
          ? categoryItems.reduce((result, item) => {
            const groupName = item.subGroup || 'Utilities';
            if (!result[groupName]) result[groupName] = [];
            result[groupName].push(item);
            return result;
          }, {})
          : null;
        return (
          <div
            key={category.id}
            className="relative"
            onMouseEnter={() => onOpenCategory(category.id)}
            onMouseLeave={() => onOpenCategory(null)}
          >
            <button
              type="button"
              aria-label={category.name}
              className={`flex items-center gap-1.5 rounded border-none bg-transparent px-1.5 py-[6px] text-[0.82rem] font-medium text-text-muted transition-all duration-200 hover:bg-accent-light hover:text-accent min-[1380px]:gap-2 min-[1380px]:px-3 ${isOpen ? 'bg-accent-light text-accent' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectCategory(category.id);
              }}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center [&_svg]:h-full [&_svg]:w-full">{category.icon}</span>
              <span className="hidden font-display font-semibold min-[1380px]:inline">{category.name}</span>
              <span className={`ml-0.5 inline-flex items-center justify-center text-text-muted transition-transform duration-[250ms] [&_svg]:h-[10px] [&_svg]:w-[10px] ${isOpen ? 'rotate-180 text-accent' : ''}`}>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {/* Redundant pointer convenience; every destination also exists in sidebar/search navigation. */}
            {isOpen && (
              <div className="absolute left-0 top-full z-[1100] flex min-w-[200px] translate-y-1 flex-col gap-1 rounded-lg border border-border bg-[var(--bg-card-solid,var(--bg-card))] p-2 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                {groups ? Object.keys(groups).sort().map((groupName) => (
                  <div key={groupName} className="mb-1 flex flex-col gap-0.5 border-b border-border pb-1 last:mb-0 last:border-b-0 last:pb-0">
                    <div className="px-3 pb-[2px] pt-1 text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-muted opacity-50">{groupName}</div>
                    {[...groups[groupName]]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((item) => (
                        <ShortcutButton key={item.id} active={activeTool === item.id} item={item} onSelect={onSelectTool} />
                      ))}
                  </div>
                )) : categoryItems.map((item) => (
                  <ShortcutButton key={item.id} active={activeTool === item.id} item={item} onSelect={onSelectTool} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
