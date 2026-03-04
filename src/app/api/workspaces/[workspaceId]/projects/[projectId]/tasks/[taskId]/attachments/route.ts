import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { getUploadDir, getFullUploadPath, getFileUrl } from "@/lib/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { taskId } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 });
    }

    // Limit size to 10MB for general attachments
    if (file.size > 10 * 1024 * 1024) {
      return new NextResponse("File too large (max 10MB)", { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = file.name.split(".").pop();
    const fileName = `${taskId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    const uploadDir = path.join(getUploadDir(), "tasks");
    const uploadPath = getFullUploadPath(fileName, "tasks");

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    await writeFile(uploadPath, buffer);

    const attachmentUrl = getFileUrl(fileName, "tasks");
    const attachment = await prisma.attachment.create({
      data: {
        name: file.name,
        url: attachmentUrl,
        size: file.size,
        type: file.type,
        taskId: taskId,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: "ATTACHMENT_ADDED",
        description: `added attachment: ${file.name}`,
        taskId: taskId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error("[ATTACHMENT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
