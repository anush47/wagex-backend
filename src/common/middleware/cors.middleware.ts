import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';

/**
 * Device-only endpoints: ESP32 / external hardware call these without a browser
 * Origin header. They are secured by API-key auth rather than browser sessions.
 */
const DEVICE_PATH_PREFIXES = [
  '/v1/attendance/external/verify',
  '/v1/attendance/external/sync',
  '/v1/attendance/external/event',
  '/v1/attendance/external/events/bulk',
];

function isDevicePath(path: string): boolean {
  return DEVICE_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
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
          // No Origin header — only device endpoints may proceed
          if (isDevicePath(req.path)) return callback(null, true);
          return callback(new Error('CORS: Origin header is required for this endpoint'));
        }

        // Browser request — must be in the allowlist
        if (!allowedOrigins || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-api-key'],
    })(req, res, next);
  };
}
