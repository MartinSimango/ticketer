"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LabelChip } from "@/components/ui/badge";
import {
  STATUSES,
  PRIORITIES,
  TYPES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  type Status,
  type Priority,
  type TicketType,
} from "@/lib/types";

export interface DraftTicket {
  id?: string;
  title: string;
  description: string;
  type: TicketType;
  status: Status;
  priority: Priority;
  assignee: string;
  labels: string[];
}

export function TicketDialog({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: DraftTicket;
  onClose: () => void;
  onSave: (draft: DraftTicket) => void;
  onDelete?: (id: string) => void;
}) {
  const [draft, setDraft] = React.useState<DraftTicket>(initial);
  const [labelInput, setLabelInput] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setDraft(initial);
      setLabelInput("");
    }
  }, [open, initial]);

  const isEdit = Boolean(initial.id);

  function addLabel() {
    const value = labelInput.trim();
    if (!value) return;
    if (!draft.labels.some((l) => l.toLowerCase() === value.toLowerCase())) {
      setDraft({ ...draft, labels: [...draft.labels, value] });
    }
    setLabelInput("");
  }

  function removeLabel(label: string) {
    setDraft({ ...draft, labels: draft.labels.filter((l) => l !== label) });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    onSave(draft);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${initial.id}` : "New ticket"}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={draft.title}
            autoFocus
            placeholder="What needs doing?"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={draft.description}
            placeholder="Add more detail…"
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              value={draft.type}
              onChange={(e) =>
                setDraft({ ...draft, type: e.target.value as TicketType })
              }
              options={TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            />
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              id="priority"
              value={draft.priority}
              onChange={(e) =>
                setDraft({ ...draft, priority: e.target.value as Priority })
              }
              options={PRIORITIES.map((p) => ({
                value: p,
                label: PRIORITY_LABELS[p],
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as Status })
              }
              options={STATUSES.map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
              }))}
            />
          </div>
          <div>
            <Label htmlFor="assignee">Assignee</Label>
            <Input
              id="assignee"
              value={draft.assignee}
              placeholder="Who owns this?"
              onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="labels">Labels</Label>
          <div className="flex gap-2">
            <Input
              id="labels"
              value={labelInput}
              placeholder="Add a label and press Enter"
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLabel();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addLabel}>
              Add
            </Button>
          </div>
          {draft.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draft.labels.map((l) => (
                <LabelChip key={l} label={l} onRemove={() => removeLabel(l)} />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {isEdit && onDelete ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onDelete(initial.id!)}
            >
              <Trash2 size={15} />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save" : "Create"}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
