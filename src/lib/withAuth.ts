import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db'; // Assuming @/lib path alias is set up or use relative path

const JWT_SECRET = process.env.JWT_SECRET;

// Define the expected structure of your plugin's JWT payload
export interface JwtPayload {
  sub: string; // User ID from Common Ground
  name?: string | null; // User's name (optional)
  picture?: string | null; // User's profile picture URL (optional)
  adm?: boolean; // Admin status (optional)
  uid?: string | null;      // Added: iframeUid
  cid?: string | null;      // Added: communityId
  // Add other claims as needed, e.g., iat, exp which jwt.verify adds
  iat?: number;
  exp?: number;
}

// Define an interface for the request object after authentication
export interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}

// Define the type for the handler function that receives the authenticated request
// Context type for Next.js App Router route handlers typically includes { params: YourParamsType }
export function withAuth<Params = Record<string, string>>(
  handler: (
    req: AuthenticatedRequest,
    context: { params: Params }
  ) => Promise<NextResponse> | NextResponse,
  adminOnly: boolean = false
) {
  return async (
    req: NextRequest, // Incoming request is initially a standard NextRequest
    context: { params: Params } // Context from Next.js (e.g., dynamic route params)
  ): Promise<NextResponse> => {
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

      // --- User Profile UPSERT Logic --- //
      const userId = decoded.sub;
      const userName = decoded.name ?? null; // Use nullish coalescing for optional claims
      const profilePictureUrl = decoded.picture ?? null;

      if (userId) {
        try {
          await query(
            `INSERT INTO users (user_id, name, profile_picture_url, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET
               name = EXCLUDED.name,
               profile_picture_url = EXCLUDED.profile_picture_url,
               updated_at = NOW();`,
            [userId, userName, profilePictureUrl]
          );
        } catch (profileError) {
          console.error(
            'Error updating user profile during auth (non-critical):',
            profileError
          );
          // Non-critical error, so we don't block the request for this.
        }
      }
      // --- END User Profile UPSERT Logic --- //

      const authReq = req as AuthenticatedRequest;
      authReq.user = decoded;

      if (adminOnly && !decoded.adm) {
        console.warn(
          `Non-admin user (sub: ${decoded.sub}) attempted admin-only route.`
        );
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
      
      // Call the original handler with the augmented request and original context
      return await handler(authReq, context);
    } catch (error) {
      console.error('[withAuth] Error during token verification or handler execution:', error);
      if (error instanceof jwt.TokenExpiredError) {
        console.error('[withAuth] TokenExpiredError caught. Token exp:', (error as any).expiredAt, 'Current time:', new Date());
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