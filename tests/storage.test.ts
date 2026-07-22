import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDefaultSettings,
  createPrivateHouseTemplate,
  createProjectFromTemplate,
} from "../src/domain/seed";
import {
  BoqDatabase,
  EditConflictError,
  createProject,
  exportPortableBackup,
  initializeDatabase,
  restorePortableBackup,
  saveProject,
} from "../src/storage/database";

const databases: BoqDatabase[] = [];

function database(name: string) {
  const db = new BoqDatabase(name);
  databases.push(db);
  return db;
}

afterEach(async () => {
  for (const db of databases.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe("local-first persistence", () => {
  it("seeds settings, units, a catalog and an independent template", async () => {
    const db = database(`seed-${crypto.randomUUID()}`);
    await initializeDatabase(db);
    expect(await db.settings.count()).toBe(1);
    expect(await db.units.count()).toBe(14);
    expect(await db.catalogItems.count()).toBeGreaterThanOrEqual(10);
    expect(
      (await db.templates.get("template-private-house"))?.chapters,
    ).toHaveLength(10);
  });

  it("detects stale edit versions rather than silently overwriting", async () => {
    const db = database(`conflict-${crypto.randomUUID()}`);
    await initializeDatabase(db);
    const draft = createProjectFromTemplate(
      createPrivateHouseTemplate(),
      createDefaultSettings(),
      "Q-7",
    );
    await createProject(db, draft);
    const saved = await saveProject(db, {
      ...structuredClone(draft),
      details: { ...draft.details, projectName: "גרסה א" },
    });
    expect(saved.editVersion).toBe(1);
    await expect(saveProject(db, draft)).rejects.toBeInstanceOf(
      EditConflictError,
    );
  });

  it("exports and restores a portable backup", async () => {
    const source = database(`backup-source-${crypto.randomUUID()}`);
    await initializeDatabase(source);
    const draft = createProjectFromTemplate(
      createPrivateHouseTemplate(),
      createDefaultSettings(),
      "Q-9",
    );
    await createProject(source, draft);
    const blob = await exportPortableBackup(source);
    expect(blob.size).toBeGreaterThan(100);

    const restored = database(source.name);
    source.close();
    databases.splice(databases.indexOf(source), 1);
    await restorePortableBackup(restored, blob);
    expect(
      (await restored.projects.get(draft.id))?.aggregate.details.documentNumber,
    ).toBe("Q-9");
  });
});
