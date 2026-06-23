import React, { useState } from 'react';

const categories = [
  {
    id: 'text',
    name: 'Text',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  },
  {
    id: 'calculation',
    name: 'Calculation',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
        <line x1="9" y1="9" x2="15" y2="15"></line>
        <line x1="15" y1="9" x2="9" y2="15"></line>
      </svg>
    )
  },
  {
    id: 'developer',
    name: 'Developer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    )
  },
  {
    id: 'network',
    name: 'Network',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    )
  },
  {
    id: 'media',
    name: 'Media',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    )
  },
  {
    id: 'bioinfo',
    name: 'Bioinfo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 10.5C7.5 4.5 16.5 4.5 19.5 10.5C16.5 16.5 7.5 16.5 4.5 10.5Z"></path>
        <path d="M4.5 10.5C7.5 16.5 16.5 16.5 19.5 10.5C16.5 4.5 7.5 4.5 4.5 10.5Z"></path>
        <line x1="8" y1="7" x2="8" y2="14"></line>
        <line x1="12" y1="5.5" x2="12" y2="15.5"></line>
        <line x1="16" y1="7" x2="16" y2="14"></line>
      </svg>
    )
  },
  {
    id: 'utilities',
    name: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="2" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M16.24 7.76l-8.48 8.48"></path>
        <path d="M7.76 7.76l8.48 8.48"></path>
      </svg>
    )
  }
];

export default function HomeGrid({ onSelectTool, activeTab = 'all', setActiveTab }) {

  const tools = [
    {
      id: 'tool-slash',
      title: 'Slashes Converter',
      category: 'developer',
      desc: 'Normalize Windows paths to web-friendly forward slashes.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="18" x2="18" y2="6"></line>
          <line x1="6" y1="6" x2="18" y2="18" strokeDasharray="2 2"></line>
        </svg>
      )
    },
    {
      id: 'tool-wc',
      title: 'Word Counter',
      category: 'text',
      desc: 'Calculate words, character lengths, and line endings in real time.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/>
        </svg>
      )
    },
    {
      id: 'tool-typing',
      title: 'Typing Speed Test',
      category: 'text',
      desc: 'Measure your typing speed and accuracy in English or Chinese with custom templates and real-time statistics.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
          <line x1="6" y1="8" x2="6.01" y2="8"></line>
          <line x1="10" y1="8" x2="10.01" y2="8"></line>
          <line x1="14" y1="8" x2="14.01" y2="8"></line>
          <line x1="18" y1="8" x2="18.01" y2="8"></line>
          <line x1="6" y1="12" x2="6.01" y2="12"></line>
          <line x1="10" y1="12" x2="10.01" y2="12"></line>
          <line x1="14" y1="12" x2="14.01" y2="12"></line>
          <line x1="18" y1="12" x2="18.01" y2="12"></line>
          <line x1="7" y1="16" x2="17" y2="16"></line>
        </svg>
      )
    },
    {
      id: 'tool-date',
      title: 'Date Counter',
      category: 'calculation',
      desc: 'Calculate the exact number of days between two specified dates.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      )
    },
    {
      id: 'tool-currency',
      title: 'Currency Converter & Counter',
      category: 'calculation',
      desc: 'Convert global currencies (e.g. TWD to USD) for single amounts or bulk lists.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      )
    },
    {
      id: 'tool-color',
      title: 'Color Converter',
      category: 'media',
      desc: 'Seamlessly translate colors between HEX, RGB, and HSL formats.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.03347 19.1749 5.2751 19.2612 5.51862 19.2319C6.27318 19.141 7.00947 19.4674 7.48528 20.0827L7.91508 20.6384C8.42392 21.2963 9.17646 21.7371 10.0152 21.8906C10.6698 22.0104 11.3343 22.0469 12 22Z"></path>
          <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"></circle>
          <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"></circle>
          <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"></circle>
          <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor"></circle>
        </svg>
      )
    },
    {
      id: 'tool-ascii',
      title: 'ASCII Converter',
      category: 'developer',
      desc: 'Convert text characters to their ASCII codes and vice versa.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      )
    },
    {
      id: 'tool-unicode',
      title: 'Unicode Converter',
      category: 'developer',
      desc: 'Encode text to Unicode code points or decode raw code points.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      )
    },
    {
      id: 'tool-base',
      title: 'Base Converter',
      category: 'developer',
      desc: 'Convert numbers between binary, octal, decimal, hex, and base-60.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="9" x2="20" y2="9"></line>
          <line x1="4" y1="15" x2="20" y2="15"></line>
          <line x1="9" y1="4" x2="9" y2="20"></line>
          <line x1="15" y1="4" x2="15" y2="20"></line>
        </svg>
      )
    },
    {
      id: 'tool-dna',
      title: 'DNA/RNA Converter',
      category: 'bioinfo',
      desc: "Complements, reverses, and swaps 5'/3' strand sequence orientations.",
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 10.5C7.5 4.5 16.5 4.5 19.5 10.5C16.5 16.5 7.5 16.5 4.5 10.5Z"></path>
          <path d="M4.5 10.5C7.5 16.5 16.5 16.5 19.5 10.5C16.5 4.5 7.5 4.5 4.5 10.5Z"></path>
          <line x1="8" y1="7" x2="8" y2="14"></line>
          <line x1="12" y1="5.5" x2="12" y2="15.5"></line>
          <line x1="16" y1="7" x2="16" y2="14"></line>
        </svg>
      )
    },
    {
      id: 'tool-codon',
      title: 'RNA Codon Table',
      category: 'bioinfo',
      desc: 'Interactive standard genetic code table — click any codon or amino acid to explore synonyms and properties.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="3" y1="15" x2="21" y2="15"></line>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="15" y1="3" x2="15" y2="21"></line>
        </svg>
      )
    },
    {
      id: 'tool-iplookup',
      title: 'IP Lookup',
      category: 'network',
      desc: 'Geolocate, identify ISP, timezone, and coordinates for any IP address.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      )
    },
    {
      id: 'tool-speedtest',
      title: 'Network Speed Test',
      category: 'network',
      desc: 'Test your network latency (ping) and download speed in real-time.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      )
    },
    {
      id: 'tool-imgmeta',
      title: 'ImgMeta',
      category: 'media',
      desc: 'Locally analyze metadata, camera model, and GPS details of images.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      )
    },
    {
      id: 'tool-wheel',
      title: 'Random Wheel',
      category: 'utilities',
      desc: 'Spin the customizable wheel to draw random items with elimination.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="2" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M16.24 7.76l-8.48 8.48"></path>
          <path d="M7.76 7.76l8.48 8.48"></path>
        </svg>
      )
    },
    {
      id: 'tool-qrbarcode',
      title: 'QR & Barcode Generator',
      category: 'utilities',
      desc: 'Generate styled QR codes with embedded logos and standardized barcodes.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <rect x="7" y="7" width="3" height="3"></rect>
          <rect x="14" y="7" width="3" height="3"></rect>
          <rect x="7" y="14" width="3" height="3"></rect>
        </svg>
      )
    },
    {
      id: 'tool-password',
      title: 'Secure Password Generator',
      category: 'utilities',
      desc: 'Generate cryptographically secure random passwords using CSPRNG and unbiased rejection sampling.',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      )
    }
  ];

  return (
    <article id="tool-home" className="tool-card tool-card--wide active">
      <h2>Select a Utility Tool</h2>

      {/* Category filter tabs */}
      <div className="home-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`tab-btn ${activeTab === cat.id ? 'active' : ''}`}
            onClick={() => setActiveTab(cat.id)}
          >
            {cat.icon}
            {cat.name}
          </button>
        ))}
      </div>

      {activeTab === 'all' ? (
        /* Render sections grouped by category */
        categories.map(cat => {
          const catTools = tools.filter(t => t.category === cat.id);
          if (catTools.length === 0) return null;
          return (
            <div key={cat.id} className="home-category-section">
              <h3 className="home-category-heading">
                {cat.icon}
                {cat.name}
              </h3>
              <div className="home-grid">
                {catTools.map(tool => (
                  <div key={tool.id} className="home-card" onClick={() => onSelectTool(tool.id)}>
                    <div className="home-card-icon">{tool.icon}</div>
                    <h3>{tool.title}</h3>
                    <p>{tool.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        /* Render filtered grid for active category */
        <div className="home-grid">
          {tools
            .filter(t => t.category === activeTab)
            .map(tool => (
              <div key={tool.id} className="home-card" onClick={() => onSelectTool(tool.id)}>
                <div className="home-card-icon">{tool.icon}</div>
                <h3>{tool.title}</h3>
                <p>{tool.desc}</p>
              </div>
            ))}
        </div>
      )}
    </article>
  );
}
