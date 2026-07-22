# Calculation rules

## 1. Policy identity

The initial policy ID is `boq-il-v1`. Every project stores its active policy; every revision snapshots it. A policy change creates a new ID and must not recalculate historical revisions silently.

Configuration:

- engine: `decimal.js` constructed from validated strings only;
- precision: 40 significant digits;
- rounding: `Decimal.ROUND_HALF_UP`;
- document money scale: `0` or `2`, default `2`;
- quantity scale: up to 4 decimal places;
- unit price scale: up to 4 decimal places;
- percentage scale: up to 4 decimal places;
- currency: ILS in v1.

`Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" })` is presentation only and never participates in calculations.

## 2. Input semantics

- `null`/blank means missing; it is never coerced to `0`.
- The string `"0"` is valid for quantity, price, discount, and VAT.
- Negative inputs are rejected.
- Percentage discounts and VAT are 0–100 inclusive.
- Fixed discounts cannot exceed the eligible base.
- A standard item requires quantity and unit price to produce a numeric total.
- A fixed-price item requires unit price; quantity is ignored and may be blank.
- An as-required item has a null monetary result even if old quantity/price values remain in its editable snapshot.

## 3. Item calculation

For a visible, non-as-required item:

```text
standard raw gross = quantity × unit price
fixed-price raw gross = unit price
```

Discount:

```text
none:       item raw net = raw gross
percentage: item raw net = raw gross × (1 − percent ÷ 100)
fixed:      item raw net = raw gross − fixed amount
```

`item net = round(item raw net, moneyScale, HALF_UP)`.

The line result is one of:

- `priced`: numeric gross, discount amount, and net;
- `asRequired`: null totals and the PDF label `לפי צורך`;
- `missing`: null totals and a validation error;
- `hidden`: excluded entirely.

## 4. Chapter calculation

For a visible, non-optional chapter:

```text
eligible item subtotal = sum of rounded item nets
chapter discount amount = round(discount(eligible item subtotal), moneyScale)
chapter net = eligible item subtotal − chapter discount amount
```

Only visible, priced, non-optional items are eligible. Optional items are calculated in a separate optional bucket and do not consume the chapter discount. A chapter marked optional moves all its visible priced items to the optional bucket and its chapter discount applies inside that optional bucket only.

Hidden chapters contribute nothing and are absent from the PDF.

## 5. Document calculation and VAT

```text
document subtotal = sum of included chapter nets
document discount amount = round(discount(document subtotal), moneyScale)
taxable base = document subtotal − document discount amount
VAT = round(taxable base × VAT rate ÷ 100, moneyScale)
final total = taxable base + VAT
```

The document discount is applied before VAT. Every included item is taxable in v1 because the data model has no item-level tax flag. The final total is the exact sum of already-rounded taxable base and VAT.

Optional subtotal is reported separately. It excludes document discount and VAT so it cannot be mistaken for the accepted quote. To include an option commercially, the user converts it to included and creates a new revision.

## 6. Missing and invalid price behavior

- Missing required quantity/price produces null, not zero.
- Missing required values are visually flagged and counted in the totals panel.
- Draft PDFs show `לא תומחר` for missing visible lines and display a document warning.
- Ready/Sent/Approved transitions are blocked while a visible, non-optional item is missing a price/quantity, unless the item is explicitly marked as-required or fixed-price as applicable.
- Hidden/optional missing items do not block the main quote, but the PDF optional section identifies them.

## 7. Rounding examples

| Case | Expected |
| --- | --- |
| `0.1 × 0.2`, scale 2 | `0.02` |
| `3.5 × 285.10`, 10% item discount | gross `997.85`, discount `99.785`, net `898.07` |
| `1.005`, scale 2, half-up | `1.01` |
| subtotal `1000`, 10% document discount, 18% VAT | discount `100`, taxable `900`, VAT `162`, final `1062` |
| fixed price `123.45`, blank quantity | `123.45` |
| zero quantity at any price | `0.00` |
| missing standard price | null / `לא תומחר` |
| as-required with stale price | null / `לפי צורך` |

## 8. Required tests

- Table-driven golden vectors for every rule and scale.
- Invariants: totals are never negative; hidden/optional/as-required cannot change main final; percentage 0 is identity and 100 yields zero; fixed discount equal to base yields zero.
- Metamorphic tests: duplicating an included item doubles only its affected bucket before non-linear discounts; reordering never changes totals; formatting/parsing round trip preserves canonical strings.
- Boundary tests for null versus zero, maximum digits, 0/100 percent, fixed discount above base, scale 0/2, and mixed chapter/item/document discounts.
- Revision replay test: recalculating with its snapshotted policy exactly equals stored totals.

## 9. Prohibited patterns

- `parseFloat`, `Number(...)`, unary `+`, arithmetic operators, `Math.round`, or `toFixed` in financial domain code.
- Persisting formatted currency strings.
- Rounding a value more than the stated policy step.
- Treating missing/as-required as numeric zero.
- Recalculating a historical revision with the newest policy.
