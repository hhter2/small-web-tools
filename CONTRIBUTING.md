# Contributing to Small Web Tools

`CONTRIBUTING.md` is the canonical engineering guide. Use `CODEBASE.md` for the
current architecture, route inventory, API topology, and project map.

## Supported environment

- Node.js 22 and Node.js 24 are supported; `.nvmrc` selects Node 22.
- Install exactly from the lockfile with `npm ci`.
- The frontend is React 18 and Vite 6.
- Production APIs use Cloudflare Pages Functions plus the dedicated rate-limiter
  Worker in `workers/rate-limiter/`.

## Local development

Start the browser application:

```bash
npm run dev
```

The Vite middleware mirrors only `/api/iplookup`. For `/api/exchange-rates` and
`/api/extract-fonts`, run the Cloudflare Pages local runtime against the Vite build
or dev server. Start the rate-limiter Worker separately with its
`workers/rate-limiter/wrangler.jsonc` configuration, and bind the Pages project to
that service as declared in the root `wrangler.jsonc`.

Useful validation commands:

```bash
npm run build
npm run verify
npm run test:e2e
npm run deps:check
npm run audit
```

`npm run verify` runs version, lint-warning budget, normal and strict checkJs,
coverage, build/bundle, headers, network inventory, Cloudflare configuration, and
documentation-consistency gates. CI runs it on Node 22 and Node 24.

## Engineering standards

- Use functional React components and hooks. Route metadata belongs in the shared
  tool registry; preserve public hashes and aliases.
- Use Tailwind utilities, the design tokens in `src/styles.css`, and primitives in
  `src/components/ui/`. Keep controls keyboard accessible and visibly focused.
- Client-side tools must keep user content in the browser. Add server or third-party
  data flows only when required, bounded, consented where appropriate, and declared
  in `config/network-services.json` and `PRIVACY.md`.
- Pages Functions must use Web Platform/Cloudflare APIs rather than Node-only APIs.
  Put reusable request validation and safe-fetch logic in `functions/_shared/`.
- Add focused unit tests for pure/domain logic and Playwright coverage for critical
  journeys. Avoid relying only on route smoke tests.

## Documentation and commits

- Update `CODEBASE.md` for structural, route, API, dependency, or runtime changes.
- Update `README.md` and `PRIVACY.md` when user-visible behavior or data flow changes.
- Do not edit owner-maintained `TODO.md` unless explicitly requested.
- Commit coherent phases separately. Do not include generated output, secrets, or
  unrelated working-tree changes.
