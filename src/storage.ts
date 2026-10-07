import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { config } from "./config.js";
import { contentTypeFor, sanitizeOriginalName } from "./security.js";

export interface StoredFile {
  id: string;
  storedName: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
  scan: {
    isInfected: boolean;
    viruses: string[];
    engine: string;
    message: string;
  };
  metadata: {
    removedKeys: string[];
    remainingKeys: string[];
    before: Record<string, string | number | boolean>;
    after: Record<string, string | number | boolean>;
  };
}

const catalogPath = () => path.join(config.uploadDir, "catalog.json");

export async function ensureStorageDirs(): Promise<void> {
  await fs.mkdir(config.uploadDir, { recursive: true });
  await fs.mkdir(config.tempDir, { recursive: true });
}

async function readCatalog(): Promise<StoredFile[]> {
  try {
    const raw = await fs.readFile(catalogPath(), "utf8");
    return JSON.parse(raw) as StoredFile[];
  } catch {
    return [];
  }
}

async function writeCatalog(entries: StoredFile[]): Promise<void> {
  await fs.writeFile(catalogPath(), JSON.stringify(entries, null, 2));
}

export async function persistUpload(input: {
  tempPath: string;
  originalName: string;
  mimeType: string;
  size: number;
  scan: StoredFile["scan"];
  metadata: StoredFile["metadata"];
}): Promise<StoredFile> {
  const id = nanoid(12);
  const originalName = sanitizeOriginalName(input.originalName);
  const ext = path.extname(originalName);
  const storedName = `${Date.now()}_${id}${ext}`;
  const dest = path.join(config.uploadDir, storedName);
  await fs.copyFile(input.tempPath, dest);

  const record: StoredFile = {
    id,
    storedName,
    originalName,
    size: input.size,
    mimeType: input.mimeType || contentTypeFor(originalName),
    createdAt: new Date().toISOString(),
    scan: input.scan,
    metadata: input.metadata,
  };

  const catalog = await readCatalog();
  catalog.unshift(record);
  await writeCatalog(catalog);
  return record;
}

export async function listUploads(): Promise<StoredFile[]> {
  return readCatalog();
}

export async function getUpload(id: string): Promise<StoredFile | undefined> {
  const catalog = await readCatalog();
  return catalog.find((entry) => entry.id === id);
}

export function absolutePathFor(entry: StoredFile): string {
  return path.join(config.uploadDir, entry.storedName);
}
