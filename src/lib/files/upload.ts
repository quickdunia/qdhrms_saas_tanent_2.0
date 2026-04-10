import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getAllowedUploadMimeTypes, getServerEnv } from "@/lib/env";

type UploadResult = {
  filePath: string;
  fileUrl: string;
  mimeType: string;
  originalName: string;
  size: number;
};

type UploadKind = "image" | "document" | "mixed";

const SAFE_EXTENSION_MAP: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-");
}

export async function saveUploadedFile(
  file: File,
  segments: string[],
  options?: {
    kind?: UploadKind;
    maxSizeMb?: number;
    allowedMimeTypes?: string[];
  },
): Promise<UploadResult | null> {
  if (!file || file.size === 0) {
    return null;
  }

  const env = getServerEnv();
  const kind = options?.kind ?? "mixed";
  const allowedMimeTypes = options?.allowedMimeTypes ?? getAllowedUploadMimeTypes(kind);
  const maxSizeMb = options?.maxSizeMb ?? env.MAX_UPLOAD_SIZE_MB;

  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Upload exceeds the ${maxSizeMb} MB limit.`);
  }

  if (allowedMimeTypes.length > 0 && file.type && !allowedMimeTypes.includes(file.type)) {
    throw new Error("That file type is not permitted.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension =
    SAFE_EXTENSION_MAP[file.type] ??
    (path.extname(file.name)?.toLowerCase() || ".bin");
  const bucket = kind === "image" ? "images" : kind === "document" ? "documents" : "mixed";
  const safeSegments = segments.map(sanitizeSegment);
  const fileName = `${crypto.randomUUID()}${extension}`;
  const relativeDir = path.join("uploads", bucket, ...safeSegments);
  const targetDir = path.join(process.cwd(), "public", relativeDir);
  const absolutePath = path.join(targetDir, fileName);

  await mkdir(targetDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    filePath: absolutePath,
    fileUrl: `/${path.posix.join(relativeDir.replaceAll("\\", "/"), fileName)}`,
    mimeType: file.type || "application/octet-stream",
    originalName: file.name,
    size: file.size,
  };
}
