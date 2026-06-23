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
      {/* Biological Strand (Organic smooth curve representing DNA) */}
      <path d="M8 3c0 2.5 8 3.5 8 6s-8 3.5-8 6 8 3.5 8 6" />

      {/* Computational Strand (Low-poly/straight-segmented network path) */}
      <path d="M16 3L8 9l8 6-8 6" />

      {/* Network Rungs (Dashed lines representing digital connections) */}
      <line x1="8" y1="3" x2="16" y2="3" strokeDasharray="2 2" />
      <line x1="8" y1="9" x2="16" y2="9" strokeDasharray="2 2" />
      <line x1="8" y1="15" x2="16" y2="15" strokeDasharray="2 2" />
      <line x1="8" y1="21" x2="16" y2="21" strokeDasharray="2 2" />

      {/* Data Nodes (Filled circles representing digital nodes) */}
      <circle cx="16" cy="3" r="1.5" fill={color} stroke="none" />
      <circle cx="12" cy="6" r="1.5" fill={color} stroke="none" />
      <circle cx="8" cy="9" r="1.5" fill={color} stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
      <circle cx="16" cy="15" r="1.5" fill={color} stroke="none" />
      <circle cx="12" cy="18" r="1.5" fill={color} stroke="none" />
      <circle cx="8" cy="21" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}
