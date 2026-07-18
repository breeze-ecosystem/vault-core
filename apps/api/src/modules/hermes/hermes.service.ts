import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HermesSendResult {
  success: boolean;
  error?: string;
}

export interface HermesConnectionStatus {
  connected: boolean;
  deviceName: string | null;
}

export interface HermesQrCode {
  qrCode: string | null; // base64-encoded QR image
  error?: string;
}

@Injectable()
export class HermesService {
  private readonly logger = new Logger(HermesService.name);
  private readonly agentUrl: string;

  constructor(private config: ConfigService) {
    this.agentUrl = this.config.get<string>('HERMES_AGENT_URL', 'http://hermes:8080');
    this.logger.log(`Hermes Agent configured at ${this.agentUrl}`);
  }

  /**
   * Send a WhatsApp message via the Hermes Agent HTTP webhook.
   * Returns { success: true } on success, or { success: false, error } on failure.
   */
  async sendWhatsApp(
    phoneNumber: string,
    message: string,
    imageBase64?: string,
  ): Promise<HermesSendResult> {
    const payload: Record<string, unknown> = {
      phone: phoneNumber,
      message,
    };

    if (imageBase64) {
      payload.image = imageBase64;
    }

    try {
      const response = await fetch(`${this.agentUrl}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Hermes Agent returned ${response.status}: ${text}`);
        return { success: false, error: `Hermes Agent error: ${response.status} ${text}` };
      }

      this.logger.log(`WhatsApp message sent to ${phoneNumber}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      return { success: false, error: error.message ?? String(error) };
    }
  }

  /**
   * Query the Hermes Agent health/status endpoint.
   */
  async getConnectionStatus(): Promise<HermesConnectionStatus> {
    try {
      const response = await fetch(`${this.agentUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { connected: false, deviceName: null };
      }

      const data = (await response.json()) as any;
      return {
        connected: data?.connected ?? false,
        deviceName: data?.deviceName ?? null,
      };
    } catch (error: any) {
      this.logger.warn(`Hermes Agent health check failed: ${error.message}`);
      return { connected: false, deviceName: null };
    }
  }

  /**
   * Get the QR code for initial WhatsApp Web pairing.
   * Returns base64-encoded QR image.
   */
  async getQrCode(): Promise<HermesQrCode> {
    try {
      const response = await fetch(`${this.agentUrl}/api/qrcode`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text();
        return { qrCode: null, error: `Failed to get QR code: ${response.status} ${text}` };
      }

      const data = (await response.json()) as any;

      // The Hermes Agent may return the QR as base64, a raw image, or a URL
      if (data?.qrCode) {
        return { qrCode: data.qrCode };
      }
      if (data?.qrCodeBase64) {
        return { qrCode: data.qrCodeBase64 };
      }
      if (typeof data?.qrCodeUrl === 'string') {
        // Return as-is — the client will fetch it
        return { qrCode: data.qrCodeUrl };
      }

      return { qrCode: null, error: 'No QR code available — device may already be connected' };
    } catch (error: any) {
      this.logger.warn(`Failed to get QR code from Hermes Agent: ${error.message}`);
      return { qrCode: null, error: error.message ?? String(error) };
    }
  }
}
