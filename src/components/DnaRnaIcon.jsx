import React from 'react';

export default function DnaRnaIcon({ size = 24, color = 'currentColor', className = '', ...props }) {
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
      {/* Strand A (Smooth sinusoidal curve) */}
      <path d="M8 3c0 2.5 8 3.5 8 6s-8 3.5-8 6 8 3.5 8 6" />

      {/* Strand B (Intertwining smooth sinusoidal curve) */}
      <path d="M16 3c0 2.5-8 3.5-8 6s8 3.5 8 6-8 3.5-8 6" />

      {/* Horizontal Rungs (Base pairs connecting the strands) */}
      <line x1="8" y1="3" x2="16" y2="3" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="15" x2="16" y2="15" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}
