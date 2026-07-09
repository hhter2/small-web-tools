# Phase 1 draft notes — shared UI primitives + Tailwind setup

## What's in this folder
- `tailwind.config.js` — theme mapped to existing CSS variables
- `ui/Card.jsx`, `ui/Button.jsx`, `ui/FieldInput.jsx`, `ui/ToolHeader.jsx` — draft primitives
- This file — parity notes, things found while inspecting the code, and doc edits

## Things found while building this (not asked for, but relevant)

**Decisions below are final — confirmed by the project owner. Agent should implement
these deletions directly, no further confirmation needed.**

1. **`.btn-secondary` is defined twice** in `styles.css` (line 1116 and line 1508) with
   different padding/radius/font-size. Same selector + specificity, so the later one
   (1508) wins the cascade — that's what's actually rendering today.
   **DECISION: delete the dead block at line ~1116-1127 entirely. Keep only the block
   at line ~1508-1527 (the one currently rendering).** Button.jsx already matches the
   surviving version — no change needed there.

2. **`.btn-primary`'s shadow color is a leftover indigo** (`rgba(99, 102, 241, 0.2)` =
   Tailwind's indigo-500) from before `--accent` was changed to emerald. Button.jsx fixes
   this to follow `--accent` instead — this is a visible (tiny) color change, flagging it
   rather than silently carrying the bug forward.

3. **Tool titles exist in three places; one of them (a description) is never shown at
   all.** Correction on line count from the earlier pass: `App.jsx`'s `toolDetails`
   object is lines 36–149 (~113 lines, not ~1300 as first estimated) with a `title` +
   `desc` per tool. Its `desc` field is 100% dead — grepped the whole file, never
   rendered anywhere. Its `title` is used in exactly one place: `activeDetails.title`
   at line 1234, for the mobile top bar. Separately:
   - Every tool component hardcodes its own `<h2>Title</h2>` again (e.g.
     `PasswordGenerator.jsx` line 320).
   - `navItems` (line 216 onward, used for sidebar nav) *also* already has a `name`
     field per tool (e.g. `name: 'Slashes Converter'`) — a third copy of the same string.

   **DECISION: delete `toolDetails` entirely (lines 36–149) and the dead `desc` data
   with it.** Since `navItems` already has `id` + `name` for every tool, replace the
   single remaining usage — `activeDetails.title` at line 1234 — with a lookup against
   `navItems` instead (e.g. `navItems.find(t => t.id === activeTool)?.name`). This is a
   clean, self-contained deletion: **it only touches `App.jsx`**, does not require
   touching any of the 31 tool component files, and removes the dead `desc` + one full
   redundant copy of every title with zero loss of behavior.
   `ToolHeader.jsx`'s `description` prop stays as an optional prop for future use, but
   nothing currently feeds it — that's fine, it's opt-in per tool going forward, not a
   data source that needs to exist today.

4. `.btn-danger-custom` / `.btn-danger-confirm` were not compared against `variants.danger`
   in Button.jsx — that's a placeholder pending an actual parity pass.

## Exact App.jsx edit (for the `toolDetails` deletion)

Before:
```jsx
const toolDetails = {
  "tool-home": {
    title: "Dashboard",
    desc: "A premium dashboard of handy utility tools."
  },
  ... // ~113 lines total, one entry per tool
};
```
and, further down:
```jsx
const activeDetails = toolDetails[activeTool] || toolDetails['tool-home'];
```
and, in the mobile top bar JSX:
```jsx
<span className="top-bar-title">{activeDetails.title}</span>
```

After:
```jsx
// toolDetails object deleted entirely (was lines 36–149)
```
```jsx
const activeNavItem = navItems.find((item) => item.id === activeTool);
```
```jsx
<span className="top-bar-title">{activeNavItem?.name ?? 'Dashboard'}</span>
```
(`'Dashboard'` fallback matches the old `toolDetails['tool-home'].title` value, for
the home screen where `activeTool` may not match any `navItems` entry.)

## Parity map

| New primitive | Replaces (styles.css) | Notes |
|---|---|---|
| `Card variant="tool"` | `.tool-card` (599), `--compact` (619), `--wide` (624) | keeps fadeInScale mount animation as opt-out `animateIn` prop |
| `Card variant="home"` | `.home-card` (3254) | keeps hover lift + shadow |
| `Button variant="primary"` | `.btn-primary` (755) | fixes indigo shadow → accent-based shadow (see note 2) |
| `Button variant="secondary"` | `.btn-secondary` (1508, the winning duplicate) | see note 1 |
| `FieldInput` | generic `input[type=...], textarea` block (672–752) | adds label/hint/error, which don't exist as a shared pattern today |
| `ToolHeader` | `.tool-card h2` (640) | optionally also surfaces `desc` (see note 3) |

## Proposed CLAUDE.md edits

**Section 3, step 4** — before:
```
4. Add all component styles to `src/styles.css` (do not create separate CSS files)
```
after:
```
4. Style the tool using Tailwind utility classes and the shared primitives in
   `src/components/ui/` (`Card`, `Button`, `FieldInput`, `ToolHeader`) wherever they
   fit. Only add new rules to `src/styles.css` for things a shared primitive doesn't
   cover (e.g. a one-off keyframe animation specific to this tool).
```

**Section 4, Architecture Constraints table, Styling row** — before:
```
| Styling | All styles go in `src/styles.css`. **Do not create component-level CSS files or use CSS-in-JS.** |
```
after:
```
| Styling | New and migrated components use Tailwind utility classes plus the shared primitives in `src/components/ui/`. `src/styles.css` is legacy — it stays in place for components not yet migrated, but do not add new rules to it if an equivalent Tailwind-based primitive already exists. **Do not introduce CSS-in-JS.** See `AGENTS.md` for the full migration status. |
```

**Section 5, Code Style, CSS class names bullet** — before:
```
- **CSS class names**: Use descriptive, tool-specific class names to avoid collisions (e.g., `.mytool-container`, `.mytool-input`).
```
after:
```
- **Styling**: Default to Tailwind utility classes and the shared primitives in `src/components/ui/`. Fall back to a global class in `src/styles.css` only for things not covered by a primitive (rare — e.g. a tool-specific keyframe animation). If you do add a global class, use a descriptive, tool-specific name to avoid collisions (e.g., `.mytool-container`).
```

## New `AGENTS.md` (draft)

```markdown
# AGENTS.md — Styling migration status

This file tracks the Tailwind CSS migration referenced in `CLAUDE.md` section 4.
Keep this file and `CLAUDE.md` in sync — if you update one, check the other.

## Current state (Phase 1)

- Tailwind is configured (`tailwind.config.js`), theme values map to the existing
  CSS custom properties in `src/styles.css` (`:root` / `html[data-theme="dark"]`).
  Colors, radii, and shadows are NOT duplicated — Tailwind reads the same variables.
- Shared primitives live in `src/components/ui/`: `Card`, `Button`, `FieldInput`,
  `ToolHeader`. Use these for any new tool or when touching an existing one.
- `src/styles.css` is legacy. It still styles all 31 tool components today — none
  have been migrated yet. Do not delete rules from it until the component using
  them has been migrated and visually verified.

## Migration status by tool

(Fill in as tools are migrated — mark each as `pending` / `in progress` / `done`.)

| Tool | Status |
|---|---|
| PasswordGenerator | pending |
| ColorConverter | pending |
| ... | pending |

## Rules for new work

- New tools: build with Tailwind + `src/components/ui/` primitives from the start.
  Do not add new rules to `styles.css`.
- Touching an existing tool for an unrelated bug fix: no obligation to migrate it,
  but if you do touch its styling anyway, prefer migrating that one component fully
  over patching the legacy CSS further.
- If a shared primitive doesn't cover something you need, extend the primitive
  (add a variant/prop) rather than writing one-off Tailwind classes in the tool
  component, so the pattern stays reusable.
```

## Resolved decisions (no longer open)

1. ~~Confirm the `.btn-secondary` duplicate resolution~~ → **Delete the dead block**
   (styles.css line ~1116-1127). Keep only the surviving one (~1508-1527).
2. ~~Decide whether to consolidate `toolDetails` duplication~~ → **Delete `toolDetails`
   entirely** (App.jsx lines 36–149), point the mobile top bar's title lookup at
   `navItems` instead. Scope stays limited to `App.jsx` — the 31 tool components'
   own `<h2>` titles are untouched for phase 1.

## Still open

1. `Button variant="danger"` in the draft is a placeholder — needs a real parity pass
   against `.btn-danger-custom` / `.btn-danger-confirm` before use.
