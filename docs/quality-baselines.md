# Quality baselines

## Coverage scope

`npm run test:coverage` enforces two tiers in `vitest.config.js`.

- Domain code under `src/lib/`, `functions/_shared/`, and `functions/api/` retains the established 80% line/function/statement and 70% branch thresholds.
- The initial UI/application scope explicitly includes `src/toolRegistry.js`, `src/toolModes.js`, `src/components/LanguageSwitcher.jsx`, and the shared `Button`, `Card`, `FieldInput`, `FullscreenPreview`, and `ToolHeader` primitives. Its initial non-regression floor is 20% for lines/functions/statements and 15% for branches.
- The interactive application shell includes `AppHeader`, `AppFooter`, `DesktopCategoryNav`, `MobileDrawer`, and the routing, persistence, and title hooks. These modules have component-specific floors of 50% for lines/functions/statements and 40% for branches so closed-drawer, overlay, keyboard, history, and persistence paths cannot silently leave coverage.

Browser accessibility checks reject every unlisted Axe violation, including moderate findings. A temporary exception must name the rule, concrete rationale, future ISO expiry date, and remediation reference in `e2e/accessibility.spec.js`.

### Temporary Axe exceptions

The `heading-order` rule is accepted through 2026-09-30 while legacy tool sections are normalized from level-three headings to a sequential hierarchy beneath the shared level-one `ToolHeader`. The exception covers heading order only; page-title presence, landmarks, names, roles, focus, and every other Axe rule remain enforced. Remove the exception after the section-heading migration and its representative route checks pass.

The UI floor is intentionally incremental. New modules are added explicitly, and a threshold may only move upward unless a PR documents a temporary exception and follow-up issue.

## ESLint warning policy

The repository-wide warning budget is zero. `npm run lint` checks every JavaScript source and fails on the first non-zero warning total, which also prevents correctness-adjacent `react-hooks/exhaustive-deps` and `no-unused-vars` warnings from increasing. `npm run lint:changed` independently compares the current branch with `origin/develop` and applies the same zero-warning rule to added or modified JavaScript files.

CI runs both gates through `npm run verify` on Node.js 22 and Node.js 24.
