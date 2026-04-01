import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

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
      error: exception instanceof Error ? exception.name : 'UnknownError',
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
