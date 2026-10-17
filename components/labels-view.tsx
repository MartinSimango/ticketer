"use client";

import * as React from "react";
import { LabelChip, CountBadge } from "@/components/ui/badge";
import { TicketCard } from "./ticket-card";
import { TicketDialog, type DraftTicket } from "./ticket-dialog";
import type { Project, Ticket } from "@/lib/types";

export function LabelsView({
  project,
  initialTickets,
}: {
  project: Project;
  initialTickets: Ticket[];
}) {
  const [tickets, setTickets] = React.useState<Ticket[]>(initialTickets);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftTicket | null>(null);

  React.useEffect(() => setTickets(initialTickets), [initialTickets]);

  const groups = React.useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const t of tickets) {
      const keys = t.labels.length ? t.labels : ["(no label)"];
      for (const k of keys) {
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(t);
      }
    }
    return [...map.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
    );
  }, [tickets]);

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
    const res = await fetch(`/api/tickets/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const updated: Ticket = await res.json();
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setDialogOpen(false);
  }

  async function deleteDraft(id: string) {
    await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setDialogOpen(false);
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="text-base font-semibold text-foreground">
          {project.name} · Labels
        </h1>
        <p className="text-xs text-muted">{groups.length} labels</p>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {groups.map(([label, group]) => (
            <section key={label}>
              <div className="mb-2 flex items-center gap-2">
                <LabelChip label={label} />
                <CountBadge count={group.length} />
              </div>
              <div className="flex flex-wrap gap-2">
                {group.map((t) => (
                  <div key={t.id} className="w-64">
                    <TicketCard
                      ticket={t}
                      onOpen={openEdit}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {draft && (
        <TicketDialog
          open={dialogOpen}
          initial={draft}
          onClose={() => setDialogOpen(false)}
          onSave={saveDraft}
          onDelete={draft.id ? deleteDraft : undefined}
        />
      )}
    </div>
  );
}
