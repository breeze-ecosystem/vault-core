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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { UpdateUserDto, UserResponseDto, PaginationQueryDto } from "../../common/dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "List all users (admin only)" })
  @ApiResponse({ status: 200, description: "List of users", type: [UserResponseDto] })
  @ApiResponse({ status: 403, description: "Insufficient role" })
  async findAll() {
    return this.userService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "User details", type: UserResponseDto })
  @ApiResponse({ status: 403, description: "Cannot view other users" })
  @ApiResponse({ status: 404, description: "User not found" })
  async findById(@Param("id") id: string, @Req() req: FastifyRequest) {
    const currentUser = (req as any).user;
    if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN" && currentUser.id !== id) {
      throw new ForbiddenException();
    }
    return this.userService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update user profile or role" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 200, description: "User updated", type: UserResponseDto })
  @ApiResponse({ status: 403, description: "Cannot update other users" })
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
