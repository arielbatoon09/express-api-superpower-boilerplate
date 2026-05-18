import { doubleCsrf } from 'csrf-csrf';
import jwt from 'jsonwebtoken';
import { envConfig } from '@/config/env';
import { STAGES } from '@/constants/env';

const isProduction = envConfig.STAGE === STAGES.Prod;

export const {
  generateCsrfToken, // Corrected export name
  doubleCsrfProtection,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => envConfig.JWT_SECRET, // Using JWT_SECRET as the CSRF signature secret
  // Tie CSRF to the stable User ID (sub claim) decoded from JWT so it survives token rotation!
  getSessionIdentifier: req => {
    const token = req.cookies?.refreshToken || req.cookies?.accessToken;
    if (token) {
      try {
        const decoded = jwt.decode(token) as { sub?: string };
        return decoded?.sub || 'authenticated_session';
      } catch {
        return 'unauthenticated_session';
      }
    }
    return 'unauthenticated_session';
  },
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction || envConfig.BACKEND_URL.startsWith('https://'),
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: req => req.headers['x-csrf-token'] as string, // Corrected config option name
});
