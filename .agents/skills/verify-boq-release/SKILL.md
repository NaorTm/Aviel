---
name: verify-boq-release
description: Run the Aviel BOQ release-readiness workflow after material financial, persistence, import/export, Hebrew RTL, PDF, migration, backup, or user-flow changes. Use for phase completion, release candidates, pre-deployment checks, or when asked whether the application is genuinely verified; do not use as a substitute for targeted tests during ordinary small edits.
---

# Verify BOQ Release

Produce evidence that the application works as a local-first Hebrew quotation tool, not merely that it builds.

## Prepare

1. Read the root `AGENTS.md` and these specifications:
   - `docs/calculation-rules.md`
   - `docs/pdf-specification.md`
   - `docs/testing-and-quality-plan.md`
2. Read `references/release-gates.md` for the evidence matrix.
3. Inspect `package.json` and use its declared commands. Do not invent passing results or update visual baselines automatically.
4. Preserve the user's database and files. Run destructive restore/clear tests only against an isolated test database or disposable browser context.

## Run gates in order

1. Run typecheck/lint and production build.
2. Run domain, component, storage, migration, import/export, and calculation tests.
3. Run Chromium critical-flow E2E and axe checks.
4. Run fixed-viewport Hebrew RTL visual comparisons.
5. If PDF behavior changed, generate the one-page, three-page, and stress fixtures; verify page/text/font/total assertions; render every page to PNG; inspect the images.
6. If storage/schema/backup behavior changed, run every migration fixture and a backup/restore round trip containing Hebrew, logo, revisions, and PDF Blobs; compare hashes and canonical records.
7. Exercise the relevant flow in the browser and inspect visible save/error/recovery state.
8. Run the dependency/security check and confirm no untrusted HTML, formula execution, remote runtime font, or false saved-state path was introduced.

Stop on a blocking failure. Fix it when the requested work authorizes implementation, then rerun the failed gate and any downstream gates whose evidence is invalidated.

## PDF inspection rule

Treat text extraction as necessary but insufficient. Open the latest rendered page images and inspect Hebrew direction, mixed LTR tokens, wrapping, clipping, repeated headers, chapter/subtotal placement, optional section, totals, logo, and page numbering. Never approve a PDF change without this visual pass.

## Report

Return a compact evidence report with:

- source revision/working-tree state;
- gates run and exact pass/fail counts;
- browser flows and viewports exercised;
- PDF fixtures/pages visually inspected;
- backup/migration fixtures exercised;
- unresolved risk, severity, and workaround;
- release decision: `ready`, `ready with stated limitation`, or `not ready`.

Do not label the release ready while a required gate is skipped, failing, or uninspected. State `not run` plainly when tooling is unavailable.
