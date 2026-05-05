import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

export interface StandardErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getResponse<FastifyRequest>();
    // Fix: use ctx.getRequest for the request object
    const req = ctx.getRequest<FastifyRequest>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        error = (resp.error as string) || exception.name;
        message = (resp.message as string | string[]) || exception.message;
        if (resp.details && typeof resp.details === 'object') {
          details = resp.details as Record<string, unknown>;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error('Unhandled unknown exception', JSON.stringify(exception));
    }

    // Map common status codes to error names
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR && error === 'Internal Server Error') {
      error = 'Internal Server Error';
    }

    const errorResponse: StandardErrorResponse = {
      statusCode,
      error,
      message,
      path: req.url || req.raw?.url || 'unknown',
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    };

    response.status(statusCode).send(errorResponse);
  }
}
