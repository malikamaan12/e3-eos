import { HttpException, HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/** Exact web origins, never derived from an incoming Host or Origin header. */
export function allowedWebOrigins(): Set<string> {
  const configured = process.env.EOS_WEB_ORIGINS || process.env.APP_BASE_URL;
  if (configured) {
    return new Set(configured.split(',').map((value) => {
      const candidate = value.trim();
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('EOS_WEB_ORIGINS / APP_BASE_URL must contain explicit HTTP(S) origins without paths or credentials.');
      }
      return url.origin;
    }));
  }
  const local = ['development', 'test'].includes(process.env.NODE_ENV || 'development')
    && ['local', 'development', 'test'].includes(process.env.ENVIRONMENT || 'local');
  // Vite uses 3000, and may advance to 3001/3002 when local ports are occupied.
  return new Set(local ? [3000, 3001, 3002].flatMap((port) => [
    `http://localhost:${port}`, `http://127.0.0.1:${port}`,
  ]) : []);
}

export function assertRequestOrigin(request: Pick<Request, 'headers' | 'cookies' | 'method'>,
  allowed = allowedWebOrigins()): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes((request.method || 'GET').toUpperCase())) return;
  const origin = request.headers?.origin;
  const hasCookie = request.cookies?.eos_session !== undefined
    || /(?:^|;)\s*eos_session=/.test(request.headers?.cookie || '');
  const hasBearer = /^Bearer\s+\S+$/i.test(request.headers?.authorization || '');
  if ((origin !== undefined && !allowed.has(origin)) || (hasCookie && !hasBearer && origin === undefined)) {
    throw new HttpException({ code: 'UNTRUSTED_REQUEST_ORIGIN', title: 'Request origin not permitted',
      detail: 'Browser commands require an explicitly allowed web origin. Non-browser session clients must use a bearer credential.' },
    HttpStatus.FORBIDDEN);
  }
}

/** Protect auth/login/logout as well as controllers which use a session guard. */
export function commandOriginMiddleware(allowed: Set<string>) {
  return (request: Request, response: Response, next: NextFunction): void => {
    try {
      assertRequestOrigin(request, allowed);
      next();
    } catch (error) {
      if (!(error instanceof HttpException)) throw error;
      response.status(error.getStatus()).json(error.getResponse());
    }
  };
}
