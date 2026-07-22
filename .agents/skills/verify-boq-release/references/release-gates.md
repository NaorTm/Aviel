# Release gates

## Evidence matrix

| Area | Minimum evidence | Blocks release |
| --- | --- | --- |
| Types/build | Strict typecheck, lint, production build | Yes |
| Finance | Golden vectors, edge cases, invariants, revision replay | Yes |
| Persistence | Real IndexedDB autosave/reload, rollback, stale-tab conflict | Yes |
| Migration | Every supported fixture upgrades without ID/order/total/hash loss | Yes after schema changes |
| Backup | Hebrew/logo/revision/PDF Blob round trip; corrupt/newer input leaves live DB unchanged | Yes |
| Import/export | CSV/XLSX fixture matrix, formula rejection/escaping, atomic commit | Yes when enabled |
| RTL/accessibility | `lang/dir`, keyboard flow, axe, 1440×900 and 1024 px visuals, mixed bidi | Yes |
| PDF | A4/page/text/font/total checks, repeated headers, all pages rasterized and inspected | Yes when enabled or changed |
| Security | File limits/signatures, no user HTML, no remote runtime code/font, dependency audit | Yes for high severity |
| Performance | 500-item editor and 200-row PDF budgets | Yes for release candidate |

## Required commercial workflows

1. Create a project from the Private House template.
2. Edit, duplicate, hide, reorder, and remove chapters/items.
3. Edit description, unit, quantity, unit price, discounts, and notes inline.
4. Change catalog price from 285 to 310; old project remains 285 and new insertion uses 310.
5. Reload with exact strings, order, flags, and totals intact.
6. Create a revision, generate/download its PDF, edit the draft, and retrieve the old revision/PDF unchanged.
7. Import/export catalog CSV/XLSX.
8. Export/restore a full backup and compare canonical data and artifact hashes.

## PDF visual checklist

- Logical Hebrew order and punctuation are correct.
- Codes, quote numbers, phone/email, measurements, percentages, and ILS do not reorder adjacent Hebrew.
- No clipped/overlapping/missing glyphs or blank interior pages.
- Long descriptions wrap; a chapter heading is not orphaned.
- Continuation pages repeat the correct column header.
- Hidden/internal content is absent; optional/as-required/missing-price states are unambiguous.
- Chapter subtotals, document discount, VAT, final total, terms, logo, and `X מתוך Y` are correct.

## Report template

```text
Decision: ready | ready with stated limitation | not ready
Source: <branch/commit or dirty-worktree summary>
Passed: <gates>
Failed: <gates and evidence>
Not run: <gates and reason>
Browser: <flows/viewports/accessibility>
PDF: <fixtures/pages/visual result>
Data safety: <migration/backup/conflict result>
Risks: <severity, user impact, workaround>
```
