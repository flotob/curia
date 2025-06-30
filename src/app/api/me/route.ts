import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { getUserStatsOptimized } from '@/lib/queries/userStats';

// GET /api/me - Get current user information with activity stats
async function getCurrentUserHandler(req: AuthenticatedRequest) {
  const user = req.user;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    // Fetch user activity stats using optimized utility function
    const stats = await getUserStatsOptimized(user.sub);

    // Return sanitized user information with activity stats
    const userInfo = {
      id: user.sub,
      name: user.name,
      picture: user.picture,
      isAdmin: user.adm || false,
      uid: user.uid,
      communityId: user.cid,
      roles: user.roles || [],
      stats: {
        postCount: stats.posts_count,
        commentCount: stats.comments_count,
        isNewUser: stats.posts_count === 0
      }
    };

    return NextResponse.json(userInfo);
  } catch (error) {
    console.error('[API /api/me] Error fetching user stats:', error);
    
    // Fallback response without stats
    const userInfo = {
      id: user.sub,
      name: user.name,
      picture: user.picture,
      isAdmin: user.adm || false,
      uid: user.uid,
      communityId: user.cid,
      roles: user.roles || [],
      stats: {
        postCount: 0,
        commentCount: 0,
        isNewUser: true
      }
    };

    return NextResponse.json(userInfo);
  }
}

export const GET = withAuth(getCurrentUserHandler, false); 