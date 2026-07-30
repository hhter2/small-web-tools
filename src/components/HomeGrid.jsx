import React, { useState } from 'react';
import BioinfoIcon from './BioinfoIcon.jsx';
import { TOOL_MODES, getToolMode } from '../toolModes.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';

const categories = [
  {
    id: 'text',
    name: 'Text',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    name: 'Developer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    )
  },
  {
    id: 'network',
    name: 'Network',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    )
  },
  {
    id: 'media',
    name: 'Media',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    )
  },
  {
    id: 'bioinfo',
    name: 'Bioinfo',
    icon: <BioinfoIcon />
  },
  {
    id: 'utilities',
    name: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="2" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M16.24 7.76l-8.48 8.48"></path>
        <path d="M7.76 7.76l8.48 8.48"></path>
      </svg>
    )
  }
];

// Theme config: border, icon bg/color, hover border, hover shadow
const THEME = {
  green:  { border: 'border-[rgba(16,185,129,0.15)]',   iconBg: 'bg-[rgba(16,185,129,0.08)] text-[#10b981]',   hover: 'hover:border-[#10b981] hover:shadow-[0_12px_30px_-10px_rgba(16,185,129,0.2),0_0_1px_1px_rgba(16,185,129,0.1)]' },
  blue:   { border: 'border-[rgba(59,130,246,0.15)]',   iconBg: 'bg-[rgba(59,130,246,0.08)] text-[#3b82f6]',   hover: 'hover:border-[#3b82f6] hover:shadow-[0_12px_30px_-10px_rgba(59,130,246,0.2),0_0_1px_1px_rgba(59,130,246,0.1)]' },
  purple: { border: 'border-[rgba(139,92,246,0.15)]',   iconBg: 'bg-[rgba(139,92,246,0.08)] text-[#8b5cf6]',   hover: 'hover:border-[#8b5cf6] hover:shadow-[0_12px_30px_-10px_rgba(139,92,246,0.2),0_0_1px_1px_rgba(139,92,246,0.1)]' },
  pink:   { border: 'border-[rgba(236,72,153,0.15)]',   iconBg: 'bg-[rgba(236,72,153,0.08)] text-[#ec4899]',   hover: 'hover:border-[#ec4899] hover:shadow-[0_12px_30px_-10px_rgba(236,72,153,0.2),0_0_1px_1px_rgba(236,72,153,0.1)]' },
  gold:   { border: 'border-[rgba(245,158,11,0.15)]',   iconBg: 'bg-[rgba(245,158,11,0.08)] text-[#f59e0b]',   hover: 'hover:border-[#f59e0b] hover:shadow-[0_12px_30px_-10px_rgba(245,158,11,0.2),0_0_1px_1px_rgba(245,158,11,0.1)]' },
  teal:   { border: 'border-[rgba(20,184,166,0.15)]',   iconBg: 'bg-[rgba(20,184,166,0.08)] text-[#14b8a6]',   hover: 'hover:border-[#14b8a6] hover:shadow-[0_12px_30px_-10px_rgba(20,184,166,0.2),0_0_1px_1px_rgba(20,184,166,0.1)]' },
};

const getTheme = (category) => {
  const map = { text: 'pink', developer: 'green', network: 'blue', media: 'gold', bioinfo: 'teal', utilities: 'purple' };
  return THEME[map[category]] ?? THEME.purple;
};

function ToolCard({ tool, onSelectTool }) {
  const theme = getTheme(tool.category);
  return (
    <Card
      variant="home"
      clickable
      className={`${theme.border} ${theme.hover}`}
      onClick={() => onSelectTool(tool.id)}
    >
      <div className="flex items-start gap-4 w-full">
        <div className={`w-[46px] h-[46px] rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all duration-300 ${theme.iconBg} [&_svg]:w-5 [&_svg]:h-5 [&_svg]:flex-shrink-0`}>
          {tool.icon}
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <h3 className="text-[1.05rem] font-bold text-text-main tracking-[-0.01em] m-0">{tool.name}</h3>
          <p className="text-[0.84rem] text-text-muted leading-[1.45] m-0">{tool.desc}</p>
        </div>
      </div>
    </Card>
  );
}

export default function HomeGrid({
  tools = [],
  onSelectTool,
  activeTab = 'all',
  modeId = 'all',
  modeAddress = '',
  onSelectMode,
}) {
  const [addressStatus, setAddressStatus] = useState('');
  const mode = getToolMode(modeId);
  const isCuratedMode = mode.id !== 'all';
  const curatedTools = activeTab === 'all'
    ? tools
    : tools.filter((tool) => tool.category === activeTab);
  const activeCategory = categories.find((category) => category.id === activeTab);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(modeAddress);
      setAddressStatus('Mode address copied.');
    } catch {
      setAddressStatus('Could not copy the address. Select it and copy manually.');
    }
  };

  function renderGrid(toolList) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 mt-6">
        {toolList.map(tool => (
          <ToolCard key={tool.id} tool={tool} onSelectTool={onSelectTool} />
        ))}
      </div>
    );
  }

  function renderSubGroups(catTools) {
    const subGroups = {};
    catTools.forEach(tool => {
      const sg = tool.subGroup || 'Utilities';
      if (!subGroups[sg]) subGroups[sg] = [];
      subGroups[sg].push(tool);
    });
    const sortedSubGroupNames = Object.keys(subGroups).sort();
    return sortedSubGroupNames.map(sgName => (
      <div key={sgName} className="mt-6 mb-6">
        <h4 className="text-[0.9rem] font-bold uppercase tracking-[0.05em] text-text-muted mb-3 pl-1.5 border-l-2 border-accent leading-none">
          {sgName}
        </h4>
        {renderGrid(subGroups[sgName].sort((a, b) => a.name.localeCompare(b.name)))}
      </div>
    ));
  }

  return (
    <div id="tool-home" className="w-full max-w-[1200px] mx-auto">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-[1.85rem] font-bold text-text-main tracking-[-0.02em]">{mode.heading}</h1>
        <p className="text-[0.95rem] text-text-muted leading-[1.5]">{mode.description}</p>
      </div>

      <section className="mb-8 rounded-xl border border-border bg-card p-4 shadow-card" aria-labelledby="tool-mode-heading">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] lg:items-end">
          <div>
            <label id="tool-mode-heading" htmlFor="tool-mode" className="mb-2 block text-sm font-bold text-text-main">
              Choose your workspace
            </label>
            <select
              id="tool-mode"
              value={mode.id}
              onChange={(event) => {
                setAddressStatus('');
                onSelectMode(event.target.value);
              }}
              className="w-full rounded-lg border border-border bg-app px-3 py-2 text-sm text-text-main outline-none focus:border-accent focus:ring-2 focus:ring-focus"
            >
              {TOOL_MODES.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tool-mode-address" className="mb-2 block text-sm font-bold text-text-main">
              Shareable mode address
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                id="tool-mode-address"
                type="text"
                readOnly
                value={modeAddress}
                className="min-w-0 flex-1 rounded-lg border border-border bg-app px-3 py-2 font-mono text-xs text-text-muted"
              />
              <Button type="button" size="sm" onClick={handleCopyAddress}>Copy address</Button>
            </div>
          </div>
        </div>
        <p className="mt-2 min-h-4 text-xs text-text-muted" role="status" aria-live="polite">{addressStatus}</p>
      </section>

      {isCuratedMode ? (
        <section aria-label={`${mode.label} tools`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-text-main">
              {activeCategory
                ? `${activeCategory.name} tools`
                : mode.simplified
                  ? 'Frequently used tools'
                  : `Recommended for ${mode.label.toLowerCase()}`}
            </h2>
            <span className="rounded-full border border-border bg-app px-3 py-1 text-xs font-semibold text-text-muted">
              {curatedTools.length} {curatedTools.length === 1 ? 'tool' : 'tools'}
            </span>
          </div>
          {renderGrid(curatedTools)}
        </section>
      ) : activeTab === 'all' ? (
        categories.map(cat => {
          const catTools = tools.filter(t => t.category === cat.id);
          if (catTools.length === 0) return null;

          return (
            <div key={cat.id} className="mb-10 last:mb-0">
              <h3 className="text-[1.25rem] font-bold text-text-main mb-[18px] flex items-center gap-2 tracking-[-0.01em] [&>svg]:text-accent [&>svg]:w-[18px] [&>svg]:h-[18px]">
                {cat.icon}
                {cat.name}
              </h3>
              {cat.id === 'utilities'
                ? renderSubGroups(catTools)
                : renderGrid(catTools)
              }
            </div>
          );
        })
      ) : activeTab === 'utilities' ? (
        <div className="mb-10">
          {renderSubGroups(tools.filter(t => t.category === 'utilities'))}
        </div>
      ) : (
        <div className="mb-10">
          {(() => {
            const cat = categories.find(c => c.id === activeTab);
            return (
              <>
                {cat && (
                  <h3 className="text-[1.25rem] font-bold text-text-main mb-[18px] flex items-center gap-2 tracking-[-0.01em] [&>svg]:text-accent [&>svg]:w-[18px] [&>svg]:h-[18px]">
                    {cat.icon}
                    {cat.name}
                  </h3>
                )}
                {renderGrid(tools.filter(t => t.category === activeTab))}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
