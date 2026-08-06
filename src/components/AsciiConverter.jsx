import React from 'react';
import { useTranslation } from 'react-i18next';
import AutoDetectConverter from './ui/AutoDetectConverter';

const CONTROL_LABELS = [
  'NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL',
  'BS', 'HT', 'LF', 'VT', 'FF', 'CR', 'SO', 'SI',
  'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB',
  'CAN', 'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US',
];

const CONTROL_NAMES = [
  'Null', 'Start of Heading', 'Start of Text', 'End of Text',
  'End of Transmission', 'Enquiry', 'Acknowledge', 'Bell',
  'Backspace', 'Horizontal Tab', 'Line Feed', 'Vertical Tab',
  'Form Feed', 'Carriage Return', 'Shift Out', 'Shift In',
  'Data Link Escape', 'Device Control 1', 'Device Control 2', 'Device Control 3',
  'Device Control 4', 'Negative Acknowledge', 'Synchronous Idle', 'End of Transmission Block',
  'Cancel', 'End of Medium', 'Substitute', 'Escape',
  'File Separator', 'Group Separator', 'Record Separator', 'Unit Separator',
];

const ASCII_ENTRIES = Array.from({ length: 128 }, (_, code) => {
  if (code < 32) return { code, symbol: CONTROL_LABELS[code], name: CONTROL_NAMES[code], control: true };
  if (code === 32) return { code, symbol: 'SP', name: 'Space', control: true };
  if (code === 127) return { code, symbol: 'DEL', name: 'Delete', control: true };
  return { code, symbol: String.fromCharCode(code), name: `Character ${String.fromCharCode(code)}`, control: false };
});

function AsciiReferenceTable({ input, setInput }) {
  const { t } = useTranslation('tools');
  const selectedCode = /^\d+$/.test(input.trim()) && Number(input.trim()) <= 127
    ? Number(input.trim())
    : null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="ascii-reference-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="ascii-reference-title" className="text-sm font-bold text-text-main">{t('tool-ascii.ui.reference')}</h3>
          <p className="text-xs text-text-muted">{t('tool-ascii.ui.referenceHint')}</p>
        </div>
        <span className="text-[0.68rem] font-semibold text-text-muted">{t('tool-ascii.ui.legend')}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-app/70 p-1.5">
        <div className="grid min-w-[760px] grid-cols-[repeat(16,minmax(0,1fr))] gap-1" role="grid" aria-label={t('tool-ascii.ui.gridLabel')}>
          {ASCII_ENTRIES.map((entry) => {
            const selected = selectedCode === entry.code;
            return (
              <button
                key={entry.code}
                type="button"
                role="gridcell"
                aria-pressed={selected}
                aria-label={t('tool-ascii.ui.cellLabel', { code: entry.code, name: entry.name })}
                title={`${entry.code} (0x${entry.code.toString(16).toUpperCase().padStart(2, '0')}) · ${entry.name}`}
                onClick={() => setInput(String(entry.code))}
                className={`group flex min-h-8 min-w-0 items-center justify-between gap-0.5 rounded-md border px-1 py-0.5 font-mono transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${selected
                  ? 'border-accent bg-accent text-white shadow-[0_2px_8px_var(--accent-light)]'
                  : 'border-border bg-card text-text-main hover:border-accent hover:bg-accent-light'}`}
              >
                <span className={`text-[0.58rem] tabular-nums ${selected ? 'text-white/75' : 'text-text-muted'}`}>
                  {entry.code}
                </span>
                <span className={`truncate text-[0.72rem] font-extrabold ${entry.control && !selected ? 'text-accent' : ''}`}>
                  {entry.symbol}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function encodeAscii(text, t) {
  const codes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code > 127) {
      return {
        output: '',
        error: t('tool-ascii.ui.outsideAscii', { character: char }),
      };
    }
    codes.push(code);
  }
  return { output: codes.join(' '), error: null };
}

function decodeAscii(codes, t) {
  const values = codes.trim().split(/[\s,]+/).filter(Boolean);
  const chars = [];

  for (const value of values) {
    if (!/^\d+$/.test(value)) {
      return { output: '', error: t('tool-ascii.ui.notDecimal', { value }) };
    }
    const code = Number(value);
    if (code < 0 || code > 127) {
      return { output: '', error: t('tool-ascii.ui.outsideRange', { value }) };
    }
    chars.push(String.fromCharCode(code));
  }
  return { output: chars.join(''), error: null };
}

function analyzeAscii(input, mode = 'auto', t) {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      sourceLabel: mode === 'encode' ? t('tool-ascii.ui.plainText') : mode === 'decode' ? t('tool-ascii.ui.codes') : t('tool-ascii.ui.textOrCodes'),
      targetLabel: mode === 'encode' ? t('tool-ascii.ui.codes') : mode === 'decode' ? t('tool-ascii.ui.plainText') : '',
      output: '',
      outputPlaceholder: '',
      error: null,
    };
  }

  if (mode === 'encode') {
    const encoded = encodeAscii(input, t);
    return {
      sourceLabel: t('tool-ascii.ui.plainText'),
      targetLabel: t('tool-ascii.ui.codes'),
      output: encoded.output,
      outputPlaceholder: '',
      error: encoded.error,
    };
  }

  if (mode === 'decode') {
    const decoded = decodeAscii(trimmed, t);
    return {
      sourceLabel: t('tool-ascii.ui.codes'),
      targetLabel: t('tool-ascii.ui.plainText'),
      output: decoded.output,
      outputPlaceholder: '',
      error: decoded.error,
    };
  }

  const looksLikeCodes = /^[\d\s,]+$/.test(trimmed);
  if (looksLikeCodes) {
    const decoded = decodeAscii(trimmed, t);
    return {
      sourceLabel: t('tool-ascii.ui.codes'),
      targetLabel: t('tool-ascii.ui.plainText'),
      output: decoded.output,
      outputPlaceholder: '',
      error: decoded.error,
    };
  }

  const encoded = encodeAscii(input, t);
  return {
    sourceLabel: t('tool-ascii.ui.plainText'),
    targetLabel: t('tool-ascii.ui.codes'),
    output: encoded.output,
    outputPlaceholder: '',
    error: encoded.error,
  };
}

export default function AsciiConverter() {
  const { t } = useTranslation('tools');
  return (
    <AutoDetectConverter
      toolId="tool-ascii"
      title={t('tool-ascii.title')}
      inputPlaceholder={t('tool-ascii.ui.placeholder')}
      emptyTargetLabel={t('tool-ascii.ui.converted')}
      analyze={(input, mode) => analyzeAscii(input, mode, t)}
      editorMinHeightClass="min-h-[76px] md:min-h-[84px]"
      editorRows={3}
      renderSupplementary={(props) => <AsciiReferenceTable {...props} />}
      showManualModes={false}
    />
  );
}
