import React from 'react';
import { useTranslation } from 'react-i18next';

export default function MediaSeparatorFormatSelect({ label, value, options, onChange, disabled }) {
  const { t } = useTranslation('tools');
  return (
    <div className="flex flex-col gap-1.5 text-[0.85rem] flex-1 min-w-[150px]">
      <span className="font-semibold text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full p-2 rounded-md border border-border bg-card text-text-main text-[0.85rem] outline-none transition-colors duration-200 cursor-pointer hover:border-border-hover focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(`tool-mediasplit.ui.format.${opt.value}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
