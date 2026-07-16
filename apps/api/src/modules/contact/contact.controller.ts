import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { contactSchema, ContactInput } from "@repo/shared";
import { ContactService } from "./contact.service";

@ApiTags("contact")
@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit contact/demo request from marketing site" })
  async submit(@Body(new ZodValidationPipe(contactSchema)) dto: ContactInput) {
    await this.contactService.handleContact(dto);
    return { success: true };
  }
}
