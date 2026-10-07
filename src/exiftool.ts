import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";

const execFilePromise = promisify(execFile);

const SKIP_TAGS = new Set([
  "sourcefile",
  "exiftoolversion",
  "directory",
  "filename",
  "filesize",
  "filemodifydate",
  "fileaccessdate",
  "fileinodechangedate",
  "filepermissions",
  "filetype",
  "filetypeextension",
  "mimetype",
]);

export type MetadataMap = Record<string, string | number | boolean>;

function tagName(key: string): string {
  return (key.includes(":") ? key.slice(key.lastIndexOf(":") + 1) : key).toLowerCase();
}

function parseJsonOutput(stdout: string): MetadataMap {
  const trimmed = stdout.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed) as MetadataMap[];
  const raw = parsed[0] ?? {};
  const filtered: MetadataMap = {};
  for (const [key, value] of Object.entries(raw)) {
    const group = key.includes(":") ? key.slice(0, key.indexOf(":")).toLowerCase() : "";
    if (group === "exiftool" || SKIP_TAGS.has(tagName(key))) continue;
    if (value === undefined || value === null || value === "") continue;
    filtered[key] = value as string | number | boolean;
  }
  return filtered;
}

export async function readMetadata(filePath: string): Promise<MetadataMap> {
  const { stdout } = await execFilePromise(config.exiftoolPath, ["-json", "-G", filePath], {
    maxBuffer: 8 * 1024 * 1024,
  });
  return parseJsonOutput(stdout);
}

export async function stripMetadata(filePath: string): Promise<{
  before: MetadataMap;
  after: MetadataMap;
  removedKeys: string[];
}> {
  const before = await readMetadata(filePath);
  await execFilePromise(config.exiftoolPath, ["-all=", "-overwrite_original", filePath], {
    maxBuffer: 8 * 1024 * 1024,
  });
  const after = await readMetadata(filePath);
  const removedKeys = Object.keys(before).filter((key) => !(key in after));
  return { before, after, removedKeys };
}
