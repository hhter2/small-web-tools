import React from 'react';

/**
 * DRAFT — parity target: `.tool-card h2` (line 640 in styles.css).
 *
 * RESOLVED (was previously flagged as an open question): App.jsx's
 * `toolDetails` object (lines 36–149) had a `title` + `desc` per tool, but
 * `desc` was never rendered anywhere and `title` only duplicated what
 * `navItems` (line 216+) already stores as `name`, and what each tool
 * component separately hardcodes in its own `<h2>`. Decision: delete
 * `toolDetails` entirely from App.jsx; the mobile top bar's title now reads
 * from `navItems` instead. This does NOT touch the 31 tool components —
 * each keeps hardcoding its own `<h2>` for now, unrelated to this deletion.
 *
 * `description` stays as an optional prop here for tools that want to use
 * it going forward, but there's no existing data feeding it post-deletion —
 * pass it explicitly per-tool if/when wanted, don't wire it to anything
 * that used to be `toolDetails.desc` (that data is gone).
 */

export default function ToolHeader({ title, description, className = '' }) {
  return (
    <header className={['pb-3 mb-2 border-b border-border', className].filter(Boolean).join(' ')}>
      <h2 className="text-2xl font-bold tracking-tight text-text-main m-0">{title}</h2>
      {description && (
        <p className="mt-1.5 text-sm text-text-muted">{description}</p>
      )}
    </header>
  );
}
