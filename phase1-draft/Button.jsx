import React from 'react';

/**
 * DRAFT — parity targets in current styles.css:
 *   variant="primary"   -> `.btn-primary` (line 755). Note: its box-shadow is
 *                          hardcoded as `rgba(99, 102, 241, 0.2)` — that's Tailwind's
 *                          indigo-500, left over from before --accent was switched to
 *                          emerald (#10b981). This draft uses `shadow-accent-glow`
 *                          (new token, keyed to --accent instead) to fix that drift.
 *                          FLAGGING for approval since it's a visible color change,
 *                          not just a mechanical port.
 *
 *   variant="secondary" -> `.btn-secondary` (RESOLVED: this was defined TWICE in
 *                          styles.css — line 1116 padding 12px/24px, radius 10px,
 *                          font-size 0.95rem / line 1508 padding 7px/14px, radius 8px,
 *                          font-size 0.82rem, plus an `.active` state. Same selector +
 *                          specificity, so 1508 won the cascade and is what's actually
 *                          rendering today — confirmed as the intended version. This
 *                          draft matches it. The agent must delete the dead block at
 *                          line ~1116-1127 from styles.css as part of implementing
 *                          this component.)
 *
 *   variant="danger"    -> `.btn-danger-custom` (line 2449) / `.btn-danger-confirm`
 *                          (2691) — these two were NOT compared in this draft pass;
 *                          flagging as a follow-up parity check for the agent.
 */

const base =
  'inline-flex items-center justify-center gap-1.5 rounded font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

const variants = {
  primary:
    'bg-accent-gradient text-white px-5 py-2.5 text-[0.88rem] shadow-[0_4px_10px_var(--accent-light)] hover:-translate-y-px hover:shadow-[0_6px_14px_var(--accent-light)] active:translate-y-0',
  secondary:
    'bg-app border border-border text-text-muted px-3.5 py-[7px] text-[0.82rem] hover:bg-nav-hover-bg hover:border-accent hover:text-accent aria-pressed:bg-nav-active-bg aria-pressed:border-accent aria-pressed:text-nav-active-text',
  danger:
    'bg-app border border-border text-text-muted px-3.5 py-[7px] text-[0.82rem] hover:bg-red-50 hover:border-red-400 hover:text-red-600', // placeholder — needs parity check, see note above
};

const sizes = {
  default: '',
  sm: 'text-xs px-3 py-1.5',
};

export default function Button({
  variant = 'secondary',
  size = 'default',
  active = false, // maps the old `.btn-secondary.active` state
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      className={[base, variants[variant], sizes[size], className].filter(Boolean).join(' ')}
      aria-pressed={active || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
