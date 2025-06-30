import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { getUserStats } from '@/lib/queries/userStats';

interface UserProfile {
  id: string;
  name: string;
  profile_picture_url: string | null;
  source: 'friend' | 'user';
  friendship_status?: string;
  // Extended profile data
  communities?: Array<{
    id: string;
    name: string;
    logo_url?: string;
  }>;
  stats?: {
    posts_count: number;
    comments_count: number;
    joined_date: string;
  };
}

/**
 * Fetch extended profile data for a user (communities, stats, etc.)
 */
async function fetchExtendedProfileData(userId: string) {
  try {
    // Fetch user's communities
    const communitiesResult = await query(
      `SELECT c.id, c.name, c.logo_url 
       FROM user_communities uc 
       JOIN communities c ON uc.community_id = c.id 
       WHERE uc.user_id = $1
       ORDER BY uc.last_visited_at DESC
       LIMIT 5`,
      [userId]
    );

    // Fetch user's activity stats using optimized utility function
    const userStats = await getUserStats(userId);

    return {
      communities: communitiesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        logo_url: row.logo_url
      })),
      stats: userStats
    };
  } catch (error) {
    console.error('[fetchExtendedProfileData] Error:', error);
    return {
      communities: [],
      stats: {
        posts_count: 0,
        comments_count: 0,
        joined_date: new Date().toISOString()
      }
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const currentUserId = req.user?.sub;
    const params = await context.params;
    const { userId } = params;
    const url = new URL(req.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'User ID not found in authentication token' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[User Profile API] Getting user ${userId} for current user ${currentUserId}`);

    // Look up user by ID - check both friends and general users
    const userResult = await query(
      `WITH friend_lookup AS (
        -- Check if this user is a friend first (prioritized)
        SELECT 
          uf.friend_user_id as id,
          uf.friend_name as name,
          uf.friend_image_url as profile_picture_url,
          'friend' as source,
          uf.friendship_status,
          1 as priority
        FROM user_friends uf
        WHERE uf.user_id = $1 
          AND uf.friendship_status = 'active'
          AND uf.friend_user_id = $2
      ),
      user_lookup AS (
        -- Check general users table (lower priority, allows self-lookup)
        SELECT 
          u.user_id as id,
          u.name,
          u.profile_picture_url,
          'user' as source,
          NULL as friendship_status,
          2 as priority
        FROM users u
        WHERE u.user_id = $2
      ),
      combined_results AS (
        SELECT * FROM friend_lookup
        UNION ALL
        SELECT * FROM user_lookup
      )
      SELECT DISTINCT ON (id) 
        id, name, profile_picture_url, source, friendship_status
      FROM combined_results
      ORDER BY id, priority ASC  -- Lower priority number = higher priority
      LIMIT 1;`,
      [currentUserId, userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    let userProfile: UserProfile = {
      id: user.id,
      name: user.name || 'Unknown User',
      profile_picture_url: user.profile_picture_url,
      source: user.source,
      friendship_status: user.friendship_status
    };

    // Fetch extended profile data if detailed=true
    if (detailed) {
      const extendedData = await fetchExtendedProfileData(user.id);
      userProfile = {
        ...userProfile,
        ...extendedData
      };
    }

    console.log(`[User Profile API] Found user: ${userProfile.name} (${userProfile.source})`);

    return NextResponse.json({
      user: userProfile,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[User Profile API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, false); 