# Testing and quality plan

## 1. Quality gates

No feature is complete because code compiles. Completion requires the smallest real workflow proving the behavior plus the relevant automated and visual checks.

### Every change

- strict TypeScript/typecheck;
- ESLint;
- targeted Vitest tests;
- production build when route/bundling behavior changes.

### Pull-request/release candidate

- full unit/integration suite with coverage thresholds;
- Chromium E2E critical workflows;
- axe WCAG scan;
- RTL screenshots at 1440×900 and 1024 px;
- database migration fixtures and backup round trip when applicable;
- PDF fixture generation, parsing, font checks, rasterization, and human inspection when applicable;
- dependency audit and final production build.

### Nightly/release

- Chromium, Firefox, and WebKit E2E where browser APIs permit;
- 500-item project and large catalog performance tests;
- every supported migration fixture;
- full backup/restore with logo and multiple PDF Blobs;
- manual Hebrew keyboard/NVDA smoke test;
- independent PDF viewer pass.

## 2. Test layers

### Domain unit tests — Vitest

- Calculation golden vectors and invariants from `calculation-rules.md`.
- Deep copy and snapshot immutability.
- Item/chapter/document inclusion buckets.
- Decimal validation/canonicalization and formatters.
- Revision state transitions.
- Import mapping, formula rejection, duplicate-code policy, filename safety.

Coverage target for `src/domain`: 100% statements/branches/functions/lines. Other non-UI adapters: minimum 90% lines and 85% branches. Coverage is a floor, not a substitute for scenario quality.

### Component/integration — React Testing Library + user-event

- Inline edit, commit/cancel, duplicate/delete/Undo, notes, flags, validation.
- Totals panel and save-state transitions.
- Template/catalog selection snapshots data.
- Dialog focus, accessible labels, and error recovery.

Use role/label queries and user-visible behavior; test IDs are reserved for stable E2E contracts that lack semantic locators.

### Storage integration — real browser IndexedDB

- Transactions, rollback on injected failure, migrations, quota errors, Blob persistence.
- Autosave/reload for every editor operation.
- Web Lock/BroadcastChannel conflict behavior.
- Template-to-project deep copy and revision creation atomicity.

Mocks do not satisfy this layer.

### End-to-end — Playwright

Critical flows:

1. Onboard company and persistence state.
2. Create Private House project.
3. Edit/reorder/hide/optional/duplicate chapters and items with keyboard and pointer alternatives.
4. Change catalog 285→310 and prove existing 285 snapshot/new 310 insertion.
5. Reload and recover all exact decimal strings/order/flags.
6. Create revision, generate PDF, reopen/download old revision.
7. CSV/XLSX import preview/atomic commit and export.
8. Full backup, clear a disposable test DB, restore, and compare canonical records/artifact hashes.

### Accessibility and RTL

- Assert `lang=he` and `dir=rtl` on every route.
- Axe scan critical states; fail serious/critical findings.
- Geometry assertions for right-side navigation, logical table order, sticky regions, and no overlap at 200% zoom.
- Mixed bidi fixture: Hebrew with `Q-2026-001`, `CAT6`, `3x2.5`, `%`, `₪`, phone, and email.
- Manual NVDA/Chrome release checklist because automation cannot prove screen-reader quality.

### Visual regression

- Deterministic locale/time, bundled fonts loaded, animations disabled, fixed viewport and browser version.
- Snapshots: dashboard, project editor normal/long/error/filtered/optional states, catalog import preview, settings recovery, PDF pages.
- Review baseline changes; never auto-accept in routine test execution.

## 3. PDF tests

Fixtures: one-page minimal, three-page ordinary, 200-row stress, six-line Hebrew description, mixed bidi, logo/no-logo, missing/as-required, zero values, discount column on/off, optional/hidden, long terms.

Automated assertions:

- bytes start `%PDF-`, size > minimum and < configured maximum;
- A4 page boxes and expected page count;
- bundled Hebrew font embedded/subset and text extraction contains known phrases;
- hidden/internal content absent; visible items exactly once;
- exact totals and page `X מתוך Y` strings;
- repeated table header on every continuation page;
- no blank interior page or bounding box outside safety area where tooling exposes geometry.

Render every page to PNG at fixed DPI and visually inspect after meaningful PDF changes. PDF/A/UA checks with veraPDF are required only if a future release claims a profile.

## 4. Import/file security tests

- CSV with/without UTF-8 BOM, quotes, commas, CRLF, embedded newline, Hebrew, blanks, zero, invalid decimal, duplicate code, and formula prefix.
- XLSX with Hebrew, leading-zero codes, formula cells, malformed OOXML, oversized sheet, duplicate code, and unsupported macro/legacy file.
- Logo extension/MIME/signature disagreement, oversized bytes/dimensions, corrupt decoder data, SVG/polyglot attempt.
- Backup wrong magic/version/checksum, malformed record, oversized archive, and newer schema; all must leave live DB unchanged.

## 5. Data-loss and resilience tests

- Inject failure mid-copy, reorder, revision, import, and restore; prior transaction remains intact.
- Close/reload after each edit class; committed state survives.
- Two tabs cannot silently overwrite.
- `QuotaExceededError` never reports saved and offers emergency export.
- Migration/open failure enters recovery and never deletes the DB.
- Blob hashes survive export/restore byte-for-byte.

## 6. Performance budgets

- Editor with 10 chapters/500 items: interaction ready under 2 s on reference desktop after data load.
- Typing-to-local-state under 50 ms p95; calculation under 100 ms p95; committed-save acknowledgement under 500 ms p95 on local IndexedDB.
- No full editor-tree rerender per keystroke; performance test counts affected rows.
- Catalog search over 5,000 items responds under 150 ms p95.
- 200-row PDF completes under 10 s on reference Chromium without UI freeze longer than 250 ms; use a worker if the proof gate fails.

## 7. Release evidence

Each phase records:

- commands/checks run and results;
- browser routes and flows exercised;
- PDF pages rendered/inspected where relevant;
- backup/migration fixtures used;
- remaining known risks with severity and workaround.
