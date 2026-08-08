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

CI keeps both supported Node.js LTS lines visible as required checks. Node.js 24 runs the complete `npm run verify` quality baseline plus dependency, audit, Cloudflare integration, Playwright, and artifact steps. Node.js 22 is the minimum-runtime compatibility gate and runs type checking, unit tests, and a production build. The checks are implemented as independent jobs rather than a matrix so skipped steps do not obscure status, while the existing `Verify (22)` and `Verify (24)` check names remain stable for branch-protection compatibility. Dependency and audit gates run before the more expensive integration and browser work. Superseded runs for the same ref are cancelled through workflow concurrency, and the Node 22/24 jobs have 15/30-minute timeouts respectively. The workflow uses `actions/checkout@v7`, `actions/setup-node@v6`, and `actions/upload-artifact@v7`. This preserves compatibility coverage while avoiding duplicate execution of the most expensive gates.
