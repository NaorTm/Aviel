# Data model

## 1. Version fields

- `databaseSchemaVersion`: physical Dexie migration version.
- `backupFormatVersion`: portable backup contract.
- `calculationPolicyVersion`: immutable calculation/rounding behavior.
- `project.editVersion`: optimistic-concurrency generation.
- `revision.number`: immutable commercial revision number within a project.

All IDs are UUID strings. All timestamps are UTC ISO 8601 strings. Dates printed on documents are stored as `YYYY-MM-DD`. Money, quantities, percentages, and rates are canonical decimal strings or `null`.

## 2. Tables

### `settings`

Singleton key `main`.

```ts
interface Settings {
  id: "main";
  company: CompanyDetails;
  defaults: DocumentDefaults;
  logoArtifactId: string | null;
  lastExternalBackupAt: string | null;
  onboardingCompleted: boolean;
  updatedAt: string;
}
```

### `units`

`id`, `nameHe`, `abbreviation`, `isSystem`, `isActive`, `sortOrder`, timestamps. System units can be deactivated but not permanently deleted while referenced. Project/revision items also snapshot `unitName`.

### `catalogItems`

`id`, optional unique `code`, `shortName`, `description`, optional `defaultChapterName`, `unitId`, `unitName`, `unitPrice`, `tags[]`, `isActive`, timestamps. `unitPrice` is nullable and never defaults to zero.

### `templates`

One aggregate per template:

```ts
interface Template {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  vatRate: DecimalString;
  moneyScale: 0 | 2;
  customerNotes: string;
  terms: string;
  chapters: TemplateChapter[];
  createdAt: string;
  updatedAt: string;
}
```

### `projects`

One mutable aggregate plus indexed projection fields:

```ts
interface ProjectRecord {
  id: string;
  documentNumber: string;
  projectName: string;
  clientName: string;
  status: ProjectStatus;
  updatedAt: string;
  createdAt: string;
  templateOriginName: string | null;
  finalTotalMinor: number | null; // indexed projection only, bounded safe integer
  editVersion: number;
  aggregate: Project;
}
```

`aggregate` is the source of truth. Projection fields are checked/rebuilt on write and migration.

### `revisions`

`id`, `projectId`, `number`, `reason`, `createdAt`, `trigger` (`manual|pdf|sent|approved`), `calculationPolicyVersion`, immutable `snapshot`, immutable `totals`, optional `pdfArtifactId`. Unique compound key `[projectId+number]`.

### `artifacts`

`id`, `kind` (`logo|pdf`), `blob`, `mimeType`, `byteSize`, `sha256`, `createdAt`, optional `revisionId`, original display filename. Stored names/IDs are generated, not user-controlled.

### `trash`

Recoverable tombstones for projects/templates/catalog entries with `entityType`, `entityId`, `payload`, `deletedAt`, and optional `purgeAfter`. Revisions and PDFs are not automatically purged.

## 3. Project aggregate

```ts
interface Project {
  id: string;
  editVersion: number;
  details: ProjectDetails;
  companySnapshot: CompanyDetails;
  templateOrigin: SourceSnapshot | null;
  policy: DocumentPolicy;
  chapters: ProjectChapter[];
  customerNotes: string;
  internalNotes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
}
```

`ProjectDetails` contains project/document number, client/contact, address/location, creation/validity dates, and status.

`DocumentPolicy` contains currency (`ILS` in v1), VAT rate, money scale, document discount, rounding mode, and `calculationPolicyVersion`.

## 4. Chapters and items

```ts
interface ProjectChapter {
  id: string;
  title: string;
  sortOrder: number;
  hiddenFromPdf: boolean;
  optional: boolean;
  discount: Discount;
  note: string | null;
  items: ProjectItem[];
}

interface ProjectItem {
  id: string;
  sortOrder: number;
  title: string | null;
  description: string;
  unitId: string | null;
  unitName: string;
  quantity: DecimalString | null;
  unitPrice: DecimalString | null;
  discount: Discount;
  note: string | null;
  optional: boolean;
  hiddenFromPdf: boolean;
  fixedPrice: boolean;
  asRequired: boolean;
  source: "manual" | "template" | "catalog";
  sourceSnapshot: SourceSnapshot | null;
}
```

`Discount` is `{ type: "none" } | { type: "percent"; value: DecimalString } | { type: "fixed"; value: DecimalString }`.

`SourceSnapshot` records source ID, optional code, name/description/unit/price at copy time, and source updated time. It is provenance only and never dereferenced to recalculate the project.

## 5. Revision snapshot

A revision embeds:

- company details and logo artifact hash;
- full project details, chapters, items, flags, terms, and notes;
- exact decimal input strings;
- source snapshots;
- calculation result tree and policy version;
- PDF styling version.

Revisions never reference live catalog/template/unit/settings records for content. A PDF artifact may be attached once; regeneration creates a new artifact record and requires an explicit reason while preserving the old bytes.

## 6. Indexes

- units: `nameHe`, `isActive`, `sortOrder`.
- catalog: `&code`, `shortName`, `isActive`, `*tags`, `updatedAt`.
- templates: `name`, `isActive`, `updatedAt`.
- projects: `documentNumber`, `projectName`, `clientName`, `status`, `updatedAt`, `createdAt`, `finalTotalMinor`.
- revisions: `[projectId+number]`, `projectId`, `createdAt`.
- artifacts: `revisionId`, `kind`, `sha256`.
- trash: `[entityType+entityId]`, `deletedAt`.

## 7. Invariants

- IDs are stable across reorder; `sortOrder` is canonical and normalized to gaps of 100 after structural edits.
- Descriptions and chapter titles are non-empty after trim.
- Decimal strings match the domain grammar and limits; null and zero remain distinct.
- Percentage discounts are 0–100; fixed discounts do not exceed their eligible base.
- Hidden entities contribute no totals and do not appear in PDF.
- A catalog/template edit cannot traverse into projects.
- Revisions and revision-linked artifacts are immutable.
- Every PDF artifact hash and byte size match its Blob.
- Indexed project projections equal values derived from the aggregate.
