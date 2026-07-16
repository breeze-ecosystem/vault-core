import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { WebhookController } from "./webhook.controller";
import { WebhookService } from "./webhook.service";
import { WebhookProcessor } from "./webhook.processor";
import { WebhookGateway } from "./webhook.gateway";

@Module({
  imports: [
    BullModule.registerQueue({ name: "webhook-delivery" }),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookProcessor, WebhookGateway],
  exports: [WebhookService],
})
export class WebhookModule {}
