import React from 'react';

export default function MediaSeparatorFormatSelect({ label, value, options, onChange, disabled }) {
  return (
    <label className="media-separator-format-select">
      <span className="media-separator-format-select__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
