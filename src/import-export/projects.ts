import Papa from "papaparse";
import type { ProjectRecord } from "../domain/types";

function safe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function exportProjectsCsv(projects: ProjectRecord[]): Blob {
  const rows = projects.map((project) => ({
    "מספר הצעה": safe(project.documentNumber),
    "שם הפרויקט": safe(project.projectName),
    "לקוח": safe(project.clientName),
    "סטטוס": project.status,
    "תבנית מקור": safe(project.templateOriginName ?? ""),
    "סה״כ ביחידות מטבע מזעריות": project.finalTotalMinor ?? "",
    "דיוק עשרוני": project.aggregate.policy.moneyScale,
    "נוצר": project.createdAt,
    "עודכן": project.updatedAt,
    "ארכיון": project.archivedAt ?? "",
  }));
  return new Blob(["\uFEFF", Papa.unparse(rows, { newline: "\r\n" })], { type: "text/csv;charset=utf-8" });
}
