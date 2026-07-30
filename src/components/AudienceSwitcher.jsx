import React from 'react';
import { AUDIENCE_MODES } from '../toolModes.js';

const SHORT_LABELS = {
  all: 'Home',
  daily: 'Daily',
  developer: 'Developer',
  bioinformatics: 'Bioinfo',
  designer: 'Designer',
  student: 'Student',
};

export default function AudienceSwitcher({ activeModeId, onSelectMode, mobile = false }) {
  return (
    <nav
      aria-label="Choose audience"
      className={`flex min-w-0 items-center rounded-lg border border-border bg-app p-0.5 ${
        mobile ? 'w-max' : 'max-w-full'
      }`}
    >
      {AUDIENCE_MODES.map((mode) => {
        const isActive = mode.id === activeModeId;
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={isActive}
            aria-label={mode.id === 'all' ? 'Show all tools' : `Switch to ${mode.label}`}
            title={mode.id === 'all' ? 'All tools' : mode.label}
            onClick={() => onSelectMode(mode.id)}
            className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              isActive
                ? 'border-accent bg-accent text-white shadow-sm'
                : 'border-transparent bg-transparent text-text-muted hover:bg-accent-light hover:text-accent'
            }`}
          >
            {SHORT_LABELS[mode.id]}
          </button>
        );
      })}
    </nav>
  );
}
