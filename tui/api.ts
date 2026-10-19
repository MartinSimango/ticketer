// Thin HTTP client for the Ticketer REST API. The TUI is a decoupled client —
// it never imports the data layer directly, it talks to a running server (local
// or remote) over the same API the web UI uses.
import type { Project, Ticket, Status } from "../lib/types";

export interface DraftTicket {
  project?: string;
  title: string;
  description?: string;
  type?: string;
  status?: Status;
  priority?: string;
  assignee?: string;
  labels?: string[];
}

export class ApiClient {
  constructor(private base: string) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg = (data && data.error) || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data as T;
  }

  listProjects() {
    return this.req<Project[]>("/api/projects");
  }

  createProject(input: { key: string; name: string }) {
    return this.req<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  deleteProject(id: string) {
    return this.req<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" });
  }

  listTickets(params: { project?: string; status?: Status; label?: string } = {}) {
    const sp = new URLSearchParams();
    if (params.project) sp.set("project", params.project);
    if (params.status) sp.set("status", params.status);
    if (params.label) sp.set("label", params.label);
    const qs = sp.toString();
    return this.req<Ticket[]>(`/api/tickets${qs ? `?${qs}` : ""}`);
  }

  createTicket(input: DraftTicket) {
    return this.req<Ticket>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateTicket(id: string, fields: Partial<DraftTicket>) {
    return this.req<Ticket>(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
  }

  deleteTicket(id: string) {
    return this.req<{ ok: true }>(`/api/tickets/${id}`, { method: "DELETE" });
  }
}
