import type { Request, Response, NextFunction } from 'express';

/**
 * Guards the Swagger HTML pages with ?key=<SWAGGER_KEY>.
 *
 * Only the root HTML pages need the key — static assets (CSS/JS/PNG) under
 * /docs/* are allowed through freely since they're useless without the page.
 *
 * Set SWAGGER_KEY in .env.
 * Access: GET /docs?key=<SWAGGER_KEY>
 *
 * If SWAGGER_KEY is not set, docs are open in dev and disabled in prod.
 */

const SWAGGER_ASSET_EXTENSIONS = ['.css', '.js', '.png', '.ico', '.json'];

function isSwaggerAsset(path: string): boolean {
  return SWAGGER_ASSET_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export function swaggerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Always allow static asset sub-requests — they're useless without the HTML
  if (isSwaggerAsset(req.path)) return next();

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
