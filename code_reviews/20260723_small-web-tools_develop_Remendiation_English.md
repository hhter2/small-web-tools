# Small Web Tools — Phase 2 Remediation Specification

**Project:** `small-web-tools`  
**Branch:** `develop`  
**Specification date:** 2026-07-23 (Asia/Taipei)  
**Based on:** `20260723_small-web-tools_develop_CodeReview_English.md`  
**Reviewed project version:** `0.6.0-beta`  
**Purpose:** Verifiable implementation specification for an AI coding agent

> This document is now the implementation and evidence record for all repository
> phases. Local implementation is complete. Cloudflare-runtime SSRF evidence (CR-009),
> the real service-binding concurrency test, and post-deployment HSTS confirmation
> remain explicitly open because they require deployed infrastructure.

## Phase 1 Implementation Record

Phase 1 (C01–C05) was implemented and locally verified on 2026-07-23.

| Scope | Status | Commit | Verified outcome |
| --- | --- | --- | --- |
| C01 | Completed | `b302640` | 19 versioned WOFF2 subsets, four OFL records, no automatic Google Fonts load, tightened CSP |
| C02 | Completed | `ed3f18f` | Font Extractor is metadata/recommendation-only; preview, direct download, proxy, token, validation, secret, and obsolete tests removed |
| C03 | Completed | `5b72a38` | Same-site JSON policy, 4 KiB request cap, rate-limit-before-parse, aggregate extraction budgets, truncation metadata, unit and browser coverage |
| C04 | Completed | `6a5584b` | Machine-readable network inventory, `#privacy` route, synchronized consent registry, FFmpeg disclosure and pinned size/SHA-256 validation |
| C05 | Completed | `bd5d0b5` | Shared IP/Image OSM component, consent before iframe creation, immediate revoke/reset removal, coordinates-only fallback |
| Phase 1 cleanup | Completed | `c9480bb` | Removed the obsolete `@ffmpeg/util` downloader dependency |

Verification evidence:

- `npm run verify`: passed (123 tests across 17 files, production build, bundle/header/external-host checks).
- Focused Playwright: 4 passed (`font-extractor`, `privacy-network`, and `gps-consent`).
- Lint completed with the existing 71-warning baseline and no errors; warning ratcheting remains C14 Phase 4 scope.
- No deployment or Cloudflare-runtime evidence is claimed for this historical phase.

## Phases 2–5 Implementation Record

Repository implementation for C06–C16 was completed and verified on 2026-07-26.

| Scope | Status | Commit(s) | Verified outcome |
| --- | --- | --- | --- |
| C06 | Completed locally | `61ba5d4` | Valid positive rates only, stale labeling, bounded provider contract, failure/manual browser coverage |
| C07 | Completed locally | `2290989` | Cumulative file/queue policies, dynamic FFmpeg budgets, object-URL ownership and cleanup coverage |
| C08 | Completed locally | `e39456c` | 1–1000 MB validation, exact high-traffic confirmation, deadlines/cancel, unavailable states, bounded history |
| C09 | Implementation complete; deployed concurrency evidence pending | `86dd63c` | Dedicated service-bound limiter Worker, HMAC keys, fail-closed production path, config/unit checks |
| C10 | Local hardening complete; CR-009 runtime closure pending | `a7f6c95` | One absolute redirect/DNS/body deadline, streaming limits, caller abort, isolated Wrangler harness |
| C11 | Completed locally | `cb810ab` | Stable public codes, correlation IDs, safe API/media errors, no production stacks |
| C12 | Completed under D-04 | `be0b4cf` | Dialog focus lifecycle, live announcements, native controls; language selector unchanged |
| C13 | Completed locally | `74d460c` | Risk journeys, undeclared-host/Google Fonts assertions, Axe scans, coverage thresholds, CI artifacts |
| C14 | Completed locally | `21105a5` | Undefined/empty-catch errors, 68-warning ratchet, strict checkJs, canonical docs and consistency gate |
| C15 | Completed locally | `e25902c`, `cec4efd`, `a17cddc`, `24ed575`, `7094629`, `695ded1` | Single registry plus independently tested metadata, QR/barcode, typing, and codon domains |
| C16 | Repository stage complete; deployment confirmation pending | `24f72cd` | One-day HSTS policy, no subdomain/preload commitment, static checker and opt-in deployed test |
| Final toolchain gate | Completed | `68b3f56` | npm 10 clean install, pinned Wrangler 4.114.0, Vitest 4, fixed transitive overrides, zero audit findings |

Final local evidence:

- `corepack npm@10.9.2 ci`: passed; 516 packages installed from the lockfile.
- `npm run verify`: passed with 182 tests across 26 files, 85% statements,
  78.06% branches, 88.46% functions, and 88.2% lines; all critical thresholds passed.
- `npm run test:e2e`: 49 passed and 2 deployment-only tests skipped when
  `DEPLOYED_BASE_URL` was unset.
- `npm run deps:check`: passed.
- `npm run audit -- --audit-level=moderate`: passed with zero vulnerabilities.
- Real-host pre-deployment check: `https://small-web-tools.pages.dev` returned 200
  with a valid TLS connection; HTTP returned 301 to the same HTTPS hostname.
  The deployed response did not yet contain HSTS, so C16 operational completion is
  intentionally pending deployment of `24f72cd`.
- The Cloudflare service-binding concurrency test and the CR-009 runtime harness
  were not deployed or executed; no runtime closure is claimed.

## Approved Decision Register

- **D-01A:** Self-host only the UI fonts currently used by Small Web Tools in the repository. Remove initial Google Fonts requests.
- **D-01B:** Keep the Font Extractor's local similarity mapping and user-initiated links to Google Fonts. Do not preload or query Google Fonts.
- **D-01C:** Keep the pinned FFmpeg core on unpkg. Load it only when processing starts, disclose the request clearly, and update privacy documentation. Do not add a blocking FFmpeg consent gate.
- **D-01D:** Reduce Font Extractor to scan and recommend. Remove real-font preview, direct/original-font download, font proxy, signing tokens, and related secrets.
- **D-02:** Use Cloudflare's Rate Limiting binding in production. Because Pages Functions do not currently document direct Rate Limiting bindings, implement it in a dedicated Worker reached through a Pages Service Binding; fail closed when unavailable.
- **D-03:** Publish a first-class in-app privacy route and link it from the footer and consent manager.
- **D-04:** Do not change the language selector. CR-021 and the language-selector portion of CR-016 remain accepted residual items.

## Product Interpretation

The target is a **local-first web service**, not an offline-only application:

- Static application code and self-hosted UI fonts are delivered by the website.
- User files and tool inputs remain in the browser by default.
- Features whose purpose inherently requires a server or remote data source are disclosed and bounded.
- Explicit consent remains required for registered data/network services such as live rates, IP lookup, Font Extractor target fetching, speed testing, and OSM embeds.
- The pinned FFmpeg engine remains an on-demand remote runtime asset from unpkg under a point-of-use disclosure. Media content is not uploaded.
- User-initiated Google Fonts links are external navigation, not automatic Google Fonts loading.

## Platform Feasibility Note for D-02

Cloudflare documents Rate Limiting bindings for Workers. The current Pages Functions bindings documentation says Pages supports a subset of bindings and documents Service Bindings, but does not list a direct Rate Limiting binding. Therefore this specification implements D-02 through a dedicated, non-public Worker that owns the Rate Limiting bindings; Pages Functions call it through `RATE_LIMITER_SERVICE`. This avoids an unsupported direct-binding assumption and avoids migrating the full SPA in this phase.

## Target Data Flows

### Font Extractor

```text
Browser
  -> same-origin POST /api/extract-fonts with target URL
  -> Pages Function validates origin, URL, SSRF policy, rate limit, and job budget
  -> target public HTML/CSS only
  <- bounded font declaration metadata + truncation metadata
Browser
  -> local heuristic recommendations
  -> fonts.google.com only after a user clicks an external link
```

There is no font proxy, real-font preview, original font download, signing token, or font-file fetch.

### Media Separator

```text
Browser downloads the application from Small Web Tools
  -> user selects a local media file
  -> when processing starts, browser downloads pinned FFmpeg JS/WASM from unpkg
  -> integrity is checked
  -> FFmpeg runs in browser memory
  -> output remains a local Blob/download
```

No media file or output is sent to unpkg or a Small Web Tools API.

## Delivery Rules

1. Execute commits in the listed order unless a dependency is explicitly noted.
2. Each commit must leave the repository buildable and its scoped tests passing.
3. Do not mix visual redesigns with security, privacy, or structural commits.
4. Do not mark CR-009 complete without Cloudflare-runtime evidence.
5. Do not modify the language selector.
6. Git operations are planned only; this specification does not claim commits were created.


## C01 — P0 — Self-host the application UI fonts

**Phase:** 1  
**Findings:** CR-001, CR-014  
**Planned commit:** `fix(privacy): self-host application fonts`

### Relevant files

- `index.html`
- `src/styles.css`
- `tailwind.config.js`
- `public/fonts/**`
- `public/fonts/LICENSES/**`
- `public/_headers`
- `scripts/check-external-hosts.mjs`

### Modification direction

- Add repository-owned WOFF2 assets for the exact families and ranges currently requested: Inter 300–800, JetBrains Mono 400–700, Plus Jakarta Sans 500–800, and TASA Orbiter regular. Prefer variable WOFF2 files where they reproduce the existing weight ranges.
- Add explicit @font-face declarations with font-display: swap, correct style/weight descriptors, and system fallbacks. Preserve existing Tailwind family names and visual hierarchy.
- Remove the Google Fonts preconnect and stylesheet tags from index.html. Remove fonts.googleapis.com and fonts.gstatic.com from CSP after the network inventory proves they are no longer needed.
- Commit each font's license and a small source/version manifest. Do not add unrelated Google Fonts packages.
- Keep Font Extractor links to fonts.google.com; they are user-initiated top-level navigation and are not application font loading.

### Important considerations

- Do not commit font files without a license record.
- Check canvas/SVG exports that reference Inter, JetBrains Mono, or TASA Orbiter; browser-rendered output must still have a valid fallback when the embedded font is unavailable.

### Verification

- Fresh-profile Playwright load makes zero requests to fonts.googleapis.com or fonts.gstatic.com.
- Visual smoke tests cover dashboard, code/mono fields, headings, Random Wheel canvas, and Folder Analyzer SVG export.
- npm run verify and headers check pass; the built dist contains the expected WOFF2 and license files.

### Completion criteria

- No automatic Google Fonts request remains.
- Typography remains usable and materially consistent.
- All bundled fonts have traceable licenses and versions.

## C02 — P0 — Convert Font Extractor to scan-and-recommend only

**Phase:** 1  
**Findings:** CR-007, CR-013, CR-014  
**Planned commit:** `refactor(font-extractor): remove preview and font download proxy`

### Relevant files

- `src/components/WebsiteFontExtractor.jsx`
- `functions/api/extract-fonts.js`
- `functions/api/font-proxy.js`
- `functions/_shared/fontToken.js`
- `functions/_shared/fontValidation.js`
- `src/lib/thirdPartyServices.js`
- `.dev.vars.example`
- `src/tests/extractFonts.test.js`
- `src/tests/fontProxy.test.js`
- `src/tests/fontToken.test.js`
- `src/tests/fontValidation.test.js`
- `PRIVACY.md`
- `public/_headers`

### Modification direction

- Remove injected @font-face preview styles, preview loading state, preview-text input, download buttons/dropdowns, Blob download code, and the automatic direct-host fallback.
- Render scan results as metadata only: family, weight, style, stretch, format, variable-font indicators, and source host. Do not create a clickable original font URL by default.
- Keep the existing local similarity mapping and Google Fonts specimen/search links. Make clear that recommendations are heuristic and that results are declarations found in public HTML/CSS, not proof of actual rendered use.
- Stop signing results in /api/extract-fonts and stop returning token/proxyUrl. Remove the FONT_PROXY_SIGNING_SECRET requirement.
- Delete /api/font-proxy, signing/validation helpers, now-obsolete tests and configuration, then tighten font-src by removing blob: if no other feature requires it.
- Update the consent registry wording from fetching CSS and font files to fetching the target URL's public HTML and CSS.

### Important considerations

- Make the API and frontend change atomically so no deployed version expects proxyUrl after the API stops returning it.
- If source URLs are retained for diagnostics, display them as escaped text and cap their length; do not auto-navigate.

### Verification

- An extraction result causes no /api/font-proxy request and no request to discovered font hosts.
- The repository contains no FONT_PROXY_SIGNING_SECRET, signFontToken, verifyFontToken, proxyUrl, or Download Directly references.
- Google Fonts recommendation links still open only after user activation and include noopener/noreferrer.
- Existing extraction parsing tests are updated for the smaller response contract.

### Completion criteria

- Font Extractor performs scan, metadata display, and recommendation only.
- Original font preview/download infrastructure is fully removed.
- CR-013 is closed by removal rather than by retaining a risky fallback.

## C03 — P0 — Bound and protect font extraction jobs

**Phase:** 1  
**Findings:** CR-007, CR-010  
**Planned commit:** `fix(font-extractor): enforce origin and aggregate job budgets`

### Relevant files

- `functions/api/extract-fonts.js`
- `functions/_shared/requestPolicy.js`
- `src/tests/extractFonts.test.js`
- `e2e/font-extractor.spec.js`

### Modification direction

- Reject production browser POSTs unless Origin equals the application origin and Sec-Fetch-Site is same-origin or same-site. Reject missing Origin in production because this is not a public API; allow an explicit local-development exception only.
- Validate Content-Type as application/json, cap the request body to 4 KiB, and rate-limit before parsing or upstream work.
- Implement one shared job budget with defaults: 2 MiB HTML, 1 MiB per CSS file, 6 MiB total upstream bytes, 12 stylesheets/imports, depth 3, 100 returned font faces, concurrency 4, and a 10-second overall deadline.
- Deduplicate URLs before scheduling. Stop scheduling as soon as a budget is exhausted; do not merely truncate after fetching.
- Return structured truncation metadata with reasons and consumed limits so the UI can state that results may be incomplete.

### Important considerations

- Budget values must live in one exported object and be overrideable in tests.
- Do not weaken SSRF checks to reach more sites; failed or blocked sites must produce a safe partial/error response.

### Verification

- Synthetic sites exercise each byte/count/depth/deadline limit and prove no additional fetch is scheduled after exhaustion.
- Cross-origin, no-Origin, wrong Content-Type, oversized body, and same-origin cases are covered.
- UI shows a non-alarming incomplete-results notice when truncated.

### Completion criteria

- One extraction cannot exceed any configured aggregate budget.
- Foreign sites cannot turn the endpoint into an unauthenticated workload.
- Partial results are explicit and machine-readable.

## C04 — P0 — Create the network-service inventory and in-app privacy route

**Phase:** 1  
**Findings:** CR-001, CR-002, CR-008, CR-014  
**Planned commit:** `feat(privacy): add in-app policy and complete network disclosure`

### Relevant files

- `config/network-services.json`
- `src/components/PrivacyPolicy.jsx`
- `src/components/MediaSeparator.jsx`
- `src/components/mediaSeparatorEngine.js`
- `src/lib/thirdPartyServices.js`
- `src/components/ui/ThirdPartyConsentModal.jsx`
- `src/App.jsx`
- `PRIVACY.md`
- `index.html`
- `scripts/check-external-hosts.mjs`
- `src/tests/thirdPartyConsent.test.js`
- `e2e/privacy-network.spec.js`

### Modification direction

- Create a machine-readable inventory containing service id, provider, domains, purpose, trigger, transmitted data, consent mode, fallback, and policy URL. Consent modes must distinguish explicit consent, point-of-use disclosure, user navigation, and hosting infrastructure.
- Represent unpkg FFmpeg as point-of-use disclosure: processing starts the download; unpkg receives standard request metadata; the media file and output remain in the browser. Keep the exact @ffmpeg/core 0.12.6 URL pinned.
- Before first processing action, show a persistent, readable Media Separator notice explaining the unpkg engine download and local media processing. This is disclosure, not a blocking consent gate, per D-01C.
- Fetch FFmpeg JS/WASM with an expected integrity manifest and reject mismatched bytes before creating Blob URLs. Updating the core version must require updating and reviewing the hashes.
- Add an in-app privacy component/route, linked from every footer and the consent manager. Render the service table from the inventory where practical; keep PRIVACY.md synchronized from the same data.
- Rewrite absolute '100% local' metadata and consent-manager wording into accurate local-first language: most tool inputs stay local; named network-dependent features and runtime assets are disclosed separately.
- Record Google Fonts recommendations as user-initiated navigation only; do not list them as automatic application requests after C01.

### Important considerations

- The inventory is the policy source of truth; adding an external hostname without an inventory entry must fail CI.
- Do not claim unpkg receives consent or media data. Do not imply that same-origin Pages requests are offline.
- The privacy route should be reachable by hash/direct navigation under the current SPA deployment model.

### Verification

- Privacy route returns/render successfully from home and tool routes and is linked from the footer and consent modal.
- A source scan finds every literal external hostname in the inventory or an explicit test-only/build-only allowlist.
- Starting media processing makes the documented unpkg requests only then; uploaded media is never sent to unpkg or same-origin APIs.
- Tampered FFmpeg bytes fail with a safe local error and no execution.

### Completion criteria

- Deployed users can read an accurate policy.
- Runtime behavior, consent text, and disclosures agree.
- FFmpeg remains remote and local-processing behavior is preserved without an undisclosed request.

## C05 — P0 — Apply OSM consent to image GPS maps

**Phase:** 1  
**Findings:** CR-003  
**Planned commit:** `fix(privacy): gate image GPS maps behind OSM consent`

### Relevant files

- `src/components/ImgMeta.jsx`
- `src/components/IpLookup.jsx`
- `src/components/ExternalMapPreview.jsx`
- `src/lib/thirdPartyServices.js`
- `src/tests/thirdPartyConsent.test.js`
- `e2e/gps-consent.spec.js`

### Modification direction

- Extract or reuse one ExternalMapPreview component for both IP Lookup and image metadata.
- Render coordinates locally without creating an iframe. Create the OSM iframe only after hasConsent('osm') is true or the user grants it through the shared flow.
- On revocation or reset, remove the iframe immediately and return to coordinates-only mode.
- Keep any Google Maps link as a separately labeled external navigation that states coordinates leave the site when clicked.

### Important considerations

- Do not persist image coordinates in localStorage or logs.
- Consent is service-wide; granting it in one tool should be reflected consistently in the other.

### Verification

- No OSM request or iframe exists before consent for a GPS-tagged image.
- Grant, reload, revoke, and reset flows are covered.
- Exact coordinates remain usable without a map.

### Completion criteria

- GPS map behavior matches the central consent model.
- Revocation has an immediate visible and network effect.

## C06 — P0 — Make currency conversion fail safely

**Phase:** 2  
**Findings:** CR-004, CR-011  
**Planned commit:** `fix(currency): require validated rates before rendering results`
**Implementation status:** Completed locally in `61ba5d4`.

### Relevant files

- `src/components/CurrencyCounter.jsx`
- `src/lib/currency.js`
- `functions/api/exchange-rates.js`
- `src/tests/currency.test.js`
- `src/tests/exchangeRates.test.js`
- `e2e/currency.spec.js`

### Modification direction

- Replace all missing/invalid-rate fallbacks of 1 with an explicit unavailable or invalid state. Never render a numeric result without finite positive source and target rates.
- Validate manual rates as finite and greater than zero, show inline errors, and disable result output until valid.
- On provider failure, show no fresh conversion. A last valid result may remain only when visibly marked stale with its timestamp.
- At the Function boundary, require JSON content type, cap response bytes, validate timestamp, allow only supported currency codes, and require each forwarded value to be finite and positive.
- Do not cache malformed or incomplete provider responses.

### Important considerations

- Keep calculation pure and testable; UI state should not silently coerce strings, NaN, Infinity, zero, or negative values.
- Errors must not expose raw upstream response bodies.

### Verification

- Tests cover no consent, provider 500, wrong MIME, oversized body, missing currency, zero/negative/NaN, stale cached data, and valid rates.
- Only valid live or manual inputs produce a numeric conversion.
- Malformed responses never enter cache.

### Completion criteria

- No 1:1 output is fabricated.
- Provider and manual data share the same validity rules.
- Failure states are unambiguous.

## C07 — P0 — Enforce cumulative browser resource budgets and cleanup

**Phase:** 2  
**Findings:** CR-005  
**Planned commit:** `fix(files): enforce cumulative limits and deterministic cleanup`
**Implementation status:** Completed locally in `2290989`.

### Relevant files

- `src/lib/resourceLimits.js`
- `src/hooks/useObjectUrlRegistry.js`
- `src/components/ImgMeta.jsx`
- `src/components/AudioMeta.jsx`
- `src/components/VideoMeta.jsx`
- `src/components/DocMeta.jsx`
- `src/components/FolderAnalyzer.jsx`
- `src/components/useMediaSeparator.js`
- `src/components/mediaSeparatorEngine.js`
- `src/tests/resourceLimits.test.js`
- `e2e/file-limits.spec.js`

### Modification direction

- Add one cumulative validator that evaluates existing plus incoming files before any read, parse, object URL, worker, or FFmpeg write.
- Define per-tool policies for per-file bytes, cumulative bytes, count, and queue size. Use a conservative FFmpeg policy: 200 MiB per item and total, at most 10 queued items; reduce to 100 MiB when navigator.deviceMemory reports 4 GiB or less. Use 150 MiB as the fallback when device memory is unavailable.
- Apply the central policy to repeated selections in image, audio, video, document, folder, and media-separator flows. Audio and folder analysis must validate before parsing.
- Track every object URL in a registry/ref; revoke it on item removal, replacement, reset, completion when no longer needed, and unmount.
- Abort readers/workers and terminate FFmpeg on navigation/unmount. Delete temporary FFmpeg files in finally blocks.
- Show rejected-file reasons without reading rejected content.

### Important considerations

- Limit constants are product safeguards; changing them later requires memory profiling on mobile and desktop.
- Do not rely only on HTML input attributes. Logic-level validation is mandatory.

### Verification

- Repeated additions just below/above each limit are covered for every affected tool.
- Mocks prove rejected files never call arrayBuffer, text, object URL creation, parser, or FFmpeg methods.
- URL registry is empty after removal, reset, failure, completion cleanup, and unmount.
- Mid-processing navigation leaves no worker/FFmpeg activity.

### Completion criteria

- Cumulative limits cannot be bypassed by multiple selections.
- All temporary resources have deterministic ownership and cleanup.
- Large inputs fail before expensive work.

## C08 — P1 — Make the speed test bounded and truthful

**Phase:** 2  
**Findings:** CR-012  
**Planned commit:** `fix(speed-test): clamp traffic and report unavailable measurements`
**Implementation status:** Completed locally in `e39456c`.

### Relevant files

- `src/lib/speedTest.js`
- `src/components/NetworkSpeedTest.jsx`
- `src/tests/speedTest.test.js`
- `e2e/speed-test.spec.js`

### Modification direction

- Clamp custom download and upload inputs in getDataPlan to 1–1000 MB each; reject non-finite values rather than relying on input max attributes.
- Require a separate confirmation when the total planned traffic exceeds 250 MB and show the exact total before starting.
- Treat zero successful pings as unavailable, not 0 ms. Check response.ok for every request.
- Add per-request deadlines and one overall deadline; all timers and fetches must be tied to the user AbortController.
- Cap chart/history samples at 200 by throttling and downsampling without changing final aggregate calculations.
- On any partial failure, label which measurements are unavailable instead of presenting a complete successful result.

### Important considerations

- Do not silently clamp a displayed value; either normalize the input visibly or show validation.
- Cancellation must remain immediate even during upload.

### Verification

- Hostile values including 1,000,000, Infinity, NaN, negative, and strings cannot exceed the hard plan cap.
- Non-2xx, hanging, and aborted ping/download/upload mocks produce correct unavailable/cancel states.
- Long tests never exceed 200 rendered history points.

### Completion criteria

- Traffic cannot exceed the user-visible bounded plan.
- Failed latency is never reported as excellent latency.
- Tests terminate predictably.

## C09 — P0 — Add production-grade atomic rate limiting through a Worker service

**Phase:** 3  
**Findings:** CR-006  
**Planned commit:** `feat(platform): require atomic rate limiter service in production`
**Implementation status:** Implemented in `86dd63c`; deployed service-binding concurrency evidence remains pending.

### Relevant files

- `workers/rate-limiter/src/index.js`
- `workers/rate-limiter/wrangler.jsonc`
- `wrangler.jsonc`
- `functions/_shared/rateLimit.js`
- `functions/api/extract-fonts.js`
- `functions/api/exchange-rates.js`
- `functions/api/iplookup.js`
- `package.json`
- `.dev.vars.example`
- `README.md`
- `CODEBASE.md`
- `src/tests/rateLimit.test.js`
- `.github/workflows/ci.yml`

### Modification direction

- Create a dedicated non-public Worker that owns Cloudflare Rate Limiting bindings. Use at least an expensive policy for extract-fonts (20/minute) and a standard policy for exchange-rates/iplookup (60/minute), each keyed by route plus a privacy-preserving client key.
- Bind that Worker into Pages Functions as RATE_LIMITER_SERVICE through a Service Binding. The Pages code calls the service before body parsing or upstream work.
- Derive the client key with an HMAC secret over the client network identifier plus a rotating period; never log or return the raw IP.
- In production, missing/unreachable RATE_LIMITER_SERVICE returns a stable 503 and performs no upstream work. In-memory limiting is allowed only when an explicit development flag is set; remove KV read-then-write fallback.
- Pin a Wrangler version compatible with Rate Limiting bindings and check both Worker and Pages configuration in CI.
- Return 429 with Retry-After and stable public error code; expose limiter mode only in non-sensitive diagnostics.

### Important considerations

- Current Cloudflare Pages Functions documentation lists only a subset of bindings and does not list direct Rate Limiting bindings. The service-Worker design preserves the Pages frontend without assuming unsupported direct binding behavior.
- Rate Limiting bindings are intentionally not exact accounting; use them for abuse protection, not billing quotas.

### Verification

- Unit tests cover allow, deny, unavailable service, development mode, and no raw-IP logging.
- Integration tests send concurrent requests through the actual Pages→Service Binding→Worker path and observe the configured limit.
- A production-config test proves the endpoint fails closed when the binding is absent.
- No RATE_LIMIT_KV or implicit fallback remains.

### Completion criteria

- Protected endpoints never silently downgrade in production.
- Concurrency cannot bypass the configured platform limiter in integration tests.
- Deployment configuration is version-controlled and documented.

## C10 — P1 — Harden outbound fetching and prove Cloudflare-runtime behavior

**Phase:** 3  
**Findings:** CR-009  
**Planned commit:** `fix(fetch): enforce one deadline and runtime SSRF tests`
**Implementation status:** Local hardening and harness completed in `a7f6c95`; CR-009 remains open pending Cloudflare-runtime evidence.

### Relevant files

- `functions/_shared/safeExternalFetch.js`
- `src/tests/safeExternalFetch.test.js`
- `test/integration/ssrf-worker/**`
- `README.md`
- `CODEBASE.md`

### Modification direction

- Use one absolute deadline across DNS validation, redirects, connection, and body reading; do not reset the full timeout after each redirect.
- Revalidate scheme, hostname, port, and resolved addresses for every redirect target. Limit redirects and reject credentialed URLs, ambiguous numeric hosts, private/link-local/loopback/multicast/reserved ranges, and metadata hostnames.
- Cap response bytes while streaming; abort immediately at the limit rather than buffering an oversized body.
- Add an integration harness deployed to the actual Cloudflare runtime with controlled redirect and DNS-change targets.
- Do not mark the DNS TOCTOU portion closed solely from unit tests. Completion requires the runtime test to prove private/metadata targets remain unreachable; otherwise keep CR-009 open and route arbitrary fetching through an egress component capable of binding validation to the connection.

### Important considerations

- This finding was a residual architecture gap, not a proven exploit. The plan must not claim IP pinning that the implementation does not provide.
- Keep test infrastructure isolated and never point it at real private services.

### Verification

- Unit tests cover redirect deadlines, mixed IPv4/IPv6 answers, encoded hosts, body limits, and abort cleanup.
- Cloudflare integration test exercises controlled rebinding/redirect targets and records evidence.
- All callers receive stable safe error codes.

### Completion criteria

- Overall deadlines and byte limits are enforceable.
- Every redirect is revalidated.
- CR-009 is closed only with runtime evidence or a stronger egress architecture.

## C11 — P1 — Replace raw exceptions with stable public errors

**Phase:** 3  
**Findings:** CR-017  
**Planned commit:** `fix(errors): hide stacks and standardize public error responses`
**Implementation status:** Completed locally in `cb810ab`.

### Relevant files

- `src/lib/publicErrors.js`
- `src/components/useMediaSeparator.js`
- `src/components/MediaSeparatorQueueItem.jsx`
- `functions/api/extract-fonts.js`
- `functions/api/exchange-rates.js`
- `functions/api/iplookup.js`
- `functions/_shared/errorResponse.js`
- `src/tests/**`
- `e2e/error-safety.spec.js`

### Modification direction

- Define stable error codes and safe user messages for validation, consent, rate limit, upstream timeout, blocked target, unavailable provider, processing failure, and internal failure.
- Return a correlation id in API errors and logs. Log detailed diagnostics server-side only; never return raw upstream messages, URLs, response bodies, or stack frames.
- Render media errors as safe summaries. Show stack traces only in explicit development mode and never persist them.
- Ensure error responses have correct status, JSON content type, no-store, and nosniff.

### Important considerations

- Correlation ids must not encode IPs, URLs, filenames, or user content.
- Do not turn all failures into 500; preserve meaningful safe status codes.

### Verification

- Forced failures contain no stack syntax, internal path, target URL, raw upstream body, or filename in public output.
- Logs contain the correlation id needed to diagnose the same failure.
- Snapshot/API contract tests lock error codes, not incidental prose.

### Completion criteria

- Public errors are safe, stable, and diagnosable.
- Production UI never renders err.stack.

## C12 — P1 — Complete accessibility for privacy and custom controls

**Phase:** 4  
**Findings:** CR-016  
**Planned commit:** `fix(a11y): complete dialog focus and native control semantics`
**Implementation status:** Completed locally in `be0b4cf`; D-04 remains an accepted residual.

### Relevant files

- `src/components/ui/ThirdPartyConsentModal.jsx`
- `src/App.jsx`
- `src/components/FolderAnalyzer.jsx`
- `src/components/ui/Button.jsx`
- `e2e/accessibility.spec.js`

### Modification direction

- Implement the consent manager as a real dialog with role=dialog, aria-modal, labelled title/description, initial focus, focus trap, Escape close, and focus restoration.
- Give the close control an accessible name and ensure reset/revoke actions announce state changes.
- Replace clickable brand/navigation divs and folder-selection containers with native buttons or links; preserve layout while adding keyboard activation and visible focus.
- Do not remove, translate, or behaviorally change the language selector under D-04. Record its dead-control and selector-specific accessibility debt as accepted residual scope.

### Important considerations

- Prefer native semantics over reproducing WAI-ARIA patterns.
- The modal must remain usable at 320 CSS px width and with 200% zoom.

### Verification

- Keyboard-only users can open, operate, close, and return from the modal without focus escaping.
- Automated accessibility scan has no serious/critical findings in primary routes.
- Screen-reader spot checks cover dialog title, service state, revoke, reset, and close.
- Language selector DOM and behavior are unchanged.

### Completion criteria

- Privacy controls are keyboard and screen-reader operable.
- D-04 is respected and its residual is explicit.

## C13 — P1 — Add risk-based tests and network assertions

**Phase:** 4  
**Findings:** CR-015, CR-014  
**Planned commit:** `test(risk): cover privacy correctness and resource boundaries`
**Implementation status:** Completed locally in `74d460c`.

### Relevant files

- `e2e/privacy-network.spec.js`
- `e2e/currency.spec.js`
- `e2e/file-limits.spec.js`
- `e2e/font-extractor.spec.js`
- `e2e/speed-test.spec.js`
- `e2e/accessibility.spec.js`
- `vitest.config.js`
- `.github/workflows/ci.yml`
- `scripts/check-external-hosts.mjs`
- `package.json`

### Modification direction

- Add browser journeys for fresh-consent network behavior, OSM GPS maps, currency failure states, repeated file additions/cleanup, bounded font extraction, speed-test timeout/cancel, and keyboard-only consent management.
- Record all network requests in privacy tests. Fail on undeclared third-party hosts and on Google Fonts requests during initial load.
- Add focused component/integration tests for the critical UI state machines; do not rely only on route smoke tests.
- Expand coverage to critical components/functions and set ratcheted minimums: 80% lines/functions and 70% branches for src/lib, functions/_shared, and newly extracted policy modules. Existing large UI files may use per-file baselines that cannot decrease.
- Run the high-risk journeys as required CI checks on Node 22; keep route smoke on the supported matrix if runtime cost is excessive.

### Important considerations

- Network tests must distinguish user-initiated external navigation from automatic subresource/fetch requests.
- Avoid brittle text-only selectors; use roles, labels, and stable test ids only where necessary.

### Verification

- Intentionally add an undeclared host and prove CI fails, then remove it.
- Mutation/negative checks prove the tests catch 1:1 currency fallback, missing OSM gate, limit bypass, and leaked object URL.
- Coverage and E2E steps are required in CI and publish artifacts on failure.

### Completion criteria

- Highest-risk behavior is protected by negative assertions.
- A new third-party dependency cannot be introduced silently.
- Coverage cannot regress in critical modules.

## C14 — P2 — Ratchet static analysis and reconcile contributor documentation

**Phase:** 4  
**Findings:** CR-018, CR-019  
**Planned commit:** `chore(quality): ratchet analysis gates and canonicalize contributor docs`
**Implementation status:** Completed locally in `21105a5`; warning budget later decreased to 68.

### Relevant files

- `eslint.config.js`
- `jsconfig.json`
- `jsconfig.strict.json`
- `.agents/AGENTS.md`
- `CODEBASE.md`
- `CONTRIBUTING.md`
- `README.md`
- `scripts/check-doc-consistency.mjs`
- `package.json`
- `.github/workflows/ci.yml`

### Modification direction

- Restore no-undef as an error and require comments for intentionally empty catches. Establish a non-increasing warning budget and make new warnings fail CI.
- Include tests in checking. Add a strict checkJs configuration for critical libraries, Functions shared code, and new policy modules; expand it incrementally rather than switching the entire repository at once.
- Choose CODEBASE.md plus CONTRIBUTING.md as canonical architecture/run instructions. Update AGENTS.md to point to them and remove contradictory Vite/runtime/API-mirror statements.
- Add a lightweight consistency script that compares package versions, Node range, documented commands, and declared local API mirrors.

### Important considerations

- Land mechanical lint fixes separately from behavior changes where possible.
- Do not hide warnings by broad disable rules.

### Verification

- A fixture with an undefined identifier, unexplained empty catch, or extra warning fails CI.
- A deliberate package/document version mismatch fails the consistency check.
- Canonical docs are sufficient to run frontend, Pages Functions, and the rate-limiter Worker locally.

### Completion criteria

- New static-analysis debt cannot grow silently.
- Contributor instructions describe the actual deployment architecture.

## C15 — P2 — Create one route registry and split high-risk large components

**Phase:** 5  
**Findings:** CR-020  
**Planned commit:** `refactor(app): centralize tool routes and split domain modules`
**Implementation status:** Completed as independent commits `e25902c`, `cec4efd`, `a17cddc`, `24ed575`, `7094629`, and `695ded1`.

### Relevant files

- `src/toolRegistry.js`
- `src/App.jsx`
- `src/components/HomeGrid.jsx`
- `src/components/ImgMeta.jsx`
- `src/components/DocMeta.jsx`
- `src/components/QrBarcodeGenerator.jsx`
- `src/components/TypingSpeedTest.jsx`
- `src/components/CodonTable.jsx`
- `src/components/**/hooks/**`
- `src/components/**/lib/**`
- `e2e/routes.spec.js`

### Modification direction

- Create one typed/JSDoc tool registry containing id, aliases, title, category, search metadata, lazy component loader, static-layout flag, and navigation visibility.
- Generate route validation, lazy loading, navigation groups, active title, footer links, and E2E route lists from the registry. Include the privacy route but keep it out of the tool catalog.
- Split large files incrementally behind behavior tests: first metadata parser/domain helpers, then QR/barcode generation logic, then typing/codon state machines and presenters.
- Use separate staged commits for each extracted domain; do not mix visual redesign with structural extraction.

### Important considerations

- Suggested subcommits: C15a registry; C15b metadata modules; C15c QR/barcode modules; C15d typing/codon modules.
- Preserve route hashes and aliases to avoid breaking bookmarks.

### Verification

- Every public route and alias is registry-derived and covered by route tests.
- No duplicate route metadata remains in App.jsx.
- Each extracted pure/domain module has focused tests and unchanged user-visible behavior.

### Completion criteria

- Route metadata has one source of truth.
- Large-component refactors are incremental and independently reversible.

## C16 — P2 — Roll out HSTS after deployment validation

**Phase:** 5  
**Findings:** CR-022  
**Planned commit:** `chore(headers): add staged HSTS policy`
**Implementation status:** Repository stage completed in `24f72cd`; deployed response confirmation remains pending.

### Relevant files

- `public/_headers`
- `scripts/check-headers.mjs`
- `e2e/deployed-headers.spec.js`
- `README.md`

### Modification direction

- Confirm every intended production hostname is HTTPS-only, certificates are valid, and no required HTTP-only subdomain is covered.
- Add Strict-Transport-Security with max-age=86400 first. Monitor deployment and rollback readiness, then raise to 2592000 and finally 31536000.
- Do not add includeSubDomains or preload until every subdomain is audited and the maintainer explicitly accepts the long-lived commitment.
- Check the real deployed response, not only the checked-in _headers file.

### Important considerations

- HSTS is operationally sticky; this commit must not be merged without a rollback/domain review.
- Cloudflare-managed paths may have platform-specific headers; document any exception rather than weakening the app response.

### Verification

- Deployed HTTPS response contains the intended HSTS value and HTTP redirects correctly.
- Certificate and subdomain checks are recorded in the release evidence.
- Header checker validates syntax and the current rollout stage.

### Completion criteria

- HSTS is present on intended production responses.
- No unaudited includeSubDomains/preload commitment is made.

## Finding-to-Commit Matrix

| Finding | Planned commit(s) | Outcome |
|---|---|---|
| CR-001 | C01, C04 | Closed locally |
| CR-002 | C04 | Closed locally under D-01C; disclosure, no blocking consent |
| CR-003 | C05 | Closed locally |
| CR-004 | C06 | Closed locally |
| CR-005 | C07 | Closed locally |
| CR-006 | C09 | Implementation complete; deployed concurrency evidence pending |
| CR-007 | C02, C03 | Closed locally; proxy removed and scan bounded |
| CR-008 | C04 | Closed locally |
| CR-009 | C10 | Open pending Cloudflare-runtime DNS/connection evidence |
| CR-010 | C03 | Closed locally; same-site-only API |
| CR-011 | C06 | Closed locally |
| CR-012 | C08 | Closed locally |
| CR-013 | C02 | Closed by feature removal |
| CR-014 | C01, C02, C04, C13 | Closed locally |
| CR-015 | C13 | Closed locally |
| CR-016 | C12 | Closed except accepted D-04 language-selector residual |
| CR-017 | C11 | Closed locally |
| CR-018 | C14 | Closed locally |
| CR-019 | C14 | Closed locally |
| CR-020 | C15 | Closed locally through independent subcommits |
| CR-021 | None | Accepted residual under D-04; do not change |
| CR-022 | C16 | Repository stage complete; open until deployed HSTS is observed |

## Required Release Evidence

Before calling the remediation milestone complete, attach or preserve:

- `npm ci` output and lockfile consistency.
- `npm run verify`, `npm run test:coverage`, and required Playwright results.
- Built-asset inventory proving self-hosted fonts and their licenses are present.
- Fresh-profile network trace proving no initial Google Fonts request.
- Network trace proving Font Extractor never requests font files or `/api/font-proxy`.
- Media Separator trace proving only the pinned unpkg engine is downloaded and no media body is uploaded.
- Pages→Rate Limiter Worker integration results, including fail-closed behavior.
- Cloudflare-runtime SSRF test evidence for CR-009.
- Deployed privacy-route and security-header smoke results.
- Accessibility scan plus keyboard/screen-reader spot-check notes.
- A final issue matrix showing CR-021 and the language-selector portion of CR-016 as accepted residual items.

Evidence disposition on 2026-07-26:

- Preserved locally: clean-install output, full verify/coverage results, self-hosted
  font inventory, fresh-load host assertions, Font Extractor/font-file negative
  assertion, FFmpeg request boundary, fail-closed limiter unit/config checks,
  accessibility scans, keyboard dialog coverage, and the final issue matrix.
- Still required from deployed infrastructure: real Pages-to-Worker concurrent-limit
  results, the Cloudflare-runtime CR-009 harness, a deployed privacy-route smoke
  check, and a post-deployment HSTS response containing `max-age=86400`.

## Rollback Boundaries

- **C01:** restore the prior font CSS only if a production font asset is missing; do not restore automatic Google requests without a new privacy decision.
- **C02/C03:** rollback together if API/UI contracts diverge. Do not restore direct font download as an emergency fallback.
- **C04/C05:** policy and runtime consent behavior must roll back together.
- **C06–C08:** each functional fix is independently reversible.
- **C09:** if the limiter service fails, protected endpoints remain unavailable by design; rollback requires a conscious temporary risk acceptance.
- **C10:** do not relax SSRF blocks to recover compatibility.
- **C16:** HSTS max-age increases are not instantly reversible for browsers that already cached them.

## Explicit Non-Goals

- No complete Google Fonts catalog is downloaded or bundled.
- No Google Fonts API integration is added.
- No FFmpeg media processing is moved to the server.
- No full migration from Cloudflare Pages to Workers Static Assets is required in this phase.
- No language selector change or localization implementation.
- No claim that every declared CSS font is actually rendered by the scanned site.
- No large visual redesign.

## External Platform References


- [Cloudflare Workers Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) — Rate Limiting is documented for Workers and requires a compatible Wrangler version.
- [Cloudflare Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/) — Pages Functions support a documented subset of bindings; Service Bindings are supported.
- [Cloudflare Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) — Version-controlled Pages configuration and Service Bindings.
- [Cloudflare Workers static-asset limits](https://developers.cloudflare.com/workers/platform/limits/) — The current individual static-asset limit is 25 MiB, supporting the decision to keep the large FFmpeg core remote.

## Final Completion Definition

Repository remediation work for C01–C16 is complete. The overall milestone is not
operationally closed until the explicitly listed deployment evidence exists:
Pages-to-Worker concurrent limiting, Cloudflare-runtime CR-009 behavior, deployed
privacy smoke, and the staged HSTS response. CR-009 and CR-022 must not be mislabeled
as closed before that evidence is recorded. CR-021 and the language-selector portion
of CR-016 remain accepted residuals under D-04.
