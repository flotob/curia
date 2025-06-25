import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { SettingsUtils } from '@/types/settings';

export interface ApiImportableBoard {
  id: number;
  name: string;
  description: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  source_community_id: string;
  source_community_name: string;
  source_community_logo_url: string | null;
  post_count: number;
  last_activity: string;
  is_already_imported: boolean;
  is_role_gated: boolean;
}

export interface ApiPartnershipWithSharing {
  id: number;
  target_community_id: string;
  target_community_name: string;
  target_community_logo_url: string | null;
  status: string;
  allows_board_sharing: boolean;
  board_count: number;
  sharing_enabled: boolean;
}

export interface ImportableBoardsResponse {
  boards: ApiImportableBoard[];
  partnerships: ApiPartnershipWithSharing[];
}

// GET /api/communities/[communityId]/importable-boards - List boards available for import from partners
async function getImportableBoardsHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId } = params;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
  }

  if (!requestingUserId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
  }

  // Security check: Ensure the user is requesting boards for their own community
  if (communityId !== requestingUserCommunityId) {
    console.warn(`User ${requestingUserId} from community ${requestingUserCommunityId} attempted to fetch importable boards for community ${communityId}`);
    return NextResponse.json({ error: 'Forbidden: You can only fetch importable boards for your own community.' }, { status: 403 });
  }

  try {
    // First, get partnerships where the target community allows board sharing
    const partnershipsResult = await query(`
      SELECT 
        cp.id,
        cp.source_community_id as target_community_id,
        cp.status,
        cp.source_to_target_permissions,
        sc.name as target_community_name,
        sc.logo_url as target_community_logo_url,
        COUNT(b.id) as board_count
      FROM community_partnerships cp
      JOIN communities sc ON cp.source_community_id = sc.id
      LEFT JOIN boards b ON b.community_id = cp.source_community_id
      WHERE cp.target_community_id = $1 
        AND cp.status = 'accepted'
        AND cp.source_to_target_permissions->>'allowBoardSharing' = 'true'
      GROUP BY cp.id, cp.source_community_id, cp.status, cp.source_to_target_permissions, sc.name, sc.logo_url
      
      UNION
      
      SELECT 
        cp.id,
        cp.target_community_id,
        cp.status,
        cp.target_to_source_permissions as source_to_target_permissions,
        tc.name as target_community_name,
        tc.logo_url as target_community_logo_url,
        COUNT(b.id) as board_count
      FROM community_partnerships cp
      JOIN communities tc ON cp.target_community_id = tc.id
      LEFT JOIN boards b ON b.community_id = cp.target_community_id
      WHERE cp.source_community_id = $1 
        AND cp.status = 'accepted'
        AND cp.target_to_source_permissions->>'allowBoardSharing' = 'true'
      GROUP BY cp.id, cp.target_community_id, cp.status, cp.target_to_source_permissions, tc.name, tc.logo_url
    `, [communityId]);

    const partnerships: ApiPartnershipWithSharing[] = partnershipsResult.rows.map(row => ({
      id: row.id,
      target_community_id: row.target_community_id,
      target_community_name: row.target_community_name,
      target_community_logo_url: row.target_community_logo_url,
      status: row.status,
      allows_board_sharing: true, // We already filtered for this
      board_count: parseInt(row.board_count) || 0,
      sharing_enabled: true
    }));

    if (partnerships.length === 0) {
      return NextResponse.json({
        boards: [],
        partnerships: []
      });
    }

    // Get the community IDs that allow sharing
    const partnerCommunityIds = partnerships.map(p => p.target_community_id);

    if (partnerCommunityIds.length === 0) {
      return NextResponse.json({
        boards: [],
        partnerships: partnerships
      });
    }

    // Create placeholders for the IN clause
    const placeholders = partnerCommunityIds.map((_, index) => `$${index + 2}`).join(',');

    // Now get all non-role-gated boards from these communities
    const boardsResult = await query(`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.settings,
        b.community_id as source_community_id,
        b.created_at,
        c.name as source_community_name,
        c.logo_url as source_community_logo_url,
        COUNT(p.id) as post_count,
        MAX(p.created_at) as last_activity,
        CASE WHEN ib.id IS NOT NULL THEN true ELSE false END as is_already_imported
      FROM boards b
      JOIN communities c ON b.community_id = c.id
      LEFT JOIN posts p ON p.board_id = b.id
      LEFT JOIN imported_boards ib ON ib.source_board_id = b.id 
        AND ib.importing_community_id = $1 
        AND ib.is_active = true
      WHERE b.community_id IN (${placeholders})
      GROUP BY b.id, b.name, b.description, b.settings, b.community_id, b.created_at,
               c.name, c.logo_url, ib.id
      ORDER BY b.created_at DESC
    `, [communityId, ...partnerCommunityIds]);

    // Filter out role-gated boards
    const importableBoards: ApiImportableBoard[] = boardsResult.rows
      .filter(row => {
        const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
        return !SettingsUtils.hasPermissionRestrictions(settings);
      })
      .map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
        created_at: row.created_at,
        source_community_id: row.source_community_id,
        source_community_name: row.source_community_name,
        source_community_logo_url: row.source_community_logo_url,
        post_count: parseInt(row.post_count) || 0,
        last_activity: row.last_activity || row.created_at,
        is_already_imported: row.is_already_imported,
        is_role_gated: false // We already filtered these out
      }));

    console.log(`[API GET /api/communities/${communityId}/importable-boards] Found ${importableBoards.length} importable boards from ${partnerships.length} partnerships`);

    return NextResponse.json({
      boards: importableBoards,
      partnerships: partnerships
    });

  } catch (error) {
    console.error(`[API] Error fetching importable boards for community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch importable boards' }, { status: 500 });
  }
}

export const GET = withAuth(getImportableBoardsHandler, false); 