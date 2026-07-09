# Task: Tailwind CSS setup + shared UI primitives (Phase 1 of a staged migration)

## Context
React + Vite project "Small Web Tools", v0.5.1-beta. All styling currently lives in
one 13,800+ line src/styles.css (global classes + CSS variables for light/dark theming
in :root / html[data-theme="dark"]). 31 tool components under src/components/, each
hand-styled from that file. The file has grown too large to edit cheaply or safely.

Attached: a draft folder (tailwind.config.js, src/components/ui/{Card,Button,
FieldInput,ToolHeader}.jsx, DRAFT-NOTES.md) already mapped against the real codebase.
Use it as your starting point — it's a draft, not final; review and adjust as needed.

## Scope for this phase
1. Install and configure Tailwind CSS.
2. Add 4 shared primitives: Card, Button, FieldInput, ToolHeader (see draft).
3. Map Tailwind theme to the EXISTING CSS variables — no new colors, no visual
   redesign. Output must look the same as today except where a decision below says
   otherwise.
4. Do NOT touch the 31 tool components' internals yet. Old CSS and new primitives
   coexist during migration.
5. Update CLAUDE.md and create AGENTS.md per DRAFT-NOTES.md (exact before/after text
   included there).

## Already-decided cleanups (do these, no need to ask)
- `.btn-secondary` is defined twice in styles.css (~line 1116 and ~1508, same
  specificity — the later one wins and is what renders today). Delete the dead
  block at ~1116-1127. Keep only ~1508-1527.
- `.btn-primary`'s box-shadow uses a hardcoded leftover indigo
  (rgba(99,102,241,...)) from before --accent became emerald. Fix it to derive from
  --accent (already done in the draft Button.jsx).
- Delete the `toolDetails` object in App.jsx (~lines 36-149) — its `desc` field is
  never rendered anywhere, and its `title` just duplicates `navItems.name`. Point the
  mobile top bar's title lookup at `navItems` instead. Exact before/after snippet is
  in DRAFT-NOTES.md. This only touches App.jsx — do not change the 31 tool components.

## Workflow
Do NOT write code yet. First reply with a plan: package list, final tailwind.config.js,
confirmed prop API for each primitive, exact CLAUDE.md/AGENTS.md diffs, and any open
questions (see "Still open" in DRAFT-NOTES.md — currently just the Button danger
variant parity check). Wait for my approval before touching any files.

## Constraints
- No CSS-in-JS. Use Tailwind + clsx/tailwind-merge if needed for conditional classes.
- No business logic changes.
- Verify Tailwind's content paths cover all .jsx files so nothing gets purged in prod.

Note: ROADMAP.md describes the full multi-phase plan for context only.
Execute Phase 1 in this task. Do not start Phase 2 or later without a
separate, explicit go-ahead from me.
