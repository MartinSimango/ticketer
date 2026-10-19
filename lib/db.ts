import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import {
  STATUSES,
  PRIORITIES,
  TYPES,
  type Status,
  type Priority,
  type TicketType,
} from "./types";
import { resolveDbPath } from "./settings";

const DB_PATH = resolveDbPath();

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id         TEXT PRIMARY KEY,
      key        TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type        TEXT NOT NULL DEFAULT 'task',
      status      TEXT NOT NULL DEFAULT 'backlog',
      priority    TEXT NOT NULL DEFAULT 'medium',
      assignee    TEXT NOT NULL DEFAULT '',
      labels      TEXT NOT NULL DEFAULT '',
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed demo data only once, on first database creation. Tracking this with a
  // persistent flag (rather than "is the table empty?") means a user who
  // intentionally deletes every project keeps an empty board instead of having
  // the sample data reappear.
  const alreadySeeded = db
    .prepare("SELECT value FROM meta WHERE key = 'seeded'")
    .get();
  if (!alreadySeeded) {
    seed(db);
    db.prepare("INSERT INTO meta (key, value) VALUES ('seeded', ?)").run(
      new Date().toISOString()
    );
  }
  return db;
}

function seed(database: DatabaseSync) {
  const count = database
    .prepare("SELECT COUNT(*) AS c FROM projects")
    .get() as { c: number };
  if (count.c > 0) return;

  const now = new Date().toISOString();

  const projects: Array<{ key: string; name: string }> = [
    { key: "WEB", name: "Web App" },
    { key: "API", name: "Backend API" },
  ];

  const insertProject = database.prepare(
    `INSERT INTO projects (id, key, name, created_at) VALUES (?, ?, ?, ?)`
  );
  projects.forEach((p, i) => {
    insertProject.run(`PROJ-${i + 1}`, p.key, p.name, now);
  });

  const samples: Array<{
    project: string;
    title: string;
    description: string;
    type: TicketType;
    status: Status;
    priority: Priority;
    assignee: string;
    labels: string[];
  }> = [
    {
      project: "WEB",
      title: "Set up project repository",
      description: "Initialize the repo, CI, and base tooling.",
      type: "task",
      status: "done",
      priority: "high",
      assignee: "Ada",
      labels: ["infra"],
    },
    {
      project: "WEB",
      title: "Design the kanban board layout",
      description: "Five columns, blue & white theme, drag-and-drop.",
      type: "story",
      status: "under_review",
      priority: "medium",
      assignee: "Grace",
      labels: ["frontend", "design"],
    },
    {
      project: "WEB",
      title: "Cards overflow on small screens",
      description: "Long titles break the column layout.",
      type: "bug",
      status: "todo",
      priority: "high",
      assignee: "Linus",
      labels: ["frontend", "bug"],
    },
    {
      project: "API",
      title: "Wire up the SQLite data layer",
      description: "Shared CRUD module used by the API and MCP server.",
      type: "task",
      status: "in_progress",
      priority: "high",
      assignee: "Linus",
      labels: ["backend"],
    },
    {
      project: "API",
      title: "Build the MCP server",
      description: "Expose list/get/create/update/delete tools over stdio.",
      type: "epic",
      status: "todo",
      priority: "urgent",
      assignee: "Ken",
      labels: ["backend", "mcp"],
    },
    {
      project: "API",
      title: "Write the README",
      description: "Explain how to run the app and connect the MCP server.",
      type: "task",
      status: "backlog",
      priority: "low",
      assignee: "",
      labels: ["docs"],
    },
  ];

  const counters: Record<string, number> = {};
  const insert = database.prepare(`
    INSERT INTO tickets (id, project_id, title, description, type, status, priority, assignee, labels, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const projectByKey = (key: string) =>
    (
      database
        .prepare("SELECT id FROM projects WHERE key = ?")
        .get(key) as { id: string }
    ).id;

  samples.forEach((s, i) => {
    counters[s.project] = (counters[s.project] ?? 0) + 1;
    const id = `${s.project}-${String(counters[s.project]).padStart(3, "0")}`;
    insert.run(
      id,
      projectByKey(s.project),
      s.title,
      s.description,
      s.type,
      s.status,
      s.priority,
      s.assignee,
      s.labels.join(","),
      i,
      now,
      now
    );
  });
}

export { STATUSES, PRIORITIES, TYPES };
