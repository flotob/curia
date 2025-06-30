import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { getUserStats } from '@/lib/queries/userStats';

interface SearchUser {
  id: string;
  name: string;
  profile_picture_url: string | null;
  source: 'friend' | 'user';
  friendship_status?: string;
  // Extended profile data (when detailed=true)
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
async function handler(req: AuthenticatedRequest, _context: RouteContext) {
  try {
    const userId = req.user?.sub;
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '15'), 20); // Max 20 results
    const detailed = url.searchParams.get('detailed') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in authentication token' },
        { status: 401 }
      );
    }

    if (!searchQuery || searchQuery.length < 2) {
      return NextResponse.json({
        users: [],
        message: 'Query must be at least 2 characters'
      });
    }

    console.log(`[User Search API] Searching for "${searchQuery}" by user ${userId}`);

    const searchPattern = `%${searchQuery}%`;

    // Combined query that searches both tables and deduplicates
    const searchResult = await query(
      `WITH friend_search AS (
        -- Search friends first (prioritized)
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
          AND uf.friend_name ILIKE $2
        LIMIT $3
      ),
      user_search AS (
        -- Search general users (lower priority)
        SELECT 
          u.user_id as id,
          u.name,
          u.profile_picture_url,
          'user' as source,
          NULL as friendship_status,
          2 as priority
        FROM users u
        WHERE u.name ILIKE $2
          AND u.user_id != $1  -- Exclude self
        LIMIT $3
      ),
      combined_results AS (
        SELECT * FROM friend_search
        UNION ALL
        SELECT * FROM user_search
      ),
      deduplicated AS (
        -- Deduplicate by user ID, prioritizing friends
        SELECT DISTINCT ON (id) 
          id, name, profile_picture_url, source, friendship_status
        FROM combined_results
        ORDER BY id, priority ASC  -- Lower priority number = higher priority
      )
      SELECT * FROM deduplicated
      ORDER BY 
        CASE WHEN source = 'friend' THEN 1 ELSE 2 END,  -- Friends first
        name ASC
      LIMIT $3;`,
      [userId, searchPattern, limit]
    );

    let users: SearchUser[] = searchResult.rows.map(row => ({
      id: row.id,
      name: row.name || 'Unknown User',
      profile_picture_url: row.profile_picture_url,
      source: row.source,
      friendship_status: row.friendship_status
    }));

    // Fetch extended profile data if detailed=true
    if (detailed) {
      users = await Promise.all(users.map(async (user) => {
        const extendedData = await fetchExtendedProfileData(user.id);
        return {
          ...user,
          ...extendedData
        };
      }));
    }

    console.log(`[User Search API] Found ${users.length} users (${users.filter(u => u.source === 'friend').length} friends, ${users.filter(u => u.source === 'user').length} general users)${detailed ? ' with detailed data' : ''}`);

    return NextResponse.json({
      users,
      query: searchQuery,
      count: users.length,
      detailed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[User Search API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, false); 