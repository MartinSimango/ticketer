"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/badge";
import { TicketCard } from "./ticket-card";
import { STATUS_LABELS, type Status, type Ticket } from "@/lib/types";

export function Column({
  status,
  tickets,
  onOpen,
}: {
  status: Status;
  tickets: Ticket[];
  onOpen: (t: Ticket) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">
          {STATUS_LABELS[status]}
        </h2>
        <CountBadge count={tickets.length} />
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-2xl border border-dashed border-transparent bg-brand-50/60 p-2 transition-colors",
          isOver && "border-brand-300 bg-brand-100/70"
        )}
      >
        {tickets.map((t) => (
          <TicketCard key={t.id} ticket={t} onOpen={onOpen} />
        ))}
        {tickets.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted">
            No tickets
          </p>
        )}
      </div>
    </div>
  );
}
