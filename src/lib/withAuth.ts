import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Define the expected structure of your plugin's JWT payload
export interface JwtPayload {
  sub: string; // User ID from Common Ground
  name?: string | null; // User's name (optional)
  picture?: string | null; // User's profile picture URL (optional)
  adm?: boolean; // Admin status (optional)
  uid?: string | null;      // Added: iframeUid
  cid?: string | null;      // Added: communityId
  roles?: string[];         // Added: user role IDs from Common Ground
  communityShortId?: string; // 🆕 Short ID for URL construction
  pluginId?: string;         // 🆕 Plugin ID from context
  previousVisit?: string | null; // 🆕 ISO timestamp of user's last visit
  // Add other claims as needed, e.g., iat, exp which jwt.verify adds
  iat?: number;
  exp?: number;
}

// Define an interface for the request object after authentication
export interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}

// Define the type for Next.js App Router route context
export interface RouteContext {
  params: Promise<Record<string, string>>;
}

// Simplified withAuth function that returns exactly the signature Next.js expects
export function withAuth(
  handler: (req: AuthenticatedRequest, context: RouteContext) => Promise<NextResponse> | NextResponse,
  adminOnly: boolean = false
) {
  return async (req: NextRequest, context: RouteContext): Promise<NextResponse> => {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not configured for verification.');
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Token missing' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      console.log('[withAuth] Token verified successfully. Decoded exp:', decoded.exp, 'Current time:', Math.floor(Date.now() / 1000));

      const authReq = req as AuthenticatedRequest;
      authReq.user = decoded;

      if (adminOnly && !decoded.adm && decoded.sub !== process.env.NEXT_PUBLIC_SUPERADMIN_ID) {
        console.warn(
          `Non-admin user (sub: ${decoded.sub}) attempted admin-only route.`
        );
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
      
      // Call the original handler with the augmented request and context
      return await handler(authReq, context);
    } catch (error) {
      console.error('[withAuth] Error during token verification or handler execution:', error);
      if (error instanceof jwt.TokenExpiredError) {
        console.error('[withAuth] TokenExpiredError caught. Token exp:', (error as jwt.TokenExpiredError).expiredAt, 'Current time:', new Date());
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      } else {
        console.error('Error verifying JWT:', error);
        return NextResponse.json(
          { error: 'Internal server error during authentication' },
          { status: 500 }
        );
      }
    }
  };
} 