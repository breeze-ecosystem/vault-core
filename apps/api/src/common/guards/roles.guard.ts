import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { ROLE_HIERARCHY } from "@repo/shared";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }

    const userLevel = ROLE_HIERARCHY[user.role as keyof typeof ROLE_HIERARCHY] ?? 0;
    const minRequired = Math.min(
      ...requiredRoles.map(
        (r) => ROLE_HIERARCHY[r as keyof typeof ROLE_HIERARCHY] ?? 0
      )
    );

    if (userLevel < minRequired) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
