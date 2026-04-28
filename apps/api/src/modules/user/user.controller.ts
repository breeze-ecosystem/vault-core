import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { UserService } from "./user.service";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("users")
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN")
  async findAll() {
    return this.userService.findAll();
  }

  @Get(":id")
  async findById(@Param("id") id: string, @Req() req: FastifyRequest) {
    const currentUser = (req as any).user;
    if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN" && currentUser.id !== id) {
      throw new ForbiddenException();
    }
    return this.userService.findById(id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: FastifyRequest
  ) {
    const currentUser = (req as any).user;
    const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN";

    if (!isAdmin && currentUser.id !== id) {
      throw new ForbiddenException();
    }

    const data: any = {};
    if (body.firstName) data.firstName = body.firstName;
    if (body.lastName) data.lastName = body.lastName;
    if (isAdmin && body.role) data.role = body.role;
    if (isAdmin && body.isActive !== undefined) data.isActive = body.isActive;
    if (isAdmin && body.siteId !== undefined) data.siteId = body.siteId || null;

    return this.userService.update(id, data);
  }
}
