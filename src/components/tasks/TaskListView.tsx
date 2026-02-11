"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { useState } from "react";
import { TaskStatus, TaskPriority, TaskWithAssignee } from "@/types/task";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/use-realtime";

interface TaskListViewProps {
  workspaceId: string;
  projectId: string;
}

export function TaskListView({ workspaceId, projectId }: TaskListViewProps) {
  useRealtime(projectId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading, error, refetch } = useQuery<TaskWithAssignee[]>({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch tasks");
      }
      return res.json();
    },
  });

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "BACKLOG": return "bg-slate-500";
      case "TODO": return "bg-blue-500";
      case "IN_PROGRESS": return "bg-yellow-500";
      case "DONE": return "bg-green-500";
      default: return "bg-slate-500";
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case "LOW": return "text-blue-500 bg-blue-50";
      case "MEDIUM": return "text-yellow-600 bg-yellow-50";
      case "HIGH": return "text-red-500 bg-red-50";
      default: return "text-slate-500 bg-slate-50";
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>;

  return (
    <div className="p-6">
      <div className="mb-4">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Task name</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks?.map((task) => (
              <TableRow 
                key={task.id} 
                className="cursor-pointer"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {task.assignee?.image && <AvatarImage src={task.assignee.image} />}
                      <AvatarFallback className="text-[10px]">
                        {task.assignee?.name?.[0] || <User className="h-3 w-3" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[100px]">
                      {task.assignee?.name || "Unassigned"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={cn(
                    "flex items-center gap-2 text-sm",
                    task.dueDate ? "text-foreground" : "text-muted-foreground"
                  )}>
                    <Calendar className="h-4 w-4" />
                    <span>{task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No date"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityColor(task.priority as TaskPriority)}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(task.status as TaskStatus)}>
                    {task.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tasks?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        projectId={projectId}
        onSuccess={refetch}
      />

      <TaskDetailSheet 
        taskId={selectedTaskId}
        workspaceId={workspaceId}
        projectId={projectId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
