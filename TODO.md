# Project TODO

This file is the working backlog and update checklist for Small Web Tools. Keep it focused on planned work, completed maintenance, and release preparation. User-facing instructions belong in `README.md`; architecture belongs in `CODEBASE.md`.

## Labels

- `feat` — new or expanded user capability.
- `fix` — corrected behavior or regression.
- `docs` — documentation-only work.
- `hotfix` — urgent production correction.

## Update process

Use this sequence for each meaningful update:

1. **Define the change.** Record the task below with an appropriate label and confirm the affected tools, routes, APIs, or shared components.
2. **Implement in the right place.** Keep tool registration in `src/App.jsx`; use the shared `Card` and `ToolHeader` primitives for tool pages; add server functionality under `functions/api/` only when browser-only code is insufficient.
3. **Validate.** Run `npm run build`. For layout or interaction work, also check the affected routes at desktop and mobile widths and review browser console errors.
4. **Update documentation.** Refresh `README.md` for changed user behavior, `CODEBASE.md` for structural changes, and this file for the task state. Do not turn the README into a changelog.
5. **Review and commit.** Check `git diff` and `git status`, then create a focused commit after each completed logical stage.
6. **Prepare a release when appropriate.** Confirm the version in `package.json`; create or update the git tag only as part of an agreed release. The app displays the newest git tag when one is available, otherwise it falls back to the package version.

## Active backlog

### Enhancements

- [x] `feat 1` Add a paste button to the source side of the Slashes, ASCII, Unicode, and Base converters. Review the existing result-copy controls at the same time for a consistent clipboard experience.
- [ ] `feat` Add a selectable audience mode for daily users, developers, bioinformatics researchers, designers, and students.
- [ ] `feat` Consider a simplified mode that surfaces only high-frequency tools and reduces advanced controls.
- [x] `feat 6` DNA/RNA Direction Transfer中，新增複製時可以去掉5'3'標記的選項
- [x] `chore 1` RNA codon table 中，移除All/Start/Stop按鈕

### Maintenance

- [ ] `docs` Review the tool descriptions in the dashboard when a feature's behavior materially changes.
- [ ] `docs` Keep `CODEBASE.md` synchronized whenever a route, shared component, API endpoint, or dependency is added, removed, or substantially changed.

## Completed

### 2026-07-23

- [x] `fix` Completed 0723 remediation Phase 1 (C01–C05): self-hosted licensed UI fonts, metadata-only bounded Font Extractor, network-service inventory and in-app privacy route, integrity-verified on-demand FFmpeg loading, and shared OSM map consent with immediate revocation.
- [x] `test` Added focused API, integrity, consent, and Playwright network-boundary coverage; `npm run verify` and all Phase 1 browser journeys pass.

### 2026-07-18

- [x] `docs` Rewrote the README as a concise site manual.
- [x] `docs` Moved the project update process and maintenance backlog into this file.
- [x] `docs` Refreshed CODEBASE.md to match the active route inventory, component conventions, APIs, and documentation roles.

### 2026-07-08

- [x] `fix` Corrected the site version display so current builds no longer show a stale tag.
- [x] `fix` Restored Random Wheel spinning.
- [x] `fix` Improved Folder Analyzer handling of `.gitignore` and removed example paths from its display.
- [x] `fix` Updated dark-mode header sub-button styling.
