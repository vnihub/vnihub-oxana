"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertTriangle, 
  Archive, 
  Trash2, 
  Users, 
  Settings as SettingsIcon, 
  Link as LinkIcon,
  RefreshCcw,
  Shield,
  UserX
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export default function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [workspaceNameConfirm, setWorkspaceNameConfirm] = useState("");

  const { data: workspace, isLoading: isWorkspaceLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return res.json();
    },
  });

  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: archivedProjects } = useQuery({
    queryKey: ["projects-archived", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`);
      const allProjects = await res.json();
      return allProjects.filter((p: any) => p.isArchived);
    },
  });

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
    }
  }, [workspace]);

  const updateWorkspaceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update workspace");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Workspace updated!");
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      router.refresh();
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete workspace");
    },
    onSuccess: () => {
      toast.success("Workspace deleted");
      router.push("/dashboard");
      router.refresh();
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Member role updated");
      queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to remove member");
      }
    },
    onSuccess: () => {
      toast.success("Member removed from workspace");
      queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  if (isWorkspaceLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Workspace Settings...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-muted-foreground">Manage your workspace, members, and projects.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
          <TabsTrigger 
            value="general" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
          >
            General
          </TabsTrigger>
          <TabsTrigger 
            value="members" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
          >
            Members
          </TabsTrigger>
          <TabsTrigger 
            value="archive" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
          >
            Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Name</CardTitle>
              <CardDescription>This is your team's visible name across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-sm"
                />
                <Button 
                  onClick={() => updateWorkspaceMutation.mutate({ name })}
                  disabled={updateWorkspaceMutation.isPending || name === workspace?.name}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invite Code</CardTitle>
              <CardDescription>Anyone with this link can join your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-lg max-w-2xl">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <code className="text-sm flex-1 truncate font-mono">
                  {typeof window !== "undefined" ? `${window.location.origin}/join/${workspace?.inviteCode}` : "Loading..."}
                </code>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/join/${workspace?.inviteCode}`);
                    toast.success("Link copied!");
                  }}
                >
                  Copy Link
                </Button>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  if(confirm("Are you sure? Old invite links will stop working immediately.")) {
                    updateWorkspaceMutation.mutate({ resetInviteCode: true });
                  }
                }}
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Reset Invite Link
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50 bg-red-50/10">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Permanently delete this workspace and all its associated data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete Workspace</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action will delete the <span className="font-bold text-foreground">"{workspace?.name}"</span> workspace, 
                      all of its projects, tasks, members, and data. This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-2">
                    <Label>Type the workspace name to confirm:</Label>
                    <Input 
                      placeholder={workspace?.name} 
                      value={workspaceNameConfirm} 
                      onChange={(e) => setWorkspaceNameConfirm(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" onClick={() => setWorkspaceNameConfirm("")}>Cancel</Button>
                    </DialogClose>
                    <Button 
                      variant="destructive" 
                      disabled={workspaceNameConfirm !== workspace?.name || deleteWorkspaceMutation.isPending}
                      onClick={() => deleteWorkspaceMutation.mutate()}
                    >
                      {deleteWorkspaceMutation.isPending ? "Deleting..." : "Permanently Delete Workspace"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access and what they can do.</CardDescription>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                <Users className="h-3.5 w-3.5" />
                {members?.length} Members
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMembersLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : members?.map((membership: any) => (
                    <TableRow key={membership.user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={membership.user.image} />
                            <AvatarFallback>{membership.user.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{membership.user.name}</span>
                            <span className="text-xs text-muted-foreground">{membership.user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={membership.role} 
                          disabled={membership.role === "OWNER" || updateMemberRoleMutation.isPending}
                          onValueChange={(role) => updateMemberRoleMutation.mutate({ userId: membership.user.id, role })}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {membership.role !== "OWNER" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if(confirm(`Remove ${membership.user.name} from workspace?`)) {
                                removeMemberMutation.mutate(membership.user.id);
                              }
                            }}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        {membership.role === "OWNER" && (
                          <div className="flex justify-end pr-2" title="Workspace Owner">
                            <Shield className="h-4 w-4 text-amber-500" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archive" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Archived Projects</CardTitle>
              <CardDescription>Projects here are hidden from the active sidebar.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedProjects?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
                        No archived projects found.
                      </TableCell>
                    </TableRow>
                  )}
                  {archivedProjects?.map((project: any) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", project.color || "bg-slate-400")} />
                          {project.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs line-clamp-1 truncate max-w-md">
                        {project.description || "No description"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/workspaces/${workspaceId}/projects/${project.id}/settings`)}
                          >
                            Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}