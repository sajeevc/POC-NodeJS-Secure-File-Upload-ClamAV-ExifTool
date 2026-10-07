import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { ensureStorageDirs } from "./storage.js";
import { scannerStatus } from "./clamav.js";
import {
  upload,
  handleUpload,
  handleList,
  handleGet,
  handleDownload,
  multerErrorHandler,
} from "./uploads.js";

await ensureStorageDirs();

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.use(express.static(config.publicDir));

app.get("/api/health", async (_req, res) => {
  const clamav = await scannerStatus();
  res.json({
    ok: true,
    clamav,
    limits: { maxFileSizeBytes: config.maxFileSizeBytes },
  });
});

app.post("/api/uploads", upload.single("file"), (req, res, next) => {
  handleUpload(req, res).catch(next);
});
app.get("/api/uploads", (req, res, next) => {
  handleList(req, res).catch(next);
});
app.get("/api/uploads/:id", (req, res, next) => {
  handleGet(req, res).catch(next);
});
app.get("/api/uploads/:id/download", (req, res, next) => {
  handleDownload(req, res).catch(next);
});

app.use(multerErrorHandler);
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 500;
  const message = err instanceof Error ? err.message : "Unexpected error";
  console.error(err);
  res.status(Number.isFinite(status) && status >= 400 ? status : 500).json({ error: message });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Secure uploads listening on http://127.0.0.1:${config.port}`);
});
