import type {
  CatalogItem,
  CompanyDetails,
  Project,
  ProjectChapter,
  ProjectItem,
  Settings,
  Template,
  Unit,
} from "./types";

const terms = `המחירים כוללים אספקה, התקנה ובדיקה אלא אם צוין אחרת.
תוקף ההצעה הוא 30 ימים. ביצוע העבודה כפוף לתכניות המאושרות ולתנאי האתר.`;

export const emptyCompany: CompanyDetails = {
  name: "אביאל עבודות חשמל ותקשורת",
  tagline: "תכנון, ביצוע ותשתיות",
  address: "",
  phone: "",
  email: "",
  businessNumber: "",
};

export function createDefaultSettings(now = new Date().toISOString()): Settings {
  return {
    id: "main",
    company: emptyCompany,
    defaults: {
      vatRate: "18",
      validityDays: 30,
      currency: "ILS",
      moneyScale: 2,
      customerNotes: "נשמח לעמוד לרשותכם לכל שאלה והבהרה.",
      terms,
    },
    logoArtifactId: null,
    lastExternalBackupAt: null,
    onboardingCompleted: false,
    updatedAt: now,
  };
}

const unitNames = [
  ["meter", "מטר", "מ׳"],
  ["linear-meter", "מטר אורך", "מ״א"],
  ["point", "נקודה", "נק׳"],
  ["unit", "יחידה", "יח׳"],
  ["set", "סט", "סט"],
  ["lump-sum", "סכום כולל", "קומפ׳"],
  ["global", "גלובלי", "גלובלי"],
  ["workday", "יום עבודה", "י״ע"],
  ["hour", "שעה", "ש׳"],
  ["pair", "זוג", "זוג"],
  ["panel", "לוח", "לוח"],
  ["line", "קו", "קו"],
  ["kilogram", "קילוגרם", "ק״ג"],
  ["as-required", "לפי הצורך", "לפי הצורך"],
] as const;

export function createDefaultUnits(now = new Date().toISOString()): Unit[] {
  return unitNames.map(([id, nameHe, abbreviation], sortOrder) => ({
    id: `unit-${id}`,
    nameHe,
    abbreviation,
    isSystem: true,
    isActive: true,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  }));
}

function item(
  id: string,
  description: string,
  unitName: string,
  unitId: string,
  unitPrice: string | null,
  sortOrder: number,
): ProjectItem {
  return {
    id,
    sortOrder,
    title: null,
    description,
    unitId,
    unitName,
    quantity: "1",
    unitPrice,
    discount: { type: "none" },
    note: null,
    optional: false,
    hiddenFromPdf: false,
    fixedPrice: false,
    asRequired: unitId === "unit-as-required",
    source: "template",
    sourceSnapshot: null,
  };
}

const chapterSeeds = [
  ["conduits", "צנרת ותעלות", "התקנת צנרת חשמל תקנית סמויה או גלויה, כולל אביזרי חיבור", "מטר", "unit-meter", "32.00"],
  ["cables", "כבלים ומוליכים", "השחלת כבלי כוח ותקשורת לפי התכניות", "מטר", "unit-meter", "18.00"],
  ["excavation", "חפירות ושוחות", "חפירה, ריפוד, הנחת צנרת וכיסוי מושלם", "מטר אורך", "unit-linear-meter", "145.00"],
  ["panels", "לוחות חשמל ותקשורת", "אספקה והתקנת לוח חשמל מושלם כולל סימון ובדיקה", "לוח", "unit-panel", "4500.00"],
  ["earthing", "הארקה והגנות", "מערכת הארקה והשוואת פוטנציאלים בהתאם לתקן", "סכום כולל", "unit-lump-sum", "2800.00"],
  ["points", "נקודות חשמל ותקשורת", "נקודת חשמל מושלמת כולל צנרת, חיווט ואביזר קצה", "נקודה", "unit-point", "285.00"],
  ["exterior", "תשתיות חוץ וגינה", "הכנות והזנות חשמל לתאורת חוץ וגינה", "נקודה", "unit-point", "340.00"],
  ["future", "הכנות למערכות עתידיות", "הכנה לעמדת טעינה, מערכת סולארית, מצלמות ובית חכם", "יחידה", "unit-unit", null],
  ["testing", "בדיקות, חיבור ומסירה", "בדיקות מתקן, ביקורת חברת החשמל, הפעלה ומסירה", "סכום כולל", "unit-lump-sum", "3800.00"],
  ["general", "עבודות כלליות וחריגות", "עבודות נוספות לפי דרישה ובאישור מראש", "לפי הצורך", "unit-as-required", null],
] as const;

export function createPrivateHouseTemplate(now = new Date().toISOString()): Template {
  const chapters: ProjectChapter[] = chapterSeeds.map(
    ([key, title, description, unitName, unitId, unitPrice], sortOrder) => ({
      id: `template-private-${key}`,
      title,
      sortOrder,
      hiddenFromPdf: false,
      optional: key === "future",
      discount: { type: "none" },
      note: null,
      items: [item(`template-private-${key}-item-1`, description, unitName, unitId, unitPrice, 0)],
    }),
  );

  return {
    id: "template-private-house",
    name: "בית פרטי",
    description: "תבנית התחלה מלאה לעבודות חשמל, תקשורת ותשתיות בבית פרטי.",
    isActive: true,
    vatRate: "18",
    moneyScale: 2,
    customerNotes: "הכמויות הסופיות ייקבעו לפי תכניות העבודה המאושרות.",
    terms,
    chapters,
    createdAt: now,
    updatedAt: now,
  };
}

export function createSeedCatalog(now = new Date().toISOString()): CatalogItem[] {
  return chapterSeeds.map(([key, title, description, unitName, unitId, unitPrice], index) => ({
    id: `catalog-${key}`,
    code: `A-${String(index + 1).padStart(3, "0")}`,
    shortName: title,
    description,
    defaultChapterName: title,
    unitId,
    unitName,
    unitPrice,
    tags: key === "future" ? ["עתידי", "טעינה", "סולארי", "בית חכם"] : ["חשמל", title],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
}

function cloneId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createProjectFromTemplate(
  template: Template,
  settings: Settings,
  documentNumber: string,
  now = new Date(),
): Project {
  const createdAt = now.toISOString();
  const creationDate = createdAt.slice(0, 10);
  const validity = new Date(now);
  validity.setDate(validity.getDate() + settings.defaults.validityDays);
  const projectId = cloneId("project");

  return {
    id: projectId,
    editVersion: 0,
    details: {
      projectName: "פרויקט חדש",
      documentNumber,
      clientName: "",
      clientContact: "",
      address: "",
      location: "",
      creationDate,
      validityDate: validity.toISOString().slice(0, 10),
      status: "draft",
    },
    companySnapshot: structuredClone(settings.company),
    companyLogoArtifactId: settings.logoArtifactId,
    templateOrigin: {
      sourceId: template.id,
      code: null,
      name: template.name,
      description: template.description ?? "",
      unitName: "",
      unitPrice: null,
      sourceUpdatedAt: template.updatedAt,
    },
    policy: {
      currency: "ILS",
      vatRate: template.vatRate,
      moneyScale: template.moneyScale,
      documentDiscount: { type: "none" },
      calculationPolicyVersion: "boq-il-v1",
    },
    chapters: template.chapters.map((chapter, chapterIndex) => ({
      ...structuredClone(chapter),
      id: cloneId("chapter"),
      sortOrder: chapterIndex,
      items: chapter.items.map((sourceItem, itemIndex) => ({
        ...structuredClone(sourceItem),
        id: cloneId("item"),
        sortOrder: itemIndex,
        source: "template",
        sourceSnapshot: {
          sourceId: sourceItem.id,
          code: null,
          name: sourceItem.title ?? sourceItem.description,
          description: sourceItem.description,
          unitName: sourceItem.unitName,
          unitPrice: sourceItem.unitPrice,
          sourceUpdatedAt: template.updatedAt,
        },
      })),
    })),
    customerNotes: template.customerNotes || settings.defaults.customerNotes,
    internalNotes: "",
    terms: template.terms || settings.defaults.terms,
    createdAt,
    updatedAt: createdAt,
  };
}

export function emptyProjectItem(sortOrder: number): ProjectItem {
  return {
    id: cloneId("item"),
    sortOrder,
    title: null,
    description: "פריט חדש",
    unitId: "unit-unit",
    unitName: "יחידה",
    quantity: "1",
    unitPrice: null,
    discount: { type: "none" },
    note: null,
    optional: false,
    hiddenFromPdf: false,
    fixedPrice: false,
    asRequired: false,
    source: "manual",
    sourceSnapshot: null,
  };
}

export function emptyProjectChapter(sortOrder: number): ProjectChapter {
  return {
    id: cloneId("chapter"),
    title: "פרק חדש",
    sortOrder,
    hiddenFromPdf: false,
    optional: false,
    discount: { type: "none" },
    note: null,
    items: [emptyProjectItem(0)],
  };
}
