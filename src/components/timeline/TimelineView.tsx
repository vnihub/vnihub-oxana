"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  startOfDay,
  differenceInDays,
  isToday,
  isWithinInterval
} from "date-fns";
import { TaskWithAssignee } from "@/types/task";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, GanttChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskModal } from "../tasks/TaskModal";
import { TaskDetailSheet } from "../tasks/TaskDetailSheet";
import { useRealtime } from "@/hooks/use-realtime";

interface TimelineViewProps {
  workspaceId: string;
  projectId: string;
}

export function TimelineView({ workspaceId, projectId }: TimelineViewProps) {
  useRealtime(projectId);
  const queryClient = useQueryClient();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const startDate = startOfMonth(viewDate);
  const endDate = endOfMonth(addMonths(viewDate, 1));
  
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const { data: tasks, isLoading } = useQuery<TaskWithAssignee[]>({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const dayWidth = 40; // pixels

  const getTaskStyle = (task: TaskWithAssignee) => {
    if (!task.startDate || !task.dueDate) return null;
    
    const taskStart = startOfDay(new Date(task.startDate));
    const taskEnd = startOfDay(new Date(task.dueDate));
    
    // Only show if it overlaps with our current view
    const viewInterval = { start: startDate, end: endDate };
    
    const isOverlapping = (
      isWithinInterval(taskStart, viewInterval) || 
      isWithinInterval(taskEnd, viewInterval) ||
      (taskStart < startDate && taskEnd > endDate)
    );

    if (!isOverlapping) return { display: 'none' };
    
    const startOffset = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    
    return {
      left: `${startOffset * dayWidth}px`,
      width: `${duration * dayWidth}px`,
    };
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading timeline...</div>;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Timeline Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GanttChart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {format(viewDate, "MMMM yyyy")} - {format(addMonths(viewDate, 1), "MMMM yyyy")}
            </h2>
          </div>
          <div className="flex items-center border rounded-md shadow-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewDate(prev => addMonths(prev, -1))}
              className="h-8 w-8 rounded-none border-r"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setViewDate(prev => addMonths(prev, 1))}
              className="h-8 w-8 rounded-none"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setViewDate(new Date())}>
            Today
          </Button>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="flex-1 overflow-auto relative">
        <div className="inline-block min-w-full">
          {/* Days Header */}
          <div className="flex sticky top-0 z-20 bg-white border-b">
            <div className="w-64 flex-shrink-0 border-r bg-gray-50 p-2 font-medium text-xs text-muted-foreground uppercase tracking-wider flex items-center sticky left-0 z-30">
              Task
            </div>
            <div className="flex">
              {days.map((day) => {
                const isStartOfMonth = day.getDate() === 1;
                return (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      "flex-shrink-0 border-r text-[10px] flex flex-col items-center justify-center h-12 relative",
                      isToday(day) ? "bg-green-100/50 text-green-700 font-bold" : (day.getDay() === 0 || day.getDay() === 6) ? "bg-slate-200/50" : "bg-white",
                      isStartOfMonth && "border-l-2 border-l-gray-300"
                    )}
                    style={{ width: dayWidth }}
                  >
                    {isStartOfMonth && (
                      <span className="absolute -top-1 left-1 text-[9px] font-bold text-gray-400 uppercase">
                        {format(day, "MMM")}
                      </span>
                    )}
                    <span className="opacity-70">{format(day, "EEE").charAt(0)}</span>
                    <span>{format(day, "d")}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Body */}
          <div className="relative">
            {/* SVG Overlay for dependencies */}
            <svg 
              className="absolute inset-0 pointer-events-none z-0" 
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
              {tasks?.map((task, taskIndex) => {
                const taskY = taskIndex * 48 + 24;

                return task.predecessors?.map((pred) => {
                  const predTask = tasks.find(t => t.id === pred.id);
                  if (!predTask || !predTask.startDate || !predTask.dueDate || !task.startDate || !task.dueDate) return null;

                  const predIndex = tasks.indexOf(predTask);
                  const predY = predIndex * 48 + 24;

                  const predEnd = startOfDay(new Date(predTask.dueDate));
                  const taskStart = startOfDay(new Date(task.startDate));

                  const predEndX = 256 + differenceInDays(predEnd, startDate) * dayWidth + dayWidth;
                  const taskStartX = 256 + differenceInDays(taskStart, startDate) * dayWidth;

                  return (
                    <path
                      key={`${pred.id}-${task.id}`}
                      d={`M ${predEndX} ${predY} L ${predEndX + 10} ${predY} L ${predEndX + 10} ${taskY} L ${taskStartX} ${taskY}`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      markerEnd="url(#arrowhead)"
                      className="opacity-50"
                    />
                  );
                });
              })}
            </svg>

            {tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <div key={task.id} className="flex border-b group hover:bg-gray-50 transition-colors">
                  <div 
                    className="w-64 flex-shrink-0 border-r p-2 flex items-center gap-2 overflow-hidden bg-white sticky left-0 z-10 group-hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      task.status === "DONE" ? "bg-green-500" : 
                      task.status === "IN_PROGRESS" ? "bg-blue-500" : 
                      task.status === "TODO" ? "bg-yellow-500" : "bg-gray-400"
                    )} />
                    <span className="text-sm truncate font-medium">{task.title}</span>
                  </div>

                  <div className="flex relative h-12">
                    {days.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "flex-shrink-0 border-r h-full",
                          isToday(day) ? "bg-green-50/50" : (day.getDay() === 0 || day.getDay() === 6) ? "bg-slate-200/50" : "bg-white"
                        )}
                        style={{ width: dayWidth }}
                      />
                    ))}

                    {task.startDate && task.dueDate && (
                      <div 
                        className={cn(
                          "absolute top-2 h-8 rounded-md flex items-center px-3 text-[11px] text-white font-medium overflow-hidden shadow-sm cursor-pointer hover:brightness-110 transition-all z-10",
                          task.status === "DONE" ? "bg-green-500" : 
                          task.status === "IN_PROGRESS" ? "bg-blue-600" : 
                          task.status === "TODO" ? "bg-yellow-600" : "bg-gray-500"
                        )}
                        style={getTaskStyle(task) || {}}
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <span className="truncate whitespace-nowrap">{task.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground italic">
                No tasks found in this project.
              </div>
            )}
            
            {/* Today Line */}
            {days.some(d => isToday(d)) && (
              <div 
                className="absolute top-0 bottom-0 w-px bg-blue-600 z-20 pointer-events-none"
                style={{ 
                  left: `calc(16rem + ${differenceInDays(startOfDay(new Date()), startDate) * dayWidth + dayWidth / 2}px)` 
                }}
              >
                <div className="w-2 h-2 rounded-full bg-blue-600 -ml-[3.5px]" />
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        projectId={projectId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })}
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