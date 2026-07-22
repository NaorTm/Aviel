import { describe, expect, it } from "vitest";
import {
  calculateItem,
  calculateProject,
  canonicalDecimal,
  totalToMinor,
} from "../src/domain/calculations";
import {
  createDefaultSettings,
  createPrivateHouseTemplate,
  createProjectFromTemplate,
  emptyProjectItem,
} from "../src/domain/seed";

function project() {
  return createProjectFromTemplate(
    createPrivateHouseTemplate("2026-01-01T00:00:00.000Z"),
    createDefaultSettings("2026-01-01T00:00:00.000Z"),
    "Q-001",
    new Date("2026-01-01T00:00:00.000Z"),
  );
}

describe("decimal-safe financial rules", () => {
  it("canonicalizes valid decimal strings without binary floating point", () => {
    expect(canonicalDecimal("001.2300")).toBe("1.23");
    expect(canonicalDecimal("-2")).toBeNull();
    expect(canonicalDecimal("1,000")).toBeNull();
    expect(canonicalDecimal("")).toBeNull();
  });

  it("calculates item percentage and fixed discounts with HALF_UP rounding", () => {
    const entry = {
      ...emptyProjectItem(0),
      quantity: "3",
      unitPrice: "10.005",
      discount: { type: "percent", value: "10" } as const,
    };
    expect(calculateItem(entry, 2)).toEqual({
      state: "priced",
      gross: "30.02",
      discountAmount: "3.00",
      net: "27.02",
    });
    expect(
      calculateItem({ ...entry, discount: { type: "fixed", value: "2.01" } }, 2)
        .net,
    ).toBe("28.01");
  });

  it("accepts zero, fixed-price without quantity, and as-required without a numeric total", () => {
    expect(
      calculateItem(
        { ...emptyProjectItem(0), quantity: "0", unitPrice: "0" },
        2,
      ).net,
    ).toBe("0.00");
    expect(
      calculateItem(
        {
          ...emptyProjectItem(0),
          quantity: null,
          unitPrice: "120",
          fixedPrice: true,
        },
        2,
      ).net,
    ).toBe("120.00");
    expect(
      calculateItem(
        {
          ...emptyProjectItem(0),
          quantity: null,
          unitPrice: null,
          asRequired: true,
        },
        2,
      ).state,
    ).toBe("asRequired");
  });

  it("rejects negative values and excessive discounts", () => {
    expect(() =>
      calculateItem(
        {
          ...emptyProjectItem(0),
          unitPrice: "10",
          discount: { type: "percent", value: "101" },
        },
        2,
      ),
    ).toThrow();
    expect(() =>
      calculateItem(
        {
          ...emptyProjectItem(0),
          unitPrice: "10",
          discount: { type: "fixed", value: "11" },
        },
        2,
      ),
    ).toThrow();
  });

  it("applies document discount before VAT and separates optional totals", () => {
    const draft = project();
    draft.chapters = [
      {
        id: "chapter-main",
        title: "ראשי",
        sortOrder: 0,
        hiddenFromPdf: false,
        optional: false,
        discount: { type: "percent", value: "10" },
        note: null,
        items: [
          {
            ...emptyProjectItem(0),
            id: "main",
            quantity: "2",
            unitPrice: "100",
          },
          {
            ...emptyProjectItem(1),
            id: "optional",
            quantity: "1",
            unitPrice: "50",
            optional: true,
          },
          {
            ...emptyProjectItem(2),
            id: "hidden",
            quantity: "99",
            unitPrice: "99",
            hiddenFromPdf: true,
          },
        ],
      },
    ];
    draft.policy.documentDiscount = { type: "fixed", value: "10" };
    draft.policy.vatRate = "18";
    expect(calculateProject(draft)).toMatchObject({
      documentSubtotal: "180.00",
      documentDiscount: "10.00",
      taxableBase: "170.00",
      vat: "30.60",
      finalTotal: "200.60",
      optionalSubtotal: "50.00",
      missingCount: 0,
      isComplete: true,
    });
  });

  it("does not let an optional missing price block the main quotation", () => {
    const draft = project();
    draft.chapters = [
      {
        id: "chapter",
        title: "פרק",
        sortOrder: 0,
        hiddenFromPdf: false,
        optional: false,
        discount: { type: "none" },
        note: null,
        items: [{ ...emptyProjectItem(0), unitPrice: null, optional: true }],
      },
    ];
    expect(calculateProject(draft).isComplete).toBe(true);
  });

  it("converts exact totals to integer minor units", () => {
    expect(totalToMinor("200.60", 2)).toBe(20060);
    expect(totalToMinor("201", 0)).toBe(201);
  });
});
