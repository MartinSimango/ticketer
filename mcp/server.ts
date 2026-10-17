#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  searchTickets,
  listLabels,
} from "../lib/tickets";
import {
  listProjects,
  createProject,
  deleteProject,
} from "../lib/projects";
import { STATUSES, PRIORITIES, TYPES } from "../lib/types";

const server = new McpServer({
  name: "ticketer",
  version: "0.2.0",
});

const statusEnum = z.enum(STATUSES);
const priorityEnum = z.enum(PRIORITIES);
const typeEnum = z.enum(TYPES);
const labels = z.array(z.string()).optional();

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function safe<T>(fn: () => T) {
  try {
    return json(fn());
  } catch (err) {
    return json({ error: (err as Error).message });
  }
}

/* ----------------------------- Projects ----------------------------- */

server.tool("list_projects", "List all projects.", {}, async () =>
  json(listProjects())
);

server.tool(
  "create_project",
  "Create a new project. The key becomes the ticket prefix (e.g. WEB -> WEB-001).",
  { key: z.string(), name: z.string() },
  async (input) => safe(() => createProject(input))
);

server.tool(
  "delete_project",
  "Delete a project and all of its tickets.",
  { id: z.string() },
  async ({ id }) => json({ deleted: deleteProject(id), id })
);

/* ------------------------------ Tickets ----------------------------- */

server.tool(
  "list_tickets",
  "List tickets, optionally filtered by project (key or id), status, and/or label.",
  {
    project: z.string().optional(),
    status: statusEnum.optional(),
    label: z.string().optional(),
  },
  async (filter) => safe(() => listTickets(filter))
);

server.tool(
  "get_ticket",
  "Get a single ticket by its id (e.g. WEB-001).",
  { id: z.string() },
  async ({ id }) => {
    const ticket = getTicket(id);
    if (!ticket) return json({ error: `Ticket not found: ${id}` });
    return json(ticket);
  }
);

server.tool(
  "search_tickets",
  "Full-text search tickets by id, title, description, or labels. Optionally scope to a project/status/label.",
  {
    q: z.string(),
    project: z.string().optional(),
    status: statusEnum.optional(),
    label: z.string().optional(),
  },
  async ({ q, ...opts }) => safe(() => searchTickets(q, opts))
);

server.tool(
  "list_labels",
  "List all labels (with counts), optionally scoped to a project.",
  { project: z.string().optional() },
  async ({ project }) => safe(() => listLabels(project))
);

server.tool(
  "create_ticket",
  "Create a ticket. project and title are required.",
  {
    project: z.string(),
    title: z.string(),
    description: z.string().optional(),
    type: typeEnum.optional(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    assignee: z.string().optional(),
    labels,
  },
  async (input) => safe(() => createTicket(input))
);

server.tool(
  "update_ticket",
  "Update fields on an existing ticket. Change status to move it between columns; set labels to replace the label list.",
  {
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    type: typeEnum.optional(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    assignee: z.string().optional(),
    labels,
  },
  async ({ id, ...fields }) => safe(() => updateTicket(id, fields))
);

server.tool(
  "delete_ticket",
  "Delete a ticket by its id.",
  { id: z.string() },
  async ({ id }) => json({ deleted: deleteTicket(id), id })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ticketer MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
