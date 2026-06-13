# Small Web Tools - Premium Dashboard

A modern, responsive single-page web utility application offering various everyday conversion, counting, and encoding tools in a highly polished dashboard layout. 

This project is built using vanilla HTML/JS/CSS, powered by **Vite** for a fast local development server and optimized production builds.

## Features & Upgrades

- **Sidebar Navigation Layout**: Clean sidebar navigation on the left, displaying only the selected tool card in the main staging area on the right.
- **Collapsible Left Sidebar**: Collapse the sidebar to a mini-sidebar layout (78px width) with a single click of the collapse button in the bottom-left sidebar footer. Keeps navigation icons visible and shows text labels as tooltips on hover, remembering your preference via `localStorage`.
- **Search Filtering**: Instantly search/filter through the list of tools inside the sidebar to find what you need.
- **Theme Switcher**: Fully functional Light & Dark theme toggle with automatic system preference detection and state persistence (saves choice to `localStorage`).
- **Interactive UI Swatch**: Live color preview bar inside the Color Code Converter tool.
- **Responsive Mobile Drawer**: Sidebar collapses into a sliding drawer on smaller mobile screens, toggled by a hamburger menu.
- **Multilingual Word Counter**: The Word Counter matches CJK characters individually and groups other spaced words (preserving internal hyphens/apostrophes) for accurate multilingual word counts.
- **Persistent Selection**: Remembers the last opened tool across page reloads.
- **DNA/RNA Direction Transfer**: Support DNA & RNA base complementation (supporting full IUPAC degenerate base codes), automatic direction tag detection (`5'-` and `3'-`), standard reverse complement generation, and same-strand reverse direction generation.
- **IP Address Lookup**: Retrieve coordinates, timezone, city, region, country, and organization/ISP details for any IP address or automatically detect the current client IP, accompanied by an interactive OpenStreetMap preview.
- **EXIF Data Analyzer**: Instantly extract metadata (camera settings, lens specifications, exposure settings, GPS details) from image files (including Canon `.CR3` RAW files) locally in the browser with 100% privacy (no files are uploaded), accompanied by live search, categorization tabs, and JSON export.
- **Random Wheel (Lucky Draw)**: Spin a customizable visual wheel to draw items from a typed options list (defaulting to 1-5). Supports editable wheel titles, light/dark themes, custom-modal confirmation for clears, keyboard shortcuts, and single-draw elimination mode (drawn options are grayed out/struck through in the status list and automatically removed from the wheel).

## Included Tools

1. **Slashes Converter**: Normalize Windows file paths to web/URL-friendly paths.
2. **Word & Character Counter**: Real-time counter of text words, characters, and spaces. Fully optimized for multilingual text, counting CJK (Chinese, Japanese, Korean) characters individually as words (matching Microsoft Word counting rules).
3. **Date Counter**: Calculate the day difference between a start and end date.
4. **Currency Counter**: Add up a list of decimal currency amounts (one per line) automatically formatted to selected locale currencies.
5. **Color Code Converter**: Interconvert between HEX, RGB, and HSL colors with interactive swatch previews.
6. **ASCII Converter**: Encode text to ASCII code points or decode decimal codes back to text.
7. **Unicode Converter**: Translate characters to Unicode hex code points (e.g., `U+4F60`) and vice versa.
8. **Base Converter**: Seamlessly convert numbers across Binary (2), Octal (8), Decimal (10), Hexadecimal (16), and Sexagesimal (60).
9. **DNA/RNA Direction Transfer**: Perform base sequence complementation (supporting IUPAC degenerate base codes), reversing, same-strand reverse direction generation (e.g., input `5'-AATTCA-3'` -> output `3'-ACTTAA-5'`), and 5'/3' strand orientation transfers (e.g., input `5'-CACGT-3'` -> output `3'-GTGCA-5'`).
10. **IP Address Lookup**: Retrieve details of any IPv4/IPv6 address or look up the caller's IP, including geographical details, timezone, coordinates, organization, and a zoomable OpenStreetMap view.
11. **EXIF Data Analyzer**: Load common images (JPEG, PNG, WebP, HEIC, AVIF) or Canon `.CR3` RAW files to extract EXIF, GPS, and manufacturer metadata client-side. Render embedded RAW thumbnails, filter tags by category tabs or search query, and export all metadata to a formatted JSON file.
12. **Random Wheel**: Draw items at random from custom typed options. Edit the wheel title dynamically, view active and eliminated options in real-time, reset or clear options (with custom modal confirmation), toggle duplicate selections, and use keyboard shortcuts (`Space` to spin, `E` to edit options, `R` to reset, `C` to clear).

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
By default, the project will run on [http://localhost:5173/](http://localhost:5173/).

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

- `index.html` — Layout structure including sidebar and tool containers.
- `app.js` — Core application logic, event listeners, converters, state management, and navigation.
- `styles.css` — Custom CSS variables, responsive design, animations, theme schemes, and utility widgets.
- `package.json` — Tooling configuration and dependencies.
- `.gitignore` — Standard gitignore configuration for Node/Vite projects.

---

## Recent Bug Fixes

- **EXIF Dropzone Mobile Loop Fix**: Fixed a bug where tapping the "Browse File" label (or the file input element itself) inside the EXIF analyzer's dropzone on mobile devices triggered a recursive click event loop, preventing files from being analyzed. Tapping/clicking now cleanly triggers the file chooser exactly once.

