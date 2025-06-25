import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { query } from '@/lib/db';

// GET /api/me - Get current user information with activity stats
async function getCurrentUserHandler(req: AuthenticatedRequest) {
  const user = req.user;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    // Fetch user activity stats - simplified query that doesn't require user to exist in users table
    const statsResult = await query(`
      SELECT 
        COALESCE(stats.post_count, 0) as post_count,
        COALESCE(stats.comment_count, 0) as comment_count
      FROM (
        SELECT 
          (SELECT COUNT(*) FROM posts WHERE author_user_id = $1) as post_count,
          (SELECT COUNT(*) FROM comments WHERE author_user_id = $1) as comment_count
      ) stats
    `, [user.sub]);

    const stats = statsResult.rows[0] || { post_count: 0, comment_count: 0 };

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
        postCount: parseInt(stats.post_count, 10) || 0,
        commentCount: parseInt(stats.comment_count, 10) || 0,
        isNewUser: (parseInt(stats.post_count, 10) || 0) === 0
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