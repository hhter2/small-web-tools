# CLAUDE.md — Agent Instructions for small-web-tools

> This file governs how AI agents should behave in this repository.
> Read this file first, then `CODEBASE.md` for architecture details.
> Do not modify this file unless explicitly asked.

---

## 1. Orientation (Read Before Any Task)

1. Read `CODEBASE.md` for the full project map — do **not** scan the entire codebase from scratch.
2. Identify which files are relevant to the current task using the Tool Inventory and Directory Structure in `CODEBASE.md`.
3. Read only those files. Do not open files outside the stated scope unless a dependency forces it.
4. State which files you plan to read and modify **before** making any changes.

---

## 2. Scope Rules

- **Only touch files that are directly relevant to the task.** If a task says "add a new tool", do not refactor unrelated components.
- **Never refactor, rename, or reorganize code that is not part of the current task.**
- **Never install new npm packages** without explicit user approval. Propose the package name and reason first.
- **Never modify `package-lock.json` directly.** It is auto-generated.
- **Never edit `dist/`.** It is a build artifact.
- If you are unsure whether a file is in scope, ask before reading it.

---

## 3. Adding a New Tool (Mandatory Checklist)

Follow this sequence exactly — do not skip or reorder steps:

1. Create `src/components/<ToolName>.jsx`
2. In `src/App.jsx`:
   - Add `import` at the top
   - Add entry to the `navItems` array: `id`, `name`, `tooltip`, `category`, `icon`, `desc` (optional), `subGroup` (optional)
   - Add a case inside `renderActiveTool` function to return the component
3. Style the tool using Tailwind utility classes and the shared primitives in `src/components/ui/` (`Card`, `Button`, `FieldInput`, `ToolHeader`, `ToggleSwitch`, `Spinner`, `ResultDisplay`). Do not add new rules to `src/styles.css`.
4. If the tool requires a serverless API:
   - Create `functions/api/<name>.js`
   - Mirror the handler in `vite.config.js` under the dev-server proxy section
5. Update `CODEBASE.md`: add a row to the Tool Inventory table and update the directory tree

---

## 4. Architecture Constraints

| Constraint | Rule |
|---|---|
| Routing | Hash-based (`#tool-id`) via `useState` in `App.jsx`. **Do not introduce React Router or any router library.** |
| Styling | Use Tailwind utility classes and the shared primitives in `src/components/ui/`. Do not add new rules to `src/styles.css` (it now contains only @keyframes, scrollbar styles, and global resets). **Do not introduce CSS-in-JS.** |
| State management | Local `useState`/`useReducer` only. **Do not introduce Redux, Zustand, or any global state library.** |
| API calls | Only via `functions/api/` (Cloudflare Pages Functions). **Do not call third-party APIs directly from the browser** unless the tool is fully client-side. |
| Data privacy | All client-side tools must process data entirely in the browser. **No user data should be sent to any server** unless the tool explicitly requires it (e.g., IP lookup, font extractor). |
| Build tool | Vite 5. Do not change `vite.config.js` structure without understanding all four responsibilities documented in `CODEBASE.md`. |

---

## 5. Code Style

- **Language**: JSX (`.jsx`) for all React components. No TypeScript.
- **Components**: Functional components with hooks only. No class components.
- **Naming**: PascalCase for component files and function names (e.g., `MyTool.jsx`). camelCase for variables and props.
- **Tool IDs**: kebab-case prefixed with `tool-` (e.g., `tool-mytool`). Must be unique across the entire `tools` array in `App.jsx`.
- **Styling**: Use Tailwind utility classes and shared primitives in `src/components/ui/`. If a shared primitive doesn't cover something, extend the primitive rather than writing one-off classes.
- **No inline styles** unless absolutely necessary for dynamic values.
- Keep components self-contained — one component per file, one file per tool.
- **Icons**: Use the icon or the svg content instead of using emoji. Also, background at the small icon is no needed.

---

## 6. Serverless Functions (`functions/api/`)

- Each function must handle CORS headers explicitly (`Access-Control-Allow-Origin`).
- Always implement a dev-server proxy mirror in `vite.config.js` so the function works locally without deploying.
- Follow the existing pattern in `iplookup.js`: validate inputs, handle errors gracefully, return unified JSON.
- Functions run on Cloudflare Workers runtime — **do not use Node.js-only APIs** (e.g., `fs`, `path`, `child_process`).

---

## 7. Directories and Files to Ignore

Unless the task explicitly involves these, **do not read or modify**:

- `dist/` — build output, auto-generated
- `package-lock.json` — auto-generated lockfile
- `.gitignore` — not relevant to feature work
- `public/` — static assets, rarely touched
- `README.md` — maintained manually by the user; **do not update it as part of any task** unless explicitly instructed
- `TODO.md` — maintained manually by the user. **Never modify this file by yourself**. All operations on it are done by the human. There may be issues or features written in it with a `#` prefix (e.g., `#fix`). Do **not** read this file unless explicitly instructed (e.g. when the user says "detail for #fix" or similar). Otherwise, there is no need to read it.

---

## 8. Before Responding

Before producing any code, confirm:

- [ ] Which files will you read? (list them)
- [ ] Which files will you modify or create? (list them)
- [ ] Does this task require a new npm package? If yes, name it and ask for approval first.
- [ ] Does this task require a new serverless function? If yes, is a dev-proxy mirror also needed?
- [ ] Does this task change the Tool Inventory in `CODEBASE.md`? If yes, update it as part of the task.

---

## 9. Updating `CODEBASE.md`

`CODEBASE.md` is the single source of truth for the project structure. Update it whenever:

- A new file or directory is created
- A file is deleted or renamed
- A new tool is added (Tool Inventory table + directory tree)
- A new dependency is introduced (Dependencies table)
- A serverless function is added or removed

**Do not wait to be asked — updating `CODEBASE.md` is part of every task that changes the file structure.**
