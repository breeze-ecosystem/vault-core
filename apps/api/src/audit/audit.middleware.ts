import { NestMiddleware, Injectable } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaService } from '../modules/prisma/prisma.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: FastifyRequest['raw'] & { user?: any }, _res: FastifyReply['raw'], next: () => void) {
    if (!MUTATING_METHODS.has(req.method?.toUpperCase() || '')) {
      return next();
    }

    // Extract resource from path: /api/resource/:id/... -> resource
    const path = req.url || '';
    const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean);
    const resource = segments[0] || 'unknown';
    const resourceId = segments[1] || undefined;
    const action = `${req.method?.toUpperCase()}_${resource.toUpperCase()}`;

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
               req.headers['x-real-ip']?.toString() ||
               req.socket?.remoteAddress ||
               undefined;

    // We skip logging here if there's no user (auth endpoints) - 
    // but we still want to log them. Fire and forget.
    const userId = (req as any).user?.id || undefined;

    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entity: resource,
          entityId: resourceId,
          ipAddress: ip,
          userAgent: req.headers['user-agent'] || undefined,
          changes: {
            method: req.method,
            path: req.url,
          },
        },
      });
    } catch {
      // Don't fail the request if audit logging fails
    }

    next();
  }
}
