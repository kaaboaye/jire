import { and, asc, count, eq, getTableColumns, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { columns, issues, members, projects, xpAwards } from "@/db/schema";

export function listProjects() {
  return getDb()
    .select({ ...getTableColumns(projects), issueCount: count(issues.id) })
    .from(projects)
    .leftJoin(issues, eq(issues.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(asc(projects.name))
    .all();
}

export function getProjectByKey(key: string) {
  return getDb()
    .select()
    .from(projects)
    .where(eq(projects.key, key.toUpperCase()))
    .get();
}

export function getColumns(projectId: number) {
  return getDb()
    .select()
    .from(columns)
    .where(eq(columns.projectId, projectId))
    .orderBy(asc(columns.position))
    .all();
}

export function getBoard(projectId: number) {
  const projectIssues = getDb()
    .select({
      id: issues.id,
      columnId: issues.columnId,
      number: issues.number,
      title: issues.title,
      type: issues.type,
      priority: issues.priority,
      assigneeId: issues.assigneeId,
      assigneeName: members.name,
    })
    .from(issues)
    .leftJoin(members, eq(members.id, issues.assigneeId))
    .where(eq(issues.projectId, projectId))
    .orderBy(asc(issues.position))
    .all();

  return getColumns(projectId).map((column) => ({
    id: column.id,
    name: column.name,
    isDone: column.isDone,
    issues: projectIssues.filter((issue) => issue.columnId === column.id),
  }));
}

export function getIssue(projectId: number, number: number) {
  return getDb()
    .select()
    .from(issues)
    .where(and(eq(issues.projectId, projectId), eq(issues.number, number)))
    .get();
}

/** Team members with their XP totals, in alphabetical order. */
export function listMembers() {
  return getDb()
    .select({
      id: members.id,
      name: members.name,
      xp: sql<number>`coalesce(sum(${xpAwards.amount}), 0)`.mapWith(Number),
      completed: count(xpAwards.id),
    })
    .from(members)
    .leftJoin(xpAwards, eq(xpAwards.memberId, members.id))
    .groupBy(members.id)
    .all()
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

export type TeamMember = ReturnType<typeof listMembers>[number];
export type ProjectSummary = ReturnType<typeof listProjects>[number];
export type BoardColumn = ReturnType<typeof getBoard>[number];
export type BoardIssue = BoardColumn["issues"][number];
