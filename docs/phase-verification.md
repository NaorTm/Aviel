# Phase verification and release evidence

Date: 2026-07-22

## Phase 0 — discovery and decisions

Delivered the nine required planning documents, reviewed the supplied Hebrew reference PDF, recorded primary sources, added project rules in `AGENTS.md`, and created the repo-scoped `verify-boq-release` skill.

Decision: a strict TypeScript vinext/React application with Dexie/IndexedDB as the local source of truth, decimal strings plus `decimal.js` for financial values, and React-pdf with embedded Noto Sans Hebrew fonts.

Residual risk: IndexedDB is origin- and browser-profile-bound. The settings screen makes backup/restore prominent, but the user must export before clearing site data or changing origin.

## Phase 1 — foundation

Delivered the desktop RTL shell, dashboard, company settings, local logo artifact validation, database initialization, standard units, seed data, error states, and test infrastructure.

Verified by strict TypeScript, ESLint, live Chromium inspection, RTL root attributes, and automated accessibility checks.

## Phase 2 — templates and catalog

Delivered editable/duplicable templates, a ten-chapter Private House seed, custom units, catalog search/filter/deactivation, and atomic CSV/XLSX import plus CSV/XLSX export.

Verified by storage seed/deep-copy tests and import validation/formula-neutralization tests. Project items retain unit, description, and price snapshots.

## Phase 3 — project editor and calculations

Delivered project details, inline chapter/item editing, duplicate/delete/hide/optional controls, pointer/keyboard reorder paths, catalog insertion, exact totals, sticky summary, automatic saving, optimistic edit-version conflict detection, and reopen recovery.

Verified by seven decimal calculation tests and an end-to-end create/edit/autosave/reopen workflow. Zero is valid, negatives are rejected, fixed-price and as-required states are explicit, hidden rows are excluded, and optional totals are separate.

## Phase 4 — PDF proof and renderer

Delivered A4 Hebrew RTL generation with locally embedded Noto Sans Hebrew, explicit per-page headers/footers, chapter tables, repeated table headings, long-description wrapping, optional-item pages, totals, terms, signatures, and page numbering.

Verified by a React-pdf test and a five-page fixture. The final 30,313-byte artifact was parsed as five pages with 2,852 extracted text characters, rendered to PNG with PDFium, and every page was visually inspected after correcting an even-page header/padding defect. The inspected sample is `output/pdf/aviel-boq-sample.pdf`.

## Phase 5 — revisions, backup, and recovery

Delivered immutable revision snapshots with stored PDF blobs, guarded edits after Sent/Approved status, project CSV export, full portable backup, staged schema validation, and atomic restore.

Verified by stale-edit detection and a full backup/restore round trip. Import boundaries validate extension, size, schema, decimal fields, and spreadsheet-formula prefixes.

## Phase 6 — release readiness

Current gates:

- TypeScript strict check: pass.
- ESLint: pass.
- Unit/integration/PDF suites: 13/13 pass.
- Playwright workflow, RTL and serious/critical axe checks: pass.
- Compact 800 px tablet layout regression: pass.
- Production vinext/Vite build: pass.
- `npm audit`: 0 known vulnerabilities after compatible dependency updates and targeted Sharp/PostCSS overrides.
- Live visual inspection: dashboard, template editor, catalog filters/import/export, settings, backup/restore, project editor, autosave and revision PDF preview exercised.
- PDF visual inspection: all five pages pass with headers, footers, RTL text, wrapping, optional separation and totals intact.

Known limitations:

- Local data does not automatically follow the user between origins or browsers; use backup/restore.
- A real independent NVDA session and physical printer proof were not available in the automated environment; semantic/axe checks and rendered-PDF pixel inspection were used instead.
- Credit/negative items, encrypted backups, packaged desktop shells, and PDF/A/UA certification remain intentionally deferred.
- The production build reports a non-blocking React-pdf/fontkit static-analysis warning and a large lazy PDF/spreadsheet chunk; runtime PDF generation and the production build both pass.
