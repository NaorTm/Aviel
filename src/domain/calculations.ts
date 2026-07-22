import Decimal from "decimal.js";
import type {
  ChapterCalculation,
  DecimalString,
  Discount,
  ItemCalculation,
  MoneyScale,
  Project,
  ProjectCalculation,
  ProjectItem,
} from "./types";

const FinanceDecimal = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;

export function isDecimalString(value: unknown): value is DecimalString {
  return typeof value === "string" && DECIMAL_PATTERN.test(value) && new FinanceDecimal(value).isFinite();
}

export function canonicalDecimal(value: string | null): DecimalString | null {
  if (value === null || value.trim() === "") return null;
  const trimmed = value.trim();
  if (!isDecimalString(trimmed)) return null;
  return new FinanceDecimal(trimmed).toFixed();
}

function decimal(value: DecimalString): Decimal {
  if (!isDecimalString(value)) throw new Error(`Invalid decimal value: ${value}`);
  return new FinanceDecimal(value);
}

function rounded(value: Decimal, scale: MoneyScale): Decimal {
  return value.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
}

function fixed(value: Decimal, scale: MoneyScale): DecimalString {
  return value.toFixed(scale);
}

function discountAmount(base: Decimal, discount: Discount, scale: MoneyScale): Decimal {
  if (discount.type === "none") return new FinanceDecimal(0);
  const value = decimal(discount.value);
  if (value.isNegative()) throw new Error("Discount cannot be negative");
  if (discount.type === "percent") {
    if (value.greaterThan(100)) throw new Error("Percentage discount cannot exceed 100");
    return rounded(base.mul(value).div(100), scale);
  }
  if (value.greaterThan(base)) throw new Error("Fixed discount cannot exceed its base");
  return rounded(value, scale);
}

export function calculateItem(item: ProjectItem, scale: MoneyScale): ItemCalculation {
  if (item.hiddenFromPdf) {
    return { state: "hidden", gross: null, discountAmount: null, net: null };
  }
  if (item.asRequired) {
    return { state: "asRequired", gross: null, discountAmount: null, net: null };
  }
  if (item.unitPrice === null || !isDecimalString(item.unitPrice)) {
    return { state: "missing", gross: null, discountAmount: null, net: null };
  }
  let gross: Decimal;
  if (item.fixedPrice) {
    gross = decimal(item.unitPrice);
  } else {
    if (item.quantity === null || !isDecimalString(item.quantity)) {
      return { state: "missing", gross: null, discountAmount: null, net: null };
    }
    gross = decimal(item.quantity).mul(decimal(item.unitPrice));
  }
  if (gross.isNegative()) throw new Error("Item gross cannot be negative");
  const amount = discountAmount(gross, item.discount, scale);
  const net = rounded(gross.minus(amount), scale);
  return {
    state: "priced",
    gross: fixed(rounded(gross, scale), scale),
    discountAmount: fixed(amount, scale),
    net: fixed(net, scale),
  };
}

export function calculateProject(project: Project): ProjectCalculation {
  const scale = project.policy.moneyScale;
  const chapterResults: ChapterCalculation[] = [];
  let documentSubtotal = new FinanceDecimal(0);
  let optionalSubtotal = new FinanceDecimal(0);
  let missingCount = 0;

  for (const chapter of [...project.chapters].sort((a, b) => a.sortOrder - b.sortOrder)) {
    let included = new FinanceDecimal(0);
    let optional = new FinanceDecimal(0);
    let chapterMissing = 0;

    if (!chapter.hiddenFromPdf) {
      for (const item of chapter.items) {
        const result = calculateItem(item, scale);
        if (result.state === "missing") {
          if (!chapter.optional && !item.optional) chapterMissing += 1;
          continue;
        }
        if (result.state !== "priced" || result.net === null) continue;
        if (chapter.optional || item.optional) optional = optional.plus(decimal(result.net));
        else included = included.plus(decimal(result.net));
      }
    }

    let chapterDiscountValue = new FinanceDecimal(0);
    if (!chapter.hiddenFromPdf && !chapter.optional && included.greaterThan(0)) {
      chapterDiscountValue = discountAmount(included, chapter.discount, scale);
      included = included.minus(chapterDiscountValue);
    } else if (!chapter.hiddenFromPdf && chapter.optional && optional.greaterThan(0)) {
      const optionDiscount = discountAmount(optional, chapter.discount, scale);
      optional = optional.minus(optionDiscount);
    }

    documentSubtotal = documentSubtotal.plus(included);
    optionalSubtotal = optionalSubtotal.plus(optional);
    missingCount += chapterMissing;
    chapterResults.push({
      id: chapter.id,
      includedSubtotal: fixed(included.plus(chapterDiscountValue), scale),
      chapterDiscount: fixed(chapterDiscountValue, scale),
      includedNet: fixed(included, scale),
      optionalSubtotal: fixed(optional, scale),
      missingCount: chapterMissing,
    });
  }

  const documentDiscountValue = documentSubtotal.greaterThan(0)
    ? discountAmount(documentSubtotal, project.policy.documentDiscount, scale)
    : new FinanceDecimal(0);
  const taxableBase = documentSubtotal.minus(documentDiscountValue);
  const vatRate = decimal(project.policy.vatRate);
  if (vatRate.isNegative() || vatRate.greaterThan(100)) throw new Error("VAT rate must be 0-100");
  const vat = rounded(taxableBase.mul(vatRate).div(100), scale);
  const finalTotal = taxableBase.plus(vat);

  return {
    chapters: chapterResults,
    documentSubtotal: fixed(documentSubtotal, scale),
    documentDiscount: fixed(documentDiscountValue, scale),
    taxableBase: fixed(taxableBase, scale),
    vat: fixed(vat, scale),
    finalTotal: fixed(finalTotal, scale),
    optionalSubtotal: fixed(optionalSubtotal, scale),
    missingCount,
    isComplete: missingCount === 0,
  };
}

export function formatMoney(value: DecimalString | null, scale: MoneyScale = 2): string {
  if (value === null || !isDecimalString(value)) return "—";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: scale,
    maximumFractionDigits: scale,
  }).format(Number(value));
}

export function totalToMinor(value: DecimalString, scale: MoneyScale): number {
  const result = decimal(value).mul(new FinanceDecimal(10).pow(scale));
  if (result.abs().greaterThan(Number.MAX_SAFE_INTEGER)) throw new Error("Total exceeds safe index range");
  return result.toNumber();
}
