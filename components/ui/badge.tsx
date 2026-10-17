import * as React from "react";
import { BookOpen, Bug, CheckSquare, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPE_LABELS, type Priority, type TicketType } from "@/lib/types";

const priorityStyles: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-brand-100 text-brand-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        priorityStyles[priority]
      )}
    >
      {priority}
    </span>
  );
}

export function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">
      {count}
    </span>
  );
}

const typeConfig: Record<
  TicketType,
  { icon: React.ElementType; className: string }
> = {
  story: { icon: BookOpen, className: "bg-emerald-100 text-emerald-700" },
  task: { icon: CheckSquare, className: "bg-brand-100 text-brand-700" },
  bug: { icon: Bug, className: "bg-red-100 text-red-700" },
  epic: { icon: Layers, className: "bg-purple-100 text-purple-700" },
};

export function TypeIcon({
  type,
  size = 14,
}: {
  type: TicketType;
  size?: number;
}) {
  const { icon: Icon, className } = typeConfig[type];
  return (
    <span
      title={TYPE_LABELS[type]}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded",
        className
      )}
    >
      <Icon size={size} />
    </span>
  );
}

export function LabelChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-slate-400 hover:text-slate-700"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
