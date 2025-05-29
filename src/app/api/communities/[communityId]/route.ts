import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { CommunitySettings } from '@/types/settings';

interface CommunityRouteParams {
  params: {
    communityId: string;
  };
}

export interface ApiCommunity {
  id: string;
  name: string;
  settings: CommunitySettings;
  created_at: string;
  updated_at: string;
  // Computed fields:
  user_can_access?: boolean;  // Based on current user's roles
}

// GET /api/communities/[communityId] - Get community info with settings
async function getCommunityHandler(req: AuthenticatedRequest, context: CommunityRouteParams) {
  const params = await context.params;
  const communityId = params.communityId;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
  }

  // Security check: Ensure the user is requesting their own community
  if (communityId !== requestingUserCommunityId) {
    console.warn(`User ${requestingUserId} from community ${requestingUserCommunityId} attempted to fetch community ${communityId}`);
    if (!req.user?.adm) {
      return NextResponse.json({ error: 'Forbidden: You can only access your own community.' }, { status: 403 });
    }
  }

  try {
    const result = await query(
      'SELECT id, name, settings, created_at, updated_at FROM communities WHERE id = $1',
      [communityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const community = result.rows[0];
    const communityResponse: ApiCommunity = {
      ...community,
      settings: typeof community.settings === 'string' ? JSON.parse(community.settings) : community.settings,
      user_can_access: true // If user can access this endpoint, they have community access
    };

    return NextResponse.json(communityResponse);

  } catch (error) {
    console.error(`[API] Error fetching community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch community' }, { status: 500 });
  }
}

// PATCH /api/communities/[communityId] - Update community settings (Admin only)
async function updateCommunityHandler(req: AuthenticatedRequest, context: CommunityRouteParams) {
  const params = await context.params;
  const communityId = params.communityId;
  const requestingUserId = req.user?.sub;
  const requestingUserCommunityId = req.user?.cid;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
  }

  // Security check: Only allow updating user's own community
  if (communityId !== requestingUserCommunityId) {
    return NextResponse.json({ error: 'Forbidden: You can only update your own community.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    console.log(`[API] Updating community ${communityId} with body:`, JSON.stringify(body, null, 2));
    
    const { name, settings = {} } = body;

    // Validate settings if provided
    if (settings && Object.keys(settings).length > 0) {
      // Basic validation - could be enhanced with a proper schema validator
      if (settings.permissions?.allowedRoles && !Array.isArray(settings.permissions.allowedRoles)) {
        return NextResponse.json({ error: 'allowedRoles must be an array' }, { status: 400 });
      }

      // Validate that allowedRoles are strings
      if (settings.permissions?.allowedRoles) {
        for (const roleId of settings.permissions.allowedRoles) {
          if (typeof roleId !== 'string' || roleId.trim() === '') {
            return NextResponse.json({ error: 'All role IDs must be non-empty strings' }, { status: 400 });
          }
        }
      }
    }

    // Ensure settings can be JSON stringified
    let settingsJson: string;
    try {
      settingsJson = JSON.stringify(settings);
      console.log(`[API] Settings JSON length: ${settingsJson.length} chars`);
    } catch (jsonError) {
      console.error(`[API] JSON stringify error:`, jsonError);
      return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
    }

    // Update community with new settings
    console.log(`[API] Executing UPDATE query for community ${communityId}`);
    const result = await query(
      'UPDATE communities SET name = COALESCE($1, name), settings = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name?.trim() || null, settingsJson, communityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const updatedCommunity = result.rows[0];
    console.log(`[API] Community updated successfully: ${updatedCommunity.name} (ID: ${updatedCommunity.id})`);

    // Parse settings for response
    const communityResponse: ApiCommunity = {
      ...updatedCommunity,
      settings: typeof updatedCommunity.settings === 'string' ? JSON.parse(updatedCommunity.settings) : updatedCommunity.settings
    };

    return NextResponse.json(communityResponse);

  } catch (error) {
    console.error(`[API] Error updating community ${communityId}:`, error);
    console.error(`[API] Error stack:`, error instanceof Error ? error.stack : 'No stack available');
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    // Check for database-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error(`[API] Database error code:`, (error as any).code);
    }
    
    return NextResponse.json({ 
      error: 'Failed to update community', 
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    }, { status: 500 });
  }
}

export const GET = withAuth(getCommunityHandler, false); // All authenticated users can access their own community
export const PATCH = withAuth(updateCommunityHandler, true); // Admin only for updates 