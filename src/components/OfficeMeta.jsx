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

export default function OfficeMeta() {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
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

        // 3. Read sheets for xlsx
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
  };

  const handleClearAll = () => {
    setFiles([]);
    setSelectedFileId(null);
    setStatus('Cleared all files.');
  };

  const activeFile = files.find(f => f.id === selectedFileId);

  // File type specific styles and icons
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

  const renderFileListItem = (file) => {
    const badge = getFileBadge(file.type);
    const isSelected = file.id === selectedFileId;
    return (
      <div 
        key={file.id} 
        className={`officemeta-thumb-card ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedFileId(file.id)}
      >
        <div className={`thumb-file-icon ${badge.colorClass}`}>
          {badge.icon}
        </div>
        <div className="thumb-info">
          <span className="thumb-name" title={file.name}>{file.name}</span>
          <span className="thumb-size">{file.formattedSize}</span>
        </div>
        <button 
          className="thumb-remove-btn" 
          onClick={(e) => { e.stopPropagation(); handleRemoveFile(file.id); }}
          title="Remove file"
        >
          ×
        </button>
      </div>
    );
  };

  const renderMetaGrid = (title, items) => {
    const query = searchQuery.toLowerCase().trim();
    const filteredItems = items.filter(item => {
      if (!query) return true;
      return item.label.toLowerCase().includes(query) || (item.value || '').toLowerCase().includes(query);
    });

    if (filteredItems.length === 0 && query) return null;

    return (
      <div className="officemeta-group-card card-glass">
        <h3 className="officemeta-group-title">{title}</h3>
        <div className="officemeta-grid">
          {filteredItems.map((item, idx) => (
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
    if (!activeFile) return null;
    const badge = getFileBadge(activeFile.type);

    let items = [];
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
      const headingPairs = activeFile.app.headingPairs || [];
      const hasHeadingPairs = headingPairs.length > 0;
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
              {hasHeadingPairs ? (
                headingPairs.map((pair, idx) => (
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

  // Shared Core Metadata Items
  const coreItems = activeFile ? [
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
  ] : [];

  // Application Properties Items
  const appItems = activeFile ? [
    { label: 'Application Software', value: activeFile.app.Application },
    { label: 'Application Version', value: activeFile.app.AppVersion },
    { label: 'Company', value: activeFile.app.Company },
    { label: 'Manager', value: activeFile.app.Manager },
    { label: 'Template Used', value: activeFile.app.Template },
    { label: 'Total Editing Time (mins)', value: activeFile.app.TotalTime }
  ] : [];

  return (
    <article id="tool-officemeta" className="tool-card tool-card--wide active">
      <h2>Office Metadata Reader</h2>
      <p className="tool-intro">
        Extract, inspect and analyze core properties, application properties, and format-specific structures from Word, Excel, and PowerPoint files locally.
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

        {/* Top File bar if files exist */}
        {files.length > 0 && (
          <div className="officemeta-top-bar card-glass">
            <div className="officemeta-thumbnails-scroll">
              {files.map(renderFileListItem)}
              <div className="officemeta-add-card" onClick={handleDropzoneClick}>
                <span className="add-icon">+</span>
                <span>Add File</span>
              </div>
            </div>
            <div className="top-bar-actions">
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
        {files.length > 0 && activeFile && (
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
              <div className="summary-right">
                <input 
                  type="text"
                  placeholder="🔍 Search metadata fields..."
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
              <div className="officemeta-groups-layout">
                {/* Format Specific Properties Card */}
                {renderFormatSpecific()}

                {/* Core Properties Card */}
                {renderMetaGrid("Core Properties", coreItems)}

                {/* Application Properties Card */}
                {renderMetaGrid("Application Properties", appItems)}
              </div>
            )}

          </div>
        )}
      </div>
    </article>
  );
}
