"use server";

import { asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, type Tx } from "@/db";
import { columns, issues, members, projects } from "@/db/schema";
import {
  DEFAULT_COLUMNS,
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  PROJECT_KEY_PATTERN,
  type IssuePriority,
  type IssueType,
  type XpGain,
} from "@/lib/constants";
import {
  THEME_MODE_COOKIE,
  THEME_PALETTE_COOKIE,
  isThemeMode,
  isThemePalette,
} from "@/lib/theme";
import { syncIssueXp } from "@/lib/xp";

export type ActionResult = { error?: string; xp?: XpGain };

const MAX_NAME = 80;
const MAX_MEMBER_NAME = 60;
const MAX_TITLE = 200;

// Everything lives under one layout that lists projects, so refreshing from
// the root keeps the sidebar, board and open issue in sync after any change.
function refresh() {
  revalidatePath("/", "layout");
}

function cleanName(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isId(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function issueCount(tx: Tx, columnId: number) {
  return (
    tx
      .select({ n: count() })
      .from(issues)
      .where(eq(issues.columnId, columnId))
      .get()?.n ?? 0
  );
}

function orderedIssueIds(tx: Tx, columnId: number) {
  return tx
    .select({ id: issues.id })
    .from(issues)
    .where(eq(issues.columnId, columnId))
    .orderBy(asc(issues.position))
    .all()
    .map((row) => row.id);
}

function writeIssueOrder(tx: Tx, columnId: number, ids: number[]) {
  ids.forEach((id, position) => {
    tx.update(issues).set({ columnId, position }).where(eq(issues.id, id)).run();
  });
}

function orderedColumns(tx: Tx, projectId: number) {
  return tx
    .select()
    .from(columns)
    .where(eq(columns.projectId, projectId))
    .orderBy(asc(columns.position))
    .all();
}

function writeColumnOrder(tx: Tx, ids: number[]) {
  ids.forEach((id, position) => {
    tx.update(columns).set({ position }).where(eq(columns.id, id)).run();
  });
}

// ---------------------------------------------------------------- projects

export async function createProject(input: {
  name: string;
  key: string;
  description: string;
}): Promise<ActionResult> {
  const name = cleanName(input.name, MAX_NAME);
  const key = cleanName(input.key, 10).toUpperCase();
  const description = cleanName(input.description, 2000);

  if (!name) return { error: "Podaj nazwę projektu." };
  if (!PROJECT_KEY_PATTERN.test(key)) {
    return {
      error: "Klucz musi mieć 2–10 znaków: litery A–Z i cyfry, zaczynając od litery.",
    };
  }

  const db = getDb();
  const taken = db.select().from(projects).where(eq(projects.key, key)).get();
  if (taken) return { error: `Klucz ${key} jest już zajęty.` };

  db.transaction((tx) => {
    const project = tx
      .insert(projects)
      .values({ name, key, description })
      .returning({ id: projects.id })
      .get();
    DEFAULT_COLUMNS.forEach((columnName, position) => {
      tx.insert(columns)
        .values({
          projectId: project.id,
          name: columnName,
          position,
          isDone: position === DEFAULT_COLUMNS.length - 1,
        })
        .run();
    });
  });

  refresh();
  redirect(`/projects/${key}`);
}

export async function updateProject(
  projectId: number,
  input: { name: string; description: string },
): Promise<ActionResult> {
  if (!isId(projectId)) return { error: "Nieprawidłowy projekt." };
  const name = cleanName(input.name, MAX_NAME);
  if (!name) return { error: "Podaj nazwę projektu." };

  getDb()
    .update(projects)
    .set({ name, description: cleanName(input.description, 2000) })
    .where(eq(projects.id, projectId))
    .run();

  refresh();
  return {};
}

export async function deleteProject(projectId: number): Promise<void> {
  if (!isId(projectId)) return;
  getDb().delete(projects).where(eq(projects.id, projectId)).run();
  refresh();
  redirect("/");
}

// ----------------------------------------------------------------- columns

export async function addColumn(
  projectId: number,
  rawName: string,
): Promise<ActionResult> {
  if (!isId(projectId)) return { error: "Nieprawidłowy projekt." };
  const name = cleanName(rawName, MAX_NAME);
  if (!name) return { error: "Podaj nazwę kolumny." };

  getDb().transaction((tx) => {
    const position = orderedColumns(tx, projectId).length;
    tx.insert(columns).values({ projectId, name, position }).run();
  });

  refresh();
  return {};
}

export async function renameColumn(
  columnId: number,
  rawName: string,
): Promise<ActionResult> {
  if (!isId(columnId)) return { error: "Nieprawidłowa kolumna." };
  const name = cleanName(rawName, MAX_NAME);
  if (!name) return { error: "Nazwa kolumny nie może być pusta." };

  getDb().update(columns).set({ name }).where(eq(columns.id, columnId)).run();

  refresh();
  return {};
}

/** Marks a column as done (or not); its issues gain or lose their XP. */
export async function setColumnDone(
  columnId: number,
  isDone: boolean,
): Promise<ActionResult> {
  if (!isId(columnId) || typeof isDone !== "boolean") {
    return { error: "Nieprawidłowa kolumna." };
  }

  const error = getDb().transaction((tx) => {
    const column = tx.select().from(columns).where(eq(columns.id, columnId)).get();
    if (!column) return "Kolumna już nie istnieje.";
    tx.update(columns).set({ isDone }).where(eq(columns.id, columnId)).run();
    orderedIssueIds(tx, columnId).forEach((id) => syncIssueXp(tx, id));
    return null;
  });

  if (error) return { error };
  refresh();
  return {};
}

export async function moveColumn(
  columnId: number,
  direction: -1 | 1,
): Promise<void> {
  if (!isId(columnId) || (direction !== -1 && direction !== 1)) return;

  getDb().transaction((tx) => {
    const column = tx.select().from(columns).where(eq(columns.id, columnId)).get();
    if (!column) return;
    const ids = orderedColumns(tx, column.projectId).map((c) => c.id);
    const from = ids.indexOf(columnId);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    writeColumnOrder(tx, ids);
  });

  refresh();
}

/** Deletes a column; its issues move to the end of the first remaining one. */
export async function deleteColumn(columnId: number): Promise<ActionResult> {
  if (!isId(columnId)) return { error: "Nieprawidłowa kolumna." };

  const error = getDb().transaction((tx) => {
    const column = tx.select().from(columns).where(eq(columns.id, columnId)).get();
    if (!column) return "Kolumna już nie istnieje.";

    const remaining = orderedColumns(tx, column.projectId).filter(
      (c) => c.id !== columnId,
    );
    if (remaining.length === 0) {
      return "Projekt musi mieć co najmniej jedną kolumnę.";
    }

    const target = remaining[0];
    const moved = orderedIssueIds(tx, columnId);
    writeIssueOrder(tx, target.id, [...orderedIssueIds(tx, target.id), ...moved]);
    moved.forEach((id) => syncIssueXp(tx, id));
    tx.delete(columns).where(eq(columns.id, columnId)).run();
    writeColumnOrder(
      tx,
      remaining.map((c) => c.id),
    );
    return null;
  });

  if (error) return { error };
  refresh();
  return {};
}

// ------------------------------------------------------------------ issues

export async function createIssue(
  columnId: number,
  rawTitle: string,
): Promise<ActionResult> {
  if (!isId(columnId)) return { error: "Nieprawidłowa kolumna." };
  const title = cleanName(rawTitle, MAX_TITLE);
  if (!title) return { error: "Podaj tytuł zadania." };

  const error = getDb().transaction((tx) => {
    const column = tx.select().from(columns).where(eq(columns.id, columnId)).get();
    if (!column) return "Kolumna już nie istnieje.";
    const project = tx
      .select()
      .from(projects)
      .where(eq(projects.id, column.projectId))
      .get();
    if (!project) return "Projekt już nie istnieje.";

    tx.update(projects)
      .set({ nextIssueNumber: project.nextIssueNumber + 1 })
      .where(eq(projects.id, project.id))
      .run();
    tx.insert(issues)
      .values({
        projectId: project.id,
        columnId,
        number: project.nextIssueNumber,
        title,
        position: issueCount(tx, columnId),
      })
      .run();
    return null;
  });

  if (error) return { error };
  refresh();
  return {};
}

export async function updateIssue(
  issueId: number,
  input: {
    title: string;
    description: string;
    type: IssueType;
    priority: IssuePriority;
    columnId: number;
    assigneeId: number | null;
  },
): Promise<ActionResult> {
  if (
    !isId(issueId) ||
    !isId(input.columnId) ||
    (input.assigneeId !== null && !isId(input.assigneeId))
  ) {
    return { error: "Nieprawidłowe zadanie." };
  }
  const title = cleanName(input.title, MAX_TITLE);
  if (!title) return { error: "Tytuł nie może być pusty." };
  if (!ISSUE_TYPES.includes(input.type)) return { error: "Nieznany typ." };
  if (!ISSUE_PRIORITIES.includes(input.priority)) {
    return { error: "Nieznany priorytet." };
  }
  const description =
    typeof input.description === "string" ? input.description.slice(0, 20000) : "";

  const result = getDb().transaction((tx): ActionResult => {
    const issue = tx.select().from(issues).where(eq(issues.id, issueId)).get();
    if (!issue) return { error: "Zadanie już nie istnieje." };

    if (
      input.assigneeId !== null &&
      !tx.select().from(members).where(eq(members.id, input.assigneeId)).get()
    ) {
      return { error: "Ta osoba została usunięta z zespołu." };
    }

    if (input.columnId !== issue.columnId) {
      const target = tx
        .select()
        .from(columns)
        .where(eq(columns.id, input.columnId))
        .get();
      if (!target || target.projectId !== issue.projectId) {
        return { error: "Kolumna już nie istnieje." };
      }
      writeIssueOrder(tx, target.id, [...orderedIssueIds(tx, target.id), issueId]);
      writeIssueOrder(tx, issue.columnId, orderedIssueIds(tx, issue.columnId));
    }

    tx.update(issues)
      .set({
        title,
        description,
        type: input.type,
        priority: input.priority,
        assigneeId: input.assigneeId,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, issueId))
      .run();
    return { xp: syncIssueXp(tx, issueId) ?? undefined };
  });

  if (!result.error) refresh();
  return result;
}

export async function deleteIssue(issueId: number): Promise<void> {
  if (!isId(issueId)) return;

  const projectKey = getDb().transaction((tx) => {
    const issue = tx.select().from(issues).where(eq(issues.id, issueId)).get();
    if (!issue) return null;
    tx.delete(issues).where(eq(issues.id, issueId)).run();
    writeIssueOrder(tx, issue.columnId, orderedIssueIds(tx, issue.columnId));
    return (
      tx
        .select({ key: projects.key })
        .from(projects)
        .where(eq(projects.id, issue.projectId))
        .get()?.key ?? null
    );
  });

  refresh();
  redirect(projectKey ? `/projects/${projectKey}` : "/");
}

/** Drops an issue at `toIndex` of `toColumnId` (same or different column). */
export async function moveIssue(
  issueId: number,
  toColumnId: number,
  toIndex: number,
): Promise<ActionResult> {
  if (!isId(issueId) || !isId(toColumnId) || !Number.isInteger(toIndex)) return {};

  const xp = getDb().transaction((tx) => {
    const issue = tx.select().from(issues).where(eq(issues.id, issueId)).get();
    if (!issue) return null;
    const target = tx.select().from(columns).where(eq(columns.id, toColumnId)).get();
    if (!target || target.projectId !== issue.projectId) return null;

    const targetIds = orderedIssueIds(tx, toColumnId).filter((id) => id !== issueId);
    const index = Math.max(0, Math.min(toIndex, targetIds.length));
    targetIds.splice(index, 0, issueId);
    writeIssueOrder(tx, toColumnId, targetIds);

    if (issue.columnId !== toColumnId) {
      writeIssueOrder(tx, issue.columnId, orderedIssueIds(tx, issue.columnId));
    }
    return syncIssueXp(tx, issueId);
  });

  refresh();
  return { xp: xp ?? undefined };
}

// -------------------------------------------------------------------- team

// Compared in JS: SQLite's lower() only folds ASCII, so it would miss "Łukasz".
function memberNameTaken(tx: Tx, name: string, exceptId?: number) {
  const wanted = name.toLocaleLowerCase("pl");
  return tx
    .select()
    .from(members)
    .all()
    .some((m) => m.id !== exceptId && m.name.toLocaleLowerCase("pl") === wanted);
}

export async function createMember(rawName: string): Promise<ActionResult> {
  const name = cleanName(rawName, MAX_MEMBER_NAME);
  if (!name) return { error: "Podaj imię lub nazwę osoby." };

  const error = getDb().transaction((tx) => {
    if (memberNameTaken(tx, name)) return `Osoba „${name}” już jest w zespole.`;
    tx.insert(members).values({ name }).run();
    return null;
  });

  if (error) return { error };
  refresh();
  return {};
}

export async function renameMember(
  memberId: number,
  rawName: string,
): Promise<ActionResult> {
  if (!isId(memberId)) return { error: "Nieprawidłowa osoba." };
  const name = cleanName(rawName, MAX_MEMBER_NAME);
  if (!name) return { error: "Nazwa osoby nie może być pusta." };

  const error = getDb().transaction((tx) => {
    if (memberNameTaken(tx, name, memberId)) {
      return `Osoba „${name}” już jest w zespole.`;
    }
    tx.update(members).set({ name }).where(eq(members.id, memberId)).run();
    return null;
  });

  if (error) return { error };
  refresh();
  return {};
}

/** Deletes a person with their XP; their issues become unassigned. */
export async function deleteMember(memberId: number): Promise<void> {
  if (!isId(memberId)) return;
  getDb().delete(members).where(eq(members.id, memberId)).run();
  refresh();
}

const THEME_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  httpOnly: true,
} as const;

// The theme is a per-browser preference, so it lives in cookies rather than
// the database. Setting them makes Next.js re-render the root layout, which
// puts the new values on <html>.
export async function saveTheme(input: { mode: unknown; palette: unknown }) {
  if (!isThemeMode(input?.mode) || !isThemePalette(input?.palette)) return;
  const cookieStore = await cookies();
  cookieStore.set(THEME_MODE_COOKIE, input.mode, THEME_COOKIE_OPTIONS);
  cookieStore.set(THEME_PALETTE_COOKIE, input.palette, THEME_COOKIE_OPTIONS);
}
