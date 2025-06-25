import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { 
  CommunityPartnership,
  CreatePartnershipRequest,
  PartnershipListResponse,
  PartnershipResponse,
  PartnershipRow,
  PartnershipPermissions,
  PartnershipStatus,
  PartnershipType
} from '@/types/partnerships';

// Transform database row to API partnership object
function transformPartnershipRow(row: PartnershipRow, currentUserId?: string, currentCommunityId?: string): CommunityPartnership {
  const partnership: CommunityPartnership = {
    id: row.id,
    sourceCommunityId: row.source_community_id,
    targetCommunityId: row.target_community_id,
    status: row.status,
    relationshipType: row.relationship_type,
    sourceToTargetPermissions: row.source_to_target_permissions as PartnershipPermissions,
    targetToSourcePermissions: row.target_to_source_permissions as PartnershipPermissions,
    invitedByUserId: row.invited_by_user_id,
    invitedAt: row.invited_at,
    respondedByUserId: row.responded_by_user_id,
    respondedAt: row.responded_at,
    partnershipStartedAt: row.partnership_started_at,
    partnershipEndedAt: row.partnership_ended_at,
    inviteMessage: row.invite_message,
    responseMessage: row.response_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Computed fields from joins
    sourceCommunityName: row.source_community_name,
    sourceCommunityLogoUrl: row.source_community_logo_url,
    targetCommunityName: row.target_community_name,
    targetCommunityLogoUrl: row.target_community_logo_url,
    invitedByUserName: row.invited_by_user_name,
    respondedByUserName: row.responded_by_user_name
  };

  // Add permission flags based on user context
  if (currentUserId && currentCommunityId) {
    const isSourceCommunity = row.source_community_id === currentCommunityId;
    const isTargetCommunity = row.target_community_id === currentCommunityId;
    const isInviter = row.invited_by_user_id === currentUserId;
    
    // Can respond if: target community member + status is pending
    partnership.canRespond = isTargetCommunity && row.status === 'pending';
    
    // Can cancel if: source community member + status is pending + invited by current user
    partnership.canCancel = isSourceCommunity && row.status === 'pending' && isInviter;
    
    // Can suspend if: either community member + status is accepted
    partnership.canSuspend = (isSourceCommunity || isTargetCommunity) && row.status === 'accepted';
  }

  return partnership;
}

// Validate partnership permissions
function validatePermissions(permissions: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!permissions || typeof permissions !== 'object') {
    errors.push('Permissions must be an object');
    return { valid: false, errors };
  }
  
  const perms = permissions as Record<string, unknown>;
  
  // Validate boolean fields
  const booleanFields = [
    'allowCrossCommunityNavigation',
    'allowCrossCommunityNotifications', 
    'allowCrossCommunitySearch',
    'allowPresenceSharing',
    'allowBoardSharing'
  ];
  
  for (const field of booleanFields) {
    if (perms[field] !== undefined && typeof perms[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }
  
  // Validate customSettings if present
  if (perms.customSettings !== undefined) {
    if (typeof perms.customSettings !== 'object' || perms.customSettings === null) {
      errors.push('customSettings must be an object');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// GET /api/communities/partnerships - List partnerships for current community
async function getPartnershipsHandler(req: AuthenticatedRequest) {
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  
  if (!currentCommunityId) {
    return NextResponse.json({ error: 'Community context required' }, { status: 400 });
  }
  
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as PartnershipStatus | null;
  const type = searchParams.get('type') as PartnershipType | null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  
  try {
    console.log(`[API GET /api/communities/partnerships] User ${currentUserId} requesting partnerships for community ${currentCommunityId}`);
    
    // Build dynamic query
    const queryParams: (string | number)[] = [currentCommunityId, currentCommunityId];
    let whereClause = 'WHERE (cp.source_community_id = $1 OR cp.target_community_id = $2)';
    let paramIndex = 3;
    
    // Add status filter
    if (status) {
      whereClause += ` AND cp.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Add type filter
    if (type) {
      whereClause += ` AND cp.relationship_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }
    
    // Main query with community and user info
    const mainQuery = `
      SELECT 
        cp.*,
        sc.name as source_community_name,
        sc.logo_url as source_community_logo_url,
        tc.name as target_community_name,
        tc.logo_url as target_community_logo_url,
        iu.name as invited_by_user_name,
        ru.name as responded_by_user_name
      FROM community_partnerships cp
      LEFT JOIN communities sc ON cp.source_community_id = sc.id
      LEFT JOIN communities tc ON cp.target_community_id = tc.id
      LEFT JOIN users iu ON cp.invited_by_user_id = iu.user_id
      LEFT JOIN users ru ON cp.responded_by_user_id = ru.user_id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN cp.status = 'pending' THEN 1
          WHEN cp.status = 'accepted' THEN 2
          ELSE 3
        END,
        cp.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    
    // Execute main query
    const result = await query(mainQuery, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM community_partnerships cp
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total, 10);
    
    // Transform results
    const partnerships: CommunityPartnership[] = result.rows.map((row: PartnershipRow) => 
      transformPartnershipRow(row, currentUserId, currentCommunityId)
    );
    
    console.log(`[API GET /api/communities/partnerships] Returning ${partnerships.length} partnerships (${total} total)`);
    
    const response: PartnershipListResponse = {
      success: true,
      data: partnerships,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + limit < total
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[API GET /api/communities/partnerships] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch partnerships' 
    }, { status: 500 });
  }
}

// POST /api/communities/partnerships - Create new partnership invitation
async function createPartnershipHandler(req: AuthenticatedRequest) {
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  
  if (!currentCommunityId || !currentUserId) {
    return NextResponse.json({ error: 'Authentication and community context required' }, { status: 401 });
  }
  
  try {
    const body: CreatePartnershipRequest = await req.json();
    const { 
      targetCommunityId, 
      relationshipType, 
      sourceToTargetPermissions, 
      targetToSourcePermissions,
      inviteMessage 
    } = body;
    
    // Validate required fields
    if (!targetCommunityId || !targetCommunityId.trim()) {
      return NextResponse.json({ error: 'Target community ID is required' }, { status: 400 });
    }
    
    if (!relationshipType || !['partner', 'ecosystem'].includes(relationshipType)) {
      return NextResponse.json({ error: 'Valid relationship type is required' }, { status: 400 });
    }
    
    // Validate permissions
    const sourcePermValidation = validatePermissions(sourceToTargetPermissions);
    if (!sourcePermValidation.valid) {
      return NextResponse.json({ 
        error: 'Invalid source to target permissions', 
        details: sourcePermValidation.errors 
      }, { status: 400 });
    }
    
    const targetPermValidation = validatePermissions(targetToSourcePermissions);
    if (!targetPermValidation.valid) {
      return NextResponse.json({ 
        error: 'Invalid target to source permissions', 
        details: targetPermValidation.errors 
      }, { status: 400 });
    }
    
    // Prevent self-partnership
    if (targetCommunityId === currentCommunityId) {
      return NextResponse.json({ error: 'Cannot create partnership with own community' }, { status: 400 });
    }
    
    // Check if target community exists
    const targetCommunity = await query(
      'SELECT id, name FROM communities WHERE id = $1',
      [targetCommunityId]
    );
    
    if (targetCommunity.rows.length === 0) {
      return NextResponse.json({ error: 'Target community not found' }, { status: 404 });
    }
    
    // Check for existing partnership
    const existingPartnership = await query(
      `SELECT id, status FROM community_partnerships 
       WHERE (source_community_id = $1 AND target_community_id = $2) 
          OR (source_community_id = $2 AND target_community_id = $1)`,
      [currentCommunityId, targetCommunityId]
    );
    
    if (existingPartnership.rows.length > 0) {
      const existing = existingPartnership.rows[0];
      if (existing.status === 'pending') {
        return NextResponse.json({ error: 'Partnership request already pending' }, { status: 409 });
      } else if (existing.status === 'accepted') {
        return NextResponse.json({ error: 'Partnership already exists' }, { status: 409 });
      }
      // If rejected/cancelled/expired, we can create a new one (will be handled by unique constraint)
    }
    
    // Create new partnership
    const result = await query(`
      INSERT INTO community_partnerships (
        source_community_id, target_community_id, relationship_type,
        source_to_target_permissions, target_to_source_permissions,
        invited_by_user_id, invite_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      currentCommunityId,
      targetCommunityId,
      relationshipType,
      JSON.stringify(sourceToTargetPermissions),
      JSON.stringify(targetToSourcePermissions),
      currentUserId,
      inviteMessage?.trim() || null
    ]);
    
    // Fetch the complete partnership with joined data
    const partnershipQuery = `
      SELECT 
        cp.*,
        sc.name as source_community_name,
        sc.logo_url as source_community_logo_url,
        tc.name as target_community_name,
        tc.logo_url as target_community_logo_url,
        iu.name as invited_by_user_name
      FROM community_partnerships cp
      LEFT JOIN communities sc ON cp.source_community_id = sc.id
      LEFT JOIN communities tc ON cp.target_community_id = tc.id
      LEFT JOIN users iu ON cp.invited_by_user_id = iu.user_id
      WHERE cp.id = $1
    `;
    
    const partnershipResult = await query(partnershipQuery, [result.rows[0].id]);
    const newPartnership = transformPartnershipRow(partnershipResult.rows[0], currentUserId, currentCommunityId);
    
    console.log(`[API POST /api/communities/partnerships] Partnership created: ${currentCommunityId} -> ${targetCommunityId} (ID: ${newPartnership.id}) by user ${currentUserId}`);
    
    // 🚀 EMIT REAL-TIME EVENT: Partnership invitation created (to target community admins only)
    const emitter = process.customEventEmitter;
    if (emitter && typeof emitter.emit === 'function') {
      emitter.emit('broadcastEvent', {
        room: `community:${targetCommunityId}:admins`, // 🎯 ADMIN-ONLY TARGET COMMUNITY
        eventName: 'partnershipInviteReceived',
        payload: {
          type: 'created',
          partnership: newPartnership,
          actor_name: currentUserId, // Could enhance with actual user name if available
          communityId: targetCommunityId // Target community gets the notification
        }
      });
      console.log(`[Partnership Events] Emitted partnershipInviteReceived to target community ${targetCommunityId} admins`);
    } else {
      console.warn('[Partnership Events] customEventEmitter not available for partnership invite notification');
    }
    
    const response: PartnershipResponse = {
      success: true,
      data: newPartnership
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('[API POST /api/communities/partnerships] Error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create partnership' 
    }, { status: 500 });
  }
}

export const GET = withAuth(getPartnershipsHandler, false);
export const POST = withAuth(createPartnershipHandler, false); 