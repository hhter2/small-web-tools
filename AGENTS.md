# AGENTS.md — Styling migration status

> [!NOTE]
> This file tracks the styling migration status. It must remain in sync with CLAUDE.md.

---

This section tracks the Tailwind CSS migration. Keep this and `CLAUDE.md` in sync — if you update one, check the other.

## Current state (Phase 6 — complete)

- Tailwind is configured (`tailwind.config.js`), theme values map to the existing
  CSS custom properties in `src/styles.css` (`:root` / `html[data-theme="dark"]`).
  Colors, radii, and shadows are NOT duplicated — Tailwind reads the same variables.
- Shared primitives live in `src/components/ui/`: `Card`, `Button`, `FieldInput`,
  `ToolHeader`, `ToggleSwitch`, `Spinner`, `ResultDisplay`.
  Use these for any new tool or when touching an existing one.
- `src/styles.css` now contains **only** the following:
  - `@import` (Google Fonts)
  - `@tailwind base/components/utilities` directives
  - `:root` and `html[data-theme="dark"]` CSS custom property definitions
  - Global resets (`*`, `html/body`, `body`)
  - Global element styles (`h1–h6`, `label`, `textarea`, `input`, `select`)
  - Remaining shared patterns still in use by tool components:
    `.btn-secondary`, `.tab-btn`, `.search-input-group`, `.iplookup-results-layout`
  - Tool-specific styles (CodonTable `ct-*`, HomeGrid, ColorConverter, etc.)
  - Scrollbar styles and remaining `@keyframes`

## Migration status by tool

| Tool | Status |
|---|---|
| **App.jsx (shell layout)** | **done** |
| PasswordGenerator | done |
| ColorConverter | done |
| SlashesConverter | done |
| CasingSwitcher | done |
| WordCounter | done |
| DateCounter | done |
| CurrencyCounter | done |
| AsciiConverter | done |
| UnicodeConverter | done |
| BaseConverter | done |
| DnaConverter | done |
| CodonTable | done |
| IpLookup | done |
| ImgMeta | done |
| OfficeMeta | done |
| AudioMeta | done |
| VideoMeta | done |
| RandomWheel | done |
| TypingSpeedTest | done |
| NetworkSpeedTest | done |
| QrBarcodeGenerator | done |
| QrBarcodeScanner | done |
| WebsiteFontExtractor | done |
| FolderAnalyzer | done |
| MediaSeparator | done |
| MediaSeparatorQueueItem | done |
| MediaSeparatorWaveform | done |
| MediaSeparatorFormatSelect | done |
| HomeGrid | done |
| BioinfoIcon | done |
| DnaRnaIcon | done |

## Rules for new work

- New tools: build with Tailwind + `src/components/ui/` primitives from the start.
  Do not add new rules to `styles.css`.
- Touching an existing tool for an unrelated bug fix: no obligation to migrate it,
  but if you do touch its styling anyway, prefer migrating that one component fully
  over patching the legacy CSS further.
- If a shared primitive doesn't cover something you need, extend the primitive
  (add a variant/prop) rather than writing one-off Tailwind classes in the tool
  component, so the pattern stays reusable.

## Still open

1. `Button variant="danger"` is a placeholder — needs a real parity pass
   against `.btn-danger-custom` / `.btn-danger-confirm` before use.
   Do not use `variant="danger"` in any tool component until this is resolved.
