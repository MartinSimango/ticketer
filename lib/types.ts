export const STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "under_review",
  "done",
] as const;

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const TYPES = ["story", "task", "bug", "epic"] as const;

// Statuses shown on the main board (Backlog lives on its own page).
export const BOARD_STATUSES = [
  "todo",
  "in_progress",
  "under_review",
  "done",
] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type TicketType = (typeof TYPES)[number];

export interface Project {
  id: string;
  key: string;
  name: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: TicketType;
  status: Status;
  priority: Priority;
  assignee: string;
  labels: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  under_review: "Under Review",
  done: "Done",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TYPE_LABELS: Record<TicketType, string> = {
  story: "Story",
  task: "Task",
  bug: "Bug",
  epic: "Epic",
};
