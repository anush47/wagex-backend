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

            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${duration}ms - ${userAgent} ${ip}`
            );

            // Log body for mutative requests to help debug
            if (['POST', 'PUT', 'PATCH'].includes(method) && statusCode >= 400) {
                this.logger.debug(`Request Body: ${JSON.stringify(request.body)}`);
            }
        });

        next();
    }
}
