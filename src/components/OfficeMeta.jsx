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
  { label: 'Total Editing Time (mins)', fn: (f) => f.app.TotalTime },
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
  
  // Search & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('key'); // 'key' or 'category'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  
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
          sheets: sheets
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
      const updated = prev.filter(f => f.id !== id);
      if (selectedFileId === id) {
        setSelectedFileId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
    setCompareSelectedIds(prev => prev.filter(fId => fId !== id));
  };

  const handleClearAll = () => {
    setFiles([]);
    setSelectedFileId(null);
    setCompareSelectedIds([]);
    setCompareMode(false);
    setStatus('Cleared all files.');
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
        return { label: 'Word (DOCX)', colorClass: 'badge-docx', icon: '📝' };
      case 'xlsx':
        return { label: 'Excel (XLSX)', colorClass: 'badge-xlsx', icon: '📊' };
      case 'pptx':
        return { label: 'PowerPoint (PPTX)', colorClass: 'badge-pptx', icon: '🎨' };
      default:
        return { label: 'Unknown', colorClass: 'badge-unknown', icon: '📁' };
    }
  };

  // Compile all parameters for the selected file
  const getAllParametersList = (file) => {
    if (!file) return [];
    const list = [];

    // Core Properties
    const coreFields = [
      { key: 'Title', value: file.core.title, category: 'Core Properties' },
      { key: 'Creator (Author)', value: file.core.creator, category: 'Core Properties' },
      { key: 'Subject', value: file.core.subject, category: 'Core Properties' },
      { key: 'Description / Notes', value: file.core.description, category: 'Core Properties' },
      { key: 'Keywords', value: file.core.keywords, category: 'Core Properties' },
      { key: 'Category', value: file.core.category, category: 'Core Properties' },
      { key: 'Content Status', value: file.core.contentStatus, category: 'Core Properties' },
      { key: 'Revision Count', value: file.core.revision, category: 'Core Properties' },
      { key: 'Created Time', value: formatDate(file.core.created), category: 'Core Properties' },
      { key: 'Last Modified By', value: file.core.lastModifiedBy, category: 'Core Properties' },
      { key: 'Modified Time', value: formatDate(file.core.modified), category: 'Core Properties' },
      { key: 'Last Printed', value: formatDate(file.core.lastPrinted), category: 'Core Properties' },
    ];
    coreFields.forEach(f => {
      if (f.value !== undefined) list.push(f);
    });

    // App Properties
    const appFields = [
      { key: 'Application Software', value: file.app.Application, category: 'Application Properties' },
      { key: 'Application Version', value: file.app.AppVersion, category: 'Application Properties' },
      { key: 'Company', value: file.app.Company, category: 'Application Properties' },
      { key: 'Manager', value: file.app.Manager, category: 'Application Properties' },
      { key: 'Template Used', value: file.app.Template, category: 'Application Properties' },
      { key: 'Total Editing Time (mins)', value: file.app.TotalTime, category: 'Application Properties' },
    ];
    appFields.forEach(f => {
      if (f.value !== undefined) list.push(f);
    });

    // Format Specific Properties
    if (file.type === 'docx') {
      const docxFields = [
        { key: 'Total Pages', value: file.app.Pages, category: 'Format Specific' },
        { key: 'Words Count', value: file.app.Words, category: 'Format Specific' },
        { key: 'Characters', value: file.app.Characters, category: 'Format Specific' },
        { key: 'Characters (with spaces)', value: file.app.CharactersWithSpaces, category: 'Format Specific' },
        { key: 'Paragraphs', value: file.app.Paragraphs, category: 'Format Specific' },
        { key: 'Lines', value: file.app.Lines, category: 'Format Specific' },
      ];
      docxFields.forEach(f => list.push(f));
    } else if (file.type === 'pptx') {
      const pptxFields = [
        { key: 'Slides Count', value: file.app.Slides, category: 'Format Specific' },
        { key: 'Hidden Slides', value: file.app.HiddenSlides, category: 'Format Specific' },
        { key: 'Notes Pages', value: file.app.Notes, category: 'Format Specific' },
        { key: 'Presentation Format', value: file.app.PresentationFormat, category: 'Format Specific' },
        { key: 'Multimedia Clips (MMClips)', value: file.app.MMClips, category: 'Format Specific' },
      ];
      pptxFields.forEach(f => list.push(f));
    } else if (file.type === 'xlsx') {
      list.push({ key: 'Sheets Count', value: String(file.sheets.length), category: 'Format Specific' });
      if (file.sheets.length > 0) {
        list.push({
          key: 'Worksheets List',
          value: file.sheets.map(s => `${s.name}${s.state !== 'visible' ? ` (${s.state})` : ''}`).join(', '),
          category: 'Format Specific'
        });
      }
      if (file.app.headingPairs && file.app.headingPairs.length > 0) {
        file.app.headingPairs.forEach(pair => {
          list.push({
            key: `Heading Pair: ${pair.label}`,
            value: pair.count,
            category: 'Format Specific'
          });
        });
      }
    }

    // Custom properties
    if (file.custom) {
      Object.keys(file.custom).forEach(name => {
        list.push({
          key: name,
          value: file.custom[name],
          category: 'Custom Properties'
        });
      });
    }

    return list;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Rendering side-by-side comparison view
  const renderCompareView = () => {
    const comparedFiles = files.filter(f => compareSelectedIds.includes(f.id));

    return (
      <div className="imgmeta-compare-container card-glass">
        <div className="compare-header">
          <h3>⚖️ Side-by-Side Office Metadata Comparison</h3>
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

  // Render original grouped metadata cards (Overview)
  const renderOverviewTab = () => {
    if (!activeFile) return null;

    const coreItems = [
      { label: 'Title', value: activeFile.core.title },
      { label: 'Creator (Author)', value: activeFile.core.creator },
      { label: 'Subject', value: activeFile.core.subject },
      { label: 'Description / Notes', value: activeFile.core.description },
      { label: 'Keywords', value: activeFile.core.keywords },
      { label: 'Category', value: activeFile.core.category },
      { label: 'Content Status', value: activeFile.core.contentStatus },
      { label: 'Revision Count', value: activeFile.core.revision },
      { label: 'Created Time', value: formatDate(activeFile.core.created) },
      { label: 'Last Modified By', value: activeFile.core.lastModifiedBy },
      { label: 'Modified Time', value: formatDate(activeFile.core.modified) },
      { label: 'Last Printed', value: formatDate(activeFile.core.lastPrinted) }
    ];

    const appItems = [
      { label: 'Application Software', value: activeFile.app.Application },
      { label: 'Application Version', value: activeFile.app.AppVersion },
      { label: 'Company', value: activeFile.app.Company },
      { label: 'Manager', value: activeFile.app.Manager },
      { label: 'Template Used', value: activeFile.app.Template },
      { label: 'Total Editing Time (mins)', value: activeFile.app.TotalTime }
    ];

    const renderMetaGrid = (title, items) => {
      const query = searchQuery.toLowerCase().trim();
      const filtered = items.filter(item => {
        if (!query) return true;
        return item.label.toLowerCase().includes(query) || (item.value || '').toLowerCase().includes(query);
      });
      if (filtered.length === 0 && query) return null;

      return (
        <div className="officemeta-group-card card-glass">
          <h3 className="officemeta-group-title">{title}</h3>
          <div className="officemeta-grid">
            {filtered.map((item, idx) => (
              <div key={idx} className="officemeta-cell">
                <div className="officemeta-cell-label">{item.label}</div>
                <div className={`officemeta-cell-value ${item.value ? '' : 'not-available'}`}>
                  {item.value || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const renderFormatSpecific = () => {
      let items = [];
      const badge = getFileBadge(activeFile.type);
      if (activeFile.type === 'docx') {
        items = [
          { label: 'Total Pages', value: activeFile.app.Pages },
          { label: 'Words Count', value: activeFile.app.Words },
          { label: 'Characters', value: activeFile.app.Characters },
          { label: 'Characters (with spaces)', value: activeFile.app.CharactersWithSpaces },
          { label: 'Paragraphs', value: activeFile.app.Paragraphs },
          { label: 'Lines', value: activeFile.app.Lines }
        ];
      } else if (activeFile.type === 'pptx') {
        items = [
          { label: 'Slides Count', value: activeFile.app.Slides },
          { label: 'Hidden Slides', value: activeFile.app.HiddenSlides },
          { label: 'Notes Pages', value: activeFile.app.Notes },
          { label: 'Presentation Format', value: activeFile.app.PresentationFormat },
          { label: 'Multimedia Clips (MMClips)', value: activeFile.app.MMClips }
        ];
      } else if (activeFile.type === 'xlsx') {
        return (
          <div className="officemeta-excel-specific">
            <div className="officemeta-group-card card-glass">
              <h3 className="officemeta-group-title">Excel Worksheets ({activeFile.sheets.length})</h3>
              <div className="officemeta-sheets-list">
                {activeFile.sheets.length > 0 ? (
                  activeFile.sheets.map((sheet, idx) => (
                    <div key={idx} className="officemeta-sheet-badge">
                      <span className="sheet-icon">📄</span>
                      <span className="sheet-name" title={sheet.name}>{sheet.name}</span>
                      {sheet.state !== 'visible' && (
                        <span className="sheet-state-hidden">Hidden</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="officemeta-empty-message">No worksheets detected.</div>
                )}
              </div>
            </div>
            <div className="officemeta-group-card card-glass">
              <h3 className="officemeta-group-title">Heading Pairs (Grouping Info)</h3>
              <div className="officemeta-grid">
                {activeFile.app.headingPairs && activeFile.app.headingPairs.length > 0 ? (
                  activeFile.app.headingPairs.map((pair, idx) => (
                    <div key={idx} className="officemeta-cell">
                      <div className="officemeta-cell-label">{pair.label}</div>
                      <div className="officemeta-cell-value">{pair.count}</div>
                    </div>
                  ))
                ) : (
                  <div className="officemeta-empty-message" style={{ gridColumn: 'span 2' }}>
                    No heading pairs detected.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      return renderMetaGrid(`${badge.label} Specific Properties`, items);
    };

    const renderCustomProperties = () => {
      if (!activeFile.custom || Object.keys(activeFile.custom).length === 0) return null;
      const customItems = Object.keys(activeFile.custom).map(key => ({
        label: key,
        value: activeFile.custom[key]
      }));
      return renderMetaGrid("Custom Properties", customItems);
    };

    return (
      <div className="officemeta-groups-layout">
        {renderFormatSpecific()}
        {renderMetaGrid("Core Properties", coreItems)}
        {renderMetaGrid("Application Properties", appItems)}
        {renderCustomProperties()}
      </div>
    );
  };

  // Render Sortable and Searchable parameters list
  const renderAllParametersTab = () => {
    if (!activeFile) return null;

    const allParams = getAllParametersList(activeFile);

    // Apply sorting
    const sorted = [...allParams].sort((a, b) => {
      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply filter
    const query = searchQuery.toLowerCase().trim();
    const filtered = sorted.filter(item => {
      if (!query) return true;
      return item.key.toLowerCase().includes(query) ||
             (item.value || '').toLowerCase().includes(query) ||
             item.category.toLowerCase().includes(query);
    });

    return (
      <div className="officemeta-all-params-view card-glass" style={{ padding: '24px', borderRadius: '14px' }}>
        <div className="compare-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
            📁 All Extracted Parameters ({filtered.length})
          </h3>
        </div>
        <div className="imgmeta-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {filtered.length > 0 ? (
            <table className="imgmeta-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('key')} 
                    style={{ cursor: 'pointer', textAlign: 'left', userSelect: 'none', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}
                  >
                    Parameter Name {sortField === 'key' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                  <th style={{ textAlign: 'left', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                    Value
                  </th>
                  <th 
                    onClick={() => handleSort('category')} 
                    style={{ cursor: 'pointer', textAlign: 'left', userSelect: 'none', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}
                  >
                    Category {sortField === 'category' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.key}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '0.85rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                      {item.value || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span className={`badge-category`} style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        {item.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="officemeta-empty-message">No matching parameters found.</div>
          )}
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
        className="officemeta-container"
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
          <div className="officemeta-drag-overlay">
            <div className="overlay-content">
              <span>📂 Drop Office files to analyze</span>
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
              >
                ⚖️ Compare {files.length > 1 ? `(${compareSelectedIds.length})` : ''}
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
            className={`officemeta-dropzone ${dragOver ? 'dragover' : ''}`}
            onClick={handleDropzoneClick}
          >
            <div className="dropzone-content">
              <div className="dropzone-icon">📂</div>
              <p className="dropzone-title">Drag &amp; drop Microsoft Office documents here</p>
              <p className="dropzone-or">or</p>
              <button 
                type="button" 
                className="btn-primary" 
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
              <div className="officemeta-results-container">
                
                <div className="officemeta-file-summary card-glass">
                  <div className="summary-left">
                    <div className={`summary-type-icon ${getFileBadge(activeFile.type).colorClass}`}>
                      {getFileBadge(activeFile.type).icon}
                    </div>
                    <div className="summary-details">
                      <h4>{activeFile.name}</h4>
                      <p>{getFileBadge(activeFile.type).label} • {activeFile.formattedSize}</p>
                    </div>
                  </div>
                  <div className="summary-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="home-tabs" style={{ margin: 0, padding: 0, border: 'none' }}>
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
                    <input 
                      type="text"
                      placeholder="🔍 Search metadata..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="officemeta-search-input"
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
            )
          )
        )}
      </div>
    </article>
  );
}
