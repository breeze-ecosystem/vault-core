import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ModemStatus {
  detected: boolean;
  device: string | null;
  signal?: number;
  operator?: string;
}

export interface ModemSendResult {
  success: boolean;
  error?: string;
  queued?: boolean;
}

interface QueuedSms {
  phoneNumber: string;
  message: string;
  retries: number;
  lastAttempt: Date;
}

// GSM 03.38 — French accented character mapping to basic ASCII equivalents
const GSM_CHAR_MAP: Record<string, string> = {
  'à': 'a',
  'â': 'a',
  'ä': 'a',
  'æ': 'ae',
  'ç': 'c',
  'é': 'e',
  'è': 'e',
  'ê': 'e',
  'ë': 'e',
  'î': 'i',
  'ï': 'i',
  'ô': 'o',
  'ö': 'o',
  'œ': 'oe',
  'ù': 'u',
  'û': 'u',
  'ü': 'u',
  'ÿ': 'y',
  'À': 'A',
  'Â': 'A',
  'Ä': 'A',
  'Æ': 'AE',
  'Ç': 'C',
  'É': 'E',
  'È': 'E',
  'Ê': 'E',
  'Ë': 'E',
  'Î': 'I',
  'Ï': 'I',
  'Ô': 'O',
  'Ö': 'O',
  'Œ': 'OE',
  'Ù': 'U',
  'Û': 'U',
  'Ü': 'U',
  'Ÿ': 'Y',
};

@Injectable()
export class ModemService implements OnModuleInit {
  private readonly logger = new Logger(ModemService.name);
  private detectedDevice: string | null = null;
  private isOnline = false;
  private currentSignal: number | undefined;
  private currentOperator: string | undefined;
  private smsQueue: QueuedSms[] = [];
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private serialPort: any = null; // SerialPort instance (lazy-loaded)
  private portReady = false;

  // Configuration
  private readonly baudRate: number;
  private readonly maxRetries: number;
  private readonly retryIntervalMs: number;

  constructor(private config: ConfigService) {
    this.baudRate = this.config.get<number>('MODEM_BAUD_RATE', 9600);
    this.maxRetries = this.config.get<number>('MODEM_MAX_RETRIES', 5);
    this.retryIntervalMs = this.config.get<number>('MODEM_RETRY_INTERVAL_MS', 30000);
  }

  async onModuleInit() {
    await this.detectModem();
    if (this.detectedDevice) {
      await this.initModem();
    }
    this.startRetryTimer();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modem detection and initialisation
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Scan /dev/ttyUSB* for available modem devices.
   */
  private async detectModem(): Promise<string | null> {
    const { readdir } = await import('fs/promises');
    try {
      const entries = await readdir('/dev');
      const usbDevices = entries.filter((e) => e.startsWith('ttyUSB'));
      if (usbDevices.length === 0) {
        this.logger.warn('No ttyUSB devices found — modem not detected');
        this.detectedDevice = null;
        this.isOnline = false;
        return null;
      }

      // Try each device until we find one that responds to AT
      for (const dev of usbDevices) {
        const devicePath = `/dev/${dev}`;
        this.logger.log(`Attempting modem handshake on ${devicePath}`);
        const ok = await this.attemptAtHandshake(devicePath);
        if (ok) {
          this.detectedDevice = devicePath;
          this.logger.log(`Modem detected on ${devicePath}`);
          return devicePath;
        }
      }

      this.logger.warn('Found ttyUSB devices but none responded to AT handshake');
      this.detectedDevice = null;
      this.isOnline = false;
      return null;
    } catch (error) {
      this.logger.warn(`Could not scan /dev for modem devices: ${error}`);
      this.detectedDevice = null;
      this.isOnline = false;
      return null;
    }
  }

  /**
   * Attempt AT handshake on a given device path.
   * Tries to open serial port and send AT\r.
   */
  private async attemptAtHandshake(devicePath: string): Promise<boolean> {
    try {
      const { SerialPort } = await import('@serialport/stream');
      const { ReadlineParser } = await import('@serialport/parser-readline');

      return new Promise((resolve) => {
        const port = new SerialPort({ path: devicePath, baudRate: this.baudRate, autoOpen: true });

        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { port.close(); } catch { /* ignore */ }
            resolve(false);
          }
        }, 3000);

        port.on('open', () => {
          this.logger.debug(`Port ${devicePath} opened for handshake`);
          const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
          let responseBuffer = '';

          parser.on('data', (data: string) => {
            responseBuffer += data;
            if (data.includes('OK')) {
              clearTimeout(timeout);
              if (!resolved) {
                resolved = true;
                this.serialPort = port;
                this.portReady = true;
                resolve(true);
              }
            }
          });

          port.on('error', () => {
            clearTimeout(timeout);
            if (!resolved) {
              resolved = true;
              try { port.close(); } catch { /* ignore */ }
              resolve(false);
            }
          });

          // Send AT command
          port.write(Buffer.from('AT\r'));
        });

        port.on('error', () => {
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        });
      });
    } catch (error) {
      this.logger.warn(`@serialport/stream not available: ${error}`);
      return false;
    }
  }

  /**
   * Initialize the modem: set text mode (PDU mode).
   */
  private async initModem(): Promise<void> {
    if (!this.serialPort || !this.portReady) return;

    try {
      // Set SMS text mode
      await this.sendAtCommand('AT+CMGF=1');
      this.logger.log('Modem initialized: AT+CMGF=1 (text mode)');

      // Query signal quality
      await this.updateSignalQuality();

      // Query operator
      await this.updateOperator();

      this.isOnline = true;
    } catch (error) {
      this.logger.warn(`Modem initialization failed: ${error}`);
      this.isOnline = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // AT command helpers
  // ──────────────────────────────────────────────────────────────────────────────

  private async sendAtCommand(command: string): Promise<string> {
    if (!this.serialPort || !this.portReady) {
      throw new Error('Modem not connected');
    }

    return new Promise((resolve, reject) => {
      const { ReadlineParser } = require('@serialport/parser-readline');
      // We reuse the existing parser if already piped
      const parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      let response = '';
      const timeout = setTimeout(() => {
        reject(new Error(`AT command timeout: ${command}`));
      }, 5000);

      parser.on('data', (data: string) => {
        response += data + '\n';
        if (data.includes('OK')) {
          clearTimeout(timeout);
          resolve(response);
        } else if (data.includes('ERROR')) {
          clearTimeout(timeout);
          reject(new Error(`AT command error: ${command} → ${response}`));
        }
      });

      this.serialPort.write(Buffer.from(command + '\r'));
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Status queries
  // ──────────────────────────────────────────────────────────────────────────────

  private async updateSignalQuality(): Promise<void> {
    try {
      const response = await this.sendAtCommand('AT+CSQ');
      const match = response.match(/\+CSQ:\s*(\d+)/);
      if (match) {
        this.currentSignal = parseInt(match[1], 10);
      }
    } catch {
      this.currentSignal = undefined;
    }
  }

  private async updateOperator(): Promise<void> {
    try {
      const response = await this.sendAtCommand('AT+COPS?');
      const match = response.match(/\+COPS:\s*\d+,\d+,"(.+?)"/);
      if (match) {
        this.currentOperator = match[1];
      }
    } catch {
      this.currentOperator = undefined;
    }
  }

  /**
   * Returns the current modem status.
   */
  async getModemStatus(): Promise<ModemStatus> {
    // Refresh signal and operator if online
    if (this.isOnline && this.serialPort) {
      try {
        await this.updateSignalQuality();
        await this.updateOperator();
      } catch {
        // Non-critical — stale data is okay
      }
    }

    return {
      detected: this.detectedDevice !== null,
      device: this.detectedDevice,
      signal: this.currentSignal,
      operator: this.currentOperator,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SMS sending
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Convert accented French characters to GSM 03.38 basic ASCII equivalents.
   */
  private normalizeToGsmCharset(text: string): string {
    return text
      .split('')
      .map((char) => GSM_CHAR_MAP[char] ?? char)
      .join('')
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '') // strip non-GSM control chars
      .slice(0, 160); // Max 160 characters for single SMS
  }

  /**
   * Send an SMS via the GSM modem.
   * If the modem is offline, the message is queued for retry.
   */
  async sendSms(phoneNumber: string, message: string): Promise<ModemSendResult> {
    if (!this.isOnline || !this.serialPort) {
      this.logger.warn('Modem offline — queuing SMS for retry');
      this.queueSms(phoneNumber, message);
      return { success: false, error: 'Modem hors ligne — message mis en file d\'attente', queued: true };
    }

    try {
      const normalizedMessage = this.normalizeToGsmCharset(message);
      const response = await this.sendAtCommand(`AT+CMGS="${phoneNumber}"`);
      // After AT+CMGS, modem returns > prompt — send message + Ctrl-Z
      this.serialPort.write(Buffer.from(normalizedMessage + '\x1A'));

      this.logger.log(`SMS sent to ${phoneNumber}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      this.queueSms(phoneNumber, message);
      return { success: false, error: error.message ?? String(error), queued: true };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Retry queue
  // ──────────────────────────────────────────────────────────────────────────────

  private queueSms(phoneNumber: string, message: string): void {
    // Update existing queued message if phoneNumber matches
    const existing = this.smsQueue.find((s) => s.phoneNumber === phoneNumber);
    if (existing) {
      existing.retries += 1;
      existing.lastAttempt = new Date();
      existing.message = message; // overwrite with latest message
      return;
    }

    this.smsQueue.push({
      phoneNumber,
      message,
      retries: 0,
      lastAttempt: new Date(),
    });
    this.logger.debug(`SMS queued for ${phoneNumber} (queue size: ${this.smsQueue.length})`);
  }

  private startRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }

    this.retryTimer = setInterval(async () => {
      await this.flushRetryQueue();
    }, this.retryIntervalMs);

    // Prevent Node from hanging due to the timer
    if (this.retryTimer && typeof this.retryTimer === 'object' && 'unref' in this.retryTimer) {
      (this.retryTimer as any).unref();
    }
  }

  /**
   * Attempt to send all queued SMS messages.
   */
  async flushRetryQueue(): Promise<void> {
    if (this.smsQueue.length === 0) return;
    if (!this.isOnline) {
      await this.detectModem();
      if (!this.detectedDevice) return;
      await this.initModem();
      if (!this.isOnline) return;
    }

    const remaining: QueuedSms[] = [];

    for (const sms of this.smsQueue) {
      if (sms.retries >= this.maxRetries) {
        this.logger.warn(`SMS to ${sms.phoneNumber} exceeded max retries (${this.maxRetries}) — dropping`);
        continue;
      }

      const result = await this.sendSms(sms.phoneNumber, sms.message);
      if (!result.success) {
        sms.retries += 1;
        sms.lastAttempt = new Date();
        remaining.push(sms);
      }
    }

    this.smsQueue = remaining;

    if (remaining.length === 0) {
      this.logger.log('SMS retry queue cleared');
    }
  }

  /**
   * Get the current queue length.
   */
  getQueueLength(): number {
    return this.smsQueue.length;
  }
}
