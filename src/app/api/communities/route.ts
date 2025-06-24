import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

export interface ApiCommunity {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, unknown>;
  logoUrl?: string;
  communityShortId?: string;
  pluginId?: string;
}

interface CommunityRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, unknown> | null;
  logo_url: string | null;
  community_short_id: string | null;
  plugin_id: string | null;
}

async function getCommunitiesHandler(req: AuthenticatedRequest) {
  try {
    // Query all communities for name resolution, excluding the current user's community
    const currentCommunityId = req.user?.cid;
    if (!currentCommunityId) {
      return NextResponse.json({ error: 'User community not found' }, { status: 400 });
    }
    
    const result = await query(
      'SELECT id, name, created_at, updated_at, settings, logo_url, community_short_id, plugin_id FROM communities WHERE id != $1 ORDER BY name ASC',
      [currentCommunityId]
    );

    const communities: ApiCommunity[] = result.rows.map((row: CommunityRow) => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      settings: row.settings || {},
      logoUrl: row.logo_url || undefined,
      communityShortId: row.community_short_id || undefined,
      pluginId: row.plugin_id || undefined
    }));

    return NextResponse.json(communities);

  } catch (error) {
    console.error('Error fetching communities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communities' }, 
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCommunitiesHandler, false); 