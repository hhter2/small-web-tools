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
function CodonButton({ codon, isSelected, isHighlighted, isDimmed, onSelect }) {
  const data       = CODON_MAP[codon];
  const triggerRipple = useRipple();
  const cls = [
    'ct-codon-btn',
    codonClass(codon),
    isSelected    ? 'is-selected'    : '',
    isHighlighted ? 'is-highlighted' : '',
    isDimmed      ? 'is-dimmed'      : '',
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
function AminoAcidButton({ codon, isHighlighted, isDimmed, onSelect }) {
  const data = CODON_MAP[codon];
  const triggerRipple = useRipple();
  if (!data) return null;

  const aaColor = AA_COLORS[data.aa];
  let cls = 'ct-aa-btn';
  if (data.type === 'start') cls += ' ct-aa-start';
  else if (data.type === 'stop') cls += ' ct-aa-stop';
  if (isHighlighted) cls += ' is-highlighted';
  if (isDimmed) cls += ' is-dimmed';

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
function FischerProjection({ aa, customGroups = [] }) {
  const details = AMINO_ACID_DETAILS[aa];
  if (!details) return null;

  const baseHeight = FISCHER_HEIGHTS[aa] || 135;
  const width = Math.round(160 * 1.2);
  const height = Math.round(baseHeight * 1.2);

  // Match standard group names
  const matchedStd = Object.values(AA_GROUPS)
    .filter(grp => grp.aas.includes(aa))
    .map(grp => grp.name);

  // Match custom group names
  const matchedCustom = customGroups
    .filter(grp => grp.aas.includes(aa))
    .map(grp => grp.name);

  const allMatched = [...matchedStd, ...matchedCustom];
  const groupText = allMatched.length > 0 ? allMatched.join(', ') : details.type;

  return (
    <div className="ct-fischer-container">
      <span className="ct-fischer-title">Fischer Projection (L-Form)</span>
      <div className="ct-fischer-layout">
        <svg className="ct-fischer-svg" width={width} height={height} viewBox={`0 0 160 ${baseHeight}`}>
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
            <span className="ct-fisc-val">{groupText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Biochemical Group Mapping for Amino Acids
const AA_GROUPS = {
  hydrophobic: {
    name: 'Hydrophobic',
    class: 'grp-hydrophobic',
    aas: ['Phe', 'Leu', 'Ile', 'Met', 'Val', 'Pro', 'Ala', 'Trp', 'Gly']
  },
  polar: {
    name: 'Polar Uncharged',
    class: 'grp-polar',
    aas: ['Ser', 'Thr', 'Tyr', 'Gln', 'Asn', 'Cys']
  },
  basic: {
    name: 'Basic (+)',
    class: 'grp-basic',
    aas: ['His', 'Lys', 'Arg']
  },
  acidic: {
    name: 'Acidic (-)',
    class: 'grp-acidic',
    aas: ['Asp', 'Glu']
  },
  aliphatic: {
    name: 'Aliphatic R Groups',
    class: 'grp-aliphatic',
    aas: ['Gly', 'Ala', 'Val', 'Leu', 'Ile', 'Pro']
  },
  aromatic: {
    name: 'Aromatic R Groups',
    class: 'grp-aromatic',
    aas: ['Phe', 'Tyr', 'Trp']
  },
  sulfur: {
    name: 'Sulfur',
    class: 'grp-sulfur',
    aas: ['Met', 'Cys']
  },
  alcohol: {
    name: 'Alcohol',
    class: 'grp-alcohol',
    aas: ['Ser', 'Thr']
  },
  amide: {
    name: 'Amide Derivatives',
    class: 'grp-amide',
    aas: ['Asn', 'Gln']
  },
  nonpolar: {
    name: 'Non polar',
    class: 'grp-nonpolar',
    aas: ['Gly', 'Ala', 'Val', 'Leu', 'Ile', 'Phe', 'Trp', 'Pro', 'Met']
  }
};

function getAAGroupKey(aa) {
  for (const [key, group] of Object.entries(AA_GROUPS)) {
    if (group.aas.includes(aa)) return key;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// InfoPanel — detail card for selected codon
// ─────────────────────────────────────────────────────────────────────────────
function InfoPanel({
  typedCodon,
  selectedCodon,
  selectedGroup,
  setSelectedGroup,
  customGroups,
  highlightedAA,
  setHighlightedAA,
  isCreatingGroup,
  setIsCreatingGroup,
  newGroupName,
  setNewGroupName,
  newGroupAAs,
  setNewGroupAAs,
  newGroupColor,
  setNewGroupColor,
  onType,
  onClear,
  inputRef,
  handleDeleteCustomGroup,
  handleToggleAAInNewGroup,
  handleCreateCustomGroup,
  setSelectedCodon
}) {
  const codon = selectedCodon || (typedCodon.length === 3 ? typedCodon : null);
  const data = codon ? CODON_MAP[codon] : null;

  const synonyms = data ? Object.keys(CODON_MAP).filter(
    c => CODON_MAP[c].aa === data.aa && c !== codon
  ) : [];

  const bgClass = data
    ? (data.type === 'start'
      ? 'ct-panel--start'
      : data.type === 'stop'
      ? 'ct-panel--stop'
      : 'ct-panel--normal')
    : 'ct-panel--empty';

  const handleCardClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const activeGroup = selectedGroup.startsWith('custom-')
    ? customGroups[parseInt(selectedGroup.split('-')[1], 10)]
    : AA_GROUPS[selectedGroup];

  const activeGroupColor = activeGroup ? activeGroup.color || 'var(--accent)' : '';

  return (
    <div className="ct-sidebar-container">
      
      {/* ── Filter by Groups Block ────────────────── */}
      <div className="ct-sidebar-group-panel">
        <span className="ct-section-title">Filter by Group</span>
        <div className="ct-group-wrapper">
          
          <div className="ct-group-dropdown-row">
            <select
              value={selectedGroup}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedGroup(val);
                setHighlightedAA(null);
                setSelectedCodon(null);
              }}
              className="ct-group-dropdown"
              style={{
                borderLeft: activeGroupColor ? `4px solid ${activeGroupColor}` : '1px solid var(--border-color)',
                paddingLeft: activeGroupColor ? '0.5rem' : '0.75rem'
              }}
            >
              <option value="all">All Groups</option>
              <optgroup label="Standard Groups">
                {Object.entries(AA_GROUPS).map(([key, grp]) => (
                  <option key={key} value={key}>{grp.name}</option>
                ))}
              </optgroup>
              {customGroups.length > 0 && (
                <optgroup label="Custom Groups">
                  {customGroups.map((grp, idx) => (
                    <option key={`custom-${idx}`} value={`custom-${idx}`}>
                      {grp.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <div className="ct-group-control-btns">
              {selectedGroup.startsWith('custom-') && (
                <button
                  type="button"
                  className="ct-dropdown-action-btn ct-btn-delete"
                  onClick={() => handleDeleteCustomGroup(parseInt(selectedGroup.split('-')[1], 10))}
                  title="Delete active custom group"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                className={`ct-dropdown-action-btn ${isCreatingGroup ? 'is-active' : ''}`}
                onClick={() => setIsCreatingGroup(prev => !prev)}
              >
                {isCreatingGroup ? 'Close' : '+ Custom'}
              </button>
            </div>
          </div>

          {/* Custom Group Creator Panel */}
          {isCreatingGroup && (
            <div className="ct-custom-creator-panel">
              <span className="ct-creator-title">Create Custom Group</span>
              <div className="ct-creator-form">
                
                {/* Name Input */}
                <div className="ct-creator-field">
                  <label className="ct-creator-label">Group Name</label>
                  <input
                    type="text"
                    className="ct-creator-input"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. My Favorite AAs"
                    maxLength={20}
                  />
                </div>

                {/* Color Picker */}
                <div className="ct-creator-field">
                  <label className="ct-creator-label">Label Color</label>
                  <div className="ct-creator-colors">
                    {[
                      '#d97706', '#e11d48', '#059669', '#4f46e5', '#ea580c', '#06b6d4', '#db2777'
                    ].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`ct-color-circle ${newGroupColor === color ? 'is-selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewGroupColor(color)}
                      />
                    ))}
                  </div>
                </div>

                {/* Amino Acid Selector Grid */}
                <div className="ct-creator-field">
                  <label className="ct-creator-label">Select Amino Acids ({newGroupAAs.length} chosen)</label>
                  <div className="ct-creator-aa-grid">
                    {Object.keys(AMINO_ACID_DETAILS).map(aa => {
                      const isChosen = newGroupAAs.includes(aa);
                      const aaColor = AA_COLORS[aa] || 'var(--accent)';
                      const representativeCodon = Object.keys(CODON_MAP).find(c => CODON_MAP[c].aa === aa);
                      const oneLetter = representativeCodon ? (CODON_MAP[representativeCodon]?.abbr || '') : '';
                      return (
                        <button
                          key={aa}
                          type="button"
                          className={`ct-creator-aa-btn ${isChosen ? 'is-chosen' : ''}`}
                          style={{
                            borderColor: isChosen ? aaColor : 'var(--border-color)',
                            backgroundColor: isChosen ? `${aaColor}15` : 'transparent',
                            color: isChosen ? 'var(--text-main)' : 'var(--text-muted)'
                          }}
                          onClick={() => handleToggleAAInNewGroup(aa)}
                        >
                          <span className="ct-creator-aa-code" style={{ color: aaColor, fontWeight: 'bold' }}>{aa}</span>
                          <span className="ct-creator-aa-letter">[{oneLetter}]</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="ct-creator-actions">
                  <button
                    type="button"
                    className="ct-creator-btn-save"
                    onClick={handleCreateCustomGroup}
                    disabled={!newGroupName.trim() || newGroupAAs.length === 0}
                  >
                    Save Group
                  </button>
                  <button
                    type="button"
                    className="ct-creator-btn-cancel"
                    onClick={() => {
                      setIsCreatingGroup(false);
                      setNewGroupName('');
                      setNewGroupAAs([]);
                    }}
                  >
                    Cancel
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* AA chips in active group */}
          {selectedGroup !== 'all' && activeGroup && (
            <div className="ct-group-chips-wrapper">
              <span className="ct-chips-label">Amino acids in group:</span>
              <div className="ct-group-chips">
                {activeGroup.aas.map(aa => {
                  const isSelected = highlightedAA === aa;
                  const aaColor = AA_COLORS[aa] || 'var(--accent)';
                  const firstCodon = Object.keys(CODON_MAP).find(c => CODON_MAP[c].aa === aa);
                  const oneLetter = firstCodon ? (CODON_MAP[firstCodon]?.abbr || '') : '';
                  return (
                    <button
                      key={aa}
                      className={`ct-aa-chip ${isSelected ? 'is-selected' : ''}`}
                      style={{
                        '--aa-chip-color': aaColor,
                        borderColor: isSelected ? aaColor : 'var(--border-color)',
                        color: isSelected ? '#ffffff' : 'var(--text-main)',
                        backgroundColor: isSelected ? aaColor : 'rgba(255, 255, 255, 0.03)'
                      }}
                      onClick={() => {
                        setHighlightedAA(prev => {
                          const next = prev === aa ? null : aa;
                          if (next) {
                            if (firstCodon) setSelectedCodon(firstCodon);
                          } else {
                            setSelectedCodon(null);
                            setSelectedGroup('all'); // Clear selection -> show all!
                          }
                          return next;
                        });
                      }}
                    >
                      <span className="ct-aa-chip-abbr">{aa}</span>
                      <span className="ct-aa-chip-full">[{oneLetter}]</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Codon Lookup Block ────────────────── */}
      <div className={`ct-info-panel ${bgClass}`} role="status" aria-live="polite">
        
        {/* Hidden input for capturing keys */}
        <input
          ref={inputRef}
          type="text"
          className="ct-typer-input-hidden"
          value={typedCodon}
          onChange={(e) => onType(e.target.value)}
          placeholder="Type codon"
          aria-label="Type codon code"
        />

        {/* Header section */}
        <div className="ct-panel-header-merged">
          {data ? (
            <>
              <div className="ct-panel-header-title">
                <span className="ct-panel-aa">{data.full}</span>
                {data.aa !== 'Stop' && (
                  <>
                    <span className="ct-panel-abbr-badge">{data.aa}</span>
                    <span className="ct-panel-abbr-badge">{data.abbr}</span>
                  </>
                )}
                {data.type === 'start' && <span className="ct-badge ct-badge--start">START ★</span>}
                {data.type === 'stop'  && <span className="ct-badge ct-badge--stop">STOP ■</span>}
              </div>
              <button className="ct-panel-close" onClick={onClear} aria-label="Clear selection">✕</button>
            </>
          ) : (
            <>
              <span className="ct-panel-title-empty">Codon Lookup</span>
              {typedCodon.length > 0 && (
                <button className="ct-panel-close" onClick={onClear} aria-label="Clear typing">✕</button>
              )}
            </>
          )}
        </div>

        {/* The 3 passcode typing cards */}
        <div className="ct-typer-cards-row ct-typer-cards-row--sidebar">
          {['1ST', '2ND', '3RD'].map((posName, idx) => {
            const char = typedCodon[idx] || '';
            const isActive = typedCodon.length === idx;
            const charColorClass = char ? `ct-base-${char}` : '';
            return (
              <div
                key={idx}
                className={`ct-typer-card ${isActive ? 'is-active' : ''} ${char ? 'has-value' : ''}`}
                onClick={handleCardClick}
                title="Click to type codon (U, C, A, G)"
              >
                <span className="ct-typer-card-pos">{posName}</span>
                <span className={`ct-typer-card-val ${charColorClass}`}>
                  {char || '—'}
                  {isActive && <span className="ct-typer-cursor"></span>}
                </span>
              </div>
            );
          })}
        </div>

        {/* Display result/prompt depending on state */}
        {data ? (
          <div className="ct-panel-details-scroll">
            {/* Synonymous codons */}
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

            {/* Fischer Projection */}
            {data.aa !== 'Stop' && (
              <FischerProjection aa={data.aa} customGroups={customGroups} />
            )}
          </div>
        ) : (
          <div className="ct-panel-prompt">
            {typedCodon.length > 0 ? (
              <span className="ct-result-prompt">
                Type {3 - typedCodon.length} more {3 - typedCodon.length === 1 ? 'base' : 'bases'} (U, C, A, G)...
              </span>
            ) : (
              <span className="ct-result-placeholder">
                Click cards above to type a codon sequence (e.g. UAU, AUG) or select a codon from the table.
              </span>
            )}
          </div>
        )}

      </div>

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
  const [typedCodon,       setTypedCodon]       = useState('');
  const [selectedGroup,    setSelectedGroup]    = useState('all'); // 'all' | 'hydrophobic' | 'polar' | 'basic' | 'acidic' ...
  const [customGroups,     setCustomGroups]     = useState(() => {
    try {
      const saved = localStorage.getItem('ct-custom-groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCreatingGroup,  setIsCreatingGroup]  = useState(false);
  const [newGroupName,     setNewGroupName]     = useState('');
  const [newGroupAAs,      setNewGroupAAs]      = useState([]);
  const [newGroupColor,    setNewGroupColor]    = useState('#d97706'); // Default gold

  const panelRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll panel into view when codon selected
  useEffect(() => {
    if (selectedCodon && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedCodon]);

  // Sync selectedCodon to typedCodon
  useEffect(() => {
    if (selectedCodon) {
      setTypedCodon(selectedCodon);
    } else {
      // Don't clear typedCodon if it's partially typed (we want to let the user keep typing)
      if (typedCodon.length === 3) {
        setTypedCodon('');
      }
    }
  }, [selectedCodon]);

  // Persist custom groups
  useEffect(() => {
    localStorage.setItem('ct-custom-groups', JSON.stringify(customGroups));
  }, [customGroups]);

  const handleSelectCodon = useCallback((codon) => {
    const data = CODON_MAP[codon];
    if (!data) return;

    setSelectedCodon(prev => {
      const isSame = prev === codon;
      if (isSame) {
        // Deselecting: clear highlighted amino acid and reset group filter to show all
        setHighlightedAA(null);
        setSelectedGroup('all');
        return null;
      } else {
        // Selecting: highlight amino acid and show its corresponding biochemical group
        setHighlightedAA(data.aa);
        const grpKey = getAAGroupKey(data.aa);
        if (grpKey) {
          setSelectedGroup(grpKey);
        }
        return codon;
      }
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedCodon(null);
    setHighlightedAA(null);
    setTypedCodon('');
  }, []);

  const handleTypeCodon = (val) => {
    const sanitized = val.toUpperCase().replace(/T/g, 'U').replace(/[^UCAG]/g, '').slice(0, 3);
    setTypedCodon(sanitized);

    if (sanitized.length === 3) {
      if (CODON_MAP[sanitized]) {
        setSelectedCodon(sanitized);
        setHighlightedAA(CODON_MAP[sanitized].aa);
        const grpKey = getAAGroupKey(CODON_MAP[sanitized].aa);
        if (grpKey) setSelectedGroup(grpKey);
      }
    } else {
      setSelectedCodon(null);
      setHighlightedAA(null);
    }
  };

  const handleCardClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleToggleAAInNewGroup = (aa) => {
    setNewGroupAAs(prev => 
      prev.includes(aa) ? prev.filter(item => item !== aa) : [...prev, aa]
    );
  };

  const handleCreateCustomGroup = () => {
    if (!newGroupName.trim() || newGroupAAs.length === 0) return;
    const newGroup = {
      name: newGroupName.trim(),
      color: newGroupColor,
      aas: newGroupAAs
    };
    setCustomGroups(prev => [...prev, newGroup]);
    setSelectedGroup(`custom-${customGroups.length}`);
    // Clear and close
    setNewGroupName('');
    setNewGroupAAs([]);
    setIsCreatingGroup(false);
  };

  const handleDeleteCustomGroup = (indexToDelete) => {
    setCustomGroups(prev => prev.filter((_, idx) => idx !== indexToDelete));
    if (selectedGroup === `custom-${indexToDelete}`) {
      setSelectedGroup('all');
      setHighlightedAA(null);
    } else if (selectedGroup.startsWith('custom-')) {
      const activeIdx = parseInt(selectedGroup.split('-')[1], 10);
      if (activeIdx > indexToDelete) {
        setSelectedGroup(`custom-${activeIdx - 1}`);
      } else if (activeIdx === indexToDelete) {
        setSelectedGroup('all');
        setHighlightedAA(null);
      }
    }
  };

  const isCodonVisible = useCallback((codon) => {
    const data = CODON_MAP[codon];
    if (filterMode === 'all')   return true;
    if (filterMode === 'start') return data?.type === 'start';
    if (filterMode === 'stop')  return data?.type === 'stop';
    return true;
  }, [filterMode]);

  const isCodonHighlighted = useCallback((codon) => {
    if (typedCodon.length > 0) {
      return codon.startsWith(typedCodon);
    }
    const data = CODON_MAP[codon];
    if (!data) return false;

    // 1. If a specific AA is highlighted, highlight only that one
    if (highlightedAA !== null) {
      return data.aa === highlightedAA;
    }

    // 2. If a group is selected, highlight all AAs in that group
    if (selectedGroup !== 'all') {
      const activeGroup = selectedGroup.startsWith('custom-') 
        ? customGroups[parseInt(selectedGroup.split('-')[1], 10)]
        : AA_GROUPS[selectedGroup];
      
      return activeGroup && activeGroup.aas.includes(data.aa);
    }

    return false;
  }, [highlightedAA, typedCodon, selectedGroup, customGroups]);

  const isCodonDimmed = useCallback((codon) => {
    const data = CODON_MAP[codon];
    if (!data) return false;

    // 1. If filterMode is active (All / Start / Stop), use its visibility
    if (filterMode === 'start' && data.type !== 'start') return true;
    if (filterMode === 'stop' && data.type !== 'stop') return true;

    // 2. If typing search is active (partial or full), dim non-matching codons
    if (typedCodon.length > 0) {
      return !codon.startsWith(typedCodon);
    }

    // 3. If group filter is active, dim codons not in that group
    if (selectedGroup !== 'all') {
      const activeGroup = selectedGroup.startsWith('custom-') 
        ? customGroups[parseInt(selectedGroup.split('-')[1], 10)]
        : AA_GROUPS[selectedGroup];

      if (!activeGroup || !activeGroup.aas.includes(data.aa)) {
        return true;
      }
    }

    return false;
  }, [filterMode, selectedGroup, typedCodon, customGroups]);

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
                                    isDimmed={isCodonDimmed(codon)}
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
                                    isHighlighted={isCodonHighlighted(group.codons[0])}
                                    isDimmed={isCodonDimmed(group.codons[0])}
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
          <InfoPanel
            typedCodon={typedCodon}
            selectedCodon={selectedCodon}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            customGroups={customGroups}
            highlightedAA={highlightedAA}
            setHighlightedAA={setHighlightedAA}
            isCreatingGroup={isCreatingGroup}
            setIsCreatingGroup={setIsCreatingGroup}
            newGroupName={newGroupName}
            setNewGroupName={setNewGroupName}
            newGroupAAs={newGroupAAs}
            setNewGroupAAs={setNewGroupAAs}
            newGroupColor={newGroupColor}
            setNewGroupColor={setNewGroupColor}
            onType={handleTypeCodon}
            onClear={handleClearSelection}
            inputRef={inputRef}
            handleDeleteCustomGroup={handleDeleteCustomGroup}
            handleToggleAAInNewGroup={handleToggleAAInNewGroup}
            handleCreateCustomGroup={handleCreateCustomGroup}
            setSelectedCodon={setSelectedCodon}
          />
        </div>
      </div>


    </article>
  );
}
