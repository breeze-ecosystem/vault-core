import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as crypto from "crypto";
import { LICENSE_PUBLIC_KEY_PEM } from "./license-public-key";

@Injectable()
export class LicenseKeyManager implements OnModuleInit {
  private privateKey: crypto.KeyObject | null = null;
  private readonly logger = new Logger(LicenseKeyManager.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const keyPath = this.config.get<string>("license.privateKeyPath");
    if (!keyPath) {
      this.logger.warn("License signing key not loaded — license generation disabled");
      return;
    }

    try {
      const pem = fs.readFileSync(keyPath, "utf-8");
      this.privateKey = crypto.createPrivateKey(pem);
      this.logger.log("License signing key loaded");
    } catch (err: any) {
      this.logger.error(`Failed to load license key: ${err.message}`);
    }
  }

  getPrivateKey(): crypto.KeyObject {
    if (!this.privateKey) {
      throw new Error("License signing key not loaded");
    }
    return this.privateKey;
  }

  getPublicKey(): crypto.KeyObject {
    return crypto.createPublicKey(LICENSE_PUBLIC_KEY_PEM);
  }
}
