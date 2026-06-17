import React, { useState, useCallback, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CODON DATA — authoritative JSON mapping (RNA codons)
// type: 'start' | 'stop' | undefined
// ─────────────────────────────────────────────────────────────────────────────
const CODON_MAP = {
  // ── U (first base) ──────────────────────────────────────────────────
  UUU: { aa: 'Phe', full: 'Phenylalanine', abbr: 'F' },
  UUC: { aa: 'Phe', full: 'Phenylalanine', abbr: 'F' },
  UUA: { aa: 'Leu', full: 'Leucine',       abbr: 'L' },
  UUG: { aa: 'Leu', full: 'Leucine',       abbr: 'L' },
  UCU: { aa: 'Ser', full: 'Serine',        abbr: 'S' },
  UCC: { aa: 'Ser', full: 'Serine',        abbr: 'S' },
  UCA: { aa: 'Ser', full: 'Serine',        abbr: 'S' },
  UCG: { aa: 'Ser', full: 'Serine',        abbr: 'S' },
  UAU: { aa: 'Tyr', full: 'Tyrosine',      abbr: 'Y' },
  UAC: { aa: 'Tyr', full: 'Tyrosine',      abbr: 'Y' },
  UAA: { aa: 'Stop', full: 'Stop (Ochre)',  abbr: '*', type: 'stop' },
  UAG: { aa: 'Stop', full: 'Stop (Amber)',  abbr: '*', type: 'stop' },
  UGU: { aa: 'Cys', full: 'Cysteine',      abbr: 'C' },
  UGC: { aa: 'Cys', full: 'Cysteine',      abbr: 'C' },
  UGA: { aa: 'Stop', full: 'Stop (Opal)',   abbr: '*', type: 'stop' },
  UGG: { aa: 'Trp', full: 'Tryptophan',    abbr: 'W' },
  // ── C (first base) ──────────────────────────────────────────────────
  CUU: { aa: 'Leu', full: 'Leucine',       abbr: 'L' },
  CUC: { aa: 'Leu', full: 'Leucine',       abbr: 'L' },
  CUA: { aa: 'Leu', full: 'Leucine',       abbr: 'L' },
  CUG: { aa: 'Leu', full: 'Leucine',       abbr: 'L' },
  CCU: { aa: 'Pro', full: 'Proline',       abbr: 'P' },
  CCC: { aa: 'Pro', full: 'Proline',       abbr: 'P' },
  CCA: { aa: 'Pro', full: 'Proline',       abbr: 'P' },
  CCG: { aa: 'Pro', full: 'Proline',       abbr: 'P' },
  CAU: { aa: 'His', full: 'Histidine',     abbr: 'H' },
  CAC: { aa: 'His', full: 'Histidine',     abbr: 'H' },
  CAA: { aa: 'Gln', full: 'Glutamine',     abbr: 'Q' },
  CAG: { aa: 'Gln', full: 'Glutamine',     abbr: 'Q' },
  CGU: { aa: 'Arg', full: 'Arginine',      abbr: 'R' },
  CGC: { aa: 'Arg', full: 'Arginine',      abbr: 'R' },
  CGA: { aa: 'Arg', full: 'Arginine',      abbr: 'R' },
  CGG: { aa: 'Arg', full: 'Arginine',      abbr: 'R' },
  // ── A (first base) ──────────────────────────────────────────────────
  AUU: { aa: 'Ile', full: 'Isoleucine',    abbr: 'I' },
  AUC: { aa: 'Ile', full: 'Isoleucine',    abbr: 'I' },
  AUA: { aa: 'Ile', full: 'Isoleucine',    abbr: 'I' },
  AUG: { aa: 'Met', full: 'Methionine (Start)', abbr: 'M', type: 'start' },
  ACU: { aa: 'Thr', full: 'Threonine',     abbr: 'T' },
  ACC: { aa: 'Thr', full: 'Threonine',     abbr: 'T' },
  ACA: { aa: 'Thr', full: 'Threonine',     abbr: 'T' },
  ACG: { aa: 'Thr', full: 'Threonine',     abbr: 'T' },
  AAU: { aa: 'Asn', full: 'Asparagine',    abbr: 'N' },
  AAC: { aa: 'Asn', full: 'Asparagine',    abbr: 'N' },
  AAA: { aa: 'Lys', full: 'Lysine',        abbr: 'K' },
  AAG: { aa: 'Lys', full: 'Lysine',        abbr: 'K' },
  AGU: { aa: 'Ser', full: 'Serine',        abbr: 'S' },
  AGC: { aa: 'Ser', full: 'Serine',        abbr: 'S' },
  AGA: { aa: 'Arg', full: 'Arginine',      abbr: 'R' },
  AGG: { aa: 'Arg', full: 'Arginine',      abbr: 'R' },
  // ── G (first base) ──────────────────────────────────────────────────
  GUU: { aa: 'Val', full: 'Valine',        abbr: 'V' },
  GUC: { aa: 'Val', full: 'Valine',        abbr: 'V' },
  GUA: { aa: 'Val', full: 'Valine',        abbr: 'V' },
  GUG: { aa: 'Val', full: 'Valine',        abbr: 'V' },
  GCU: { aa: 'Ala', full: 'Alanine',       abbr: 'A' },
  GCC: { aa: 'Ala', full: 'Alanine',       abbr: 'A' },
  GCA: { aa: 'Ala', full: 'Alanine',       abbr: 'A' },
  GCG: { aa: 'Ala', full: 'Alanine',       abbr: 'A' },
  GAU: { aa: 'Asp', full: 'Aspartate',     abbr: 'D' },
  GAC: { aa: 'Asp', full: 'Aspartate',     abbr: 'D' },
  GAA: { aa: 'Glu', full: 'Glutamate',     abbr: 'E' },
  GAG: { aa: 'Glu', full: 'Glutamate',     abbr: 'E' },
  GGU: { aa: 'Gly', full: 'Glycine',       abbr: 'G' },
  GGC: { aa: 'Gly', full: 'Glycine',       abbr: 'G' },
  GGA: { aa: 'Gly', full: 'Glycine',       abbr: 'G' },
  GGG: { aa: 'Gly', full: 'Glycine',       abbr: 'G' },
};

// Standard biological layout: rows = first base, cols = second base, 3rd = row within cell
const BASES = ['U', 'C', 'A', 'G'];
const SECOND_BASES = ['U', 'C', 'A', 'G'];
const THIRD_BASES  = ['U', 'C', 'A', 'G'];

// ─────────────────────────────────────────────────────────────────────────────
// Amino acid colour palette — distinct hue per AA group
// ─────────────────────────────────────────────────────────────────────────────
const AA_COLORS = {
  Phe: '#a78bfa', Leu: '#8b5cf6', Ile: '#7c3aed', Met: null /* start */,
  Val: '#6d28d9', Ser: '#3b82f6', Pro: '#0ea5e9', Thr: '#06b6d4',
  Ala: '#14b8a6', Tyr: '#f59e0b', His: '#d97706', Gln: '#f97316',
  Asn: '#ef4444', Lys: '#dc2626', Asp: '#ec4899', Glu: '#db2777',
  Cys: '#84cc16', Trp: '#22c55e', Arg: '#10b981', Gly: '#6b7280',
  Stop: null /* stop */,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get CSS class modifier for a codon
// ─────────────────────────────────────────────────────────────────────────────
function codonClass(codon) {
  const data = CODON_MAP[codon];
  if (!data) return '';
  if (data.type === 'start') return 'codon-start';
  if (data.type === 'stop')  return 'codon-stop';
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Ripple effect hook
// ─────────────────────────────────────────────────────────────────────────────
function useRipple() {
  const triggerRipple = useCallback((e) => {
    const btn = e.currentTarget;
    const existing = btn.querySelector('.ct-ripple');
    if (existing) existing.remove();

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x    = e.clientX - rect.left - size / 2;
    const y    = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ct-ripple';
    ripple.style.cssText = `
      position:absolute; border-radius:50%; pointer-events:none;
      width:${size}px; height:${size}px; left:${x}px; top:${y}px;
      background:rgba(255,255,255,0.25);
      transform:scale(0); animation:ct-ripple-anim 0.55s ease-out forwards;
    `;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }, []);
  return triggerRipple;
}

// ─────────────────────────────────────────────────────────────────────────────
// CodonButton — one interactive codon element
// ─────────────────────────────────────────────────────────────────────────────
function CodonButton({ codon, isSelected, isHighlighted, onSelect }) {
  const data       = CODON_MAP[codon];
  const triggerRipple = useRipple();
  const cls = [
    'ct-codon-btn',
    codonClass(codon),
    isSelected    ? 'is-selected'    : '',
    isHighlighted ? 'is-highlighted' : '',
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    triggerRipple(e);
    onSelect(codon);
  };

  return (
    <button
      id={`codon-${codon}`}
      className={cls}
      onClick={handleClick}
      aria-label={`Codon ${codon} encodes ${data?.full ?? 'unknown'}`}
      aria-pressed={isSelected}
      title={`${codon} → ${data?.full ?? '?'} (${data?.abbr ?? '?'})`}
    >
      <span className="ct-codon-letters">{codon}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AminoAcidButton — the AA label inside each cell group
// ─────────────────────────────────────────────────────────────────────────────
function AminoAcidButton({ codon, isHighlighted, onSelect }) {
  const data = CODON_MAP[codon];
  const triggerRipple = useRipple();
  if (!data) return null;

  const aaColor = AA_COLORS[data.aa];
  let cls = 'ct-aa-btn';
  if (data.type === 'start') cls += ' ct-aa-start';
  else if (data.type === 'stop') cls += ' ct-aa-stop';
  if (isHighlighted) cls += ' is-highlighted';

  const inlineStyle = aaColor ? { color: aaColor } : {};

  const handleClick = (e) => {
    triggerRipple(e);
    onSelect(codon);
  };

  const label = data.type === 'start'
    ? `${data.aa} ★`
    : data.type === 'stop'
    ? '■ Stop'
    : data.aa;

  return (
    <button
      id={`aa-${codon}`}
      className={cls}
      onClick={handleClick}
      style={inlineStyle}
      aria-label={`${data.aa}: ${data.full}`}
      aria-pressed={isHighlighted}
      title={`${data.full} · 1-letter: ${data.abbr}`}
    >
      {label}
    </button>
  );
}


// Fischer Projection Data for all 20 L-amino acids
const AMINO_ACID_DETAILS = {
  Phe: { sideChain: 'CH₂-C₆H₅', name: 'Benzyl', type: 'Hydrophobic, Aromatic' },
  Leu: { sideChain: 'CH₂-CH(CH₃)₂', name: 'Isobutyl', type: 'Hydrophobic, Aliphatic' },
  Ile: { sideChain: 'CH(CH₃)CH₂CH₃', name: 'sec-Butyl', type: 'Hydrophobic, Aliphatic' },
  Met: { sideChain: '(CH₂)₂-S-CH₃', name: 'Methylthioethyl', type: 'Hydrophobic, Sulfur-containing' },
  Val: { sideChain: 'CH(CH₃)₂', name: 'Isopropyl', type: 'Hydrophobic, Aliphatic' },
  Ser: { sideChain: 'CH₂-OH', name: 'Hydroxymethyl', type: 'Polar, Uncharged' },
  Pro: { sideChain: 'Cyclic (C₃H₆)', name: 'Pyrrolidine ring', type: 'Hydrophobic, Cyclic' },
  Thr: { sideChain: 'CH(OH)CH₃', name: '1-Hydroxyethyl', type: 'Polar, Uncharged' },
  Ala: { sideChain: 'CH₃', name: 'Methyl', type: 'Hydrophobic, Aliphatic' },
  Tyr: { sideChain: 'CH₂-C₆H₄-OH', name: 'p-Hydroxybenzyl', type: 'Polar, Aromatic' },
  His: { sideChain: 'CH₂-C₃H₃N₂', name: 'Imidazolemethyl', type: 'Basic, Positively Charged' },
  Gln: { sideChain: '(CH₂)₂-CO-NH₂', name: 'Carbamoylethyl', type: 'Polar, Uncharged' },
  Asn: { sideChain: 'CH₂-CO-NH₂', name: 'Carbamoylmethyl', type: 'Polar, Uncharged' },
  Lys: { sideChain: '(CH₂)₄-NH₂', name: '4-Aminobutyl', type: 'Basic, Positively Charged' },
  Asp: { sideChain: 'CH₂-COOH', name: 'Carboxymethyl', type: 'Acidic, Negatively Charged' },
  Glu: { sideChain: '(CH₂)₂-COOH', name: 'Carboxyethyl', type: 'Acidic, Negatively Charged' },
  Cys: { sideChain: 'CH₂-SH', name: 'Sulfhydrylmethyl', type: 'Polar, Sulfur-containing' },
  Trp: { sideChain: 'CH₂-C₈H₆N', name: 'Indolemethyl', type: 'Hydrophobic, Aromatic' },
  Arg: { sideChain: '(CH₂)₃-NH-C(=NH)NH₂', name: '3-Guanidinopropyl', type: 'Basic, Positively Charged' },
  Gly: { sideChain: 'H', name: 'Hydrogen atom', type: 'Non-polar, Achiral' }
};

// Fischer Projection heights for all 20 L-amino acids
const FISCHER_HEIGHTS = {
  Gly: 90,
  Ala: 90,
  Val: 110,
  Pro: 125,
  Cys: 120,
  Ser: 120,
  Thr: 120,
  Asp: 120,
  Leu: 145,
  Asn: 145,
  His: 145,
  Ile: 155,
  Phe: 155,
  Tyr: 170,
  Trp: 155,
  Glu: 155,
  Met: 180,
  Gln: 170,
  Lys: 210,
  Arg: 230,
};

function renderSideChain(aa) {
  switch (aa) {
    case 'Gly':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">H</text>
        </>
      );
    case 'Ala':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
        </>
      );
    case 'Val':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="73" y1="82" x2="67" y2="88" className="ct-fisc-side-bond" />
          <line x1="87" y1="82" x2="93" y2="88" className="ct-fisc-side-bond" />
          <text x="60" y="95" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <text x="100" y="95" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
        </>
      );
    case 'Leu':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="73" y1="112" x2="67" y2="118" className="ct-fisc-side-bond" />
          <line x1="87" y1="112" x2="93" y2="118" className="ct-fisc-side-bond" />
          <text x="60" y="125" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <text x="100" y="125" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
        </>
      );
    case 'Ile':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="90" y1="75" x2="100" y2="75" className="ct-fisc-side-bond" />
          <text x="110" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="115" x2="80" y2="125" className="ct-fisc-side-bond" />
          <text x="80" y="135" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
        </>
      );
    case 'Pro':
      return (
        <>
          <path d="M 83,55 L 92,83 L 60,107 L 28,83 L 37,55" fill="none" className="ct-fisc-side-bond" strokeWidth="2" strokeLinejoin="round" />
          <rect x="83" y="74" width="18" height="18" fill="var(--bg-card)" />
          <rect x="51" y="98" width="18" height="18" fill="var(--bg-card)" />
          <rect x="19" y="74" width="18" height="18" fill="var(--bg-card)" />
          <text x="92" y="83" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <text x="60" y="107" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <text x="28" y="83" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
        </>
      );
    case 'Phe':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <polygon points="80,95 97,105 97,125 80,135 63,125 63,105" fill="none" className="ct-fisc-side-bond" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="80" cy="115" r="11" fill="none" className="ct-fisc-side-bond" strokeWidth="1.5" strokeDasharray="3,2" />
        </>
      );
    case 'Tyr':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <polygon points="80,95 97,105 97,125 80,135 63,125 63,105" fill="none" className="ct-fisc-side-bond" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="80" cy="115" r="11" fill="none" className="ct-fisc-side-bond" strokeWidth="1.5" strokeDasharray="3,2" />
          <line x1="80" y1="135" x2="80" y2="145" className="ct-fisc-side-bond" />
          <text x="80" y="155" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">OH</text>
        </>
      );
    case 'Trp':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <polygon points="80,95 60,105 60,125 90,125 90,95" fill="none" className="ct-fisc-side-bond" strokeWidth="2" strokeLinejoin="round" />
          <line x1="77" y1="99" x2="61" y2="107" className="ct-fisc-side-bond" strokeWidth="1.5" />
          <polygon points="90,95 107,85 125,95 125,125 107,135 90,125" fill="none" className="ct-fisc-side-bond" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="107" cy="110" r="11" fill="none" className="ct-fisc-side-bond" strokeWidth="1.5" strokeDasharray="3,2" />
          <rect x="47" y="116" width="26" height="18" fill="var(--bg-card)" />
          <text x="60" y="125" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">NH</text>
        </>
      );
    case 'Met':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="115" x2="80" y2="125" className="ct-fisc-side-bond" />
          <text x="80" y="135" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">S</text>
          <line x1="80" y1="145" x2="80" y2="155" className="ct-fisc-side-bond" />
          <text x="80" y="165" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
        </>
      );
    case 'Cys':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">SH</text>
        </>
      );
    case 'Ser':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">OH</text>
        </>
      );
    case 'Thr':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="90" y1="75" x2="100" y2="75" className="ct-fisc-side-bond" />
          <text x="110" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">OH</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
        </>
      );
    case 'His':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <polygon points="80,95 99,109 92,131 68,131 61,109" fill="none" className="ct-fisc-side-bond" strokeWidth="2" strokeLinejoin="round" />
          <line x1="78" y1="98" x2="63" y2="110" className="ct-fisc-side-bond" strokeWidth="1.5" />
          <line x1="89" y1="128" x2="95" y2="110" className="ct-fisc-side-bond" strokeWidth="1.5" />
          <rect x="55" y="122" width="26" height="18" fill="var(--bg-card)" />
          <rect x="91" y="100" width="16" height="18" fill="var(--bg-card)" />
          <text x="68" y="131" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">NH</text>
          <text x="99" y="109" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">N</text>
        </>
      );
    case 'Lys':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="115" x2="80" y2="125" className="ct-fisc-side-bond" />
          <text x="80" y="135" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="145" x2="80" y2="155" className="ct-fisc-side-bond" />
          <text x="80" y="165" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="175" x2="80" y2="185" className="ct-fisc-side-bond" />
          <text x="80" y="195" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">⁺NH₃</text>
        </>
      );
    case 'Arg':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="115" x2="80" y2="125" className="ct-fisc-side-bond" />
          <text x="80" y="135" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="145" x2="80" y2="155" className="ct-fisc-side-bond" />
          <text x="80" y="165" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">NH</text>
          <line x1="80" y1="175" x2="80" y2="185" className="ct-fisc-side-bond" />
          <text x="80" y="195" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="73" y1="202" x2="67" y2="208" className="ct-fisc-side-bond" />
          <line x1="86" y1="201" x2="92" y2="207" className="ct-fisc-side-bond" />
          <line x1="88" y1="203" x2="94" y2="209" className="ct-fisc-side-bond" />
          <text x="60" y="215" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">H₂N</text>
          <text x="100" y="215" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">⁺NH₂</text>
        </>
      );
    case 'Asp':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">COO⁻</text>
        </>
      );
    case 'Asn':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="73" y1="112" x2="67" y2="118" className="ct-fisc-side-bond" />
          <line x1="86" y1="111" x2="92" y2="117" className="ct-fisc-side-bond" />
          <line x1="88" y1="113" x2="94" y2="119" className="ct-fisc-side-bond" />
          <text x="60" y="125" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">H₂N</text>
          <text x="100" y="125" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">O</text>
        </>
      );
    case 'Glu':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="115" x2="80" y2="125" className="ct-fisc-side-bond" />
          <text x="80" y="135" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">COO⁻</text>
        </>
      );
    case 'Gln':
      return (
        <>
          <line x1="80" y1="55" x2="80" y2="65" className="ct-fisc-side-bond" />
          <text x="80" y="75" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="85" x2="80" y2="95" className="ct-fisc-side-bond" />
          <text x="80" y="105" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="80" y1="115" x2="80" y2="125" className="ct-fisc-side-bond" />
          <text x="80" y="135" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">C</text>
          <line x1="73" y1="142" x2="67" y2="148" className="ct-fisc-side-bond" />
          <line x1="86" y1="141" x2="92" y2="147" className="ct-fisc-side-bond" />
          <line x1="88" y1="143" x2="94" y2="149" className="ct-fisc-side-bond" />
          <text x="60" y="155" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">H₂N</text>
          <text x="100" y="155" textAnchor="middle" dominantBaseline="central" className="ct-fisc-side">O</text>
        </>
      );
    default:
      return null;
  }
}

// Fischer Projection Widget Component
function FischerProjection({ aa }) {
  const details = AMINO_ACID_DETAILS[aa];
  if (!details) return null;

  const height = FISCHER_HEIGHTS[aa] || 135;

  return (
    <div className="ct-fischer-container">
      <span className="ct-fischer-title">Fischer Projection (L-Form)</span>
      <div className="ct-fischer-layout">
        <svg className="ct-fischer-svg" width="160" height={height} viewBox={`0 0 160 ${height}`}>
          {/* Main Backbone Bonds */}
          <line x1="50" y1="45" x2="70" y2="45" className="ct-fisc-main-bond" />
          <line x1="90" y1="45" x2="110" y2="45" className="ct-fisc-main-bond" />
          <line x1="80" y1="22" x2="80" y2="35" className="ct-fisc-main-bond" />
          
          {/* Top Label: Carboxyl Group */}
          <text x="80" y="12" textAnchor="middle" dominantBaseline="central" className="ct-fisc-text ct-fisc-main">COO⁻</text>
          
          {/* Left Label: Amino Group (or Imino for Proline) */}
          <text x="40" y="45" textAnchor="end" dominantBaseline="central" className="ct-fisc-text ct-fisc-main">
            {aa === 'Pro' ? 'H₂N⁺' : 'H₃N⁺'}
          </text>

          {/* Right Label: Hydrogen */}
          <text x="120" y="45" textAnchor="start" dominantBaseline="central" className="ct-fisc-text">H</text>

          {/* Center Carbon */}
          <text x="80" y="45" textAnchor="middle" dominantBaseline="central" className="ct-fisc-c">C</text>

          {/* Side Chain R Group */}
          {renderSideChain(aa)}
        </svg>

        <div className="ct-fischer-info">
          <div className="ct-fisc-field">
            <span className="ct-fisc-lbl">Side Chain:</span>
            <span className="ct-fisc-val">{details.name}</span>
          </div>
          <div className="ct-fisc-field">
            <span className="ct-fisc-lbl">Group Type:</span>
            <span className="ct-fisc-val">{details.type}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InfoPanel — detail card for selected codon
// ─────────────────────────────────────────────────────────────────────────────
function InfoPanel({ codon, onClose }) {
  const data = CODON_MAP[codon];
  if (!codon || !data) return null;

  const synonyms = Object.keys(CODON_MAP).filter(
    c => CODON_MAP[c].aa === data.aa && c !== codon
  );

  const bgClass = data.type === 'start'
    ? 'ct-panel--start'
    : data.type === 'stop'
    ? 'ct-panel--stop'
    : 'ct-panel--normal';

  return (
    <div className={`ct-info-panel ${bgClass}`} role="status" aria-live="polite">
      <button className="ct-panel-close" onClick={onClose} aria-label="Close info panel">✕</button>
      <div className="ct-panel-header">
        <span className="ct-panel-codon">{codon}</span>
        <span className="ct-panel-arrow">→</span>
        <span className="ct-panel-aa">{data.full}</span>
      </div>
      <div className="ct-panel-badges">
        <span className="ct-badge ct-badge--codon">Codon: {codon}</span>
        <span className="ct-badge ct-badge--3">{data.aa}</span>
        <span className="ct-badge ct-badge--1">1-letter: {data.abbr}</span>
        {data.type === 'start' && <span className="ct-badge ct-badge--start">START ★</span>}
        {data.type === 'stop'  && <span className="ct-badge ct-badge--stop">STOP ■</span>}
      </div>
      {synonyms.length > 0 && (
        <div className="ct-panel-synonyms">
          <span className="ct-panel-syn-label">Synonymous codons:</span>
          <div className="ct-panel-syn-list">
            {synonyms.map(s => (
              <span key={s} className="ct-syn-chip">{s}</span>
            ))}
          </div>
        </div>
      )}
      <div className="ct-panel-bases">
        {['1st', '2nd', '3rd'].map((pos, i) => (
          <div key={pos} className="ct-base-bubble">
            <span className="ct-base-pos">{pos}</span>
            <span className={`ct-base-letter ct-base-${codon[i]}`}>{codon[i]}</span>
          </div>
        ))}
      </div>
      {data.aa !== 'Stop' && (
        <FischerProjection aa={data.aa} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CodonTable component
// ─────────────────────────────────────────────────────────────────────────────
export default function CodonTable() {
  const [selectedCodon,    setSelectedCodon]    = useState(null);
  const [highlightedAA,    setHighlightedAA]    = useState(null);
  const [filterMode,       setFilterMode]       = useState('all'); // 'all' | 'start' | 'stop'
  const panelRef = useRef(null);

  // Scroll panel into view when codon selected
  useEffect(() => {
    if (selectedCodon && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedCodon]);

  const handleSelectCodon = useCallback((codon) => {
    setSelectedCodon(prev => prev === codon ? null : codon);
    const data = CODON_MAP[codon];
    setHighlightedAA(prev => (prev === data?.aa ? null : data?.aa));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedCodon(null);
    setHighlightedAA(null);
  }, []);

  const isCodonVisible = useCallback((codon) => {
    const data = CODON_MAP[codon];
    if (filterMode === 'all')   return true;
    if (filterMode === 'start') return data?.type === 'start';
    if (filterMode === 'stop')  return data?.type === 'stop';
    return true;
  }, [filterMode]);

  const isCodonHighlighted = useCallback((codon) => {
    const data = CODON_MAP[codon];
    return highlightedAA !== null && data?.aa === highlightedAA;
  }, [highlightedAA]);

  return (
    <article id="tool-codon" className="tool-card tool-card--wide active ct-root">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="ct-header">
        
        {/* Title & Filter Bar on same line */}
        <div className="ct-header-top">
          <h2 className="ct-title">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.5 10.5C7.5 4.5 16.5 4.5 19.5 10.5C16.5 16.5 7.5 16.5 4.5 10.5Z"/>
              <path d="M4.5 10.5C7.5 16.5 16.5 16.5 19.5 10.5C16.5 4.5 7.5 4.5 4.5 10.5Z"/>
              <line x1="8" y1="7" x2="8" y2="14"/><line x1="12" y1="5.5" x2="12" y2="15.5"/><line x1="16" y1="7" x2="16" y2="14"/>
            </svg>
            RNA Codon Table
          </h2>

          {/* Filter Buttons */}
          <div className="ct-filter-bar" role="group" aria-label="Filter codons">
            {[
              { key: 'all',   label: 'All Codons' },
              { key: 'start', label: '★ Start' },
              { key: 'stop',  label: '■ Stop' },
            ].map(({ key, label }) => (
              <button
                key={key}
                id={`ct-filter-${key}`}
                className={`ct-filter-btn ct-filter-btn--${key} ${filterMode === key ? 'is-active' : ''}`}
                onClick={() => setFilterMode(prev => prev === key ? 'all' : key)}
                aria-pressed={filterMode === key}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle & Legend on same line below */}
        <div className="ct-subtitle-row">
          <p className="ct-subtitle">
            Click any codon or amino acid to explore synonyms, properties, and base positions.
          </p>
          <div className="ct-legend" role="note" aria-label="Legend">
            <span className="ct-legend-item ct-legend-item--start">★ Start Codon</span>
            <span className="ct-legend-item ct-legend-item--stop">■ Stop Codon</span>
            <span className="ct-legend-item ct-legend-item--highlight">Highlighted = same amino acid</span>
          </div>
        </div>

      </div>


      {/* ── Workspace: Table + Details Side-by-Side ────────────────── */}
      <div className="ct-workspace">
        <div className="ct-table-container">
          {/* ── Axis Labels + Grid ────────────────────────────────────── */}
          <div className="ct-outer-grid">

            {/* Left axis: "First Codon" vertical label */}
            <div className="ct-axis-label ct-axis-label--left" aria-label="First codon position">
              <span>First Codon (5')</span>
            </div>

            {/* Top axis: "Second Codon" horizontal label */}
            <div className="ct-axis-label ct-axis-label--top" aria-label="Second codon position">
              <span>Second Codon</span>
            </div>

            {/* Right axis: "Third Codon" vertical label */}
            <div className="ct-axis-label ct-axis-label--right" aria-label="Third codon position">
              <span>Third Codon (3')</span>
            </div>

            {/* Inner: top axis + table */}
            <div className="ct-inner-wrapper">

              {/* Top axis: Second Base */}
              <div className="ct-axis-top" role="row">
                <div className="ct-axis-corner"></div>
                {SECOND_BASES.map(b2 => (
                  <div key={b2} className={`ct-axis-cell ct-axis-cell--2nd ct-base-col-${b2}`} role="columnheader">
                    <span className={`ct-axis-base ct-base-${b2}`}>{b2}</span>
                  </div>
                ))}
                <div className="ct-axis-corner"></div>
              </div>

              {/* Main table body */}
              <div className="ct-table-body">

                {/* Right axis: Third Base — one row per third-base letter, aligned via grid */}
                <div className="ct-axis-right-container" aria-label="Third base in codon">
                  {THIRD_BASES.map(b3 => (
                    <div key={b3} className={`ct-axis-cell ct-axis-cell--3rd ct-base-row-${b3}`} role="rowheader">
                      <span className={`ct-axis-base ct-base-${b3}`}>{b3}</span>
                    </div>
                  ))}
                </div>

                {BASES.map(b1 => (
                  <div key={b1} className={`ct-row-group ct-b1-${b1}`} role="rowgroup">

                    {/* Left row header: first base letter */}
                    <div className={`ct-row-header ct-base-${b1}`} role="rowheader" aria-label={`First base: ${b1}`}>
                      <span>{b1}</span>
                    </div>

                    {/* 4 columns (second base) × 4 rows (third base) */}
                    <div className="ct-row-cells">
                      {SECOND_BASES.map(b2 => {
                        const cellCodons = THIRD_BASES.map(b3 => `${b1}${b2}${b3}`);
                        // Find the group of consecutive identical AAs to render a shared label
                        const aaGroups = [];
                        cellCodons.forEach((codon, idx) => {
                          const aa = CODON_MAP[codon]?.aa;
                          const last = aaGroups[aaGroups.length - 1];
                          if (last && last.aa === aa && CODON_MAP[codon]?.type === last.type) {
                            last.codons.push(codon);
                          } else {
                            aaGroups.push({ aa, type: CODON_MAP[codon]?.type, codons: [codon], startIdx: idx });
                          }
                        });

                        return (
                          <div key={b2} className={`ct-cell ct-cell-b2-${b2}`} role="group" aria-label={`${b1}${b2}x group`}>
                            {cellCodons.map((codon, rowIdx) => {
                              const isHidden = !isCodonVisible(codon);
                              return (
                                <div
                                  key={codon}
                                  className={`ct-codon-row ${isHidden ? 'ct-hidden' : ''}`}
                                  role="row"
                                >
                                  <CodonButton
                                    codon={codon}
                                    isSelected={selectedCodon === codon}
                                    isHighlighted={isCodonHighlighted(codon)}
                                    onSelect={handleSelectCodon}
                                  />
                                </div>
                              );
                            })}

                            {/* AA labels — one per consecutive group, vertically centered */}
                            <div className="ct-aa-labels" aria-label={`Amino acids for ${b1}${b2}x`}>
                              {aaGroups.map((group, gi) => (
                                <div
                                  key={gi}
                                  className="ct-aa-label-slot"
                                  style={{ gridRow: `${group.startIdx + 1} / span ${group.codons.length}` }}
                                >
                                  <AminoAcidButton
                                    codon={group.codons[0]}
                                    isHighlighted={highlightedAA === group.aa}
                                    onSelect={handleSelectCodon}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Repeating right axis per row group: U C A G */}
                    <div className="ct-row-right-axis">
                      {THIRD_BASES.map(b3 => (
                        <div key={b3} className={`ct-axis-cell ct-axis-cell--3rd-inline ct-base-${b3}`}>
                          <span>{b3}</span>
                        </div>
                      ))}
                    </div>

                  </div>
                ))}

              </div>

              {/* Bottom axis: Second Base (repeated) */}
              <div className="ct-axis-bottom" role="row" aria-hidden="true">
                <div className="ct-axis-corner"></div>
                {SECOND_BASES.map(b2 => (
                  <div key={b2} className={`ct-axis-cell ct-axis-cell--2nd ct-base-col-${b2}`}>
                    <span className={`ct-axis-base ct-base-${b2}`}>{b2}</span>
                  </div>
                ))}
                <div className="ct-axis-corner"></div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Info Panel Sidebar ───────────────────────────────────── */}
        <div className="ct-side-panel" ref={panelRef}>
          {selectedCodon ? (
            <InfoPanel codon={selectedCodon} onClose={handleClearSelection} />
          ) : (
            <div className="ct-no-selection" aria-live="polite">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Select a codon above to view detailed information
            </div>
          )}
        </div>
      </div>


    </article>
  );
}
