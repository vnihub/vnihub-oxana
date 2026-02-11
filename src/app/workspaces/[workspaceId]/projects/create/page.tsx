"use client";

import { use } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, projectLeaderId }),
      });

      if (!res.ok) {
        throw new Error("Failed to create project");
      }

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

  return (
    <div className="p-6 flex items-center justify-center">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
          <CardDescription>
            Projects help you organize tasks.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="Product Roadmap"
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
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.image} />
                          <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
