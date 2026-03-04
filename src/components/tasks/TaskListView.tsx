"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Calendar, User, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
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
import { useState, useMemo } from "react";
import { TaskStatus, TaskPriority, TaskWithAssignee } from "@/types/task";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/use-realtime";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Section {
  id: string;
  name: string;
  order: number;
}

interface TaskListViewProps {
  workspaceId: string;
  projectId: string;
  isArchived?: boolean;
}

function SortableTaskRow({ 
  task, 
  onClick, 
  getStatusColor, 
  getPriorityColor 
}: { 
  task: TaskWithAssignee; 
  onClick: () => void;
  getStatusColor: (s: any) => string;
  getPriorityColor: (p: any) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow 
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="cursor-pointer group h-9"
      onClick={onClick}
    >
      <TableCell className="font-medium pl-10 py-1 flex items-center gap-2">
        <div {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-3 w-3 rotate-90 text-muted-foreground" />
        </div>
        <span className="truncate">{task.title}</span>
        {(task.subtasks?.length ?? 0) > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 h-3.5 gap-1 opacity-50 font-normal">
            {task.subtasks?.length} subtasks
          </Badge>
        )}
      </TableCell>
      <TableCell className="py-1">
        <div className="flex items-center gap-2 scale-90 origin-left">
          <Avatar className="h-5 w-5">
            {task.assignee?.image && <AvatarImage src={task.assignee.image} />}
            <AvatarFallback className="text-[9px]">
              {task.assignee?.name?.[0] || <User className="h-2.5 w-2.5" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs truncate max-w-[100px]">
            {task.assignee?.name || "Unassigned"}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-1">
        <div className={cn(
          "flex items-center gap-1.5 text-xs",
          task.dueDate ? "text-foreground" : "text-muted-foreground"
        )}>
          <Calendar className="h-3.5 w-3.5" />
          <span>{task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No date"}</span>
        </div>
      </TableCell>
      <TableCell className="py-1">
        <Badge variant="outline" className={cn("text-[10px] py-0 h-5", getPriorityColor(task.priority as TaskPriority))}>
          {task.priority}
        </Badge>
      </TableCell>
      <TableCell className="py-1">
        <Badge className={cn("text-[10px] py-0 h-5", getStatusColor(task.status as TaskStatus))}>
          {task.status.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell className="text-right py-1">
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function TaskListView({ workspaceId, projectId, isArchived = false }: TaskListViewProps) {
  useRealtime(projectId);
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [initialSectionId, setInitialSectionId] = useState<string | undefined>(undefined);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [inlineSectionId, setInlineSectionId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery<TaskWithAssignee[]>({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const { data: sections, isLoading: sectionsLoading, refetch: refetchSections } = useQuery<Section[]>({
    queryKey: ["sections", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/sections`);
      if (!res.ok) throw new Error("Failed to fetch sections");
      return res.json();
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create section");
      return res.json();
    },
    onSuccess: () => {
      setIsAddingSection(false);
      setNewSectionName("");
      refetchSections();
      toast.success("Section created");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, sectionId }: { id: string; sectionId: string | null }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    }
  });

  const allSections = useMemo(() => {
    const list = [...(sections || [])];
    list.push({ id: "uncategorized", name: "Uncategorized", order: 999 });
    return list;
  }, [sections]);

  // Initialize active section
  React.useEffect(() => {
    if (allSections.length > 0 && !activeSectionId) {
      setActiveSectionId(allSections[0].id);
    }
  }, [allSections, activeSectionId]);

  const createTaskMutation = useMutation({
    mutationFn: async ({ title, sectionId }: { title: string; sectionId?: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          sectionId: sectionId === "uncategorized" ? null : sectionId,
          status: "TODO",
          priority: "MEDIUM"
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      setInlineTitle("");
      setInlineSectionId(null);
      refetchTasks();
      toast.success("Task created");
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const endpoint = id === "uncategorized" 
        ? `/api/workspaces/${workspaceId}/projects/${projectId}/sections/promote-uncategorized`
        : `/api/workspaces/${workspaceId}/projects/${projectId}/sections/${id}`;
      
      const method = id === "uncategorized" ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update section");
      return res.json();
    },
    onSuccess: (newSection) => {
      setEditingSectionId(null);
      if (activeSectionId === "uncategorized") {
        setActiveSectionId(newSection.id);
      }
      refetchSections();
      refetchTasks();
      toast.success("Section updated");
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/sections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete section");
    },
    onSuccess: () => {
      if (activeSectionId && !allSections.find(s => s.id === activeSectionId)) {
        setActiveSectionId(allSections[0].id);
      }
      refetchSections();
      refetchTasks();
      toast.success("Section deleted");
    },
  });

  const groupedTasks = useMemo(() => {
    if (!tasks) return {};
    const groups: Record<string, TaskWithAssignee[]> = { "uncategorized": [] };
    
    sections?.forEach(s => groups[s.id] = []);
    
    tasks.forEach(task => {
      const key = task.sectionId || "uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    
    return groups;
  }, [tasks, sections]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isArchived) return;

      const isTyping = 
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable;

      if (isTyping) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
          setInlineSectionId(null);
          setIsAddingSection(false);
          setEditingSectionId(null);
        }
        return;
      }

      const key = e.key.toLowerCase();

      // Open Modal
      if (key === 't') {
        e.preventDefault();
        setInitialSectionId(activeSectionId || undefined);
        setIsModalOpen(true);
      }

      // Inline Add
      if (key === 'n') {
        e.preventDefault();
        if (activeSectionId) {
          setInlineSectionId(activeSectionId);
          setCollapsedSections(prev => ({ ...prev, [activeSectionId]: false }));
        }
      }

      // Navigation
      if (key === 'j' || key === 'k') {
        e.preventDefault();
        const currentIndex = allSections.findIndex(s => s.id === activeSectionId);
        let nextIndex = currentIndex;

        if (key === 'j') { // Down
          nextIndex = (currentIndex + 1) % allSections.length;
        } else { // Up
          nextIndex = (currentIndex - 1 + allSections.length) % allSections.length;
        }

        const nextSection = allSections[nextIndex];
        if (nextSection) {
          setActiveSectionId(nextSection.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isArchived, activeSectionId, allSections]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Detect if dropped over a section row or another task
    let targetSectionId = overId;
    
    // Find task being dragged
    const draggedTask = tasks?.find(t => t.id === taskId);
    if (!draggedTask) return;

    // If dropped over another task, get that task's section
    const overTask = tasks?.find(t => t.id === overId);
    if (overTask) {
      targetSectionId = overTask.sectionId || "uncategorized";
    }

    if (draggedTask.sectionId !== (targetSectionId === "uncategorized" ? null : targetSectionId)) {
      updateTaskMutation.mutate({ 
        id: taskId, 
        sectionId: targetSectionId === "uncategorized" ? "uncategorized" : targetSectionId 
      });
    }
  };

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

  if (tasksLoading || sectionsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading project data...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          onClick={() => {
            setInitialSectionId(activeSectionId || undefined);
            setIsModalOpen(true);
          }} 
          disabled={isArchived} 
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isArchived}
          onClick={() => setIsAddingSection(true)}
        >
          Add Section
        </Button>
      </div>

      {isAddingSection && (
        <div className="mb-4 flex items-center gap-2 p-2 bg-slate-50 rounded-md border border-dashed">
          <Input 
            placeholder="Section name..." 
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSectionName.trim()) addSectionMutation.mutate(newSectionName);
              if (e.key === "Escape") setIsAddingSection(false);
            }}
            autoFocus
            className="h-8 max-w-[300px]"
          />
          <Button size="sm" onClick={() => addSectionMutation.mutate(newSectionName)} disabled={!newSectionName.trim()}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setIsAddingSection(false)}>Cancel</Button>
        </div>
      )}

      <div className="bg-white rounded-md border overflow-hidden">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40%]">Task name</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSections.map((section) => {
                const sectionTasks = groupedTasks[section.id] || [];
                if (section.id === "uncategorized" && sectionTasks.length === 0) return null;
                
                const isCollapsed = collapsedSections[section.id];
                const isEditing = editingSectionId === section.id;
                const isActive = activeSectionId === section.id;
                
                return (
                  <React.Fragment key={section.id}>
                    <TableRow 
                      id={section.id}
                      className={cn(
                        "bg-slate-50/50 hover:bg-slate-100 group transition-all duration-200",
                        isActive && "bg-blue-50/80 ring-1 ring-blue-200 ring-inset"
                      )}
                      onClick={() => setActiveSectionId(section.id)}
                    >
                      <TableCell colSpan={6} className="py-2 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground relative">
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-md" />
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection(section.id);
                              }}
                              className="hover:bg-slate-200 p-0.5 rounded transition-colors"
                            >
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            
                            {isEditing ? (
                              <Input 
                                value={editingSectionName}
                                onChange={(e) => setEditingSectionName(e.target.value)}
                                className="h-7 max-w-[250px] text-xs font-semibold uppercase py-0 px-2"
                                autoFocus
                                onBlur={() => {
                                  if (editingSectionName.trim() && editingSectionName !== section.name) {
                                    updateSectionMutation.mutate({ id: section.id, name: editingSectionName });
                                  } else {
                                    setEditingSectionId(null);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateSectionMutation.mutate({ id: section.id, name: editingSectionName });
                                  }
                                  if (e.key === "Escape") setEditingSectionId(null);
                                }}
                              />
                            ) : (
                              <>
                                <span>{section.name}</span>
                                <span className="ml-2 font-normal lowercase opacity-50">({sectionTasks.length})</span>
                              </>
                            )}
                          </div>

                          {!isArchived && !isEditing && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingSectionId(section.id);
                                  setEditingSectionName(section.id === "uncategorized" ? "" : section.name);
                                }}>
                                  <Pencil className="h-3 w-3 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                {section.id !== "uncategorized" && (
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      if (confirm("Are you sure? Tasks in this section will be moved to Uncategorized.")) {
                                        deleteSectionMutation.mutate(section.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {!isCollapsed && (
                      <SortableContext 
                        items={sectionTasks.map(t => t.id)} 
                        strategy={verticalListSortingStrategy}
                      >
                        {sectionTasks.map((task) => (
                          <SortableTaskRow 
                            key={task.id} 
                            task={task} 
                            onClick={() => setSelectedTaskId(task.id)}
                            getStatusColor={getStatusColor}
                            getPriorityColor={getPriorityColor}
                          />
                        ))}
                      </SortableContext>
                    )}

                    {!isCollapsed && !isArchived && (
                      <TableRow className="hover:bg-transparent h-8">
                        <TableCell colSpan={6} className="py-1 pl-10">
                          {inlineSectionId === section.id ? (
                            <div className="flex items-center gap-2 pr-4">
                              <Input 
                                placeholder="Task name..." 
                                value={inlineTitle}
                                onChange={(e) => setInlineTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && inlineTitle.trim()) {
                                    createTaskMutation.mutate({ title: inlineTitle, sectionId: section.id });
                                  }
                                  if (e.key === "Escape") {
                                    setInlineSectionId(null);
                                    setInlineTitle("");
                                  }
                                }}
                                autoFocus
                                className="h-7 text-xs border-none shadow-none focus-visible:ring-1 bg-slate-50"
                              />
                              <Button 
                                size="sm" 
                                className="h-6 text-[10px] px-2" 
                                onClick={() => createTaskMutation.mutate({ title: inlineTitle, sectionId: section.id })}
                                disabled={!inlineTitle.trim() || createTaskMutation.isPending}
                              >
                                Add
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 text-[10px] px-2"
                                onClick={() => {
                                  setInlineSectionId(null);
                                  setInlineTitle("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button 
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors group/btn"
                              onClick={() => setInlineSectionId(section.id)}
                            >
                              <Plus className="h-3 w-3 group-hover/btn:scale-110 transition-transform" />
                              Add task to {section.name}
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialSectionId(undefined);
        }}
        workspaceId={workspaceId}
        projectId={projectId}
        initialSectionId={initialSectionId}
        onSuccess={refetchTasks}
      />

      <TaskDetailSheet 
        taskId={selectedTaskId}
        workspaceId={workspaceId}
        projectId={projectId}
        onClose={() => setSelectedTaskId(null)}
        isArchived={isArchived}
      />
    </div>
  );
}