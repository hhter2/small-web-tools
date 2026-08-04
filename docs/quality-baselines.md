# Quality baselines

## Coverage scope

`npm run test:coverage` enforces two tiers in `vitest.config.js`.

- Domain code under `src/lib/`, `functions/_shared/`, and `functions/api/` retains the established 80% line/function/statement and 70% branch thresholds.
- The initial UI/application scope explicitly includes `src/toolRegistry.js`, `src/toolModes.js`, `src/components/LanguageSwitcher.jsx`, and the shared `Button`, `Card`, `FieldInput`, `FullscreenPreview`, and `ToolHeader` primitives. Its initial non-regression floor is 20% for lines/functions/statements and 15% for branches.

The UI floor is intentionally incremental. New modules are added explicitly, and a threshold may only move upward unless a PR documents a temporary exception and follow-up issue.

## ESLint warning policy

The repository-wide inherited warning budget is 67, reduced from 68 in issue #50. `npm run lint:changed` compares the current branch with `origin/develop` and runs ESLint with zero warnings allowed for added or modified JavaScript files. This prevents new work from consuming the inherited budget while existing warnings are retired incrementally.

CI runs both gates through `npm run verify` on Node.js 22 and Node.js 24.
