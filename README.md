# Small Web Tools

Small Web Tools is a browser-based collection of everyday utilities for text, developer work, files, media, networking, bioinformatics, and quick calculations. It is a single-page React application: selecting a tool changes the view without a full page load.

## Using the site

1. Start at the dashboard and choose a category or use the search box.
2. Select a tool from the navigation. Each tool has its own URL path, so a page such as `/home/color` can be bookmarked or shared.
3. Enter text, choose a file, or use the relevant controls. Results update in the current page.
4. Use the light/dark toggle when needed. The selected theme, collapsed desktop sidebar, and most recently opened tool are remembered in the browser.

On a phone or narrow screen, the navigation becomes a drawer opened by the menu button.

### Audience and Simple modes

The audience switcher beside the homepage introduction can show the unchanged
full homepage or a curated set for daily users, developers, bioinformatics
researchers, designers, or students. The top header retains the category menus.

Every audience selection redirects to a bookmarkable address:

- `/home`
- `/home/daily`
- `/home/developer`
- `/home/bioinformatics`
- `/home/designer`
- `/home/student`

The workspace path remains in the address while opening tools, so a link such as
`/home/developer/code-preview` restores both the selected workspace and the
requested tool.

The separate **Simple mode** interface is available at `/simple`. It provides a
large search across every tool and compact shortcuts to eight everyday
essentials. Tools opened there remain in the reduced shell at addresses such as
`/simple/color`; use **Exit Simple mode** or the brand icon to return to `/home`.

## Tool guide

### Text

- **Word Counter** — count words, characters, lines, and reading time.
- **Casing Switcher** — change text to upper, lower, sentence, title, or custom-term casing.
- **Typing Speed Test** — run a free or template-based typing test.

### Developer

- **Slashes Converter** — convert Windows and web-style paths.
- **ASCII Converter** and **Unicode Converter** — convert text to and from character codes.
- **Base Converter** — convert values among binary, octal, decimal, hexadecimal, and sexagesimal.
- **VS Code Preview** — edit and highlight code with line numbers, appearance controls, and local source or PNG downloads.
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
- **Random Wheel** — make a cryptographically seeded selection and export a locally verifiable draw record.

## Privacy and network access

File-focused tools process selected files in the browser whenever possible; files are not sent to this project for analysis. Some capabilities necessarily use network access:

- IP Lookup queries a server-side lookup endpoint and external IP providers.
- Website Font Extractor scans bounded public HTML and CSS through a same-origin endpoint and returns declaration metadata only; it does not preview or download discovered font files.
- Network Speed Test measures real network traffic.
- Currency Converter requests live rates only after consent; manual rates remain local.
- Image and IP maps contact OpenStreetMap only after map consent; coordinates remain available without the embed.
- Media Splitter downloads the pinned FFmpeg WebAssembly engine from unpkg on the first processing action and verifies its size and SHA-256 before execution. Media stays in the browser.
- Camera scanning requires browser camera permission.

The footer’s **Privacy** route lists every declared network service, trigger, transmitted data, consent mode, and fallback. Review that policy, a tool's own labels, and your browser permissions before using sensitive content.

## Run locally

Requires Node.js 22 or Node.js 24 and npm. Node 22 is the repository default (`.nvmrc`); CI verifies both supported releases.

```bash
npm install
npm run dev
```

Vite prints the local URL when the server starts. For a production build and local preview:

```bash
npm run build
npm run preview
```

Run the complete local verification and browser journeys with:

```bash
npm run verify
npm run test:e2e
```

`npm run dev` mirrors only the IP lookup function (`/api/iplookup`). To exercise all
Cloudflare Pages Functions locally (currency rates and website font extraction),
follow the two-terminal Pages/Worker instructions in `CONTRIBUTING.md`. Run
`npm run platform:integration` for the automated concurrent-limit and fail-closed
service-binding check.

The Cloudflare Pages production build must use Node.js 22 or 24, `npm ci` followed by `npm run build`, and publish `dist/`.

### HSTS rollout

The checked-in response policy is at the initial HSTS stage:
`Strict-Transport-Security: max-age=86400`. It intentionally omits
`includeSubDomains` and `preload`. After deploying, validate the real production
response and HTTP redirect with:

```bash
DEPLOYED_BASE_URL=https://small-web-tools.pages.dev npm run test:e2e:deployed
```

Keep the one-day stage until it has been monitored and rollback/domain ownership
has been reviewed. Later increases to 30 days and one year require separate
operational approval; subdomains and preload require an explicit full-domain audit.

## Documentation

`CONTRIBUTING.md` is the canonical engineering and local-runtime guide. `CODEBASE.md`
is the canonical architecture and route reference.

- [`TODO.md`](TODO.md) — active backlog, completed work, and the project update process.
- [`CODEBASE.md`](CODEBASE.md) — architecture, route inventory, shared UI conventions, and developer guidance.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
Copyright (c) 2026 Rhosiqs
