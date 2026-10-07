export interface ScanResult {
  isInfected: boolean;
  viruses: string[];
  engine: "clamdscan" | "clamscan" | "unavailable";
  message: string;
}

type NodeClamInstance = {
  scanFile: (filePath: string) => Promise<{
    isInfected: boolean;
    viruses: string[];
  }>;
};

let scannerPromise: Promise<NodeClamInstance | null> | null = null;

async function initScanner(): Promise<NodeClamInstance | null> {
  const { config } = await import("./config.js");
  const fs = await import("node:fs");
  const NodeClam = (await import("clamscan")).default;

  const socketExists = fs.existsSync(config.clamdSocket);
  try {
    const instance = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanRecursively: false,
      debugMode: false,
      clamscan: {
        path: config.clamscanPath,
        scanArchives: true,
        active: true,
      },
      clamdscan: {
        socket: socketExists ? config.clamdSocket : false,
        path: config.clamdscanPath,
        localFallback: true,
        active: socketExists,
      },
      preference: socketExists ? "clamdscan" : "clamscan",
    });
    return instance as NodeClamInstance;
  } catch (error) {
    console.error("ClamAV initialization failed:", error);
    return null;
  }
}

export function getScanner(): Promise<NodeClamInstance | null> {
  if (!scannerPromise) {
    scannerPromise = initScanner();
  }
  return scannerPromise;
}

export async function scanFile(filePath: string): Promise<ScanResult> {
  const { config } = await import("./config.js");
  const scanner = await getScanner();

  if (!scanner) {
    if (config.requireClamav) {
      throw Object.assign(new Error("Virus scanner is unavailable"), { status: 503 });
    }
    return {
      isInfected: false,
      viruses: [],
      engine: "unavailable",
      message: "ClamAV is not running. Upload was stored without a virus scan.",
    };
  }

  const result = await scanner.scanFile(filePath);
  const viruses = result.viruses ?? [];
  const isInfected = Boolean(result.isInfected);
  const fs = await import("node:fs");
  const engine = fs.existsSync(config.clamdSocket) ? "clamdscan" : "clamscan";

  return {
    isInfected,
    viruses,
    engine,
    message: isInfected
      ? `Infected: ${viruses.join(", ") || "unknown signature"}`
      : "No threats found",
  };
}

export async function scannerStatus(): Promise<{
  ready: boolean;
  engine: ScanResult["engine"];
  socket: boolean;
}> {
  const { config } = await import("./config.js");
  const fs = await import("node:fs");
  const scanner = await getScanner();
  const socket = fs.existsSync(config.clamdSocket);
  if (!scanner) {
    return { ready: false, engine: "unavailable", socket };
  }
  return { ready: true, engine: socket ? "clamdscan" : "clamscan", socket };
}
