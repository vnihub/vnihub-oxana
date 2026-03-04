import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId } = await params;

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        parentId: null, // Only fetch top-level tasks
      },
      include: {
        assignee: true,
        predecessors: true,
        successors: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("[TASKS_GET] Error:", error.message);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { title, description, status, priority, startDate, dueDate, assigneeId, parentId, sectionId } = body;

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    const { projectId } = await params;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId || null,
        parentId: parentId || null,
        sectionId: (sectionId === "uncategorized" || !sectionId) ? null : sectionId,
      },
    });

    // Trigger real-time update
    if (pusherServer) {
      await pusherServer.trigger(`project-${projectId}`, "task-created", task);
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASKS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}