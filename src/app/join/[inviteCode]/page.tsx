"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface JoinPageProps {
  params: Promise<{ inviteCode: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
  const { inviteCode } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const joinWorkspace = async () => {
      try {
        const res = await fetch(`/api/join/${inviteCode}`, {
          method: "POST",
        });

        if (res.status === 401) {
          // If user is not logged in, redirect to register but come back here after
          router.push(`/register?callbackUrl=/join/${inviteCode}`);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to join workspace. The link might be invalid.");
        }

        const data = await res.json();
        toast.success("Joined workspace successfully!");
        router.push(`/workspaces/${data.workspaceId}`);
      } catch (error: any) {
        toast.error(error.message);
        setStatus("error");
      }
    };

    joinWorkspace();
  }, [inviteCode, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">
            {status === "loading" ? "Joining Workspace..." : "Invalid Invite Link"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          {status === "loading" ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              This invite link is invalid or has expired. Please ask your administrator for a new link.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
