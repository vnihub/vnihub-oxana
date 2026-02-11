import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { format } from "date-fns";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { taskId } = await params;
    console.log(`[API] Fetching task details for taskId: ${taskId}`);

    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        attachments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        subtasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!task) {
      console.log(`[API] Task not found: ${taskId}`);
      return new NextResponse("Task not found", { status: 404 });
    }

    console.log(`[API] Successfully fetched task: ${task.title}`);
    return NextResponse.json(task);
  } catch (error: any) {
    console.error("[TASK_GET] Error details:", error.message, error.stack);
    return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { taskId, projectId } = await params;
    const body = await req.json();
    const { status, priority, title, description, assigneeId, startDate, dueDate, predecessorIds } = body;

    // Fetch the current task state to compare changes
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, predecessors: true }
    });

    if (!currentTask) {
      return new NextResponse("Task not found", { status: 404 });
    }

    const task = await prisma.task.update({
      where: {
        id: taskId,
        projectId: projectId,
      },
      data: {
        status,
        priority,
        title,
        description,
        assigneeId,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        predecessors: predecessorIds ? {
          set: predecessorIds.map((id: string) => ({ id }))
        } : undefined,
      },
    });

    // Generate activity logs for changes
    const activities = [];
    if (status && status !== currentTask.status) {
      activities.push({
        type: "STATUS_CHANGED",
        description: `changed status from ${currentTask.status} to ${status}`,
        taskId,
        userId: session.user.id,
      });
    }
    // ... (rest of activities)
    if (predecessorIds) {
      activities.push({
        type: "DEPENDENCIES_CHANGED",
        description: "updated task dependencies",
        taskId,
        userId: session.user.id,
      });
    }
    if (priority && priority !== currentTask.priority) {
      activities.push({
        type: "PRIORITY_CHANGED",
        description: `changed priority from ${currentTask.priority} to ${priority}`,
        taskId,
        userId: session.user.id,
      });
    }
    if (title && title !== currentTask.title) {
      activities.push({
        type: "TITLE_CHANGED",
        description: `renamed task to "${title}"`,
        taskId,
        userId: session.user.id,
      });
    }
    if (startDate && new Date(startDate).getTime() !== currentTask.startDate?.getTime()) {
      activities.push({
        type: "START_DATE_CHANGED",
        description: `changed start date to ${format(new Date(startDate), "PPP")}`,
        taskId,
        userId: session.user.id,
      });
    }
    if (dueDate && new Date(dueDate).getTime() !== currentTask.dueDate?.getTime()) {
      activities.push({
        type: "DUE_DATE_CHANGED",
        description: `changed due date to ${format(new Date(dueDate), "PPP")}`,
        taskId,
        userId: session.user.id,
      });
    }
    if (assigneeId !== undefined && assigneeId !== currentTask.assigneeId) {
      const newAssignee = assigneeId 
        ? await prisma.user.findUnique({ where: { id: assigneeId } }) 
        : null;
      activities.push({
        type: "ASSIGNEE_CHANGED",
        description: newAssignee 
          ? `assigned task to ${newAssignee.name}` 
          : "unassigned the task",
        taskId,
        userId: session.user.id,
      });
    }

    if (activities.length > 0) {
      await prisma.activity.createMany({
        data: activities,
      });
    }

    // Trigger real-time update
    if (pusherServer) {
      await pusherServer.trigger(`project-${projectId}`, "task-updated", task);
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASK_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
