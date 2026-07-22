# Aviel BOQ engineering rules

## Product boundaries

- Build a single-user, local-first Hebrew RTL bill-of-quantities application. Do not add accounts, roles, tenants, payments, portals, or SaaS administration.
- Treat IndexedDB as authoritative business storage and keep all access behind `src/storage`. `localStorage` may hold non-critical UI preferences only.
- Never mutate catalog items, templates, project snapshots, revisions, or PDF artifacts through shared object references.

## Architecture

- Keep domain logic in `src/domain`, persistence in `src/storage`, import/export in `src/import-export`, PDF rendering in `src/pdf`, and UI in `app` and `src/components`.
- Use strict TypeScript. Do not introduce `any` at domain or storage boundaries; validate untrusted data with Zod.
- Store money, quantities, percentages, and rates as canonical decimal strings. Use `decimal.js` for all arithmetic. Never use JavaScript `number` arithmetic for money.
- Store empty monetary input as `null`, never as zero. Reject negative values and discounts above their eligible base.
- Keep historical revisions and their PDF artifact hashes immutable.

## Hebrew and accessibility

- Every route must render under `<html lang="he" dir="rtl">`.
- Use CSS logical properties and semantic HTML. Isolate mixed-direction values with `dir="ltr"`, `dir="auto"`, or `<bdi>` as appropriate.
- Preserve native input arrow-key behavior. Provide visible and keyboard alternatives for drag operations.
- Do not add `role="grid"` unless the complete WAI-ARIA grid keyboard model is implemented and tested.

## Safety and recovery

- Autosave status may say “saved” only after the IndexedDB transaction commits.
- A failed save, migration, import, or restore must preserve the previous committed data and expose a Hebrew recovery action.
- Never reset or delete the database automatically after an error. Offer backup export/recovery instead.
- Validate file signatures, extensions, sizes, shapes, row counts, and cell lengths. Never render imported HTML or execute spreadsheet formulas.

## Required checks

- Calculation changes require golden-vector and invariant tests and a `calculationPolicyVersion` review.
- Schema changes require migration fixtures and a full backup/restore round trip.
- Meaningful PDF changes require a generated multi-page Hebrew fixture, text/font/page assertions, rendering every page to PNG, and visual inspection.
- Before release run typecheck, lint, unit/integration tests, production build, Chromium E2E, axe, RTL visual checks, PDF checks, and backup/restore checks.

## Definition of done

- Code exists, the relevant user flow has been exercised, automated checks pass, and recovery behavior has been verified.
- Do not hard-code business data except explicit seed/demo content.
- Do not modify or delete unrelated user files.
