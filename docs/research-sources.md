# Research sources and conclusions

Research performed July 22, 2026. Primary/official documentation is preferred; repository issues are used only to identify capability gaps.

## Hebrew RTL and accessibility

- [W3C RTL HTML authoring](https://www.w3.org/International/docs/bp-html-bidi/Overview): put `dir="rtl"` on the root, keep logical character/DOM order, and use UTF-8.
- [W3C structural direction](https://www.w3.org/International/questions/qa-html-dir.en.html) and [inline bidi markup](https://www.w3.org/International/articles/inline-bidi-markup/index.en.html): prefer HTML direction metadata, `dir="auto"`, and isolation over CSS overrides or reversed strings.
- [CSS Logical Properties](https://www.w3.org/TR/css-logical-1/): use inline/block logical spacing and borders so layouts follow direction safely.
- [WAI-ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/): an ARIA grid is a composite widget requiring complete managed focus; v1 retains semantic tables and native Tab order.
- [WCAG 2.2 dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements): every drag action needs a non-drag alternative.

## Desktop tables and reordering

- [TanStack Table overview](https://tanstack.com/table/latest/docs/overview), [filtering guide](https://tanstack.com/table/latest/docs/guide/column-filtering), and [examples](https://tanstack.com/table/latest/docs/framework/examples): headless typed list behavior preserves control over Hebrew DOM and semantics.
- [dnd-kit accessibility](https://dndkit.com/legacy/guides/accessibility) and [sortable preset](https://docs.dndkit.com/presets/sortable): provide keyboard sensors and localized live announcements; persist canonical order separately from filters.
- [Microsoft commanding basics](https://learn.microsoft.com/en-us/windows/apps/design/basics/commanding-basics): frequent actions belong in visible command surfaces, secondary actions in context menus.

## PDF and fonts

- [React-pdf v4 styling](https://react-pdf.org/styling): documents support A4/flex styling and documented `direction: rtl`.
- [React-pdf fonts](https://react-pdf.org/fonts): register static TTF/WOFF faces; variable fonts are unsuitable. Fonts are bundled and pinned.
- [React-pdf advanced layout](https://react-pdf.org/advanced): page wrapping, unbreakable blocks, explicit breaks, fixed repeated content, dynamic page numbers, and Blob/download rendering support the selected proof path.
- [Chrome DevTools `printToPDF`](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF), [Puppeteer PDF options](https://pptr.dev/api/puppeteer.pdfoptions), and [Playwright `page.pdf`](https://playwright.dev/docs/api/class-page#page-pdf): define the fallback local Chromium adapter and its CSS-page-size/font readiness constraints.
- [CSS Paged Media](https://www.w3.org/TR/css-page-3/) and [CSS Fragmentation](https://www.w3.org/TR/css-break-3/): page size and break avoidance are explicit but avoidance is not an absolute guarantee.
- [Noto Sans Hebrew specimen](https://notofonts.github.io/noto-docs/specimen/NotoSansHebrew/): use static Hebrew-capable faces and retain the OFL.
- [veraPDF validation](https://docs.verapdf.org/validation/): use only when claiming PDF/A/UA; raster/text/font checks remain necessary for ordinary PDFs.

Conclusion: pdfmake was rejected because its maintainers still identify RTL as unsupported ([issue #2563](https://github.com/bpampuch/pdfmake/issues/2563)). Browser `window.print()` was rejected because it cannot return the exact bytes that must be archived. React-pdf v4 receives a mandatory Hebrew proof gate; deterministic local Chromium is the clean fallback.

## Local-first persistence and safety

- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) and [usage guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB): transactional structured storage is origin-bound; normal shutdown cannot guarantee a final transaction.
- [MDN quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [`StorageManager.persist`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist), and [`estimate`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate): request persistence and expose capacity, but external backup remains mandatory.
- [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction%28%29), [migrations](https://dexie.org/docs/Version/Version.upgrade%28%29), and [export/import](https://dexie.org/docs/ExportImport/dexie-export-import): support atomic aggregates, forward migrations, Blobs, staged backups, and progress.
- [MDN Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) and [`beforeunload`](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event): lock project editing across tabs and do not rely on unload for saving.
- [Cloudflare D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/) and [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/): D1 is viable for a future cloud-backed edition, but is not selected for this explicitly device-local v1.

## Money and validation

- [decimal.js API](https://mikemcl.github.io/decimal.js/): arbitrary-precision decimal values and explicit half-up rounding avoid binary floating-point money errors.
- [Zod 4](https://zod.dev/packages/zod): validate and type untrusted import/backup/form boundaries.
- [MDN `Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat): use for Hebrew ILS presentation only.

Conclusion: canonical decimal strings are persisted; `decimal.js` performs all arithmetic; rounding is versioned and tested at item/chapter/document boundaries.

## CSV and Excel

- [RFC 4180](https://datatracker.ietf.org/doc/rfc4180/): stable CSV quoting and CRLF conventions.
- [Papa Parse docs](https://www.papaparse.com/docs): browser parsing/unparsing, worker support, and formula escaping.
- [SheetJS API](https://docs.sheetjs.com/docs/api/), [parsing options](https://docs.sheetjs.com/docs/api/parse-options/), and [local files](https://docs.sheetjs.com/docs/demos/local/file/): parse ArrayBuffers, map worksheets, and write XLSX/CSV client-side.
- [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection): neutralize formula prefixes on export and reject formulas in required import fields.

Conclusion: import is map→preview→validate→atomic commit, all values are treated as untrusted text, and SheetJS CE is pinned from its authoritative distribution rather than an outdated registry package.

## Testing and security

- [Vitest features](https://vitest.dev/guide/features) and [coverage](https://vitest.dev/guide/coverage.html): Vite-aligned TypeScript tests and coverage.
- [Testing Library principles](https://testing-library.com/docs/react-testing-library/intro/): test user-visible DOM behavior rather than implementation details.
- [Playwright best practices](https://playwright.dev/docs/best-practices), [visual comparisons](https://playwright.dev/docs/test-snapshots), and [accessibility testing](https://playwright.dev/docs/accessibility-testing): real workflows, stable same-environment screenshots, axe plus mandatory manual assessment.
- [PDF.js examples](https://mozilla.github.io/pdf.js/examples/): render/inspect generated documents independently of the authoring library.
- [OWASP input validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) and [file upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): allowlist types, verify signatures, generate storage IDs, bound sizes, and store outside executable web content.

## Codex project workflows

- [Codex skills](https://learn.chatgpt.com/docs/build-skills) and [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md): use root guidance for durable repository rules and a repo-scoped skill for a repeated multi-check release workflow.

Evaluation:

- Hebrew RTL QA: belongs in the release skill because it is a repeatable manual+automated checklist.
- PDF generation/visual validation: belongs in the same release skill and deterministic scripts; the general PDF skill already covers file mechanics.
- Financial validation: enforced primarily by domain tests and root rules, then invoked by the release skill.
- Migration/backup validation: enforced by fixtures/scripts and invoked by the release skill.
- Release readiness: warrants one focused repo skill that orchestrates the above evidence. Five separate skills would add trigger/context overhead without improving reliability.
