import { getDb } from "./db";
import { getProject, getProjectByKey } from "./projects";
import {
  STATUSES,
  PRIORITIES,
  TYPES,
  type Ticket,
  type Status,
  type Priority,
  type TicketType,
} from "./types";

function parseLabels(raw: unknown): string[] {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
}

function normalizeLabels(labels: string[] | string | undefined): string[] {
  if (!labels) return [];
  const arr = Array.isArray(labels) ? labels : String(labels).split(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of arr) {
    const t = l.trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out;
}

function toTicket(row: unknown): Ticket {
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id),
    project_id: String(r.project_id),
    title: String(r.title),
    description: String(r.description ?? ""),
    type: r.type as TicketType,
    status: r.status as Status,
    priority: r.priority as Priority,
    assignee: String(r.assignee ?? ""),
    labels: parseLabels(r.labels),
    position: Number(r.position),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function resolveProjectId(project?: string): string | undefined {
  if (!project) return undefined;
  const byKey = getProjectByKey(project);
  if (byKey) return byKey.id;
  if (getProject(project)) return project;
  throw new Error(`Project not found: ${project}`);
}

export interface TicketFilter {
  /** Project key (WEB) or id (PROJ-1). */
  project?: string;
  status?: Status;
  /** Match tickets that carry this label. */
  label?: string;
  /** Free-text query over id, title, description, and labels. */
  q?: string;
}

export function listTickets(filter: TicketFilter = {}): Ticket[] {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  const projectId = resolveProjectId(filter.project);
  if (projectId) {
    where.push("project_id = ?");
    params.push(projectId);
  }
  if (filter.status) {
    where.push("status = ?");
    params.push(filter.status);
  }
  if (filter.label) {
    // labels stored comma-joined; match the whole label token.
    where.push(
      "(',' || LOWER(labels) || ',') LIKE ?"
    );
    params.push(`%,${filter.label.toLowerCase()},%`);
  }
  if (filter.q) {
    const like = `%${filter.q.toLowerCase()}%`;
    where.push(
      "(LOWER(id) LIKE ? OR LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(labels) LIKE ?)"
    );
    params.push(like, like, like, like);
  }

  const sql =
    "SELECT * FROM tickets" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY status, position ASC, created_at ASC";

  return db
    .prepare(sql)
    .all(...(params as never[]))
    .map(toTicket);
}

export function searchTickets(
  q: string,
  opts: { project?: string; status?: Status; label?: string } = {}
): Ticket[] {
  return listTickets({ q, ...opts });
}

export function listLabels(project?: string): { label: string; count: number }[] {
  const tickets = listTickets({ project });
  const counts = new Map<string, number>();
  for (const t of tickets) {
    for (const l of t.labels) {
      counts.set(l, (counts.get(l) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function getTicket(id: string): Ticket | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
  return row ? toTicket(row) : undefined;
}

function nextTicketId(projectKey: string): string {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id FROM tickets WHERE id LIKE ? ORDER BY CAST(SUBSTR(id, ?) AS INTEGER) DESC LIMIT 1"
    )
    .get(`${projectKey}-%`, projectKey.length + 2) as
    | { id: string }
    | undefined;
  const last = row ? parseInt(row.id.slice(projectKey.length + 1), 10) : 0;
  return `${projectKey}-${String(last + 1).padStart(3, "0")}`;
}

export interface CreateInput {
  project: string;
  title: string;
  description?: string;
  type?: TicketType;
  status?: Status;
  priority?: Priority;
  assignee?: string;
  labels?: string[] | string;
}

export function createTicket(input: CreateInput): Ticket {
  const db = getDb();

  if (!input.project) throw new Error("project is required");
  const project = getProjectByKey(input.project) ?? getProject(input.project);
  if (!project) throw new Error(`Project not found: ${input.project}`);

  const type = input.type ?? "task";
  if (!TYPES.includes(type)) throw new Error(`Invalid type: ${type}`);
  const status = input.status ?? "backlog";
  if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  const priority = input.priority ?? "medium";
  if (!PRIORITIES.includes(priority))
    throw new Error(`Invalid priority: ${priority}`);
  if (!input.title?.trim()) throw new Error("title is required");

  const max = db
    .prepare(
      "SELECT COALESCE(MAX(position), -1) AS m FROM tickets WHERE project_id = ? AND status = ?"
    )
    .get(project.id, status) as { m: number };

  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: nextTicketId(project.key),
    project_id: project.id,
    title: input.title.trim(),
    description: input.description ?? "",
    type,
    status,
    priority,
    assignee: input.assignee ?? "",
    labels: normalizeLabels(input.labels),
    position: max.m + 1,
    created_at: now,
    updated_at: now,
  };

  db.prepare(
    `INSERT INTO tickets (id, project_id, title, description, type, status, priority, assignee, labels, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    ticket.id,
    ticket.project_id,
    ticket.title,
    ticket.description,
    ticket.type,
    ticket.status,
    ticket.priority,
    ticket.assignee,
    ticket.labels.join(","),
    ticket.position,
    ticket.created_at,
    ticket.updated_at
  );

  return ticket;
}

export interface UpdateInput {
  title?: string;
  description?: string;
  type?: TicketType;
  status?: Status;
  priority?: Priority;
  assignee?: string;
  labels?: string[] | string;
  position?: number;
}

export function updateTicket(id: string, input: UpdateInput): Ticket {
  const db = getDb();
  const existing = getTicket(id);
  if (!existing) throw new Error(`Ticket not found: ${id}`);

  if (input.type && !TYPES.includes(input.type))
    throw new Error(`Invalid type: ${input.type}`);
  if (input.status && !STATUSES.includes(input.status))
    throw new Error(`Invalid status: ${input.status}`);
  if (input.priority && !PRIORITIES.includes(input.priority))
    throw new Error(`Invalid priority: ${input.priority}`);

  const updated: Ticket = {
    ...existing,
    title: input.title?.trim() ?? existing.title,
    description: input.description ?? existing.description,
    type: input.type ?? existing.type,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    assignee: input.assignee ?? existing.assignee,
    labels:
      input.labels !== undefined
        ? normalizeLabels(input.labels)
        : existing.labels,
    position: input.position ?? existing.position,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `UPDATE tickets SET title=?, description=?, type=?, status=?,
       priority=?, assignee=?, labels=?, position=?, updated_at=?
     WHERE id=?`
  ).run(
    updated.title,
    updated.description,
    updated.type,
    updated.status,
    updated.priority,
    updated.assignee,
    updated.labels.join(","),
    updated.position,
    updated.updated_at,
    updated.id
  );

  return updated;
}

export function deleteTicket(id: string): boolean {
  const db = getDb();
  const res = db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  return res.changes > 0;
}
