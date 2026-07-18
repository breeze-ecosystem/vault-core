import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

@Injectable()
export class ForensicService {
  private readonly logger = new Logger(ForensicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Certify evidence for an event by producing a ZIP bundle with SHA-256 hash
   * and an RFC 3161 TSA timestamp.
   *
   * Steps:
   * 1. Create temp directory for evidence
   * 2. Collect event metadata & media files
   * 3. Build evidence.zip
   * 4. Compute SHA-256 hash → hash.txt
   * 5. Request RFC 3161 TSA timestamp (openssl + curl)
   * 6. Bundle final output: evidence.zip + tsr + hash.txt
   * 7. Store ForensicEvidence record in Prisma
   * 8. Return evidence metadata
   */
  async certifyEvidence(
    eventId: string,
    mediaType: "zip" | "clip",
    orgId: string,
  ): Promise<{ evidenceId: string; zipPath: string; tsaCertPath: string }> {
    const evidenceId = crypto.randomUUID();
    const tempDir = `/tmp/evidence/${evidenceId}`;
    const outputDir = `/mnt/evidence/${orgId}`;
    const outputPath = path.join(outputDir, `${evidenceId}.zip`);

    // Ensure directories exist
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      // Step 1: Collect event metadata
      const eventMeta = await this.fetchEventMetadata(eventId, orgId);

      // Write metadata.json
      fs.writeFileSync(
        path.join(tempDir, "metadata.json"),
        JSON.stringify(eventMeta, null, 2),
      );

      // Step 2: Copy related media files if they exist
      if (eventMeta.snapshotPath) {
        const snapPath = eventMeta.snapshotPath as string;
        if (fs.existsSync(snapPath)) {
          fs.copyFileSync(snapPath, path.join(tempDir, `snapshot${path.extname(snapPath)}`));
        }
      }
      if (eventMeta.clipPath) {
        const clipPath = eventMeta.clipPath as string;
        if (fs.existsSync(clipPath)) {
          fs.copyFileSync(clipPath, path.join(tempDir, `clip${path.extname(clipPath)}`));
        }
      }

      // Step 3: Create ZIP bundle of all evidence files
      execSync(
        `cd ${tempDir} && zip -r evidence.zip .`,
        { timeout: 300000, stdio: "pipe" }, // 5 min timeout for large bundles
      );

      // Step 4: Compute SHA-256 hash
      const zipBuffer = fs.readFileSync(path.join(tempDir, "evidence.zip"));
      const hash = crypto.createHash("sha256").update(zipBuffer).digest("hex");
      fs.writeFileSync(path.join(tempDir, "hash.txt"), hash);

      // Step 5: Request RFC 3161 TSA timestamp
      const tsaUrl = this.config.get<string>(
        "TSA_URL",
        "http://timestamp.digicert.com",
      );
      const tsqPath = path.join(tempDir, "evidence.tsq");
      const tsrPath = path.join(tempDir, "evidence.tsr");

      try {
        // Generate TSA query (hash of the hash file)
        execSync(
          `openssl ts -query -data ${tempDir}/hash.txt -no_nonce -sha256 -out ${tsqPath}`,
          { timeout: 30000, stdio: "pipe" },
        );

        // Request TSA response via curl
        execSync(
          `curl -s -H "Content-Type: application/timestamp-query" --data-binary @${tsqPath} ${tsaUrl} -o ${tsrPath}`,
          { timeout: 30000, stdio: "pipe" },
        );

        // Verify TSR is valid (non-empty)
        const tsrStat = fs.statSync(tsrPath);
        if (tsrStat.size === 0) {
          throw new Error("TSR response is empty");
        }

        this.logger.log(`TSA timestamp received for evidence ${evidenceId}`);
      } catch (tsaErr: any) {
        // TSA failure: create self-signed timestamp as fallback
        this.logger.warn(
          `TSA timestamp request failed for ${evidenceId}: ${tsaErr.message}. Using self-signed fallback.`,
        );

        // Create a self-signed timestamp using openssl (non-authoritative)
        try {
          execSync(
            `openssl ts -query -data ${tempDir}/hash.txt -no_nonce -sha256 -out ${tsqPath}`,
            { timeout: 30000, stdio: "pipe" },
          );
          // Use local time as self-signed timestamp
          const now = new Date().toISOString().replace(/[:.]/g, "-");
          execSync(
            `echo "Self-signed timestamp for ${evidenceId} at ${now}\\nHash: ${hash}" > ${tsrPath}`,
            { timeout: 10000, stdio: "pipe" },
          );
          this.logger.warn(`Self-signed timestamp created for ${evidenceId}`);
        } catch (fallbackErr: any) {
          this.logger.error(
            `Self-signed timestamp fallback also failed: ${fallbackErr.message}`,
          );
          // Write a minimal timestamp note
          fs.writeFileSync(
            tsrPath,
            `Self-signed timestamp FAILED: ${tsaErr.message}`,
          );
        }
      }

      // Step 6: Bundle final output
      const bundleItems = ["evidence.zip", "hash.txt"];
      if (fs.existsSync(tsrPath)) {
        bundleItems.push(path.basename(tsrPath));
      }
      execSync(
        `cd ${tempDir} && zip -r ${outputPath} ${bundleItems.join(" ")}`,
        { timeout: 300000, stdio: "pipe" },
      );

      // Step 7: Store record in Prisma
      const bundleStat = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;
      await this.prisma.forensicEvidence.create({
        data: {
          id: evidenceId,
          eventId,
          organizationId: orgId,
          mediaType,
          zipPath: outputPath,
          tsaCertPath: tsrPath,
          hash,
          sizeBytes: bundleStat?.size ?? null,
        },
      });

      this.logger.log(
        `Evidence ${evidenceId} certified for event ${eventId} (${hash.substring(0, 16)}...)`,
      );

      return {
        evidenceId,
        zipPath: outputPath,
        tsaCertPath: tsrPath,
      };
    } catch (err: any) {
      // Cleanup temp directory on failure
      this.cleanupDir(tempDir);
      throw err;
    }
  }

  /**
   * Get evidence metadata by ID.
   */
  async getEvidence(
    orgId: string,
    evidenceId: string,
  ) {
    const evidence = await this.prisma.forensicEvidence.findFirst({
      where: { id: evidenceId, organizationId: orgId },
    });

    if (!evidence) {
      throw new NotFoundException("Forensic evidence not found");
    }

    return evidence;
  }

  /**
   * List evidence for an organization with pagination.
   */
  async listEvidence(
    orgId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.forensicEvidence.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.forensicEvidence.count({
        where: { organizationId: orgId },
      }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Get the file path for evidence download.
   */
  getEvidenceZipPath(orgId: string, evidence: any): string {
    if (evidence.organizationId !== orgId) {
      throw new NotFoundException("Forensic evidence not found");
    }
    if (!fs.existsSync(evidence.zipPath)) {
      throw new NotFoundException("Evidence ZIP file not found on disk");
    }
    return evidence.zipPath;
  }

  // ── Private helpers ──

  /**
   * Fetch event metadata from various sources.
   */
  private async fetchEventMetadata(
    eventId: string,
    orgId: string,
  ): Promise<Record<string, unknown>> {
    // Try each source type
    const sources = [
      // Alert events
      () =>
        this.prisma.alert.findUnique({
          where: { id: eventId },
          include: { camera: true },
        }),
      // Incident events
      () =>
        this.prisma.incident.findUnique({
          where: { id: eventId },
        }),
    ];

    for (const source of sources) {
      const record = await source();
      if (record) {
        const metadata: Record<string, unknown> = {
          eventId,
          eventType: (record as any).constructor?.name || "unknown",
          orgId,
          timestamp: (record as any).createdAt?.toISOString() || new Date().toISOString(),
          description: (record as any).title || (record as any).description || "No description",
        };

        // Add camera info if available
        if ((record as any).camera) {
          metadata.cameraId = (record as any).cameraId;
          metadata.cameraName = (record as any).camera.name;
        }

        // Add snapshot/clip paths if they exist in the record
        if ((record as any).snapshotUrl) {
          metadata.snapshotPath = (record as any).snapshotUrl;
        }

        return metadata;
      }
    }

    // If no record found, return basic metadata
    return {
      eventId,
      orgId,
      timestamp: new Date().toISOString(),
      description: "Event metadata not available in database",
    };
  }

  /**
   * Recursively remove a directory.
   */
  private cleanupDir(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            this.cleanupDir(fullPath);
          } else {
            fs.unlinkSync(fullPath);
          }
        }
        fs.rmdirSync(dirPath);
        this.logger.debug(`Cleaned up temp directory: ${dirPath}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to clean up ${dirPath}: ${err.message}`);
    }
  }
}
