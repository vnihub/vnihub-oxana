import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getFullUploadPath } from "@/lib/storage";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    
    // Construct the file path from segments
    const subDir = pathSegments.length > 1 ? pathSegments.slice(0, -1).join(path.sep) : "";
    const fileName = pathSegments[pathSegments.length - 1];
    
    const filePath = getFullUploadPath(fileName, subDir);

    try {
      const file = await readFile(filePath);
      
      // Basic content type detection
      const ext = path.extname(fileName).toLowerCase();
      let contentType = "application/octet-stream";
      
      const mimeTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

      if (mimeTypes[ext]) {
        contentType = mimeTypes[ext];
      }

      return new NextResponse(file, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (e) {
      console.error("[FILE_SERVE_READ_ERROR]", e);
      return new NextResponse("File not found", { status: 404 });
    }
  } catch (error) {
    console.error("[FILE_SERVE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
