# Custom-domain production checklist

Use this checklist only for an explicitly approved production change. Set `PRODUCTION_HOST` to the real custom-domain hostname; never substitute an assumed domain.

## Before deployment

- Record the owner, candidate commit/tag, Cloudflare project, rollback deployment, maintenance window, and `PRODUCTION_HOST`.
- Confirm DNS ownership and routing, plus an active certificate covering exactly the tested hostname.
- Confirm canonical `https://$PRODUCTION_HOST` redirects and document whether pages.dev/previews redirect, are restricted, or remain intentionally exposed.
- Inventory every affected hostname before considering HSTS `includeSubDomains` or preload; neither is approved here.
- Run `npm ci`, `npm run verify`, `npm run platform:integration`, and `npm run test:e2e`.
- Review every retained entry in `config/csp-exceptions.json` against its tested feature and removal condition.

## Deploy and verify

1. Deploy without promoting HSTS beyond the checked-in one-day stage.
2. Record hostname, certificate issuer/expiry/state, deployment ID, UTC time, and complete header snapshots for `/` and `/api/iplookup?ip=not-an-ip`.
3. Run `PRODUCTION_HOST=example.invalid npm run test:e2e:deployed`, replacing the example with the recorded hostname.
4. Smoke-test FFmpeg, Mermaid, highlighting, image/export downloads, consented OpenStreetMap, speed test, exchange rates, IP lookup, and Font Extractor availability/fail-closed behavior. Record browser versions and results.
5. Check browser/edge logs for CSP violations, redirect loops, certificate errors, Function failures, and unexpected cache results. Do not promote while any result is unexplained.

## Cache, rollback, and HSTS

- Keep content-hashed static assets cached; confirm HTML and Functions follow declared cache policy. Purge only the affected deployment/origin when rollback requires it.
- Roll back by promoting the recorded prior deployment, then repeat redirect, certificate, header, Function, and representative feature checks. Revert custom-domain routing first if certificate or redirect state blocks the site.
- HSTS stages are one day, then a separately approved/observed 30 days, then a separately approved/observed one year.
- `includeSubDomains` and preload require a complete hostname inventory, HTTPS-only proof for every hostname, independent rollback review, and separate approval.

Keep the completed checklist with the deployment record. Never commit credentials, tokens, private certificates, or internal incident data.
