import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function env(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  port: Number(env("PORT", "43127")),
  rootDir,
  publicDir: path.join(rootDir, "public"),
  uploadDir: path.resolve(rootDir, env("UPLOAD_DIR", "./data/uploads")),
  tempDir: path.resolve(rootDir, env("TEMP_DIR", "./data/tmp")),
  maxFileSizeBytes: Number(env("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024,
  clamscanPath: env("CLAMSCAN_PATH", "/usr/bin/clamscan"),
  clamdscanPath: env("CLAMDSCAN_PATH", "/usr/bin/clamdscan"),
  clamdSocket: env("CLAMD_SOCKET", "/var/run/clamav/clamd.ctl"),
  exiftoolPath: env("EXIFTOOL_PATH", "exiftool"),
  requireClamav: env("REQUIRE_CLAMAV", "0") === "1",
};
