/*
// This route is temporarily disabled due to TypeScript interface issues with withAuth
// Need to investigate the correct Next.js App Router + withAuth pattern
*/

// Placeholder exports to satisfy Next.js App Router
import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';

// GET /api/me - Get current user information
async function getCurrentUserHandler(req: AuthenticatedRequest) {
  const user = req.user;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  // Return sanitized user information
  const userInfo = {
    id: user.sub,
    name: user.name,
    picture: user.picture,
    isAdmin: user.adm || false,
    uid: user.uid,
    communityId: user.cid,
    roles: user.roles || []
  };

  return NextResponse.json(userInfo);
}

export const GET = withAuth(getCurrentUserHandler, false); 