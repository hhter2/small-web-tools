import React from 'react';

/**
 * Shared page identity for every routed tool.
 *
 * Tool pages intentionally contain only a title and the tool itself. Supporting
 * labels and instructions belong inside the feature UI, not in this header.
 */
export default function ToolHeader({ title, className = '' }) {
  return (
    <header className={['tool-header pb-2 border-b border-border', className].filter(Boolean).join(' ')}>
      <h2 className="text-2xl font-bold tracking-tight text-text-main m-0">{title}</h2>
    </header>
  );
}
