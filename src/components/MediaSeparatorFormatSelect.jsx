import React from 'react';

export default function MediaSeparatorFormatSelect({ label, value, options, onChange, disabled }) {
  return (
    <label className="mediasplit-format-select">
      <span className="mediasplit-format-select-label">{label}</span>
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
