// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createDefaultSettings,
  createPrivateHouseTemplate,
  createProjectFromTemplate,
} from "../src/domain/seed";
import { renderQuotePdf } from "../src/pdf/quote-document";

describe("Hebrew PDF generation", () => {
  it("produces a non-empty multi-section PDF blob using embedded local fonts", async () => {
    const project = createProjectFromTemplate(
      createPrivateHouseTemplate(),
      createDefaultSettings(),
      "Q-PDF-1",
      new Date("2026-07-22T00:00:00.000Z"),
    );
    project.details.projectName = "בדיקת עברית ומסמך מרובה עמודים";
    project.chapters[0].items[0].description =
      "תיאור עברי ארוך שנועד לבדוק גלישת טקסט בתוך עמודת התיאור מבלי לחתוך אותיות, מספרים או סימני פיסוק.";
    const blob = await renderQuotePdf(project);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(15_000);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  }, 30_000);
});
