import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { LICENSE_PUBLIC_KEY_PEM } from "./license-public-key";

@Injectable()
export class LicenseKeyManager {
  private readonly logger = new Logger(LicenseKeyManager.name);

  getPublicKey(): crypto.KeyObject {
    return crypto.createPublicKey(LICENSE_PUBLIC_KEY_PEM);
  }
}
