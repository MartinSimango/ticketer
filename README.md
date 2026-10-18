# 🎟️ Ticketer

A dead-simple, JIRA-style **kanban ticketing board** with a built-in **MCP server**.
State lives in a local **SQLite** file (via Node's built-in `node:sqlite`), the UI is
built with **Next.js** + **coss ui** (Base UI + Tailwind CSS v4) in a clean
**blue & white** theme, and the board supports **drag-and-drop** between columns.

The interesting bit: the **same CRUD layer powers both the web UI and the MCP server**,
so an AI assistant (Claude Desktop, your editor, etc.) can read, create, update, and
delete tickets — across multiple projects — alongside you.

**Statuses:** Backlog → Todo → In Progress → Under Review → Done
(the board shows Todo → Done; **Backlog has its own page** so the board stays clean).

---

## Features

- 📁 **Projects** — group tickets under projects; each project has a key used as the
  ticket prefix (`WEB-001`, `API-003`). Create and **delete** projects from the sidebar.
- 🗂️ **Kanban board** with drag-and-drop (Todo, In Progress, Under Review, Done)
- 📥 **Separate Backlog page** per project, as a tidy list view
- 🐞 **Ticket types** like JIRA — Story, Task, Bug, Epic (with colored icons)
- 🏷️ **Labels** — add multiple labels per ticket, filter the board by label, and a
  dedicated **Labels** page that groups tickets by label
- 🔎 **Search** — search tickets by id, title, description, or label (sidebar box +
  `/search` page), scoped to the current project or global
- ➕ **Quick-create** `+` button in every header
- ⚙️ **Settings** — configurable port (default **5164**) and database path
- 🖥️ **Native macOS app** (Tauri) that launches the web UI **and** MCP server
- 💾 Persistence — a single SQLite file in your app data directory
- 🤖 **MCP server** for projects, tickets, labels, and search

**Ticket fields:** title, description, type, status, priority, assignee, labels.

---

## Quick start

Requires **Node 22.5+** (uses the built-in `node:sqlite` module — no native
compilation needed). Any package manager works; examples use `pnpm`.

```bash
cd ticketer
pnpm install
pnpm dev
```

Open **http://localhost:3000**. On first run the database is created and seeded with
two sample projects (`WEB`, `API`) and a handful of tickets. The root URL redirects to
the first project's board.

> The app and the MCP server share the same `tickets.db` file, so changes made in one
> show up in the other (refresh the browser to see MCP-made changes).

### Pages

| Route                              | What it shows                               |
|------------------------------------|---------------------------------------------|
| `/projects/:key`                   | Kanban board (Todo → Done)                  |
| `/projects/:key/backlog`           | Backlog list for the project                |
| `/projects/:key/labels`            | Tickets grouped by label                    |
| `/search?q=…&project=KEY`          | Search results (omit `project` for global)  |

---

## Using the MCP server

The MCP server lets an AI client manage your projects and tickets over **stdio**.

### Run it directly

```bash
pnpm mcp
# → "Ticketer MCP server running on stdio"
```

It talks MCP over stdin/stdout, so you normally don't run it by hand — you point an
MCP client at it.

### Connect from Claude Desktop

Add this to your `claude_desktop_config.json`
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```jsonc
{
  "mcpServers": {
    "ticketer": {
      "command": "pnpm",
      "args": ["--dir", "/absolute/path/to/ticketer", "mcp"]
    }
  }
}
```

Prefer a package-manager-free setup? Point at `tsx` instead:

```jsonc
{
  "mcpServers": {
    "ticketer": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/ticketer/mcp/server.ts"]
    }
  }
}
```

Restart Claude Desktop, then ask things like:

- *"List my projects."*
- *"Create a project called Mobile App with key MOB."*
- *"Create an urgent bug in WEB titled 'Fix login' labelled auth, assigned to Ada."*
- *"Search all tickets for 'overflow'."*
- *"Show me every ticket labelled frontend."*
- *"Move WEB-003 to under review."*
- *"Delete API-002."*

### Connect from OpenCode

```bash
opencode mcp add ticketer --command "pnpm --dir /absolute/path/to/ticketer mcp"
```

### Available MCP tools

**Projects**

| Tool             | Description                                   | Arguments |
|------------------|-----------------------------------------------|-----------|
| `list_projects`  | List all projects                             | — |
| `create_project` | Create a project (key becomes ticket prefix)  | `key`, `name` |
| `delete_project` | Delete a project **and all its tickets**      | `id` |

**Tickets**

| Tool             | Description                                              | Arguments |
|------------------|----------------------------------------------------------|-----------|
| `list_tickets`   | List tickets, filtered by project / status / label       | `project?`, `status?`, `label?` |
| `get_ticket`     | Get one ticket by id                                     | `id` |
| `search_tickets` | Full-text search over id/title/description/labels        | `q`, `project?`, `status?`, `label?` |
| `list_labels`    | List labels with counts (optionally per project)         | `project?` |
| `create_ticket`  | Create a ticket (`project` + `title` required)           | `project`, `title`, `description?`, `type?`, `status?`, `priority?`, `assignee?`, `labels?` |
| `update_ticket`  | Update fields / move via `status` / replace `labels`     | `id`, `title?`, `description?`, `type?`, `status?`, `priority?`, `assignee?`, `labels?` |
| `delete_ticket`  | Delete a ticket by id                                    | `id` |

> `project` accepts either a project **key** (`WEB`) or **id** (`PROJ-1`).
> `labels` is an array of strings and **replaces** the ticket's labels when updating.

**Valid values**

- `type`: `story`, `task`, `bug`, `epic`
- `status`: `backlog`, `todo`, `in_progress`, `under_review`, `done`
- `priority`: `low`, `medium`, `high`, `urgent`

---

## HTTP API

The web UI uses a small REST API you can also call directly:

| Method & path              | Description                                           |
|----------------------------|-------------------------------------------------------|
| `GET /api/projects`        | List projects                                         |
| `POST /api/projects`       | Create a project (`key`, `name`)                      |
| `DELETE /api/projects/:id` | Delete a project and its tickets                      |
| `GET /api/tickets`         | List tickets (`?project=`, `?status=`, `?label=`, `?q=`) |
| `POST /api/tickets`        | Create a ticket                                       |
| `GET /api/tickets/:id`     | Get one ticket                                        |
| `PATCH /api/tickets/:id`   | Update / move a ticket                                |
| `DELETE /api/tickets/:id`  | Delete a ticket                                       |
| `GET /api/labels`          | List labels with counts (`?project=`)                 |

```bash
curl 'localhost:3000/api/tickets?project=WEB&label=frontend'
curl -X POST localhost:3000/api/tickets \
  -H 'Content-Type: application/json' \
  -d '{"project":"WEB","title":"Ship v1","type":"story","priority":"high","labels":["release"]}'
```

---

## Project structure

```
ticketer/
├─ app/
│  ├─ page.tsx                      # Redirects to the first project's board
│  ├─ layout.tsx
│  ├─ globals.css                   # Tailwind v4 + blue/white theme
│  ├─ (app)/
│  │  ├─ layout.tsx                 # Sidebar shell
│  │  ├─ projects/[key]/page.tsx    # Board
│  │  ├─ projects/[key]/backlog/    # Backlog list page
│  │  ├─ projects/[key]/labels/     # Group-by-label page
│  │  └─ search/page.tsx            # Search results
│  └─ api/                          # REST routes: projects, tickets, labels
├─ components/
│  ├─ sidebar.tsx                   # Projects, search box, quick-create project
│  ├─ board.tsx                     # Board + drag-and-drop + group-by-label
│  ├─ backlog.tsx                   # Backlog list view
│  ├─ labels-view.tsx              # Tickets grouped by label
│  ├─ column.tsx                    # Droppable column
│  ├─ ticket-card.tsx               # Draggable card (type icon + label chips)
│  ├─ ticket-dialog.tsx             # Create/edit form (type, labels, …)
│  └─ ui/                           # coss-style primitives (button, input, dialog…)
├─ lib/
│  ├─ db.ts                         # SQLite connection + schema + seed
│  ├─ projects.ts                   # Project CRUD (shared by API & MCP)
│  ├─ tickets.ts                    # Ticket CRUD + search + labels (API & MCP)
│  └─ types.ts                      # Statuses, priorities, types, models
└─ mcp/
   └─ server.ts                     # stdio MCP server
```

---

## Mac app

Ticketer ships as a native, **fully self-contained macOS app** (built with
[Tauri](https://tauri.app)). The `.app` bundles everything it needs — a Node
runtime, the Next.js server, and the MCP server — so it runs on any Mac **with no
Node, no `node_modules`, and no project folder required**. On launch it starts
both the web server and the MCP server, waits for the port, then loads the UI.
Closing the window shuts the background servers down. You can still run everything
from the command line too; they share the same database and settings.

### Build the `.app`

Build requirements: **Node**, **pnpm**, the **Rust toolchain** (`rustup`,
rustc ≥ 1.90), and `rsync` (preinstalled on macOS).

```bash
pnpm install
pnpm app:build   # builds Next.js, assembles the payload, and bundles the app
```

This produces:

```
src-tauri/target/release/bundle/macos/Ticketer.app   (~224 MB, self-contained)
src-tauri/target/release/bundle/dmg/Ticketer_*.dmg
```

`pnpm app:build` runs three steps for you:

1. `pnpm build` — Next.js production build (with `output: "standalone"`).
2. `pnpm bundle:app` — assembles `src-tauri/resources/app/`:
   - `server/` — the standalone server + static assets + `public/`, with **all
     pnpm symlinks flattened into real files** (via `rsync -aL`).
   - `mcp-server.cjs` — the MCP server bundled into one file (esbuild).
   - `node` — a self-contained Node runtime downloaded from nodejs.org.
3. `tauri build` — bundles that payload into the `.app`/`.dmg`.

Double-click **Ticketer.app** (or `open` it) — or drag it into `/Applications`.
Because it's self-contained, you can move it anywhere, including another Mac.

> The bundle is **unsigned** — on first launch macOS Gatekeeper may warn you.
> Right-click the app → **Open**, or run
> `xattr -dr com.apple.quarantine /path/to/Ticketer.app`.

### Develop the app

```bash
pnpm app:dev        # runs the Tauri shell against the local project build
```

In development the shell runs the server straight from the project (no payload
assembly needed). Override the location with `TICKETER_APP_ROOT` if required.

---

## Configuration

Ticketer keeps its **settings** and **database** in
`~/Library/Application Support/Ticketer/` on macOS (override the whole directory
with `TICKETER_DATA_DIR`). The self-contained app writes here too, so your tickets
persist independently of the app bundle.

### Settings page

Open **Settings** from the sidebar to change:

- **Port** — the app runs on **5164** by default (chosen to avoid clashing with
  common dev servers). Change it here; restart the app/server to apply.
- **Database file** — absolute path to the SQLite file.

Settings are stored in `settings.json` next to the database and are shared by the
web server, the Mac app, and the MCP server.

### Environment overrides

| Variable                | Effect                                                 |
|-------------------------|--------------------------------------------------------|
| `TICKETER_PORT`         | Override the port (also honors `PORT`)                 |
| `TICKETER_DB`           | Override the database file path                        |
| `TICKETER_DATA_DIR`     | Override the settings/database directory               |
| `TICKETER_APP_ROOT`     | Dir the app runs the server from (dev / custom setups) |
| `TICKETER_NODE_VERSION` | Node version to bundle (build-time; default v22.20.0)  |

```bash
TICKETER_PORT=7000 TICKETER_DB=/tmp/my-tickets.db pnpm start
```

Set the same values for `pnpm mcp` so both sides share one database.

---

## Scripts

| Command           | What it does                                       |
|-------------------|----------------------------------------------------|
| `pnpm dev`        | Start the Next.js dev server (port 5164)           |
| `pnpm build`      | Production build (standalone output)               |
| `pnpm start`      | Run the production build on the configured port    |
| `pnpm mcp`        | Start the MCP server (stdio)                        |
| `pnpm bundle:app` | Assemble the self-contained app payload            |
| `pnpm app:dev`    | Run the macOS app in development                    |
| `pnpm app:build`  | Build the self-contained macOS `.app` and `.dmg`   |

---

Built with Next.js, coss ui, SQLite, dnd-kit, Tauri, and the Model Context
Protocol SDK. App icon: a tiny pixel-art robot carrying a bunch of tickets 🤖🎟️
