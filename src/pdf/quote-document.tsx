import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { calculateItem, calculateProject } from "../domain/calculations";
import type { DecimalString, Project, ProjectItem } from "../domain/types";

const fontRoot =
  typeof window === "undefined" && typeof process !== "undefined"
    ? `${process.cwd().replaceAll("\\", "/")}/public/fonts/`
    : "/fonts/";

Font.register({
  family: "NotoHebrew",
  fonts: [
    { src: `${fontRoot}NotoSansHebrew-Regular.ttf`, fontWeight: 400 },
    { src: `${fontRoot}NotoSansHebrew-Bold.ttf`, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoHebrew",
    fontSize: 8.4,
    color: "#17212b",
  },
  pageBody: {
    paddingTop: 104,
    paddingBottom: 44,
    paddingHorizontal: 34,
  },
  header: {
    position: "absolute",
    top: 24,
    right: 34,
    left: 34,
    height: 68,
    borderBottomWidth: 1.2,
    borderBottomColor: "#1f5b4f",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 9,
  },
  logo: { width: 54, height: 44, objectFit: "contain", marginLeft: 12 },
  companyBlock: { flexGrow: 1, alignItems: "flex-end" },
  companyName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#143f37",
    textAlign: "right",
  },
  companyTagline: {
    fontSize: 8.5,
    marginTop: 3,
    color: "#52616d",
    textAlign: "right",
  },
  documentMeta: { width: 190, alignItems: "flex-start" },
  documentTitle: { fontSize: 13, fontWeight: 700, color: "#143f37" },
  metaLine: { fontSize: 7.8, color: "#475569", marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 18,
    right: 34,
    left: 34,
    borderTopWidth: 0.6,
    borderTopColor: "#aeb9b5",
    paddingTop: 5,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    color: "#697780",
    fontSize: 7,
  },
  chapterTitle: {
    backgroundColor: "#e7f0ed",
    color: "#143f37",
    borderRightWidth: 4,
    borderRightColor: "#bc7b37",
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "right",
    marginBottom: 5,
  },
  table: { width: "100%", borderWidth: 0.65, borderColor: "#80908b" },
  row: {
    flexDirection: "row-reverse",
    minHeight: 24,
    borderBottomWidth: 0.45,
    borderBottomColor: "#b9c3bf",
  },
  lastRow: { borderBottomWidth: 0 },
  tableHeader: {
    backgroundColor: "#1f5b4f",
    color: "#ffffff",
    fontWeight: 700,
    minHeight: 25,
  },
  cell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderLeftWidth: 0.45,
    borderLeftColor: "#b9c3bf",
    textAlign: "center",
  },
  descriptionCell: { width: "43%", textAlign: "right" },
  unitCell: { width: "11%" },
  qtyCell: { width: "9%" },
  priceCell: { width: "13%" },
  discountCell: { width: "11%" },
  totalCell: { width: "13%", borderLeftWidth: 0, fontWeight: 700 },
  itemNote: { fontSize: 6.8, color: "#64748b", marginTop: 2 },
  chapterSubtotal: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    backgroundColor: "#f3f6f5",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 0.65,
    borderTopWidth: 0,
    borderColor: "#80908b",
    fontWeight: 700,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#143f37",
    textAlign: "right",
    marginBottom: 14,
  },
  summaryBox: {
    marginRight: "auto",
    width: 290,
    borderWidth: 0.7,
    borderColor: "#8c9995",
  },
  summaryLine: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderBottomWidth: 0.45,
    borderBottomColor: "#c8d0cd",
  },
  summaryFinal: {
    backgroundColor: "#143f37",
    color: "white",
    fontSize: 12,
    fontWeight: 700,
    borderBottomWidth: 0,
  },
  terms: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#bc7b37",
    paddingTop: 12,
  },
  termsTitle: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "right",
    marginBottom: 6,
  },
  paragraph: { textAlign: "right", lineHeight: 1.55, marginBottom: 4 },
  warning: {
    marginTop: 12,
    backgroundColor: "#fff6db",
    color: "#7b5217",
    padding: 8,
    textAlign: "right",
  },
  optionalTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#143f37",
    textAlign: "right",
    marginTop: 20,
    marginBottom: 6,
  },
  signature: {
    marginTop: 34,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  signatureLine: {
    width: 160,
    borderTopWidth: 0.7,
    borderTopColor: "#64748b",
    paddingTop: 5,
    textAlign: "center",
    color: "#64748b",
  },
  segment: { marginBottom: 12 },
});

interface PdfRow {
  id: string;
  description: string;
  note: string | null;
  unit: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  total: string;
}

interface PdfChapter {
  id: string;
  title: string;
  rows: PdfRow[];
  subtotal: DecimalString;
}

function number(value: DecimalString | null, scale: 0 | 2): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: scale,
    maximumFractionDigits: scale,
  }).format(Number(value));
}

function itemDiscount(item: ProjectItem): string {
  if (item.discount.type === "none") return "—";
  return item.discount.type === "percent"
    ? `${item.discount.value}%`
    : `₪ ${item.discount.value}`;
}

function mapRow(item: ProjectItem, scale: 0 | 2): PdfRow | null {
  const result = calculateItem(item, scale);
  if (result.state === "hidden") return null;
  return {
    id: item.id,
    description: item.description,
    note: item.note,
    unit: item.asRequired ? "לפי הצורך" : item.unitName,
    quantity:
      item.fixedPrice || item.asRequired ? "—" : (item.quantity ?? "חסר"),
    unitPrice: item.asRequired ? "לפי הצורך" : number(item.unitPrice, scale),
    discount: itemDiscount(item),
    total:
      result.state === "priced"
        ? number(result.net, scale)
        : result.state === "asRequired"
          ? "לפי הצורך"
          : "חסר מחיר",
  };
}

function visibleChapters(project: Project, optional: boolean): PdfChapter[] {
  const calculations = calculateProject(project);
  return project.chapters
    .filter((chapter) => !chapter.hiddenFromPdf)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((chapter) => {
      const chapterCalculation = calculations.chapters.find(
        (value) => value.id === chapter.id,
      )!;
      const rows = chapter.items
        .filter(
          (entry) =>
            !entry.hiddenFromPdf &&
            (chapter.optional || entry.optional) === optional,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((entry) => mapRow(entry, project.policy.moneyScale))
        .filter((entry): entry is PdfRow => entry !== null);
      return {
        id: chapter.id,
        title: chapter.title,
        rows,
        subtotal: optional
          ? chapterCalculation.optionalSubtotal
          : chapterCalculation.includedNet,
      };
    })
    .filter((chapter) => chapter.rows.length > 0);
}

function rowWeight(row: PdfRow): number {
  return (
    1 +
    Math.max(0, Math.ceil(row.description.length / 62) - 1) * 0.55 +
    (row.note ? 0.45 : 0)
  );
}

function chunks(chapter: PdfChapter): PdfChapter[] {
  const result: PdfChapter[] = [];
  let current: PdfRow[] = [];
  let weight = 0;
  for (const row of chapter.rows) {
    const next = rowWeight(row);
    if (current.length > 0 && weight + next > 12) {
      result.push({ ...chapter, rows: current, subtotal: "0" });
      current = [];
      weight = 0;
    }
    current.push(row);
    weight += next;
  }
  if (current.length > 0)
    result.push({ ...chapter, rows: current, subtotal: chapter.subtotal });
  return result;
}

interface PdfSegment {
  part: PdfChapter;
  continued: boolean;
}

function segmentWeight(segment: PdfSegment): number {
  return (
    2.4 +
    segment.part.rows.reduce((sum, row) => sum + rowWeight(row), 0) +
    (segment.part.subtotal !== "0" ? 0.8 : 0)
  );
}

function packPages(chapters: PdfChapter[]): PdfSegment[][] {
  const pages: PdfSegment[][] = [];
  let page: PdfSegment[] = [];
  let weight = 0;
  for (const chapter of chapters) {
    for (const [index, part] of chunks(chapter).entries()) {
      const segment = { part, continued: index > 0 };
      const nextWeight = segmentWeight(segment);
      if (page.length && weight + nextWeight > 16) {
        pages.push(page);
        page = [];
        weight = 0;
      }
      page.push(segment);
      weight += nextWeight;
    }
  }
  if (page.length) pages.push(page);
  return pages;
}

function Header({
  project,
  logoSrc,
}: {
  project: Project;
  logoSrc?: string | null;
}) {
  return (
    <View style={styles.header}>
      {/* react-pdf Image is not a DOM image; accessibility metadata lives in the PDF document structure. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
      <View style={styles.companyBlock}>
        <Text style={styles.companyName}>{project.companySnapshot.name}</Text>
        <Text style={styles.companyTagline}>
          {project.companySnapshot.tagline}
        </Text>
      </View>
      <View style={styles.documentMeta}>
        <Text style={styles.documentTitle}>כתב כמויות והצעת מחיר</Text>
        <Text style={styles.metaLine}>
          מס׳ הצעה: {project.details.documentNumber}
        </Text>
        <Text style={styles.metaLine}>
          פרויקט: {project.details.projectName}
        </Text>
        {project.details.clientName ? (
          <Text style={styles.metaLine}>
            עבור: {project.details.clientName}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Footer({ project }: { project: Project }) {
  return (
    <View style={styles.footer}>
      <Text>
        {project.companySnapshot.phone || project.companySnapshot.email || ""}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `עמוד ${pageNumber} מתוך ${totalPages}`
        }
      />
    </View>
  );
}

function TableHeader() {
  return (
    <View style={[styles.row, styles.tableHeader]}>
      <Text style={[styles.cell, styles.descriptionCell]}>תיאור העבודה</Text>
      <Text style={[styles.cell, styles.unitCell]}>יחידה</Text>
      <Text style={[styles.cell, styles.qtyCell]}>כמות</Text>
      <Text style={[styles.cell, styles.priceCell]}>מחיר יחידה</Text>
      <Text style={[styles.cell, styles.discountCell]}>הנחה</Text>
      <Text style={[styles.cell, styles.totalCell]}>סה״כ</Text>
    </View>
  );
}

function ChapterTable({
  chapter,
  continued,
  scale,
}: {
  chapter: PdfChapter;
  continued: boolean;
  scale: 0 | 2;
}) {
  return (
    <View>
      <Text style={styles.chapterTitle}>
        {chapter.title}
        {continued ? " — המשך" : ""}
      </Text>
      <View style={styles.table}>
        <TableHeader />
        {chapter.rows.map((row, index) => (
          <View
            key={row.id}
            style={[
              styles.row,
              index === chapter.rows.length - 1 ? styles.lastRow : {},
            ]}
            wrap={false}
          >
            <View style={[styles.cell, styles.descriptionCell]}>
              <Text>{row.description}</Text>
              {row.note ? (
                <Text style={styles.itemNote}>{row.note}</Text>
              ) : null}
            </View>
            <Text style={[styles.cell, styles.unitCell]}>{row.unit}</Text>
            <Text style={[styles.cell, styles.qtyCell]}>{row.quantity}</Text>
            <Text style={[styles.cell, styles.priceCell]}>{row.unitPrice}</Text>
            <Text style={[styles.cell, styles.discountCell]}>
              {row.discount}
            </Text>
            <Text style={[styles.cell, styles.totalCell]}>{row.total}</Text>
          </View>
        ))}
      </View>
      {chapter.subtotal !== "0" ? (
        <View style={styles.chapterSubtotal} wrap={false}>
          <Text>סה״כ לפרק: ₪ {number(chapter.subtotal, scale)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SummaryLine({
  label,
  value,
  final = false,
}: {
  label: string;
  value: string;
  final?: boolean;
}) {
  return (
    <View style={[styles.summaryLine, final ? styles.summaryFinal : {}]}>
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

export function QuoteDocument({
  project,
  logoSrc,
}: {
  project: Project;
  logoSrc?: string | null;
}) {
  const totals = calculateProject(project);
  const included = visibleChapters(project, false);
  const optional = visibleChapters(project, true);
  const includedPages = packPages(included);
  const optionalPages = packPages(optional);

  return (
    <Document
      title={`הצעת מחיר ${project.details.documentNumber}`}
      author={project.companySnapshot.name}
      language="he-IL"
    >
      {includedPages.map((segments, pageIndex) => (
        <Page
          key={`included-${pageIndex}`}
          size="A4"
          style={styles.page}
          wrap={false}
        >
          <Header project={project} logoSrc={logoSrc} />
          <Footer project={project} />
          <View style={styles.pageBody}>
            {segments.map(({ part, continued }, segmentIndex) => (
              <View key={`${part.id}-${segmentIndex}`} style={styles.segment}>
                <ChapterTable
                  chapter={part}
                  continued={continued}
                  scale={project.policy.moneyScale}
                />
              </View>
            ))}
          </View>
        </Page>
      ))}
      {optionalPages.map((segments, pageIndex) => (
        <Page
          key={`optional-${pageIndex}`}
          size="A4"
          style={styles.page}
          wrap={false}
        >
          <Header project={project} logoSrc={logoSrc} />
          <Footer project={project} />
          <View style={styles.pageBody}>
            <Text style={styles.optionalTitle}>
              פריטים אופציונליים — אינם כלולים בסכום הראשי
            </Text>
            {segments.map(({ part, continued }, segmentIndex) => (
              <View key={`${part.id}-${segmentIndex}`} style={styles.segment}>
                <ChapterTable
                  chapter={part}
                  continued={continued}
                  scale={project.policy.moneyScale}
                />
              </View>
            ))}
            {pageIndex === optionalPages.length - 1 ? (
              <Text style={[styles.paragraph, { fontWeight: 700 }]}>
                סה״כ אופציות מתומחרות: ₪{" "}
                {number(totals.optionalSubtotal, project.policy.moneyScale)}
              </Text>
            ) : null}
          </View>
        </Page>
      ))}
      <Page size="A4" style={styles.page} wrap={false}>
        <Header project={project} logoSrc={logoSrc} />
        <Footer project={project} />
        <View style={styles.pageBody}>
          <Text style={styles.summaryTitle}>סיכום הצעת המחיר</Text>
          <View style={styles.summaryBox} wrap={false}>
            <SummaryLine
              label="סכום ביניים"
              value={`₪ ${number(totals.documentSubtotal, project.policy.moneyScale)}`}
            />
            {totals.documentDiscount !==
            (project.policy.moneyScale === 2 ? "0.00" : "0") ? (
              <SummaryLine
                label="הנחה למסמך"
                value={`− ₪ ${number(totals.documentDiscount, project.policy.moneyScale)}`}
              />
            ) : null}
            <SummaryLine
              label={`מע״מ (${project.policy.vatRate}%)`}
              value={`₪ ${number(totals.vat, project.policy.moneyScale)}`}
            />
            <SummaryLine
              label="סה״כ כולל מע״מ"
              value={`₪ ${number(totals.finalTotal, project.policy.moneyScale)}`}
              final
            />
          </View>
          {totals.missingCount > 0 ? (
            <Text style={styles.warning}>
              קיימים {totals.missingCount} פריטים חסרי מחיר שאינם כלולים בסכום.
            </Text>
          ) : null}
          {optional.length > 0 ? (
            <Text style={styles.warning}>
              פריטים אופציונליים מוצגים בעמוד נפרד ואינם כלולים בסכום הראשי.
            </Text>
          ) : null}
          <View style={styles.terms}>
            <Text style={styles.termsTitle}>הערות ותנאים</Text>
            {project.customerNotes ? (
              <Text style={styles.paragraph}>{project.customerNotes}</Text>
            ) : null}
            {project.terms
              .split("\n")
              .filter(Boolean)
              .map((line, index) => (
                <Text key={index} style={styles.paragraph}>
                  {line}
                </Text>
              ))}
          </View>
          <View style={styles.signature} wrap={false}>
            <Text style={styles.signatureLine}>חתימת הלקוח</Text>
            <Text style={styles.signatureLine}>תאריך</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(
  project: Project,
  logoSrc?: string | null,
): Promise<Blob> {
  return pdf(<QuoteDocument project={project} logoSrc={logoSrc} />).toBlob();
}
