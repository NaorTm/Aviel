export type DecimalString = string;
export type MoneyScale = 0 | 2;
export type ProjectStatus =
  | "draft"
  | "ready"
  | "sent"
  | "approved"
  | "rejected"
  | "cancelled"
  | "superseded";

export type Discount =
  | { type: "none" }
  | { type: "percent"; value: DecimalString }
  | { type: "fixed"; value: DecimalString };

export interface CompanyDetails {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  businessNumber: string;
}

export interface DocumentDefaults {
  vatRate: DecimalString;
  validityDays: number;
  currency: "ILS";
  moneyScale: MoneyScale;
  customerNotes: string;
  terms: string;
}

export interface Settings {
  id: "main";
  company: CompanyDetails;
  defaults: DocumentDefaults;
  logoArtifactId: string | null;
  lastExternalBackupAt: string | null;
  onboardingCompleted: boolean;
  updatedAt: string;
}

export interface Unit {
  id: string;
  nameHe: string;
  abbreviation: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  code: string | null;
  shortName: string;
  description: string;
  defaultChapterName: string | null;
  unitId: string | null;
  unitName: string;
  unitPrice: DecimalString | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourceSnapshot {
  sourceId: string;
  code: string | null;
  name: string;
  description: string;
  unitName: string;
  unitPrice: DecimalString | null;
  sourceUpdatedAt: string;
}

export interface ProjectItem {
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

export interface ProjectChapter {
  id: string;
  title: string;
  sortOrder: number;
  hiddenFromPdf: boolean;
  optional: boolean;
  discount: Discount;
  note: string | null;
  items: ProjectItem[];
}

export interface ProjectDetails {
  projectName: string;
  documentNumber: string;
  clientName: string;
  clientContact: string;
  address: string;
  location: string;
  creationDate: string;
  validityDate: string | null;
  status: ProjectStatus;
}

export interface DocumentPolicy {
  currency: "ILS";
  vatRate: DecimalString;
  moneyScale: MoneyScale;
  documentDiscount: Discount;
  calculationPolicyVersion: "boq-il-v1";
}

export interface Project {
  id: string;
  editVersion: number;
  details: ProjectDetails;
  companySnapshot: CompanyDetails;
  companyLogoArtifactId: string | null;
  templateOrigin: SourceSnapshot | null;
  policy: DocumentPolicy;
  chapters: ProjectChapter[];
  customerNotes: string;
  internalNotes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  vatRate: DecimalString;
  moneyScale: MoneyScale;
  customerNotes: string;
  terms: string;
  chapters: ProjectChapter[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  documentNumber: string;
  projectName: string;
  clientName: string;
  status: ProjectStatus;
  updatedAt: string;
  createdAt: string;
  templateOriginName: string | null;
  finalTotalMinor: number | null;
  editVersion: number;
  archivedAt: string | null;
  aggregate: Project;
}

export interface ItemCalculation {
  state: "priced" | "asRequired" | "missing" | "hidden";
  gross: DecimalString | null;
  discountAmount: DecimalString | null;
  net: DecimalString | null;
}

export interface ChapterCalculation {
  id: string;
  includedSubtotal: DecimalString;
  chapterDiscount: DecimalString;
  includedNet: DecimalString;
  optionalSubtotal: DecimalString;
  missingCount: number;
}

export interface ProjectCalculation {
  chapters: ChapterCalculation[];
  documentSubtotal: DecimalString;
  documentDiscount: DecimalString;
  taxableBase: DecimalString;
  vat: DecimalString;
  finalTotal: DecimalString;
  optionalSubtotal: DecimalString;
  missingCount: number;
  isComplete: boolean;
}

export interface Revision {
  id: string;
  projectId: string;
  number: number;
  reason: string;
  trigger: "manual" | "pdf" | "sent" | "approved";
  calculationPolicyVersion: "boq-il-v1";
  snapshot: Project;
  totals: ProjectCalculation;
  pdfArtifactId: string | null;
  createdAt: string;
}

export interface Artifact {
  id: string;
  kind: "logo" | "pdf";
  blob: Blob;
  mimeType: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
  revisionId: string | null;
  displayFilename: string;
}

export interface SavedPdfResult {
  revision: Revision;
  artifact: Artifact;
}

export const statusLabels: Record<ProjectStatus, string> = {
  draft: "טיוטה",
  ready: "מוכן",
  sent: "נשלח",
  approved: "אושר",
  rejected: "נדחה",
  cancelled: "בוטל",
  superseded: "הוחלף",
};
