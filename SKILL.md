---
name: Ticketer — Kanban Task Management
description: |
  Manage tickets and kanban boards with AI agents. Create, update, search, and organize tasks across projects. Perfect for dev teams tracking sprints, bugs, and features through a shared MCP server.
instructions: |
  Ticketer exposes a kanban-style ticket system via MCP. Use it to:
  
  - **Create tickets** from conversation: When a user describes work that needs doing ("we should fix sidebar overflow", "document the API setup"), create a ticket with appropriate type (task/bug/story/epic), priority, and labels.
  - **Search and triage**: Find tickets by status, project, or label. Summarize work-in-progress, blockers, or upcoming tasks.
  - **Update ticket status**: Move tickets between backlog → todo → in_progress → under_review → done as work progresses.
  - **Generate reports**: Pull tickets by status/assignee to create standup summaries, sprint reviews, or blockers lists.
  - **Organize with labels**: Use labels (infra, frontend, backend, bug, docs, design, mcp) to group related work.
  
  **When to use:**
  - A team member asks "what are we working on?" — query tickets by status.
  - Someone reports a bug or feature request in conversation — create a ticket with the right fields.
  - A developer says "I'm starting on X" — find the ticket, update status to in_progress, confirm priority.
  - At standup — pull all tickets, summarize by status/assignee, highlight blockers.

tools:
  - name: list_tickets
    description: List tickets, optionally filtered by project, status, and/or label.
    params:
      - project: string (optional) — project key or id (e.g. "WEB", "API")
      - status: string (optional) — one of backlog, todo, in_progress, under_review, done
      - label: string (optional) — filter by label (e.g. "frontend", "bug", "docs")
    example: |
      List all in-progress tickets:
      list_tickets({ status: "in_progress" })
      
      List all backend bugs:
      list_tickets({ label: "bug", project: "API" })

  - name: get_ticket
    description: Get a single ticket by its id (e.g. WEB-001).
    params:
      - id: string — ticket id (e.g. "WEB-001", "API-003")
    example: |
      get_ticket({ id: "WEB-001" })

  - name: create_ticket
    description: Create a new ticket. Project and title are required.
    params:
      - project: string — project key (e.g. "WEB", "API")
      - title: string — ticket title
      - description: string (optional) — longer description or context
      - type: string (optional) — "story", "task", "bug", or "epic" (default: "task")
      - status: string (optional) — one of backlog, todo, in_progress, under_review, done (default: "backlog")
      - priority: string (optional) — "low", "medium", "high", "urgent" (default: "medium")
      - assignee: string (optional) — person name
      - labels: array (optional) — list of label strings (e.g. ["frontend", "bug"])
    example: |
      Create a bug ticket:
      create_ticket({
        project: "WEB",
        title: "Cards overflow on small screens",
        description: "Long titles break the column layout on mobile.",
        type: "bug",
        priority: "high",
        labels: ["frontend", "bug"]
      })
      
      Create a task:
      create_ticket({
        project: "API",
        title: "Wire up SQLite data layer",
        description: "Shared CRUD module used by API and MCP server.",
        type: "task",
        priority: "high",
        assignee: "Linus",
        labels: ["backend"]
      })

  - name: update_ticket
    description: Update fields on an existing ticket. Change status to move it between columns.
    params:
      - id: string — ticket id
      - title: string (optional)
      - description: string (optional)
      - type: string (optional)
      - status: string (optional)
      - priority: string (optional)
      - assignee: string (optional)
      - labels: array (optional) — replaces the label list
    example: |
      Move a ticket to in progress:
      update_ticket({ id: "API-001", status: "in_progress" })
      
      Mark a bug as done:
      update_ticket({ id: "WEB-003", status: "done" })

  - name: search_tickets
    description: Full-text search tickets by id, title, description, or labels. Optionally scope to project/status/label.
    params:
      - q: string — search query
      - project: string (optional) — limit to project
      - status: string (optional)
      - label: string (optional)
    example: |
      search_tickets({ q: "sidebar" })
      search_tickets({ q: "bug", status: "todo" })

  - name: list_projects
    description: List all projects in ticketer.
    example: |
      list_projects()
      Returns: [{ id, key, name, created_at }, ...]

workflows:
  - title: Bug Intake
    steps:
      - User reports a bug or issue in chat
      - Search existing tickets to check if it's already filed
      - If new, create_ticket with type=bug, appropriate priority and labels
      - Optionally assign to team member
    example_prompt: |
      "Cards are overflowing on small screens when the title is long"
      → Agent searches for "overflow", finds WEB-003 (already filed as high-priority bug)
      → Summarizes for user with ticket details

  - title: Standup / Status Report
    steps:
      - Agent queries list_tickets by status and/or assignee
      - Groups by status (done, in_progress, todo)
      - Highlights any under_review or high-priority backlog items
      - Summarizes for the team
    example_prompt: |
      "What's everyone working on today?"
      → Lists in_progress by assignee, counts done since yesterday, flags blockers/urgent items

  - title: Sprint Planning
    steps:
      - Agent lists all backlog tickets
      - Filters by priority/label to identify next batch of work
      - Suggests grouping by type (stories vs. tasks vs. bugs)
      - Creates/updates tickets with status=todo for the sprint
    example_prompt: |
      "What should we focus on next sprint?"
      → Lists backlog, highlights high-priority items, suggests epic/story breakdown

  - title: Triage & Prioritization
    steps:
      - Agent pulls all todo/backlog tickets
      - Asks for or infers priority/assignee from context
      - Updates ticket fields (priority, labels, assignee)
    example_prompt: |
      "Help me organize our todo list"
      → Shows all open tickets, suggests priority order, offers to update

projects:
  - key: WEB
    name: Web App
    description: Frontend kanban board and UI

  - key: API
    name: Backend API
    description: Backend server and MCP integration

conventions:
  - Tickets use five statuses: backlog (not yet ready) → todo (ready to start) → in_progress (actively worked) → under_review (testing/review) → done (shipped).
  - Common labels: infra, frontend, backend, bug, docs, design, mcp. Add custom labels as needed.
  - Priority defaults to medium; use high/urgent for blockers, low for polish/tech debt.
  - Bugs always start at least high priority unless explicitly cosmetic.

setup:
  - Ticketer runs as an MCP server (Model Context Protocol).
  - To use this skill, your agent must be connected to the ticketer MCP server.
  - See the ticketer repo (https://github.com/your-org/ticketer) for local setup and server instructions.

compatibility:
  - Tested with: Claude Code, Cursor, Codex CLI, GitHub Copilot
  - Works anywhere the ticketer MCP server is reachable
  - Local/team use only (server runs in your dev environment, not cloud)

---
