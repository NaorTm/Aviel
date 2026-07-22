import { describe, expect, it } from "vitest";
import {
  exportCatalogCsv,
  importCatalogFile,
} from "../src/import-export/catalog";

describe("catalog import and export boundary", () => {
  it("imports Hebrew CSV headers and exact decimal prices", async () => {
    const csv =
      "\uFEFFקוד,שם קצר,תיאור מלא,פרק,יחידה,מחיר יחידה,תגיות,פעיל\r\nA-1,נקודה,נקודת חשמל מלאה,נקודות,נקודה,285.50,חשמל|פנים,כן";
    const result = await importCatalogFile(
      new File([csv], "catalog.csv", { type: "text/csv" }),
    );
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({
      code: "A-1",
      shortName: "נקודה",
      unitPrice: "285.5",
      tags: ["חשמל", "פנים"],
      isActive: true,
    });
  });

  it("rejects unsupported files and neutralizes spreadsheet formulas on export", async () => {
    await expect(
      importCatalogFile(new File(["x"], "catalog.txt", { type: "text/plain" })),
    ).rejects.toThrow(/CSV|XLSX/);
    const now = new Date().toISOString();
    const blob = exportCatalogCsv([
      {
        id: "1",
        code: "=2+2",
        shortName: "+cmd",
        description: "@formula",
        defaultChapterName: null,
        unitId: null,
        unitName: "יחידה",
        unitPrice: "1",
        tags: [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const csv = await blob.text();
    expect(csv).toContain("'=2+2");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'@formula");
  });
});
