"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  User, 
  MessageSquare, 
  History, 
  Send, 
  CalendarIcon as CalendarLucide,
  Check,
  ChevronDown,
  Paperclip,
  Trash2,
  FileIcon,
  Loader2,
  Download,
  ListTodo,
  Plus,
  GanttChart
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TaskStatus, TaskPriority } from "@/types/task";

interface TaskDetailSheetProps {
  taskId: string | null;
  workspaceId: string;
  projectId: string;
  onClose: () => void;
}

export function TaskDetailSheet({ taskId, workspaceId, projectId, onClose }: TaskDetailSheetProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [comment, setComment] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const [isStartDateOpen, setIsStartDatePopoverOpen] = useState(false);
  const [isDueDateOpen, setIsDueDatePopoverOpen] = useState(false);

  const { data: task, isLoading, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      console.log(`[TaskDetailSheet] Fetching task: ${taskId} in project: ${projectId} of workspace: ${workspaceId}`);
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`[TaskDetailSheet] Fetch failed: ${res.status} ${text}`);
        throw new Error(text || "Failed to fetch task");
      }
      const data = await res.json();
      console.log(`[TaskDetailSheet] Successfully fetched task:`, data);
      return data;
    },
    enabled: !!taskId,
  });

  const { data: members } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!taskId,
  });

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });
      await queryClient.cancelQueries({ queryKey: ["tasks", projectId] });

      // Snapshot the previous values
      const previousTask = queryClient.getQueryData(["task", taskId]);
      const previousTasks = queryClient.getQueryData(["tasks", projectId]);

      // Optimistically update single task cache
      if (previousTask) {
        queryClient.setQueryData(["task", taskId], (old: any) => ({
          ...old,
          ...newData,
        }));
      }

      // Optimistically update list cache
      if (previousTasks) {
        queryClient.setQueryData(["tasks", projectId], (old: any[]) => {
          if (!old) return [];
          return old.map((t) => (t.id === taskId ? { ...t, ...newData } : t));
        });
      }

      return { previousTask, previousTasks };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(["task", taskId], context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", projectId], context.previousTasks);
      }
      toast.error("Failed to update task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          parentId: taskId,
          status: "TODO",
          priority: "MEDIUM" 
        }),
      });
      if (!res.ok) throw new Error("Failed to create subtask");
      return res.json();
    },
    onSuccess: () => {
      setSubtaskTitle("");
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      toast.success("Subtask added");
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update subtask");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload attachment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      toast.success("Attachment uploaded");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete attachment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      toast.success("Attachment deleted");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    setIsUploading(true);
    try {
      await uploadAttachmentMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      toast.success("Comment added");
    },
  });

  if (!taskId) return null;

  const STATUS_OPTIONS: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];
  const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[500px] p-0 flex flex-col z-[100] gap-0">
        <div className="sr-only">
          <SheetTitle>{task?.title || "Task Details"}</SheetTitle>
          <SheetDescription>View and edit task information.</SheetDescription>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-muted-foreground animate-pulse">Loading task details...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="text-destructive font-medium">Failed to load task</div>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["task", taskId] })}>
              Try Again
            </Button>
          </div>
        ) : !task ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2">
            <div className="font-medium text-muted-foreground">Task not found</div>
            <p className="text-sm text-muted-foreground">The task you are looking for might have been deleted or moved.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Scrollable Content Section */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6 pt-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 rounded-full px-3 text-xs gap-1 relative z-50 pointer-events-auto"
                        >
                          {task.status}
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="z-[110]">
                        {STATUS_OPTIONS.map((status) => (
                          <DropdownMenuItem key={status} onClick={() => updateTaskMutation.mutate({ status })}>
                            <span className={cn("mr-2", task.status === status ? "opacity-100" : "opacity-0")}>
                              <Check className="h-4 w-4" />
                            </span>
                            {status}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 rounded-full px-3 text-xs gap-1 relative z-50 pointer-events-auto"
                        >
                          {task.priority}
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="z-[110]">
                        {PRIORITY_OPTIONS.map((priority) => (
                          <DropdownMenuItem key={priority} onClick={() => updateTaskMutation.mutate({ priority })}>
                            <span className={cn("mr-2", task.priority === priority ? "opacity-100" : "opacity-0")}>
                              <Check className="h-4 w-4" />
                            </span>
                            {priority}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="relative">
                    {isEditingTitle ? (
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => {
                          setIsEditingTitle(false);
                          if (title !== task.title) updateTaskMutation.mutate({ title });
                        }}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        autoFocus
                        className="text-2xl font-bold border-none px-0 focus-visible:ring-0 h-auto bg-transparent relative z-10"
                      />
                    ) : (
                      <h2 
                        className="text-2xl font-bold cursor-pointer hover:bg-slate-100 p-1 -ml-1 rounded transition-colors"
                        onClick={() => setIsEditingTitle(true)}
                      >
                        {task.title}
                      </h2>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-24">
                      <User className="h-4 w-4" />
                      <span>Assignee</span>
                    </div>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto p-1 hover:bg-slate-100 gap-2 relative z-50 pointer-events-auto">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assignee?.image} />
                            <AvatarFallback className="text-[10px]">
                              {task.assignee?.name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{task.assignee?.name || "Unassigned"}</span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[200px] z-[110]">
                        <DropdownMenuItem onClick={() => updateTaskMutation.mutate({ assigneeId: null })}>
                          Unassigned
                        </DropdownMenuItem>
                        <Separator className="my-1" />
                        {members?.map((member: any) => (
                          <DropdownMenuItem key={member.id} onClick={() => updateTaskMutation.mutate({ assigneeId: member.id })}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={member.image} />
                                <AvatarFallback className="text-[10px]">{member.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <span>{member.name}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-24">
                      <CalendarLucide className="h-4 w-4" />
                      <span>Start Date</span>
                    </div>
                    <Popover open={isStartDateOpen} onOpenChange={setIsStartDatePopoverOpen} modal={false}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 px-2 font-medium justify-start text-left hover:bg-slate-100 relative z-50 pointer-events-auto",
                            !task.startDate && "text-muted-foreground"
                          )}
                        >
                          {task.startDate ? format(new Date(task.startDate), "PPP") : "No date"}
                          <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[110]" align="start">
                        <Calendar
                          mode="single"
                          selected={task.startDate ? new Date(task.startDate) : undefined}
                          onSelect={(date) => {
                            updateTaskMutation.mutate({ startDate: date });
                            setIsStartDatePopoverOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-24">
                      <CalendarLucide className="h-4 w-4" />
                      <span>Due Date</span>
                    </div>
                    <Popover open={isDueDateOpen} onOpenChange={setIsDueDatePopoverOpen} modal={false}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 px-2 font-medium justify-start text-left hover:bg-slate-100 relative z-50 pointer-events-auto",
                            !task.dueDate && "text-muted-foreground"
                          )}
                        >
                          {task.dueDate ? format(new Date(task.dueDate), "PPP") : "No date"}
                          <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[110]" align="start">
                        <Calendar
                          mode="single"
                          selected={task.dueDate ? new Date(task.dueDate) : undefined}
                          onSelect={(date) => {
                            updateTaskMutation.mutate({ dueDate: date });
                            setIsDueDatePopoverOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <GanttChart className="h-4 w-4" />
                      Dependencies
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {task.predecessors?.map((pred: any) => (
                      <div key={pred.id} className="flex items-center justify-between p-2 border rounded-lg bg-slate-50 text-sm">
                        <span className="truncate flex-1">{pred.title}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const newPredecessorIds = task.predecessors
                              .filter((p: any) => p.id !== pred.id)
                              .map((p: any) => p.id);
                            updateTaskMutation.mutate({ predecessorIds: newPredecessorIds });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1 h-8 border-dashed">
                          <Plus className="h-3 w-3" />
                          Add Dependency
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[300px] z-[110] max-h-[300px] overflow-y-auto">
                        {queryClient.getQueryData<any[]>(["tasks", projectId])
                          ?.filter(t => t.id !== task.id && !task.predecessors?.some((p: any) => p.id === t.id))
                          .map((t) => (
                            <DropdownMenuItem key={t.id} onClick={() => {
                              const newPredecessorIds = [...(task.predecessors?.map((p: any) => p.id) || []), t.id];
                              updateTaskMutation.mutate({ predecessorIds: newPredecessorIds });
                            }}>
                              {t.title}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Description</h4>
                  {isEditingDescription ? (
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={() => {
                        setIsEditingDescription(false);
                        if (description !== (task.description || "")) updateTaskMutation.mutate({ description });
                      }}
                      autoFocus
                      className="min-h-[100px] text-sm resize-none"
                      placeholder="Add a description..."
                    />
                  ) : (
                    <div 
                      className={cn(
                        "text-sm p-2 -ml-2 rounded cursor-pointer hover:bg-slate-100 transition-colors min-h-[40px]",
                        !task.description && "text-muted-foreground italic"
                      )}
                      onClick={() => setIsEditingDescription(true)}
                    >
                      {task.description || "No description provided. Click to add one."}
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      Subtasks
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {task.subtasks?.map((subtask: any) => (
                      <div 
                        key={subtask.id} 
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group border border-transparent hover:border-slate-200 transition-all"
                      >
                        <button
                          onClick={() => toggleSubtaskMutation.mutate({ 
                            id: subtask.id, 
                            status: subtask.status === "DONE" ? "TODO" : "DONE" 
                          })}
                          className={cn(
                            "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                            subtask.status === "DONE" ? "bg-green-500 border-green-500" : "border-slate-300 hover:border-primary"
                          )}
                        >
                          {subtask.status === "DONE" && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <span className={cn(
                          "text-sm flex-1",
                          subtask.status === "DONE" && "line-through text-muted-foreground"
                        )}>
                          {subtask.title}
                        </span>
                        {subtask.assignee && (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={subtask.assignee.image} />
                            <AvatarFallback className="text-[8px]">{subtask.assignee.name?.[0]}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center gap-2 p-1 pl-0">
                      <Plus className="h-4 w-4 text-muted-foreground ml-0.5" />
                      <Input
                        placeholder="Add a subtask..."
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && subtaskTitle.trim()) {
                            createSubtaskMutation.mutate(subtaskTitle);
                          }
                        }}
                        className="h-8 text-sm border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs gap-1"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                      Attach
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {task.attachments?.map((attachment: any) => (
                      <div 
                        key={attachment.id} 
                        className="flex items-center justify-between p-2 border rounded-lg bg-slate-50/50 group hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-white rounded border">
                            <FileIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{attachment.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(attachment.size / 1024).toFixed(1)} KB • {format(new Date(attachment.createdAt), "MMM d")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={attachment.url} 
                            download={attachment.name}
                            className="p-1 hover:bg-slate-200 rounded text-muted-foreground"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!task.attachments || task.attachments.length === 0) && (
                      <p className="text-xs text-muted-foreground italic text-center py-2 bg-slate-50/50 rounded-lg border border-dashed">
                        No attachments yet
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 py-3 bg-slate-50 -mx-6 px-6 border-y">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Activity & Comments</span>
                  </div>

                  <div className="space-y-6 pt-6 pb-6">
                    {task.comments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user.image} />
                          <AvatarFallback>{comment.user.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm bg-white border rounded-lg p-3 shadow-sm">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    ))}

                    {task.activities.map((activity: any) => (
                      <div key={activity.id} className="flex items-start gap-3 text-xs text-muted-foreground pl-11">
                        <History className="h-3 w-3 mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span>
                            <span className="font-medium text-foreground">{activity.user.name}</span>{" "}
                            {activity.description}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {format(new Date(activity.createdAt), "d MMM yyyy HH:mm")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer Section */}
            <div className="p-4 border-t bg-white shrink-0">
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Write a comment..." 
                  className="min-h-[80px]"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button 
                  size="sm" 
                  disabled={!comment.trim() || addCommentMutation.isPending}
                  onClick={() => addCommentMutation.mutate(comment)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Comment
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
