import Dexie, { type EntityTable } from "dexie";
import { exportDB, importDB, peakImportFile } from "dexie-export-import";
import { calculateProject, totalToMinor } from "../domain/calculations";
import {
  createDefaultSettings,
  createDefaultUnits,
  createPrivateHouseTemplate,
  createSeedCatalog,
} from "../domain/seed";
import type {
  Artifact,
  CatalogItem,
  Project,
  ProjectRecord,
  Revision,
  Settings,
  Template,
  Unit,
} from "../domain/types";

export class EditConflictError extends Error {
  constructor() {
    super("הפרויקט השתנה בחלון אחר. יש לרענן לפני שמירה נוספת.");
    this.name = "EditConflictError";
  }
}

export class BoqDatabase extends Dexie {
  settings!: EntityTable<Settings, "id">;
  units!: EntityTable<Unit, "id">;
  catalogItems!: EntityTable<CatalogItem, "id">;
  templates!: EntityTable<Template, "id">;
  projects!: EntityTable<ProjectRecord, "id">;
  revisions!: EntityTable<Revision, "id">;
  artifacts!: EntityTable<Artifact, "id">;

  constructor(name = "aviel-boq-v1") {
    super(name);
    this.version(1).stores({
      settings: "id, updatedAt",
      units: "id, nameHe, isActive, sortOrder",
      catalogItems:
        "id, code, shortName, defaultChapterName, isActive, updatedAt, *tags",
      templates: "id, name, isActive, updatedAt",
      projects:
        "id, documentNumber, projectName, clientName, status, updatedAt, archivedAt",
      revisions: "id, projectId, [projectId+number], createdAt",
      artifacts: "id, kind, revisionId, createdAt",
    });
  }
}

let singleton: BoqDatabase | null = null;

export function getDatabase(): BoqDatabase {
  if (typeof indexedDB === "undefined")
    throw new Error("IndexedDB is not available in this environment");
  singleton ??= new BoqDatabase();
  return singleton;
}

export async function initializeDatabase(
  database = getDatabase(),
): Promise<void> {
  await database.transaction(
    "rw",
    database.settings,
    database.units,
    database.catalogItems,
    database.templates,
    async () => {
      const now = new Date().toISOString();
      if ((await database.settings.count()) === 0)
        await database.settings.add(createDefaultSettings(now));
      if ((await database.units.count()) === 0)
        await database.units.bulkAdd(createDefaultUnits(now));
      if ((await database.catalogItems.count()) === 0)
        await database.catalogItems.bulkAdd(createSeedCatalog(now));
      if ((await database.templates.count()) === 0)
        await database.templates.add(createPrivateHouseTemplate(now));
    },
  );

  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    void navigator.storage.persist().catch(() => false);
  }
}

function projectRecord(
  project: Project,
  archivedAt: string | null = null,
): ProjectRecord {
  const totals = calculateProject(project);
  return {
    id: project.id,
    documentNumber: project.details.documentNumber,
    projectName: project.details.projectName,
    clientName: project.details.clientName,
    status: project.details.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    templateOriginName: project.templateOrigin?.name ?? null,
    finalTotalMinor: totals.isComplete
      ? totalToMinor(totals.finalTotal, project.policy.moneyScale)
      : null,
    editVersion: project.editVersion,
    archivedAt,
    aggregate: project,
  };
}

export async function createProject(
  database: BoqDatabase,
  project: Project,
): Promise<Project> {
  await database.projects.add(projectRecord(project));
  return project;
}

export async function saveProject(
  database: BoqDatabase,
  draft: Project,
): Promise<Project> {
  return database.transaction("rw", database.projects, async () => {
    const current = await database.projects.get(draft.id);
    if (!current || current.editVersion !== draft.editVersion)
      throw new EditConflictError();
    const saved: Project = {
      ...structuredClone(draft),
      editVersion: draft.editVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    await database.projects.put(projectRecord(saved, current.archivedAt));
    return saved;
  });
}

export async function duplicateProject(
  database: BoqDatabase,
  source: ProjectRecord,
): Promise<Project> {
  const now = new Date().toISOString();
  const cloned: Project = {
    ...structuredClone(source.aggregate),
    id: `project-${crypto.randomUUID()}`,
    editVersion: 0,
    details: {
      ...structuredClone(source.aggregate.details),
      projectName: `${source.projectName} — עותק`,
      documentNumber: `${source.documentNumber}-COPY`,
      status: "draft",
      creationDate: now.slice(0, 10),
    },
    chapters: source.aggregate.chapters.map((chapter, chapterIndex) => ({
      ...structuredClone(chapter),
      id: `chapter-${crypto.randomUUID()}`,
      sortOrder: chapterIndex,
      items: chapter.items.map((entry, itemIndex) => ({
        ...structuredClone(entry),
        id: `item-${crypto.randomUUID()}`,
        sortOrder: itemIndex,
      })),
    })),
    createdAt: now,
    updatedAt: now,
  };
  return createProject(database, cloned);
}

export async function createRevision(
  database: BoqDatabase,
  project: Project,
  trigger: Revision["trigger"],
  reason: string,
): Promise<Revision> {
  return database.transaction("rw", database.revisions, async () => {
    const existing = await database.revisions
      .where("projectId")
      .equals(project.id)
      .toArray();
    const revision: Revision = {
      id: `revision-${crypto.randomUUID()}`,
      projectId: project.id,
      number: Math.max(0, ...existing.map((entry) => entry.number)) + 1,
      reason,
      trigger,
      calculationPolicyVersion: project.policy.calculationPolicyVersion,
      snapshot: structuredClone(project),
      totals: calculateProject(project),
      pdfArtifactId: null,
      createdAt: new Date().toISOString(),
    };
    await database.revisions.add(revision);
    return revision;
  });
}

export async function attachPdfArtifact(
  database: BoqDatabase,
  revision: Revision,
  blob: Blob,
  filename: string,
): Promise<Artifact> {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const sha256 = [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const artifact: Artifact = {
    id: `artifact-${crypto.randomUUID()}`,
    kind: "pdf",
    blob,
    mimeType: "application/pdf",
    byteSize: blob.size,
    sha256,
    createdAt: new Date().toISOString(),
    revisionId: revision.id,
    displayFilename: filename,
  };
  await database.transaction(
    "rw",
    database.artifacts,
    database.revisions,
    async () => {
      await database.artifacts.add(artifact);
      await database.revisions.update(revision.id, {
        pdfArtifactId: artifact.id,
      });
    },
  );
  return artifact;
}

async function sha256(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function storeLogoArtifact(
  database: BoqDatabase,
  blob: Blob,
  filename: string,
): Promise<Artifact> {
  const artifact: Artifact = {
    id: `artifact-${crypto.randomUUID()}`,
    kind: "logo",
    blob,
    mimeType: blob.type,
    byteSize: blob.size,
    sha256: await sha256(blob),
    createdAt: new Date().toISOString(),
    revisionId: null,
    displayFilename: filename,
  };
  await database.artifacts.add(artifact);
  return artifact;
}

export async function exportPortableBackup(
  database = getDatabase(),
): Promise<Blob> {
  return exportDB(database, { prettyJson: true });
}

export async function restorePortableBackup(
  database: BoqDatabase,
  blob: Blob,
): Promise<void> {
  if (blob.size > 100 * 1024 * 1024)
    throw new Error("קובץ הגיבוי גדול מ־100MB");
  const meta = await peakImportFile(blob);
  if (!meta.data.databaseName || !meta.data.databaseVersion)
    throw new Error("קובץ הגיבוי אינו תקין");
  if (
    meta.data.databaseName !== database.name ||
    meta.data.databaseVersion !== database.verno
  )
    throw new Error("גרסת הגיבוי אינה תואמת לגרסת היישום");
  const requiredTables = [
    "settings",
    "units",
    "catalogItems",
    "templates",
    "projects",
    "revisions",
    "artifacts",
  ];
  if (
    !requiredTables.every((name) =>
      meta.data.tables.some((table) => table.name === name),
    )
  )
    throw new Error("קובץ הגיבוי חסר טבלאות נדרשות");

  const staging = await importDB(blob, {
    name: `aviel-boq-restore-${crypto.randomUUID()}`,
  });
  try {
    const [
      settingsRows,
      unitRows,
      catalogRows,
      templateRows,
      projectRows,
      revisionRows,
      artifactRows,
    ] = await Promise.all(
      requiredTables.map((name) => staging.table(name).toArray()),
    );
    if (
      !settingsRows.some(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          "id" in entry &&
          entry.id === "main",
      )
    )
      throw new Error("הגיבוי אינו מכיל הגדרות תקינות");
    if (
      !projectRows.every(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          "aggregate" in entry &&
          "editVersion" in entry,
      )
    )
      throw new Error("הגיבוי מכיל פרויקט לא תקין");

    await database.transaction("rw", database.tables, async () => {
      await Promise.all(database.tables.map((table) => table.clear()));
      await database.settings.bulkPut(settingsRows as Settings[]);
      await database.units.bulkPut(unitRows as Unit[]);
      await database.catalogItems.bulkPut(catalogRows as CatalogItem[]);
      await database.templates.bulkPut(templateRows as Template[]);
      await database.projects.bulkPut(projectRows as ProjectRecord[]);
      await database.revisions.bulkPut(revisionRows as Revision[]);
      await database.artifacts.bulkPut(artifactRows as Artifact[]);
    });
  } finally {
    staging.close();
    await staging.delete();
  }
}

export function resetDatabaseSingletonForTests(): void {
  singleton?.close();
  singleton = null;
}
