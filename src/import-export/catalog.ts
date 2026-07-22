import Papa from "papaparse";
import { z } from "zod";
import { canonicalDecimal } from "../domain/calculations";
import type { CatalogItem } from "../domain/types";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const allowedExtensions = new Set(["csv", "xlsx"]);

const CatalogRow = z.object({
  code: z.string().max(80).optional().default(""),
  shortName: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(4000),
  chapter: z.string().max(180).optional().default(""),
  unit: z.string().trim().min(1).max(80),
  unitPrice: z.union([z.string(), z.number()]).optional().nullable(),
  tags: z.string().max(1000).optional().default(""),
  active: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .default(true),
});

type CatalogRowInput = z.input<typeof CatalogRow>;

const headerAliases: Record<string, keyof CatalogRowInput> = {
  code: "code",
  קוד: "code",
  shortname: "shortName",
  name: "shortName",
  "שם קצר": "shortName",
  שם: "shortName",
  description: "description",
  תיאור: "description",
  "תיאור מלא": "description",
  chapter: "chapter",
  פרק: "chapter",
  unit: "unit",
  יחידה: "unit",
  unitprice: "unitPrice",
  price: "unitPrice",
  מחיר: "unitPrice",
  "מחיר יחידה": "unitPrice",
  tags: "tags",
  תגיות: "tags",
  active: "active",
  פעיל: "active",
};

function normalizeHeader(value: string): keyof CatalogRowInput | null {
  return (
    headerAliases[
      value
        .trim()
        .toLocaleLowerCase("he-IL")
        .replaceAll("_", "")
        .replaceAll(" ", " ")
    ] ?? null
  );
}

function normalizeRow(raw: Record<string, unknown>): CatalogRowInput {
  const result: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(header);
    if (normalized) result[normalized] = value;
  }
  return result as CatalogRowInput;
}

function activeValue(value: string | number | boolean): boolean {
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLocaleLowerCase("he-IL");
  return !["0", "false", "לא", "inactive", "כבוי"].includes(normalized);
}

export interface CatalogImportResult {
  items: CatalogItem[];
  errors: string[];
}

export async function importCatalogFile(
  file: File,
): Promise<CatalogImportResult> {
  const extension =
    file.name.split(".").pop()?.toLocaleLowerCase("en-US") ?? "";
  if (!allowedExtensions.has(extension))
    throw new Error("ניתן לייבא קובצי CSV או XLSX בלבד");
  if (file.size > MAX_IMPORT_BYTES) throw new Error("קובץ הייבוא גדול מ־5MB");
  if (file.size === 0) throw new Error("קובץ הייבוא ריק");

  let rows: Record<string, unknown>[];
  if (extension === "csv") {
    const parsed = Papa.parse<Record<string, unknown>>(await file.text(), {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
    });
    if (parsed.errors.length)
      throw new Error(`CSV לא תקין: ${parsed.errors[0].message}`);
    rows = parsed.data;
  } else {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: "array",
      cellDates: false,
    });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error("קובץ Excel אינו מכיל גיליון");
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[firstSheet],
      { defval: "", raw: false },
    );
  }

  if (rows.length > 10_000)
    throw new Error("קובץ הייבוא מכיל יותר מ־10,000 שורות");
  const now = new Date().toISOString();
  const items: CatalogItem[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const parsed = CatalogRow.safeParse(normalizeRow(row));
    if (!parsed.success) {
      errors.push(
        `שורה ${index + 2}: ${parsed.error.issues[0]?.message ?? "נתונים לא תקינים"}`,
      );
      return;
    }
    const rawPrice =
      parsed.data.unitPrice === null || parsed.data.unitPrice === ""
        ? null
        : String(parsed.data.unitPrice);
    const price = canonicalDecimal(rawPrice);
    if (rawPrice !== null && price === null) {
      errors.push(`שורה ${index + 2}: מחיר יחידה אינו מספר עשרוני תקין`);
      return;
    }
    items.push({
      id: `catalog-${crypto.randomUUID()}`,
      code: parsed.data.code.trim() || null,
      shortName: parsed.data.shortName,
      description: parsed.data.description,
      defaultChapterName: parsed.data.chapter.trim() || null,
      unitId: null,
      unitName: parsed.data.unit,
      unitPrice: price,
      tags: parsed.data.tags
        .split(/[,;|]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      isActive: activeValue(parsed.data.active),
      createdAt: now,
      updatedAt: now,
    });
  });

  if (items.length === 0)
    throw new Error(errors[0] ?? "לא נמצאו שורות תקינות לייבוא");
  return { items, errors };
}

function safeSpreadsheetText(value: string | null): string {
  if (!value) return "";
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function exportRows(items: CatalogItem[]) {
  return items.map((item) => ({
    קוד: safeSpreadsheetText(item.code),
    "שם קצר": safeSpreadsheetText(item.shortName),
    "תיאור מלא": safeSpreadsheetText(item.description),
    פרק: safeSpreadsheetText(item.defaultChapterName),
    יחידה: safeSpreadsheetText(item.unitName),
    "מחיר יחידה": item.unitPrice ?? "",
    תגיות: safeSpreadsheetText(item.tags.join(", ")),
    פעיל: item.isActive ? "כן" : "לא",
  }));
}

export function exportCatalogCsv(items: CatalogItem[]): Blob {
  const csv = Papa.unparse(exportRows(items), { newline: "\r\n" });
  return new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
}

export async function exportCatalogXlsx(items: CatalogItem[]): Promise<Blob> {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(exportRows(items));
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 60 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 },
    { wch: 10 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "קטלוג");
  const bytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
