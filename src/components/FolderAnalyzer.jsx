import React, { useState, useRef, useEffect } from 'react';

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 
  'scss', 'sass', 'less', 'svg', 'xml', 'yaml', 'yml', 'py', 'java', 'c', 
  'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'rb', 'pl', 'sh', 'bat', 
  'ps1', 'sql', 'ini', 'conf', 'cfg', 'env', 'gitignore', 'gitattributes', 
  'editorconfig', 'toml', 'csv', 'jsonl', 'graphql', 'prisma'
]);

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'rar', 'tar', 
  'gz', '7z', 'mp3', 'mp4', 'wav', 'flac', 'avi', 'mov', 'wmv', 'ogg', 
  'm4a', 'webm', 'exe', 'dll', 'so', 'dylib', 'bin', 'dat', 'db', 'sqlite', 
  'class', 'jar', 'war', 'eot', 'ttf', 'woff', 'woff2'
]);

const SYSTEM_EXCLUDES = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

function createGitignoreMatcher(gitignoreText) {
  if (!gitignoreText) return () => false;

  const rules = [];
  const lines = gitignoreText.split(/\r?\n/);

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    let isNegated = false;
    if (line.startsWith('!')) {
      isNegated = true;
      line = line.slice(1);
    }

    let isDirOnly = false;
    if (line.endsWith('/')) {
      isDirOnly = true;
      line = line.slice(0, -1);
    }

    // Convert glob pattern to regular expression
    let regexStr = line
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    if (line.startsWith('/')) {
      regexStr = '^' + regexStr.slice(1);
    } else {
      regexStr = '(^|\\/)' + regexStr;
    }

    regexStr += '(\\/|$)';

    try {
      rules.push({
        regex: new RegExp(regexStr),
        isNegated,
        isDirOnly
      });
    } catch (e) {
      // ignore
    }
  }

  return (filePath, isDir) => {
    let ignored = false;
    const parts = filePath.split('/');
    const relPath = parts.slice(1).join('/');

    if (!relPath) return false;

    for (const rule of rules) {
      if (rule.isDirOnly && !isDir) continue;

      if (rule.regex.test(relPath)) {
        ignored = !rule.isNegated;
      }
    }
    return ignored;
  };
}

export default function FolderAnalyzer() {
  const [customPath, setCustomPath] = useState('');
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [treeData, setTreeData] = useState(null);
  const [viewMode, setViewMode] = useState('figure'); // figure, text
  const [collapsedPaths, setCollapsedPaths] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [gitignoreText, setGitignoreText] = useState('');

  // Filters & Sorting States
  const [showSystemExclude, setShowSystemExclude] = useState(false);
  const [showGitignored, setShowGitignored] = useState(true);
  const [sortBy, setSortBy] = useState('name'); // name, type, lines, size
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  // Dynamic Metrics Calculation
  const projectStats = React.useMemo(() => {
    let filesCount = 0;
    let linesWithGitignore = 0;
    let linesWithoutGitignore = 0;
    let sizeWithGitignore = 0;
    let sizeWithoutGitignore = 0;

    function traverse(n, isRoot = false) {
      if (!isRoot && !showSystemExclude && n.isSystemExclude) return;
      if (!isRoot && !showGitignored && n.isIgnored) return;

      if (n.type === 'file') {
        filesCount++;
        sizeWithoutGitignore += n.size;
        linesWithoutGitignore += n.lineCount;

        if (!n.isIgnored) {
          sizeWithGitignore += n.size;
          linesWithGitignore += n.lineCount;
        }
      } else if (n.children) {
        n.children.forEach(c => traverse(c, false));
      }
    }

    if (treeData) {
      traverse(treeData, true);
    }

    return {
      filesCount,
      linesWithGitignore,
      linesWithoutGitignore,
      sizeWithGitignore,
      sizeWithoutGitignore
    };
  }, [treeData, showSystemExclude, showGitignored]);

  const folderInputRef = useRef(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadWrapperRef = useRef(null);

  // Close download dropdown on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (downloadWrapperRef.current && !downloadWrapperRef.current.contains(e.target)) {
        setDownloadOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Reset copy success tooltip after a delay
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // Recursively check if file is text/code by extension or content analysis
  async function isTextFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return false;
    if (TEXT_EXTENSIONS.has(ext)) return true;

    // Fallback: analyze file contents (first 1024 bytes)
    try {
      const chunk = await file.slice(0, 1024).arrayBuffer();
      const bytes = new Uint8Array(chunk);
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) return false; // Null byte indicates binary
      }
      return file.size < 5 * 1024 * 1024; // text file limit 5MB
    } catch (e) {
      return false;
    }
  }

  // Count lines in a File object
  function countFileLines(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        if (!text) {
          resolve(0);
          return;
        }
        const lines = text.split(/\r?\n/).length;
        resolve(lines);
      };
      reader.onerror = () => resolve(0);
      reader.readAsText(file);
    });
  }

  const handleLocalPathScan = async () => {
    const cleanPath = customPath.trim().replace(/^["']|["']$/g, '');
    if (!cleanPath) return;

    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalDev) {
      alert('Scanning directories by typing local paths is only supported when running the app locally. On the web version, please drag & drop the folder or click the area below to select a folder.');
      return;
    }

    setStatus('scanning');
    setProgress({ current: 0, total: 100, phase: 'Scanning local directory...' });

    try {
      const response = await fetch(`/api/scan-local-dir?path=${encodeURIComponent(cleanPath)}`);
      const data = await response.json();
      
      if (data.ok) {
        const gitText = data.gitignoreText || '';
        setGitignoreText(gitText);
        const isIgnoredFile = createGitignoreMatcher(gitText);

        const root = buildTree(data.files, cleanPath, gitText);
        setTreeData(root);
        setCollapsedPaths({});
        setStatus('success');
      } else {
        setErrorMsg(data.error || 'Failed to scan local path');
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('API scan failed: ' + err.message);
      setStatus('error');
    }
  };

  // Parse items from directory selection or drag-and-drop
  async function processFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    setStatus('scanning');
    setProgress({ current: 0, total: fileList.length, phase: 'Reading folder contents...' });

    try {
      // Look for a root .gitignore file
      const gitignoreFile = fileList.find(
        f => f.name === '.gitignore' && (f.webkitRelativePath || '').split('/').length === 2
      );
      let gitText = '';
      if (gitignoreFile) {
        gitText = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result || '');
          reader.onerror = () => resolve('');
          reader.readAsText(gitignoreFile);
        });
      }
      setGitignoreText(gitText);
      const isIgnoredFile = createGitignoreMatcher(gitText);

      const processedFiles = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const path = (file.customPath || file.webkitRelativePath || file.name).replace(/\\/g, '/');

        setProgress({
          current: i + 1,
          total: fileList.length,
          phase: `Analyzing ${file.name}...`
        });

        let lineCount = 0;
        const isText = await isTextFile(file);
        if (isText && file.size < 5 * 1024 * 1024) {
          lineCount = await countFileLines(file);
        }

        processedFiles.push({
          name: file.name,
          path: path,
          size: file.size,
          lineCount: lineCount,
          isText
        });
      }

      const root = buildTree(processedFiles, customPath, gitText);
      setTreeData(root);
      setCollapsedPaths({});
      setStatus('success');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process folder: ' + err.message);
      setStatus('error');
    }
  }

  const resolveAndScanLocalPath = async (rootFolderName, fallbackFiles) => {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalDev) {
      processFiles(fallbackFiles);
      return;
    }

    try {
      const res = await fetch(`/api/resolve-local-path?name=${encodeURIComponent(rootFolderName)}`);
      const data = await res.json();
      if (data.ok && data.path) {
        setCustomPath(data.path);
        
        setStatus('scanning');
        setProgress({ current: 0, total: 100, phase: 'Scanning resolved local directory...' });
        
        const scanRes = await fetch(`/api/scan-local-dir?path=${encodeURIComponent(data.path)}`);
        const scanData = await scanRes.json();
        
        if (scanData.ok) {
          const gitText = scanData.gitignoreText || '';
          setGitignoreText(gitText);
          const isIgnoredFile = createGitignoreMatcher(gitText);

          const root = buildTree(scanData.files, data.path, gitText);
          setTreeData(root);
          setCollapsedPaths({});
          setStatus('success');
          return;
        }
      }
    } catch (e) {
      console.warn('Local path resolution failed, falling back to browser scan:', e);
    }

    processFiles(fallbackFiles);
  };

  // Handle standard <input type="file" webkitdirectory /> selection
  const handleFolderSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      const firstPath = filesArray[0].webkitRelativePath || '';
      const rootFolderName = firstPath.split('/')[0] || '';
      resolveAndScanLocalPath(rootFolderName, filesArray);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Recursively read entries from drag & drop FileSystemEntry
  async function traverseEntry(entry, path = '') {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => {
          // File.webkitRelativePath is often read-only, use a custom property for fallback logic
          file.customPath = path ? `${path}/${entry.name}` : entry.name;
          // Also try to set webkitRelativePath just in case it's allowed
          try { file.webkitRelativePath = file.customPath; } catch (e) {}
          resolve([file]);
        }, () => resolve([]));
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await readAllEntries(reader);
      const childFiles = [];
      const currentPath = path ? `${path}/${entry.name}` : entry.name;
      for (const childEntry of entries) {
        const files = await traverseEntry(childEntry, currentPath);
        childFiles.push(...files);
      }
      return childFiles;
    }
    return [];
  }

  function readAllEntries(directoryReader) {
    return new Promise((resolve) => {
      const allEntries = [];
      const read = () => {
        directoryReader.readEntries((entries) => {
          if (entries.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...entries);
            read();
          }
        }, () => resolve(allEntries));
      };
      read();
    });
  }

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    setStatus('scanning');
    setProgress({ current: 0, total: 100, phase: 'Starting drag scan...' });

    try {
      const allFiles = [];
      let rootFolderName = '';
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            if (entry.isDirectory && !rootFolderName) {
              rootFolderName = entry.name;
            }
            const files = await traverseEntry(entry);
            allFiles.push(...files);
          }
        }
      }
      if (allFiles.length > 0) {
        resolveAndScanLocalPath(rootFolderName, allFiles);
      } else {
        setErrorMsg('No files detected in the dropped selection.');
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Drag & Drop scanning failed: ' + err.message);
      setStatus('error');
    }
  };

  // Reconstruct tree hierarchy
  function buildTree(files, pathPrefix, gitignoreContent = '') {
    const isIgnoredFile = createGitignoreMatcher(gitignoreContent);

    // Determine root directory name
    let rootName = 'root';
    if (files.length > 0) {
      const firstPath = files[0].path;
      const firstPart = firstPath.split('/')[0];
      if (firstPart) {
        rootName = firstPart;
      }
    }

    if (pathPrefix) {
      rootName = pathPrefix.replace(/\\/g, '/').replace(/\/$/, '');
    }

    const rootNode = {
      name: rootName,
      path: rootName,
      type: 'directory',
      children: [],
      lineCount: 0,
      size: 0,
      isIgnored: false,
      isSystemExclude: SYSTEM_EXCLUDES.has(rootName)
    };

    for (const file of files) {
      const parts = file.path.split('/');
      // Override first path element with custom root path if typed
      if (pathPrefix) {
        parts[0] = rootName;
      }

      let currentNode = rootNode;
      let currentPath = rootName;

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        currentPath += '/' + part;
        const isFile = i === parts.length - 1;

        let childNode = currentNode.children.find(
          c => c.name === part && c.type === (isFile ? 'file' : 'directory')
        );

        if (!childNode) {
          const isSystem = SYSTEM_EXCLUDES.has(part) || currentNode.isSystemExclude;
          childNode = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            lineCount: 0,
            size: 0,
            isIgnored: currentNode.isIgnored || isIgnoredFile(currentPath, !isFile),
            isSystemExclude: isSystem,
            children: isFile ? undefined : []
          };
          currentNode.children.push(childNode);
        }

        if (isFile) {
          childNode.lineCount = file.lineCount;
          childNode.size = file.size;
          childNode.isText = file.isText;
        }

        currentNode = childNode;
      }
    }

    // Recursively count folder lines & sizes
    function calculateFolderStats(node) {
      if (node.type === 'file') {
        return { lines: node.lineCount, size: node.size };
      }
      let linesSum = 0;
      let sizeSum = 0;
      for (const child of node.children) {
        const stats = calculateFolderStats(child);
        linesSum += stats.lines;
        sizeSum += stats.size;
      }
      node.lineCount = linesSum;
      node.size = sizeSum;
      return { lines: linesSum, size: sizeSum };
    }

    calculateFolderStats(rootNode);
    return rootNode;
  }

  // ASCII plain text tree generator
  function generateAsciiTree(node, prefix = '', isLast = true, isRoot = true) {
    if (!isRoot) {
      if (!showSystemExclude && node.isSystemExclude) return '';
      if (!showGitignored && node.isIgnored) return '';
    }

    let result = '';
    const suffix = node.type === 'directory' ? '/' : '';
    const linesInfo = (node.type === 'file' && node.isText) ? ` (${node.lineCount} lines)` : '';

    if (isRoot) {
      result += node.name + suffix + '\n';
    } else {
      result += prefix + (isLast ? '└── ' : '├── ') + node.name + suffix + linesInfo + '\n';
    }

    const visibleChildren = (node.children || []).filter(c => {
      if (!showSystemExclude && c.isSystemExclude) return false;
      if (!showGitignored && c.isIgnored) return false;
      return true;
    });

    if (visibleChildren.length > 0) {
      const sortedChildren = [...visibleChildren].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;

        let valA, valB;
        if (sortBy === 'name') {
          valA = a.name;
          valB = b.name;
        } else if (sortBy === 'type') {
          valA = a.type === 'directory' ? 'folder' : (a.name.split('.').pop() || '').toLowerCase();
          valB = b.type === 'directory' ? 'folder' : (b.name.split('.').pop() || '').toLowerCase();
        } else if (sortBy === 'lines') {
          valA = a.lineCount;
          valB = b.lineCount;
        } else if (sortBy === 'size') {
          valA = a.size;
          valB = b.size;
        }

        let compare = 0;
        if (typeof valA === 'string') {
          compare = valA.localeCompare(valB);
        } else {
          compare = valA - valB;
        }

        return sortOrder === 'asc' ? compare : -compare;
      });

      const nextPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
      for (let i = 0; i < sortedChildren.length; i++) {
        result += generateAsciiTree(sortedChildren[i], nextPrefix, i === sortedChildren.length - 1, false);
      }
    }
    return result;
  }

  // Copy Plain Text Tree
  const handleCopy = () => {
    if (!treeData) return;
    const textTree = generateAsciiTree(treeData);
    navigator.clipboard.writeText(textTree).then(() => {
      setCopySuccess(true);
    });
  };

  // Download Plain Text / SVG
  const handleDownload = (format = 'txt') => {
    if (!treeData) return;
    const textTree = generateAsciiTree(treeData);
    
    if (format === 'txt') {
      const blob = new Blob([textTree], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${treeData.name.split('/').pop() || 'project'}-structure.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'svg') {
      // Export a beautiful SVG schema of the tree
      const svgContent = generateTreeSvg(treeData);
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${treeData.name.split('/').pop() || 'project'}-structure.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Generates a clean visual SVG tree model representing the current folder
  function generateTreeSvg(rootNode) {
    const list = [];
    function buildSvgRows(node, depth = 0) {
      list.push({ name: node.name, type: node.type, depth, lineCount: node.lineCount });
      if (node.children && node.children.length > 0) {
        const sorted = [...node.children].sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        for (const child of sorted) {
          buildSvgRows(child, depth + 1);
        }
      }
    }
    buildSvgRows(rootNode);

    const rowHeight = 24;
    const indentWidth = 20;
    const width = 800;
    const height = list.length * rowHeight + 80;

    let svgRows = '';
    list.forEach((item, index) => {
      const y = 60 + index * rowHeight;
      const x = 20 + item.depth * indentWidth;

      // Draw structure lines
      let connectors = '';
      if (item.depth > 0) {
        // Horizontal line
        connectors += `<line x1="${x - 12}" y1="${y + 12}" x2="${x + 2}" y2="${y + 12}" stroke="#4b5563" stroke-width="1.5" />`;
        // Vertical connector
        connectors += `<line x1="${x - 12}" y1="${y - 12}" x2="${x - 12}" y2="${y + 12}" stroke="#4b5563" stroke-width="1.5" />`;
      }

      // Icon colors and representations
      const isDir = item.type === 'directory';
      const iconColor = isDir ? '#f59e0b' : '#3b82f6';
      const iconPath = isDir 
        ? 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
        : 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';

      const lineText = isDir ? '' : ` (${item.lineCount} lines)`;

      svgRows += `
        <g>
          ${connectors}
          <!-- Icon -->
          <svg x="${x + 6}" y="${y + 4}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="${iconPath}" />
          </svg>
          <!-- Name -->
          <text x="${x + 28}" y="${y + 16}" fill="#f3f4f6" font-family="JetBrains Mono, monospace" font-size="12px" font-weight="${isDir ? 'bold' : 'normal'}">${item.name}${isDir ? '/' : ''}<tspan fill="#9ca3af">${lineText}</tspan></text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="#0f172a" rx="12" />
        <!-- Header -->
        <text x="20" y="35" fill="#5EC95A" font-family="system-ui, sans-serif" font-size="16px" font-weight="bold">${rootNode.name} Folder Structure</text>
        <line x1="20" y1="45" x2="${width - 20}" y2="45" stroke="#334155" stroke-width="1" />
        
        <!-- Tree content -->
        ${svgRows}
      </svg>
    `;
  }

  // Toggle open/close state of directory nodes
  const toggleFolder = (path) => {
    setCollapsedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleCollapseAll = () => {
    if (!treeData) return;
    const paths = {};
    const traverse = (node) => {
      if (node.type === 'directory') {
        if (node.path !== treeData.path) {
          paths[node.path] = true;
        }
        if (node.children) {
          node.children.forEach(traverse);
        }
      }
    };
    traverse(treeData);
    setCollapsedPaths(paths);
  };

  const handleExpandAll = () => {
    setCollapsedPaths({});
  };

  const hasCollapsedSubfolders = Object.keys(collapsedPaths).length > 0;

  const toggleExpandCollapseAll = () => {
    if (hasCollapsedSubfolders) {
      handleExpandAll();
    } else {
      handleCollapseAll();
    }
  };

  // Flatten active visible nodes to a list for table rendering
  function getFlattenedRows(node, depth = 0, isVisible = true, list = [], isRoot = true) {
    if (!isVisible) return list;

    // Filters
    if (!isRoot) {
      if (!showSystemExclude && node.isSystemExclude) return list;
      if (!showGitignored && node.isIgnored) return list;
    }

    list.push({ ...node, depth });
    const isCollapsed = collapsedPaths[node.path];
    if (node.children && node.children.length > 0) {
      const sorted = [...node.children].sort((a, b) => {
        // Group directories first
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;

        let valA, valB;
        if (sortBy === 'name') {
          valA = a.name;
          valB = b.name;
        } else if (sortBy === 'type') {
          valA = a.type === 'directory' ? 'folder' : (a.name.split('.').pop() || '').toLowerCase();
          valB = b.type === 'directory' ? 'folder' : (b.name.split('.').pop() || '').toLowerCase();
        } else if (sortBy === 'lines') {
          valA = a.lineCount;
          valB = b.lineCount;
        } else if (sortBy === 'size') {
          valA = a.size;
          valB = b.size;
        }

        let compare = 0;
        if (typeof valA === 'string') {
          compare = valA.localeCompare(valB);
        } else {
          compare = valA - valB;
        }

        return sortOrder === 'asc' ? compare : -compare;
      });
      for (const child of sorted) {
        getFlattenedRows(child, depth + 1, !isCollapsed, list, false);
      }
    }
    return list;
  }

  // Helpers for table columns
  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getFileLabel(name, type) {
    if (type === 'directory') return 'Folder';
    const ext = name.split('.').pop().toLowerCase();
    if (ext === name.toLowerCase()) return 'File';
    switch (ext) {
      case 'js': return 'JavaScript';
      case 'jsx': return 'React JS';
      case 'ts': return 'TypeScript';
      case 'tsx': return 'React TS';
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      case 'scss': return 'Sass';
      case 'less': return 'Less';
      case 'json': return 'JSON';
      case 'md': return 'Markdown';
      case 'py': return 'Python';
      case 'java': return 'Java';
      case 'c': return 'C Code';
      case 'cpp': return 'C++ Code';
      case 'h': return 'C Header';
      case 'cs': return 'C# Code';
      case 'go': return 'Go Source';
      case 'rs': return 'Rust Source';
      case 'php': return 'PHP Code';
      case 'rb': return 'Ruby Code';
      case 'sh': return 'Shell Script';
      case 'yml':
      case 'yaml': return 'YAML Config';
      case 'xml': return 'XML';
      case 'svg': return 'SVG Icon';
      default: return ext.toUpperCase() + ' File';
    }
  }

  // Get Custom SVG Icon based on extension / folder
  function renderSvgIcon(name, type) {
    if (type === 'directory') {
      return (
        <svg className="folder-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      );
    }

    const ext = name.split('.').pop().toLowerCase();
    let color = '#9ca3af'; // default gray

    switch (ext) {
      case 'js':
      case 'jsx':
        color = '#eab308'; // Yellow JS
        break;
      case 'ts':
      case 'tsx':
        color = '#3b82f6'; // Blue TS
        break;
      case 'html':
        color = '#f97316'; // Orange HTML
        break;
      case 'css':
      case 'scss':
      case 'less':
        color = '#06b6d4'; // Cyan CSS
        break;
      case 'json':
      case 'yml':
      case 'yaml':
      case 'toml':
        color = '#10b981'; // Green configs
        break;
      case 'md':
      case 'txt':
        color = '#8b5cf6'; // Purple documents
        break;
      case 'svg':
        color = '#ec4899'; // Pink vectors
        break;
      case 'py':
        color = '#3b82f6'; // python blue
        break;
      default:
        break;
    }

    return (
      <svg className="file-icon" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    );
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return null;
    return (
      <svg className={`sort-arrow-icon ${sortOrder}`} viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none">
        <polyline points={sortOrder === 'asc' ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}></polyline>
      </svg>
    );
  };

  const flattenedRows = treeData ? getFlattenedRows(treeData) : [];

  return (
    <article id="tool-folder-analyzer" className="tool-card tool-card--wide active">
      <h2>Folder Structure Analyzer</h2>
      <p className="tool-description">
        Scan folder directories recursively, visualize your code layout, calculate file metrics, and measure total line counts entirely client-side.
      </p>

      {/* Input Options */}
      <div className="folder-analyzer-inputs">
        <div className="form-group flex-1">
          <label htmlFor="custom-root-path">Folder Path / Custom Root Name</label>
          <div className="path-input-group">
            <input
              type="text"
              id="custom-root-path"
              placeholder="e.g. D:/01_Programs/07_Small_Web_Tools or my-vite-react-app"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customPath.trim()) {
                  handleLocalPathScan();
                }
              }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleLocalPathScan}
              disabled={!customPath.trim()}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="button-icon">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <line x1="9" y1="14" x2="15" y2="14"></line>
              </svg>
              Analyze Path
            </button>
          </div>
          <span className="path-help-text">
            * Direct path scanning is supported in local development. For the web deployment version, please Drag &amp; Drop or use the folder select button below.
          </span>
        </div>
      </div>

      {/* Selection Areas */}
      <div 
        className={`folder-analyzer-dropzone ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => folderInputRef.current && folderInputRef.current.click()}
      >
        <input
          type="file"
          ref={folderInputRef}
          webkitdirectory="true"
          directory="true"
          multiple
          style={{ display: 'none' }}
          onChange={handleFolderSelect}
        />
        <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <h3>Drag &amp; Drop Folder here</h3>
        <p>or click to select folder from your computer</p>
      </div>

      {/* Scanning status */}
      {status === 'scanning' && (
        <div className="folder-analyzer-loading">
          <div className="loading-spinner"></div>
          <h4>Scanning your folder...</h4>
          <p>{progress.phase}</p>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
            ></div>
          </div>
          <span className="progress-numbers">
            {progress.current} / {progress.total} files completed
          </span>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="folder-analyzer-error">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="#ef4444" strokeWidth="2" fill="none">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h4>Something went wrong</h4>
          <p>{errorMsg}</p>
          <button className="btn-secondary" onClick={() => setStatus('idle')}>Try Again</button>
        </div>
      )}

      {/* Result stage */}
      {status === 'success' && treeData && (
        <div className="folder-analyzer-results">
          
          {/* Metrics summary */}
          <div className="folder-analyzer-summary">
            <div className="summary-badge">
              <span className="badge-label">Total Files</span>
              <span className="badge-value">{projectStats.filesCount}</span>
            </div>
            <div className="summary-badge">
              <span className="badge-label">Total Code Lines</span>
              <span className="badge-value highlight">
                {projectStats.linesWithGitignore.toLocaleString()}
              </span>
              {gitignoreText && (
                <div className="badge-sub-metrics">
                  <span>With gitignore: <strong>{projectStats.linesWithGitignore.toLocaleString()}</strong></span>
                  <span>Without gitignore: <strong>{projectStats.linesWithoutGitignore.toLocaleString()}</strong></span>
                </div>
              )}
            </div>
            <div className="summary-badge">
              <span className="badge-label">Project Size</span>
              <span className="badge-value">
                {formatSize(projectStats.sizeWithGitignore)}
              </span>
              {gitignoreText && (
                <div className="badge-sub-metrics">
                  <span>With gitignore: <strong>{formatSize(projectStats.sizeWithGitignore)}</strong></span>
                  <span>Without gitignore: <strong>{formatSize(projectStats.sizeWithoutGitignore)}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Result view header actions */}
          <div className="folder-analyzer-actions-bar">
            <div className="view-mode-tabs">
              <button 
                className={`tab-btn ${viewMode === 'figure' ? 'active' : ''}`}
                onClick={() => setViewMode('figure')}
              >
                Figure
              </button>
              <button 
                className={`tab-btn ${viewMode === 'text' ? 'active' : ''}`}
                onClick={() => setViewMode('text')}
              >
                Plaintext
              </button>
            </div>

            {/* Tree Collapse/Expand Actions */}
            {viewMode === 'figure' && (
              <div className="tree-expansion-controls">
                <button 
                  className="btn-secondary btn-sm" 
                  onClick={toggleExpandCollapseAll} 
                  title={hasCollapsedSubfolders ? "Expand all folders" : "Collapse all folders"}
                >
                  {hasCollapsedSubfolders ? "Expand All" : "Collapse All"}
                </button>
              </div>
            )}

            {/* Filters Toggles */}
            <div className="filter-switches-group">
              <label className="switch-toggle">
                <input 
                  type="checkbox" 
                  id="toggle-system-exclude"
                  checked={showSystemExclude}
                  onChange={(e) => setShowSystemExclude(e.target.checked)}
                />
                <span className="switch-slider"></span>
                <span className="switch-label">Excluded Folders</span>
              </label>
              
              {gitignoreText && (
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    id="toggle-gitignore"
                    checked={showGitignored}
                    onChange={(e) => setShowGitignored(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                  <span className="switch-label">Gitignored Files</span>
                </label>
              )}
            </div>

            <div className="action-buttons-group">
              <button 
                className="action-icon-btn" 
                title="Copy tree structure"
                onClick={handleCopy}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                {copySuccess && <span className="action-tooltip">Copied!</span>}
              </button>

              <div 
                className="download-dropdown-wrapper"
                ref={downloadWrapperRef}
                onMouseEnter={() => setDownloadOpen(true)}
                onMouseLeave={() => setDownloadOpen(false)}
              >
                <button 
                  className={`action-icon-btn ${downloadOpen ? 'active' : ''}`}
                  title="Download structure file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDownloadOpen(!downloadOpen);
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <div className={`download-options ${downloadOpen ? 'show' : ''}`}>
                  <button onClick={() => { handleDownload('txt'); setDownloadOpen(false); }}>As Plaintext (.txt)</button>
                  <button onClick={() => { handleDownload('svg'); setDownloadOpen(false); }}>As SVG Diagram (.svg)</button>
                </div>
              </div>
            </div>
          </div>

          {/* Rendering outputs */}
          {viewMode === 'text' ? (
            <div className="folder-analyzer-text-viewer">
              <pre>
                <code>{generateAsciiTree(treeData)}</code>
              </pre>
            </div>
          ) : (
            <div className="folder-analyzer-table-viewer">
              <table className="analyzer-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className="sortable-header">
                      <div className="header-sort-wrapper">
                        Name {renderSortIcon('name')}
                      </div>
                    </th>
                    <th onClick={() => handleSort('type')} className="sortable-header">
                      <div className="header-sort-wrapper">
                        Type {renderSortIcon('type')}
                      </div>
                    </th>
                    <th onClick={() => handleSort('lines')} className="sortable-header">
                      <div className="header-sort-wrapper">
                        Lines {renderSortIcon('lines')}
                      </div>
                    </th>
                    <th onClick={() => handleSort('size')} className="sortable-header">
                      <div className="header-sort-wrapper">
                        Size {renderSortIcon('size')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {flattenedRows.map((row) => {
                    const isDir = row.type === 'directory';
                    const hasChildren = row.children && row.children.length > 0;
                    const isCollapsed = collapsedPaths[row.path];

                    return (
                      <tr key={row.path} className={`table-row-${row.type} ${row.isIgnored ? 'is-ignored' : ''}`}>
                        <td>
                          <div 
                            className="table-cell-name" 
                            style={{ paddingLeft: `${row.depth * 20}px` }}
                          >
                            {isDir && (
                              <button 
                                className={`collapse-arrow-btn ${isCollapsed ? 'collapsed' : ''}`}
                                onClick={() => toggleFolder(row.path)}
                                aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                              >
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none">
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </button>
                            )}
                            {!isDir && <span className="collapse-arrow-spacer"></span>}
                            <span className="item-icon-wrapper">
                              {renderSvgIcon(row.name, row.type)}
                            </span>
                            <span 
                              className={`row-title-text ${isDir ? 'is-dir' : ''}`}
                              onClick={() => isDir && toggleFolder(row.path)}
                            >
                              {row.name}{isDir && '/'}
                            </span>
                          </div>
                        </td>
                        <td className="cell-type">{getFileLabel(row.name, row.type)}</td>
                        <td className="cell-lines">
                          {isDir ? (
                            <span className="folder-lines-badge">
                              {row.lineCount.toLocaleString()} total
                            </span>
                          ) : (
                            row.isText ? (
                              <span className="file-lines-badge">
                                {row.lineCount.toLocaleString()} lines
                              </span>
                            ) : (
                              <span className="binary-label">binary</span>
                            )
                          )}
                        </td>
                        <td className="cell-size">{formatSize(row.size)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}
    </article>
  );
}
