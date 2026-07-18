import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const CACHE_DIR = "/tmp/blur-cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class PseudonymizationService {
  private readonly logger = new Logger(PseudonymizationService.name);

  constructor(private readonly prisma: PrismaService) {
    // Ensure cache directory exists on startup
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  /**
   * Blur a snapshot image using sharp's Gaussian blur (sigma=15).
   * Results are cached in /tmp/blur-cache with a 5-minute TTL.
   */
  async blurSnapshot(filename: string, snapshotDir: string): Promise<Buffer> {
    const filePath = path.join(snapshotDir, filename);
    const cacheKey = crypto.createHash("md5").update(filePath).digest("hex");
    const cachePath = path.join(CACHE_DIR, cacheKey);

    // Check cache
    try {
      const stat = fs.statSync(cachePath);
      const age = Date.now() - stat.mtimeMs;
      if (age < CACHE_TTL_MS) {
        return fs.readFileSync(cachePath);
      }
    } catch {
      // Cache miss or not accessible — proceed to generate
    }

    // Read original image
    let imageBuffer: Buffer;
    try {
      imageBuffer = fs.readFileSync(filePath);
    } catch (err) {
      this.logger.error(`Failed to read snapshot: ${filePath}`, err as Error);
      throw err;
    }

    // Dynamically import sharp (ESM-only package in CJS context)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require("sharp");

    // Apply strong Gaussian blur (sigma=15 per D-06 Pattern 4)
    const blurredBuffer = await sharp(imageBuffer).blur(15).toBuffer();

    // Write to cache
    try {
      fs.writeFileSync(cachePath, blurredBuffer);
    } catch (err) {
      this.logger.warn(`Failed to write blur cache: ${cachePath}`, err as Error);
    }

    return blurredBuffer;
  }

  /**
   * Check if pseudonymization (face blurring) is enabled for an organization.
   */
  async isPseudonymizationEnabled(orgId: string): Promise<boolean> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { pseudonymizationEnabled: true },
      });
      return org?.pseudonymizationEnabled ?? false;
    } catch (err) {
      this.logger.error(`Failed to check pseudonymization for org ${orgId}`, err as Error);
      return false;
    }
  }
}
