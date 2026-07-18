import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SubjectAccessService } from "./subject-access.service";
import {
  subjectAccessOtpSchema,
  subjectAccessVerifySchema,
  subjectAccessRequestSchema,
} from "@repo/shared";

@Controller("compliance/subject-access")
export class SubjectAccessController {
  constructor(
    private readonly subjectAccessService: SubjectAccessService,
  ) {}

  /**
   * Step 1: Request a 6-digit OTP for identity verification.
   * Public endpoint — no JWT required (per BAS-34 public portal).
   */
  @Post("request-otp")
  @Public()
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Body(new ZodValidationPipe(subjectAccessOtpSchema)) body: any,
  ) {
    return this.subjectAccessService.requestOtp(body.email);
  }

  /**
   * Step 2: Verify OTP and return the data subject's personal data.
   * Public endpoint — no JWT required.
   */
  @Post("verify-otp")
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body(new ZodValidationPipe(subjectAccessVerifySchema)) body: any,
  ) {
    return this.subjectAccessService.verifyOtp(body.email, body.code);
  }

  /**
   * Step 3: Submit a rectification or deletion request.
   * Public endpoint — no JWT required.
   */
  @Post("submit-request")
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(
    @Body(new ZodValidationPipe(subjectAccessRequestSchema)) body: any,
  ) {
    return this.subjectAccessService.submitRequest(
      body.email,
      body.type,
      body.details,
    );
  }
}
