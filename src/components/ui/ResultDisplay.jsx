import React from 'react';

/**
 * ResultDisplay — Phase 6 Tailwind migration.
 *
 * Parity targets in styles.css:
 *   .result-box    (line 744) — light-accent background card wrapper
 *   .result-label  (line 755) — tiny uppercase muted label
 *   .result-val    (line 763) — large accent-colored numeric value
 *
 * Usage:
 *   <ResultDisplay label="Total" value="$1,234.56" />
 *
 *   // Custom value styling (e.g. smaller size or extra color override):
 *   <ResultDisplay label="IP Address" value="192.168.1.1" valueClassName="text-xl font-bold" />
 *
 *   // Forward extra className to wrapper:
 *   <ResultDisplay label="Lines" value={42} className="flex-1" />
 */
export default function ResultDisplay({
  label,
  value,
  className = '',
  valueClassName = '',
  ...props
}) {
  return (
    <div
      className={`bg-accent-light border border-[rgba(79,70,229,0.1)] rounded-xl px-5 py-4 flex flex-col gap-[6px] transition-all duration-300 ${className}`}
      {...props}
    >
      {label !== undefined && (
        <span className="text-[0.75rem] font-bold text-text-muted uppercase tracking-[0.05em]">
          {label}
        </span>
      )}
      <span className={`text-[1.75rem] font-extrabold text-accent font-['TASA_Orbiter',sans-serif] ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}
