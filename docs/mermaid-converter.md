# Mermaid converter

The Mermaid converter is a local-first editor and exporter registered as the lazy-loaded `tool-mermaid` route.

## Processing model

Diagram source is held in component state and is not persisted or sent to a server. The bundled Mermaid package is dynamically imported only after this tool is opened and a render is requested. Rendering, SVG generation, and PNG rasterization all run in the browser. The latest successful sanitized SVG string is the single source used by the on-page preview, SVG download, and PNG rasterization path.

Rendering uses Mermaid with `securityLevel: strict`, root-level HTML labels disabled, deterministic IDs, suppressed error rendering, a 100 KB source limit, and a 1,000-statement/edge ceiling. The generated SVG then passes through a second local sanitizer that removes script-capable elements, HTML foreign objects, external images, interactive links, event handlers, unsafe URL schemes, external source attributes, and CSS URL references.

Object URLs created for downloads and rasterization are revoked after use. PNG generation supports bounded 1×, 2×, and 3× scales and rejects outputs above 32 million pixels.

## Syntax

The editor uses the bundled Mermaid 11 renderer rather than a project-specific syntax subset. Valid Mermaid diagram types supported by that renderer can be previewed, subject to the strict security configuration and resource limits above.

## Export fidelity

The sanitized SVG includes explicit dimensions and a view box. Preview and SVG download use that exact string. PNG output rasterizes the same string without a second Mermaid render. Browser font rasterization can produce minor antialiasing differences, but geometry, labels, colors, aspect ratio, and background originate from one successful render.

The background control explicitly selects either a solid color or transparency, and the selected behavior is shared by preview, SVG, and PNG.

## Privacy

Mermaid source, SVG output, PNG output, and controlled parse errors remain in the browser. This tool adds no network service and requires no Cloudflare Function or consent-gated request. Remote images, fonts, stylesheets, scripts, and other resources referenced by diagram input are removed from exported SVG before preview or rasterization.

## Third-party license

Mermaid is distributed under the MIT License. Its bundled dependency and transitive-license metadata are retained in `package-lock.json`; no Mermaid code or assets are loaded from a CDN at runtime.
