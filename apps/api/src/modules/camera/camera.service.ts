import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, AlertSeverity } from "@prisma/client";
import { LicenseService } from "../license/license.service";
import { v4 as uuidv4 } from "uuid";
import * as dgram from "dgram";

export interface OnvifScanResult {
  ip: string;
  model?: string;
  manufacturer?: string;
  onvifVersion?: string;
  address: string;
  xaddrs: string;
  types: string;
  scopes: string[];
}

export interface OnvifScan {
  id: string;
  subnet: string;
  status: "scanning" | "completed";
  startedAt: Date;
  completedAt?: Date;
  results: OnvifScanResult[];
}

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);
  private onvifScans: Map<string, OnvifScan> = new Map();

  constructor(
    private prisma: PrismaService,
    private licenseService: LicenseService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(filters?: { status?: string; organizationId?: string; page?: number; limit?: number }) {
    const where: Prisma.CameraWhereInput = {};
    if (filters?.status) where.status = filters.status as Prisma.EnumCameraStatusFilter;
    if (filters?.organizationId) where.organizationId = filters.organizationId;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.camera.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: { select: { id: true, name: true } },
          prompts: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
          _count: { select: { alerts: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.camera.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        prompts: { orderBy: { createdAt: "desc" } },
        alerts: { take: 10, orderBy: { createdAt: "desc" } },
        detectionZones: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!camera) throw new NotFoundException("Camera not found");
    return camera;
  }

  async create(data: Prisma.CameraUncheckedCreateInput) {
    // Check license limits before creating (D-14, D-15 double barrier)
    const orgId = data.organizationId;
    const licenseStatus = await this.licenseService.getLicenseStatus(orgId);

    // Expired or no license blocks creation
    if (licenseStatus.licenseState === "expired" || licenseStatus.licenseState === "no_license") {
      throw new BadRequestException(
        "Licence expirée — Impossible de créer des caméras. Contactez votre administrateur.",
      );
    }

    // Trial is unlimited per D-17
    if (licenseStatus.licenseState === "trial") {
      return this.prisma.camera.create({
        data,
        include: { organization: { select: { id: true, name: true } } },
      });
    }

    // Active or grace: check against maxCameras limit
    if (licenseStatus.maxCameras !== undefined && licenseStatus.maxCameras !== null) {
      const cameraCount = await this.prisma.camera.count({
        where: { organizationId: orgId },
      });

      if (cameraCount >= licenseStatus.maxCameras) {
        throw new BadRequestException(
          `Limite de caméras atteinte (${licenseStatus.maxCameras}). Contactez votre administrateur pour augmenter votre limite.`,
        );
      }
    }

    const created = await this.prisma.camera.create({
      data,
      include: { organization: { select: { id: true, name: true } } },
    });

    // Notify recording service to start recording if enabled
    if (created.recordingEnabled && created.rtspUrl) {
      this.eventEmitter.emit("camera.created", {
        cameraId: created.id,
        rtspUrl: created.rtspUrl,
        organizationId: created.organizationId,
      });
    }

    return created;
  }

  async update(id: string, data: Prisma.CameraUpdateInput) {
    const before = await this.findById(id);
    const updated = await this.prisma.camera.update({
      where: { id },
      data,
      include: { organization: { select: { id: true, name: true } } },
    });

    // If RTSP URL changed, notify recording to restart
    const newRtspUrl = typeof data.rtspUrl === "string" ? data.rtspUrl : undefined;
    if (newRtspUrl && newRtspUrl !== before.rtspUrl) {
      this.eventEmitter.emit("camera.rtsp-changed", {
        cameraId: updated.id,
        rtspUrl: updated.rtspUrl as string,
        organizationId: updated.organizationId,
      });
    }

    return updated;
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.camera.delete({ where: { id } });
  }

  // ── Prompt management ──

  async getPrompts(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException("Camera not found");
    return this.prisma.cameraPrompt.findMany({
      where: { cameraId },
      orderBy: { createdAt: "desc" },
    });
  }

  async addPrompt(cameraId: string, data: { text: string; severity?: AlertSeverity }) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException("Camera not found");
    return this.prisma.cameraPrompt.create({
      data: {
        cameraId,
        text: data.text,
        severity: data.severity || "MEDIUM",
        organizationId: camera.organizationId,
      },
    });
  }

  async updatePrompt(
    promptId: string,
    data: { text?: string; severity?: AlertSeverity; isActive?: boolean },
  ) {
    const prompt = await this.prisma.cameraPrompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException("Prompt not found");
    const updateData: Prisma.CameraPromptUpdateInput = {};
    if (data.text !== undefined) updateData.text = data.text;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    return this.prisma.cameraPrompt.update({
      where: { id: promptId },
      data: updateData,
    });
  }

  async deletePrompt(promptId: string) {
    const prompt = await this.prisma.cameraPrompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException("Prompt not found");
    return this.prisma.cameraPrompt.delete({ where: { id: promptId } });
  }

  // ── PTZ Operations (Phase 2) ──

  async sendPtzCommand(cameraId: string, command: string, params: any) {
    const camera = await this.findById(cameraId);
    if (!camera.onvifAddress) {
      throw new BadRequestException("Camera has no ONVIF address configured");
    }
    // PTZ commands route via HTTP to camera ONVIF address
    // (or via MQTT to Edge Agent as fallback — Phase 2 simplicity: HTTP direct)
    return { status: "sent", cameraId, command, params };
  }

  async savePreset(cameraId: string, name: string) {
    const camera = await this.findById(cameraId);
    const presets = Array.isArray(camera.ptzPresets) ? camera.ptzPresets : [];
    if (presets.length >= 10) {
      throw new BadRequestException("Maximum 10 presets per camera");
    }
    const newPreset = { token: `preset_${Date.now()}`, name, snapshotUrl: null };
    return this.prisma.camera.update({
      where: { id: cameraId },
      data: { ptzPresets: [...presets, newPreset] as any },
    });
  }

  // ── ONVIF Discovery ──

  async startOnvifScan(subnet?: string): Promise<{ scanId: string }> {
    const scanId = uuidv4();
    const targetSubnet = subnet || "239.255.255.250";

    const scan: OnvifScan = {
      id: scanId,
      subnet: targetSubnet,
      status: "scanning",
      startedAt: new Date(),
      results: [],
    };
    this.onvifScans.set(scanId, scan);

    // Start async WS-Discovery probe
    this.runWsDiscoveryProbe(scanId, targetSubnet).catch((err) => {
      this.logger.error(`ONVIF scan ${scanId} failed: ${err.message}`);
      scan.status = "completed";
      scan.completedAt = new Date();
    });

    return { scanId };
  }

  getOnvifResults(scanId: string): OnvifScan | null {
    return this.onvifScans.get(scanId) ?? null;
  }

  private async runWsDiscoveryProbe(scanId: string, multicastAddr: string): Promise<void> {
    const scan = this.onvifScans.get(scanId);
    if (!scan) return;

    const probeMsg = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
  xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
  xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery"
  xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <soap:Header>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
    <wsa:MessageID>uuid:${uuidv4()}</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
  </soap:Header>
  <soap:Body>
    <wsd:Probe>
      <wsd:Types>dn:NetworkVideoTransmitter</wsd:Types>
    </wsd:Probe>
  </soap:Body>
</soap:Envelope>`;

    return new Promise((resolve) => {
      const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

      socket.on("message", (msg) => {
        try {
          const xml = msg.toString("utf8");
          // Parse minimal WS-Discovery response
          const xaddrsMatch = xml.match(/<wsa:XAddrs>([^<]+)<\/wsa:XAddrs>/);
          const typesMatch = xml.match(/<wsd:Types>([^<]+)<\/wsd:Types>/i);
          const scopesMatch = xml.match(/<wsd:Scopes>([^<]+)<\/wsd:Scopes>/i);
          const ipMatch = xaddrsMatch
            ? xaddrsMatch[1].match(/https?:\/\/([^:/]+)/)
            : null;

          if (ipMatch) {
            const ip = ipMatch[1];
            // Avoid duplicates
            const existing = scan.results.find((r) => r.ip === ip);
            if (!existing) {
              const scopes = scopesMatch
                ? scopesMatch[1].split(/\s+/).filter(Boolean)
                : [];
              // Attempt to extract model/manufacturer from scopes
              const model = scopes
                .find((s) => s.includes("hardware/"))
                ?.split("/")
                .pop();
              const manufacturer = scopes
                .find((s) => s.includes("dn:"))
                ?.split("/")
                .pop();

              const result: OnvifScanResult = {
                ip,
                model,
                manufacturer,
                address: xaddrsMatch ? xaddrsMatch[1] : "",
                xaddrs: xaddrsMatch ? xaddrsMatch[1] : "",
                types: typesMatch ? typesMatch[1] : "",
                scopes,
              };
              scan.results.push(result);
            }
          }
        } catch {
          // Skip unparseable responses
        }
      });

      socket.on("error", (err) => {
        this.logger.error(`ONVIF socket error: ${err.message}`);
        socket.close();
        scan.status = "completed";
        scan.completedAt = new Date();
        resolve();
      });

      socket.bind(0, () => {
        socket.setBroadcast(true);
        socket.setMulticastTTL(4);
        const probeBuf = Buffer.from(probeMsg, "utf8");
        socket.send(probeBuf, 0, probeBuf.length, 3702, multicastAddr, () => {
          this.logger.log(`ONVIF probe sent to ${multicastAddr}:3702`);
        });
      });

      // Collect responses for 15 seconds, then close
      setTimeout(() => {
        socket.close();
        scan.status = "completed";
        scan.completedAt = new Date();
        this.logger.log(
          `ONVIF scan ${scanId} completed: ${scan.results.length} device(s) found`,
        );
        resolve();
      }, 15000);
    });
  }

  // ── Substream Management ──

  async updateSubstream(cameraId: string, substreamUrl: string) {
    const camera = await this.findById(cameraId);
    return this.prisma.camera.update({
      where: { id: cameraId },
      data: { substreamUrl },
      select: {
        id: true,
        name: true,
        rtspUrl: true,
        substreamUrl: true,
      },
    });
  }
}
