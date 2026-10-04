import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { ISSUE_PRIORITIES, ISSUE_TYPES } from "../lib/constants";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  nextIssueNumber: integer("next_issue_number").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const columns = sqliteTable("columns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull(),
});

export const issues = sqliteTable(
  "issues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    columnId: integer("column_id")
      .notNull()
      .references(() => columns.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    type: text("type", { enum: ISSUE_TYPES }).notNull().default("task"),
    priority: text("priority", { enum: ISSUE_PRIORITIES })
      .notNull()
      .default("medium"),
    position: integer("position").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("issues_project_number_idx").on(t.projectId, t.number)],
);

export type Project = typeof projects.$inferSelect;
export type Column = typeof columns.$inferSelect;
export type Issue = typeof issues.$inferSelect;
