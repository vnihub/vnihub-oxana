import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getUploadDir, getFullUploadPath, getFileUrl } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 });
    }

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return new NextResponse("File too large (max 2MB)", { status: 400 });
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return new NextResponse("Invalid file type", { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${session.user.id}-${Date.now()}.${fileExtension}`;
    
    const uploadDir = getUploadDir();
    const uploadPath = getFullUploadPath(fileName);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Save to filesystem
    await writeFile(uploadPath, buffer);

    // Update user profile with the new image URL
    const imageUrl = getFileUrl(fileName);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    });

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("[AVATAR_UPLOAD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
