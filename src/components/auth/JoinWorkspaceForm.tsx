"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

export function JoinWorkspaceForm() {
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/join/${inviteCode.trim()}`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Invalid invite code");
      }

      const data = await res.json();
      toast.success("Joined workspace successfully!");
      router.push(`/workspaces/${data.workspaceId}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-dashed mt-4">
      <div className="text-sm font-medium text-center">
        Joining an existing team?
      </div>
      <form onSubmit={handleJoin} className="flex gap-2">
        <Input
          placeholder="Enter invite code..."
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          type="submit" 
          variant="secondary" 
          disabled={isLoading || !inviteCode.trim()}
          className="shrink-0"
        >
          {isLoading ? "Joining..." : (
            <>
              <LogIn className="h-4 w-4 mr-2" />
              Join
            </>
          )}
        </Button>
      </form>
      <p className="text-[10px] text-center text-muted-foreground italic">
        The code is the last part of the invite link provided by your manager.
      </p>
    </div>
  );
}
