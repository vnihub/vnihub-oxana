"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Archive, Trash2, RotateCcw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const { workspaceId, projectId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectLeaderId, setProjectLeaderId] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  const COLORS = [
    { name: "Blue", value: "bg-blue-50 border-blue-100 text-blue-600" },
    { name: "Red", value: "bg-red-50 border-red-100 text-red-600" },
    { name: "Green", value: "bg-green-50 border-green-100 text-green-600" },
    { name: "Yellow", value: "bg-yellow-50 border-yellow-100 text-yellow-600" },
    { name: "Purple", value: "bg-purple-50 border-purple-100 text-purple-600" },
    { name: "Pink", value: "bg-pink-50 border-pink-100 text-pink-600" },
    { name: "Indigo", value: "bg-indigo-50 border-indigo-100 text-indigo-600" },
    { name: "Slate", value: "bg-slate-50 border-slate-100 text-slate-600" },
  ];

  const ICONS = ["📁", "🚀", "📊", "💡", "🛠️", "🎨", "📣", "🔒", "🌐", "📱"];

  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ["project-settings", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setProjectLeaderId(project.projectLeaderId);
      setColor(project.color || COLORS[0].value);
      setIcon(project.icon || "📁");
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update project");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Project updated!");
      queryClient.invalidateQueries({ queryKey: ["project-settings", projectId] });
      router.refresh();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
    },
    onSuccess: () => {
      toast.success("Project deleted");
      router.push(`/workspaces/${workspaceId}`);
      router.refresh();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleSave = () => {
    updateProjectMutation.mutate({ name, description, projectLeaderId, color, icon });
  };

  const handleToggleArchive = () => {
    updateProjectMutation.mutate({ isArchived: !project.isArchived });
  };

  const duplicateAsTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${project.name} (Template)`, isTemplate: true }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Project saved as template!");
      router.refresh();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  if (isProjectLoading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground text-sm">Manage project details and status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>Update your project name and description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Campaign"
              disabled={project?.isArchived}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={4}
              disabled={project?.isArchived}
            />
          </div>
          <div className="space-y-2">
            <Label>Project Leader</Label>
            <Select 
              value={projectLeaderId} 
              onValueChange={setProjectLeaderId}
              disabled={project?.isArchived}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project leader" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member: any) => (
                  <SelectItem key={member.user.id} value={member.user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.user.image} />
                        <AvatarFallback>{member.user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{member.user.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-3">
              <Label>Project Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => !project?.isArchived && setColor(c.value)}
                    disabled={project?.isArchived}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      c.value,
                      color === c.value ? "border-black scale-110 shadow-sm" : "border-transparent",
                      !project?.isArchived ? "hover:scale-105" : "opacity-50 cursor-not-allowed"
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Project Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => !project?.isArchived && setIcon(i)}
                    disabled={project?.isArchived}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 flex items-center justify-center text-lg transition-all bg-white",
                      icon === i ? "border-black scale-110 shadow-sm" : "border-slate-200",
                      !project?.isArchived ? "hover:border-slate-300" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end pt-6">
          <Button 
            onClick={handleSave} 
            disabled={updateProjectMutation.isPending || project?.isArchived}
          >
            Save Changes
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Save this project structure to reuse it for future projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-slate-500" />
              <div>
                <p className="font-medium">Save as Template</p>
                <p className="text-xs text-muted-foreground">
                  Creates a reusable copy of all tasks and subtasks.
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => duplicateAsTemplateMutation.mutate()}
              disabled={duplicateAsTemplateMutation.isPending}
            >
              {duplicateAsTemplateMutation.isPending ? "Saving..." : "Save as Template"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
          <CardDescription>
            Archiving a project hides it from the sidebar and active project lists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-3">
              {project?.isArchived ? (
                <RotateCcw className="h-5 w-5 text-blue-500" />
              ) : (
                <Archive className="h-5 w-5 text-slate-500" />
              )}
              <div>
                <p className="font-medium">
                  {project?.isArchived ? "Restore Project" : "Archive Project"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {project?.isArchived 
                    ? "Bring this project back to the active sidebar." 
                    : "Hide this project from the active workspace."}
                </p>
              </div>
            </div>
            <Button 
              variant={project?.isArchived ? "default" : "outline"} 
              size="sm"
              onClick={handleToggleArchive}
              disabled={updateProjectMutation.isPending}
            >
              {project?.isArchived ? "Unarchive" : "Archive"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this project and all of its data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-600 mb-4">
              Once you delete a project, there is no going back. Please be certain.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Project</DialogTitle>
                  <DialogDescription>
                    Are you absolutely sure you want to delete <span className="font-bold text-foreground">"{project?.name}"</span>? 
                    All tasks, comments, and attachments will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteProjectMutation.mutate()}
                    disabled={deleteProjectMutation.isPending}
                  >
                    {deleteProjectMutation.isPending ? "Deleting..." : "Permanently Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
