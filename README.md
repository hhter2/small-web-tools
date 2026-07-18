# Small Web Tools

Small Web Tools is a browser-based collection of everyday utilities for text, developer work, files, media, networking, bioinformatics, and quick calculations. It is a single-page React application: selecting a tool changes the view without a full page load.

## Using the site

1. Start at the dashboard and choose a category or use the search box.
2. Select a tool from the navigation. Each tool has its own URL hash, so a page such as `#tool-color` can be bookmarked or shared.
3. Enter text, choose a file, or use the relevant controls. Results update in the current page.
4. Use the light/dark toggle when needed. The selected theme, collapsed desktop sidebar, and most recently opened tool are remembered in the browser.

On a phone or narrow screen, the navigation becomes a drawer opened by the menu button.

## Tool guide

### Text

- **Word Counter** — count words, characters, lines, and reading time.
- **Casing Switcher** — change text to upper, lower, sentence, title, or custom-term casing.
- **Typing Speed Test** — run a free or template-based typing test.

### Developer

- **Slashes Converter** — convert Windows and web-style paths.
- **ASCII Converter** and **Unicode Converter** — convert text to and from character codes.
- **Base Converter** — convert values among binary, octal, decimal, hexadecimal, and sexagesimal.
- **Website Font Extractor** — inspect the fonts used by a public website.
- **Folder Analyzer** — inspect a selected folder's structure and metrics.

### Network

- **IP Lookup** — look up IP address and location information.
- **Speed Test** — measure latency, download, and upload performance.

### Media

- **Color Converter** — work with color codes, palettes, and the HSL spectrum.
- **Image Metadata**, **Office Metadata**, **Audio Metadata**, and **Video Metadata** — inspect supported local files and their metadata.
- **Media Splitter** — extract a video's audio track and silent video track.

### Bioinfo

- **DNA/RNA Converter** — transform sequence direction, complements, and display modes.
- **RNA Codon Table** — explore RNA codons, amino acids, and filters.

### Utilities

- **Currency Converter** and **Date Counter** — perform common calculations.
- **QR Code Generator** and **Barcode Generator** — create downloadable codes.
- **QR & Barcode Scanner** — scan with a camera or image file.
- **Password Generator** and **Password Strength** — generate or assess passwords.
- **Random Wheel** — make a random selection from a custom list.

## Privacy and network access

File-focused tools process selected files in the browser whenever possible; files are not sent to this project for analysis. Some capabilities necessarily use network access:

- IP Lookup queries a server-side lookup endpoint and external IP providers.
- Website Font Extractor fetches the public URL supplied by the user through server-side endpoints to work around browser cross-origin limits.
- Network Speed Test measures real network traffic.
- Camera scanning requires browser camera permission.

Review a tool's own labels and your browser permissions before using it with sensitive content.

## Run locally

Requires a current Node.js installation.

```bash
npm install
npm run dev
```

Vite prints the local URL when the server starts. For a production build and local preview:

```bash
npm run build
npm run preview
```

## Documentation

- [`TODO.md`](TODO.md) — active backlog, completed work, and the project update process.
- [`CODEBASE.md`](CODEBASE.md) — architecture, route inventory, shared UI conventions, and developer guidance.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
Copyright (c) 2026 Rhosiqs