# Product requirements

## 1. Product definition

Aviel BOQ is a single-user, local-first desktop-style web application for preparing Hebrew electrical, communication, and infrastructure bills of quantities and quotations. It is not a SaaS product. The application shell may be hosted privately, but business data remains in the browser profile and is portable through explicit backup files.

Primary outcome: a contractor can start from a reusable template, freely tailor the resulting project, see exact totals immediately, create immutable revisions, and download a polished Hebrew RTL PDF.

## 2. Personas and environment

- Primary user: electrical/communications contractor or estimator.
- Primary device: Windows desktop, current Chromium browser, 1440 px or wider.
- Secondary device: basic tablet at 1024 px width.
- Language: Hebrew first; codes, telephone numbers, email, measurements, and quote numbers may be LTR fragments.
- Data ownership: the user controls the browser profile, exports, company details, projects, and artifacts.

## 3. Product principles

1. Fast path first: creating a quote from a template takes no more than one selection plus project details.
2. Copy, never link: projects own snapshots of template and catalog data.
3. Exact and explainable: every displayed total has one deterministic calculation path.
4. Safe by default: autosave, undo for local edits, immutable revisions, stale-tab protection, and portable backups.
5. Hebrew is structural: RTL, mixed-direction isolation, keyboard order, and PDF layout are acceptance criteria.
6. Desktop efficiency: compact controls, sticky context, inline editing, and visible status.

## 4. In-scope modules

### Dashboard

- Recent projects ordered by last edit.
- Create-project command with template selection.
- Search by project, client, address, or document number.
- Draft/Sent summary counts and latest external backup reminder.

### Projects

- Search/filter by status, client, date, and template origin.
- Columns: document number, project, client, status, updated date, revision, and final total.
- Actions: open, duplicate, export, archive, and delete-to-trash.
- Permanent deletion requires an explicit second confirmation and is unavailable for the currently open project.

### Project editor

- Project/client/company snapshot fields and document policy fields.
- Ordered chapter sections with inline semantic tables.
- Add, duplicate, rename, hide, mark optional, move, and remove chapters.
- Add manual/catalog items; duplicate, edit, hide, mark optional/as-required/fixed-price, move, and remove items.
- Sticky totals panel, validation summary, save state, preview, create-revision, and export actions.
- Native Tab/Shift+Tab traversal; Enter commits single-line fields; Escape restores the pre-edit value.

### Templates

- Create, edit, duplicate, archive, and delete templates.
- Template contains VAT, terms, notes, ordered chapters, and ordered item defaults.
- Creating a project performs a deep copy in one transaction.

### Catalog

- Search and filter by active state, chapter, unit, and tag.
- Create, edit, duplicate, deactivate, import, and export.
- Catalog edits affect only future insertions.

### Units and company settings

- Seed standard units and allow custom units.
- Custom unit rename affects only live references to that unit ID; historical revision display text is snapshotted.
- Company name, tagline, address, phone, email, business/tax number, logo, VAT, validity, terms, notes, currency, precision, and PDF styling.

### Revisions and artifacts

- Revision creation freezes the project/company snapshot, totals, calculation policy, and source provenance.
- Marking Sent or Approved requires a revision; editing a Sent/Approved project creates a draft for the next revision after confirmation.
- PDF bytes are immutable and linked by SHA-256 to one revision.
- Old revisions remain readable and downloadable.

### Import, export, and backup

- Catalog CSV and XLSX import/export.
- Project list CSV export.
- Per-project JSON export for support/recovery.
- Full `.boqbackup` export and staged restore with manifest, versions, checksums, Blobs, preview, and atomic commit.

## 5. Default Private House template

The seed template contains these ordered chapters, with demo items clearly marked as editable seed content:

1. Conduits and piping.
2. Cables and conductors.
3. Excavation and chambers.
4. Electrical and communication panels.
5. Earthing and protection.
6. Electrical and communication points.
7. Exterior and garden infrastructure.
8. Future preparations: EV, solar PV, cameras, intercom, and smart home.
9. Testing, utility inspection, connection, commissioning, and handover.
10. General and exceptional works.

## 6. Explicit exclusions

- Registration, application login, roles, permissions, tenants, sharing, customer portal, online payment, CRM, inventory, accounting, e-signature, and real-time collaboration.
- Automatic price propagation from catalog/template to existing projects.
- Macro-enabled or legacy spreadsheet import.
- Negative/credit line items in v1.
- Guaranteed offline installation/PWA in v1; data operations remain local after the shell loads.

## 7. Functional acceptance

The release is accepted only when the 15 workflows in the project brief pass. Additional gates:

- A 10-chapter/500-item project remains editable without lost focus or full-page rerenders per keystroke.
- Two tabs cannot silently overwrite the same project.
- A quota/save failure never displays a false saved state.
- A backup with Hebrew, logo, revisions, and PDFs restores byte-for-byte artifact hashes.
- A three-page fixture proves embedded Hebrew font, correct mixed-direction text, repeated headers, page numbers, and totals.
- Every destructive or financially significant operation offers correction, undo, or confirmation.

## 8. Success measures

- New quote from template to editable screen in under 30 seconds of user input.
- Typical inline edit reflected in totals immediately and committed within 400 ms after idle.
- Zero calculation mismatches across golden and property tests.
- Zero serious/critical axe findings in critical screens.
- Zero clipped/overlapping/missing-glyph defects in the release PDF fixture.
