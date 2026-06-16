import React, { useState, useEffect } from 'react';

const dnaComplementMap = {
  'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C',
  'a': 't', 't': 'a', 'c': 'g', 'g': 'c',
  'U': 'A', 'u': 'a',
  'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M', 'M': 'K',
  'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D', 'N': 'N',
  'r': 'y', 'y': 'r', 's': 's', 'w': 'w', 'k': 'm', 'm': 'k',
  'b': 'v', 'v': 'b', 'd': 'h', 'h': 'd', 'n': 'n'
};

const rnaComplementMap = {
  'A': 'U', 'U': 'A', 'C': 'G', 'G': 'C',
  'a': 'u', 'u': 'a',
  'T': 'A', 't': 'a',
  'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W', 'K': 'M', 'M': 'K',
  'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D', 'N': 'N',
  'r': 'y', 'y': 'r', 's': 's', 'w': 'w', 'k': 'm', 'm': 'k',
  'b': 'v', 'v': 'b', 'd': 'h', 'h': 'd', 'n': 'n'
};

const baseColors = {
  'A': '#10b981', // green
  'T': '#ef4444', // red
  'U': '#ec4899', // purple/pink
  'C': '#f59e0b', // orange
  'G': '#3b82f6', // blue
  'N': '#9ca3af'  // grey
};

const getComplement = (sequence, isRna) => {
  const map = isRna ? rnaComplementMap : dnaComplementMap;
  return sequence.split("").map(char => map[char] || char).join("");
};

const reverseString = (str) => {
  return str.split("").reverse().join("");
};

export default function DnaConverter() {
  const [input, setInput] = useState('');
  const [seqType, setSeqType] = useState('auto');
  const [direction, setDirection] = useState('5-3');
  const [copiedBtn, setCopiedBtn] = useState(null);
  const [viewMode, setViewMode] = useState('text'); // 'text' or 'figure'

  // States to keep track of warning colors & messages
  const [statusText, setStatusText] = useState('Enter a sequence to convert.');
  const [statusStyle, setStatusStyle] = useState({});

  const [outputs, setOutputs] = useState({
    opposite: '',
    revcomp: '',
    reverse: '',
  });

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedBtn(key);
      setTimeout(() => {
        setCopiedBtn(null);
      }, 1500);
    });
  };

  useEffect(() => {
    if (!input.trim()) {
      setOutputs({ opposite: '', revcomp: '', reverse: '' });
      setStatusText("Enter a sequence to convert.");
      setStatusStyle({});
      return;
    }

    // 1. Detect and parse direction if marked explicitly in sequence
    const lowerVal = input.toLowerCase();
    const has5PrimeStart = /^\s*5['’]/.test(lowerVal);
    const has3PrimeStart = /^\s*3['’]/.test(lowerVal);
    const has5PrimeEnd = /5['’]\s*$/.test(lowerVal);
    const has3PrimeEnd = /3['’]\s*$/.test(lowerVal);

    let currentDirection = direction;
    if (has5PrimeStart || has3PrimeEnd) {
      currentDirection = "5-3";
      setDirection("5-3");
    } else if (has3PrimeStart || has5PrimeEnd) {
      currentDirection = "3-5";
      setDirection("3-5");
    }

    // 2. Clean the sequence (remove 5', 3', hyphens, whitespace, numbers, etc.)
    let cleaned = input
      .replace(/5['’](-)?/gi, '')
      .replace(/3['’](-)?/gi, '')
      .replace(/[-'’\s\d]/g, '')
      .toUpperCase();

    if (!cleaned) {
      setOutputs({ opposite: '', revcomp: '', reverse: '' });
      setStatusText("Please enter a valid sequence.");
      setStatusStyle({});
      return;
    }

    // Validate characters: only A, T, C, G, U, and N are allowed
    if (/[^ACGUTN]/.test(cleaned)) {
      setOutputs({ opposite: '', revcomp: '', reverse: '' });
      setStatusText("Error: Only A, T, C, G, U, and N characters are allowed.");
      setStatusStyle({});
      return;
    }

    let warningMessage = "";
    if (cleaned.includes("N")) {
      warningMessage = "Notification: 'N' detected (can attach to any base: A, T, C, or G).";
    }

    // 3. Auto-detect sequence type (DNA vs RNA)
    let isRna = false;
    if (seqType === "auto") {
      const hasU = cleaned.includes("U");
      const hasT = cleaned.includes("T");
      if (hasU && hasT) {
        warningMessage = (warningMessage ? warningMessage + " " : "") + "Warning: Both T and U detected. Defaulting to DNA.";
        isRna = false;
      } else if (hasU) {
        isRna = true;
      } else {
        isRna = false; // defaults to DNA
      }
    } else {
      isRna = seqType === "rna";
    }

    if (warningMessage) {
      setStatusText(warningMessage);
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      setStatusStyle({ color: isDark ? "#fbbf24" : "#b45309" }); // Amber/yellow color for warnings
    } else {
      setStatusText("");
      setStatusStyle({});
    }

    // 4. Perform conversions
    // Get 5' to 3' representation of input sequence to facilitate standard revcomp
    const seq5to3 = (currentDirection === "5-3") ? cleaned : reverseString(cleaned);

    // A. Opposite Strand (3' ↔ 5' Swap)
    const oppositeComplement = getComplement(cleaned, isRna);
    const oppositeStr = (currentDirection === "5-3") 
      ? `3'-${oppositeComplement}-5'` 
      : `5'-${oppositeComplement}-3'`;

    // B. Standard Reverse Complement (always written 5' → 3')
    const revcompSeq = reverseString(getComplement(seq5to3, isRna));
    const revcompStr = `5'-${revcompSeq}-3'`;

    // C. Same Strand (Reverse Direction)
    const reversedSeq = reverseString(cleaned);
    const reverseStr = (currentDirection === "5-3")
      ? `3'-${reversedSeq}-5'`
      : `5'-${reversedSeq}-3'`;

    setOutputs({
      opposite: oppositeStr,
      revcomp: revcompStr,
      reverse: reverseStr,
    });
  }, [input, seqType, direction]);

  const renderVisualDna = () => {
    const cleaned = input
      .replace(/5['’](-)?/gi, '')
      .replace(/3['’](-)?/gi, '')
      .replace(/[-'’\s\d]/g, '')
      .toUpperCase();

    if (!cleaned) {
      return (
        <div className="dna-visual-placeholder">
          Enter a valid sequence to see the visual representation.
        </div>
      );
    }

    if (/[^ACGUTN]/.test(cleaned)) {
      return (
        <div className="dna-visual-placeholder error">
          Error: Only A, T, C, G, U, and N characters are allowed.
        </div>
      );
    }

    let isRna = false;
    if (seqType === "auto") {
      const hasU = cleaned.includes("U");
      const hasT = cleaned.includes("T");
      if (hasU && hasT) {
        isRna = false;
      } else if (hasU) {
        isRna = true;
      } else {
        isRna = false;
      }
    } else {
      isRna = seqType === "rna";
    }

    const len = cleaned.length;
    const baseWidth = 50;
    const padding = 50;
    const svgWidth = padding * 2 + len * baseWidth;
    const svgHeight = 220;

    const topStrand = (direction === '5-3') ? cleaned.split('') : reverseString(cleaned).split('');
    const bottomStrand = topStrand.map(b => getComplement(b, isRna));

    return (
      <div className="dna-visual-container">
        <div className="dna-visual-wrapper">
          <div className="dna-visual-legend">
            <div className="legend-item">
              <span className="legend-line legend-line--red"></span>
              <span>Sense Strand (Input strand, 100% opacity)</span>
            </div>
            <div className="legend-item">
              <span className="legend-line legend-line--blue" style={{ opacity: 0.3 }}></span>
              <span>Opposite Strand (Target, 30% opacity / 70% transparent)</span>
            </div>
          </div>
          
          <div className="dna-visual-scroll-container">
            <svg width={svgWidth} height={svgHeight} className="dna-svg">
              <defs>
                <marker id="arrow-right-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
                <marker id="arrow-left-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 10 0 L 0 5 L 10 10 z" fill="#3b82f6" />
                </marker>
              </defs>

              {/* Backbones */}
              <rect 
                x={padding} 
                y={35} 
                width={len * baseWidth} 
                height={10} 
                fill="#ef4444" 
                rx={5} 
              />
              <rect 
                x={padding} 
                y={135} 
                width={len * baseWidth} 
                height={10} 
                fill="#3b82f6" 
                opacity={0.3}
                rx={5} 
              />

              {/* Labels (Top is always 5' left, 3' right; Bottom is always 3' left, 5' right) */}
              <text x={padding - 20} y={43} textAnchor="middle" fill="var(--text-main)" fontSize="14" fontWeight="bold">
                5'
              </text>
              <text x={padding + len * baseWidth + 20} y={43} textAnchor="middle" fill="var(--text-main)" fontSize="14" fontWeight="bold">
                3'
              </text>

              <text x={padding - 20} y={143} textAnchor="middle" fill="var(--text-main)" opacity={0.3} fontSize="14" fontWeight="bold">
                3'
              </text>
              <text x={padding + len * baseWidth + 20} y={143} textAnchor="middle" fill="var(--text-main)" opacity={0.3} fontSize="14" fontWeight="bold">
                5'
              </text>

              {/* Render Nucleotides */}
              {topStrand.map((base, i) => {
                const x = padding + i * baseWidth + baseWidth / 2;
                const bColor = baseColors[base] || '#9ca3af';

                // Top base path (extending down from 45)
                let topPath = '';
                if (base === 'A') {
                  topPath = `M ${x-15} 45 L ${x+15} 45 L ${x+15} 78 L ${x} 93 L ${x-15} 78 Z`;
                } else if (base === 'T' || base === 'U') {
                  topPath = `M ${x-15} 45 L ${x+15} 45 L ${x+15} 93 L ${x} 78 L ${x-15} 93 Z`;
                } else if (base === 'C') {
                  topPath = `M ${x-15} 45 L ${x+15} 45 L ${x+15} 78 Q ${x} 93 ${x-15} 78 Z`;
                } else if (base === 'G') {
                  topPath = `M ${x-15} 45 L ${x+15} 45 L ${x+15} 93 Q ${x} 78 ${x-15} 93 Z`;
                } else {
                  topPath = `M ${x-15} 45 L ${x+15} 45 L ${x+15} 85 L ${x-15} 85 Z`;
                }

                const bottomBase = bottomStrand[i];
                const bottomColor = baseColors[bottomBase] || '#9ca3af';

                // Bottom base path (extending up from 135)
                let bottomPath = '';
                if (bottomBase === 'A') {
                  bottomPath = `M ${x-15} 135 L ${x+15} 135 L ${x+15} 102 L ${x} 87 L ${x-15} 102 Z`;
                } else if (bottomBase === 'T' || bottomBase === 'U') {
                  bottomPath = `M ${x-15} 135 L ${x+15} 135 L ${x+15} 87 L ${x} 102 L ${x-15} 87 Z`;
                } else if (bottomBase === 'C') {
                  bottomPath = `M ${x-15} 135 L ${x+15} 135 L ${x+15} 102 Q ${x} 87 ${x-15} 102 Z`;
                } else if (bottomBase === 'G') {
                  bottomPath = `M ${x-15} 135 L ${x+15} 135 L ${x+15} 87 Q ${x} 102 ${x-15} 87 Z`;
                } else {
                  bottomPath = `M ${x-15} 135 L ${x+15} 135 L ${x+15} 95 L ${x-15} 95 Z`;
                }

                return (
                  <g key={i}>
                    <path d={topPath} fill={bColor} />
                    <text x={x} y={68} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                      {base}
                    </text>

                    <path d={bottomPath} fill={bottomColor} opacity={0.3} />
                    <text x={x} y={116} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold" opacity={0.3}>
                      {bottomBase}
                    </text>
                  </g>
                );
              })}

              {/* Sense Direction Indicator (above top strand) */}
              <g>
                <line 
                  x1={padding} 
                  y1={15} 
                  x2={padding + len * baseWidth} 
                  y2={15} 
                  stroke="#ef4444" 
                  strokeWidth="2" 
                  markerEnd="url(#arrow-right-red)" 
                />
                <text 
                  x={padding + (len * baseWidth) / 2} 
                  y={10} 
                  textAnchor="middle" 
                  fill="#ef4444" 
                  fontSize="10" 
                  fontWeight="600"
                >
                  Sense Strand Direction (5' → 3')
                </text>
              </g>

              {/* Target Direction Indicator (below bottom strand) */}
              <g>
                <line 
                  x1={padding + len * baseWidth} 
                  y1={185} 
                  x2={padding} 
                  y2={185} 
                  stroke="#3b82f6" 
                  strokeWidth="2" 
                  opacity={0.3}
                  markerEnd="url(#arrow-left-blue)" 
                />
                <text 
                  x={padding + (len * baseWidth) / 2} 
                  y={205} 
                  textAnchor="middle" 
                  fill="#3b82f6" 
                  opacity={0.3} 
                  fontSize="10" 
                  fontWeight="600"
                >
                  Target Strand Direction (5' → 3')
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <article id="tool-dna" className="tool-card tool-card--wide active">
      <h2>DNA/RNA Direction Transfer</h2>
      
      <div className="row">
        <div className="form-group flex-1">
          <label htmlFor="dna-seq-type">Sequence Type</label>
          <select
            id="dna-seq-type"
            value={seqType}
            onChange={(e) => setSeqType(e.target.value)}
          >
            <option value="auto">Auto-detect (DNA/RNA)</option>
            <option value="dna">DNA</option>
            <option value="rna">RNA</option>
          </select>
        </div>
        <div className="form-group flex-1">
          <label htmlFor="dna-direction">Input Direction</label>
          <select
            id="dna-direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="5-3">5' → 3' (Default)</option>
            <option value="3-5">3' → 5'</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="dna-input">DNA/RNA Sequence</label>
        <textarea
          id="dna-input"
          rows="4"
          placeholder="Enter sequence (e.g., 5'-CACGT-3' or simply CACGT)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <div className="view-mode-toggle-container">
        <button
          type="button"
          className={`view-mode-btn ${viewMode === 'text' ? 'active' : ''}`}
          onClick={() => setViewMode('text')}
        >
          Text Mode
        </button>
        <button
          type="button"
          className={`view-mode-btn ${viewMode === 'figure' ? 'active' : ''}`}
          onClick={() => setViewMode('figure')}
        >
          Figure Mode
        </button>
      </div>

      {viewMode === 'text' ? (
        <div className="grid-outputs">
          <div className="form-group">
            <div className="label-row-with-copy">
              <label htmlFor="dna-output-opposite">Opposite Strand (3' ↔ 5' Swap)</label>
              <button
                className={`copy-btn-inline ${copiedBtn === 'opposite' ? 'copied' : ''}`}
                onClick={() => handleCopy(outputs.opposite, 'opposite')}
              >
                {copiedBtn === 'opposite' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <input id="dna-output-opposite" type="text" readOnly value={outputs.opposite} />
          </div>
          <div className="form-group">
            <div className="label-row-with-copy">
              <label htmlFor="dna-output-revcomp">Reverse Complement (Standard 5' → 3')</label>
              <button
                className={`copy-btn-inline ${copiedBtn === 'revcomp' ? 'copied' : ''}`}
                onClick={() => handleCopy(outputs.revcomp, 'revcomp')}
              >
                {copiedBtn === 'revcomp' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <input id="dna-output-revcomp" type="text" readOnly value={outputs.revcomp} />
          </div>
          <div className="form-group full-width">
            <div className="label-row-with-copy">
              <label htmlFor="dna-output-reverse">Same Strand (Reverse Direction)</label>
              <button
                className={`copy-btn-inline ${copiedBtn === 'reverse' ? 'copied' : ''}`}
                onClick={() => handleCopy(outputs.reverse, 'reverse')}
              >
                {copiedBtn === 'reverse' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <input id="dna-output-reverse" type="text" readOnly value={outputs.reverse} />
          </div>
        </div>
      ) : (
        renderVisualDna()
      )}
      <p className="small status-msg" id="dna-status" style={statusStyle}>{statusText}</p>
    </article>
  );
}
