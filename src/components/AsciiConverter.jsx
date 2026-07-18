import React from 'react';
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
  const selectedCode = /^\d+$/.test(input.trim()) && Number(input.trim()) <= 127
    ? Number(input.trim())
    : null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="ascii-reference-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="ascii-reference-title" className="text-sm font-bold text-text-main">ASCII reference</h3>
          <p className="text-xs text-text-muted">Select any character to use its decimal code as the input.</p>
        </div>
        <span className="text-[0.68rem] font-semibold text-text-muted">DEC · Character</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-app/70 p-1.5">
        <div className="grid min-w-[760px] grid-cols-[repeat(16,minmax(0,1fr))] gap-1" role="grid" aria-label="ASCII codes 0 through 127">
          {ASCII_ENTRIES.map((entry) => {
            const selected = selectedCode === entry.code;
            return (
              <button
                key={entry.code}
                type="button"
                role="gridcell"
                aria-pressed={selected}
                aria-label={`ASCII ${entry.code}: ${entry.name}`}
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

function encodeAscii(text) {
  const codes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code > 127) {
      return {
        output: '',
        error: `The character "${char}" is outside the ASCII range. Use Unicode Converter for non-ASCII text.`,
      };
    }
    codes.push(code);
  }
  return { output: codes.join(' '), error: null };
}

function decodeAscii(codes) {
  const values = codes.trim().split(/[\s,]+/).filter(Boolean);
  const chars = [];

  for (const value of values) {
    if (!/^\d+$/.test(value)) {
      return { output: '', error: `"${value}" is not a decimal ASCII code.` };
    }
    const code = Number(value);
    if (code < 0 || code > 127) {
      return { output: '', error: `ASCII code ${value} is outside the allowed range of 0 to 127.` };
    }
    chars.push(String.fromCharCode(code));
  }
  return { output: chars.join(''), error: null };
}

function analyzeAscii(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      sourceLabel: 'Text or ASCII codes',
      targetLabel: '',
      output: '',
      outputPlaceholder: 'The converted result appears here.',
      error: null,
    };
  }

  const looksLikeCodes = /^[\d\s,]+$/.test(trimmed);
  if (looksLikeCodes) {
    const decoded = decodeAscii(trimmed);
    return {
      sourceLabel: 'ASCII codes',
      targetLabel: 'Plain text',
      output: decoded.output,
      outputPlaceholder: 'Decoded text appears here.',
      error: decoded.error,
    };
  }

  const encoded = encodeAscii(input);
  return {
    sourceLabel: 'Plain text',
    targetLabel: 'ASCII codes',
    output: encoded.output,
    outputPlaceholder: 'Decimal ASCII codes appear here.',
    error: encoded.error,
  };
}

export default function AsciiConverter() {
  return (
    <AutoDetectConverter
      toolId="tool-ascii"
      title="ASCII Converter"
      description="Convert between standard ASCII text and decimal character codes with automatic format detection."
      inputPlaceholder={'Hello\nor\n72 101 108 108 111'}
      emptyTargetLabel="Converted result"
      analyze={analyzeAscii}
      editorMinHeightClass="min-h-[118px] md:min-h-[132px]"
      renderSupplementary={(props) => <AsciiReferenceTable {...props} />}
    />
  );
}
