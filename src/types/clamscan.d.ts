declare module "clamscan" {
  interface ClamScanOptions {
    removeInfected?: boolean;
    quarantineInfected?: boolean | string;
    scanRecursively?: boolean;
    debugMode?: boolean;
    preference?: "clamscan" | "clamdscan";
    clamscan?: {
      path?: string;
      scanArchives?: boolean;
      active?: boolean;
    };
    clamdscan?: {
      socket?: string | false;
      host?: string | false;
      port?: number | false;
      timeout?: number;
      localFallback?: boolean;
      path?: string;
      active?: boolean;
    };
  }

  interface ScanFileResult {
    isInfected: boolean;
    viruses: string[];
    file?: string;
  }

  class NodeClam {
    init(options?: ClamScanOptions): Promise<NodeClam>;
    scanFile(filePath: string): Promise<ScanFileResult>;
  }

  export default NodeClam;
}
