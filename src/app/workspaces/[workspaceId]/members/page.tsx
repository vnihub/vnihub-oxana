"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { use, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link as LinkIcon, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MembersPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default function MembersPage({ params }: MembersPageProps) {
  const { workspaceId } = use(params);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: workspace, isLoading: isWorkspaceLoading, error: workspaceError } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      console.log("Fetching workspace data for:", workspaceId);
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      if (!res.ok) {
        const text = await res.text();
        console.error("Workspace fetch failed:", res.status, text);
        throw new Error(text || "Failed to fetch workspace");
      }
      const data = await res.json();
      console.log("Workspace data received:", data);
      return data;
    },
  });

  const { data: members, isLoading: isMembersLoading, error: membersError } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      console.log("Fetching members for:", workspaceId);
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) {
        const text = await res.text();
        console.error("Members fetch failed:", res.status, text);
        throw new Error(text || "Failed to fetch members");
      }
      const data = await res.json();
      console.log("Members data received:", data);
      return data;
    },
  });

  const copyInviteLink = async () => {
    if (!workspace?.inviteCode) {
      console.error("Copy attempt failed - workspace or inviteCode missing. Workspace:", workspace);
      toast.error("Invite code not ready yet. Please wait for the page to finish loading.");
      return;
    }
    
    const inviteLink = `${window.location.origin}/join/${workspace.inviteCode}`;
    console.log("Attempting to copy link:", inviteLink);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = inviteLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast.error("Failed to copy link to clipboard.");
    }
  };

  if (isWorkspaceLoading || isMembersLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-muted-foreground">
        Loading workspace members...
      </div>
    );
  }

  if (workspaceError || membersError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading workspace details. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Members</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite Teammates</CardTitle>
          <CardDescription>
            Share this link with your team to grant them access to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-lg">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <code className="text-sm flex-1 truncate font-mono">
              {mounted && workspace?.inviteCode 
                ? `${window.location.origin}/join/${workspace.inviteCode}` 
                : "Loading..."}
            </code>
            <Button size="sm" variant="outline" onClick={copyInviteLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-2">Copy Link</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Members</CardTitle>
          <CardDescription>
            A list of everyone who has access to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMembersLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    Loading members...
                  </TableCell>
                </TableRow>
              ) : members?.map((membership: any) => (
                <TableRow key={membership.user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={membership.user.image} />
                        <AvatarFallback>{membership.user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{membership.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {membership.user.email}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize px-2 py-1 bg-slate-100 rounded-md text-xs font-medium">
                      {membership.role.toLowerCase()}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
