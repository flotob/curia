import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';

async function getUserCommunitiesHandler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    const userId = req.user!.sub;
    
    console.log(`[User Communities API] Fetching communities for user ${userId}`);

    // Get all communities the user has visited with metadata
    const communitiesResult = await query(
      `SELECT 
         c.id,
         c.name,
         c.community_short_id,
         c.plugin_id,
         c.logo_url,
         uc.last_visited_at,
         uc.visit_count,
         uc.first_visited_at
       FROM user_communities uc
       JOIN communities c ON uc.community_id = c.id
       WHERE uc.user_id = $1
       ORDER BY uc.last_visited_at DESC`,
      [userId]
    );

    const communities = communitiesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      communityShortId: row.community_short_id,
      pluginId: row.plugin_id,
      logoUrl: row.logo_url,
      lastVisitedAt: row.last_visited_at,
      visitCount: row.visit_count,
      firstVisitedAt: row.first_visited_at
    }));

    console.log(`[User Communities API] Found ${communities.length} communities for user ${userId}`);

    return NextResponse.json({
      success: true,
      communities
    });

  } catch (error) {
    console.error('[User Communities API] Error fetching communities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user communities' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getUserCommunitiesHandler); 