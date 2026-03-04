import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Plus } from "lucide-react";
import { JoinWorkspaceForm } from "@/components/auth/JoinWorkspaceForm";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  if (workspace) {
    redirect(`/workspaces/${workspace.id}`);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Welcome to Oxana</CardTitle>
          <CardDescription>
            You are not part of any workspace yet. Get started by creating one or joining a team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Workspaces are where you and your team can collaborate on projects and tasks.
          </p>
          
          <Button asChild className="w-full">
            <Link href="/workspaces/create">
              <Plus className="mr-2 h-4 w-4" />
              Create your first workspace
            </Link>
          </Button>

          <JoinWorkspaceForm />
        </CardContent>
      </Card>
    </div>
  );
}
