# Implementation roadmap

> Status as of 2026-07-22: phases 0–6 are implemented and verified for the current local-first release. Detailed evidence and residual risks are recorded in `docs/phase-verification.md`.

## Phase 0 — discovery and decisions

Deliverables: nine specifications, reference-PDF review, primary sources, root `AGENTS.md`, and one repo-scoped release-quality skill.

Exit gate:

- architecture, data ownership, calculation order, and PDF proof criteria are explicit;
- no unresolved decision blocks foundation work.

## Phase 1 — foundation

Scope:

- replace starter preview and metadata with Hebrew RTL application shell;
- navigation, dashboard, design tokens, icons, error/recovery boundaries;
- Dexie database, storage health, persistence request, version handlers;
- settings/company/logo validation;
- decimal/Zod/domain foundations and test infrastructure;
- seed standard units and Private House demo template idempotently.

Checks:

- strict build/lint/unit/component tests;
- IndexedDB open/reload transaction test;
- browser visual/RTL/keyboard/axe inspection of dashboard/settings;
- no business data in `localStorage`.

Risk: origin-bound local data. Mitigation: visible storage health and backup reminder from the first usable release.

## Phase 2 — templates and catalog

Scope:

- template aggregate CRUD/duplicate/archive;
- catalog CRUD/search/filter/deactivate;
- project creation as deep transaction;
- standard/custom units;
- CSV and XLSX catalog mapping/preview/atomic import and export.

Checks:

- deep-copy and 285→310 snapshot tests;
- import security fixture matrix;
- rollback injection;
- keyboard/RTL/axe browser pass.

## Phase 3 — project editor and calculations

Scope:

- project details/status policy;
- chapter/item semantic tables, inline edit, notes, duplicate/delete/Undo;
- dnd-kit pointer/touch/keyboard reorder plus move commands;
- optional/hidden/fixed/as-required states;
- decimal-safe totals and validation;
- serialized autosave, save status, Web Lock/BroadcastChannel conflict handling.

Checks:

- all calculation vectors/invariants;
- every edit then reload;
- two-tab conflict;
- 500-item performance;
- full keyboard, RTL visual, and axe pass.

## Phase 4 — PDF proof and production renderer

Scope:

- bundle pinned Noto Sans Hebrew fonts/license/checksums;
- implement `PdfRenderer` interface and React-pdf v4 proof fixture;
- build A4 header/table/chapter/optional/summary/terms/footer;
- Blob preview/download/print/hash/storage;
- revision link and regeneration behavior.

Early exit/fallback decision:

- If logical Hebrew, mixed bidi, repeated header, or deterministic multi-page layout fails the proof gate, do not patch with reversed strings. Implement a local Chromium adapter behind the same interface and document the runtime requirement.

Checks:

- parse/font/text/page assertions;
- every page rendered to PNG and inspected;
- stored/downloaded bytes share the same SHA-256;
- three-page and 200-row fixtures.

## Phase 5 — revisions, backup, and recovery

Scope:

- immutable revision history and Sent/Approved edit guard;
- artifact history/download;
- project and list CSV exports;
- `.boqbackup` export, staged validation/preview, atomic restore;
- trash/archive, quota/migration recovery, polished errors.

Checks:

- revision replay and immutability;
- backup round trip including logo/multiple PDFs and every migration fixture;
- corrupt/newer/oversized restore leaves DB unchanged;
- browser recovery flow.

## Phase 6 — release readiness

Scope:

- complete acceptance matrix and user documentation;
- deterministic seed/demo cleanup;
- CSP/dependency audit, performance and accessibility fixes;
- private Sites build/deployment and target-origin restore rehearsal.

Checks:

- all blocking suites;
- manual Hebrew/NVDA and independent PDF viewer;
- backup before origin change and successful restore on deployed origin;
- release-quality skill produces a complete evidence report.

## Dependency policy

Pin direct dependencies and record why each exists. Prefer browser-native APIs and small focused libraries. The expected production additions are Dexie, dexie-export-import, decimal.js, Zod, Lucide React, TanStack Table, dnd-kit, React-pdf, Papa Parse, and SheetJS CE. Large PDF/spreadsheet modules are lazy-loaded.

## Deferred options

- Packaged Electron/Tauri shell and SQLite repository adapter.
- Encrypted/passphrase backup.
- Credit items and item-level taxability.
- Advanced ARIA spreadsheet grid/clipboard fill behavior.
- PDF/A/UA profile certification.
