import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { config } from "./config.js";
import { persistUpload, listUploads, getUpload, absolutePathFor } from "./storage.js";
import { scanFile } from "./clamav.js";
import { stripMetadata } from "./exiftool.js";
import { assertSafeUploadPath, unlinkQuiet, contentTypeFor, sanitizeOriginalName } from "./security.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.tempDir),
  filename: (_req, file, cb) => {
    const safe = sanitizeOriginalName(file.originalname);
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeBytes, files: 1 },
});

export function multerErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: `File exceeds the ${Math.round(config.maxFileSizeBytes / (1024 * 1024))} MB limit`,
      });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
}

export async function handleUpload(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Choose a file to upload" });
    return;
  }

  const filePath = assertSafeUploadPath(file.path);

  try {
    const scan = await scanFile(filePath);
    if (scan.isInfected) {
      await unlinkQuiet(filePath);
      res.status(400).json({
        error: "File contains a virus and was discarded",
        viruses: scan.viruses,
        scan,
      });
      return;
    }

    const { before, after, removedKeys } = await stripMetadata(filePath);
    const record = await persistUpload({
      tempPath: filePath,
      originalName: file.originalname,
      mimeType: file.mimetype || contentTypeFor(file.originalname),
      size: file.size,
      scan,
      metadata: {
        removedKeys,
        remainingKeys: Object.keys(after),
        before,
        after,
      },
    });

    res.status(201).json({
      message: "File uploaded after virus scan and metadata removal",
      file: record,
    });
  } finally {
    await unlinkQuiet(filePath);
  }
}

export async function handleList(_req: Request, res: Response): Promise<void> {
  const files = await listUploads();
  res.json({ files });
}

export async function handleGet(req: Request, res: Response): Promise<void> {
  const record = await getUpload(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Upload not found" });
    return;
  }
  res.json({ file: record });
}

export async function handleDownload(req: Request, res: Response): Promise<void> {
  const record = await getUpload(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Upload not found" });
    return;
  }
  const filePath = assertSafeUploadPath(absolutePathFor(record));
  res.download(filePath, record.originalName);
}
