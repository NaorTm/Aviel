import { writeFile, mkdir } from "node:fs/promises";
import {
  createDefaultSettings,
  createPrivateHouseTemplate,
  createProjectFromTemplate,
} from "../src/domain/seed";
import { renderQuotePdf } from "../src/pdf/quote-document";

const project = createProjectFromTemplate(
  createPrivateHouseTemplate("2026-07-22T00:00:00.000Z"),
  createDefaultSettings("2026-07-22T00:00:00.000Z"),
  "Q-2026-PDF-QA",
  new Date("2026-07-22T00:00:00.000Z"),
);

project.details.projectName = "בית משפחת כהן — בדיקת מסמך מרובה עמודים";
project.details.clientName = "משפחת כהן";
project.details.address = "רחוב הדוגמה 18, תל אביב";
project.companySnapshot.phone = "03-5555555";
project.companySnapshot.email = "office@example.co.il";
project.chapters[0].items[0].quantity = "125.5";
project.chapters[0].items[0].description =
  "אספקה והתקנת צנרת חשמל תקנית סמויה או גלויה, לרבות מחברים, קופסאות מעבר, קיבוע, סימון וכל עבודות העזר הנדרשות להשלמה מושלמת לפי התכניות והתקן הישראלי.";
project.chapters[5].items.push({
  ...structuredClone(project.chapters[5].items[0]),
  id: "fixture-long-item",
  sortOrder: 1,
  description:
    "נקודת כוח תלת־פאזית ייעודית לציוד מיזוג אוויר, כולל קו נפרד מהלוח, מוליכים, הגנה מתאימה, מפסק מקומי, שילוט, בדיקה וחיבור מלא לציוד לאחר תיאום עם ספק המערכת.",
  quantity: "3",
  unitPrice: "465.75",
});

await mkdir("tmp/pdfs", { recursive: true });
const blob = await renderQuotePdf(project);
await writeFile(
  "tmp/pdfs/quote-fixture.pdf",
  Buffer.from(await blob.arrayBuffer()),
);
process.stdout.write(`Rendered ${blob.size} bytes\n`);
