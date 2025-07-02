import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { getUserStatsOptimized } from '@/lib/queries/userStats';
import { query } from '@/lib/db';

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

// PATCH /api/me - Update current user settings
async function updateUserHandler(req: AuthenticatedRequest) {
  const user = req.user;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { status: 400 });
    }

    console.log(`[API /api/me] Updating settings for user ${user.sub}:`, settings);

    // Validate settings structure (basic validation)
    if (typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings must be an object' }, { status: 400 });
    }

    // Update user settings in database
    const result = await query(
      `UPDATE users 
       SET settings = $1, updated_at = NOW() 
       WHERE user_id = $2 
       RETURNING user_id, name, profile_picture_url, settings, updated_at`,
      [JSON.stringify(settings), user.sub]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = result.rows[0];
    
    // Parse settings if they're stored as a string
    let parsedSettings = updatedUser.settings;
    if (typeof parsedSettings === 'string') {
      parsedSettings = JSON.parse(parsedSettings);
    }

    return NextResponse.json({
      user: {
        id: updatedUser.user_id,
        name: updatedUser.name,
        profile_picture_url: updatedUser.profile_picture_url,
        settings: parsedSettings,
        updated_at: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('[API /api/me] Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCurrentUserHandler, false);
export const PATCH = withAuth(updateUserHandler, false); 