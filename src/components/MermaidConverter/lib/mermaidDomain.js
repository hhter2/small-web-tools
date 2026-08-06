export const MERMAID_SOURCE_LIMIT = 100_000;
export const MERMAID_NODE_LIMIT = 250;
export const PNG_SCALES = [1, 2, 3];

const SAFE_FILENAME = /[^a-z0-9._-]+/gi;
const HEADER_PATTERN = /^\s*(?:flowchart|graph)\s+(TB|TD|BT|LR|RL)\s*$/i;
const EDGE_PATTERN = /^\s*([A-Za-z][\w-]*)\s*(-->|---|-.->|==>)\s*([A-Za-z][\w-]*)\s*$/;
const NODE_PATTERN = /^\s*([A-Za-z][\w-]*)\s*(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\})\s*$/;

export function normalizeMermaidFilename(value, extension = 'mmd') {
  const base = String(value || 'diagram').trim().replace(/\.(?:mmd|svg|png)$/i, '') || 'diagram';
  const safe = base.replace(SAFE_FILENAME, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'diagram';
  return `${safe}.${extension}`;
}

export function validateMermaidSource(source) {
  const text = String(source ?? '');
  if (!text.trim()) throw new Error('empty');
  if (new Blob([text]).size > MERMAID_SOURCE_LIMIT) throw new Error('tooLarge');
  return text;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[character]));
}

function parseSource(source) {
  const lines = validateMermaidSource(source)
    .split(/\r?\n/)
    .map((line) => line.replace(/%%.*$/, '').trim())
    .filter(Boolean);
  const header = lines.shift();
  const headerMatch = header?.match(HEADER_PATTERN);
  if (!headerMatch) throw new Error('unsupportedDiagram');

  const nodes = new Map();
  const edges = [];
  const ensureNode = (id) => {
    if (!nodes.has(id)) nodes.set(id, { id, label: id, shape: 'rect' });
    return nodes.get(id);
  };

  for (const line of lines) {
    const nodeMatch = line.match(NODE_PATTERN);
    if (nodeMatch) {
      const [, id, square, round, diamond] = nodeMatch;
      nodes.set(id, {
        id,
        label: square ?? round ?? diamond ?? id,
        shape: diamond !== undefined ? 'diamond' : round !== undefined ? 'round' : 'rect',
      });
      continue;
    }
    const edgeMatch = line.match(EDGE_PATTERN);
    if (edgeMatch) {
      const [, from, kind, to] = edgeMatch;
      ensureNode(from);
      ensureNode(to);
      edges.push({ from, to, kind });
      continue;
    }
    throw new Error('parseError');
  }

  if (nodes.size > MERMAID_NODE_LIMIT) throw new Error('tooManyNodes');
  return { direction: headerMatch[1].toUpperCase().replace('TD', 'TB'), nodes: [...nodes.values()], edges };
}

function calculateLayout(model) {
  const horizontal = model.direction === 'LR' || model.direction === 'RL';
  const reversed = model.direction === 'RL' || model.direction === 'BT';
  const ordered = reversed ? [...model.nodes].reverse() : model.nodes;
  const nodeWidth = 180;
  const nodeHeight = 72;
  const gap = 72;
  const padding = 48;
  const positioned = ordered.map((node, index) => ({
    ...node,
    x: horizontal ? padding + index * (nodeWidth + gap) : padding,
    y: horizontal ? padding : padding + index * (nodeHeight + gap),
    width: nodeWidth,
    height: nodeHeight,
  }));
  return {
    nodes: positioned,
    width: horizontal ? padding * 2 + Math.max(1, positioned.length) * nodeWidth + Math.max(0, positioned.length - 1) * gap : padding * 2 + nodeWidth,
    height: horizontal ? padding * 2 + nodeHeight : padding * 2 + Math.max(1, positioned.length) * nodeHeight + Math.max(0, positioned.length - 1) * gap,
  };
}

function nodeShape(node) {
  if (node.shape === 'diamond') {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    return `<polygon points="${cx},${node.y} ${node.x + node.width},${cy} ${cx},${node.y + node.height} ${node.x},${cy}" />`;
  }
  return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.shape === 'round' ? 32 : 10}" />`;
}

export function renderMermaidToSvg(source, options = {}) {
  const model = parseSource(source);
  const layout = calculateLayout(model);
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const background = options.background === 'transparent' ? 'transparent' : (options.background || '#ffffff');
  const edgeMarkup = model.edges.map((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const horizontal = model.direction === 'LR' || model.direction === 'RL';
    const x1 = horizontal ? from.x + from.width : from.x + from.width / 2;
    const y1 = horizontal ? from.y + from.height / 2 : from.y + from.height;
    const x2 = horizontal ? to.x : to.x + to.width / 2;
    const y2 = horizontal ? to.y + to.height / 2 : to.y;
    const dash = edge.kind === '-.->' ? ' stroke-dasharray="7 6"' : '';
    const width = edge.kind === '==>' ? 3 : 2;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${width}"${dash} marker-end="url(#arrow)" />`;
  }).join('');
  const nodeMarkup = layout.nodes.map((node) => `<g class="node">${nodeShape(node)}<text x="${node.x + node.width / 2}" y="${node.y + node.height / 2}" dominant-baseline="middle" text-anchor="middle">${escapeXml(node.label)}</text></g>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="Mermaid diagram"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs><style>svg{background:${background};font-family:ui-sans-serif,system-ui,sans-serif}.node rect,.node polygon{fill:#f8fafc;stroke:#475569;stroke-width:2}.node text{fill:#0f172a;font-size:15px;font-weight:600}line{stroke:#475569;fill:none}marker path{fill:#475569}</style>${edgeMarkup}${nodeMarkup}</svg>`;
  return { svg, width: layout.width, height: layout.height, background };
}

export function downloadBlob(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function svgToPngBlob(render, scale = 2) {
  const boundedScale = PNG_SCALES.includes(Number(scale)) ? Number(scale) : 2;
  const blob = new Blob([render.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('pngFailed'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = render.width * boundedScale;
    canvas.height = render.height * boundedScale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('pngFailed');
    context.scale(boundedScale, boundedScale);
    context.drawImage(image, 0, 0, render.width, render.height);
    return await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('pngFailed')), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
