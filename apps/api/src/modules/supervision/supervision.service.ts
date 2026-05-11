import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import * as crypto from 'crypto';

export interface ClientRecord {
  clientId: string;
  tier?: string;
  companyName?: string;
  hostname?: string;
  os?: string;
  publicIp?: string;
  cameraCount?: number;
  supervisionToken: string;
  registeredAt: string;
  lastHeartbeat?: HeartbeatData;
}

export interface HeartbeatData {
  timestamp: string;
  uptime?: number;
  system?: {
    cpu: number;
    ram: number;
    ramTotal: number;
    ramUsed: number;
    disk: number;
  };
  services?: Record<string, boolean | string>;
  cameraStats?: {
    total: number;
    online: number;
    offline: number;
  };
  alertStats?: {
    last24h: number;
  };
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class SupervisionService {
  private readonly logger = new Logger(SupervisionService.name);
  private readonly clients = new Map<string, ClientRecord>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Register a new edge client and generate a supervision token.
   */
  register(dto: RegisterClientDto): { supervisionToken: string; clientId: string } {
    const supervisionToken = this.generateToken();
    const record: ClientRecord = {
      clientId: dto.clientId,
      tier: dto.tier,
      companyName: dto.companyName,
      hostname: dto.hostname,
      os: dto.os,
      publicIp: dto.publicIp,
      cameraCount: dto.cameraCount,
      supervisionToken,
      registeredAt: new Date().toISOString(),
    };

    this.clients.set(dto.clientId, record);
    this.logger.log(`Client registered: ${dto.clientId} (tier: ${dto.tier || 'unknown'})`);

    return { supervisionToken, clientId: dto.clientId };
  }

  /**
   * Store a heartbeat from an edge agent.
   */
  recordHeartbeat(dto: HeartbeatDto): void {
    const existing = this.clients.get(dto.clientId);

    const heartbeat: HeartbeatData = {
      timestamp: dto.timestamp || new Date().toISOString(),
      uptime: dto.uptime,
      system: dto.system as any,
      services: dto.services as any,
      cameraStats: dto.cameraStats as any,
      alertStats: dto.alertStats as any,
    };

    if (existing) {
      existing.lastHeartbeat = heartbeat;
      existing.tier = dto.tier ?? existing.tier;
      this.clients.set(dto.clientId, existing);
    } else {
      // Auto-register from heartbeat — no token yet
      const record: ClientRecord = {
        clientId: dto.clientId,
        tier: dto.tier,
        supervisionToken: this.generateToken(),
        registeredAt: new Date().toISOString(),
        lastHeartbeat: heartbeat,
      };
      this.clients.set(dto.clientId, record);
      this.logger.log(`Auto-registered client from heartbeat: ${dto.clientId}`);
    }
  }

  /**
   * List all clients with their latest heartbeat and online status.
   */
  listClients() {
    const now = Date.now();
    const result: any[] = [];

    for (const [, client] of this.clients) {
      const hb = client.lastHeartbeat;
      const lastTs = hb ? new Date(hb.timestamp).getTime() : 0;
      const isOnline = now - lastTs < ONLINE_THRESHOLD_MS;

      result.push({
        clientId: client.clientId,
        tier: client.tier,
        companyName: client.companyName,
        hostname: client.hostname,
        cameraCount: client.cameraCount,
        registeredAt: client.registeredAt,
        lastHeartbeat: hb?.timestamp ?? null,
        uptime: hb?.uptime ?? null,
        system: hb?.system ?? null,
        services: hb?.services ?? null,
        cameraStats: hb?.cameraStats ?? null,
        alertStats: hb?.alertStats ?? null,
        isOnline,
      });
    }

    return result;
  }

  /**
   * Get a specific client by ID.
   */
  getClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return null;

    const now = Date.now();
    const hb = client.lastHeartbeat;
    const lastTs = hb ? new Date(hb.timestamp).getTime() : 0;
    const isOnline = now - lastTs < ONLINE_THRESHOLD_MS;

    return {
      clientId: client.clientId,
      tier: client.tier,
      companyName: client.companyName,
      hostname: client.hostname,
      os: client.os,
      publicIp: client.publicIp,
      cameraCount: client.cameraCount,
      registeredAt: client.registeredAt,
      lastHeartbeat: hb?.timestamp ?? null,
      uptime: hb?.uptime ?? null,
      system: hb?.system ?? null,
      services: hb?.services ?? null,
      cameraStats: hb?.cameraStats ?? null,
      alertStats: hb?.alertStats ?? null,
      isOnline,
    };
  }

  /**
   * Validate a supervision token against stored clients.
   */
  validateSupervisionToken(token: string): ClientRecord | null {
    for (const [, client] of this.clients) {
      if (client.supervisionToken === token) {
        return client;
      }
    }
    return null;
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
