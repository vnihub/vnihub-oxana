import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, description, projectLeaderId } = await req.json();

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const { workspaceId } = await params;

    // Verify membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        workspaceId,
        projectLeaderId,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("[PROJECTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
