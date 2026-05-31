# Small Web Tools - Premium Dashboard

A modern, responsive single-page web utility application offering various everyday conversion, counting, and encoding tools in a highly polished dashboard layout. 

This project is built using vanilla HTML/JS/CSS, powered by **Vite** for a fast local development server and optimized production builds.

## Features & Upgrades

- **Sidebar Navigation Layout**: Clean sidebar navigation on the left, displaying only the selected tool card in the main staging area on the right.
- **Search Filtering**: Instantly search/filter through the list of tools inside the sidebar to find what you need.
- **Theme Switcher**: Fully functional Light & Dark theme toggle with automatic system preference detection and state persistence (saves choice to `localStorage`).
- **Interactive UI Swatch**: Live color preview bar inside the Color Code Converter tool.
- **Responsive Mobile Drawer**: Sidebar collapses into a sliding drawer on smaller mobile screens, toggled by a hamburger menu.
- **Multilingual Word Counter**: The Word Counter matches CJK characters individually and groups other spaced words (preserving internal hyphens/apostrophes) for accurate multilingual word counts.
- **Persistent Selection**: Remembers the last opened tool across page reloads.

## Included Tools

1. **Slashes Converter**: Normalize Windows file paths to web/URL-friendly paths.
2. **Word & Character Counter**: Real-time counter of text words, characters, and spaces. Fully optimized for multilingual text, counting CJK (Chinese, Japanese, Korean) characters individually as words (matching Microsoft Word counting rules).
3. **Date Counter**: Calculate the day difference between a start and end date.
4. **Currency Counter**: Add up a list of decimal currency amounts (one per line) automatically formatted to selected locale currencies.
5. **Color Code Converter**: Interconvert between HEX, RGB, and HSL colors with interactive swatch previews.
6. **ASCII Converter**: Encode text to ASCII code points or decode decimal codes back to text.
7. **Unicode Converter**: Translate characters to Unicode hex code points (e.g., `U+4F60`) and vice versa.
8. **Base Converter**: Seamlessly convert numbers across Binary (2), Octal (8), Decimal (10), Hexadecimal (16), and Sexagesimal (60).

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
