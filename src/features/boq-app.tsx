"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookTemplate,
  Calculator,
  Check,
  CircleAlert,
  ClipboardList,
  Copy,
  DatabaseBackup,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FilePlus2,
  FileText,
  FolderKanban,
  GripVertical,
  LayoutDashboard,
  PackageSearch,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateItem,
  calculateProject,
  formatMoney,
} from "../domain/calculations";
import {
  createProjectFromTemplate,
  emptyProjectChapter,
  emptyProjectItem,
} from "../domain/seed";
import type {
  CatalogItem,
  Discount,
  Project,
  ProjectChapter,
  ProjectItem,
  ProjectRecord,
  Revision,
  Settings,
  Template,
  Unit,
} from "../domain/types";
import { statusLabels } from "../domain/types";
import {
  exportCatalogCsv,
  exportCatalogXlsx,
  importCatalogFile,
} from "../import-export/catalog";
import { exportProjectsCsv } from "../import-export/projects";
import { downloadBlob } from "../lib/download";
import {
  type BoqDatabase,
  attachPdfArtifact,
  createProject,
  createRevision,
  duplicateProject,
  exportPortableBackup,
  getDatabase,
  initializeDatabase,
  restorePortableBackup,
  saveProject,
  storeLogoArtifact,
} from "../storage/database";

type Screen =
  | "dashboard"
  | "projects"
  | "editor"
  | "templates"
  | "catalog"
  | "settings";
type SaveState = "saved" | "dirty" | "saving" | "error";

const navItems: Array<{
  id: Screen;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { id: "projects", label: "פרויקטים", icon: FolderKanban },
  { id: "templates", label: "תבניות", icon: BookTemplate },
  { id: "catalog", label: "קטלוג מחירים", icon: PackageSearch },
  { id: "settings", label: "הגדרות חברה", icon: SettingsIcon },
];

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function numberInput(value: string): string | null | undefined {
  const normalized = value.replace(",", ".").trim();
  if (normalized === "") return null;
  if (!/^\d*(?:\.\d*)?$/.test(normalized)) return undefined;
  return normalized;
}

function cloneWithNewIds(chapter: ProjectChapter): ProjectChapter {
  return {
    ...structuredClone(chapter),
    id: `chapter-${crypto.randomUUID()}`,
    items: chapter.items.map((item, index) => ({
      ...structuredClone(item),
      id: `item-${crypto.randomUUID()}`,
      sortOrder: index,
    })),
  };
}

function filenamePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]/g, "-") || "מסמך";
}

function IconButton({
  label,
  children,
  danger = false,
  onClick,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-button${danger ? " danger" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <FileText size={34} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: Project["details"]["status"] }) {
  return (
    <span className={`status-badge status-${status}`}>
      {statusLabels[status]}
    </span>
  );
}

export function BoqApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [database, setDatabase] = useState<BoqDatabase | null>(null);
  const [booting, setBooting] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [toast, setToast] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [search, setSearch] = useState("");
  const dbRef = useRef<BoqDatabase | null>(null);
  const currentRef = useRef<Project | null>(null);
  const mutationCounter = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const protectedEditConfirmed = useRef(false);

  const refresh = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    const [nextSettings, nextUnits, nextCatalog, nextTemplates, nextProjects] =
      await Promise.all([
        db.settings.get("main"),
        db.units.orderBy("sortOrder").toArray(),
        db.catalogItems.orderBy("shortName").toArray(),
        db.templates.orderBy("name").toArray(),
        db.projects.orderBy("updatedAt").reverse().toArray(),
      ]);
    if (nextSettings) setSettings(nextSettings);
    setUnits(nextUnits);
    setCatalog(nextCatalog);
    setTemplates(nextTemplates);
    setProjects(nextProjects);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const db = getDatabase();
        dbRef.current = db;
        setDatabase(db);
        await initializeDatabase(db);
        if (!cancelled) await refresh();
      } catch (error) {
        if (!cancelled)
          setFatalError(
            error instanceof Error
              ? error.message
              : "לא ניתן לפתוח את מסד הנתונים המקומי",
          );
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );

  async function flushSave() {
    const db = dbRef.current;
    if (!db || !currentRef.current || savingRef.current || !dirtyRef.current)
      return;
    savingRef.current = true;
    setSaveState("saving");
    const capturedMutation = mutationCounter.current;
    const draft = structuredClone(currentRef.current);
    try {
      const saved = await saveProject(db, draft);
      const latest = currentRef.current;
      if (latest?.id === saved.id) {
        const merged = {
          ...latest,
          editVersion: saved.editVersion,
          updatedAt: saved.updatedAt,
        };
        currentRef.current = merged;
        setCurrentProject(merged);
      }
      if (capturedMutation === mutationCounter.current) {
        dirtyRef.current = false;
        setSaveState("saved");
      } else {
        dirtyRef.current = true;
        setSaveState("dirty");
        saveTimer.current = window.setTimeout(() => void flushSave(), 180);
      }
      await refresh();
    } catch (error) {
      setSaveState("error");
      setToast(error instanceof Error ? error.message : "השמירה נכשלה");
    } finally {
      savingRef.current = false;
    }
  }

  function mutateProject(change: (draft: Project) => void) {
    const protectedProject = currentRef.current;
    if (
      protectedProject &&
      ["sent", "approved"].includes(protectedProject.details.status) &&
      !protectedEditConfirmed.current
    ) {
      if (
        !window.confirm(
          "הצעה זו כבר נשלחה או אושרה. לפני העריכה יישמר צילום מצב והמסמך יחזור לטיוטה. להמשיך?",
        )
      )
        return;
      protectedEditConfirmed.current = true;
      if (dbRef.current) {
        void createRevision(
          dbRef.current,
          protectedProject,
          "manual",
          "צילום מצב לפני עריכת מסמך מוגן",
        ).then(async () =>
          setRevisions(
            (
              await dbRef
                .current!.revisions.where("projectId")
                .equals(protectedProject.id)
                .toArray()
            ).sort((a, b) => b.number - a.number),
          ),
        );
      }
    }
    setCurrentProject((previous) => {
      if (!previous) return previous;
      const next = structuredClone(previous);
      change(next);
      if (["sent", "approved"].includes(previous.details.status))
        next.details.status = "draft";
      next.updatedAt = new Date().toISOString();
      currentRef.current = next;
      return next;
    });
    mutationCounter.current += 1;
    dirtyRef.current = true;
    setSaveState("dirty");
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flushSave(), 700);
  }

  async function openProject(record: ProjectRecord) {
    await flushSave();
    const aggregate = structuredClone(record.aggregate);
    currentRef.current = aggregate;
    dirtyRef.current = false;
    protectedEditConfirmed.current = false;
    setCurrentProject(aggregate);
    setSaveState("saved");
    setRevisions(
      (
        await dbRef
          .current!.revisions.where("projectId")
          .equals(record.id)
          .toArray()
      ).sort((a, b) => b.number - a.number),
    );
    setScreen("editor");
  }

  async function newProject(
    template = templates.find((value) => value.isActive),
  ) {
    if (!settings || !template || !dbRef.current) return;
    const sequence = (await dbRef.current.projects.count()) + 1;
    const project = createProjectFromTemplate(
      template,
      settings,
      `Q-${new Date().getFullYear()}-${String(sequence).padStart(3, "0")}`,
    );
    await createProject(dbRef.current, project);
    currentRef.current = project;
    dirtyRef.current = false;
    protectedEditConfirmed.current = false;
    setCurrentProject(project);
    setRevisions([]);
    setSaveState("saved");
    await refresh();
    setScreen("editor");
    setToast(`נוצר פרויקט עצמאי מתבנית „${template.name}”`);
  }

  async function generatePdf() {
    if (!currentRef.current || !dbRef.current) return;
    await flushSave();
    const project = currentRef.current;
    setPdfBusy(true);
    try {
      const totals = calculateProject(project);
      if (
        !totals.isComplete &&
        !window.confirm(
          `קיימים ${totals.missingCount} פריטים חסרי מחיר. להפיק PDF עם סימון ברור?`,
        )
      )
        return;
      const revision = await createRevision(
        dbRef.current,
        project,
        "pdf",
        "הפקת PDF",
      );
      let logoUrl: string | null = null;
      if (project.companyLogoArtifactId) {
        const logo = await dbRef.current.artifacts.get(
          project.companyLogoArtifactId,
        );
        if (logo) logoUrl = URL.createObjectURL(logo.blob);
      }
      const { renderQuotePdf } = await import("../pdf/quote-document");
      const blob = await renderQuotePdf(project, logoUrl);
      if (logoUrl) URL.revokeObjectURL(logoUrl);
      const filename = `${filenamePart(project.details.documentNumber)}-${filenamePart(project.details.projectName)}-R${revision.number}.pdf`;
      await attachPdfArtifact(dbRef.current, revision, blob, filename);
      setRevisions(
        (
          await dbRef.current.revisions
            .where("projectId")
            .equals(project.id)
            .toArray()
        ).sort((a, b) => b.number - a.number),
      );
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfBlob(blob);
      setPdfUrl(URL.createObjectURL(blob));
      setToast(`נשמרה גרסה ${revision.number} עם PDF היסטורי`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "הפקת ה־PDF נכשלה");
    } finally {
      setPdfBusy(false);
    }
  }

  async function downloadRevisionPdf(revision: Revision) {
    if (!dbRef.current || !revision.pdfArtifactId) return;
    const artifact = await dbRef.current.artifacts.get(revision.pdfArtifactId);
    if (artifact) downloadBlob(artifact.blob, artifact.displayFilename);
  }

  if (booting) {
    return (
      <div className="boot-screen" role="status">
        <div className="boot-mark">א</div>
        <p>פותח את סביבת העבודה המקומית…</p>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="fatal-screen">
        <CircleAlert size={40} />
        <h1>לא ניתן לפתוח את היישום</h1>
        <p>{fatalError}</p>
        <button onClick={() => location.reload()}>נסה שוב</button>
      </div>
    );
  }

  const activeProjects = projects.filter(
    (project) => project.archivedAt === null,
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">א</span>
          <span>
            <strong>אביאל BOQ</strong>
            <small>הצעות מחיר וכתבי כמויות</small>
          </span>
        </div>
        <nav aria-label="ניווט ראשי">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={screen === id ? "active" : ""}
              onClick={() => setScreen(id)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="local-dot" />
          <div>
            <strong>הנתונים נשמרים מקומית</strong>
            <small>מומלץ להפיק גיבוי תקופתי</small>
          </div>
        </div>
      </aside>

      <main className="workspace">
        {screen === "dashboard" && (
          <Dashboard
            projects={activeProjects}
            onNew={() => void newProject()}
            onOpen={(record) => void openProject(record)}
            onNavigate={setScreen}
          />
        )}
        {screen === "projects" && database && (
          <ProjectsScreen
            projects={projects}
            search={search}
            setSearch={setSearch}
            onNew={() => void newProject()}
            onOpen={(record) => void openProject(record)}
            onChanged={refresh}
            db={database}
          />
        )}
        {screen === "editor" && currentProject ? (
          <ProjectEditor
            project={currentProject}
            units={units}
            catalog={catalog}
            revisions={revisions}
            saveState={saveState}
            mutate={mutateProject}
            onSave={() => void flushSave()}
            onPdf={() => void generatePdf()}
            pdfBusy={pdfBusy}
            onRevisionDownload={(revision) =>
              void downloadRevisionPdf(revision)
            }
          />
        ) : screen === "editor" ? (
          <EmptyState
            title="אין פרויקט פתוח"
            text="בחרו פרויקט קיים או צרו פרויקט חדש."
            action={
              <button
                className="primary-button"
                onClick={() => void newProject()}
              >
                <Plus size={17} />
                פרויקט חדש
              </button>
            }
          />
        ) : null}
        {screen === "templates" && database && (
          <TemplatesScreen
            templates={templates}
            units={units}
            db={database}
            onNewProject={(template) => void newProject(template)}
            onChanged={refresh}
          />
        )}
        {screen === "catalog" && database && (
          <CatalogScreen
            catalog={catalog}
            units={units}
            db={database}
            onChanged={refresh}
          />
        )}
        {screen === "settings" && settings && database && (
          <SettingsScreen
            settings={settings}
            units={units}
            db={database}
            onChanged={refresh}
          />
        )}
      </main>

      {toast ? (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button aria-label="סגירה" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      ) : null}
      {pdfUrl && pdfBlob ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="תצוגה מקדימה של PDF"
        >
          <div className="pdf-modal">
            <header>
              <div>
                <strong>תצוגה מקדימה</strong>
                <small>המסמך נשמר יחד עם הגרסה</small>
              </div>
              <div className="button-row">
                <button
                  onClick={() =>
                    downloadBlob(
                      pdfBlob,
                      `${filenamePart(currentProject?.details.documentNumber ?? "quote")}.pdf`,
                    )
                  }
                >
                  <Download size={16} />
                  הורדה
                </button>
                <button
                  onClick={() =>
                    document
                      .querySelector<HTMLIFrameElement>(".pdf-frame")
                      ?.contentWindow?.print()
                  }
                >
                  <Printer size={16} />
                  הדפסה
                </button>
                <IconButton
                  label="סגירה"
                  onClick={() => {
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl(null);
                    setPdfBlob(null);
                  }}
                >
                  <X size={18} />
                </IconButton>
              </div>
            </header>
            <iframe
              className="pdf-frame"
              src={pdfUrl}
              title="תצוגה מקדימה של הצעת המחיר"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Dashboard({
  projects,
  onNew,
  onOpen,
  onNavigate,
}: {
  projects: ProjectRecord[];
  onNew: () => void;
  onOpen: (project: ProjectRecord) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const drafts = projects.filter(
    (project) => project.status === "draft",
  ).length;
  const sent = projects.filter((project) =>
    ["sent", "approved"].includes(project.status),
  ).length;
  return (
    <div className="screen dashboard-screen">
      <header className="screen-header hero-header">
        <div>
          <p className="eyebrow">סביבת עבודה מקומית</p>
          <h1>בוקר טוב, מתחילים הצעה חדשה?</h1>
          <p>כל הפרויקטים, המחירים והמסמכים נשמרים במחשב הזה.</p>
        </div>
        <button className="primary-button large" onClick={onNew}>
          <FilePlus2 size={19} />
          יצירת פרויקט חדש
        </button>
      </header>
      <section className="metric-grid" aria-label="סיכום פרויקטים">
        <article>
          <span className="metric-icon green">
            <FolderKanban size={21} />
          </span>
          <div>
            <strong>{projects.length}</strong>
            <small>פרויקטים פעילים</small>
          </div>
        </article>
        <article>
          <span className="metric-icon amber">
            <ClipboardList size={21} />
          </span>
          <div>
            <strong>{drafts}</strong>
            <small>טיוטות בעבודה</small>
          </div>
        </article>
        <article>
          <span className="metric-icon blue">
            <FileDown size={21} />
          </span>
          <div>
            <strong>{sent}</strong>
            <small>נשלחו או אושרו</small>
          </div>
        </article>
        <article>
          <span className="metric-icon slate">
            <DatabaseBackup size={21} />
          </span>
          <div>
            <strong>מקומי</strong>
            <small>מצב אחסון</small>
          </div>
        </article>
      </section>
      <section className="panel recent-panel">
        <div className="panel-title">
          <div>
            <h2>פרויקטים אחרונים</h2>
            <p>חזרה מהירה למסמכים שעבדת עליהם לאחרונה</p>
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("projects")}
          >
            לכל הפרויקטים
          </button>
        </div>
        {projects.length ? (
          <div className="recent-list">
            {projects.slice(0, 6).map((project) => (
              <button
                className="recent-row"
                key={project.id}
                onClick={() => onOpen(project)}
              >
                <span className="document-avatar">
                  <FileText size={18} />
                </span>
                <span className="recent-main">
                  <strong>{project.projectName}</strong>
                  <small>
                    {project.clientName || "ללא שם לקוח"} ·{" "}
                    {project.documentNumber}
                  </small>
                </span>
                <StatusBadge status={project.status} />
                <span className="money" dir="ltr">
                  {project.finalTotalMinor === null
                    ? "—"
                    : formatMoney(
                        (
                          project.finalTotalMinor /
                          (project.aggregate.policy.moneyScale === 2 ? 100 : 1)
                        ).toFixed(project.aggregate.policy.moneyScale),
                        project.aggregate.policy.moneyScale,
                      )}
                </span>
                <span className="date">
                  {new Date(project.updatedAt).toLocaleDateString("he-IL")}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="עדיין אין פרויקטים"
            text="הפרויקט הראשון ייווצר מעותק עצמאי של תבנית הבית הפרטי."
            action={
              <button className="primary-button" onClick={onNew}>
                <Plus size={17} />
                יצירת פרויקט
              </button>
            }
          />
        )}
      </section>
    </div>
  );
}

function ProjectsScreen({
  projects,
  search,
  setSearch,
  onNew,
  onOpen,
  onChanged,
  db,
}: {
  projects: ProjectRecord[];
  search: string;
  setSearch: (value: string) => void;
  onNew: () => void;
  onOpen: (project: ProjectRecord) => void;
  onChanged: () => Promise<void>;
  db: BoqDatabase;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const normalized = search.trim().toLocaleLowerCase("he-IL");
  const filtered = projects.filter(
    (project) =>
      (showArchived || !project.archivedAt) &&
      (!normalized ||
        `${project.projectName} ${project.clientName} ${project.documentNumber}`
          .toLocaleLowerCase("he-IL")
          .includes(normalized)),
  );

  async function archiveProject(record: ProjectRecord) {
    await db.projects.update(record.id, {
      archivedAt: record.archivedAt ? null : new Date().toISOString(),
    });
    await onChanged();
  }

  async function removeProject(record: ProjectRecord) {
    if (
      !window.confirm(
        `מחיקה קבועה של „${record.projectName}” וכל הגרסאות וה־PDF השייכים לו? לא ניתן לבטל פעולה זו.`,
      )
    )
      return;
    await db.transaction(
      "rw",
      db.projects,
      db.revisions,
      db.artifacts,
      async () => {
        const revisions = await db.revisions
          .where("projectId")
          .equals(record.id)
          .toArray();
        const artifactIds = revisions
          .map((revision) => revision.pdfArtifactId)
          .filter((id): id is string => Boolean(id));
        await db.artifacts.bulkDelete(artifactIds);
        await db.revisions.where("projectId").equals(record.id).delete();
        await db.projects.delete(record.id);
      },
    );
    await onChanged();
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">ניהול מסמכים</p>
          <h1>פרויקטים והצעות מחיר</h1>
          <p>חיפוש, פתיחה, שכפול וארכוב של כל המסמכים המקומיים.</p>
        </div>
        <div className="button-row">
          <button
            onClick={() =>
              downloadBlob(
                exportProjectsCsv(projects),
                `projects-${todayStamp()}.csv`,
              )
            }
          >
            <Download size={16} />
            ייצוא CSV
          </button>
          <button className="primary-button" onClick={onNew}>
            <Plus size={17} />
            פרויקט חדש
          </button>
        </div>
      </header>
      <div className="toolbar panel">
        <label className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי פרויקט, לקוח או מספר…"
          />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          הצגת ארכיון
        </label>
      </div>
      <div className="panel table-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>פרויקט</th>
              <th>לקוח</th>
              <th>מספר</th>
              <th>סטטוס</th>
              <th>סה״כ</th>
              <th>עודכן</th>
              <th>
                <span className="sr-only">פעולות</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr
                key={record.id}
                className={record.archivedAt ? "muted-row" : ""}
              >
                <td>
                  <button
                    className="project-link"
                    onClick={() => onOpen(record)}
                  >
                    {record.projectName}
                  </button>
                  <small>{record.templateOriginName ?? "ללא תבנית"}</small>
                </td>
                <td>{record.clientName || "—"}</td>
                <td dir="ltr">{record.documentNumber}</td>
                <td>
                  <StatusBadge status={record.status} />
                </td>
                <td className="money" dir="ltr">
                  {record.finalTotalMinor === null
                    ? "חסר מחיר"
                    : formatMoney(
                        (
                          record.finalTotalMinor /
                          (record.aggregate.policy.moneyScale === 2 ? 100 : 1)
                        ).toFixed(record.aggregate.policy.moneyScale),
                        record.aggregate.policy.moneyScale,
                      )}
                </td>
                <td>
                  {new Date(record.updatedAt).toLocaleDateString("he-IL")}
                </td>
                <td>
                  <div className="row-actions">
                    <IconButton label="פתיחה" onClick={() => onOpen(record)}>
                      <Eye size={16} />
                    </IconButton>
                    <IconButton
                      label="שכפול"
                      onClick={() =>
                        void duplicateProject(db, record).then(onChanged)
                      }
                    >
                      <Copy size={16} />
                    </IconButton>
                    <IconButton
                      label={record.archivedAt ? "שחזור מארכיון" : "ארכוב"}
                      onClick={() => void archiveProject(record)}
                    >
                      {record.archivedAt ? (
                        <RotateCcw size={16} />
                      ) : (
                        <Archive size={16} />
                      )}
                    </IconButton>
                    <IconButton
                      label="מחיקה קבועה"
                      danger
                      onClick={() => void removeProject(record)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? (
          <EmptyState
            title="לא נמצאו פרויקטים"
            text="אפשר לשנות את החיפוש או ליצור פרויקט חדש."
          />
        ) : null}
      </div>
    </div>
  );
}

function ProjectEditor({
  project,
  units,
  catalog,
  revisions,
  saveState,
  mutate,
  onSave,
  onPdf,
  pdfBusy,
  onRevisionDownload,
}: {
  project: Project;
  units: Unit[];
  catalog: CatalogItem[];
  revisions: Revision[];
  saveState: SaveState;
  mutate: (change: (draft: Project) => void) => void;
  onSave: () => void;
  onPdf: () => void;
  pdfBusy: boolean;
  onRevisionDownload: (revision: Revision) => void;
}) {
  const totals = calculateProject(project);
  const chapterSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function moveChapter(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    mutate((draft) => {
      const from = draft.chapters.findIndex(
        (chapter) => chapter.id === event.active.id,
      );
      const to = draft.chapters.findIndex(
        (chapter) => chapter.id === event.over!.id,
      );
      draft.chapters = arrayMove(draft.chapters, from, to).map(
        (chapter, index) => ({ ...chapter, sortOrder: index }),
      );
    });
  }

  function updateDetails<Key extends keyof Project["details"]>(
    key: Key,
    value: Project["details"][Key],
  ) {
    mutate((draft) => {
      draft.details[key] = value;
    });
  }

  return (
    <div className="screen editor-screen">
      <header className="editor-toolbar">
        <div>
          <p className="eyebrow">{project.details.documentNumber}</p>
          <h1>{project.details.projectName}</h1>
        </div>
        <div className="editor-actions">
          <span className={`save-state save-${saveState}`}>
            {saveState === "saved"
              ? "כל השינויים נשמרו"
              : saveState === "saving"
                ? "שומר…"
                : saveState === "dirty"
                  ? "שינויים ממתינים לשמירה"
                  : "נדרשת התערבות בשמירה"}
          </span>
          <button className="secondary-button" onClick={onSave}>
            <Check size={16} />
            שמירה עכשיו
          </button>
          <button className="primary-button" onClick={onPdf} disabled={pdfBusy}>
            <FileDown size={17} />
            {pdfBusy ? "מפיק PDF…" : "תצוגה והפקת PDF"}
          </button>
        </div>
      </header>

      <section className="project-meta panel">
        <label>
          <span>שם הפרויקט</span>
          <input
            value={project.details.projectName}
            onChange={(event) =>
              updateDetails("projectName", event.target.value)
            }
          />
        </label>
        <label>
          <span>מספר הצעה</span>
          <input
            dir="ltr"
            value={project.details.documentNumber}
            onChange={(event) =>
              updateDetails("documentNumber", event.target.value)
            }
          />
        </label>
        <label>
          <span>שם הלקוח</span>
          <input
            value={project.details.clientName}
            onChange={(event) =>
              updateDetails("clientName", event.target.value)
            }
          />
        </label>
        <label>
          <span>טלפון / דוא״ל</span>
          <input
            dir="auto"
            value={project.details.clientContact}
            onChange={(event) =>
              updateDetails("clientContact", event.target.value)
            }
          />
        </label>
        <label className="wide">
          <span>כתובת הפרויקט</span>
          <input
            value={project.details.address}
            onChange={(event) => updateDetails("address", event.target.value)}
          />
        </label>
        <label>
          <span>יישוב / מיקום</span>
          <input
            value={project.details.location}
            onChange={(event) => updateDetails("location", event.target.value)}
          />
        </label>
        <label>
          <span>תאריך</span>
          <input
            type="date"
            value={project.details.creationDate}
            onChange={(event) =>
              updateDetails("creationDate", event.target.value)
            }
          />
        </label>
        <label>
          <span>תוקף עד</span>
          <input
            type="date"
            value={project.details.validityDate ?? ""}
            onChange={(event) =>
              updateDetails("validityDate", event.target.value || null)
            }
          />
        </label>
        <label>
          <span>סטטוס</span>
          <select
            value={project.details.status}
            onChange={(event) =>
              updateDetails(
                "status",
                event.target.value as Project["details"]["status"],
              )
            }
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>מע״מ</span>
          <div className="suffix-field">
            <input
              inputMode="decimal"
              dir="ltr"
              value={project.policy.vatRate}
              onChange={(event) => {
                const value = numberInput(event.target.value);
                if (value !== undefined)
                  mutate((draft) => {
                    draft.policy.vatRate = value ?? "0";
                  });
              }}
            />
            <span>%</span>
          </div>
        </label>
      </section>

      <div className="editor-layout">
        <div className="chapters-area">
          <div className="section-heading">
            <div>
              <h2>פרקי כתב הכמויות</h2>
              <p>
                {project.chapters.length} פרקים ·{" "}
                {project.chapters.reduce(
                  (sum, chapter) => sum + chapter.items.length,
                  0,
                )}{" "}
                פריטים
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() =>
                mutate((draft) =>
                  draft.chapters.push(
                    emptyProjectChapter(draft.chapters.length),
                  ),
                )
              }
            >
              <Plus size={16} />
              הוספת פרק
            </button>
          </div>
          <DndContext
            sensors={chapterSensors}
            collisionDetection={closestCenter}
            onDragEnd={moveChapter}
          >
            <SortableContext
              items={project.chapters.map((chapter) => chapter.id)}
              strategy={verticalListSortingStrategy}
            >
              {project.chapters.map((chapter, chapterIndex) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  chapterIndex={chapterIndex}
                  project={project}
                  units={units}
                  catalog={catalog}
                  mutate={mutate}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            className="add-chapter"
            onClick={() =>
              mutate((draft) =>
                draft.chapters.push(emptyProjectChapter(draft.chapters.length)),
              )
            }
          >
            <Plus size={18} />
            הוספת פרק חדש
          </button>

          <section className="notes-panel panel">
            <h2>הערות ותנאים</h2>
            <div className="notes-grid">
              <label>
                <span>הערות ללקוח</span>
                <textarea
                  rows={5}
                  value={project.customerNotes}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.customerNotes = event.target.value;
                    })
                  }
                />
              </label>
              <label>
                <span>תנאים כלליים</span>
                <textarea
                  rows={5}
                  value={project.terms}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.terms = event.target.value;
                    })
                  }
                />
              </label>
              <label>
                <span>הערות פנימיות — אינן מוצגות ב־PDF</span>
                <textarea
                  rows={4}
                  value={project.internalNotes}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.internalNotes = event.target.value;
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="panel revisions-panel">
            <div className="panel-title">
              <div>
                <h2>היסטוריית גרסאות</h2>
                <p>כל הפקת PDF יוצרת צילום מצב שאינו משתנה.</p>
              </div>
              <span className="count-pill">{revisions.length}</span>
            </div>
            {revisions.length ? (
              <ul>
                {revisions.map((revision) => (
                  <li key={revision.id}>
                    <span className="revision-number">R{revision.number}</span>
                    <div>
                      <strong>{revision.reason}</strong>
                      <small>
                        {new Date(revision.createdAt).toLocaleString("he-IL")}
                      </small>
                    </div>
                    <span className="money" dir="ltr">
                      {formatMoney(
                        revision.totals.finalTotal,
                        project.policy.moneyScale,
                      )}
                    </span>
                    {revision.pdfArtifactId ? (
                      <button
                        className="text-button"
                        onClick={() => onRevisionDownload(revision)}
                      >
                        <Download size={14} />
                        PDF
                      </button>
                    ) : (
                      <span>ללא PDF</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">
                עדיין לא נוצרה גרסה. הפקת PDF תיצור את גרסה 1.
              </p>
            )}
          </section>
        </div>

        <aside className="totals-card">
          <div className="totals-heading">
            <Calculator size={19} />
            <div>
              <strong>סיכום כספי</strong>
              <small>מתעדכן בזמן אמת</small>
            </div>
          </div>
          <dl>
            <div>
              <dt>סכום פרקים</dt>
              <dd dir="ltr">
                {formatMoney(
                  totals.documentSubtotal,
                  project.policy.moneyScale,
                )}
              </dd>
            </div>
            <div>
              <dt>הנחת מסמך</dt>
              <dd>
                <DiscountEditor
                  value={project.policy.documentDiscount}
                  onChange={(value) =>
                    mutate((draft) => {
                      draft.policy.documentDiscount = value;
                    })
                  }
                  compact
                />
              </dd>
            </div>
            <div>
              <dt>בסיס חייב</dt>
              <dd dir="ltr">
                {formatMoney(totals.taxableBase, project.policy.moneyScale)}
              </dd>
            </div>
            <div>
              <dt>מע״מ ({project.policy.vatRate}%)</dt>
              <dd dir="ltr">
                {formatMoney(totals.vat, project.policy.moneyScale)}
              </dd>
            </div>
            <div className="grand-total">
              <dt>סה״כ לתשלום</dt>
              <dd dir="ltr">
                {formatMoney(totals.finalTotal, project.policy.moneyScale)}
              </dd>
            </div>
          </dl>
          {totals.optionalSubtotal !==
          (project.policy.moneyScale === 2 ? "0.00" : "0") ? (
            <div className="optional-total">
              <span>אופציות בנפרד</span>
              <strong dir="ltr">
                {formatMoney(
                  totals.optionalSubtotal,
                  project.policy.moneyScale,
                )}
              </strong>
            </div>
          ) : null}
          {totals.missingCount ? (
            <div className="missing-warning">
              <CircleAlert size={17} />
              <span>{totals.missingCount} פריטים ראשיים חסרי מחיר</span>
            </div>
          ) : (
            <div className="complete-note">
              <Check size={16} />
              כל הפריטים הראשיים מתומחרים
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DiscountEditor({
  value,
  onChange,
  compact = false,
}: {
  value: Discount;
  onChange: (value: Discount) => void;
  compact?: boolean;
}) {
  return (
    <div className={`discount-editor${compact ? " compact" : ""}`}>
      <select
        aria-label="סוג הנחה"
        value={value.type}
        onChange={(event) =>
          onChange(
            event.target.value === "none"
              ? { type: "none" }
              : { type: event.target.value as "percent" | "fixed", value: "0" },
          )
        }
      >
        <option value="none">ללא</option>
        <option value="percent">%</option>
        <option value="fixed">₪</option>
      </select>
      {value.type !== "none" ? (
        <input
          aria-label="ערך הנחה"
          inputMode="decimal"
          dir="ltr"
          value={value.value}
          onChange={(event) => {
            const next = numberInput(event.target.value);
            if (next !== undefined) onChange({ ...value, value: next ?? "0" });
          }}
        />
      ) : null}
    </div>
  );
}

function ChapterCard({
  chapter,
  chapterIndex,
  project,
  units,
  catalog,
  mutate,
}: {
  chapter: ProjectChapter;
  chapterIndex: number;
  project: Project;
  units: Unit[];
  catalog: CatalogItem[];
  mutate: (change: (draft: Project) => void) => void;
}) {
  const sortable = useSortable({ id: chapter.id });
  const itemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const calculation = calculateProject(project).chapters.find(
    (value) => value.id === chapter.id,
  )!;
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const updateChapter = (change: (draft: ProjectChapter) => void) =>
    mutate((draft) =>
      change(draft.chapters.find((value) => value.id === chapter.id)!),
    );

  function moveItem(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    updateChapter((draft) => {
      const from = draft.items.findIndex(
        (entry) => entry.id === event.active.id,
      );
      const to = draft.items.findIndex((entry) => entry.id === event.over!.id);
      draft.items = arrayMove(draft.items, from, to).map((entry, index) => ({
        ...entry,
        sortOrder: index,
      }));
    });
  }

  function addCatalogItem(catalogId: string) {
    const source = catalog.find((entry) => entry.id === catalogId);
    if (!source) return;
    updateChapter((draft) =>
      draft.items.push({
        id: `item-${crypto.randomUUID()}`,
        sortOrder: draft.items.length,
        title: source.shortName,
        description: source.description,
        unitId: source.unitId,
        unitName: source.unitName,
        quantity: "1",
        unitPrice: source.unitPrice,
        discount: { type: "none" },
        note: null,
        optional: false,
        hiddenFromPdf: false,
        fixedPrice: false,
        asRequired: false,
        source: "catalog",
        sourceSnapshot: {
          sourceId: source.id,
          code: source.code,
          name: source.shortName,
          description: source.description,
          unitName: source.unitName,
          unitPrice: source.unitPrice,
          sourceUpdatedAt: source.updatedAt,
        },
      }),
    );
  }

  return (
    <section
      ref={sortable.setNodeRef}
      style={style}
      className={`chapter-card panel${chapter.hiddenFromPdf ? " hidden-card" : ""}`}
    >
      <header className="chapter-header">
        <button
          className="drag-handle"
          aria-label={`גרירת פרק ${chapter.title}`}
          title="גרירת פרק"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical size={18} />
        </button>
        <span className="chapter-index">{chapterIndex + 1}</span>
        <input
          className="chapter-title-input"
          aria-label="שם הפרק"
          value={chapter.title}
          onChange={(event) =>
            updateChapter((draft) => {
              draft.title = event.target.value;
            })
          }
        />
        {chapter.optional ? (
          <span className="option-pill">אופציונלי</span>
        ) : null}
        {chapter.hiddenFromPdf ? (
          <span className="hidden-pill">
            <EyeOff size={13} />
            מוסתר
          </span>
        ) : null}
        <span className="chapter-total" dir="ltr">
          {formatMoney(calculation.includedNet, project.policy.moneyScale)}
        </span>
        <div className="row-actions">
          <IconButton
            label={chapter.hiddenFromPdf ? "הצגה ב־PDF" : "הסתרה מ־PDF"}
            onClick={() =>
              updateChapter((draft) => {
                draft.hiddenFromPdf = !draft.hiddenFromPdf;
              })
            }
          >
            {chapter.hiddenFromPdf ? <Eye size={16} /> : <EyeOff size={16} />}
          </IconButton>
          <IconButton
            label="שכפול פרק"
            onClick={() =>
              mutate((draft) => {
                const index = draft.chapters.findIndex(
                  (entry) => entry.id === chapter.id,
                );
                draft.chapters.splice(index + 1, 0, cloneWithNewIds(chapter));
                draft.chapters.forEach((entry, order) => {
                  entry.sortOrder = order;
                });
              })
            }
          >
            <Copy size={16} />
          </IconButton>
          <IconButton
            label="הזזה למעלה"
            disabled={chapterIndex === 0}
            onClick={() =>
              mutate((draft) => {
                draft.chapters = arrayMove(
                  draft.chapters,
                  chapterIndex,
                  chapterIndex - 1,
                ).map((entry, index) => ({ ...entry, sortOrder: index }));
              })
            }
          >
            <ArrowUp size={16} />
          </IconButton>
          <IconButton
            label="הזזה למטה"
            disabled={chapterIndex === project.chapters.length - 1}
            onClick={() =>
              mutate((draft) => {
                draft.chapters = arrayMove(
                  draft.chapters,
                  chapterIndex,
                  chapterIndex + 1,
                ).map((entry, index) => ({ ...entry, sortOrder: index }));
              })
            }
          >
            <ArrowDown size={16} />
          </IconButton>
          <IconButton
            label="מחיקת פרק"
            danger
            onClick={() => {
              if (
                window.confirm(
                  `למחוק את הפרק „${chapter.title}” ואת ${chapter.items.length} הפריטים שבו?`,
                )
              )
                mutate((draft) => {
                  draft.chapters = draft.chapters
                    .filter((entry) => entry.id !== chapter.id)
                    .map((entry, index) => ({ ...entry, sortOrder: index }));
                });
            }}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </header>
      <div className="chapter-options">
        <label className="check-field">
          <input
            type="checkbox"
            checked={chapter.optional}
            onChange={(event) =>
              updateChapter((draft) => {
                draft.optional = event.target.checked;
              })
            }
          />
          פרק אופציונלי
        </label>
        <label>
          <span>הנחת פרק</span>
          <DiscountEditor
            value={chapter.discount}
            onChange={(value) =>
              updateChapter((draft) => {
                draft.discount = value;
              })
            }
            compact
          />
        </label>
      </div>
      <div className="items-table-wrap">
        <DndContext
          sensors={itemSensors}
          collisionDetection={closestCenter}
          onDragEnd={moveItem}
        >
          <table className="items-table">
            <thead>
              <tr>
                <th className="drag-col">
                  <span className="sr-only">סידור</span>
                </th>
                <th className="description-col">תיאור</th>
                <th>יחידה</th>
                <th>כמות</th>
                <th>מחיר יחידה</th>
                <th>הנחה</th>
                <th>סה״כ</th>
                <th>
                  <span className="sr-only">פעולות</span>
                </th>
              </tr>
            </thead>
            <SortableContext
              items={chapter.items.map((entry) => entry.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {chapter.items.map((entry, itemIndex) => (
                  <SortableItemRow
                    key={entry.id}
                    item={entry}
                    itemIndex={itemIndex}
                    itemCount={chapter.items.length}
                    scale={project.policy.moneyScale}
                    units={units}
                    onChange={(change) =>
                      updateChapter((draft) =>
                        change(
                          draft.items.find((value) => value.id === entry.id)!,
                        ),
                      )
                    }
                    onDuplicate={() =>
                      updateChapter((draft) => {
                        const index = draft.items.findIndex(
                          (value) => value.id === entry.id,
                        );
                        draft.items.splice(index + 1, 0, {
                          ...structuredClone(entry),
                          id: `item-${crypto.randomUUID()}`,
                        });
                        draft.items.forEach((value, order) => {
                          value.sortOrder = order;
                        });
                      })
                    }
                    onDelete={() =>
                      updateChapter((draft) => {
                        draft.items = draft.items
                          .filter((value) => value.id !== entry.id)
                          .map((value, index) => ({
                            ...value,
                            sortOrder: index,
                          }));
                      })
                    }
                    onMove={(direction) =>
                      updateChapter((draft) => {
                        const from = draft.items.findIndex(
                          (value) => value.id === entry.id,
                        );
                        draft.items = arrayMove(
                          draft.items,
                          from,
                          from + direction,
                        ).map((value, index) => ({
                          ...value,
                          sortOrder: index,
                        }));
                      })
                    }
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
      <footer className="chapter-footer">
        <div className="button-row">
          <button
            className="text-button"
            onClick={() =>
              updateChapter((draft) =>
                draft.items.push(emptyProjectItem(draft.items.length)),
              )
            }
          >
            <Plus size={15} />
            פריט ידני
          </button>
          <label className="catalog-add">
            <PackageSearch size={15} />
            <select
              aria-label="הוספת פריט מהקטלוג"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) addCatalogItem(event.target.value);
                event.target.value = "";
              }}
            >
              <option value="">הוספה מהקטלוג…</option>
              {catalog
                .filter((entry) => entry.isActive)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.shortName} ·{" "}
                    {entry.unitPrice
                      ? formatMoney(entry.unitPrice)
                      : "ללא מחיר"}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="chapter-summary">
          <span>סה״כ פרק</span>
          <strong dir="ltr">
            {formatMoney(calculation.includedNet, project.policy.moneyScale)}
          </strong>
          {calculation.optionalSubtotal !==
          (project.policy.moneyScale === 2 ? "0.00" : "0") ? (
            <small dir="ltr">
              + אופציות{" "}
              {formatMoney(
                calculation.optionalSubtotal,
                project.policy.moneyScale,
              )}
            </small>
          ) : null}
        </div>
      </footer>
    </section>
  );
}

function SortableItemRow({
  item,
  itemIndex,
  itemCount,
  scale,
  units,
  onChange,
  onDuplicate,
  onDelete,
  onMove,
}: {
  item: ProjectItem;
  itemIndex: number;
  itemCount: number;
  scale: 0 | 2;
  units: Unit[];
  onChange: (change: (draft: ProjectItem) => void) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const sortable = useSortable({ id: item.id });
  const calculation = calculateItem(item, scale);
  return (
    <tr
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={`${item.hiddenFromPdf ? "hidden-item" : ""}${calculation.state === "missing" ? " missing-item" : ""}`}
    >
      <td>
        <button
          className="drag-handle item-drag"
          aria-label={`גרירת פריט ${item.description}`}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td>
        <textarea
          rows={2}
          dir="auto"
          value={item.description}
          aria-label="תיאור פריט"
          onChange={(event) =>
            onChange((draft) => {
              draft.description = event.target.value;
            })
          }
        />
        <input
          className="note-input"
          dir="auto"
          value={item.note ?? ""}
          placeholder="הערה אופציונלית…"
          aria-label="הערת פריט"
          onChange={(event) =>
            onChange((draft) => {
              draft.note = event.target.value || null;
            })
          }
        />
        {item.sourceSnapshot ? (
          <small className="source-note">
            צילום מהקטלוג:{" "}
            {item.sourceSnapshot.code ?? item.sourceSnapshot.name}
          </small>
        ) : null}
      </td>
      <td>
        <select
          value={item.unitId ?? "custom"}
          aria-label="יחידת מידה"
          onChange={(event) => {
            const unit = units.find((value) => value.id === event.target.value);
            if (unit)
              onChange((draft) => {
                draft.unitId = unit.id;
                draft.unitName = unit.nameHe;
              });
          }}
        >
          <option value="custom">{item.unitName}</option>
          {units
            .filter((unit) => unit.isActive)
            .map((unit) => (
              <option value={unit.id} key={unit.id}>
                {unit.nameHe}
              </option>
            ))}
        </select>
      </td>
      <td>
        <input
          className="number-input"
          inputMode="decimal"
          dir="ltr"
          aria-label="כמות"
          disabled={item.fixedPrice || item.asRequired}
          value={item.quantity ?? ""}
          onChange={(event) => {
            const value = numberInput(event.target.value);
            if (value !== undefined)
              onChange((draft) => {
                draft.quantity = value;
              });
          }}
        />
      </td>
      <td>
        <div className="currency-input">
          <span>₪</span>
          <input
            inputMode="decimal"
            dir="ltr"
            aria-label="מחיר יחידה"
            disabled={item.asRequired}
            value={item.unitPrice ?? ""}
            onChange={(event) => {
              const value = numberInput(event.target.value);
              if (value !== undefined)
                onChange((draft) => {
                  draft.unitPrice = value;
                });
            }}
          />
        </div>
      </td>
      <td>
        <DiscountEditor
          value={item.discount}
          onChange={(value) =>
            onChange((draft) => {
              draft.discount = value;
            })
          }
          compact
        />
      </td>
      <td className={`item-total total-${calculation.state}`} dir="ltr">
        {calculation.state === "priced"
          ? formatMoney(calculation.net, scale)
          : calculation.state === "asRequired"
            ? "לפי הצורך"
            : "חסר מחיר"}
      </td>
      <td>
        <div className="row-actions">
          <details className="row-flags">
            <summary aria-label="אפשרויות פריט">•••</summary>
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={item.optional}
                  onChange={(event) =>
                    onChange((draft) => {
                      draft.optional = event.target.checked;
                    })
                  }
                />
                אופציונלי
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.hiddenFromPdf}
                  onChange={(event) =>
                    onChange((draft) => {
                      draft.hiddenFromPdf = event.target.checked;
                    })
                  }
                />
                מוסתר מ־PDF
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.fixedPrice}
                  onChange={(event) =>
                    onChange((draft) => {
                      draft.fixedPrice = event.target.checked;
                    })
                  }
                />
                מחיר גלובלי
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.asRequired}
                  onChange={(event) =>
                    onChange((draft) => {
                      draft.asRequired = event.target.checked;
                    })
                  }
                />
                לפי הצורך
              </label>
            </div>
          </details>
          <IconButton label="שכפול פריט" onClick={onDuplicate}>
            <Copy size={15} />
          </IconButton>
          <IconButton
            label="הזזה למעלה"
            disabled={itemIndex === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={15} />
          </IconButton>
          <IconButton
            label="הזזה למטה"
            disabled={itemIndex === itemCount - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={15} />
          </IconButton>
          <IconButton label="מחיקת פריט" danger onClick={onDelete}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

function TemplatesScreen({
  templates,
  units,
  db,
  onNewProject,
  onChanged,
}: {
  templates: Template[];
  units: Unit[];
  db: BoqDatabase;
  onNewProject: (template: Template) => void;
  onChanged: () => Promise<void>;
}) {
  const [draftTemplate, setDraftTemplate] = useState<Template | null>(null);

  function mutateTemplate(change: (draft: Template) => void) {
    setDraftTemplate((previous) => {
      if (!previous) return previous;
      const next = structuredClone(previous);
      change(next);
      next.updatedAt = new Date().toISOString();
      return next;
    });
  }

  async function saveTemplate() {
    if (!draftTemplate) return;
    await db.templates.put(draftTemplate);
    await onChanged();
    setDraftTemplate(null);
  }

  async function duplicate(template: Template) {
    const now = new Date().toISOString();
    await db.templates.add({
      ...structuredClone(template),
      id: `template-${crypto.randomUUID()}`,
      name: `${template.name} — עותק`,
      chapters: template.chapters.map(cloneWithNewIds),
      createdAt: now,
      updatedAt: now,
    });
    await onChanged();
  }
  async function remove(template: Template) {
    if (
      !window.confirm(
        `למחוק את התבנית „${template.name}”? פרויקטים קיימים לא יושפעו.`,
      )
    )
      return;
    await db.templates.delete(template.id);
    await onChanged();
  }

  if (draftTemplate) {
    return (
      <div className="screen template-editor-screen">
        <header className="screen-header">
          <div>
            <p className="eyebrow">עריכת תבנית</p>
            <h1>{draftTemplate.name}</h1>
            <p>השינויים ישפיעו רק על פרויקטים שייווצרו מהתבנית בעתיד.</p>
          </div>
          <div className="button-row">
            <button onClick={() => setDraftTemplate(null)}>
              <X size={16} />
              ביטול
            </button>
            <button
              className="primary-button"
              onClick={() => void saveTemplate()}
            >
              <Check size={16} />
              שמירת תבנית
            </button>
          </div>
        </header>
        <section className="panel template-meta">
          <label>
            <span>שם התבנית</span>
            <input
              value={draftTemplate.name}
              onChange={(event) =>
                mutateTemplate((draft) => {
                  draft.name = event.target.value;
                })
              }
            />
          </label>
          <label className="wide">
            <span>תיאור</span>
            <input
              value={draftTemplate.description ?? ""}
              onChange={(event) =>
                mutateTemplate((draft) => {
                  draft.description = event.target.value || null;
                })
              }
            />
          </label>
          <label>
            <span>מע״מ</span>
            <input
              dir="ltr"
              inputMode="decimal"
              value={draftTemplate.vatRate}
              onChange={(event) => {
                const value = numberInput(event.target.value);
                if (value !== undefined)
                  mutateTemplate((draft) => {
                    draft.vatRate = value ?? "0";
                  });
              }}
            />
          </label>
        </section>
        <div className="template-chapters">
          {draftTemplate.chapters.map((chapter, chapterIndex) => (
            <section className="panel template-chapter" key={chapter.id}>
              <header>
                <span className="chapter-index">{chapterIndex + 1}</span>
                <input
                  aria-label="שם פרק בתבנית"
                  value={chapter.title}
                  onChange={(event) =>
                    mutateTemplate((draft) => {
                      draft.chapters[chapterIndex].title = event.target.value;
                    })
                  }
                />
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={chapter.optional}
                    onChange={(event) =>
                      mutateTemplate((draft) => {
                        draft.chapters[chapterIndex].optional =
                          event.target.checked;
                      })
                    }
                  />
                  אופציונלי
                </label>
                <div className="row-actions">
                  <IconButton
                    label="הזזת פרק למעלה"
                    disabled={chapterIndex === 0}
                    onClick={() =>
                      mutateTemplate((draft) => {
                        draft.chapters = arrayMove(
                          draft.chapters,
                          chapterIndex,
                          chapterIndex - 1,
                        ).map((entry, index) => ({
                          ...entry,
                          sortOrder: index,
                        }));
                      })
                    }
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label="הזזת פרק למטה"
                    disabled={
                      chapterIndex === draftTemplate.chapters.length - 1
                    }
                    onClick={() =>
                      mutateTemplate((draft) => {
                        draft.chapters = arrayMove(
                          draft.chapters,
                          chapterIndex,
                          chapterIndex + 1,
                        ).map((entry, index) => ({
                          ...entry,
                          sortOrder: index,
                        }));
                      })
                    }
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton
                    label="שכפול פרק בתבנית"
                    onClick={() =>
                      mutateTemplate((draft) => {
                        draft.chapters.splice(
                          chapterIndex + 1,
                          0,
                          cloneWithNewIds(chapter),
                        );
                        draft.chapters.forEach((entry, index) => {
                          entry.sortOrder = index;
                        });
                      })
                    }
                  >
                    <Copy size={15} />
                  </IconButton>
                  <IconButton
                    label="מחיקת פרק מהתבנית"
                    danger
                    onClick={() =>
                      mutateTemplate((draft) => {
                        draft.chapters = draft.chapters
                          .filter((entry) => entry.id !== chapter.id)
                          .map((entry, index) => ({
                            ...entry,
                            sortOrder: index,
                          }));
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </header>
              <table className="data-table template-items-table">
                <thead>
                  <tr>
                    <th>תיאור</th>
                    <th>יחידה</th>
                    <th>כמות</th>
                    <th>מחיר ברירת מחדל</th>
                    <th>
                      <span className="sr-only">פעולות</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chapter.items.map((item, itemIndex) => (
                    <tr key={item.id}>
                      <td>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(event) =>
                            mutateTemplate((draft) => {
                              draft.chapters[chapterIndex].items[
                                itemIndex
                              ].description = event.target.value;
                            })
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={item.unitId ?? "custom"}
                          onChange={(event) => {
                            const unit = units.find(
                              (entry) => entry.id === event.target.value,
                            );
                            if (unit)
                              mutateTemplate((draft) => {
                                const target =
                                  draft.chapters[chapterIndex].items[itemIndex];
                                target.unitId = unit.id;
                                target.unitName = unit.nameHe;
                              });
                          }}
                        >
                          <option value="custom">{item.unitName}</option>
                          {units
                            .filter((unit) => unit.isActive)
                            .map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.nameHe}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <input
                          dir="ltr"
                          inputMode="decimal"
                          value={item.quantity ?? ""}
                          onChange={(event) => {
                            const value = numberInput(event.target.value);
                            if (value !== undefined)
                              mutateTemplate((draft) => {
                                draft.chapters[chapterIndex].items[
                                  itemIndex
                                ].quantity = value;
                              });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          dir="ltr"
                          inputMode="decimal"
                          value={item.unitPrice ?? ""}
                          onChange={(event) => {
                            const value = numberInput(event.target.value);
                            if (value !== undefined)
                              mutateTemplate((draft) => {
                                draft.chapters[chapterIndex].items[
                                  itemIndex
                                ].unitPrice = value;
                              });
                          }}
                        />
                      </td>
                      <td>
                        <div className="row-actions">
                          <IconButton
                            label="הזזת פריט למעלה"
                            disabled={itemIndex === 0}
                            onClick={() =>
                              mutateTemplate((draft) => {
                                const items =
                                  draft.chapters[chapterIndex].items;
                                draft.chapters[chapterIndex].items = arrayMove(
                                  items,
                                  itemIndex,
                                  itemIndex - 1,
                                ).map((entry, index) => ({
                                  ...entry,
                                  sortOrder: index,
                                }));
                              })
                            }
                          >
                            <ArrowUp size={14} />
                          </IconButton>
                          <IconButton
                            label="הזזת פריט למטה"
                            disabled={itemIndex === chapter.items.length - 1}
                            onClick={() =>
                              mutateTemplate((draft) => {
                                const items =
                                  draft.chapters[chapterIndex].items;
                                draft.chapters[chapterIndex].items = arrayMove(
                                  items,
                                  itemIndex,
                                  itemIndex + 1,
                                ).map((entry, index) => ({
                                  ...entry,
                                  sortOrder: index,
                                }));
                              })
                            }
                          >
                            <ArrowDown size={14} />
                          </IconButton>
                          <IconButton
                            label="שכפול פריט בתבנית"
                            onClick={() =>
                              mutateTemplate((draft) => {
                                const items =
                                  draft.chapters[chapterIndex].items;
                                items.splice(itemIndex + 1, 0, {
                                  ...structuredClone(item),
                                  id: `item-${crypto.randomUUID()}`,
                                });
                                items.forEach((entry, index) => {
                                  entry.sortOrder = index;
                                });
                              })
                            }
                          >
                            <Copy size={14} />
                          </IconButton>
                          <IconButton
                            label="מחיקת פריט מהתבנית"
                            danger
                            onClick={() =>
                              mutateTemplate((draft) => {
                                draft.chapters[chapterIndex].items =
                                  draft.chapters[chapterIndex].items
                                    .filter((entry) => entry.id !== item.id)
                                    .map((entry, index) => ({
                                      ...entry,
                                      sortOrder: index,
                                    }));
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="text-button template-add-item"
                onClick={() =>
                  mutateTemplate((draft) =>
                    draft.chapters[chapterIndex].items.push(
                      emptyProjectItem(
                        draft.chapters[chapterIndex].items.length,
                      ),
                    ),
                  )
                }
              >
                <Plus size={15} />
                הוספת פריט לתבנית
              </button>
            </section>
          ))}
          <button
            className="add-chapter"
            onClick={() =>
              mutateTemplate((draft) =>
                draft.chapters.push(emptyProjectChapter(draft.chapters.length)),
              )
            }
          >
            <Plus size={17} />
            הוספת פרק לתבנית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">ספריית מבנים</p>
          <h1>תבניות</h1>
          <p>
            כל פרויקט חדש מקבל עותק עצמאי; שינוי עתידי בתבנית לא משנה פרויקט
            קיים.
          </p>
        </div>
      </header>
      <div className="template-grid">
        {templates.map((template) => (
          <article className="template-card panel" key={template.id}>
            <span className="template-icon">
              <BookTemplate size={22} />
            </span>
            <div>
              <h2>{template.name}</h2>
              <p>{template.description}</p>
            </div>
            <dl>
              <div>
                <dt>פרקים</dt>
                <dd>{template.chapters.length}</dd>
              </div>
              <div>
                <dt>פריטים</dt>
                <dd>
                  {template.chapters.reduce(
                    (sum, chapter) => sum + chapter.items.length,
                    0,
                  )}
                </dd>
              </div>
              <div>
                <dt>מע״מ</dt>
                <dd>{template.vatRate}%</dd>
              </div>
            </dl>
            <footer>
              <button
                className="primary-button"
                onClick={() => onNewProject(template)}
              >
                <FilePlus2 size={16} />
                יצירת פרויקט
              </button>
              <button
                className="secondary-button"
                onClick={() => setDraftTemplate(structuredClone(template))}
              >
                <SettingsIcon size={16} />
                עריכה
              </button>
              <IconButton
                label="שכפול תבנית"
                onClick={() => void duplicate(template)}
              >
                <Copy size={16} />
              </IconButton>
              <IconButton
                label="מחיקת תבנית"
                danger
                disabled={templates.length === 1}
                onClick={() => void remove(template)}
              >
                <Trash2 size={16} />
              </IconButton>
            </footer>
          </article>
        ))}
      </div>
      <div className="info-callout">
        <CircleAlert size={18} />
        <p>
          <strong>בידוד מלא:</strong> עריכת תבנית משנה רק פרויקטים שייוצרו ממנה
          בעתיד; פרויקטים קיימים שומרים את הפרקים, המחירים והתיאורים שצולמו בעת
          היצירה.
        </p>
      </div>
    </div>
  );
}

function CatalogScreen({
  catalog,
  units,
  db,
  onChanged,
}: {
  catalog: CatalogItem[];
  units: Unit[];
  db: BoqDatabase;
  onChanged: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [importNote, setImportNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chapterOptions = [
    ...new Set(
      catalog
        .map((item) => item.defaultChapterName)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const tagOptions = [...new Set(catalog.flatMap((item) => item.tags))].sort();
  const filtered = catalog.filter((item) => {
    const matchesQuery =
      !query ||
      `${item.code ?? ""} ${item.shortName} ${item.description} ${item.tags.join(" ")}`
        .toLocaleLowerCase("he-IL")
        .includes(query.toLocaleLowerCase("he-IL"));
    return (
      matchesQuery &&
      (!chapterFilter || item.defaultChapterName === chapterFilter) &&
      (!tagFilter || item.tags.includes(tagFilter)) &&
      (!activeOnly || item.isActive)
    );
  });
  async function patch(id: string, values: Partial<CatalogItem>) {
    await db.catalogItems.update(id, {
      ...values,
      updatedAt: new Date().toISOString(),
    });
    await onChanged();
  }
  async function add() {
    const now = new Date().toISOString();
    await db.catalogItems.add({
      id: `catalog-${crypto.randomUUID()}`,
      code: null,
      shortName: "פריט חדש",
      description: "תיאור מקצועי",
      defaultChapterName: null,
      unitId: units[0]?.id ?? null,
      unitName: units[0]?.nameHe ?? "יחידה",
      unitPrice: null,
      tags: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await onChanged();
  }
  async function importFile(file: File) {
    try {
      const result = await importCatalogFile(file);
      await db.catalogItems.bulkAdd(result.items);
      await onChanged();
      setImportNote(
        `יובאו ${result.items.length} פריטים${result.errors.length ? `; ${result.errors.length} שורות נדחו` : ""}.`,
      );
    } catch (error) {
      setImportNote(error instanceof Error ? error.message : "הייבוא נכשל");
    }
  }
  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">מקור מחירים מרכזי</p>
          <h1>קטלוג מחירים</h1>
          <p>מחיר קטלוג חדש אינו משנה את צילום המחיר בפרויקטים קיימים.</p>
        </div>
        <button className="primary-button" onClick={() => void add()}>
          <Plus size={17} />
          פריט קטלוג
        </button>
      </header>
      <div className="toolbar panel">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש קוד, שם, תיאור או תגית…"
          />
        </label>
        <select
          aria-label="סינון לפי פרק"
          value={chapterFilter}
          onChange={(event) => setChapterFilter(event.target.value)}
        >
          <option value="">כל הפרקים</option>
          {chapterOptions.map((chapter) => (
            <option key={chapter} value={chapter}>
              {chapter}
            </option>
          ))}
        </select>
        <select
          aria-label="סינון לפי תגית"
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
        >
          <option value="">כל התגיות</option>
          {tagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <label className="check-field">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(event) => setActiveOnly(event.target.checked)}
          />
          פעילים בלבד
        </label>
        <div className="button-row">
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
              event.target.value = "";
            }}
          />
          <button onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            ייבוא CSV / Excel
          </button>
          <button
            onClick={() =>
              downloadBlob(
                exportCatalogCsv(catalog),
                `catalog-${todayStamp()}.csv`,
              )
            }
          >
            <Download size={16} />
            CSV
          </button>
          <button
            onClick={() =>
              void exportCatalogXlsx(catalog).then((blob) =>
                downloadBlob(blob, `catalog-${todayStamp()}.xlsx`),
              )
            }
          >
            <Download size={16} />
            Excel
          </button>
        </div>
      </div>
      {importNote ? (
        <div className="info-callout">
          <CircleAlert size={17} />
          <p>{importNote}</p>
          <button onClick={() => setImportNote(null)} aria-label="סגירה">
            <X size={15} />
          </button>
        </div>
      ) : null}
      <div className="panel table-panel catalog-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>קוד</th>
              <th>שם קצר</th>
              <th>תיאור מקצועי</th>
              <th>פרק ברירת מחדל</th>
              <th>יחידה</th>
              <th>מחיר</th>
              <th>תגיות</th>
              <th>מצב</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className={!item.isActive ? "muted-row" : ""}>
                <td>
                  <input
                    dir="ltr"
                    defaultValue={item.code ?? ""}
                    onBlur={(event) =>
                      void patch(item.id, { code: event.target.value || null })
                    }
                  />
                </td>
                <td>
                  <input
                    defaultValue={item.shortName}
                    onBlur={(event) =>
                      void patch(item.id, { shortName: event.target.value })
                    }
                  />
                </td>
                <td>
                  <textarea
                    rows={2}
                    defaultValue={item.description}
                    onBlur={(event) =>
                      void patch(item.id, { description: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    defaultValue={item.defaultChapterName ?? ""}
                    onBlur={(event) =>
                      void patch(item.id, {
                        defaultChapterName: event.target.value || null,
                      })
                    }
                  />
                </td>
                <td>
                  <select
                    value={item.unitId ?? "custom"}
                    onChange={(event) => {
                      const unit = units.find(
                        (entry) => entry.id === event.target.value,
                      );
                      if (unit)
                        void patch(item.id, {
                          unitId: unit.id,
                          unitName: unit.nameHe,
                        });
                    }}
                  >
                    <option value="custom">{item.unitName}</option>
                    {units
                      .filter((unit) => unit.isActive)
                      .map((unit) => (
                        <option value={unit.id} key={unit.id}>
                          {unit.nameHe}
                        </option>
                      ))}
                  </select>
                </td>
                <td>
                  <input
                    dir="ltr"
                    inputMode="decimal"
                    defaultValue={item.unitPrice ?? ""}
                    onBlur={(event) => {
                      const value = numberInput(event.target.value);
                      if (value !== undefined)
                        void patch(item.id, { unitPrice: value });
                    }}
                  />
                </td>
                <td>
                  <input
                    defaultValue={item.tags.join(", ")}
                    onBlur={(event) =>
                      void patch(item.id, {
                        tags: event.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    className={`toggle-button ${item.isActive ? "on" : ""}`}
                    aria-pressed={item.isActive}
                    onClick={() =>
                      void patch(item.id, { isActive: !item.isActive })
                    }
                  >
                    {item.isActive ? "פעיל" : "לא פעיל"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsScreen({
  settings,
  units,
  db,
  onChanged,
}: {
  settings: Settings;
  units: Unit[];
  db: BoqDatabase;
  onChanged: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => structuredClone(settings));
  const [customUnit, setCustomUnit] = useState("");
  const backupRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    void (async () => {
      if (!settings.logoArtifactId) return;
      const artifact = await db.artifacts.get(settings.logoArtifactId);
      if (artifact) {
        url = URL.createObjectURL(artifact.blob);
        setLogoPreview(url);
      }
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [db, settings.logoArtifactId]);
  async function save() {
    const next = {
      ...draft,
      updatedAt: new Date().toISOString(),
      onboardingCompleted: true,
    };
    await db.settings.put(next);
    await onChanged();
  }
  async function addUnit() {
    const name = customUnit.trim();
    if (!name) return;
    const now = new Date().toISOString();
    await db.units.add({
      id: `unit-${crypto.randomUUID()}`,
      nameHe: name,
      abbreviation: name,
      isSystem: false,
      isActive: true,
      sortOrder: units.length,
      createdAt: now,
      updatedAt: now,
    });
    setCustomUnit("");
    await onChanged();
  }
  async function removeUnit(unit: Unit) {
    if (
      !window.confirm(
        `למחוק את היחידה „${unit.nameHe}”? פריטים קיימים ישמרו את שם היחידה שלהם.`,
      )
    )
      return;
    await db.transaction("rw", db.units, db.catalogItems, async () => {
      const catalogRows = await db.catalogItems
        .where("unitId")
        .equals(unit.id)
        .toArray();
      await Promise.all(
        catalogRows.map((item) =>
          db.catalogItems.update(item.id, { unitId: null }),
        ),
      );
      await db.units.delete(unit.id);
    });
    await onChanged();
  }
  async function uploadLogo(file: File) {
    if (file.size > 2 * 1024 * 1024) throw new Error("הלוגו גדול מ־2MB");
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const png =
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const jpeg =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    if (!png && !jpeg) throw new Error("ניתן להעלות לוגו PNG או JPEG בלבד");
    const safeBlob = new Blob([await file.arrayBuffer()], {
      type: png ? "image/png" : "image/jpeg",
    });
    const artifact = await storeLogoArtifact(db, safeBlob, file.name);
    const next = {
      ...draft,
      logoArtifactId: artifact.id,
      updatedAt: new Date().toISOString(),
    };
    setDraft(next);
    await db.settings.put(next);
    await onChanged();
  }
  async function backup() {
    const blob = await exportPortableBackup(db);
    downloadBlob(blob, `aviel-boq-backup-${todayStamp()}.boqbackup`);
    await db.settings.update("main", {
      lastExternalBackupAt: new Date().toISOString(),
    });
    await onChanged();
  }
  async function restore(file: File) {
    if (
      !window.confirm(
        "השחזור יחליף את כל הנתונים המקומיים בנתוני הגיבוי. להמשיך?",
      )
    )
      return;
    await restorePortableBackup(db, file);
    await onChanged();
    location.reload();
  }
  return (
    <div className="screen settings-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">זהות, ברירות מחדל ובטיחות</p>
          <h1>הגדרות חברה</h1>
          <p>
            פרטי החברה נשמרים כצילום בכל פרויקט חדש ואינם משנים מסמכים
            היסטוריים.
          </p>
        </div>
        <button className="primary-button" onClick={() => void save()}>
          <Check size={17} />
          שמירת הגדרות
        </button>
      </header>
      <div className="settings-grid">
        <section className="panel form-panel">
          <h2>פרטי החברה</h2>
          <div className="logo-control">
            <div className="logo-preview">
              {logoPreview ? (
                // Blob URLs are local previews and should not pass through Next's remote image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="לוגו החברה" />
              ) : (
                <span>ללא לוגו</span>
              )}
            </div>
            <div>
              <strong>לוגו למסמכי PDF</strong>
              <p>
                PNG או JPEG, עד 2MB. הלוגו נקשר לפרויקטים חדשים ואינו נשלף משרת
                חיצוני.
              </p>
              <input
                ref={logoRef}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file)
                    void uploadLogo(file).catch((error) =>
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "העלאת הלוגו נכשלה",
                      ),
                    );
                  event.target.value = "";
                }}
              />
              <button
                className="secondary-button"
                onClick={() => logoRef.current?.click()}
              >
                <Upload size={16} />
                בחירת לוגו
              </button>
            </div>
          </div>
          <div className="form-grid">
            <label>
              <span>שם החברה</span>
              <input
                value={draft.company.name}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    company: { ...draft.company, name: event.target.value },
                  })
                }
              />
            </label>
            <label>
              <span>שורת תיאור</span>
              <input
                value={draft.company.tagline}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    company: { ...draft.company, tagline: event.target.value },
                  })
                }
              />
            </label>
            <label className="wide">
              <span>כתובת</span>
              <input
                value={draft.company.address}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    company: { ...draft.company, address: event.target.value },
                  })
                }
              />
            </label>
            <label>
              <span>טלפון</span>
              <input
                dir="ltr"
                value={draft.company.phone}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    company: { ...draft.company, phone: event.target.value },
                  })
                }
              />
            </label>
            <label>
              <span>דוא״ל</span>
              <input
                dir="ltr"
                value={draft.company.email}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    company: { ...draft.company, email: event.target.value },
                  })
                }
              />
            </label>
            <label>
              <span>עוסק / ח.פ.</span>
              <input
                dir="ltr"
                value={draft.company.businessNumber}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    company: {
                      ...draft.company,
                      businessNumber: event.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              <span>מע״מ ברירת מחדל</span>
              <input
                dir="ltr"
                value={draft.defaults.vatRate}
                onChange={(event) => {
                  const value = numberInput(event.target.value);
                  if (value !== undefined)
                    setDraft({
                      ...draft,
                      defaults: { ...draft.defaults, vatRate: value ?? "0" },
                    });
                }}
              />
            </label>
            <label>
              <span>תוקף הצעה בימים</span>
              <input
                type="number"
                min="0"
                max="365"
                value={draft.defaults.validityDays}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    defaults: {
                      ...draft.defaults,
                      validityDays: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label>
              <span>דיוק כספי</span>
              <select
                value={draft.defaults.moneyScale}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    defaults: {
                      ...draft.defaults,
                      moneyScale: Number(event.target.value) as 0 | 2,
                    },
                  })
                }
              >
                <option value="2">שתי ספרות אחרי הנקודה</option>
                <option value="0">שקל שלם</option>
              </select>
            </label>
            <label className="wide">
              <span>הערות ברירת מחדל</span>
              <textarea
                rows={4}
                value={draft.defaults.customerNotes}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    defaults: {
                      ...draft.defaults,
                      customerNotes: event.target.value,
                    },
                  })
                }
              />
            </label>
            <label className="wide">
              <span>תנאים כלליים</span>
              <textarea
                rows={6}
                value={draft.defaults.terms}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    defaults: { ...draft.defaults, terms: event.target.value },
                  })
                }
              />
            </label>
          </div>
        </section>
        <div className="settings-side">
          <section className="panel">
            <h2>יחידות מותאמות</h2>
            <div className="unit-list">
              {units.map((unit) => (
                <div key={unit.id}>
                  {unit.isSystem ? (
                    <span>{unit.nameHe}</span>
                  ) : (
                    <input
                      aria-label={`שם היחידה ${unit.nameHe}`}
                      defaultValue={unit.nameHe}
                      onBlur={(event) => {
                        const name = event.target.value.trim();
                        if (name)
                          void db.units
                            .update(unit.id, {
                              nameHe: name,
                              abbreviation: name,
                              updatedAt: new Date().toISOString(),
                            })
                            .then(onChanged);
                      }}
                    />
                  )}
                  <small>{unit.isSystem ? "מערכת" : "מותאמת"}</small>
                  {!unit.isSystem ? (
                    <span className="unit-actions">
                      <button
                        onClick={() =>
                          void db.units
                            .update(unit.id, { isActive: !unit.isActive })
                            .then(onChanged)
                        }
                      >
                        {unit.isActive ? "השבתה" : "הפעלה"}
                      </button>
                      <button
                        className="danger-text"
                        onClick={() => void removeUnit(unit)}
                      >
                        מחיקה
                      </button>
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="inline-add">
              <input
                value={customUnit}
                onChange={(event) => setCustomUnit(event.target.value)}
                placeholder="שם יחידה חדשה"
              />
              <button onClick={() => void addUnit()}>
                <Plus size={16} />
                הוספה
              </button>
            </div>
          </section>
          <section className="panel backup-panel">
            <h2>גיבוי ושחזור</h2>
            <p>
              קובץ גיבוי נייד מכיל את כל הפרויקטים, הגרסאות, התבניות וה־PDF
              השמורים.
            </p>
            <button className="primary-button" onClick={() => void backup()}>
              <DatabaseBackup size={17} />
              הפקת גיבוי מלא
            </button>
            <input
              ref={backupRef}
              className="sr-only"
              type="file"
              accept=".boqbackup,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void restore(file);
              }}
            />
            <button
              className="secondary-button"
              onClick={() => backupRef.current?.click()}
            >
              <Upload size={17} />
              שחזור מגיבוי
            </button>
            <small>
              {settings.lastExternalBackupAt
                ? `גיבוי חיצוני אחרון: ${new Date(settings.lastExternalBackupAt).toLocaleString("he-IL")}`
                : "עדיין לא תועד גיבוי חיצוני"}
            </small>
          </section>
        </div>
      </div>
    </div>
  );
}
