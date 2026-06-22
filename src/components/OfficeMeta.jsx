import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';

// Helper to format bytes
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper to format ISO timestamps
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};

// Helper to format minutes into human-readable duration
const formatMinutes = (minutesStr) => {
  const mins = parseInt(minutesStr, 10);
  if (isNaN(mins) || mins <= 0) return '';
  
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  
  return `${parts.join(' ')} (${mins} mins)`;
};



// Helper to get element textContent by checking localName (ignoring namespaces)
const getTagValue = (xmlDoc, tagName) => {
  const elements = xmlDoc.getElementsByTagName("*");
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.localName === tagName || el.tagName.split(':').pop() === tagName) {
      return el.textContent || '';
    }
  }
  return '';
};

// Helper to parse Excel HeadingPairs
const parseHeadingPairs = (xmlDoc) => {
  const headingPairsEls = xmlDoc.getElementsByTagName("*");
  let headingPairsEl = null;
  for (let i = 0; i < headingPairsEls.length; i++) {
    if (headingPairsEls[i].localName === "HeadingPairs") {
      headingPairsEl = headingPairsEls[i];
      break;
    }
  }
  if (!headingPairsEl) return null;
  
  let vectorEl = null;
  for (let i = 0; i < headingPairsEl.children.length; i++) {
    if (headingPairsEl.children[i].localName === "vector") {
      vectorEl = headingPairsEl.children[i];
      break;
    }
  }
  if (!vectorEl) return null;

  const variants = [];
  for (let i = 0; i < vectorEl.children.length; i++) {
    if (vectorEl.children[i].localName === "variant") {
      variants.push(vectorEl.children[i]);
    }
  }

  const pairs = [];
  for (let i = 0; i < variants.length; i += 2) {
    if (i + 1 < variants.length) {
      const labelText = variants[i].textContent.trim();
      const countText = variants[i+1].textContent.trim();
      if (labelText) {
        pairs.push({ label: labelText, count: countText });
      }
    }
  }
  return pairs.length > 0 ? pairs : null;
};

// Helper to parse Excel sheets
const extractWorksheets = async (zip) => {
  const workbookFile = zip.file("xl/workbook.xml");
  if (!workbookFile) return [];
  try {
    const text = await workbookFile.async("string");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const sheets = xmlDoc.getElementsByTagName("sheet");
    const list = [];
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i];
      list.push({
        name: s.getAttribute("name") || `Sheet${i + 1}`,
        state: s.getAttribute("state") || "visible"
      });
    }
    return list;
  } catch (err) {
    console.error("Error parsing xl/workbook.xml", err);
    return [];
  }
};

// Helper to parse Custom Properties (docProps/custom.xml)
const parseCustomProperties = (xmlDoc) => {
  const properties = xmlDoc.getElementsByTagName("property");
  const customData = {};
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    const name = prop.getAttribute("name");
    if (name) {
      const valEl = prop.firstElementChild;
      const value = valEl ? valEl.textContent.trim() : '';
      customData[name] = value;
    }
  }
  return customData;
};

// Helper to get vector SVGs for files (replacing emojis)
const getFileIcon = (type, size = 20) => {
  switch (type) {
    case 'docx':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="file-svg-icon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    case 'xlsx':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="file-svg-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="15" y1="3" x2="15" y2="21"></line>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="3" y1="15" x2="21" y2="15"></line>
        </svg>
      );
    case 'pptx':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="file-svg-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="12" y1="3" x2="12" y2="21"></line>
          <path d="M7 7l10 10M17 7L7 17"></path>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="file-svg-icon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      );
  }
};

// Descriptions of standard metadata fields
const FIELD_DESCRIPTIONS = {
  // Core properties
  creator: 'Original author',
  lastModifiedBy: 'Username of the last person to modify the file',
  created: 'Creation timestamp',
  modified: 'Last modified timestamp',
  revision: 'Revision count (number of times saved)',
  title: 'Document title',
  subject: 'Subject',
  description: 'Description / notes',
  keywords: 'Keywords',
  category: 'Category',
  contentStatus: 'Status (e.g. Draft, Final)',
  lastPrinted: 'Last printed timestamp',
  
  // App properties
  Application: 'Software used to create the file',
  AppVersion: 'Office version number',
  Company: 'Company name',
  Manager: 'Manager name',
  Template: 'Template used (e.g. Normal.dotm)',
  TotalTime: 'Total editing time (min)',
  
  // docx Specific
  Pages: 'Page count',
  Words: 'Word count',
  Characters: 'Character count',
  CharactersWithSpaces: 'Character count including spaces',
  Paragraphs: 'Paragraph count',
  Lines: 'Line count',
  
  // pptx Specific
  Slides: 'Total slide count',
  HiddenSlides: 'Number of hidden slides',
  Notes: 'Number of notes pages',
  PresentationFormat: 'Presentation format (e.g. On-screen Show 16:9)',
  MMClips: 'Number of multimedia objects (audio/video)',
  
  // xlsx Specific
  Sheets: 'All worksheet names (including hidden sheets)',
  HeadingPairs: 'Worksheet grouping information'
};

// Fields to compare side-by-side
const COMPARE_FIELDS = [
  { label: 'File Type', fn: (f) => f.type.toUpperCase() },
  { label: 'File Size', fn: (f) => f.formattedSize },
  // Core properties
  { label: 'Title', fn: (f) => f.core.title },
  { label: 'Creator (Author)', fn: (f) => f.core.creator },
  { label: 'Subject', fn: (f) => f.core.subject },
  { label: 'Description', fn: (f) => f.core.description },
  { label: 'Keywords', fn: (f) => f.core.keywords },
  { label: 'Category', fn: (f) => f.core.category },
  { label: 'Content Status', fn: (f) => f.core.contentStatus },
  { label: 'Revision Count', fn: (f) => f.core.revision },
  { label: 'Created Time', fn: (f) => formatDate(f.core.created) },
  { label: 'Last Modified By', fn: (f) => f.core.lastModifiedBy },
  { label: 'Modified Time', fn: (f) => formatDate(f.core.modified) },
  { label: 'Last Printed', fn: (f) => formatDate(f.core.lastPrinted) },

  // App properties
  { label: 'Application', fn: (f) => f.app.Application },
  { label: 'App Version', fn: (f) => f.app.AppVersion },
  { label: 'Company', fn: (f) => f.app.Company },
  { label: 'Manager', fn: (f) => f.app.Manager },
  { label: 'Template', fn: (f) => f.app.Template },
  {
    label: 'Total Editing Time',
    fn: (f) => formatMinutes(f.app.TotalTime) || f.app.TotalTime
  },
  // Format Specific
  {
    label: 'Format-Specific Details',
    fn: (f) => {
      if (f.type === 'docx') {
        return `Pages: ${f.app.Pages || '—'} | Words: ${f.app.Words || '—'} | Chars: ${f.app.Characters || '—'}`;
      } else if (f.type === 'pptx') {
        return `Slides: ${f.app.Slides || '—'} | Hidden: ${f.app.HiddenSlides || '—'} | Notes: ${f.app.Notes || '—'}`;
      } else if (f.type === 'xlsx') {
        return `Sheets: ${f.sheets.length} (${f.sheets.map(s => s.name).slice(0, 3).join(', ')}${f.sheets.length > 3 ? '...' : ''})`;
      }
      return '—';
    }
  }
];

export default function OfficeMeta() {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  // View states
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelectedIds, setCompareSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'all-parameters'
  
  // Search & collapsed category cards
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({
    core: false,
    app: false,
    format: false,
    custom: false
  });
  
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDropzoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processFiles = async (fileList) => {
    setLoading(true);
    setStatus('Parsing files...');
    const acceptedExtensions = ['docx', 'xlsx', 'pptx'];
    const newFiles = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (!acceptedExtensions.includes(ext)) {
        setStatus(`Skipped unsupported file type: ${file.name}`);
        continue;
      }

      // Check if file is already added
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        setStatus(`File already added: ${file.name}`);
        continue;
      }

      try {
        const zip = await JSZip.loadAsync(file);
        
        // 1. Read core.xml
        let coreData = {};
        const coreFile = zip.file("docProps/core.xml");
        if (coreFile) {
          const coreText = await coreFile.async("string");
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(coreText, "application/xml");
          coreData = {
            creator: getTagValue(xmlDoc, "creator"),
            lastModifiedBy: getTagValue(xmlDoc, "lastModifiedBy"),
            created: getTagValue(xmlDoc, "created"),
            modified: getTagValue(xmlDoc, "modified"),
            revision: getTagValue(xmlDoc, "revision"),
            title: getTagValue(xmlDoc, "title"),
            subject: getTagValue(xmlDoc, "subject"),
            description: getTagValue(xmlDoc, "description"),
            keywords: getTagValue(xmlDoc, "keywords"),
            category: getTagValue(xmlDoc, "category"),
            contentStatus: getTagValue(xmlDoc, "contentStatus"),
            lastPrinted: getTagValue(xmlDoc, "lastPrinted")
          };
        }

        // 2. Read app.xml
        let appData = {};
        const appFile = zip.file("docProps/app.xml");
        if (appFile) {
          const appText = await appFile.async("string");
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(appText, "application/xml");
          appData = {
            Application: getTagValue(xmlDoc, "Application"),
            AppVersion: getTagValue(xmlDoc, "AppVersion"),
            Company: getTagValue(xmlDoc, "Company"),
            Manager: getTagValue(xmlDoc, "Manager"),
            Template: getTagValue(xmlDoc, "Template"),
            TotalTime: getTagValue(xmlDoc, "TotalTime"),
            // docx specific
            Pages: getTagValue(xmlDoc, "Pages"),
            Words: getTagValue(xmlDoc, "Words"),
            Characters: getTagValue(xmlDoc, "Characters"),
            CharactersWithSpaces: getTagValue(xmlDoc, "CharactersWithSpaces"),
            Paragraphs: getTagValue(xmlDoc, "Paragraphs"),
            Lines: getTagValue(xmlDoc, "Lines"),
            // pptx specific
            Slides: getTagValue(xmlDoc, "Slides"),
            HiddenSlides: getTagValue(xmlDoc, "HiddenSlides"),
            Notes: getTagValue(xmlDoc, "Notes"),
            PresentationFormat: getTagValue(xmlDoc, "PresentationFormat"),
            MMClips: getTagValue(xmlDoc, "MMClips"),
            // xlsx specific
            headingPairs: parseHeadingPairs(xmlDoc)
          };
        }

        // 3. Read custom.xml
        let customData = {};
        const customFile = zip.file("docProps/custom.xml");
        if (customFile) {
          const customText = await customFile.async("string");
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(customText, "application/xml");
          customData = parseCustomProperties(xmlDoc);
        }

        // 4. Read sheets for xlsx
        let sheets = [];
        if (ext === 'xlsx') {
          sheets = await extractWorksheets(zip);
        }

        // 5. Try to read thumbnail image if present (typically docProps/thumbnail.jpeg or docProps/thumbnail.png)
        let thumbnail = null;
        try {
          const thumbFile = zip.file("docProps/thumbnail.jpeg") || zip.file("docProps/thumbnail.png");
          if (thumbFile) {
            const blob = await thumbFile.async("blob");
            thumbnail = URL.createObjectURL(blob);
          }
        } catch (thumbErr) {
          console.warn("Failed to extract thumbnail", thumbErr);
        }

        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        newFiles.push({
          id,
          name: file.name,
          size: file.size,
          formattedSize: formatBytes(file.size),
          type: ext,
          core: coreData,
          app: appData,
          custom: customData,
          sheets: sheets,
          thumbnail: thumbnail
        });
      } catch (err) {
        console.error("Error parsing Office file", err);
        setStatus(`Failed to parse file: ${file.name}. Invalid format or corrupted.`);
      }
    }

    if (newFiles.length > 0) {
      setFiles(prev => {
        const updated = [...prev, ...newFiles];
        setSelectedFileId(newFiles[0].id);
        // Automatically check new files for comparison
        setCompareSelectedIds(curr => [...curr, ...newFiles.map(f => f.id)]);
        return updated;
      });
      setStatus(`Successfully parsed ${newFiles.length} file(s).`);
    }
    setLoading(false);
  };

  const handleRemoveFile = (id) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove && fileToRemove.thumbnail) {
        URL.revokeObjectURL(fileToRemove.thumbnail);
      }
      const updated = prev.filter(f => f.id !== id);
      if (selectedFileId === id) {
        setSelectedFileId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
    setCompareSelectedIds(prev => prev.filter(fId => fId !== id));
  };

  const handleClearAll = () => {
    files.forEach(f => {
      if (f.thumbnail) {
        URL.revokeObjectURL(f.thumbnail);
      }
    });
    setFiles([]);
    setSelectedFileId(null);
    setCompareSelectedIds([]);
    setCompareMode(false);
    setStatus('Cleared all files.');
  };

  const handleExportJson = () => {
    if (!activeFile) return;
    const metadata = {
      filename: activeFile.name,
      fileSize: activeFile.size,
      fileType: activeFile.type,
      coreProperties: activeFile.core,
      applicationProperties: activeFile.app,
      customProperties: activeFile.custom,
      sheets: activeFile.sheets
    };
    const jsonString = JSON.stringify(metadata, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name.replace(/\.[^/.]+$/, "") + "_metadata.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleCompareSelection = (id) => {
    setCompareSelectedIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const activeFile = files.find(f => f.id === selectedFileId);

  // File type specific badge / styles
  const getFileBadge = (type) => {
    switch (type) {
      case 'docx':
        return { label: 'Word (DOCX)', colorClass: 'badge-docx', icon: getFileIcon('docx', 20) };
      case 'xlsx':
        return { label: 'Excel (XLSX)', colorClass: 'badge-xlsx', icon: getFileIcon('xlsx', 20) };
      case 'pptx':
        return { label: 'PowerPoint (PPTX)', colorClass: 'badge-pptx', icon: getFileIcon('pptx', 20) };
      default:
        return { label: 'Unknown', colorClass: 'badge-unknown', icon: getFileIcon('default', 20) };
    }
  };

  // Compile, filter, and group all parameters for the selected file
  const getGroupedAdvancedTags = (file) => {
    if (!file) return { groups: {}, matchCount: 0 };

    const groups = {
      core: [],
      app: [],
      format: [],
      custom: []
    };

    let matchCount = 0;

    const checkMatch = (name, value, desc) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return name.toLowerCase().includes(q) ||
             String(value).toLowerCase().includes(q) ||
             String(desc).toLowerCase().includes(q);
    };

    const addTag = (groupKey, name, value, desc) => {
      if (checkMatch(name, value, desc)) {
        groups[groupKey].push({ name, value, description: desc });
        matchCount++;
      }
    };

    // 1. Core Properties
    const coreFields = [
      { key: 'Title', dbKey: 'title', rawValue: file.core.title },
      { key: 'Creator (Author)', dbKey: 'creator', rawValue: file.core.creator },
      { key: 'Subject', dbKey: 'subject', rawValue: file.core.subject },
      { key: 'Description / Notes', dbKey: 'description', rawValue: file.core.description },
      { key: 'Keywords', dbKey: 'keywords', rawValue: file.core.keywords },
      { key: 'Category', dbKey: 'category', rawValue: file.core.category },
      { key: 'Content Status', dbKey: 'contentStatus', rawValue: file.core.contentStatus },
      { key: 'Revision Count', dbKey: 'revision', rawValue: file.core.revision },
      { key: 'Created Time', dbKey: 'created', rawValue: formatDate(file.core.created) },
      { key: 'Last Modified By', dbKey: 'lastModifiedBy', rawValue: file.core.lastModifiedBy },
      { key: 'Modified Time', dbKey: 'modified', rawValue: formatDate(file.core.modified) },
      { key: 'Last Printed', dbKey: 'lastPrinted', rawValue: formatDate(file.core.lastPrinted) },
    ];
    coreFields.forEach(f => {
      if (f.rawValue !== undefined && f.rawValue !== '') {
        addTag('core', f.key, f.rawValue, FIELD_DESCRIPTIONS[f.dbKey] || 'Shared core property');
      }
    });



    // 2. App Properties
    const appFields = [
      { key: 'Application Software', dbKey: 'Application', rawValue: file.app.Application },
      { key: 'Application Version', dbKey: 'AppVersion', rawValue: file.app.AppVersion },
      { key: 'Company', dbKey: 'Company', rawValue: file.app.Company },
      { key: 'Manager', dbKey: 'Manager', rawValue: file.app.Manager },
      { key: 'Template Used', dbKey: 'Template', rawValue: file.app.Template },
    ];
    appFields.forEach(f => {
      if (f.rawValue !== undefined && f.rawValue !== '') {
        addTag('app', f.key, f.rawValue, FIELD_DESCRIPTIONS[f.dbKey] || 'Application configuration property');
      }
    });

    const formattedTime = formatMinutes(file.app.TotalTime);
    if (formattedTime) {
      addTag('app', 'Total Editing Time', formattedTime, FIELD_DESCRIPTIONS.TotalTime);
    } else if (file.app.TotalTime !== undefined && file.app.TotalTime !== '') {
      addTag('app', 'Total Editing Time', file.app.TotalTime, FIELD_DESCRIPTIONS.TotalTime);
    }

    // 3. Format Specific
    if (file.type === 'docx') {
      const docxFields = [
        { key: 'Total Pages', dbKey: 'Pages', rawValue: file.app.Pages },
        { key: 'Words Count', dbKey: 'Words', rawValue: file.app.Words },
        { key: 'Characters', dbKey: 'Characters', rawValue: file.app.Characters },
        { key: 'Characters (with spaces)', dbKey: 'CharactersWithSpaces', rawValue: file.app.CharactersWithSpaces },
        { key: 'Paragraphs', dbKey: 'Paragraphs', rawValue: file.app.Paragraphs },
        { key: 'Lines', dbKey: 'Lines', rawValue: file.app.Lines },
      ];
      docxFields.forEach(f => {
        if (f.rawValue !== undefined && f.rawValue !== '') {
          addTag('format', f.key, f.rawValue, FIELD_DESCRIPTIONS[f.dbKey] || 'Word document metric');
        }
      });
    } else if (file.type === 'pptx') {
      const pptxFields = [
        { key: 'Slides Count', dbKey: 'Slides', rawValue: file.app.Slides },
        { key: 'Hidden Slides', dbKey: 'HiddenSlides', rawValue: file.app.HiddenSlides },
        { key: 'Notes Pages', dbKey: 'Notes', rawValue: file.app.Notes },
        { key: 'Presentation Format', dbKey: 'PresentationFormat', rawValue: file.app.PresentationFormat },
        { key: 'Multimedia Clips (MMClips)', dbKey: 'MMClips', rawValue: file.app.MMClips },
      ];
      pptxFields.forEach(f => {
        if (f.rawValue !== undefined && f.rawValue !== '') {
          addTag('format', f.key, f.rawValue, FIELD_DESCRIPTIONS[f.dbKey] || 'PowerPoint presentation metric');
        }
      });
    } else if (file.type === 'xlsx') {
      if (file.sheets && file.sheets.length > 0) {
        addTag('format', 'Sheets Count', String(file.sheets.length), 'Total number of worksheets');
        addTag('format', 'Worksheets List', file.sheets.map(s => `${s.name}${s.state !== 'visible' ? ` (${s.state})` : ''}`).join(', '), FIELD_DESCRIPTIONS.Sheets);
      }
      if (file.app.headingPairs && file.app.headingPairs.length > 0) {
        file.app.headingPairs.forEach(pair => {
          addTag('format', `Heading Pair: ${pair.label}`, pair.count, FIELD_DESCRIPTIONS.HeadingPairs);
        });
      }
    }

    // 4. Custom Properties
    if (file.custom) {
      Object.keys(file.custom).forEach(name => {
        addTag('custom', name, file.custom[name], 'Custom user-defined metadata property');
      });
    }

    // Sort each group alphabetically by tag name
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const valA = String(a.name).toLowerCase();
        const valB = String(b.name).toLowerCase();
        return valA.localeCompare(valB);
      });
    });

    return { groups, matchCount };
  };

  const toggleExpandAll = () => {
    const anyCollapsed = Object.values(collapsedGroups).some(v => v);
    const target = !anyCollapsed;
    setCollapsedGroups({
      core: target,
      app: target,
      format: target,
      custom: target
    });
  };

  // Rendering side-by-side comparison view
  const renderCompareView = () => {
    const comparedFiles = files.filter(f => compareSelectedIds.includes(f.id));

    return (
      <div className="imgmeta-compare-container card-glass">
        <div className="compare-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M4 4l5 5"></path>
            </svg>
            Side-by-Side Office Metadata Comparison
          </h3>
          <button className="btn-secondary btn-sm" onClick={() => setCompareMode(false)}>
            Back to Detail View
          </button>
        </div>
        <div className="imgmeta-table-container compare-table-wrapper">
          {comparedFiles.length > 0 ? (
            <table className="imgmeta-table compare-table">
              <thead>
                <tr>
                  <th>Field / Parameter</th>
                  {comparedFiles.map(f => (
                    <th key={f.id} className={f.id === selectedFileId ? 'active-col' : ''}>
                      <div className="compare-th-content">
                        <span className="compare-filename" title={f.name}>{f.name}</span>
                        <button
                          className="btn-close-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCompareSelection(f.id);
                          }}
                          title="Exclude from comparison"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_FIELDS.map((field, idx) => (
                  <tr key={idx}>
                    <td className="compare-field-label">{field.label}</td>
                    {comparedFiles.map(f => {
                      const val = field.fn(f);
                      return (
                        <td 
                          key={f.id} 
                          className={`${f.id === selectedFileId ? 'active-col' : ''} ${!val ? 'not-available' : ''}`}
                        >
                          {val || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="compare-empty-state">
              <p>No documents selected for comparison.</p>
              <p className="small text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Use the checkboxes on the thumbnails bar above to select files to compare.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render key metadata cards as tabular imgmeta-tables (Overview)
  const renderOverviewTab = () => {
    if (!activeFile) return null;

    // 1. Core Properties (Key Fields only)
    const coreItems = [
      { label: 'Title', value: activeFile.core.title, description: FIELD_DESCRIPTIONS.title },
      { label: 'Creator (Author)', value: activeFile.core.creator, description: FIELD_DESCRIPTIONS.creator },
      { label: 'Created Time', value: formatDate(activeFile.core.created), description: FIELD_DESCRIPTIONS.created },
      { label: 'Last Modified By', value: activeFile.core.lastModifiedBy, description: FIELD_DESCRIPTIONS.lastModifiedBy },
      { label: 'Modified Time', value: formatDate(activeFile.core.modified), description: FIELD_DESCRIPTIONS.modified }
    ].filter(item => item.value !== undefined && item.value !== '');



    // 2. Application Properties (Key Fields only)
    const appItems = [
      { label: 'Application Software', value: activeFile.app.Application, description: FIELD_DESCRIPTIONS.Application },
      { label: 'Application Version', value: activeFile.app.AppVersion, description: FIELD_DESCRIPTIONS.AppVersion }
    ].filter(item => item.value !== undefined && item.value !== '');

    if (activeFile.app.TotalTime !== undefined && activeFile.app.TotalTime !== '') {
      appItems.push({
        label: 'Total Editing Time',
        value: activeFile.app.TotalTime,
        description: FIELD_DESCRIPTIONS.TotalTime
      });
    }

    const renderMetaTable = (title, items) => {
      const query = searchQuery.toLowerCase().trim();
      const filtered = items.filter(item => {
        if (!query) return true;
        return (item.description || '').toLowerCase().includes(query) || 
               (item.value || '').toLowerCase().includes(query);
      });
      if (filtered.length === 0 && query) return null;

      return (
        <div className="officemeta-group-card card-glass">
          <h3 className="officemeta-group-title">{title}</h3>
          <table className="imgmeta-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.description || item.label}</td>
                  <td title={item.value}>
                    {item.value || <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    const renderFormatSpecific = () => {
      let items = [];
      const badge = getFileBadge(activeFile.type);
      if (activeFile.type === 'docx') {
        items = [
          { label: 'Total Pages', value: activeFile.app.Pages, description: FIELD_DESCRIPTIONS.Pages },
          { label: 'Words Count', value: activeFile.app.Words, description: FIELD_DESCRIPTIONS.Words }
        ].filter(item => item.value !== undefined && item.value !== '');
      } else if (activeFile.type === 'pptx') {
        items = [
          { label: 'Slides Count', value: activeFile.app.Slides, description: FIELD_DESCRIPTIONS.Slides }
        ].filter(item => item.value !== undefined && item.value !== '');
      } else if (activeFile.type === 'xlsx') {
        const xlsxItems = [];
        if (activeFile.sheets && activeFile.sheets.length > 0) {
          xlsxItems.push({
            label: 'Sheets Count',
            value: String(activeFile.sheets.length),
            description: 'Total number of worksheets'
          });
          xlsxItems.push({
            label: 'Worksheets List',
            value: activeFile.sheets.map(s => `${s.name}${s.state !== 'visible' ? ` (${s.state})` : ''}`).join(', '),
            description: FIELD_DESCRIPTIONS.Sheets
          });
        }
        return renderMetaTable(`${badge.label} Specific Properties`, xlsxItems);
      }
      return renderMetaTable(`${badge.label} Specific Properties`, items);
    };

    return (
      <div className="officemeta-groups-layout">
        {renderFormatSpecific()}
        {renderMetaTable("Core Properties", coreItems)}
        {renderMetaTable("Application Properties", appItems)}
      </div>
    );
  };

  // Render collapsible cards containing parameter tables (Advanced/All Parameters)
  const renderAllParametersTab = () => {
    if (!activeFile) return null;

    const { groups, matchCount } = getGroupedAdvancedTags(activeFile);

    const advancedGroups = [
      {
        id: 'core',
        label: 'Core Properties',
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        )
      },
      {
        id: 'app',
        label: 'Application Properties',
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        )
      },
      {
        id: 'format',
        label: 'Format-Specific Properties',
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        )
      },
      {
        id: 'custom',
        label: 'Custom Properties',
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
          </svg>
        )
      }
    ];

    if (matchCount === 0) {
      return (
        <div className="officemeta-empty-message">No matching parameters found.</div>
      );
    }

    return (
      <div className="imgmeta-advanced-wrapper">
        <div className="advanced-toolbar">
          <span className="match-count">Found {matchCount} metadata parameters</span>
          <button className="btn-secondary btn-sm" onClick={toggleExpandAll}>
            {Object.values(collapsedGroups).every(v => !v) ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
        
        <div className="advanced-groups-list">
          {advancedGroups.map(g => {
            const list = groups[g.id] || [];
            if (list.length === 0) return null;
            
            const isCollapsed = collapsedGroups[g.id];
            
            return (
              <div key={g.id} className={`advanced-group-card ${isCollapsed ? 'collapsed' : ''}`}>
                <div
                  className="advanced-group-header"
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                >
                  <div className="header-label">
                    <span className="group-icon">{g.icon}</span>
                    <span className="group-name">{g.label}</span>
                    <span className="group-count">({list.length})</span>
                  </div>
                  <span className="collapse-arrow">{isCollapsed ? '▼' : '▲'}</span>
                </div>
                
                {!isCollapsed && (
                  <div className="advanced-group-body">
                    <table className="imgmeta-table">
                      <thead>
                        <tr>
                          <th>Parameter Name</th>
                          <th>Value</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map(tag => (
                          <tr key={tag.name}>
                            <td>{tag.name}</td>
                            <td title={tag.value}>
                              {tag.value || <span className="text-muted">—</span>}
                            </td>
                            <td title={tag.description}>{tag.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <article id="tool-officemeta" className="tool-card tool-card--wide active">
      <h2>Office Metadata Reader</h2>
      <p className="tool-intro">
        Extract, inspect and analyze core properties, application properties, custom metadata, and format structures from Word, Excel, and PowerPoint files locally.
      </p>

      <div 
        className="imgmeta-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="officemeta-file-input"
          accept=".docx,.xlsx,.pptx"
          multiple
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* Drag over overlay when files exist */}
        {dragOver && files.length > 0 && (
          <div className="imgmeta-drag-overlay">
            <div className="overlay-content">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <p>Drop Office files to analyze</p>
            </div>
          </div>
        )}

        {/* Upload bar (matching ImgMeta) */}
        {files.length > 0 && (
          <div className="imgmeta-top-bar card-glass">
            <div className="thumbnails-scroll-container">
              {files.map(file => {
                const badge = getFileBadge(file.type);
                const isSelected = file.id === selectedFileId;
                return (
                  <div
                    key={file.id}
                    className={`thumbnail-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedFileId(file.id);
                      setCompareMode(false); // Switch back to detail view when selecting another file
                    }}
                  >
                    {files.length > 1 && (
                      <input
                        type="checkbox"
                        className="thumb-compare-checkbox"
                        checked={compareSelectedIds.includes(file.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleCompareSelection(file.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Include in comparison"
                      />
                    )}
                    <div className="thumb-img-wrapper" style={{ background: 'transparent' }}>
                      <div className={`thumb-file-icon ${badge.colorClass}`} style={{ width: '100%', height: '100%', borderRadius: 0 }}>
                        {badge.icon}
                      </div>
                      <button
                        className="thumb-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.id);
                        }}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                    <div className="thumb-info">
                      <span className="thumb-name" title={file.name}>{file.name}</span>
                      <span className="thumb-size">{file.formattedSize}</span>
                    </div>
                  </div>
                );
              })}
              
              <div className="thumbnail-add-card" onClick={handleDropzoneClick}>
                <div className="add-icon">+</div>
                <span>Add More</span>
              </div>
            </div>

            <div className="top-bar-actions">
              <button 
                className={`btn-secondary ${compareMode ? 'active' : ''}`}
                onClick={() => setCompareMode(!compareMode)}
                title="Toggle side-by-side comparison"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M4 4l5 5"></path>
                </svg>
                Compare {files.length > 1 ? `(${compareSelectedIds.length})` : ''}
              </button>
              <button className="btn-secondary" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Dropzone for initially empty state */}
        {files.length === 0 && (
          <div 
            className={`imgmeta-dropzone ${dragOver ? 'dragover' : ''}`}
            onClick={handleDropzoneClick}
          >
            <div className="dropzone-content">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <polyline points="9 15 12 12 15 15"></polyline>
              </svg>
              <p className="dropzone-title">Drag &amp; drop Microsoft Office documents here</p>
              <p className="dropzone-or">or</p>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
              >
                Browse Files
              </button>
              <p className="dropzone-note">Supports Word (.docx), Excel (.xlsx), and PowerPoint (.pptx)</p>
            </div>
          </div>
        )}

        {/* Error/Status Banner */}
        {status && (
          <div className="officemeta-status-banner card-glass">
            <span className="status-dot"></span>
            <span className="status-text">{status}</span>
          </div>
        )}

        {/* Results Area */}
        {files.length > 0 && (
          compareMode ? (
            renderCompareView()
          ) : (
            activeFile && (
              <div id="officemeta-results" className="imgmeta-results-grid" style={{ display: 'grid' }}>
                {/* Left Column: File Info & Preview & Actions */}
                <div className="imgmeta-preview-col">
                  <div className="card-glass imgmeta-preview-card">
                    <div className="imgmeta-img-container" style={{ minHeight: '180px' }}>
                      {activeFile.thumbnail ? (
                        <img id="officemeta-preview-img" alt="Preview" src={activeFile.thumbnail} style={{ display: 'block' }} />
                      ) : (
                        <div 
                          className="imgmeta-raw-icon" 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: '12px',
                            color: activeFile.type === 'docx' ? '#2563eb' : activeFile.type === 'xlsx' ? '#10b981' : activeFile.type === 'pptx' ? '#f97316' : '#6b7280'
                          }}
                        >
                          {getFileIcon(activeFile.type, 48)}
                          <span>{getFileBadge(activeFile.type).label}</span>
                        </div>
                      )}
                    </div>
                    <div className="imgmeta-file-meta">
                      <h3 id="officemeta-file-name">{activeFile.name}</h3>
                      <p><span className="label">Format:</span> <span>{activeFile.type.toUpperCase()}</span></p>
                      <p><span className="label">Size:</span> <span>{activeFile.formattedSize}</span></p>
                    </div>
                  </div>

                  <div className="imgmeta-actions">
                    <button
                      id="officemeta-download-json"
                      className="btn-primary flex-1"
                      onClick={handleExportJson}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Export JSON
                    </button>
                    <button id="officemeta-clear" className="btn-secondary" onClick={() => handleRemoveFile(activeFile.id)}>Remove</button>
                  </div>
                </div>

                {/* Right Column: Metadata Tabs & Table */}
                <div className="imgmeta-data-col">
                  <div className="imgmeta-header-actions">
                    <div className="imgmeta-tabs">
                      <button 
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                      >
                        Overview
                      </button>
                      <button 
                        className={`tab-btn ${activeTab === 'all-parameters' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all-parameters')}
                      >
                        All Parameters
                      </button>
                    </div>
                    <div className="imgmeta-search-wrapper">
                      <input
                        type="text"
                        placeholder="Search tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {loading ? (
                    <div className="officemeta-loading">
                      <div className="spinner"></div>
                      <p>Analyzing document...</p>
                    </div>
                  ) : (
                    activeTab === 'overview' ? renderOverviewTab() : renderAllParametersTab()
                  )}
                </div>
              </div>
            )
          )
        )}
      </div>
    </article>
  );
}
