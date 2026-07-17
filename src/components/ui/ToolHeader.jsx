import React from 'react';

/**
 * Shared ToolHeader primitive — Phase 1 Tailwind migration.
 *
 * Parity target: `.tool-card h2` (line 640 in styles.css).
 *
 * App.jsx's `toolDetails` object was deleted in a prior cleanup; the mobile
 * top bar's title now reads from `navItems` instead. This component does NOT
 * receive data from any central store — pass `title` explicitly per-tool.
 *
 * `description` is an optional prop for tools that want to surface a subtitle
 * going forward. No existing data feeds it post-deletion — pass it explicitly
 * per-tool if/when wanted.
 */

export default function ToolHeader({ title, description, className = '' }) {
  return (
    <header className={['tool-header pb-2 border-b border-border', className].filter(Boolean).join(' ')}>
      <h2 className="text-2xl font-bold tracking-tight text-text-main m-0">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
    </header>
  );
}
