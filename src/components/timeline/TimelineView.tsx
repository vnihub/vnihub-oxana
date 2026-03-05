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
  isWithinInterval,
  eachWeekOfInterval,
  endOfWeek
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
  isArchived?: boolean;
}

export function TimelineView({ workspaceId, projectId, isArchived = false }: TimelineViewProps) {
  useRealtime(projectId);
  const queryClient = useQueryClient();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'days' | 'weeks'>('days');
  
  const startDate = startOfMonth(viewDate);
  const endDate = endOfMonth(addMonths(viewDate, zoomLevel === 'days' ? 1 : 5));
  
  const columns = useMemo(() => {
    if (zoomLevel === 'days') {
      return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
        date,
        label: format(date, "d"),
        subLabel: format(date, "EEE").charAt(0),
        isStartOfGroup: date.getDate() === 1,
        groupLabel: format(date, "MMM")
      }));
    } else {
      return eachWeekOfInterval({ start: startDate, end: endDate }).map(date => ({
        date,
        label: `W${format(date, "w")}`,
        subLabel: format(date, "MMM d"),
        isStartOfGroup: date.getDate() <= 7,
        groupLabel: format(date, "MMM")
      }));
    }
  }, [startDate, endDate, zoomLevel]);

  const { data: tasks, isLoading: tasksLoading } = useQuery<TaskWithAssignee[]>({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery<any[]>({
    queryKey: ["sections", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/sections`);
      if (!res.ok) throw new Error("Failed to fetch sections");
      return res.json();
    },
  });

  const groupedTasks = useMemo(() => {
    if (!tasks) return [];
    
    const groups: { id: string, name: string, tasks: TaskWithAssignee[] }[] = [];
    
    sections?.forEach(s => {
      groups.push({
        id: s.id,
        name: s.name,
        tasks: tasks.filter(t => t.sectionId === s.id)
      });
    });
    
    const uncategorized = tasks.filter(t => !t.sectionId);
    if (uncategorized.length > 0) {
      groups.push({
        id: "uncategorized",
        name: "Uncategorized",
        tasks: uncategorized
      });
    }
    
    return groups;
  }, [tasks, sections]);

  const flattenedTasks = useMemo(() => {
    return groupedTasks.flatMap(g => g.tasks);
  }, [groupedTasks]);

  const columnWidth = zoomLevel === 'days' ? 40 : 80;

  const getTaskStyle = (task: TaskWithAssignee) => {
    if (!task.startDate && !task.dueDate) return null;
    
    const effectiveStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
    const effectiveEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!);
    
    const taskStart = startOfDay(effectiveStart);
    const taskEnd = startOfDay(effectiveEnd);
    
    const startOffsetDays = differenceInDays(taskStart, startDate);
    const durationDays = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);
    
    const pixelRatio = zoomLevel === 'days' ? columnWidth : columnWidth / 7;
    
    return {
      left: `${startOffsetDays * pixelRatio}px`,
      width: `${durationDays * pixelRatio}px`,
    };
  };

  if (tasksLoading || sectionsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading timeline...</div>;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-white z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GanttChart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {format(viewDate, "MMMM yyyy")} {zoomLevel === 'weeks' && `- ${format(endDate, "MMMM yyyy")}`}
            </h2>
          </div>
          
          <div className="flex items-center border rounded-md shadow-sm bg-slate-100 p-1">
            <Button 
              variant={zoomLevel === 'days' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setZoomLevel('days')}
              className={cn(
                "h-7 px-3 text-xs transition-all",
                zoomLevel === 'days' ? "bg-white text-primary shadow-sm hover:bg-white" : "text-muted-foreground hover:bg-slate-200"
              )}
            >
              Days
            </Button>
            <Button 
              variant={zoomLevel === 'weeks' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setZoomLevel('weeks')}
              className={cn(
                "h-7 px-3 text-xs transition-all",
                zoomLevel === 'weeks' ? "bg-white text-primary shadow-sm hover:bg-white" : "text-muted-foreground hover:bg-slate-200"
              )}
            >
              Weeks
            </Button>
          </div>

          <div className="flex items-center border rounded-md shadow-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewDate(prev => addMonths(prev, zoomLevel === 'days' ? -1 : -3))}
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
        <Button size="sm" onClick={() => setIsModalOpen(true)} disabled={isArchived}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="flex-1 overflow-auto relative">
        <div className="inline-block min-w-full">
          <div className="flex sticky top-0 z-30 bg-white border-b">
            <div className="w-64 flex-shrink-0 border-r bg-slate-50 p-2 font-medium text-xs text-muted-foreground uppercase tracking-wider flex items-center sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              Task
            </div>
            <div className="flex">
              {columns.map((col) => (
                <div 
                  key={col.date.toISOString()} 
                  className={cn(
                    "flex-shrink-0 border-r text-[10px] flex flex-col items-center justify-center h-12 relative transition-colors",
                    zoomLevel === 'days' && isToday(col.date) ? "bg-green-100/50 text-green-700 font-bold" : 
                    zoomLevel === 'days' && (col.date.getDay() === 0 || col.date.getDay() === 6) ? "bg-slate-200/50" : "bg-white",
                    col.isStartOfGroup && "border-l-2 border-l-gray-300"
                  )}
                  style={{ width: columnWidth }}
                >
                  {col.isStartOfGroup && (
                    <span className="absolute -top-1 left-1 text-[9px] font-bold text-gray-400 uppercase">
                      {col.groupLabel}
                    </span>
                  )}
                  <span className="opacity-70">{col.subLabel}</span>
                  <span>{col.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <svg 
              className="absolute inset-0 pointer-events-none z-0" 
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
              {flattenedTasks.map((task, taskIndex) => {
                let rowIndex = 0;
                for (const group of groupedTasks) {
                  rowIndex++; 
                  const tIdx = group.tasks.findIndex(t => t.id === task.id);
                  if (tIdx !== -1) {
                    rowIndex += tIdx;
                    break;
                  }
                  rowIndex += group.tasks.length;
                }

                const taskY = rowIndex * 48 + 24;

                return task.predecessors?.map((pred) => {
                  const predTask = flattenedTasks.find(t => t.id === pred.id);
                  if (!predTask || (!predTask.startDate && !predTask.dueDate) || (!task.startDate && !task.dueDate)) return null;

                  let predRowIndex = 0;
                  for (const group of groupedTasks) {
                    predRowIndex++;
                    const tIdx = group.tasks.findIndex(t => t.id === predTask.id);
                    if (tIdx !== -1) {
                      predRowIndex += tIdx;
                      break;
                    }
                    predRowIndex += group.tasks.length;
                  }

                  const predY = predRowIndex * 48 + 24;
                  const predEffectiveEnd = predTask.dueDate ? new Date(predTask.dueDate) : new Date(predTask.startDate!);
                  const taskEffectiveStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
                  
                  const predEnd = startOfDay(predEffectiveEnd);
                  const taskStart = startOfDay(taskEffectiveStart);

                  const pixelRatio = zoomLevel === 'days' ? columnWidth : columnWidth / 7;
                  const predEndX = 256 + differenceInDays(predEnd, startDate) * pixelRatio + pixelRatio;
                  const taskStartX = 256 + differenceInDays(taskStart, startDate) * pixelRatio;

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

            {groupedTasks.length > 0 ? (
              groupedTasks.map((group) => (
                <div key={group.id}>
                  <div className="flex border-b bg-slate-50">
                    <div className="w-64 flex-shrink-0 border-r p-2 flex items-center gap-2 bg-slate-100 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-4">{group.name}</span>
                    </div>
                    <div className="flex relative h-12">
                      {columns.map((col) => (
                        <div 
                          key={col.date.toISOString()} 
                          className="flex-shrink-0 border-r h-full bg-slate-50/30"
                          style={{ width: columnWidth }}
                        />
                      ))}
                    </div>
                  </div>

                  {group.tasks.map((task) => (
                    <div key={task.id} className="flex border-b group hover:bg-gray-50 transition-colors">
                      <div 
                        className="w-64 flex-shrink-0 border-r p-2 flex items-center gap-2 overflow-hidden bg-white sticky left-0 z-30 group-hover:bg-slate-50 cursor-pointer pl-6 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]"
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
                        {columns.map((col) => (
                          <div 
                            key={col.date.toISOString()} 
                            className={cn(
                              "flex-shrink-0 border-r h-full",
                              zoomLevel === 'days' && isToday(col.date) ? "bg-green-50/50" : 
                              zoomLevel === 'days' && (col.date.getDay() === 0 || col.date.getDay() === 6) ? "bg-slate-200/50" : "bg-white"
                            )}
                            style={{ width: columnWidth }}
                          />
                        ))}

                        {(task.startDate || task.dueDate) && (
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
                  ))}
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground italic">No tasks found in this project.</div>
            )}
            
            <div 
              className="absolute top-0 bottom-0 w-px bg-blue-600 z-20 pointer-events-none"
              style={{ 
                left: `calc(16rem + ${differenceInDays(startOfDay(new Date()), startDate) * (zoomLevel === 'days' ? columnWidth : columnWidth / 7) + (zoomLevel === 'days' ? columnWidth / 2 : 0)}px)` 
              }}
            >
              <div className="w-2 h-2 rounded-full bg-blue-600 -ml-[3.5px]" />
            </div>
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
        isArchived={isArchived}
      />
    </div>
  );
}
