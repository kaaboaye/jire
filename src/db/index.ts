import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Survives dev-server hot reloads, so we keep a single connection per process.
const globalForDb = globalThis as unknown as { __jireDb?: Db };

// Opened lazily so that importing this module (e.g. during `next build`)
// never touches the database file.
export function getDb(): Db {
  if (globalForDb.__jireDb) return globalForDb.__jireDb;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const sqlite = new Database(path.join(dataDir, "jire.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  globalForDb.__jireDb = db;
  return db;
}
