import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { ForbiddenException } from '@nestjs/common';

/**
 * Paths that may be accessed without an Origin header.
 *
 * DEVICE_PATHS  — ESP32/hardware endpoints secured by API-key auth.
 * BROWSER_DIRECT — Pages navigated to directly in a browser tab; browsers
 *                  don't send Origin on direct navigation, only on fetch/XHR.
 */
const NO_ORIGIN_ALLOWED_PREFIXES = [
  // Hardware device endpoints
  '/v1/attendance/external/verify',
  '/v1/attendance/external/sync',
  '/v1/attendance/external/event',
  '/v1/attendance/external/events/bulk',
  // Swagger UI — direct browser navigation, key-protected separately
  '/docs',
  // Better Auth internal — server-side token requests have no browser Origin
  '/v1/auth',
  // Browser auto-probes (Chrome DevTools, etc.)
  '/.well-known',
];

function isNoOriginAllowed(path: string): boolean {
  return NO_ORIGIN_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}-`));
}

/**
 * Builds a path-aware CORS middleware.
 *
 * Behaviour:
 *  - Requests WITH an Origin header: allowed only if origin is in ALLOWED_ORIGINS
 *    (or if ALLOWED_ORIGINS is unset, all origins are allowed — dev fallback).
 *  - Requests WITHOUT an Origin header (ESP32, Postman, server-to-server):
 *    allowed ONLY for device endpoints; all other endpoints return a CORS error.
 *
 * Configuration:
 *  Set ALLOWED_ORIGINS in .env as a comma-separated list:
 *    ALLOWED_ORIGINS=https://wagex.lk,https://www.wagex.lk,http://localhost:3000
 */
export function buildCorsMiddleware() {
  const rawOrigins = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : null;

  return (req: Request, res: Response, next: NextFunction) => {
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          if (isNoOriginAllowed(req.path)) return callback(null, true);
          return callback(new ForbiddenException('CORS: Origin header is required for this endpoint'));
        }

        // Browser request — must be in the allowlist
        if (!allowedOrigins || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new ForbiddenException(`CORS: origin '${origin}' is not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-api-key'],
    })(req, res, next);
  };
}
