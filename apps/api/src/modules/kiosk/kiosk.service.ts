import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { generateZplBadge } from "./zpl-badge";

const execAsync = promisify(exec);

@Injectable()
export class KioskService {
  private readonly logger = new Logger(KioskService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Generate a ZPL badge for a checked-in visit and send it to CUPS.
   *
   * Fetches the visit with visitor data, validates it is checked in (status "active"),
   * generates ZPL via the template function, writes it to a temp file, and
   * sends it to the CUPS printer via the `lp` command.
   *
   * On success: temp file deleted, log printed.
   * On error: temp file deleted, error thrown with printer details.
   */
  async printBadge(visitId: string): Promise<void> {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { visitor: true },
    });

    if (!visit) {
      throw new NotFoundException("Visit not found");
    }

    if (visit.status !== "active") {
      throw new BadRequestException(
        `Visit cannot print badge — current status: ${visit.status}. Visitor must check in first.`,
      );
    }

    const printerIp = this.config.get<string>("PRINTER_IP", "");

    const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`;
    const hostName = (visit as any).hostName || "Hôte";

    const zpl = generateZplBadge({
      visitorName,
      hostName,
      date: new Date().toLocaleString("fr-FR"),
      qrContent: visit.id,
    });

    const tmpFile = path.join("/tmp", `badge-${Date.now()}.zpl`);
    await fs.writeFile(tmpFile, zpl, "utf-8");

    try {
      const { stderr } = await execAsync(
        `lp -d kiosk-printer -o raw "${tmpFile}"`,
        { timeout: 15000 },
      );

      if (stderr) {
        this.logger.warn(`lp stderr: ${stderr}`);
      }

      this.logger.log(`Badge printed: ${visitorName} (visit ${visitId})`);
    } catch (err: any) {
      this.logger.error(`Print failed: ${err.message}`);
      throw new Error(`Print failed: ${err.message}`);
    } finally {
      // Clean up temp file
      await fs.unlink(tmpFile).catch(() => {
        this.logger.warn(`Could not delete temp file: ${tmpFile}`);
      });
    }
  }

  /**
   * Search for scheduled visits by visitor name.
   *
   * Case-insensitive search on firstName or lastName using Postgres ILIKE.
   * Returns max 20 results ordered by createdAt desc.
   * Returns empty array if no matches (does NOT throw).
   */
  async searchVisits(name: string): Promise<any[]> {
    const visits = await this.prisma.visit.findMany({
      where: {
        visitor: {
          OR: [
            { firstName: { contains: name, mode: "insensitive" } },
            { lastName: { contains: name, mode: "insensitive" } },
          ],
        },
      },
      include: {
        visitor: true,
        host: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return visits.map((v) => ({
      ...v,
      hostName: v.host
        ? `${v.host.firstName} ${v.host.lastName}`
        : undefined,
    }));
  }
}
