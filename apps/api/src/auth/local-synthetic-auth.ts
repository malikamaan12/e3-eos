import type { Request } from 'express';

/** Fixture identities are an explicit local development aid, never deployed authority. */
export function localSyntheticAuthEnabled(): boolean {
  const nodeEnvironment = process.env.NODE_ENV || 'development';
  const environment = process.env.ENVIRONMENT || 'local';
  return process.env.EOS_ENABLE_LOCAL_SYNTHETIC_AUTH === 'true'
    && ['development', 'test'].includes(nodeEnvironment)
    && ['local', 'development', 'test'].includes(environment);
}

/** Read opaque session credentials; identity/role headers are never credentials. */
export function readSessionToken(request: Pick<Request, 'headers' | 'cookies'>): string | undefined {
  const authorization = request.headers?.authorization;
  if (authorization !== undefined) {
    return /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
  }
  const parsedCookie = request.cookies?.eos_session;
  if (typeof parsedCookie === 'string' && parsedCookie) return parsedCookie;
  // Keep session cookies usable without depending on an optional cookie-parser middleware.
  const cookie = request.headers?.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('eos_session='));
  if (!cookie) return undefined;
  try {
    return decodeURIComponent(cookie.slice('eos_session='.length)) || undefined;
  } catch {
    return undefined;
  }
}
