import React from 'react';

export default function BioinfoIcon({ size = 24, color = 'currentColor', className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Code Brackets representing Informatics / Programming */}
      <polyline points="7 6 3 12 7 18" />
      <polyline points="17 6 21 12 17 18" />

      {/* DNA Double Helix representing Biology */}
      {/* Strand A */}
      <path d="M10 4c0 1.5 4 2.5 4 5s-4 3.5-4 6 4 3.5 4 5" />
      {/* Strand B */}
      <path d="M14 4c0 1.5-4 2.5-4 5s4 3.5 4 6-4 3.5-4 5" />

      {/* Horizontal Rungs (Base Pairs) */}
      <line x1="10" y1="4" x2="14" y2="4" />
      <line x1="10" y1="9" x2="14" y2="9" />
      <line x1="10" y1="15" x2="14" y2="15" />
      <line x1="10" y1="20" x2="14" y2="20" />

      {/* Data Nodes representing Genomics / Informatics */}
      <circle cx="12" cy="6.5" r="1.2" fill={color} stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill={color} stroke="none" />
      <circle cx="12" cy="17.5" r="1.2" fill={color} stroke="none" />
    </svg>
  );
}
