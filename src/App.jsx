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
import QrBarcodeScanner from './components/QrBarcodeScanner.jsx';
import AudioMeta from './components/AudioMeta.jsx';
import VideoMeta from './components/VideoMeta.jsx';
import MediaSeparator from './components/MediaSeparator';
import FolderAnalyzer from './components/FolderAnalyzer.jsx';


const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v1.0.0';
const SHOW_CHANNEL_ALERT = typeof __SHOW_CHANNEL_ALERT__ !== 'undefined' ? __SHOW_CHANNEL_ALERT__ : false;
const APP_CHANNEL = typeof __APP_CHANNEL__ !== 'undefined' ? __APP_CHANNEL__ : '';


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
    id: 'tool-folder-analyzer',
    name: 'Folder Analyzer',
    tooltip: 'Folder Structure Analyzer',
    category: 'developer',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        <line x1="12" y1="11" x2="12" y2="17"></line>
        <line x1="9" y1="14" x2="15" y2="14"></line>
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
    name: 'Image Metadata',
    tooltip: 'Image Metadata',
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
    id: 'tool-audiometa',
    name: 'Audio Metadata',
    tooltip: 'Audio Metadata Reader',
    category: 'media',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    )
  },
  {
    id: 'tool-videometa',
    name: 'Video Metadata',
    tooltip: 'Video Metadata Reader',
    category: 'media',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
    )
  },
  {
    id: 'tool-mediasplit',
    name: 'Media Splitter',
    tooltip: 'Media Splitter',
    category: 'media',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V2M17 5h4v14h-4M7 19H3V5h4" />
        <path d="M12 7l-3 3 3 3M12 11l3 3-3 3" />
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
    id: 'tool-qrbarcodescan',
    name: 'QR & Barcode Scanner',
    tooltip: 'QR & Barcode Scanner',
    category: 'utilities',
    subGroup: 'Utilities',
    icon: (
      <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
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
      const hash = window.location.hash.replace('#', '');
      if (hash && hash.startsWith('tool-')) {
        return hash;
      }
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
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdown(null);
      setLangDropdownOpen(false);
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

  // Listen for hashchange events to sync to activeTool
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash.startsWith('tool-')) {
        setActiveTool(hash);
      } else if (!hash) {
        setActiveTool('tool-home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.querySelector('.header-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync activeTool to sessionStorage and window.location.hash
  useEffect(() => {
    try {
      sessionStorage.setItem("activeTool", activeTool);
      if (activeTool === 'tool-home') {
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        window.location.hash = activeTool;
      }
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
      case 'tool-audiometa':
        return <AudioMeta />;
      case 'tool-videometa':
        return <VideoMeta />;
      case 'tool-mediasplit':
        return <MediaSeparator />;
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
      case 'tool-qrbarcodescan':
        return <QrBarcodeScanner key="qrbarcodescan" />;
      case 'tool-password':
        return <PasswordGenerator initialTab="generate" key="password" />;
      case 'tool-pwstrength':
        return <PasswordGenerator initialTab="check" key="pwstrength" />;
      case 'tool-fontextractor':
        return <WebsiteFontExtractor />;
      case 'tool-folder-analyzer':
        return <FolderAnalyzer />;
      default:
        return <HomeGrid onSelectTool={handleNavClick} activeTab={selectedHomeTab} setActiveTab={setSelectedHomeTab} />;
    }
  };

  const activeTitle = activeTool === 'tool-home'
    ? 'Dashboard'
    : (navItems.find(item => item.id === activeTool)?.name || '');

  // --banner-height is 0px by default, 36px when SHOW_CHANNEL_ALERT is true
  // We must use inline styles for calc() expressions using this CSS variable
  const bannerHeightStyle = { marginTop: 'var(--banner-height)' };
  const sidebarHeightStyle = {
    height: 'calc(100vh - var(--banner-height))',
    top: 'var(--banner-height)',
  };
  const mainContentHeightStyle = { height: 'calc(100vh - var(--banner-height))' };

  // Nav item — shared classes
  const navItemBase =
    'flex items-center gap-[9px] py-[7px] px-[10px] border-none bg-transparent rounded-sm text-text-sidebar-muted cursor-pointer text-left transition-[background,color] duration-150 ease-linear font-medium text-[0.84rem] font-sans w-full [&_svg]:w-[15px] [&_svg]:h-[15px] [&_svg]:flex-shrink-0 [&_svg]:opacity-70';
  const navItemActive =
    'bg-nav-active-bg text-nav-active-text font-semibold border border-[rgba(16,185,129,0.25)] shadow-[0_0_10px_rgba(16,185,129,0.08)] [&_svg]:opacity-100 [&_svg]:text-nav-active-text';
  const navItemHover =
    'hover:bg-nav-hover-bg hover:text-text-sidebar [&:hover_svg]:opacity-100';

  return (
    <div className={SHOW_CHANNEL_ALERT ? 'has-banner' : ''}>
      {/* Warning Banner */}
      {SHOW_CHANNEL_ALERT && (
        <div
          id="channel-alert-banner"
          className="fixed top-0 left-0 right-0 h-9 bg-warning-bg border-b border-warning-border text-warning-text flex items-center justify-center gap-2 text-[0.82rem] font-semibold z-[9999] px-4 box-border"
        >
          <svg
            className="flex-shrink-0"
            viewBox="0 0 24 24" width="16" height="16"
            stroke="currentColor" strokeWidth="2.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {/* Desktop text */}
          <span className="hidden sm:inline">
            This site is running on a {APP_CHANNEL} version ({APP_VERSION}). May provide wrong information. Check before using.
          </span>
          {/* Mobile text */}
          <span className="sm:hidden">
            {APP_CHANNEL} version ({APP_VERSION}) - Site may provide wrong info.
          </span>
        </div>
      )}

      {/* App layout: flex row, offset below banner */}
      <div
        className={`flex overflow-x-hidden ${isSidebarCollapsed ? 'collapsed-sidebar' : ''}`}
        style={{ ...bannerHeightStyle, minHeight: 'calc(100vh - var(--banner-height))' }}
      >

        {/* Mobile Header — hidden on desktop (md+) */}
        <header
          className="hidden max-md:flex bg-sidebar border-b border-border-sidebar px-5 py-3 items-center gap-4 fixed left-0 right-0 z-[90] h-[60px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          style={{ top: 'var(--banner-height)' }}
        >
          <button
            id="sidebar-toggle"
            className="bg-transparent border-none text-text-main cursor-pointer p-1 flex items-center justify-center rounded-sm transition-colors duration-200 hover:bg-accent-light hover:text-accent"
            aria-label="Toggle Sidebar"
            onClick={() => setMobileSidebarOpen(prev => !prev)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span className="font-['TASA_Orbiter',sans-serif] font-bold text-[1.15rem] text-accent">Small Web Tools</span>
        </header>

        {/* Sidebar — hidden on desktop (md+), slide-in on mobile */}
        <aside
          id="sidebar"
          className={`
            w-[260px] flex-shrink-0 bg-sidebar border-r border-border-sidebar flex flex-col
            shadow-sidebar z-[100]
            transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            md:hidden
            max-md:fixed max-md:bottom-0
            ${mobileSidebarOpen ? 'max-md:left-0 max-md:shadow-[10px_0_30px_rgba(0,0,0,0.15)]' : 'max-md:-left-[280px]'}
          `}
          style={sidebarHeightStyle}
        >
          {/* Sidebar Brand */}
          <div className={`px-[18px] py-4 flex items-center justify-between border-b border-border-sidebar gap-3 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarCollapsed ? 'md:flex-col md:justify-center md:px-0 md:py-4 md:gap-[10px]' : ''}`}>
            <div
              className={`flex items-center gap-[10px] cursor-pointer ${isSidebarCollapsed ? 'md:justify-center' : ''}`}
              id="brand-logo-btn"
              title="Go to Home"
              onClick={() => {
                handleNavClick('tool-home');
                setSelectedHomeTab('all');
              }}
            >
              {/* Brand Icon Box */}
              <div className="bg-accent-gradient text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_4px_10px_rgba(99,102,241,0.15)] flex-shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:[stroke-width:2.2]">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              {/* Brand Text — hidden when collapsed on desktop */}
              <span className={`font-display text-[0.95rem] font-extrabold tracking-[-0.02em] text-text-sidebar ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Small Web Tools</span>
            </div>

            {/* Collapse button — hidden on mobile */}
            <button
              id="sidebar-collapse-btn"
              className={`
                hidden md:flex bg-transparent border-none text-text-sidebar-muted cursor-pointer
                w-[30px] h-[30px] rounded-sm items-center justify-center
                transition-all duration-200
                hover:bg-nav-hover-bg hover:text-text-sidebar
                ${isSidebarCollapsed ? 'md:bg-accent md:text-white md:rotate-180 hover:md:bg-accent-hover hover:md:text-white hover:md:scale-105' : ''}
              `}
              aria-label="Collapse Sidebar"
              onClick={toggleSidebarCollapse}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          </div>

          {/* Sidebar Search — hidden when collapsed on desktop */}
          <div className={`px-4 pt-[10px] pb-[6px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
            <div className="relative flex items-center">
              <svg className="absolute left-[10px] text-text-muted pointer-events-none" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                id="tool-search"
                className="w-full py-2 pl-8 pr-3 text-[0.83rem] rounded-[7px] bg-[var(--bg-search-sidebar)] border border-border-sidebar text-text-sidebar outline-none transition-all duration-200 placeholder:text-text-sidebar-muted focus:border-accent focus:shadow-[0_0_0_2px_var(--focus-ring)]"
                placeholder="Search tools..."
                aria-label="Search tools"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Sidebar Nav */}
          <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--scrollbar-thumb)] [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            {searchQuery.trim() !== '' ? (
              filteredNavItems.map(item => (
                <button
                  key={item.id}
                  className={`${navItemBase} ${navItemHover} ${activeTool === item.id ? navItemActive : ''} ${isSidebarCollapsed ? 'md:justify-center md:px-0 md:py-2' : ''}`}
                  data-tool={item.id}
                  data-tooltip={item.tooltip}
                  onClick={() => handleNavClick(item.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, item)}
                  onMouseLeave={handleMouseLeave}
                >
                  {item.icon}
                  <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{item.name}</span>
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
                    <div key={cat.id} className={`flex flex-col gap-0.5 mb-3 last:mb-0 ${isSidebarCollapsed ? 'md:mb-2 md:relative md:after:content-[""] md:after:block md:after:w-6 md:after:h-px md:after:bg-border-sidebar md:after:mx-auto md:after:mt-2 md:after:opacity-50 md:last:after:hidden' : ''}`} data-category={cat.id}>
                      {/* Category Header — hidden when collapsed on desktop */}
                      <div className={`flex items-center gap-[10px] px-3 pt-[10px] pb-[6px] text-text-sidebar-muted font-display select-none ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                        <span className="inline-flex items-center justify-center w-[15px] h-[15px] text-text-sidebar-muted opacity-80 [&_svg]:w-full [&_svg]:h-full">
                          {cat.icon}
                        </span>
                        <span className="text-[0.82rem] font-semibold text-text-sidebar-muted flex-1 capitalize tracking-normal">{cat.name}</span>
                        <svg className="w-3 h-3 text-text-sidebar-muted opacity-60" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                      {sortedSubGroupNames.map(sgName => (
                        <div key={sgName} className={`flex flex-col gap-0.5 mt-1 ${isSidebarCollapsed ? 'md:mt-0' : ''}`}>
                          {/* Subcategory header — hidden when collapsed on desktop */}
                          <div className={`px-3 py-[2px] flex items-center select-none ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                            <span className="text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-sidebar-muted opacity-55">
                              {sgName}
                            </span>
                          </div>
                          {subGroups[sgName].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                            <button
                              key={item.id}
                              className={`${navItemBase} ${navItemHover} pl-5 ${activeTool === item.id ? navItemActive : ''} ${isSidebarCollapsed ? 'md:justify-center md:pl-0 md:px-0 md:py-2' : ''}`}
                              data-tool={item.id}
                              data-tooltip={item.tooltip}
                              onClick={() => handleNavClick(item.id)}
                              onMouseEnter={(e) => handleMouseEnter(e, item)}
                              onMouseLeave={handleMouseLeave}
                            >
                              {item.icon}
                              <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{item.name}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div key={cat.id} className={`flex flex-col gap-0.5 mb-3 last:mb-0 ${isSidebarCollapsed ? 'md:mb-2 md:relative md:after:content-[""] md:after:block md:after:w-6 md:after:h-px md:after:bg-border-sidebar md:after:mx-auto md:after:mt-2 md:after:opacity-50 md:last:after:hidden' : ''}`} data-category={cat.id}>
                    {/* Category Header — hidden when collapsed on desktop */}
                    <div className={`flex items-center gap-[10px] px-3 pt-[10px] pb-[6px] text-text-sidebar-muted font-display select-none ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                      <span className="inline-flex items-center justify-center w-[15px] h-[15px] text-text-sidebar-muted opacity-80 [&_svg]:w-full [&_svg]:h-full">
                        {cat.icon}
                      </span>
                      <span className="text-[0.82rem] font-semibold text-text-sidebar-muted flex-1 capitalize tracking-normal">{cat.name}</span>
                      <svg className="w-3 h-3 text-text-sidebar-muted opacity-60" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    {catItems.map(item => (
                      <button
                        key={item.id}
                        className={`${navItemBase} ${navItemHover} ${activeTool === item.id ? navItemActive : ''} ${isSidebarCollapsed ? 'md:justify-center md:px-0 md:py-2' : ''}`}
                        data-tool={item.id}
                        data-tooltip={item.tooltip}
                        onClick={() => handleNavClick(item.id)}
                        onMouseEnter={(e) => handleMouseEnter(e, item)}
                        onMouseLeave={handleMouseLeave}
                      >
                        {item.icon}
                        <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{item.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className={`px-[14px] py-3 border-t border-border-sidebar flex flex-col gap-[10px] transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarCollapsed ? 'md:px-0 md:items-center' : ''}`}>
            <div className={`flex items-center justify-between ${isSidebarCollapsed ? 'md:justify-center md:w-full' : ''}`}>
              {/* Theme label — hidden when collapsed on desktop */}
              <span className={`text-[0.82rem] font-medium text-text-sidebar-muted ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Theme</span>
              <button
                id="theme-toggle"
                className="bg-[var(--bg-search-sidebar)] border border-border-sidebar text-text-sidebar-muted cursor-pointer w-[34px] h-[34px] rounded flex items-center justify-center transition-all duration-200 hover:bg-nav-hover-bg hover:text-text-sidebar"
                aria-label="Toggle dark/light mode"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Sidebar Overlay for mobile */}
        <div
          id="sidebar-overlay"
          className={`fixed top-0 left-0 right-0 bottom-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-[4px] z-[95] transition-opacity duration-300 ${mobileSidebarOpen ? 'block opacity-100' : 'hidden opacity-0'}`}
          style={{ top: 'var(--banner-height)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main
          className="flex-1 min-w-0 p-0 flex flex-col overflow-y-auto overflow-x-hidden"
          style={mainContentHeightStyle}
        >
          {/* Desktop Top Header — hidden on mobile (max-md) */}
          <header className="hidden md:flex items-center justify-between px-12 py-[6px] border-b border-border min-h-[48px] bg-header backdrop-blur-[10px] z-[1000] transition-all duration-300">
            {/* Left: Brand */}
            <div className="flex items-center">
              <div
                className="flex items-center gap-[10px] cursor-pointer text-accent transition-opacity duration-200 hover:opacity-85"
                title="Go to Home"
                onClick={() => {
                  handleNavClick('tool-home');
                  setSelectedHomeTab('all');
                }}
              >
                <div className="bg-accent-gradient text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_4px_10px_rgba(99,102,241,0.15)] flex-shrink-0 [&_svg]:w-[18px] [&_svg]:[stroke-width:2.2]">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span className="font-['TASA_Orbiter',sans-serif] font-bold text-[0.95rem] tracking-[-0.02em] text-accent">Small Web Tools</span>
              </div>
            </div>

            {/* Center: Nav Dropdowns */}
            <nav className="flex items-center gap-2">
              {categories.map(cat => {
                const catItems = navItems.filter(item => item.category === cat.id);
                if (catItems.length === 0) return null;
                const isOpen = openDropdown === cat.id;
                return (
                  <div
                    key={cat.id}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(cat.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      className={`flex items-center gap-2 bg-transparent border-none px-3 py-[6px] rounded text-[0.82rem] font-medium text-text-muted cursor-pointer transition-all duration-200 font-sans ${isOpen ? 'bg-accent-light text-accent' : ''} hover:bg-accent-light hover:text-accent`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTool('tool-home');
                        setSelectedHomeTab(cat.id);
                        setOpenDropdown(null);
                      }}
                    >
                      {/* Cat Icon */}
                      <span className="inline-flex items-center justify-center w-4 h-4 [&_svg]:w-full [&_svg]:h-full">
                        {cat.icon}
                      </span>
                      {/* Cat Name */}
                      <span className="font-display font-semibold">{cat.name}</span>
                      {/* Triangle Icon */}
                      <span className={`inline-flex items-center justify-center ml-0.5 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-text-muted [&_svg]:w-[10px] [&_svg]:h-[10px] ${isOpen ? 'rotate-180 text-accent' : ''}`}>
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    <div
                      className={`absolute top-full left-0 bg-[var(--bg-card-solid,var(--bg-card))] border border-border rounded-lg p-2 min-w-[200px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] z-[1100] flex flex-col gap-1 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'opacity-100 visible translate-y-1' : 'opacity-0 invisible translate-y-[10px]'}`}
                    >
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
                            <div key={sgName} className="flex flex-col gap-0.5 border-b border-border pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
                              <div className="px-3 py-[2px] pt-1 text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-muted opacity-50">
                                {sgName}
                              </div>
                              {subGroups[sgName].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                                <button
                                  key={item.id}
                                  className={`flex items-center gap-[10px] w-full pl-[18px] pr-3 py-2 bg-transparent border-none rounded-sm text-[0.82rem] font-medium text-text-muted cursor-pointer transition-all duration-150 text-left font-sans whitespace-nowrap [&_.item-icon]:inline-flex [&_.item-icon]:items-center [&_.item-icon]:justify-center [&_.item-icon]:w-[14px] [&_.item-icon]:h-[14px] [&_.item-icon_svg]:w-full [&_.item-icon_svg]:h-full hover:bg-accent-light hover:text-accent ${activeTool === item.id ? 'bg-accent-light text-accent' : ''}`}
                                  onClick={() => {
                                    handleNavClick(item.id);
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <span className="item-icon">{item.icon}</span>
                                  <span className="font-medium">{item.name}</span>
                                </button>
                              ))}
                            </div>
                          ));
                        })()
                      ) : (
                        catItems.map(item => (
                          <button
                            key={item.id}
                            className={`flex items-center gap-[10px] w-full px-3 py-2 bg-transparent border-none rounded-sm text-[0.82rem] font-medium text-text-muted cursor-pointer transition-all duration-150 text-left font-sans whitespace-nowrap [&_.item-icon]:inline-flex [&_.item-icon]:items-center [&_.item-icon]:justify-center [&_.item-icon]:w-[14px] [&_.item-icon]:h-[14px] [&_.item-icon_svg]:w-full [&_.item-icon_svg]:h-full hover:bg-accent-light hover:text-accent ${activeTool === item.id ? 'bg-accent-light text-accent' : ''}`}
                            onClick={() => {
                              handleNavClick(item.id);
                              setOpenDropdown(null);
                            }}
                          >
                            <span className="item-icon">{item.icon}</span>
                            <span className="font-medium">{item.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Right: Search + Language + Theme */}
            <div className="flex items-center gap-4">
              {/* Header Search */}
              <div
                className="relative w-[180px] focus-within:w-[240px] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex items-center">
                  <svg className="absolute left-[10px] text-text-muted pointer-events-none" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    className="header-search-input w-full py-[6px] pl-8 pr-8 border border-border rounded bg-[var(--bg-search-sidebar)] text-text-main text-[0.8rem] outline-none font-sans transition-all duration-200 focus:border-accent focus:bg-card focus:shadow-[0_0_0_2px_var(--focus-ring)]"
                    placeholder="Search tools..."
                    aria-label="Search tools"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {/* Keyboard badge */}
                  <kbd className="absolute right-[10px] top-1/2 -translate-y-1/2 bg-[rgba(255,255,255,0.05)] border border-border text-text-muted rounded-[4px] px-[5px] py-[1px] text-[0.65rem] font-sans font-semibold pointer-events-none transition-opacity duration-150 [.header-search-input:focus~&]:opacity-0 html:not([data-theme='dark'])_&:bg-white">
                    /
                  </kbd>
                </div>
                {searchQuery.trim() !== '' && (
                  <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-md w-[280px] max-h-[300px] overflow-y-auto shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] p-[6px] z-[1200] flex flex-col gap-0.5">
                    {filteredNavItems.length > 0 ? (
                      filteredNavItems.map(item => (
                        <button
                          key={item.id}
                          className="flex items-center gap-[10px] w-full px-3 py-2 bg-transparent border-none rounded-sm text-[0.82rem] text-text-main cursor-pointer text-left font-sans transition-colors duration-150 hover:bg-accent-light hover:text-accent [&_.item-icon]:inline-flex [&_.item-icon]:items-center [&_.item-icon]:justify-center [&_.item-icon]:w-[14px] [&_.item-icon]:h-[14px] [&_.item-icon]:text-text-muted [&_.item-icon_svg]:w-full [&_.item-icon_svg]:h-full hover:[&_.item-icon]:text-accent"
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
                      <div className="p-3 text-center text-[0.8rem] text-text-muted">No tools found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Language Selector */}
              <div
                className={`flex items-center gap-[6px] bg-app border border-border pl-[10px] pr-2 rounded h-8 text-text-muted transition-all duration-150 cursor-pointer relative hover:border-border-hover ${langDropdownOpen ? 'border-accent shadow-[0_0_0_2px_var(--focus-ring)] text-text-main' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLangDropdownOpen(!langDropdownOpen);
                  setOpenDropdown(null);
                }}
              >
                <svg className="flex-shrink-0 opacity-80 text-text-muted" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="text-[0.8rem] font-medium text-text-main select-none">English</span>
                <svg className="flex-shrink-0 opacity-50 text-text-muted pointer-events-none ml-0.5" viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>

                {langDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card-solid,var(--bg-card))] border border-border rounded-lg p-1 min-w-full box-border shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-[1100] flex flex-col gap-1">
                    <button className="w-full text-center px-0 py-[6px] bg-transparent border-none rounded-sm text-[0.8rem] font-medium text-accent cursor-pointer bg-accent-light">
                      English
                    </button>
                  </div>
                )}
              </div>

              {/* Theme Toggle (Desktop Header) */}
              <button
                className="bg-transparent border border-border rounded-full w-8 h-8 flex items-center justify-center text-text-muted cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent-light"
                aria-label="Toggle dark/light mode"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>
            </div>
          </header>

          {/* Mobile Top Bar — shown only on mobile (max-md) */}
          <div className="hidden max-md:flex items-center justify-between py-3 border-b border-border min-h-[52px] sticky bg-app z-10 px-4" style={{ top: 'calc(60px + var(--banner-height))' }}>
            <div className="flex items-center gap-2">
              {/* Brand logo for mobile breadcrumb */}
              <div
                id="top-brand-logo"
                className="cursor-pointer"
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
                    className="flex items-center gap-1 bg-transparent border-none text-text-muted cursor-pointer text-[0.82rem] font-sans px-2 py-1 rounded-sm transition-[color,background] duration-150 hover:text-accent hover:bg-accent-light"
                    onClick={() => handleNavClick('tool-home')}
                    title="Back to Home"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Home
                  </button>
                  <span className="text-text-muted text-[0.82rem] opacity-50">/</span>
                </>
              )}
              <span className="text-[0.9rem] font-semibold text-text-main">{activeTitle}</span>
            </div>
            <div className="flex items-center gap-[10px]"></div>
          </div>

          {/* Tool Stage */}
          <section className="w-full flex-1 flex flex-col items-center px-12 py-8 max-md:pt-[100px] max-md:px-[14px] max-[500px]:px-[10px]">
            {renderActiveTool()}
          </section>

          {/* Footer */}
          <footer className="mt-auto w-full bg-footer border-t border-border">
            {/* Footer Links Grid */}
            <div className="grid grid-cols-6 max-[1200px]:grid-cols-4 max-md:grid-cols-3 max-[500px]:grid-cols-2 max-w-[1200px] mx-auto gap-x-4 gap-y-6 px-12 py-7 border-b border-border max-md:px-8 max-md:py-6 max-[500px]:px-4 max-[500px]:py-5">
              {categories.map(cat => {
                const catItems = navItems.filter(item => item.category === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat.id} className="flex flex-col gap-[10px]">
                    <button
                      className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-muted mb-1 bg-transparent border-none cursor-pointer p-0 text-left font-sans transition-colors duration-150 hover:text-accent"
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
                          <div key={sgName} className="flex flex-col gap-2 mt-2 mb-2 last:mb-0">
                            <span className="text-[0.65rem] font-bold uppercase tracking-[0.05em] text-text-muted opacity-50 mb-0.5">{sgName}</span>
                            {subGroups[sgName].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                              <button
                                key={item.id}
                                className="text-[0.83rem] text-text-muted bg-transparent border-none cursor-pointer p-0 text-left font-sans transition-colors duration-150 leading-[1.5] pl-2 hover:text-accent"
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
                          className="text-[0.83rem] text-text-muted bg-transparent border-none cursor-pointer p-0 text-left font-sans transition-colors duration-150 leading-[1.5] hover:text-accent"
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

            {/* Footer Bottom Bar */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-12 py-3 text-[0.78rem] text-text-muted max-md:flex max-md:flex-col max-md:gap-2 max-md:text-center max-md:px-8 max-[500px]:px-4 max-[500px]:py-[10px]">
              {/* Left spacer */}
              <div></div>
              {/* Center: Brand & Copyright */}
              <div className="flex items-center justify-center max-md:flex-col max-md:gap-1">
                <span className="font-display font-bold text-text-main">Small Web Tools</span>
                <span className="text-text-muted mx-1 max-md:hidden">&nbsp;·&nbsp;</span>
                <span className="text-text-muted">Run locally without upload. &nbsp;© Rhosiqs · {new Date().getFullYear()} · {APP_VERSION}</span>
              </div>
              {/* Right: Social Links */}
              <div className="flex gap-3 items-center ml-auto justify-end max-md:mx-auto max-md:justify-center">
                <button className="bg-transparent border border-border rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-text-muted transition-all duration-150 hover:border-accent hover:text-accent" title="GitHub" aria-label="GitHub">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48 1 .11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.01 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                </button>
              </div>
            </div>
          </footer>
        </main>

        {/* Collapsed Sidebar Hover Tooltip */}
        {tooltipState.visible && (
          <div
            className="fixed bg-card text-text-main px-3 py-[6px] rounded text-[0.8rem] font-semibold whitespace-nowrap border border-border shadow-card opacity-100 pointer-events-none -translate-y-1/2 z-[1000] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ top: `${tooltipState.top}px`, left: `${tooltipState.left}px` }}
          >
            {tooltipState.text}
          </div>
        )}
      </div>
    </div>
  );
}
