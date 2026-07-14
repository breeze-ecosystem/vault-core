import { Controller, Post, Get, Body, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AiService } from "./ai.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { aiQuerySchema, aiAssistantSchema, aiSummarizeSchema } from "@repo/shared";
import type { AIQueryInput, AIAssistantInput, AISummarizeInput } from "@repo/shared";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("query")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async query(
    @Body(new ZodValidationPipe(aiQuerySchema)) body: AIQueryInput,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.aiService.naturalLanguageQuery(body.query, user.id);
  }

  @Post("summarize")
  @Roles("ADMIN", "SUPERVISOR")
  async summarize(
    @Body(new ZodValidationPipe(aiSummarizeSchema)) body: AISummarizeInput,
  ) {
    return this.aiService.generateIncidentSummary(body.incidentId);
  }

  @Post("assistant")
  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  async assistant(
    @Body(new ZodValidationPipe(aiAssistantSchema)) body: AIAssistantInput,
    @Req() req: FastifyRequest,
  ) {
    const user = (req as any).user;
    return this.aiService.answerQuestion(body.question, user.id);
  }

  @Get("status")
  @Roles("ADMIN")
  async status() {
    return this.aiService.checkStatus();
  }
}
