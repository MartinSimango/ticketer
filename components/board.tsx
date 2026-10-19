"use client";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabelChip, CountBadge } from "@/components/ui/badge";
import { Column } from "./column";
import { TicketCard } from "./ticket-card";
import { TicketDialog, type DraftTicket } from "./ticket-dialog";
import {
  BOARD_STATUSES,
  STATUSES,
  type Project,
  type Status,
  type Ticket,
} from "@/lib/types";

function emptyDraft(status: Status = "todo"): DraftTicket {
  return {
    title: "",
    description: "",
    type: "task",
    status,
    priority: "medium",
    assignee: "",
    labels: [],
  };
}

export function Board({
  project,
  initialTickets,
}: {
  project: Project;
  initialTickets: Ticket[];
}) {
  const [tickets, setTickets] = React.useState<Ticket[]>(initialTickets);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftTicket>(emptyDraft());
  const [groupByLabel, setGroupByLabel] = React.useState(false);
  const [labelFilter, setLabelFilter] = React.useState<string | null>(null);

  React.useEffect(() => setTickets(initialTickets), [initialTickets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Board shows everything except backlog.
  const boardTickets = React.useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.status !== "backlog" &&
          (!labelFilter || t.labels.includes(labelFilter))
      ),
    [tickets, labelFilter]
  );

  const allLabels = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of tickets) t.labels.forEach((l) => set.add(l));
    return [...set].sort();
  }, [tickets]);

  const byStatus = React.useMemo(() => {
    const map: Record<Status, Ticket[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      under_review: [],
      done: [],
    };
    for (const t of boardTickets) map[t.status]?.push(t);
    for (const s of STATUSES) map[s].sort((a, b) => a.position - b.position);
    return map;
  }, [boardTickets]);

  const byLabel = React.useMemo(() => {
    const groups = new Map<string, Ticket[]>();
    for (const t of boardTickets) {
      const keys = t.labels.length ? t.labels : ["(no label)"];
      for (const k of keys) {
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(t);
      }
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [boardTickets]);

  async function handleDragEnd(event: DragEndEvent) {
    const id = event.active.id as string;
    const overId = event.over?.id as Status | undefined;
    if (!overId || !STATUSES.includes(overId)) return;

    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticket.status === overId) return;

    const position = byStatus[overId].length;
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: overId, position } : t))
    );

    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: overId, position }),
    });
  }

  function openNew() {
    setDraft(emptyDraft("todo"));
    setDialogOpen(true);
  }

  function openEdit(t: Ticket) {
    setDraft({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee,
      labels: t.labels,
    });
    setDialogOpen(true);
  }

  async function saveDraft(d: DraftTicket) {
    if (d.id) {
      const res = await fetch(`/api/tickets/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      const updated: Ticket = await res.json();
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, project: project.key }),
      });
      const created: Ticket = await res.json();
      setTickets((prev) => [...prev, created]);
    }
    setDialogOpen(false);
  }

  async function deleteDraft(id: string) {
    await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setDialogOpen(false);
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="material-chrome sticky top-0 z-20 flex items-center justify-between border-b border-[var(--material-chrome-edge)] px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            {project.name} · Board
          </h1>
          <p className="text-xs text-muted">{boardTickets.length} tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={groupByLabel ? "primary" : "outline"}
            size="sm"
            onClick={() => setGroupByLabel((v) => !v)}
          >
            Group by label
          </Button>
          <Button onClick={openNew} size="icon" aria-label="New ticket">
            <Plus size={18} />
          </Button>
        </div>
      </header>

      {allLabels.length > 0 && (
        <div className="material-chrome sticky top-[57px] z-10 flex flex-wrap items-center gap-1.5 border-b border-[var(--material-chrome-edge)] px-6 py-2">
          <span className="mr-1 text-xs font-medium text-muted">Filter:</span>
          <button
            onClick={() => setLabelFilter(null)}
            className="transition-transform active:scale-95"
          >
            <span
              className={
                labelFilter === null
                  ? "rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white"
                  : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-brand-50"
              }
            >
              All
            </span>
          </button>
          {allLabels.map((l) => (
            <button
              key={l}
              onClick={() => setLabelFilter(l)}
              className="transition-transform active:scale-95"
            >
              <span
                className={
                  labelFilter === l
                    ? "rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white"
                    : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-brand-50"
                }
              >
                {l}
              </span>
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-auto p-6">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {groupByLabel ? (
            <div className="space-y-6">
              {byLabel.map(([label, group]) => (
                <section key={label}>
                  <div className="mb-2 flex items-center gap-2">
                    <LabelChip label={label} />
                    <CountBadge count={group.length} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.map((t) => (
                      <div key={t.id} className="w-64">
                        <TicketCardStatic ticket={t} onOpen={openEdit} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex gap-4">
              {BOARD_STATUSES.map((status) => (
                <Column
                  key={status}
                  status={status}
                  tickets={byStatus[status]}
                  onOpen={openEdit}
                />
              ))}
            </div>
          )}
        </DndContext>
      </main>

      <TicketDialog
        open={dialogOpen}
        initial={draft}
        onClose={() => setDialogOpen(false)}
        onSave={saveDraft}
        onDelete={draft.id ? deleteDraft : undefined}
      />
    </div>
  );
}

function TicketCardStatic({
  ticket,
  onOpen,
}: {
  ticket: Ticket;
  onOpen: (t: Ticket) => void;
}) {
  return <TicketCard ticket={ticket} onOpen={onOpen} draggable={false} />;
}
