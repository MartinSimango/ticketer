import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
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
} from "../lib/types";
import type { DraftTicket } from "./api";

export interface FormValue {
  id?: string;
  title: string;
  description: string;
  type: TicketType;
  status: Status;
  priority: Priority;
  assignee: string;
  labels: string[];
}

const FIELDS = [
  "title",
  "description",
  "type",
  "status",
  "priority",
  "assignee",
  "labels",
] as const;
type Field = (typeof FIELDS)[number];

function cycle<T>(arr: readonly T[], cur: T, dir: 1 | -1): T {
  const i = arr.indexOf(cur);
  const n = (i + dir + arr.length) % arr.length;
  return arr[n];
}

export function TicketForm({
  initial,
  isEdit,
  onSubmit,
  onCancel,
}: {
  initial: FormValue;
  isEdit: boolean;
  onSubmit: (draft: DraftTicket) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<FormValue>(initial);
  const [labelText, setLabelText] = useState(initial.labels.join(", "));
  const [fieldIdx, setFieldIdx] = useState(0);
  const field: Field = FIELDS[fieldIdx];
  const isText = (f: Field) =>
    f === "title" || f === "description" || f === "assignee" || f === "labels";

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    // Ctrl+S saves from anywhere.
    if (key.ctrl && input === "s") {
      save();
      return;
    }
    // Move between fields.
    if (key.upArrow) {
      setFieldIdx((i) => (i - 1 + FIELDS.length) % FIELDS.length);
      return;
    }
    if (key.downArrow || key.tab) {
      setFieldIdx((i) => (i + 1) % FIELDS.length);
      return;
    }
    // Enum fields cycle with left/right.
    if (!isText(field) && (key.leftArrow || key.rightArrow)) {
      const dir = key.rightArrow ? 1 : -1;
      setValue((v) => {
        if (field === "type") return { ...v, type: cycle(TYPES, v.type, dir) };
        if (field === "status")
          return { ...v, status: cycle(STATUSES, v.status, dir) };
        if (field === "priority")
          return { ...v, priority: cycle(PRIORITIES, v.priority, dir) };
        return v;
      });
      return;
    }
    // Enter on the last field submits.
    if (key.return && fieldIdx === FIELDS.length - 1) {
      save();
    }
  });

  function save() {
    const labels = labelText
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!value.title.trim()) {
      setFieldIdx(0);
      return;
    }
    onSubmit({
      title: value.title.trim(),
      description: value.description,
      type: value.type,
      status: value.status,
      priority: value.priority,
      assignee: value.assignee,
      labels,
    });
  }

  const Row = ({ f, label, children }: { f: Field; label: string; children: React.ReactNode }) => (
    <Box>
      <Box width={14}>
        <Text color={field === f ? "cyan" : "gray"}>
          {field === f ? "› " : "  "}
          {label}
        </Text>
      </Box>
      <Box>{children}</Box>
    </Box>
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        {isEdit ? `Edit ${initial.id}` : "New ticket"}
      </Text>
      <Box flexDirection="column" marginTop={1} gap={0}>
        <Row f="title" label="Title">
          {field === "title" ? (
            <TextInput
              value={value.title}
              onChange={(t) => setValue((v) => ({ ...v, title: t }))}
            />
          ) : (
            <Text>{value.title || <Text color="gray">—</Text>}</Text>
          )}
        </Row>
        <Row f="description" label="Description">
          {field === "description" ? (
            <TextInput
              value={value.description}
              onChange={(t) => setValue((v) => ({ ...v, description: t }))}
            />
          ) : (
            <Text>{value.description || <Text color="gray">—</Text>}</Text>
          )}
        </Row>
        <Row f="type" label="Type">
          <Text color={field === "type" ? "white" : undefined}>
            ‹ {TYPE_LABELS[value.type]} ›
          </Text>
        </Row>
        <Row f="status" label="Status">
          <Text color={field === "status" ? "white" : undefined}>
            ‹ {STATUS_LABELS[value.status]} ›
          </Text>
        </Row>
        <Row f="priority" label="Priority">
          <Text color={field === "priority" ? "white" : undefined}>
            ‹ {PRIORITY_LABELS[value.priority]} ›
          </Text>
        </Row>
        <Row f="assignee" label="Assignee">
          {field === "assignee" ? (
            <TextInput
              value={value.assignee}
              onChange={(t) => setValue((v) => ({ ...v, assignee: t }))}
            />
          ) : (
            <Text>{value.assignee || <Text color="gray">—</Text>}</Text>
          )}
        </Row>
        <Row f="labels" label="Labels">
          {field === "labels" ? (
            <TextInput value={labelText} onChange={setLabelText} />
          ) : (
            <Text>{labelText || <Text color="gray">—</Text>}</Text>
          )}
        </Row>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          ↑/↓ or Tab: move field · ←/→: change option · Ctrl+S: save · Esc:
          cancel
        </Text>
      </Box>
    </Box>
  );
}
