import { env } from 'cloudflare:workers';

/**
 * Safely retrieves server environment variables and secrets.
 * Reads from Cloudflare Workers runtime `env` (from 'cloudflare:workers'),
 * with fallbacks to process.env and import.meta.env for local development and build time.
 */
export function getServerEnv(key: string, defaultValue = ''): string {
  try {
    const cfVal = (env as Record<string, any>)?.[key];
    if (cfVal !== undefined && cfVal !== null && cfVal !== '') {
      return String(cfVal);
    }
  } catch {
    // If called outside request context (e.g. build step), fallback
  }

  if (typeof process !== 'undefined' && process.env?.[key]) {
    return String(process.env[key]);
  }

  const metaVal = (import.meta.env as Record<string, any>)?.[key];
  if (metaVal !== undefined && metaVal !== null && metaVal !== '') {
    return String(metaVal);
  }

  return defaultValue;
}

