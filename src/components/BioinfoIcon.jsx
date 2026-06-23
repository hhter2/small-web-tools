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
      {/* Biological Strand (Organic smooth sine curve) */}
      <path d="M8 3c0 2.5 8 3.5 8 6s-8 3.5-8 6 8 3.5 8 6" />

      {/* Computational Strand & Rungs (Sharp square wave representing a digital signal) */}
      <path d="M16 3H8v9h8v6H8v6h8" />

      {/* Digital Data Blocks (Rounded squares at the corners) */}
      <rect x="6.5" y="1.5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="14.5" y="1.5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="6.5" y="7.5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="14.5" y="7.5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="6.5" y="13.5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="14.5" y="13.5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="6.5" y="19.5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="14.5" y="19.5" width="3" height="3" rx="0.5" fill={color} stroke="none" />

      {/* Network Data Nodes (Circles on the digital backbone) */}
      <circle cx="8" cy="6" r="1.5" fill={color} stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill={color} stroke="none" />
      <circle cx="8" cy="18" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}
