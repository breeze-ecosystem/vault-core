import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { firstValueFrom } from "rxjs";

@Injectable()
export class LicenseVerificationService {
  private readonly logger = new Logger(LicenseVerificationService.name);

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async pingVaultApp(): Promise<void> {
    const vaultAppUrl = this.config.get<string>("VAULT_APP_URL");
    if (!vaultAppUrl) {
      this.logger.warn("VAULT_APP_URL not configured — skipping verification ping");
      return;
    }

    const orgs = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const org of orgs) {
      try {
        const response = await firstValueFrom(
          this.http.get<{ valid: boolean }>(`${vaultAppUrl}/api/verify`, {
            params: { organizationId: org.id },
            timeout: 10_000,
          }),
        );

        if (response.data.valid) {
          await this.prisma.organization.update({
            where: { id: org.id },
            data: {
              lastVerifiedAt: new Date(),
              lastVerificationFailedAt: null,
            },
          });
        } else {
          await this.prisma.organization.update({
            where: { id: org.id },
            data: {
              lastVerificationFailedAt: new Date(),
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(
          `Verification failed for org ${org.id}: ${err.message}`,
        );
        await this.prisma.organization.update({
          where: { id: org.id },
          data: {
            lastVerificationFailedAt: new Date(),
          },
        });
      }
    }
  }
}
