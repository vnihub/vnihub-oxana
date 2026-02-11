"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Layout, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CreateProjectPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectLeaderId, setProjectLeaderId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ["templates", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects?isTemplate=true`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      toast.success("Template deleted");
      refetchTemplates();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, projectLeaderId }),
      });

      if (!res.ok) throw new Error("Failed to create project");

      const project = await res.json();
      toast.success("Project created!");
      router.push(`/workspaces/${workspaceId}/projects/${project.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFromTemplate = async (templateId: string, templateName: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects/${templateId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${templateName} (Copy)` }),
      });

      if (!res.ok) throw new Error("Failed to create project from template");

      const project = await res.json();
      toast.success("Project created from template!");
      router.push(`/workspaces/${workspaceId}/projects/${project.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-[600px] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Create a new project</h1>
          <p className="text-muted-foreground">Get your team started on something new.</p>
        </div>

        <Tabs defaultValue="scratch" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scratch" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Start from scratch
            </TabsTrigger>
            <TabsTrigger value="template" className="gap-2">
              <Layout className="h-4 w-4" />
              Use a template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scratch" className="mt-6">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Q1 Marketing Launch"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="What is this project about?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project Leader</Label>
                    <Select 
                      value={projectLeaderId} 
                      onValueChange={setProjectLeaderId}
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
                </CardContent>
                <CardFooter className="flex gap-2 pt-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Project"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="mt-6">
            <div className="grid grid-cols-1 gap-4 pt-2">
              {templates?.map((template: any) => (
                <div key={template.id} className="group relative">
                  <Card 
                    className="hover:border-primary transition-colors cursor-pointer group-hover:pr-12" 
                    onClick={() => !isLoading && handleCreateFromTemplate(template.id, template.name)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-xl border shadow-sm shrink-0",
                          template.color || "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {template.icon || "📁"}
                        </div>
                        <div className="overflow-hidden">
                          <CardTitle className="text-base group-hover:text-primary transition-colors truncate">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-1">{template.description || "Project Template"}</CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" disabled={isLoading}>
                        Use Template
                      </Button>
                    </CardHeader>
                  </Card>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all h-8 w-8 z-10"
                    disabled={isLoading || deleteTemplateMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this template?")) {
                        deleteTemplateMutation.mutate(template.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!templates || templates.length === 0) && (
                <Card className="p-12 text-center bg-slate-50 border-dashed">
                  <div className="space-y-4">
                    <Layout className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-medium text-lg">No templates available yet.</p>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Go to any project's settings and click "Save as Template" to see it here.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
