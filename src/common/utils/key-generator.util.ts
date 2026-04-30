import { randomBytes } from 'node:crypto';

/**
 * Generates a secure, unguessable API key for external devices.
 * Uses a Base32 alphabet (excluding confusing characters like O, 0, I, 1).
 * Length: 12 characters (approx 60 bits of entropy).
 * 
 * Example: WGX49A2K7P1B
 */
export function generateSecureApiKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = 'WGX';
  const randomLength = 9;
  
  const bytes = randomBytes(randomLength);
  let randomString = '';
  
  for (let i = 0; i < randomLength; i++) {
    randomString += alphabet[bytes[i] % alphabet.length];
  }
  
  return prefix + randomString;
}

/**
 * Formats a raw API key with dashes for better readability in the frontend.
 * Example: WGX49A2K7P1B -> WGX-49A2-K7P1B
 */
export function formatApiKey(key: string): string {
  if (key.length !== 12) return key;
  return `${key.slice(0, 3)}-${key.slice(3, 7)}-${key.slice(7)}`;
}
