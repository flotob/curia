import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, JwtPayload } from '@/lib/withAuth';

// Define a specific response type for this endpoint for clarity
interface MeResponse {
  userId: string;
  name?: string | null;
  picture?: string | null;
  isAdmin?: boolean;
  // We can add iat and exp if useful for the client to know token timings
  // iat?: number;
  // exp?: number;
}

// This is the handler function that will be wrapped by withAuth
async function meHandler(req: AuthenticatedRequest) {
  // req.user is populated by the withAuth middleware
  if (!req.user) {
    // This should ideally not happen if withAuth is working correctly
    return NextResponse.json({ error: 'Authentication failed, user not found on request' }, { status: 500 });
  }

  const { sub, name, picture, adm } = req.user;
  
  const responsePayload: MeResponse = {
    userId: sub,
    name: name,
    picture: picture,
    isAdmin: adm || false, // Default to false if adm is undefined
  };

  return NextResponse.json(responsePayload);
}

// Wrap the handler with withAuth. 
// The second argument `false` means it does not require admin access.
export const GET = withAuth(meHandler, false); 