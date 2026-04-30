import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    // Handle Prisma Client Errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': // Unique constraint failed
          httpStatus = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[]) || [];
          message = `Unique constraint failed: ${target.join(', ') || 'record already exists'}`;
          break;
        case 'P2025': // Record not found
          httpStatus = HttpStatus.NOT_FOUND;
          message = (exception.meta?.cause as string) || 'Record not found';
          break;
        case 'P2003': // Foreign key constraint failed
          httpStatus = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint failed';
          break;
        default:
          // Stay as 500 but log the code
          this.logger.warn(`Unhandled Prisma error code: ${exception.code}`);
          break;
      }
    }

    // Log all errors (>= 400)
    if (httpStatus >= 400) {
      const errorDetails =
        exception instanceof Error
          ? {
              name: exception.name,
              message: exception.message,
            }
          : exception;

      this.logger.error(
        `Filter: ${httpStatus} error at ${httpAdapter.getRequestUrl(ctx.getRequest())}: ${JSON.stringify(message)}`,
      );

      // Log the full exception details for debugging (only for 500 errors)
      if (httpStatus >= 500) {
        this.logger.error('Exception details:', JSON.stringify(errorDetails, null, 2));
        if (exception instanceof Error && exception.stack) {
          this.logger.error('Stack trace:', exception.stack);
        }
      }
    }

    const responseBody = {
      statusCode: httpStatus,
      message:
        typeof message === 'object' && message !== null && 'message' in message
          ? (message as any).message // Handle ValidationPipe array
          : message,
      error:
        exception instanceof Prisma.PrismaClientKnownRequestError
          ? `PrismaError(${exception.code})`
          : exception instanceof Error
            ? exception.name
            : 'UnknownError',
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
