# CODEBASE.md — Small Web Tools

> **For AI agents**: This file is the authoritative reference for the project's architecture.
> **Update this file** whenever files are added, removed, renamed, or their purpose changes substantially.

---

## Project Overview

**small-web-tools** is a React + Vite single-page application (SPA) that bundles a collection of browser-based utility tools. All tools run entirely client-side (no data leaves the browser) unless a specific tool requires a serverless API call (see `functions/`). The site is deployed on **Cloudflare Pages**.

- **Version**: see `package.json` (`version` field); auto-read from git tags at build time
- **Framework**: React 18 + Vite 5
- **Deploy target**: Cloudflare Pages (serverless functions via `functions/api/`)

---

## Directory Structure

```
small-web-tools/
├── CODEBASE.md                  # ← This file (AI agent reference)
├── README.md                    # User-facing documentation & changelog
├── package.json                 # Project metadata, scripts, and dependencies
├── package-lock.json            # Lockfile (auto-generated, do not edit)
├── vite.config.js               # Vite build config (also contains dev-server IP lookup proxy)
├── .gitignore                   # Git ignore rules
├── index.html                   # SPA entry point (Vite root)
│
├── public/                      # Static assets copied verbatim to dist/
│   ├── favicon.svg              # Site favicon
│   └── ffmpeg/                  # Local ffmpeg-core engine files (js/wasm)
│
├── src/                         # React application source
│   ├── main.jsx                 # React DOM mount point (renders <App />)
│   ├── App.jsx                  # Root component: routing, layout, all tool metadata & categories
│   └── styles.css               # Global stylesheet (design system, all component styles)
│   └── components/              # Individual tool components (one file per tool)
│       ├── HomeGrid.jsx         # Dashboard / home page grid of all tools
│       ├── SlashesConverter.jsx # Path slashes converter (Windows → web)
│       ├── CasingSwitcher.jsx   # Text casing conversion (invert, sentence, title, terms)
│       ├── WordCounter.jsx      # Word & character counter with line-ending detection
│       ├── DateCounter.jsx      # Days-between-dates calculator
│       ├── CurrencyCounter.jsx  # Currency converter & bulk list converter
│       ├── ColorConverter.jsx   # Color code converter (HEX ↔ RGB ↔ HSL)
│       ├── AsciiConverter.jsx   # ASCII ↔ text converter
│       ├── UnicodeConverter.jsx # Unicode code point encoder/decoder
│       ├── BaseConverter.jsx    # Numeral base converter (bin/oct/dec/hex/sex)
│       ├── DnaConverter.jsx     # DNA/RNA sequence tools (complement, reverse, strand swap)
│       ├── DnaRnaIcon.jsx       # SVG icon component for DNA/RNA tool
│       ├── CodonTable.jsx       # Interactive standard genetic code / RNA codon table
│       ├── BioinfoIcon.jsx      # SVG icon component for bioinformatics tools
│       ├── IpLookup.jsx         # IP address geolocation lookup (calls /api/iplookup)
│       ├── ImgMeta.jsx          # Image metadata reader (EXIF, ICC, GPS — fully local)
│       ├── OfficeMeta.jsx       # Office file metadata reader (Word/Excel/PPT — fully local)
│       ├── RandomWheel.jsx      # Spin-the-wheel random picker with elimination mode
│       ├── TypingSpeedTest.jsx  # Typing speed test (English & Chinese, custom templates)
│       ├── NetworkSpeedTest.jsx # Network latency (ping) & download speed test
│       ├── QrBarcodeGenerator.jsx # QR code & barcode generator with customization
│       ├── QrBarcodeScanner.jsx   # QR & barcode scanner (camera + file upload, 14+ formats)
│       ├── PasswordGenerator.jsx  # Cryptographically secure password generator & strength checker
│       ├── AudioMeta.jsx          # Audio metadata reader (MP3/WAV/FLAC/M4A/OGG/AIFF — fully local)
│       ├── VideoMeta.jsx          # Video metadata reader (MP4/MOV/Log — fully local)
│       ├── MediaSeparator.jsx     # Main Media Separator / Splitter tool component
│       ├── MediaSeparatorQueueItem.jsx # Queue item component for Media Separator
│       ├── MediaSeparatorWaveform.jsx  # Waveform visualization component
│       ├── MediaSeparatorFormatSelect.jsx # Dropdown select component for format options
│       ├── mediaSeparatorEngine.js # Merged ffmpeg load client + output format configs
│       ├── useMediaSeparator.js   # Batch processing queue and states hook
│       ├── FolderAnalyzer.jsx     # Folder-structure analyzer with dual visualizer & line counts
│       └── WebsiteFontExtractor.jsx # Website font extractor (calls /api/extract-fonts & /api/font-proxy)
│
├── functions/                   # Cloudflare Pages serverless functions
│   └── api/
│       ├── iplookup.js          # GET /api/iplookup?ip=… — server-side IP geolocation (bypasses CORS)
│       ├── extract-fonts.js     # POST /api/extract-fonts — scrapes web fonts from a given URL
│       └── font-proxy.js        # GET /api/font-proxy?url=…&referer=… — proxies font file downloads
│
└── dist/                        # Production build output (auto-generated by `vite build`, gitignored)
    ├── index.html
    ├── favicon.svg
    └── assets/                  # Hashed JS/CSS bundles
```

---

## Key Files — Detailed Purpose

### `index.html`
Minimal Vite SPA shell. Contains the `<div id="root">` mount point and the `<script type="module" src="/src/main.jsx">` entry. Also sets the page `<title>` and viewport meta.

### `src/main.jsx`
React DOM entry — calls `ReactDOM.createRoot(...).render(<App />)`. Imports `styles.css`.

### `src/App.jsx`
The central hub of the application:
- Defines `toolDetails` (id → `{ title, desc }` for every tool)
- Defines `categories` (grouping tools by type: Text, Developer, Network, Media, File, Game, Bio)
- Defines `tools` array with route ID, component reference, category, tags
- Manages client-side routing via `useState` (no React Router; URL hash `#tool-id` is used)
- Renders the top navigation bar, sidebar, breadcrumb, and the active tool component
- Injects version info via Vite `define` globals (`__APP_VERSION__`, `__SHOW_CHANNEL_ALERT__`, `__APP_CHANNEL__`)

### `src/styles.css`
Monolithic global stylesheet (~190 KB). Contains:
- CSS custom properties (design tokens: colors, spacing, typography)
- Base reset and typography
- Layout styles for sidebar, navbar, content area
- Per-tool component styles (scoped by class name convention)
- Responsive breakpoints and dark-mode support

### `vite.config.js`
Vite configuration with multiple responsibilities:
1. **Version injection**: reads git tag via `git describe --tags` → exposes as `__APP_VERSION__` global
2. **Channel detection**: flags alpha/beta builds → exposes `__SHOW_CHANNEL_ALERT__` and `__APP_CHANNEL__`
3. **Dev-server proxy**: during local dev, `/api/iplookup` and `/api/extract-fonts` are handled by in-process Node.js functions (mirrors the Cloudflare Pages behaviour without needing a separate server)
4. **Build config**: output to `dist/`, React plugin, asset handling

### `functions/api/iplookup.js`
Cloudflare Pages Function — `GET /api/iplookup?ip=<address>`  
Queries multiple geo-IP providers in sequence (api.ip.sb → ipapi.co → fallbacks) with a 5-second timeout each. Returns unified JSON: `{ ip, city, region, country_name, country_code, postal, org, asn, timezone, latitude, longitude }`. Required because some providers block browser-originated requests.

### `functions/api/extract-fonts.js`
Cloudflare Pages Function — `POST /api/extract-fonts` with body `{ url: "https://..." }`  
Fetches the target page HTML server-side, parses `<link>` and `@import` for Google Fonts / CSS font-face declarations, and returns font family names + stylesheet URLs. Required to bypass CORS restrictions on third-party pages.

### `functions/api/font-proxy.js`
Cloudflare Pages Function — `GET /api/font-proxy?url=<fontUrl>&referer=<pageUrl>`  
Acts as a CORS-friendly reverse proxy for font binary files (`.woff2`, `.ttf`, etc.). Forwards the request with appropriate `Referer` / `Origin` headers and streams the response back with `Access-Control-Allow-Origin: *` and a 1-year cache header.

---

## Tool Inventory

| Tool ID | Component File | Category | Description |
|---|---|---|---|
| `tool-home` | `HomeGrid.jsx` | — | Dashboard grid listing all tools |
| `tool-slash` | `SlashesConverter.jsx` | Text | Windows path → forward slashes |
| `tool-casing` | `CasingSwitcher.jsx` | Text | Multi-mode text case converter |
| `tool-wc` | `WordCounter.jsx` | Text | Word / char / line counter |
| `tool-date` | `DateCounter.jsx` | Text | Days between two dates |
| `tool-currency` | `CurrencyCounter.jsx` | Text | Currency converter & bulk list |
| `tool-color` | `ColorConverter.jsx` | Developer | HEX / RGB / HSL converter |
| `tool-ascii` | `AsciiConverter.jsx` | Developer | ASCII ↔ text |
| `tool-unicode` | `UnicodeConverter.jsx` | Developer | Unicode code point en/decoder |
| `tool-base` | `BaseConverter.jsx` | Developer | Numeral base converter |
| `tool-iplookup` | `IpLookup.jsx` | Network | IP geolocation (via `/api/iplookup`) |
| `tool-speedtest` | `NetworkSpeedTest.jsx` | Network | Ping & download speed test |
| `tool-imgmeta` | `ImgMeta.jsx` | Media | EXIF / ICC / GPS image metadata |
| `tool-officemeta` | `OfficeMeta.jsx` | File | Word / Excel / PPT metadata reader |
| `tool-qrcode` | `QrBarcodeGenerator.jsx` | Developer | QR code generator |
| `tool-barcode` | `QrBarcodeGenerator.jsx` | Developer | Barcode generator (same component, tab-switched) |
| `tool-qrbarcodescan` | `QrBarcodeScanner.jsx` | Utilities | QR & barcode scanner (camera + file upload, 14+ formats) |
| `tool-password` | `PasswordGenerator.jsx` | Developer | Secure password generator |
| `tool-pwstrength` | `PasswordGenerator.jsx` | Developer | Password strength checker (same component, tab-switched) |
| `tool-wheel` | `RandomWheel.jsx` | Game | Spin-the-wheel random picker |
| `tool-typing` | `TypingSpeedTest.jsx` | Game | Typing speed test (EN / ZH) |
| `tool-dna` | `DnaConverter.jsx` | Bio | DNA/RNA strand tools |
| `tool-codon` | `CodonTable.jsx` | Bio | RNA codon / amino acid table |
| `tool-fontextractor` | `WebsiteFontExtractor.jsx` | Developer | Web font extractor & downloader |
| `tool-audiometa` | `AudioMeta.jsx` | Media | Audio metadata reader (MP3, WAV, FLAC, M4A, OGG, AIFF, WMA) |
| `tool-videometa` | `VideoMeta.jsx` | Media | Video metadata reader (MP4, MOV, Log) |
| `tool-mediasplit` | `MediaSeparator.jsx` | Media | Split a video's audio track and silent video track locally |
| `tool-folder-analyzer` | `FolderAnalyzer.jsx` | Developer | Folder-structure analyzer with dual visualizer & line counts |

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | React DOM renderer |
| `exifreader` | ^4.41.0 | Parse EXIF/ICC/GPS tags from images (`ImgMeta`) |
| `fast-xml-parser` | ^4.4.0 | Parse Office XML internals (`OfficeMeta`) |
| `jsbarcode` | ^3.11.6 | Barcode rendering (`QrBarcodeGenerator`) |
| `jszip` | ^3.10.1 | Unzip `.docx`/`.xlsx`/`.pptx` files (`OfficeMeta`) |
| `qrcode` | ^1.5.3 | QR code generation (`QrBarcodeGenerator`) |
| `html5-qrcode` | ^2.3.8 | QR & barcode scanning via camera or file upload (`QrBarcodeScanner`) |
| `vite` | ^5.2.11 | Build tool & dev server |
| `@vitejs/plugin-react` | ^4.3.1 | Vite React/JSX transform |
| `@ffmpeg/ffmpeg` | ^0.12.15 | Client-side ffmpeg runner |
| `@ffmpeg/util` | ^0.12.2 | Utilities for loading and handling ffmpeg.wasm |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server (with hot reload + local API proxy)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Adding a New Tool — Checklist

1. Create `src/components/<ToolName>.jsx`
2. Import and register the component in `src/App.jsx`:
   - Add entry to `toolDetails` (id, title, desc)
   - Add entry to `tools` array (id, component, category, tags)
   - Add `import` statement at the top
3. Add the tool's card thumbnail/icon to `HomeGrid.jsx` if needed
4. Add styles to `src/styles.css`
5. If a serverless API is needed, add `functions/api/<name>.js` and mirror the handler in the `vite.config.js` dev proxy
6. **Update this file** (`CODEBASE.md`): add a row to the Tool Inventory table and update the directory tree if new files/dirs were created
