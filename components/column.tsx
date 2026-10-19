"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/badge";
import { springSnappy } from "@/lib/motion";
import { useMounted, useReducedMotionSafe } from "@/lib/use-mounted";
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
  const reduceMotion = useReducedMotionSafe();
  const mounted = useMounted();
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">
          {STATUS_LABELS[status]}
        </h2>
        <CountBadge count={tickets.length} />
      </div>
      <motion.div
        ref={setNodeRef}
        animate={{
          backgroundColor: isOver
            ? "rgba(191, 219, 254, 0.7)"
            : "rgba(239, 246, 255, 0.6)",
          borderColor: isOver ? "rgb(147, 197, 253)" : "rgba(0, 0, 0, 0)",
          scale: isOver && !reduceMotion ? 1.01 : 1,
        }}
        transition={springSnappy}
        className="flex min-h-24 flex-1 flex-col gap-2 rounded-2xl border border-dashed p-2"
      >
        <AnimatePresence initial={false}>
          {tickets.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduceMotion}
              initial={mounted ? { opacity: 0, scale: 0.96 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={springSnappy}
            >
              <TicketCard ticket={t} onOpen={onOpen} />
            </motion.div>
          ))}
        </AnimatePresence>
        {tickets.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted">No tickets</p>
        )}
      </motion.div>
    </div>
  );
}
