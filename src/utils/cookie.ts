import type { Response, CookieOptions } from 'express';
import { envConfig } from '@/config/env';
import { STAGES } from '@/constants/env';

const isProduction = envConfig.STAGE === STAGES.Prod;

interface AuthCookieOptions {
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Securely sets authentication tokens as HTTP-only cookies in the Express Response.
 * Protects against XSS (via httpOnly) and CSRF (via sameSite and secure flags).
 */
export const setAuthCookies = (res: Response, tokens: AuthCookieOptions) => {
  const baseOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction || envConfig.BACKEND_URL.startsWith('https://'),
    sameSite: isProduction ? 'strict' : 'lax', // Lax in dev for easier local testing, Strict in prod for absolute CSRF protection
    path: '/',
  };

  // 1. Set Access Token Cookie (15 Minutes)
  if (tokens.accessToken) {
    res.cookie('accessToken', tokens.accessToken, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
  }

  // 2. Set Refresh Token Cookie (7 Days)
  if (tokens.refreshToken) {
    res.cookie('refreshToken', tokens.refreshToken, {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
};

/**
 * Clears the authentication cookies from the client (useful for Logout flows).
 */
export const clearAuthCookies = (res: Response) => {
  const baseOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction || envConfig.BACKEND_URL.startsWith('https://'),
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };

  res.clearCookie('accessToken', baseOptions);
  res.clearCookie('refreshToken', baseOptions);
};
