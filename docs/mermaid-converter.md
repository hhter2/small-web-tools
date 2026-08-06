# Mermaid converter

The Mermaid converter is a local-first editor and exporter registered as the lazy-loaded `tool-mermaid` route.

## Processing model

Diagram source is held in component state and is not persisted or sent to a server. Rendering, SVG generation, and PNG rasterization all run in the browser. The latest successful SVG string is the single source used by the on-page preview, SVG download, and PNG rasterization path.

The renderer rejects unsupported diagram declarations and malformed statements, limits input to 100 KB and 250 nodes, escapes all user-provided labels before placing them in SVG markup, and does not resolve remote resources. Object URLs created for downloads and rasterization are revoked after use.

## Supported syntax

This initial implementation supports `flowchart` and `graph` declarations with `TB`, `TD`, `BT`, `LR`, and `RL` directions. Nodes may use rectangular (`A[Label]`), rounded (`A(Label)`), or diamond (`A{Label}`) shapes. Supported connectors are `-->`, `---`, `-.->`, and `==>`.

## Export fidelity

The generated SVG includes explicit dimensions and a view box. PNG output rasterizes that exact SVG at a bounded 1×, 2×, or 3× scale. Browser font rasterization can produce minor antialiasing differences, but geometry, labels, colors, aspect ratio, and background originate from the same SVG render.

## Privacy

Mermaid source, SVG output, PNG output, and errors remain in the browser. This tool adds no network service and requires no Cloudflare Function or consent-gated request.
