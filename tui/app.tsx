import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  STATUSES,
  STATUS_LABELS,
  type Project,
  type Ticket,
  type Status,
} from "../lib/types";
import { ApiClient, type DraftTicket } from "./api";
import { TicketForm, type FormValue } from "./ticket-form";

type View = "board" | "form" | "projects" | "confirm" | "help";

const PRIORITY_COLOR: Record<string, string> = {
  low: "gray",
  medium: "blue",
  high: "yellow",
  urgent: "red",
};
const TYPE_GLYPH: Record<string, string> = {
  story: "◆",
  task: "☑",
  bug: "✸",
  epic: "⬢",
};

export function App({ api }: { api: ApiClient }) {
  const { exit } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [view, setView] = useState<View>("board");
  const [col, setCol] = useState(0);
  const [row, setRow] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [projCursor, setProjCursor] = useState(0);

  const activeProject = projects.find((p) => p.key === activeKey) ?? null;

  const byStatus = useMemo(() => {
    const map: Record<string, Ticket[]> = {};
    for (const s of STATUSES) map[s] = [];
    for (const t of tickets) map[t.status]?.push(t);
    for (const s of STATUSES)
      map[s].sort((a, b) => a.position - b.position);
    return map;
  }, [tickets]);

  const colStatus = STATUSES[col] as Status;
  const colTickets = byStatus[colStatus] ?? [];
  const selected = colTickets[row] ?? null;

  const loadProjects = useCallback(async () => {
    try {
      const ps = await api.listProjects();
      setProjects(ps);
      setActiveKey((cur) => cur ?? ps[0]?.key ?? null);
      return ps;
    } catch (e) {
      setError((e as Error).message);
      return [];
    }
  }, [api]);

  const loadTickets = useCallback(
    async (key: string | null) => {
      if (!key) {
        setTickets([]);
        return;
      }
      try {
        const ts = await api.listTickets({ project: key });
        setTickets(ts);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [api]
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadTickets(activeKey);
  }, [activeKey, loadTickets]);

  // Keep the row cursor in range when the column contents change.
  useEffect(() => {
    setRow((r) => Math.max(0, Math.min(r, Math.max(0, colTickets.length - 1))));
  }, [col, colTickets.length]);

  async function refresh() {
    setStatus("Refreshing…");
    await loadProjects();
    await loadTickets(activeKey);
    setStatus("");
  }

  async function moveSelected(dir: 1 | -1) {
    if (!selected) return;
    const nextIdx = STATUSES.indexOf(selected.status) + dir;
    if (nextIdx < 0 || nextIdx >= STATUSES.length) return;
    const nextStatus = STATUSES[nextIdx];
    const prevId = selected.id;
    try {
      const updated = await api.updateTicket(prevId, { status: nextStatus });
      setTickets((ts) => ts.map((t) => (t.id === prevId ? updated : t)));
      setCol(nextIdx);
      setStatus(`${prevId} → ${STATUS_LABELS[nextStatus]}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitForm(draft: DraftTicket) {
    try {
      if (editing) {
        const updated = await api.updateTicket(editing.id, draft);
        setTickets((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
        setStatus(`Saved ${updated.id}`);
      } else if (activeKey) {
        const created = await api.createTicket({ ...draft, project: activeKey });
        setTickets((ts) => [...ts, created]);
        setStatus(`Created ${created.id}`);
      }
      setEditing(null);
      setView("board");
    } catch (e) {
      setError((e as Error).message);
      setView("board");
    }
  }

  async function confirmDelete() {
    if (!selected) return;
    const id = selected.id;
    try {
      await api.deleteTicket(id);
      setTickets((ts) => ts.filter((t) => t.id !== id));
      setStatus(`Deleted ${id}`);
    } catch (e) {
      setError((e as Error).message);
    }
    setView("board");
  }

  // ----- Input routing per view -----
  useInput(
    (input, key) => {
      if (view !== "board") return;
      setError("");
      if (input === "q") return exit();
      if (input === "?") return setView("help");
      if (input === "r") return void refresh();
      if (input === "p") {
        setProjCursor(
          Math.max(0, projects.findIndex((p) => p.key === activeKey))
        );
        return setView("projects");
      }
      if (key.leftArrow || input === "h")
        return setCol((c) => Math.max(0, c - 1));
      if (key.rightArrow || input === "l")
        return setCol((c) => Math.min(STATUSES.length - 1, c + 1));
      if (key.upArrow || input === "k") return setRow((r) => Math.max(0, r - 1));
      if (key.downArrow || input === "j")
        return setRow((r) => Math.min(colTickets.length - 1, r + 1));
      if (input === "<" || input === "[") return void moveSelected(-1);
      if (input === ">" || input === "]") return void moveSelected(1);
      if (input === "n") {
        setEditing(null);
        return setView("form");
      }
      if (key.return && selected) {
        setEditing(selected);
        return setView("form");
      }
      if (input === "d" && selected) return setView("confirm");
    },
    { isActive: view === "board" }
  );

  useInput(
    (input, key) => {
      if (view !== "projects") return;
      if (key.escape || input === "q") return setView("board");
      if (key.upArrow || input === "k")
        return setProjCursor((c) => Math.max(0, c - 1));
      if (key.downArrow || input === "j")
        return setProjCursor((c) => Math.min(projects.length - 1, c + 1));
      if (key.return) {
        const p = projects[projCursor];
        if (p) {
          setActiveKey(p.key);
          setCol(0);
          setRow(0);
        }
        return setView("board");
      }
    },
    { isActive: view === "projects" }
  );

  useInput(
    (input, key) => {
      if (view !== "confirm") return;
      if (input === "y") return void confirmDelete();
      if (input === "n" || key.escape) return setView("board");
    },
    { isActive: view === "confirm" }
  );

  useInput(
    (_input, key) => {
      if (view !== "help") return;
      if (key.escape || key.return) return setView("board");
    },
    { isActive: view === "help" }
  );

  // ----- Views -----
  if (view === "form") {
    const initial: FormValue = editing
      ? {
          id: editing.id,
          title: editing.title,
          description: editing.description,
          type: editing.type,
          status: editing.status,
          priority: editing.priority,
          assignee: editing.assignee,
          labels: editing.labels,
        }
      : {
          title: "",
          description: "",
          type: "task",
          status: colStatus,
          priority: "medium",
          assignee: "",
          labels: [],
        };
    return (
      <TicketForm
        initial={initial}
        isEdit={Boolean(editing)}
        onSubmit={submitForm}
        onCancel={() => {
          setEditing(null);
          setView("board");
        }}
      />
    );
  }

  if (view === "help") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="cyan">
          Ticketer TUI — keys
        </Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>←/→ h/l Move between columns</Text>
          <Text>↑/↓ j/k Move between cards</Text>
          <Text>{"< >  [ ]  Move ticket to prev/next status"}</Text>
          <Text>Enter Open / edit the selected ticket</Text>
          <Text>n Create a new ticket</Text>
          <Text>d Delete the selected ticket</Text>
          <Text>p Switch project</Text>
          <Text>r Refresh from server</Text>
          <Text>q Quit</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press Esc or Enter to go back.</Text>
        </Box>
      </Box>
    );
  }

  if (view === "projects") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="cyan">
          Projects
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {projects.length === 0 && <Text color="gray">No projects.</Text>}
          {projects.map((p, i) => (
            <Text key={p.id} color={i === projCursor ? "cyan" : undefined}>
              {i === projCursor ? "› " : "  "}
              {p.key.padEnd(6)} {p.name}
            </Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">↑/↓ move · Enter select · Esc back</Text>
        </Box>
      </Box>
    );
  }

  // Board (default)
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          🎟  {activeProject ? `${activeProject.name} · Board` : "Ticketer"}
        </Text>
        <Text color="gray">{tickets.length} tickets · ? for help</Text>
      </Box>

      {view === "confirm" && selected && (
        <Box marginTop={1}>
          <Text color="red">
            Delete {selected.id} “{selected.title}”? (y/n)
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        {STATUSES.map((s, ci) => (
          <Column
            key={s}
            title={STATUS_LABELS[s]}
            tickets={byStatus[s] ?? []}
            active={ci === col}
            selectedRow={ci === col ? row : -1}
          />
        ))}
      </Box>

      <Box marginTop={1}>
        {error ? (
          <Text color="red">⚠ {error}</Text>
        ) : (
          <Text color="gray">
            {status ||
              "h/l ←→ cols · j/k ↑↓ cards · <> move · n new · Enter edit · d del · p projects · q quit"}
          </Text>
        )}
      </Box>
    </Box>
  );
}

function Column({
  title,
  tickets,
  active,
  selectedRow,
}: {
  title: string;
  tickets: Ticket[];
  active: boolean;
  selectedRow: number;
}) {
  return (
    <Box
      flexDirection="column"
      width={16}
      marginRight={1}
      borderStyle="round"
      borderColor={active ? "cyan" : "gray"}
      paddingX={1}
    >
      <Text bold color={active ? "cyan" : "white"} wrap="truncate-end">
        {title} ({tickets.length})
      </Text>
      {tickets.length === 0 && <Text color="gray">—</Text>}
      {tickets.map((t, i) => {
        const sel = i === selectedRow;
        return (
          <Box key={t.id} flexDirection="column" marginTop={i === 0 ? 1 : 0}>
            <Text
              backgroundColor={sel ? "cyan" : undefined}
              color={sel ? "black" : undefined}
              wrap="truncate-end"
            >
              {TYPE_GLYPH[t.type] ?? "•"}{" "}
              {t.title}
            </Text>
            <Text color={sel ? "cyan" : "gray"}>
              {t.id}{" "}
              <Text color={PRIORITY_COLOR[t.priority] ?? "gray"}>
                {t.priority}
              </Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
