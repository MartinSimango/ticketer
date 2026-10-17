"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { User } from "lucide-react";
import { PriorityBadge, TypeIcon, LabelChip } from "@/components/ui/badge";
import type { Ticket } from "@/lib/types";

export function TicketCard({
  ticket,
  onOpen,
  draggable = true,
}: {
  ticket: Ticket;
  onOpen: (t: Ticket) => void;
  draggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: ticket.id, disabled: !draggable });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(ticket)}
      className="group cursor-grab rounded-xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:border-brand-200 hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start gap-2">
        <TypeIcon type={ticket.type} />
        <p className="flex-1 text-sm font-medium leading-snug text-foreground">
          {ticket.title}
        </p>
        <PriorityBadge priority={ticket.priority} />
      </div>
      {ticket.description && (
        <p className="mb-2 line-clamp-2 text-xs text-muted">
          {ticket.description}
        </p>
      )}
      {ticket.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {ticket.labels.map((l) => (
            <LabelChip key={l} label={l} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-brand-600">{ticket.id}</span>
        {ticket.assignee ? (
          <span
            title={ticket.assignee}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
          >
            {ticket.assignee.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-muted">
            <User size={13} />
          </span>
        )}
      </div>
    </div>
  );
}
