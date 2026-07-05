import React, { useState, useEffect } from 'react';
import HomeGrid from './components/HomeGrid.jsx';
import SlashesConverter from './components/SlashesConverter.jsx';
import CasingSwitcher from './components/CasingSwitcher.jsx';
import WordCounter from './components/WordCounter.jsx';
import DateCounter from './components/DateCounter.jsx';
import CurrencyCounter from './components/CurrencyCounter.jsx';
import ColorConverter from './components/ColorConverter.jsx';
import AsciiConverter from './components/AsciiConverter.jsx';
import UnicodeConverter from './components/UnicodeConverter.jsx';
import BaseConverter from './components/BaseConverter.jsx';
import DnaConverter from './components/DnaConverter.jsx';
import IpLookup from './components/IpLookup.jsx';
import ImgMeta from './components/ImgMeta.jsx';
import RandomWheel from './components/RandomWheel.jsx';
import TypingSpeedTest from './components/TypingSpeedTest.jsx';
import CodonTable from './components/CodonTable.jsx';
import NetworkSpeedTest from './components/NetworkSpeedTest.jsx';
import QrBarcodeGenerator from './components/QrBarcodeGenerator.jsx';
import PasswordGenerator from './components/PasswordGenerator.jsx';
import OfficeMeta from './components/OfficeMeta.jsx';
import BioinfoIcon from './components/BioinfoIcon.jsx';
import DnaRnaIcon from './components/DnaRnaIcon.jsx';
import WebsiteFontExtractor from './components/WebsiteFontExtractor.jsx';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v1.0.0';
const SHOW_CHANNEL_ALERT = typeof __SHOW_CHANNEL_ALERT__ !== 'undefined' ? __SHOW_CHANNEL_ALERT__ : false;
const APP_CHANNEL = typeof __APP_CHANNEL__ !== 'undefined' ? __APP_CHANNEL__ : '';

const toolDetails = {
  "tool-home": {
    title: "Dashboard",
    desc: "A premium dashboard of handy utility tools."
  },
  "tool-slash": {
    title: "Slashes Converter",
    desc: "Normalize Windows paths to web-friendly forward slashes."
  },
  "tool-casing": {
    title: "Casing Switcher",
    desc: "Convert text casing with combine-able switches: invert case, sentence case, specific terms, and title case."
  },
  "tool-wc": {
    title: "Word & Character Counter",
    desc: "Calculate words, character lengths, and line endings in real time."
  },
  "tool-date": {
    title: "Date Counter",
    desc: "Calculate the exact number of days between two specified dates."
  },
  "tool-currency": {
    title: "Currency Converter & Counter",
    desc: "Convert global currencies (e.g. TWD to USD) for single amounts or bulk lists."
  },
  "tool-color": {
    title: "Color Code Converter",
    desc: "Seamlessly translate colors between HEX, RGB, and HSL formats."
  },
  "tool-ascii": {
    title: "ASCII Converter",
    desc: "Convert text characters to their ASCII codes and vice versa."
  },
  "tool-unicode": {
    title: "Unicode Converter",
    desc: "Encode text to Unicode code points or decode raw code points to text."
  },
  "tool-base": {
    title: "Base Converter",
    desc: "Interconvert numbers between binary, octal, decimal, hexadecimal, and sexagesimal."
  },
  "tool-dna": {
    title: "DNA/RNA Direction Transfer",
    desc: "Perform sequence base complementation, reversing, and swap 5'/3' strand orientations."
  },
  "tool-iplookup": {
    title: "IP Address Lookup",
    desc: "Identify geographical location, timezone, ISP, and coordinates for any IP address."
  },
  "tool-imgmeta": {
    title: "ImgMeta",
    desc: "Extract and analyze EXIF, ICC, GPS, and custom camera metadata from image files locally."
  },
  "tool-wheel": {
    title: "Random Wheel",
    desc: "Set options, spin the wheel, and draw random items with optional single-draw elimination."
  },
  "tool-typing": {
    title: "Typing Speed Test",
    desc: "Test and improve your typing speed in English or Chinese with custom templates."
  },
  "tool-codon": {
    title: "RNA Codon Table",
    desc: "Interactive standard genetic code table — click any codon or amino acid to explore synonyms and properties."
  },
  "tool-qrcode": {
    title: "QR Code Generator",
    desc: "Create highly customizable QR codes with dot styles, custom eyes, gradients, and embedded logos."
  },
  "tool-barcode": {
    title: "Barcode Generator",
    desc: "Generate barcodes in multiple formats (CODE128, EAN, UPC, ITF) with live input validation."
  },
  "tool-speedtest": {
    title: "Network Speed Test",
    desc: "Test your network latency (ping) and download speed in real-time."
  },
  "tool-password": {
    title: "Secure Password Generator",
    desc: "Generate cryptographically secure random passwords using CSPRNG and unbiased rejection sampling."
  },
  "tool-pwstrength": {
    title: "Password Strength Checker",
    desc: "Analyze password complexity, calculate entropy, estimate cracking time, and check character rules."
  },
  "tool-officemeta": {
    title: "Office Metadata Reader",
    desc: "Extract, inspect and analyze core properties, application properties, and format-specific structures from Word, Excel, and PowerPoint files locally."
  },
  "tool-fontextractor": {
    title: "Website Font Extractor",
    desc: "Scan any website URL to extract web font families, preview them in real-time, download the font files, and find similar Google Fonts alternatives."
  }
};
const categories = [
  {
    id: 'text',
    name: 'Text',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  },
  {
    id: 'developer',
    name: 'Developer',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    )
  },
  {
    id: 'network',
    name: 'Network',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    )
  },
  {
    id: 'bioinfo',
    name: 'Bioinfo',
    icon: <BioinfoIcon />
  },
  {
    id: 'utilities',
    name: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="2" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M16.24 7.76l-8.48 8.48"></path>
        <path d="M7.76 7.76l8.48 8.48"></path>
      </svg>
    )
  }
];

const navItems = [
  {
    id: 'tool-slash',
    name: 'Slashes Converter',
    tooltip: 'Slashes Converter',
    category: 'developer',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="18" x2="18" y2="6"></line>
        <line x1="6" y1="6" x2="18" y2="18" strokeDasharray="2 2"></line>
      </svg>
    )
  },
  {
    id: 'tool-wc',
    name: 'Word Counter',
    tooltip: 'Word Counter',
    category: 'text',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/>
      </svg>
    )
  },
  {
    id: 'tool-casing',
    name: 'Casing Switcher',
    tooltip: 'Casing Switcher',
    category: 'text',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20L9 5l5 15" />
        <path d="M6.5 14h5" />
        <circle cx="17.5" cy="15.5" r="3.5" />
        <path d="M21 12v7" />
      </svg>
    )
  },
  {
    id: 'tool-typing',
    name: 'Typing Speed Test',
    tooltip: 'Typing Speed Test',
    category: 'text',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
    id: 'tool-color',
    name: 'Color Converter',
    tooltip: 'Color Converter',
    category: 'media',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
    name: 'ASCII Converter',
    tooltip: 'ASCII Converter',
    category: 'developer',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
    )
  },
  {
    id: 'tool-unicode',
    name: 'Unicode Converter',
    tooltip: 'Unicode Converter',
    category: 'developer',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    )
  },
  {
    id: 'tool-fontextractor',
    name: 'Font Extractor',
    tooltip: 'Website Font Extractor',
    category: 'developer',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
        <circle cx="19" cy="19" r="3"></circle>
        <line x1="21.5" y1="21.5" x2="23" y2="23"></line>
      </svg>
    )
  },
  {
    id: 'tool-base',
    name: 'Base Converter',
    tooltip: 'Base Converter',
    category: 'developer',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="9" x2="20" y2="9"></line>
        <line x1="4" y1="15" x2="20" y2="15"></line>
        <line x1="9" y1="4" x2="9" y2="20"></line>
        <line x1="15" y1="4" x2="15" y2="20"></line>
      </svg>
    )
  },
  {
    id: 'tool-dna',
    name: 'DNA/RNA Converter',
    tooltip: 'DNA/RNA Converter',
    category: 'bioinfo',
    icon: <DnaRnaIcon />
  },
  {
    id: 'tool-codon',
    name: 'Codon Table',
    tooltip: 'RNA Codon Table',
    category: 'bioinfo',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
    name: 'IP Lookup',
    tooltip: 'IP Lookup',
    category: 'network',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    )
  },
  {
    id: 'tool-speedtest',
    name: 'Speed Test',
    tooltip: 'Network Speed Test',
    category: 'network',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="6" x2="12" y2="12"></line>
        <line x1="12" y1="12" x2="16" y2="14"></line>
      </svg>
    )
  },
  {
    id: 'tool-imgmeta',
    name: 'ImgMeta',
    tooltip: 'ImgMeta',
    category: 'media',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
    )
  },
  {
    id: 'tool-officemeta',
    name: 'Office Metadata',
    tooltip: 'Office Metadata Reader',
    category: 'media',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  },
  {
    id: 'tool-barcode',
    name: 'Barcode Generator',
    tooltip: 'Barcode Generator',
    category: 'utilities',
    subGroup: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5v14M6 5v14M10 5v14M14 5v14M17 5v14M21 5v14" />
      </svg>
    )
  },
  {
    id: 'tool-currency',
    name: 'Currency Converter',
    tooltip: 'Currency Converter & Counter',
    category: 'utilities',
    subGroup: 'Calculation',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    )
  },
  {
    id: 'tool-date',
    name: 'Date Counter',
    tooltip: 'Date Counter',
    category: 'utilities',
    subGroup: 'Calculation',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    )
  },
  {
    id: 'tool-password',
    name: 'Password Generator',
    tooltip: 'Secure Password Generator',
    category: 'utilities',
    subGroup: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    )
  },
  {
    id: 'tool-pwstrength',
    name: 'Password Strength',
    tooltip: 'Password Strength Checker',
    category: 'utilities',
    subGroup: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="m9 11 2 2 4-4"></path>
      </svg>
    )
  },
  {
    id: 'tool-qrcode',
    name: 'QR Code Generator',
    tooltip: 'QR Code Generator',
    category: 'utilities',
    subGroup: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
      </svg>
    )
  },
  {
    id: 'tool-wheel',
    name: 'Random Wheel',
    tooltip: 'Random Wheel',
    category: 'utilities',
    subGroup: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="2" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M16.24 7.76l-8.48 8.48"></path>
        <path d="M7.76 7.76l8.48 8.48"></path>
      </svg>
    )
  }
];

export default function App() {
  const [activeTool, setActiveTool] = useState(() => {
    try {
      return sessionStorage.getItem("activeTool") || "tool-home";
    } catch (e) {
      return "tool-home";
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "true";
    } catch (e) {
      return false;
    }
  });

  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) return savedTheme;
    } catch (e) {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [tooltipState, setTooltipState] = useState({ text: '', top: 0, left: 0, visible: false });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedHomeTab, setSelectedHomeTab] = useState('all');

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdown(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Sync theme to document element and localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
  }, [theme]);

  // Sync activeTool to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("activeTool", activeTool);
    } catch (e) {}
  }, [activeTool]);

  // Sync sidebarCollapsed to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", isSidebarCollapsed ? "true" : "false");
    } catch (e) {}
  }, [isSidebarCollapsed]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const handleNavClick = (toolId) => {
    setActiveTool(toolId);
    setMobileSidebarOpen(false);
  };

  // Tooltip logic for collapsed sidebar
  const handleMouseEnter = (e, item) => {
    if (isSidebarCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipState({
        text: item.tooltip,
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
        visible: true
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltipState(prev => ({ ...prev, visible: false }));
  };

  // Filter navigation items
  const filteredNavItems = navItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Render active tool component
  const renderActiveTool = () => {
    switch (activeTool) {
      case 'tool-home':
        return <HomeGrid onSelectTool={handleNavClick} activeTab={selectedHomeTab} setActiveTab={setSelectedHomeTab} />;
      case 'tool-slash':
        return <SlashesConverter />;
      case 'tool-wc':
        return <WordCounter />;
      case 'tool-casing':
        return <CasingSwitcher />;
      case 'tool-date':
        return <DateCounter />;
      case 'tool-currency':
        return <CurrencyCounter />;
      case 'tool-color':
        return <ColorConverter />;
      case 'tool-ascii':
        return <AsciiConverter />;
      case 'tool-unicode':
        return <UnicodeConverter />;
      case 'tool-base':
        return <BaseConverter />;
      case 'tool-dna':
        return <DnaConverter />;
      case 'tool-iplookup':
        return <IpLookup />;
      case 'tool-speedtest':
        return <NetworkSpeedTest />;
      case 'tool-imgmeta':
        return <ImgMeta />;
      case 'tool-officemeta':
        return <OfficeMeta />;
      case 'tool-wheel':
        return <RandomWheel />;
      case 'tool-typing':
        return <TypingSpeedTest />;
      case 'tool-codon':
        return <CodonTable />;
      case 'tool-qrcode':
        return <QrBarcodeGenerator initialTab="qr" key="qrcode" />;
      case 'tool-barcode':
        return <QrBarcodeGenerator initialTab="barcode" key="barcode" />;
      case 'tool-password':
        return <PasswordGenerator initialTab="generate" key="password" />;
      case 'tool-pwstrength':
        return <PasswordGenerator initialTab="check" key="pwstrength" />;
      case 'tool-fontextractor':
        return <WebsiteFontExtractor />;
      default:
        return <HomeGrid onSelectTool={handleNavClick} activeTab={selectedHomeTab} setActiveTab={setSelectedHomeTab} />;
    }
  };

  const activeDetails = toolDetails[activeTool] || toolDetails['tool-home'];

  return (
    <div className={`app-container ${SHOW_CHANNEL_ALERT ? 'has-banner' : ''}`}>
      {SHOW_CHANNEL_ALERT && (
        <div className="channel-alert-banner" id="channel-alert-banner">
          <svg className="alert-banner-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="banner-text-desktop">
            This site is running on a {APP_CHANNEL} version ({APP_VERSION}). May provide wrong information. Check before using.
          </span>
          <span className="banner-text-mobile">
            {APP_CHANNEL} version ({APP_VERSION}) - Site may provide wrong info.
          </span>
        </div>
      )}
      <div className={`app-layout ${isSidebarCollapsed ? 'collapsed-sidebar' : ''}`}>
      
      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          id="sidebar-toggle"
          className="icon-btn"
          aria-label="Toggle Sidebar"
          onClick={() => setMobileSidebarOpen(prev => !prev)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <span className="mobile-logo-text">Small Web Tools</span>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <div
            className="brand-logo-container"
            id="brand-logo-btn"
            title="Go to Home"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => {
              handleNavClick('tool-home');
              setSelectedHomeTab('all');
            }}
          >
            <span className="brand-text">Small Web Tools</span>
          </div>
          
          <button
            id="sidebar-collapse-btn"
            className="sidebar-collapse-btn"
            aria-label="Collapse Sidebar"
            onClick={toggleSidebarCollapse}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>

        <div className="sidebar-search-container">
          <div className="search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              id="tool-search"
              placeholder="Search tools..."
              aria-label="Search tools"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <nav className="sidebar-nav">
          {searchQuery.trim() !== '' ? (
            filteredNavItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeTool === item.id ? 'active' : ''}`}
                data-tool={item.id}
                data-tooltip={item.tooltip}
                onClick={() => handleNavClick(item.id)}
                onMouseEnter={(e) => handleMouseEnter(e, item)}
                onMouseLeave={handleMouseLeave}
              >
                {item.icon}
                <span>{item.name}</span>
              </button>
            ))
          ) : (
            categories.map(cat => {
              const catItems = filteredNavItems.filter(item => item.category === cat.id);
              if (catItems.length === 0) return null;
              
              if (cat.id === 'utilities') {
                const subGroups = {};
                catItems.forEach(item => {
                  const sg = item.subGroup || 'Utilities';
                  if (!subGroups[sg]) subGroups[sg] = [];
                  subGroups[sg].push(item);
                });
                const sortedSubGroupNames = Object.keys(subGroups).sort();
                
                return (
                  <div key={cat.id} className="sidebar-category-group" data-category={cat.id}>
                    <div className="sidebar-category-header">
                      <span className="sidebar-category-title">{cat.name}</span>
                    </div>
                    {sortedSubGroupNames.map(sgName => (
                      <div key={sgName} className="sidebar-subcategory-group">
                        <div className="sidebar-subcategory-header">
                          <span className="sidebar-subcategory-title">{sgName}</span>
                        </div>
                        {subGroups[sgName].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                          <button
                            key={item.id}
                            className={`nav-item ${activeTool === item.id ? 'active' : ''}`}
                            data-tool={item.id}
                            data-tooltip={item.tooltip}
                            onClick={() => handleNavClick(item.id)}
                            onMouseEnter={(e) => handleMouseEnter(e, item)}
                            onMouseLeave={handleMouseLeave}
                          >
                            {item.icon}
                            <span>{item.name}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div key={cat.id} className="sidebar-category-group" data-category={cat.id}>
                  <div className="sidebar-category-header">
                    <span className="sidebar-category-title">{cat.name}</span>
                  </div>
                  {catItems.map(item => (
                    <button
                      key={item.id}
                      className={`nav-item ${activeTool === item.id ? 'active' : ''}`}
                      data-tool={item.id}
                      data-tooltip={item.tooltip}
                      onClick={() => handleNavClick(item.id)}
                      onMouseEnter={(e) => handleMouseEnter(e, item)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="theme-switch-wrapper">
            <span className="theme-label">Theme</span>
            <button
              id="theme-toggle"
              className="theme-toggle-btn"
              aria-label="Toggle dark/light mode"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <svg className="sun-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg className="moon-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay for mobile */}
      <div
        className={`sidebar-overlay ${mobileSidebarOpen ? 'visible' : ''}`}
        id="sidebar-overlay"
        onClick={() => setMobileSidebarOpen(false)}
      ></div>
      {/* Main Content Area */}
      <main className={`main-content ${activeTool !== 'tool-home' ? 'no-header' : ''}`}>

        {/* Desktop Top Header (Hidden on Mobile) */}
        <header className="desktop-header">
          <div className="desktop-header-left">
            <div
              className="brand-logo-container"
              title="Go to Home"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
              onClick={() => {
                handleNavClick('tool-home');
                setSelectedHomeTab('all');
              }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span className="brand-text">Small Web Tools</span>
            </div>
          </div>

          <nav className="desktop-header-nav">
            {categories.map(cat => {
              const catItems = navItems.filter(item => item.category === cat.id);
              if (catItems.length === 0) return null;
              const isOpen = openDropdown === cat.id;
              return (
                <div
                  key={cat.id}
                  className="nav-dropdown"
                  onMouseEnter={() => setOpenDropdown(cat.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    className={`nav-dropdown-trigger ${isOpen ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTool('tool-home');
                      setSelectedHomeTab(cat.id);
                      setOpenDropdown(null);
                    }}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span className="cat-name">{cat.name}</span>
                    <span className={`triangle-icon ${isOpen ? 'open' : ''}`}>
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </span>
                  </button>

                  <div className={`dropdown-menu ${isOpen ? 'show' : ''}`}>
                    {cat.id === 'utilities' ? (
                      (() => {
                        const subGroups = {};
                        catItems.forEach(item => {
                          const sg = item.subGroup || 'Utilities';
                          if (!subGroups[sg]) subGroups[sg] = [];
                          subGroups[sg].push(item);
                        });
                        const sortedSubGroupNames = Object.keys(subGroups).sort();
                        return sortedSubGroupNames.map(sgName => (
                          <div key={sgName} className="dropdown-subcategory-section">
                            <div className="dropdown-subcategory-header">{sgName}</div>
                            {subGroups[sgName].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                              <button
                                key={item.id}
                                className={`dropdown-item ${activeTool === item.id ? 'active' : ''}`}
                                onClick={() => {
                                  handleNavClick(item.id);
                                  setOpenDropdown(null);
                                }}
                              >
                                <span className="item-icon">{item.icon}</span>
                                <span className="item-name">{item.name}</span>
                              </button>
                            ))}
                          </div>
                        ));
                      })()
                    ) : (
                      catItems.map(item => (
                        <button
                          key={item.id}
                          className={`dropdown-item ${activeTool === item.id ? 'active' : ''}`}
                          onClick={() => {
                            handleNavClick(item.id);
                            setOpenDropdown(null);
                          }}
                        >
                          <span className="item-icon">{item.icon}</span>
                          <span className="item-name">{item.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="desktop-header-right">
            <div className="header-search-container" onClick={(e) => e.stopPropagation()}>
              <div className="search-wrapper">
                <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search tools..."
                  aria-label="Search tools"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery.trim() !== '' && (
                <div className="header-search-results">
                  {filteredNavItems.length > 0 ? (
                    filteredNavItems.map(item => (
                      <button
                        key={item.id}
                        className="search-result-item"
                        onClick={() => {
                          handleNavClick(item.id);
                          setSearchQuery('');
                        }}
                      >
                        <span className="item-icon">{item.icon}</span>
                        <span>{item.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="no-results">No tools found</div>
                  )}
                </div>
              )}
            </div>

            <button
              className="theme-toggle-btn"
              aria-label="Toggle dark/light mode"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <svg className="sun-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg className="moon-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Top Bar (Hidden on Desktop) */}
        <div className="top-bar mobile-top-bar">
          <div className="top-bar-left">
            <div
              className="brand-logo"
              id="top-brand-logo"
              title="Go to Home"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                handleNavClick('tool-home');
                setSelectedHomeTab('all');
              }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            {activeTool !== 'tool-home' && (
              <>
                <button
                  className="top-bar-back-btn"
                  onClick={() => handleNavClick('tool-home')}
                  title="Back to Home"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Home
                </button>
                <span className="top-bar-sep">/</span>
              </>
            )}
            <span className="top-bar-title">{activeDetails.title}</span>
          </div>
          <div className="top-bar-right">
          </div>
        </div>



        <section className="tool-stage">
          {renderActiveTool()}
        </section>

        <footer className="shiny-footer">
          <div className="footer-links-section">
            {categories.map(cat => {
              const catItems = navItems.filter(item => item.category === cat.id);
              if (catItems.length === 0) return null;
              return (
                <div key={cat.id} className="footer-col">
                  <button
                    className="footer-col-title"
                    onClick={() => {
                      setActiveTool('tool-home');
                      setSelectedHomeTab(cat.id);
                    }}
                  >
                    {cat.name}
                  </button>
                  {cat.id === 'utilities' ? (
                    (() => {
                      const subGroups = {};
                      catItems.forEach(item => {
                        const sg = item.subGroup || 'Utilities';
                        if (!subGroups[sg]) subGroups[sg] = [];
                        subGroups[sg].push(item);
                      });
                      const sortedSubGroupNames = Object.keys(subGroups).sort();
                      return sortedSubGroupNames.map(sgName => (
                        <div key={sgName} className="footer-subcategory-group">
                          <span className="footer-subcategory-title">{sgName}</span>
                          {subGroups[sgName].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                            <button
                              key={item.id}
                              className="footer-col-link"
                              onClick={() => handleNavClick(item.id)}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      ));
                    })()
                  ) : (
                    catItems.map(item => (
                      <button
                        key={item.id}
                        className="footer-col-link"
                        onClick={() => handleNavClick(item.id)}
                      >
                        {item.name}
                      </button>
                    ))
                  )}
                </div>
              );
            })}
          </div>
          <div className="shiny-footer-content">
            <div className="footer-left-placeholder"></div>
            <div className="footer-brand-container">
              <span className="footer-brand-name">Small Web Tools</span>
              <span className="footer-sep">&nbsp;·&nbsp;</span>
              <span className="footer-copyright">Run locally without upload. &nbsp;© H. Huang · {new Date().getFullYear()} · {APP_VERSION}</span>
            </div>
            <div className="footer-social-row">
              <button className="footer-social-btn" title="GitHub" aria-label="GitHub">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48 1 .11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.01 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* Collapsed Sidebar Hover Tooltip */}
      {tooltipState.visible && (
        <div
          className="sidebar-tooltip visible"
          style={{ top: `${tooltipState.top}px`, left: `${tooltipState.left}px` }}
        >
          {tooltipState.text}
        </div>
      )}
    </div>
  </div>
  );
}
