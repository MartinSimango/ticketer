import { getDb } from "./db";
import type { Project } from "./types";

function toProject(row: unknown): Project {
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id),
    key: String(r.key),
    name: String(r.name),
    created_at: String(r.created_at),
  };
}

export function listProjects(): Project[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM projects ORDER BY created_at ASC")
    .all()
    .map(toProject);
}

export function getProject(id: string): Project | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  return row ? toProject(row) : undefined;
}

export function getProjectByKey(key: string): Project | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM projects WHERE key = ?")
    .get(key.toUpperCase());
  return row ? toProject(row) : undefined;
}

function nextProjectId(): string {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id FROM projects WHERE id LIKE 'PROJ-%' ORDER BY CAST(SUBSTR(id, 6) AS INTEGER) DESC LIMIT 1"
    )
    .get() as { id: string } | undefined;
  const last = row ? parseInt(row.id.replace("PROJ-", ""), 10) : 0;
  return `PROJ-${last + 1}`;
}

export interface CreateProjectInput {
  key: string;
  name: string;
}

export function createProject(input: CreateProjectInput): Project {
  const db = getDb();
  const key = input.key?.trim().toUpperCase();
  if (!key || !/^[A-Z][A-Z0-9]{1,9}$/.test(key)) {
    throw new Error(
      "key must be 2-10 chars, start with a letter, and be alphanumeric (e.g. WEB)"
    );
  }
  if (!input.name?.trim()) throw new Error("name is required");
  if (getProjectByKey(key)) throw new Error(`Project key already exists: ${key}`);

  const project: Project = {
    id: nextProjectId(),
    key,
    name: input.name.trim(),
    created_at: new Date().toISOString(),
  };

  db.prepare(
    "INSERT INTO projects (id, key, name, created_at) VALUES (?, ?, ?, ?)"
  ).run(project.id, project.key, project.name, project.created_at);

  return project;
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  db.prepare("DELETE FROM tickets WHERE project_id = ?").run(id);
  const res = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return res.changes > 0;
}
