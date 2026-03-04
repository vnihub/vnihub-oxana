import path from "path";

/**
 * Gets the base directory for uploads on the filesystem.
 */
export function getUploadDir() {
  // If we have a custom STORAGE_PATH env var, use it. Otherwise fall back to public/uploads
  if (process.env.STORAGE_PATH) {
    return path.join(process.env.STORAGE_PATH, "uploads");
  }
  return path.join(process.cwd(), "public", "uploads");
}

/**
 * Gets the full path for a file on the filesystem.
 */
export function getFullUploadPath(fileName: string, subDir: string = "") {
  return path.join(getUploadDir(), subDir, fileName);
}

/**
 * Gets the URL for a file.
 */
export function getFileUrl(fileName: string, subDir: string = "") {
  const prefix = subDir ? `/uploads/${subDir}` : "/uploads";
  return `${prefix}/${fileName}`;
}
