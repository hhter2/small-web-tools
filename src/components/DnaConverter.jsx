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

  return (
    <article id="tool-dna" className="tool-card active">
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
      <p className="small status-msg" id="dna-status" style={statusStyle}>{statusText}</p>
    </article>
  );
}
