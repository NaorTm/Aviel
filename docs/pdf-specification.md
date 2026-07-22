# PDF specification

## 1. Baseline and proof gate

Primary renderer: `@react-pdf/renderer` v4 in the browser. It produces the same Blob used for preview, download, print, hashing, and revision storage; supports A4 wrapping, fixed repeated content, dynamic page numbers, TTF/WOFF embedding, and the documented `direction: rtl` style.

This choice is conditional on a mandatory Hebrew proof fixture before the renderer is considered production-ready. The fixture must prove logical Hebrew text order, mixed bidi strings, long wrapping, embedded font, repeated table header, deterministic totals, and three pages. If the gate fails, the `PdfRenderer` interface permits a packaged/local Chromium adapter using a dedicated semantic HTML print route and `printToPDF`; shipping reversed text or rasterized HTML is not an option.

## 2. Reference document findings

The supplied `כתב כמויות בית משפחת דיין.pdf` is a two-page A4 portrait Word/PDFMaker document. Useful cues:

- sober centered contractor title;
- underlined right-aligned chapter names;
- dense black-bordered RTL tables;
- wide right-side description column, then unit, quantity, unit price, and total toward the left;
- chapter subtotals and a final VAT/general-total block.

It is structural inspiration, not a golden baseline. It leaves a large unused lower page area, lacks logo/client/address/validity/page numbers, does not demonstrate a continued table header, uses weak amount formatting, and has a rough summary alignment.

## 3. Page geometry

- A4 portrait: 595.28 × 841.89 pt.
- Safe margins: top 28 pt, inline 32 pt, bottom 30 pt.
- Fixed header region: 28–105 pt.
- Fixed column-header region on chapter pages: 108–134 pt.
- Body starts at 142 pt and ends before 795 pt.
- Fixed footer/page number: baseline near 816 pt.
- No content may enter the 8 pt safety inset from any page edge.

## 4. Typography and bidi

- Bundle pinned static Noto Sans Hebrew Regular and Bold TTF files with license and SHA-256 checksums.
- Never load document fonts from a CDN or host OS.
- Default 9 pt, descriptions 9 pt/1.35, table headers 8.5 pt bold, chapter 12 pt bold, document title 16 pt bold, totals 10–14 pt.
- Page/document direction is RTL. Text is stored and passed in logical order; never reverse strings.
- Codes, quote numbers, phone/email, Latin measurements, and currency fragments use explicit LTR/isolation helpers.
- Disable hyphenation for Hebrew; wrap at whitespace and safe Unicode opportunities.

## 5. Repeated header

Every generated chapter page contains:

- company logo/name/tagline;
- document title, quote number, project/client, address/location, date/validity;
- the six table columns: description, unit, quantity, unit price, discount when enabled, total.

React-pdf fixed components repeat on wrapped pages. The body uses matching top padding. Final summary/terms may start on a separate Page component with the company header but without the column header.

## 6. Table layout

RTL visual widths when discount is enabled:

- description 46%; unit 10%; quantity 10%; unit price 12%; discount 10%; total 12%.
- Without discount, description gains the disabled column width.
- Description is right aligned and wraps. Numeric cells are LTR, end aligned, and use tabular numerals.
- Rows are bordered with neutral gray; chapter header uses a restrained navy tint; optional rows use a pale amber marker.
- A normal item row should not split. An exceptionally tall description may split only in the description cell and receives `המשך` on continuation.
- A chapter heading travels with at least the first item. Chapter subtotal follows the last item and never repeats as a page footer.

## 7. Content order

1. Fixed header and repeated table column header.
2. Visible included chapters/items and chapter subtotals.
3. Optional chapters/items in a clearly labeled separate section.
4. Summary: subtotal, document discount, taxable base when useful, VAT, final including VAT.
5. Missing-price warning when present.
6. Customer notes, terms, and optional signature area.
7. Fixed `עמוד X מתוך Y` footer.

Internal notes and hidden entities must never appear. As-required and missing lines show text instead of a numeric total.

## 8. Artifact lifecycle

1. Validate the project aggregate and calculate totals.
2. Create/obtain an immutable revision snapshot.
3. Render one PDF Blob from that snapshot and bundled assets.
4. Validate `%PDF-`, nonzero bytes, maximum byte size, and page count.
5. Compute SHA-256.
6. Store Blob, hash, byte size, renderer version, font version, and template version atomically with the revision link.
7. Preview with a revocable Blob URL/PDF.js; download and print the exact stored bytes.

An old revision is never regenerated implicitly. Explicit regeneration stores a new artifact and retains the prior artifact record.

## 9. Automated validation

- Minimal one-page, ordinary three-page, and 200-row stress fixtures.
- Parse with PDF.js/pypdf: valid header, A4 MediaBox, expected page range, known Hebrew phrases, identifiers, exact totals, and `עמוד X מתוך Y` on each page.
- Assert hidden/internal text is absent and each visible item occurs once.
- Inspect fonts and fail when Hebrew font is not embedded/subset or Unicode text is missing.
- Render every page at fixed 150–200 DPI to PNG and compare reviewed deterministic fixtures in a pinned environment.
- Geometry/sanity: no blank interior page, no content beyond MediaBox/safe area, header/footer each page, repeated column header on continuation, summary only at end.

## 10. Mandatory visual review

After every meaningful PDF change, render all pages to images and inspect:

- Hebrew and mixed-direction punctuation;
- long wrapping; no clipping/overlap/missing glyphs;
- chapter/header orphan prevention and continuation header;
- subtotal, optional, summary, terms, logo, and page numbering;
- independent opening in embedded preview and Chrome/Edge PDF viewer.

PDF/A or PDF/UA conformance is not claimed in v1. If later required, add a declared profile and veraPDF validation rather than inferring conformance from tagged output.
