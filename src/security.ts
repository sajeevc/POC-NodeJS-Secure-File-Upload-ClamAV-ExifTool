import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

const mimeByExt: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".zip": "application/zip",
};

export function isPathInsideRoot(candidate: string, root: string): boolean {
  const resolved = path.resolve(candidate);
  const base = path.resolve(root);
  const relative = path.relative(base, resolved);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSafeUploadPath(filePath: string): string {
  const resolved = path.resolve(filePath);
  const allowedRoots = [config.tempDir, config.uploadDir, config.rootDir];
  if (!allowedRoots.some((root) => isPathInsideRoot(resolved, root))) {
    throw Object.assign(new Error("Invalid file path"), { status: 400 });
  }
  return resolved;
}

export function sanitizeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[\u0000-\u001f\\/]/g, "_").trim();
  if (!base || base === "." || base === "..") {
    return "upload.bin";
  }
  return base.slice(0, 180);
}

export function contentTypeFor(filename: string, fallback = "application/octet-stream"): string {
  return mimeByExt[path.extname(filename).toLowerCase()] ?? fallback;
}

export async function unlinkQuiet(filePath: string | undefined): Promise<void> {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    /* already gone */
  }
}
