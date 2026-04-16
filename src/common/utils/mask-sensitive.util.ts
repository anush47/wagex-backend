/**
 * Recursively masks sensitive fields in an object.
 * Useful for logging and audit logs to prevent password/token leaks.
 */
export function maskSensitiveFields(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveFields(item));
  }

  const masked = { ...obj };
  const sensitiveKeys = [
    'password',
    'token',
    'sessiontoken',
    'refreshtoken',
    'secret',
    'secretkey',
    'apikey',
    'pin',
    'otp',
  ];

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      masked[key] = '********';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveFields(masked[key]);
    }
  }

  return masked;
}
