# Small Web Tools - Premium Dashboard

A modern, responsive single-page web utility application offering various everyday conversion, counting, and encoding tools in a highly polished dashboard layout. 

This project is built using **React** and **Vite** for a fast local development server and optimized production builds.

## Features & Upgrades

- **Sidebar Navigation Layout**: Clean sidebar navigation on the left, displaying only the selected tool card in the main staging area on the right.
- **Grouped Tool Categories**: All tools are organized into 7 clear, logical categories: Text, Calculation, Developer, Network, Media, Bioinfo, and Utilities. Group headers separate items in the sidebar, which are hidden in search mode to display flat search results cleanly.
- **Category Filter Tabs**: The homepage features interactive filter tabs allowing users to instantly filter the dashboard to display specific categories. Selecting "All" displays tools grouped under styled section headings with category icons.
- **Collapsible Left Sidebar**: Collapse the sidebar to a mini-sidebar layout (78px width) with a single click of the collapse button in the bottom-left sidebar footer. Keeps navigation icons visible and shows text labels as tooltips on hover, remembering your preference via `localStorage`.
- **Search Filtering**: Instantly search/filter through the list of tools inside the sidebar to find what you need.
- **Theme Switcher**: Fully functional Light & Dark theme toggle with automatic system preference detection and state persistence (saves choice to `localStorage`).
- **Interactive HSL Color Selector (Upgraded)**: Parallel to the text-based Color Code Converter is a PowerPoint-style Customize HSL selection panel. Dragging on the 2D Hue-Saturation board and the vertical Lightness slider updates HEX, RGB, and HSL outputs instantly. Supports bidirectional sync, standard presets, persistent recent colors list, and native browser Eyedropper API support.
- **Responsive Mobile Drawer**: Sidebar collapses into a sliding drawer on smaller mobile screens, toggled by a hamburger menu.
- **Multilingual Word Counter**: The Word Counter matches CJK characters individually and groups other spaced words (preserving internal hyphens/apostrophes) for accurate multilingual word counts.
- **Persistent Selection**: Remembers the last opened tool across page reloads.
- **DNA/RNA Direction Transfer**: Support DNA & RNA base complementation (supporting full IUPAC degenerate base codes), automatic direction tag detection (`5'-` and `3'-`), standard reverse complement generation, same-strand reverse direction generation, an interactive **Figure Mode** rendering base-paired double-stranded DNA/RNA molecules using complementary interlocking base shapes (opacity-differentiated: 100% sense/input vs 30% opposite/target), and **Codon Display options** (allowing users to group sequences in 3-base codons or translate them into 3-letter amino acid codes dynamically).
- **IP Address Lookup**: Retrieve coordinates, timezone, city, region, country, and organization/ISP details for any IP address or automatically detect the current client IP, accompanied by an interactive OpenStreetMap preview.
- **ImgMeta (Upgraded)**: Instantly extract metadata (camera settings, lens specifications, exposure settings, GPS details) from image files (including Canon `.CR3` RAW files) locally in the browser with 100% privacy (no files are uploaded). Supported upgrades include:
  - **Multi-File Uploads**: Drag & drop or browse multiple images concurrently.
  - **Side-by-Side Comparison**: Compare key metadata fields side-by-side across all uploaded files.
  - **Lossless Jpeg Stripper**: Strip APP1 (EXIF, GPS, XMP), APP13 (IPTC), and APP2 (ICC Profile) segments client-side from the JPEG ArrayBuffer without re-compression, retaining 100% image quality.
  - **Stripping Verification UI**: Displays a visual comparison list of removed vs. retained metadata tags.
  - **Bulk Export to Folder**: Package all loaded/stripped images into a single ZIP file (.zip) client-side using `jszip`.
  - **GPS Map Toggle**: Plots coordinates on an embedded OpenStreetMap map only when the "Show Map" button is clicked.
  - **Grouped Collapsible Advanced Tab**: Groups raw metadata tags into EXIF, GPS, IPTC, XMP, ICC, and File/Other categories with a global "Expand All" toggle.
- **Random Wheel (Lucky Draw)**: Spin a customizable visual wheel to draw items from a typed options list (defaulting to 1-5). Supports editable wheel titles, light/dark themes, custom-modal confirmation for clears, keyboard shortcuts, and single-draw elimination mode (drawn options are grayed out/struck through in the status list and automatically removed from the wheel).
- **Typing Speed Test (New)**: Measure typing speed and accuracy under Free Typing (no-template) and Template Mode. Custom templates can be pasted or uploaded as `.txt` files. Features real-time WPM/CPM calculation, accuracy percentage, backspace correction count, and correction rate tracking. Supports Chinese language mode (hiding CPM and counting 1 Chinese character/word as 1 WPM) with native IME composition handling, and displays a floating spelling correction tooltip (`[typed] 🏰 [expected]`) above the active word. Includes local history logging and JSON export capabilities.
- **RNA Codon Table (New)**: A professional, highly interactive standard genetic code reference table. All 64 RNA codons are organized in the canonical 4×4×4 format (first base rows × second base columns × third base sub-rows). Every codon and every amino acid label is a distinct clickable `<button>` element with ripple animation, hover/active states, and keyboard accessibility. Features include:
  - **Start codon (AUG/Met)** highlighted in semantic green; **Stop codons (UAA/UAG/UGA)** highlighted in semantic red.
  - **Click-to-explore**: Selecting a codon opens a glassmorphism detail panel showing the full amino acid name, 3-letter/1-letter codes, all synonymous codons, and a colour-coded per-base breakdown.
  - **Amino acid grouping highlighting**: Clicking either a codon or its AA label highlights all codons encoding the same amino acid simultaneously.
  - **Filter mode**: Toggle "★ Start" or "■ Stop" filters to dim unrelated codons instantly.
  - **JetBrains Mono** monospace font for codons; colour-coded base axes (U=violet, C=cyan, A=amber, G=green).
  - **Stats bar**: Live counters for total codons, amino acids, start/stop codons, and interaction count.
  - **Fully responsive** from desktop (full table) to narrow mobile (compacted rows).
  - **Detailed Fischer Projections**: Displays full L-configuration zwitterionic Fischer projection molecular structure diagrams for each of the 20 amino acids inside the detail panel. The structures accurately model carbon side-chain skeletons, aromatic rings, amides, and charged groups with custom blue color-coding to match reference hand-drawings.
- **Clean Tool Layout & Spacing**: Hides the outer redundant header/subtitles on individual utility pages, keeping the cleaner internal tool headings, minimizing blank space, and reducing vertical scrolling for a more compact, desktop/mobile-friendly workspace.

## Included Tools

1. **Slashes Converter**: Normalize Windows file paths to web/URL-friendly paths.
2. **Word & Character Counter**: Real-time counter of text words, characters, and spaces. Fully optimized for multilingual text, counting CJK (Chinese, Japanese, Korean) characters individually as words (matching Microsoft Word counting rules).
3. **Date Counter**: Calculate the day difference between a start and end date.
4. **Currency Converter & Counter**: Convert global currencies (e.g. TWD to USD) for single amounts, or convert and sum a list of decimal currency amounts (one per line) in real-time.
5. **Color Code Converter**: Interconvert between HEX, RGB, and HSL colors with interactive swatch previews, 12 standard color presets, recent color memory, and a PowerPoint-style HSL visual customize panel.
6. **ASCII Converter**: Encode text to ASCII code points or decode decimal codes back to text.
7. **Unicode Converter**: Translate characters to Unicode hex code points (e.g., `U+4F60`) and vice versa.
8. **Base Converter**: Seamlessly convert numbers across Binary (2), Octal (8), Decimal (10), Hexadecimal (16), and Sexagesimal (60).
9. **DNA/RNA Direction Transfer**: Perform base sequence complementation (supporting IUPAC degenerate base codes), reversing, same-strand reverse direction generation (e.g., input `5'-AATTCA-3'` -> output `3'-ACTTAA-5'`), 5'/3' strand orientation transfers, and interactive graphical rendering of double-stranded DNA/RNA helix structures with interlocking base-pairing shapes, custom base colors, and target direction indicators.
10. **IP Address Lookup**: Retrieve details of any IPv4/IPv6 address or look up the caller's IP, including geographical details, timezone, coordinates, organization, and a zoomable OpenStreetMap view.
11. **ImgMeta**: Load common images (JPEG, PNG, WebP, HEIC, AVIF) or Canon `.CR3` RAW files to extract EXIF, GPS, and manufacturer metadata client-side. Compare multiple images side-by-side, strip metadata losslessly, view location maps on toggle, sort raw tags in grouped advanced sections, and export images in bulk as a ZIP archive.
12. **Random Wheel**: Draw items at random from custom typed options. Edit the wheel title dynamically, view active and eliminated options in real-time, reset or clear options (with custom modal confirmation), toggle duplicate selections, and use keyboard shortcuts (`Space` to spin, `E` to edit options, `R` to reset, `C` to clear).
13. **Typing Speed Test**: Test typing speed in English or Chinese. Supports auto-timer triggers, template upload, character highlighting (correct/error state), floating spelling typo popups, and local history logging.
14. **RNA Codon Table**: Interactive standard genetic code reference. All 64 codons and their amino acid products are individually clickable buttons. Click any codon or AA label to reveal synonyms, full names, 1-letter codes, and per-base colour breakdown in a slide-in detail panel. Start/Stop codons carry semantic colour distinctions. Includes filter mode and live interaction stats.

---

## Local Development

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) installed on your system.

### 2. Install Dependencies
Run the following command to install the required dev tool (`vite`):
```bash
npm install
```

### 3. Start Dev Server
Spin up the local hot-reloading development server:
```bash
npm run dev
```
By default, the project is configured to run on [http://127.0.0.1:3000/](http://127.0.0.1:3000/) to avoid default port permission conflicts on Windows.

### 4. Build for Production
To generate a highly optimized and minified production build inside the `dist` folder:
```bash
npm run build
```

### 5. Preview Production Build
Preview the built assets locally before deployment:
```bash
npm run preview
```

---

## Project Structure

- `index.html` — HTML entry point hosting the root React container.
- `package.json` — Tooling configuration and dependencies (including React, React-DOM, and ExifReader).
- `.gitignore` — Standard gitignore configuration for Node/Vite/React projects.
- `src/` — React source directory:
  - `src/main.jsx` — Entry point rendering the root component.
  - `src/App.jsx` — Core layout component managing sidebar, theme, search filters, and tool state.
  - `src/styles.css` — Custom CSS variables, responsive designs, animations, and tool styling.
  - `src/components/` — Individual utility tool React components.

---

## Recent Bug Fixes

- **ImgMeta** Dropzone Mobile Loop Fix**: Fixed a bug where tapping the "Browse File" label (or the file input element itself) inside the ImgMeta dropzone on mobile devices triggered a recursive click event loop, preventing files from being analyzed. Tapping/clicking now cleanly triggers the file chooser exactly once.
- **DNA/RNA Visual Direction representation**: Fixed a bug where choosing `3' → 5'` input direction did not orient and render the input strand at the bottom correctly with matching arrows and labels. The bottom strand now correctly acts as the input strand, pointing left-to-right (`3' → 5'`) and rendering with 100% opacity, while the top strand is faded as the target strand (`5' → 3'`). Renamed all references to the `3' → 5'` strand to **Anti-sense Strand** and `5' → 3'` to **Sense Strand** in both the legend and SVG indicators.
- **DNA/RNA Codon Display & Amino Acid Translation**: Added a styled, button-based toggle panel letting the user choose between standard sequence, codon grouping (three-nucleotide groups separated by spaces, e.g. `5'-CAC GTG-3'`), and three-letter amino acid translation (e.g. `N-His-[GT]-C`). In **Figure Mode**, this dynamically draws visual brackets grouping every 3 nucleotides, labeled with the codon sequence or translated amino acid abbreviation (supporting degenerate/unknown bases, and rendering incomplete codons as `[codon]` like `[TG]` in brackets).
- **Proline Ring Angle Correction**: Corrected the pyrrolidine ring angles of the Proline (Pro) Fischer projection to match chemically accurate L-configuration geometry (regular inverted pentagon where the side edges flare outward from the horizontal N-C(alpha) backbone rather than sloping inward) and properly aligned the masking rectangles for clean rendering.

