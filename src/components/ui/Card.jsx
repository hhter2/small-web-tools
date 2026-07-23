import React from 'react';

/**
 * Shared Card primitive — Phase 1 Tailwind migration.
 *
 * Parity targets in current styles.css:
 *   variant="tool"  -> replaces `.tool-card` (line 599) + `.tool-card--compact` (619)
 *                      + `.tool-card--wide` (624). Note: current CSS renders these
 *                      as <article className="tool-card ... active">; the `active`
 *                      class (display:none -> flex + fadeInScale animation) was used
 *                      for a show/hide-by-CSS routing scheme. Whether that animation
 *                      is still wanted per-mount is an OPEN QUESTION for the plan step
 *                      — this draft keeps it as an optional `animateIn` prop so behavior
 *                      is preserved by default but can be dropped.
 *   variant="home"  -> replaces `.home-card` (line 3254), including the hover
 *                      transition. `clickable` maps the `cursor: pointer` from the
 *                      original.
 *
 * Both variants read spacing/radius from Tailwind's extended scale (see
 * tailwind.config.js) and color from the existing CSS variables via the
 * `card`, `border`, `shadow-card` theme tokens — so light/dark mode requires
 * no extra work here.
 */

const base = 'bg-card border transition-all';

const variants = {
  tool: {
    default: 'tool-card border-border rounded-xl p-6 flex flex-col gap-4 w-full max-w-[680px] shadow-card',
    compact: 'tool-card border-border rounded-xl p-6 flex flex-col gap-4 w-full max-w-[520px] shadow-card',
    wide: 'tool-card border-border rounded-xl p-6 flex flex-col gap-4 w-full shadow-card',
  },
  home: {
    default:
      'rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-card duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
  },
};

const Card = React.forwardRef(function Card({
  variant = 'tool',
  size = 'default', // for variant="tool": 'default' | 'compact' | 'wide'
  clickable = false, // for variant="home": adds cursor-pointer + hover lift
  animateIn = true, // for variant="tool": reproduce the fadeInScale mount animation
  className = '',
  children,
  ...rest
}, ref) {
  const variantClasses = variants[variant]?.[size] ?? variants[variant]?.default ?? '';
  const clickableClasses = clickable
    ? `cursor-pointer hover:-translate-y-0.5 ${variant === 'tool' ? 'hover:border-border-hover' : ''}`
    : '';
  const animationClasses = variant === 'tool' && animateIn ? 'animate-[fadeInScale_0.3s_cubic-bezier(0.34,1.56,0.64,1)]' : '';

  return (
    <article
      ref={ref}
      className={[base, variantClasses, clickableClasses, animationClasses, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </article>
  );
});

export default Card;
