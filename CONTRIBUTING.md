# Small Web Tools — Contribution & AI Agent Guidelines

This document serves as the single source of truth for repository guidelines, component practices, documentation updates, and AI agent workflows.

---

## 1. Documentation Update Rules

| Document | Modification Policy |
|---|---|
| `CONTRIBUTING.md` | Single source of truth for engineering guidelines and agent workflow rules. |
| `CODEBASE.md` | Update whenever a component/file is added, renamed, or deleted, or when dependencies change. |
| `PRIVACY.md` | Update whenever data flows or third-party service connections change. |
| `AGENTS.md` | Core agent rules; defers engineering standards to this file (`CONTRIBUTING.md`). |
| `README.md` | **Maintained solely by the repository owner.** Do not modify `README.md` unless explicitly requested by the user. |

---

## 2. Engineering & Component Standards

- **Architecture**: Functional React components with hooks (`.jsx`). Hash-based routing (`#tool-id`).
- **Styling**: Use Tailwind CSS utility classes and shared primitives in `src/components/ui/` (`Card`, `Button`, `FieldInput`, `ToolHeader`, `ToggleSwitch`, `Spinner`, `ResultDisplay`).
- **Data Privacy**: All client-side tools process data entirely inside the browser. No third-party network requests unless explicitly required.
- **Component File Structure**: One tool per file under `src/components/<ToolName>.jsx`. Sub-components for shared primitives belong in `src/components/ui/`.

---

## 3. AI Coding Protocol

1. **Orientation**: Read `CODEBASE.md` to map dependencies and relevant files before changing code.
2. **Strict Scope**: Modify only files directly relevant to the target task.
3. **Dependencies**: Never introduce new npm packages without explicit user approval.
4. **Verification**: Always run `npm run build` or tests to verify changes before marking a task complete.
5. **Evidence Record**: Record actual commit SHAs and concrete verification evidence in task review logs.
