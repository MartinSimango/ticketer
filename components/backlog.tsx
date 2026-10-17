"use client";

import * as React from "react";
import { Plus, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge, TypeIcon, LabelChip } from "@/components/ui/badge";
import { TicketDialog, type DraftTicket } from "./ticket-dialog";
import type { Project, Ticket } from "@/lib/types";

function emptyDraft(): DraftTicket {
  return {
    title: "",
    description: "",
    type: "task",
    status: "backlog",
    priority: "medium",
    assignee: "",
    labels: [],
  };
}

export function Backlog({
  project,
  initialTickets,
}: {
  project: Project;
  initialTickets: Ticket[];
}) {
  const [tickets, setTickets] = React.useState<Ticket[]>(initialTickets);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftTicket>(emptyDraft());

  React.useEffect(() => setTickets(initialTickets), [initialTickets]);

  const items = tickets
    .filter((t) => t.status === "backlog")
    .sort((a, b) => a.position - b.position);

  function openNew() {
    setDraft(emptyDraft());
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

  async function promote(t: Ticket) {
    const res = await fetch(`/api/tickets/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "todo" }),
    });
    const updated: Ticket = await res.json();
    setTickets((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            {project.name} · Backlog
          </h1>
          <p className="text-xs text-muted">{items.length} tickets</p>
        </div>
        <Button onClick={openNew} size="icon" aria-label="New ticket">
          <Plus size={18} />
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-2">
          {items.length === 0 && (
            <p className="py-16 text-center text-sm text-muted">
              The backlog is empty.
            </p>
          )}
          {items.map((t) => (
            <div
              key={t.id}
              onClick={() => openEdit(t)}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm transition-shadow hover:border-brand-200 hover:shadow-md"
            >
              <TypeIcon type={t.type} />
              <span className="w-20 shrink-0 text-xs font-medium text-brand-600">
                {t.id}
              </span>
              <span className="flex-1 truncate text-sm font-medium text-foreground">
                {t.title}
              </span>
              {t.labels.map((l) => (
                <LabelChip key={l} label={l} />
              ))}
              <PriorityBadge priority={t.priority} />
              <Button
                variant="ghost"
                size="sm"
                title="Move to Todo"
                onClick={(e) => {
                  e.stopPropagation();
                  promote(t);
                }}
              >
                <ArrowUp size={15} />
                Todo
              </Button>
            </div>
          ))}
        </div>
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
