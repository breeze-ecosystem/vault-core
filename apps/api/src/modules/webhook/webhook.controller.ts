import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { WebhookService } from "./webhook.service";
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from "./dto/create-subscription.dto";
import { createWebhookSubscriptionSchema } from "@repo/shared";

@ApiTags("webhooks")
@Controller("webhooks")
@UseGuards(JwtAuthGuard)
@Roles("ADMIN")
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * GET /api/webhooks/subscriptions
   * List all webhook subscriptions for the current org.
   */
  @Get("subscriptions")
  @ApiOperation({ summary: "List webhook subscriptions" })
  @ApiBearerAuth()
  async listSubscriptions(@Req() req: FastifyRequest) {
    const orgId = (req as any).user.orgId;
    return this.webhookService.listSubscriptions(orgId);
  }

  /**
   * POST /api/webhooks/subscriptions
   * Create a new webhook subscription.
   */
  @Post("subscriptions")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a webhook subscription" })
  @ApiBearerAuth()
  async createSubscription(
    @Req() req: FastifyRequest,
    @Body(new ZodValidationPipe(createWebhookSubscriptionSchema)) body: any,
  ) {
    const user = (req as any).user;
    const orgId = user.orgId;
    return this.webhookService.createSubscription(orgId, user.id, body);
  }

  /**
   * PATCH /api/webhooks/subscriptions/:id
   * Update a webhook subscription.
   */
  @Patch("subscriptions/:id")
  @ApiOperation({ summary: "Update a webhook subscription" })
  @ApiBearerAuth()
  async updateSubscription(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const orgId = (req as any).user.orgId;
    return this.webhookService.updateSubscription(id, orgId, body);
  }

  /**
   * DELETE /api/webhooks/subscriptions/:id
   * Delete a webhook subscription.
   */
  @Delete("subscriptions/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a webhook subscription" })
  @ApiBearerAuth()
  async deleteSubscription(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
  ) {
    const orgId = (req as any).user.orgId;
    return this.webhookService.deleteSubscription(id, orgId);
  }

  /**
   * GET /api/webhooks/subscriptions/:id/deliveries
   * List delivery logs for a subscription (paginated, filterable).
   */
  @Get("subscriptions/:id/deliveries")
  @ApiOperation({ summary: "List delivery logs for a subscription" })
  @ApiBearerAuth()
  async listDeliveries(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const orgId = (req as any).user.orgId;
    return this.webhookService.listDeliveries(id, orgId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  /**
   * POST /api/webhooks/subscriptions/:id/retry/:deliveryId
   * Manual retry of a failed delivery.
   */
  @Post("subscriptions/:id/retry/:deliveryId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Manual retry of a failed webhook delivery" })
  @ApiBearerAuth()
  async retryDelivery(
    @Req() req: FastifyRequest,
    @Param("id") id: string,
    @Param("deliveryId") deliveryId: string,
  ) {
    const orgId = (req as any).user.orgId;
    return this.webhookService.retryDelivery(id, deliveryId, orgId);
  }
}
