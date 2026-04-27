import type { Request, Response, NextFunction } from 'express';

/**
 * Guards Swagger UI with a secret key passed as a query param.
 *
 * Set SWAGGER_KEY in .env.
 * Access: GET /docs?key=<SWAGGER_KEY>
 *
 * If SWAGGER_KEY is not set, docs are open in dev and disabled in prod.
 */
export function swaggerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const swaggerKey = process.env.SWAGGER_KEY;
  const isDev = process.env.ENVIRONMENT !== 'prod';

  if (!swaggerKey) {
    if (isDev) return next();
    res.status(403).send('Swagger docs are disabled. Set SWAGGER_KEY to enable.');
    return;
  }

  if (req.query['key'] === swaggerKey) return next();

  res.status(401).send('Unauthorized. Append ?key=<SWAGGER_KEY> to access docs.');
}
