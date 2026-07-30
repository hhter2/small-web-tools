# Contributing to Small Web Tools

`CONTRIBUTING.md` is the canonical engineering guide. Use `CODEBASE.md` for the
current architecture, route inventory, API topology, and project map.

## Supported environment

- Node.js 22 and Node.js 24 are supported; `.nvmrc` selects Node 22.
- Use npm 10.9.2, pinned by the `packageManager` field. CI rejects a different
  npm version, so install it before restoring dependencies:

  ```bash
  npm install --global npm@10.9.2
  npm ci
  ```

- The frontend is React 18 and Vite 6.
- Production APIs use Cloudflare Pages Functions plus the dedicated rate-limiter Worker
  in `workers/rate-limiter/`.

## Local development

Start the browser application:

```bash
npm run dev
```

The Vite middleware mirrors only `/api/iplookup`. To run every Pages Function with
the real local service-binding topology, first copy `.dev.vars.example` to
`.dev.vars` and replace the example `RATE_LIMIT_HMAC_SECRET` with at least 32 random
characters. Build the frontend, then use two terminals:

```bash
npm run build
npx wrangler dev --config workers/rate-limiter/wrangler.jsonc
```

```bash
npx wrangler pages dev
```

Wrangler discovers the Worker named `small-web-tools-rate-limiter` and connects the
`RATE_LIMITER_SERVICE` binding declared in `wrangler.jsonc`. The Pages runtime is
then available at `http://localhost:8788`. The deterministic automated check starts
both sides in isolated local state, sends concurrent requests through
Pages → Service Binding → Worker, and separately proves the production-style
missing-binding path fails closed:

```bash
npm run platform:integration
```

Useful validation commands:

```bash
npm run build
npm run verify
npm run platform:integration
npm run test:e2e
npm run deps:check
npm run audit
```

The opt-in `npm run test:ssrf-runtime` command creates an unclaimed, temporary
Cloudflare preview account and therefore performs an external deployment. Run it
only when Cloudflare-runtime CR-009 evidence is required and the operator accepts
Cloudflare's current Terms and Privacy Policy. The command redacts bearer and claim
credentials; never paste the global Wrangler configuration or claim URL into logs.

`npm run verify` runs version, lint-warning budget, normal and strict checkJs,
coverage, build/bundle, headers, network inventory, Cloudflare configuration, and
documentation-consistency gates. CI runs it on Node 22 and Node 24.

## Engineering standards

- Use functional React components and hooks. Route metadata belongs in the shared
  tool registry; preserve canonical public paths and backward-compatible aliases.
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
