# CSS refactor roadmap — Small Web Tools

Full plan across all phases. Phase 1 (Tailwind setup + shared primitives) is already
scoped separately — see AGENT-PROMPT.md / phase1-draft/. This file covers what comes
after: how the remaining 31 components get migrated, and how the legacy CSS gets
retired.

## Rules that apply to every phase

- No visual redesign in this refactor. Same look, different implementation. A
  redesign is a separate, later decision.
- One batch = one reviewable unit. Don't migrate more than a batch at a time.
- Every batch: verify light + dark mode for each migrated tool before moving on.
- Update the migration table in AGENTS.md after every batch (pending → in progress → done).
- If a shared primitive doesn't fit a case, extend the primitive — don't write
  one-off Tailwind classes in a tool component.
- Never delete a rule from styles.css until every component using it is migrated
  and verified.

---

## Phase 2 — Pilot (validate the approach)

Migrate 2-3 of the simplest tools first, to test the primitives before committing to
all 31. Candidates (lowest className count, least visual complexity):
`SlashesConverter`, `DateCounter`, `AsciiConverter`.

**Definition of done:** these 3 tools render identically to before, use Card/Button/
FieldInput/ToolHeader wherever they fit, and any gap found in the primitives (missing
variant, wrong spacing) is fixed in `src/components/ui/` — not worked around locally.

Stop and report back after this phase. Confirm the primitives hold up before batching
the rest.

---

## Phase 3 — Batch migration (remaining 28 tools)

Ordered by current className count (low → high = low risk → high risk). Batch size
~6-8 tools. Skip `BioinfoIcon.jsx` / `DnaRnaIcon.jsx` — pure icon components, nothing
to migrate.

| Batch | Tools |
|---|---|
| A | UnicodeConverter, WordCounter, BaseConverter, MediaSeparatorFormatSelect, MediaSeparatorWaveform |
| B | MediaSeparator, IpLookup, MediaSeparatorQueueItem, HomeGrid, DnaConverter, NetworkSpeedTest |
| C | CurrencyCounter, RandomWheel, WebsiteFontExtractor, CasingSwitcher, ColorConverter |
| D | AudioMeta, FolderAnalyzer, OfficeMeta, PasswordGenerator |
| E | TypingSpeedTest, QrBarcodeGenerator, ImgMeta, VideoMeta |
| F | QrBarcodeScanner, CodonTable |

**Per batch:** migrate → self-check light/dark parity → update AGENTS.md table →
report back before starting the next batch. Don't proceed through all 6 batches
unattended.

**Per tool:** replace its `.tool-card`/`.home-card`-based markup with `Card`, its
buttons with `Button`, its inputs with `FieldInput`, its `<h2>` block with
`ToolHeader`. Remove that tool's now-unused classes from styles.css in the same
change (not a separate cleanup pass) — orphaned CSS is exactly the problem this
refactor is meant to fix.

---

## Phase 4 — Legacy cleanup

Once all 31 tools are migrated:
1. Delete everything left in `styles.css` with zero remaining references (grep each
   class name across `src/` before deleting — don't assume).
2. Resolve leftover font declarations: `Plus Jakarta Sans` and `TASA Orbiter` are
   both still loaded but may no longer be needed depending on what Phase 3 kept —
   check actual usage, drop unused `@import`/`<link>` entries.
3. `styles.css` should now only contain things with no Tailwind equivalent (e.g.
   `@keyframes`, scrollbar styling, any truly global reset). If it's near-empty,
   consider whether it's still needed as a separate file at all.

**Definition of done:** `styles.css` line count drops to roughly what's structurally
necessary, no dead classes remain, no dead font imports remain.

---

## Phase 5 — Finalize conventions

1. Update CLAUDE.md: remove "legacy" language around styles.css / Tailwind
   coexistence (added in Phase 1) — Tailwind + shared primitives is now simply *the*
   convention, not a migration-in-progress.
2. Update AGENTS.md: mark migration table as complete; keep the file as the ongoing
   reference for the primitive-first rule on all future tools.
3. Re-run the whole app once end-to-end (light + dark, every tool) as a final
   regression pass before calling this done.

---

## Reporting expectations

At the end of Phase 2 and after each batch in Phase 3, report: what was migrated,
what (if anything) changed in the shared primitives, and any visual discrepancy found
and how it was resolved. Don't silently proceed past a batch with an unresolved
visual difference.
