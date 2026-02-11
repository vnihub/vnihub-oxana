import { Task } from "@prisma/client";

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type TaskWithAssignee = Task & {
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  predecessors?: Task[];
  successors?: Task[];
};
