# Small Web Tools - Premium Dashboard

A modern, responsive single-page web utility application offering various everyday conversion, counting, and encoding tools in a highly polished dashboard layout. 

This project is built using **React** and **Vite** for a fast local development server and optimized production builds.

## Features & Upgrades

- **Sidebar Navigation Layout**: Clean sidebar navigation on the left, displaying only the selected tool card in the main staging area on the right.
- **Grouped Tool Categories**: All tools are organized into 7 clear, logical categories: Text, Calculation, Developer, Network, Media, Bioinfo, and Utilities. Group headers separate items in the sidebar, which are hidden in search mode to display flat search results cleanly.
- **Category Filter Tabs**: The homepage features interactive filter tabs allowing users to instantly filter the dashboard to display specific categories. Selecting "All" displays tools grouped under styled section headings with category icons.
- **Collapsible Left Sidebar**: Collapse the sidebar to a mini-sidebar layout (78px width) with a single click of the collapse button in the bottom-left sidebar footer. Keeps navigation icons visible and shows text labels as tooltips on hover, remembering your preference via `localStorage`. The brand logo icon is moved to the top bar, allowing for a cleaner header area.
- **Search Filtering**: Instantly search/filter through the list of tools inside the sidebar to find what you need.
- **Theme Switcher**: Fully functional Light & Dark theme toggle with automatic system preference detection and state persistence (saves choice to `localStorage`). Only kept in the sidebar footer to avoid redundancy.
- **Custom Favicon (New)**: Displays a custom SVG favicon (green background and white stack-layers icon) in the browser tab to match the brand identity.
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
- **Office Metadata Reader (New)**: Extract and analyze core, application, and format-specific metadata from Word (`.docx`), Excel (`.xlsx`), and PowerPoint (`.pptx`) documents client-side locally in the browser with 100% privacy using `JSZip` and the browser's native `DOMParser` for XML parsing. Shows shared core properties, software details, and format-specific structures (like page/word counts, slide details, worksheet lists with visibility states, and heading grouping pairs).
- **Typing Speed Test (New)**: Measure typing speed and accuracy under Free Typing (no-template) and Template Mode. Custom templates can be pasted or uploaded as `.txt` files. Features real-time WPM/CPM calculation, accuracy percentage, backspace correction count, and correction rate tracking. Supports Chinese language mode (hiding CPM and counting 1 Chinese character/word as 1 WPM) with native IME composition handling, and displays a floating spelling correction tooltip (`[typed] 🏰 [expected]`) above the active word. Includes local history logging and JSON export capabilities. Upgrades include a simplified settings bar matching modern layouts (moving advanced options to a sub-config bar) and an **IDE Code Mode** (preserves code indentation, renders line numbers, displays end-of-line `↵` indicators, and features auto-indentation on Enter and mass-deletion on Backspace over a clean solid IDE-style editor background).
- **Network Speed Test (New)**: Test network latency (ping), download speed (100MB), and upload speed (25MB) in real time using Cloudflare endpoints. Features an interactive SVG Speedometer Gauge (needle dial) and a real-time SVG Line Chart visualizing download/upload speeds over time. Discards connection warm-up bias for accurate latency readings and supports abort controls to stop the test early.
- **RNA Codon Table (New)**: A professional, highly interactive standard genetic code reference table. All 64 RNA codons are organized in the canonical 4×4×4 format (first base rows × second base columns × third base sub-rows). Every codon and every amino acid label is a distinct clickable `<button>` element with ripple animation, hover/active states, and keyboard accessibility. Features include:
  - **Start codon (AUG/Met)** highlighted in semantic green; **Stop codons (UAA/UAG/UGA)** highlighted in semantic red.
  - **Click-to-explore**: Selecting a codon opens a glassmorphism detail panel showing the full amino acid name, 3-letter/1-letter codes, all synonymous codons, and a colour-coded per-base breakdown.
  - **Amino acid grouping highlighting**: Clicking either a codon or its AA label highlights all codons encoding the same amino acid simultaneously.
  - **Filter mode**: Toggle "★ Start" or "■ Stop" filters to dim unrelated codons instantly.
  - **JetBrains Mono** monospace font for codons; colour-coded base axes (U=violet, C=cyan, A=amber, G=green).
  - **Stats bar**: Live counters for total codons, amino acids, start/stop codons, and interaction count.
  - **Fully responsive** from desktop (full table) to narrow mobile (compacted rows).
  - **Detailed Fischer Projections**: Displays full L-configuration zwitterionic Fischer projection molecular structure diagrams for each of the 20 amino acids inside the detail panel. The structures accurately model carbon side-chain skeletons, aromatic rings, amides, and charged groups with custom blue color-coding to match reference hand-drawings.
  - **Interactive Codon Typer (New)**: A passcode-style 3-card base input interface (1st, 2nd, and 3rd positions) for quick codon lookups. Typing characters (U, C, A, G or auto-mapped T -> U) shows the translated amino acid dynamically, highlighting matching codons in the table and dimming others.
  - **Biochemical Group Filter (New)**: Select biochemical group filters (Hydrophobic, Polar Uncharged, Basic, or Acidic) to highlight related codons in the table and display interactive amino acid chips for quick exploration.
- **Clean Tool Layout & Spacing**: Hides outer redundant headers, titles, and subtitles across the application (including the duplicate homepage main-header), keeping clean internal tool headings, minimizing blank space, and reducing vertical scrolling for a compact, desktop/mobile-friendly workspace.
- **Green Accent Theme & Light Sidebar (New)**: Replaced the default blue color scheme with a curated green theme (`#4FB949` in light mode, `#5EC95A` in dark mode). The sidebar has been updated to render in a clean white background during light mode and deep charcoal in dark mode.
- **Dynamic Responsive Footer (New)**: Structured the footer columns to dynamically mirror the 7 sidebar category groups exactly. Handled mobile responsive layouts by separating brand name and copyright into stacked rows on screens below 768px.
- **QR Code & Barcode Generator (New)**: Create highly customizable QR codes and barcodes. Generate QR codes from text, URLs, WiFi networks, emails, phone numbers, and SMS. Customize the dot shape (square vs circle), position eyes (standard square, smooth rounded, or circular rings), choose solid or linear/radial gradient foreground colors, set background color (including transparent), upload and embed logo images with size slider and White Circle/Square padding overlays, and export to PNG or vector SVG format. Generate barcodes in multiple formats (CODE128, EAN-13, EAN-8, UPC-A, Code 39, ITF, Codabar) with live input validation, custom line/background colors, bar height/width sliders, toggleable text label, and download as PNG or vector SVG.
- **Secure Password Generator (New)**: Generate cryptographically secure random passwords using a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) as the sole source of randomness. Uses unbiased rejection sampling (discarding biased remainder ranges, using a prefetch buffer of 64 bytes to minimize API overhead) to eliminate modulo bias. Offers customizable length (8-128), optional special characters, real-time entropy calculation, offline crack-time estimation, color-coded password display, and a live console-themed visualizer detailing the rejection sampling statistics (with theoretical vs. actual discard rates).

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
11. **Network Speed Test**: Measure client-side latency (ping), download speed (100MB file), and upload speed (25MB file) with real-time SVG speedometer gauge and line chart visualization.
12. **ImgMeta**: Load common images (JPEG, PNG, WebP, HEIC, AVIF) or Canon `.CR3` RAW files to extract EXIF, GPS, and manufacturer metadata client-side. Compare multiple images side-by-side, strip metadata losslessly, view location maps on toggle, sort raw tags in grouped advanced sections, and export images in bulk as a ZIP archive.
13. **Random Wheel**: Draw items at random from custom typed options. Edit the wheel title dynamically, view active and eliminated options in real-time, reset or clear options (with custom modal confirmation), toggle duplicate selections, and use keyboard shortcuts (`Space` to spin, `E` to edit options, `R` to reset, `C` to clear).
14. **Typing Speed Test**: Test typing speed in English or Chinese. Supports auto-timer triggers, template upload, character highlighting (correct/error state), floating spelling typo popups, and local history logging.
15. **RNA Codon Table**: Interactive standard genetic code reference. All 64 codons and their amino acid products are individually clickable buttons. Click any codon or AA label to reveal synonyms, full names, 1-letter codes, and per-base colour breakdown in a slide-in detail panel. Start/Stop codons carry semantic colour distinctions. Includes filter mode and live interaction stats.
16. **Secure Password Generator**: Cryptographically secure random password generation tool. Implements batch prefetch buffer (64 bytes) CSPRNG rejection sampling to eliminate modulo bias. Configurable length (8-128) and special character set toggles. Computes entropy in bits, provides strength metrics and guessing-speed estimates, and displays a live terminal log mapping CSPRNG bytes to characters.
17. **Office Metadata Reader**: Local Office document metadata parser. Extract and view details from `.docx`, `.xlsx`, and `.pptx` documents, including creation/modification timestamps, software versions, worksheet configurations, page/word metrics, and slide counts.

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
- `package.json` — Tooling configuration and dependencies (including React, React-DOM, ExifReader, QRCode, and JsBarcode).
- `.gitignore` — Standard gitignore configuration for Node/Vite/React projects.
- `src/` — React source directory:
  - `src/main.jsx` — Entry point rendering the root component.
  - `src/App.jsx` — Core layout component managing sidebar, theme, search filters, and tool state.
  - `src/styles.css` — Custom CSS variables, responsive designs, animations, and tool styling.
  - `src/components/` — Individual utility tool React components.
  - `src/utils/` — Utility helper scripts:
    - `src/utils/passwordGenerator.js` — Core CSPRNG password generator with rejection sampling and batch prefetch buffer.

---

- **Mobile Responsive Layout Fixes**: Fixed mobile layout and responsiveness issues across all tool components to support mobile portrait screen aspect ratios (e.g., 9:20 and 9:16). Specific updates include proportional canvas scaling for the **Random Wheel**, horizontal scrolling for the complex grid structure of the **RNA Codon Table**, optimized font scaling for the **Typing Speed Test**, centered swap button layout for the **Currency Converter**, HSL customize panel stacking for the **Color Code Converter**, and adjusted grid spacing, paddings, and font sizes across all elements on screens ≤768px and ≤500px wide.
- **DNA/RNA Visual Direction representation**: Fixed a bug where choosing `3' → 5'` input direction did not orient and render the input strand at the bottom correctly with matching arrows and labels. The bottom strand now correctly acts as the input strand, pointing left-to-right (`3' → 5'`) and rendering with 100% opacity, while the top strand is faded as the target strand (`5' → 3'`). Renamed all references to the `3' → 5'` strand to **Anti-sense Strand** and `5' → 3'` to **Sense Strand** in both the legend and SVG indicators.
- **DNA/RNA Codon Display & Amino Acid Translation**: Added a styled, button-based toggle panel letting the user choose between standard sequence, codon grouping (three-nucleotide groups separated by spaces, e.g. `5'-CAC GTG-3'`), and three-letter amino acid translation (e.g. `N-His-[GT]-C`). In **Figure Mode**, this dynamically draws visual brackets grouping every 3 nucleotides, labeled with the codon sequence or translated amino acid abbreviation (supporting degenerate/unknown bases, and rendering incomplete codons as `[codon]` like `[TG]` in brackets).
- **Proline Ring Angle Correction**: Corrected the pyrrolidine ring angles of the Proline (Pro) Fischer projection to match chemically accurate L-configuration geometry (regular inverted pentagon where the side edges flare outward from the horizontal N-C(alpha) backbone rather than sloping inward), properly aligned the masking rectangles, and introduced standard 10px spacing gaps at the C-alpha and N terminals to prevent the ring path from overlapping the text labels.
- **Fischer Projection Enlargement**: Scaled the entire Fischer projection SVG diagram to 1.2X its original size. Scaled all text font sizes and line stroke-widths in CSS proportionally by 1.2X, ensuring the precise 10px spacing and gaps between the bonds (`|`) and the labels are perfectly preserved and scaled.
- **Codon InfoPanel Layout Upgrades**: Replaced the large codon code in the header with the amino acid name (e.g. Proline) as the primary title. Placed the 3-letter abbreviation badge (e.g. `Pro`) and the 1-letter code badge (e.g. `P`, with no "1-letter: " prefix text) directly next to the title in the header. Reordered the layout to position the base bubbles (1st, 2nd, 3rd) at the top of the card. Removed the redundant Selected Codon text line (as the selected codon bases are already detailed in the base bubbles) and positioned the synonymous codons section below the bubbles, while enlarging both the synonymous codons label and chips for better readability.
- **Tryptophan (Trp) Side Chain and Layout Updates**: Mirrored the L-configuration Fischer projection side chain of Tryptophan (Trp) horizontally to correctly position the 6-membered benzene ring on the left and the 5-membered pyrrole ring on the right. Corrected the pentagon coordinates to form a clean, symmetric peak at the top C-3 vertex (shifting the shared vertical bond at `x=70` down-left/down-right to peaks at `y=95`), and centered `NH` at the bottom-right vertex `(90, 135)`. Grouped and ordered the abbreviation badges in the panel header (3-letter badge first, 1-letter badge second), and disabled flex-wrap in the title container to guarantee that the full name and both badges always stay on the same line. Reduced the size of the close button `X` mark in the codon card panels (width/height from `26px` to `20px` and font-size from `0.72rem` to `0.58rem`).
- **Codon and Amino Acid Highlight Sync**: Fixed a bug where selecting a codon or clicking an amino acid button did not highlight all synonymous codons of that amino acid in the table. This occurred because syncing the selected codon to the typed passcode text triggered prefix matching and dimmed non-matching codons (e.g. dimming `AGA` when `CGU` was selected, despite both coding for Arginine). Restructured the highlighting and dimming logic to only apply the typed character prefix filter during partial/incomplete searches (when `selectedCodon` is null), and ensured that when a specific amino acid is clicked/highlighted, all other amino acids (even those within the same biochemical group) are correctly dimmed to prevent confusion.
- **Start/Stop Codon Highlight Colors**: Customized the border-color, shadow, and background styles for highlighted start codons and stop codons. Highlighted stop codons (UAA, UAG, UGA) and Stop buttons now show in semantic red (`#dc2626`) instead of the default accent blue, and highlighted start codons (AUG) show in semantic green (`#16a34a`).
- **Color Converter Category Move**: Moved the Color Converter tool from the Developer group to the Media group.
- **Heading and Branding Font Update**: Replaced the previous "Outfit" headings font and branding font (as well as specific "Inter" branding/header fonts) with the premium "TASA Orbiter" font from Google Fonts. Imported the font stylesheet in `index.html`, defined a global heading CSS rule for `h1-h6` using `TASA Orbiter`, updated all specific style rules in `styles.css` that declared font-family, and synced the font family of the canvas rendering on the **Random Wheel**.
- **Top Header Dropdowns & Footer Centering**: Replaced the desktop vertical sidebar layout with a top-aligned, sticky horizontal navigation header (`desktop-header`) on screens above 768px. The header features main groups (categories) with triangle chevron icons that rotate smoothly by 180 degrees using CSS transitions when the dropdown menus are hovered or active. Dropdown menus list and navigate to all sub-groups (tools). Integrated a compact search input and theme toggle inside the desktop header. Centered the footer copyright and brand info using a grid-based layout on desktop, while retaining standard flex/column layouts on mobile.



