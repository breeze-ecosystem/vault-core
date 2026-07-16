import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE_HIERARCHY } from "@repo/shared";

/**
 * Destructive actions that require ADMIN or SUPERVISOR role per D-30/D-31.
 * All other agent actions (queries, chat) require OPERATOR+.
 */
const DESTRUCTIVE_ACTIONS = [
  "lockdown",
  "door_control",
  "control_door",
  "revoke_credential",
  "revoke_access",
];

/**
 * RbacAgentGuard enforces role-based access control for agent actions.
 *
 * Per D-30/D-31:
 * - ADMIN/SUPERVISOR: lockdown, door control, credential revoke
 * - OPERATOR+: all queries, chat, and non-destructive actions
 *
 * Follows RolesGuard structure exactly:
 * Reflector + CanActivate + ExecutionContext + ROLE_HIERARCHY check + ForbiddenException.
 */
@Injectable()
export class RbacAgentGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        "Authentification requise pour exécuter des actions agent",
      );
    }

    const userRole = user.role as string;
    const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] ?? 0;

    // Determine the action being performed
    const actionName: string | undefined =
      request.body?.action ??
      request.body?.toolName ??
      request.params?.action;

    if (!actionName) {
      // No agent action specified — allow (likely a chat/status request)
      return true;
    }

    // Check if this is a destructive action requiring elevated role
    const isDestructive = DESTRUCTIVE_ACTIONS.some(
      (prefix) => actionName.toLowerCase().startsWith(prefix),
    );

    if (isDestructive) {
      // Destructive actions require ADMIN or SUPERVISOR
      const adminLevel =
        ROLE_HIERARCHY["ADMIN" as keyof typeof ROLE_HIERARCHY] ?? 4;
      const supervisorLevel =
        ROLE_HIERARCHY["SUPERVISOR" as keyof typeof ROLE_HIERARCHY] ?? 3;
      const minRequired = Math.min(adminLevel, supervisorLevel);

      if (userLevel < minRequired) {
        throw new ForbiddenException(
          `Rôle insuffisant pour l'action '${actionName}'. ADMIN ou SUPERVISOR requis.`,
        );
      }
    } else {
      // Non-destructive actions require OPERATOR+
      const operatorLevel =
        ROLE_HIERARCHY["OPERATOR" as keyof typeof ROLE_HIERARCHY] ?? 2;

      if (userLevel < operatorLevel) {
        throw new ForbiddenException(
          `Rôle insuffisant pour l'action agent. OPERATOR minimum requis.`,
        );
      }
    }

    return true;
  }
}
