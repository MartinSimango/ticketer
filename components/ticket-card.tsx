"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";
import { User } from "lucide-react";
import { PriorityBadge, TypeIcon, LabelChip } from "@/components/ui/badge";
import { springMomentum } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/use-mounted";
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
  const reduceMotion = useReducedMotionSafe();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: ticket.id, disabled: !draggable });

  // Track the pointer 1:1 while dragging; spring back to the grid on release.
  const dragX = transform?.x ?? 0;
  const dragY = transform?.y ?? 0;

  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(ticket)}
      animate={{
        x: dragX,
        y: dragY,
        opacity: isDragging ? 0.85 : 1,
        scale: isDragging ? 1.03 : 1,
        boxShadow: isDragging
          ? "0 12px 28px -8px rgba(37, 99, 235, 0.35)"
          : "0 1px 2px 0 rgba(15, 23, 42, 0.06)",
      }}
      transition={
        isDragging
          ? { duration: 0 } // 1:1 tracking while the finger drives it
          : reduceMotion
            ? { duration: 0.2 }
            : springMomentum // velocity-aware settle on release
      }
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      style={{ zIndex: isDragging ? 50 : undefined, position: "relative" }}
      className="group cursor-grab rounded-xl border border-border bg-surface p-3 hover:border-brand-200 active:cursor-grabbing"
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
    </motion.div>
  );
}
