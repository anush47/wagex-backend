import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(request: Request, response: Response, next: NextFunction): void {
        const { method, originalUrl, ip } = request;
        const userAgent = request.get('user-agent') || '';
        const start = Date.now();

        response.on('finish', () => {
            const { statusCode } = response;
            const duration = Date.now() - start;

            // Middleware runs before guards, but the finish event happens after processing
            // so request.user should be populated if the request was authenticated.
            const user = (request as any).user;
            const userId = user?.id || 'Guest';

            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip} - User: ${userId}`
            );

            // Log body for mutative requests to help debug
            if (['POST', 'PUT', 'PATCH'].includes(method) && statusCode >= 400) {
                this.logger.debug(`Request Body: ${JSON.stringify(request.body)}`);
            }
        });

        next();
    }
}
