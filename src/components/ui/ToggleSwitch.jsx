import React from 'react';

/**
 * ToggleSwitch — Phase 6 Tailwind migration.
 *
 * Parity targets in styles.css:
 *   .toggle-switch  (line 1023) — wrapper label
 *   .toggle-slider  (line 1035) — pill + knob
 *   .toggle-label   (line 1066) — text label
 *
 * Usage:
 *   <ToggleSwitch
 *     id="my-toggle"
 *     checked={value}
 *     onChange={(e) => setValue(e.target.checked)}
 *     label="Enable feature"
 *   />
 *
 * For a custom-styled label (e.g. accent color), pass labelClassName:
 *   <ToggleSwitch ... labelClassName="font-semibold text-accent" />
 */
export default function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  labelClassName = '',
  ...props
}) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {/* Hidden real checkbox */}
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />

      {/* Pill track + knob */}
      <span
        className={`
          relative inline-block w-11 h-6 rounded-full flex-shrink-0
          transition-colors duration-[250ms] ease-in-out
          ${checked ? 'bg-accent' : 'bg-border'}
        `}
        aria-hidden="true"
      >
        {/* Knob */}
        <span
          className={`
            absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white
            shadow-[0_1px_3px_rgba(0,0,0,0.15)]
            transition-transform duration-[250ms] ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </span>

      {/* Text label */}
      {label !== undefined && (
        <span className={`text-[0.9rem] text-text-main font-medium ${labelClassName}`}>
          {label}
        </span>
      )}
    </label>
  );
}
