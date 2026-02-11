"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TaskStatus, TaskWithAssignee } from "@/types/task";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TaskModal } from "../tasks/TaskModal";
import { TaskDetailSheet } from "../tasks/TaskDetailSheet";
import { useRealtime } from "@/hooks/use-realtime";

interface KanbanBoardProps {
  workspaceId: string;
  projectId: string;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
];

export function KanbanBoard({ workspaceId, projectId }: KanbanBoardProps) {
  useRealtime(projectId);
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<TaskStatus>("TODO");
  
  // Local state to manage tasks for immediate UI feedback
  const [localTasks, setLocalTasks] = useState<TaskWithAssignee[]>([]);

  const { data: serverTasks, isLoading, error } = useQuery<TaskWithAssignee[]>({
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

  // Sync local state when server data changes
  useEffect(() => {
    if (serverTasks) {
      setLocalTasks(serverTasks);
    }
  }, [serverTasks]);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", projectId] });
      const previousTasks = queryClient.getQueryData<TaskWithAssignee[]>(["tasks", projectId]);
      
      // We already updated local state in handleDragEnd, but we also update cache for consistency
      if (previousTasks) {
        queryClient.setQueryData<TaskWithAssignee[]>(["tasks", projectId], (old) => {
          if (!old) return [];
          return old.map((t) => t.id === taskId ? { ...t, status } : t);
        });
      }
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", projectId], context.previousTasks);
        setLocalTasks(context.previousTasks);
      }
      toast.error("Failed to update task position");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = localTasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Determine target status
    let newStatus: TaskStatus | null = null;
    if (COLUMNS.some(col => col.id === overId)) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = localTasks.find(t => t.id === overId);
      if (overTask) newStatus = overTask.status as TaskStatus;
    }

    if (newStatus && activeTask.status !== newStatus) {
      setLocalTasks(prev => 
        prev.map(t => t.id === activeId ? { ...t, status: newStatus! } : t)
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      // Rollback local tasks if dropped outside
      setLocalTasks(serverTasks || []);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const task = localTasks.find((t) => t.id === activeId);
    if (!task) return;

    // Check if dropped over a column or another task
    let finalStatus: TaskStatus;
    if (COLUMNS.some(col => col.id === overId)) {
      finalStatus = overId as TaskStatus;
    } else {
      const overTask = localTasks.find(t => t.id === overId);
      if (!overTask) return;
      finalStatus = overTask.status as TaskStatus;
    }

    // Trigger server update
    updateTaskMutation.mutate({ taskId: activeId, status: finalStatus });
  };

  const handleAddTask = (status: TaskStatus) => {
    setInitialStatus(status);
    setIsModalOpen(true);
  };

  if (isLoading && localTasks.length === 0) return <div className="p-8 text-center text-muted-foreground">Loading board...</div>;

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-6 h-full min-w-max">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={localTasks.filter((t) => t.status === column.id)}
                onAddTask={handleAddTask}
                onTaskClick={(id) => setSelectedTaskId(id)}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        projectId={projectId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })}
        initialStatus={initialStatus}
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
