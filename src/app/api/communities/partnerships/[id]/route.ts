import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { 
  CommunityPartnership,
  UpdatePartnershipRequest,
  PartnershipResponse,
  PartnershipRow,
  PartnershipPermissions,
  PartnershipStatus
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
    
    // Can resume if: either community member + status is suspended
    partnership.canResume = (isSourceCommunity || isTargetCommunity) && row.status === 'suspended';
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
    'allowPresenceSharing'
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

// Get partnership with joined data
async function getPartnershipWithDetails(partnershipId: number) {
  const partnershipQuery = `
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
    WHERE cp.id = $1
  `;
  
  const result = await query(partnershipQuery, [partnershipId]);
  return result.rows[0] || null;
}

// GET /api/communities/partnerships/[id] - Get partnership details
async function getPartnershipHandler(req: AuthenticatedRequest, context: RouteContext) {
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  
  if (!currentCommunityId) {
    return NextResponse.json({ error: 'Community context required' }, { status: 400 });
  }
  
  try {
    const params = await context.params;
    const partnershipId = parseInt(params.id, 10);
    
    if (isNaN(partnershipId)) {
      return NextResponse.json({ error: 'Invalid partnership ID' }, { status: 400 });
    }
    
    console.log(`[API GET /api/communities/partnerships/${partnershipId}] User ${currentUserId} requesting partnership details`);
    
    const row = await getPartnershipWithDetails(partnershipId);
    
    if (!row) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }
    
    // Check if user has access to this partnership
    const hasAccess = row.source_community_id === currentCommunityId || 
                     row.target_community_id === currentCommunityId;
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }
    
    const partnership = transformPartnershipRow(row, currentUserId, currentCommunityId);
    
    const response: PartnershipResponse = {
      success: true,
      data: partnership
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[API GET /api/communities/partnerships/[id]] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch partnership' 
    }, { status: 500 });
  }
}

// PUT /api/communities/partnerships/[id] - Update partnership (accept/reject/cancel/suspend)
async function updatePartnershipHandler(req: AuthenticatedRequest, context: RouteContext) {
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  
  if (!currentCommunityId || !currentUserId) {
    return NextResponse.json({ error: 'Authentication and community context required' }, { status: 401 });
  }
  
  try {
    const params = await context.params;
    const partnershipId = parseInt(params.id, 10);
    
    if (isNaN(partnershipId)) {
      return NextResponse.json({ error: 'Invalid partnership ID' }, { status: 400 });
    }
    
    const body: UpdatePartnershipRequest = await req.json();
    const { status, sourceToTargetPermissions, targetToSourcePermissions, responseMessage } = body;
    
    console.log(`[API PUT /api/communities/partnerships/${partnershipId}] User ${currentUserId} updating partnership`);
    
    const row = await getPartnershipWithDetails(partnershipId);
    
    if (!row) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }
    
    // Check if user has access to this partnership
    const isSourceCommunity = row.source_community_id === currentCommunityId;
    const isTargetCommunity = row.target_community_id === currentCommunityId;
    const isInviter = row.invited_by_user_id === currentUserId;
    
    if (!isSourceCommunity && !isTargetCommunity) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }
    
    // Validate permissions if provided
    if (sourceToTargetPermissions) {
      const validation = validatePermissions(sourceToTargetPermissions);
      if (!validation.valid) {
        return NextResponse.json({ 
          error: 'Invalid source to target permissions', 
          details: validation.errors 
        }, { status: 400 });
      }
    }
    
    if (targetToSourcePermissions) {
      const validation = validatePermissions(targetToSourcePermissions);
      if (!validation.valid) {
        return NextResponse.json({ 
          error: 'Invalid target to source permissions', 
          details: validation.errors 
        }, { status: 400 });
      }
    }
    
    // Handle status updates with business logic
    if (status) {
      const currentStatus = row.status as PartnershipStatus;
      
      // Validate status transitions
      if (status === 'accepted' && currentStatus === 'pending') {
        // Only target community can accept
        if (!isTargetCommunity) {
          return NextResponse.json({ error: 'Only target community can accept partnership' }, { status: 403 });
        }
      } else if (status === 'rejected' && currentStatus === 'pending') {
        // Only target community can reject
        if (!isTargetCommunity) {
          return NextResponse.json({ error: 'Only target community can reject partnership' }, { status: 403 });
        }
      } else if (status === 'cancelled' && currentStatus === 'pending') {
        // Only source community (inviter) can cancel
        if (!isSourceCommunity || !isInviter) {
          return NextResponse.json({ error: 'Only the inviter can cancel pending partnership' }, { status: 403 });
        }
      } else if (status === 'suspended' && currentStatus === 'accepted') {
        // Either community can suspend active partnership
        if (!isSourceCommunity && !isTargetCommunity) {
          return NextResponse.json({ error: 'Insufficient permissions to suspend partnership' }, { status: 403 });
        }
      } else if (status === 'accepted' && currentStatus === 'suspended') {
        // Either community can resume suspended partnership
        if (!isSourceCommunity && !isTargetCommunity) {
          return NextResponse.json({ error: 'Insufficient permissions to resume partnership' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: `Invalid status transition: ${currentStatus} -> ${status}` }, { status: 400 });
      }
    }
    
    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: (string | number | boolean | null)[] = [];
    let paramIndex = 1;
    
    if (status) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
      
      // Set response tracking fields
      if (status === 'accepted' || status === 'rejected') {
        updateFields.push(`responded_by_user_id = $${paramIndex}`);
        updateValues.push(currentUserId);
        paramIndex++;
        
        updateFields.push(`responded_at = NOW()`);
        
        if (status === 'accepted') {
          updateFields.push(`partnership_started_at = NOW()`);
        }
      } else if (status === 'suspended') {
        updateFields.push(`partnership_ended_at = NOW()`);
      }
      
      // Handle resuming suspended partnership
      if (status === 'accepted' && row.status === 'suspended') {
        updateFields.push(`partnership_started_at = NOW()`);
        updateFields.push(`partnership_ended_at = NULL`);
      }
    }
    
    if (sourceToTargetPermissions) {
      updateFields.push(`source_to_target_permissions = $${paramIndex}`);
      updateValues.push(JSON.stringify(sourceToTargetPermissions));
      paramIndex++;
    }
    
    if (targetToSourcePermissions) {
      updateFields.push(`target_to_source_permissions = $${paramIndex}`);
      updateValues.push(JSON.stringify(targetToSourcePermissions));
      paramIndex++;
    }
    
    if (responseMessage !== undefined) {
      updateFields.push(`response_message = $${paramIndex}`);
      updateValues.push(responseMessage?.trim() || null);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    // Add updated_at
    updateFields.push(`updated_at = NOW()`);
    
    // Add partnership ID for WHERE clause
    updateValues.push(partnershipId);
    
    const updateQuery = `
      UPDATE community_partnerships 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    await query(updateQuery, updateValues);
    
    // Fetch updated partnership with joined data
    const updatedRow = await getPartnershipWithDetails(partnershipId);
    const updatedPartnership = transformPartnershipRow(updatedRow, currentUserId, currentCommunityId);
    
    console.log(`[API PUT /api/communities/partnerships/${partnershipId}] Partnership updated: status=${status || 'unchanged'} by user ${currentUserId}`);
    
    // TODO: Emit real-time event for partnership update
    // TODO: Send notifications for status changes
    
    const response: PartnershipResponse = {
      success: true,
      data: updatedPartnership
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[API PUT /api/communities/partnerships/[id]] Error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update partnership' 
    }, { status: 500 });
  }
}

// DELETE /api/communities/partnerships/[id] - Delete partnership (admin only)
async function deletePartnershipHandler(req: AuthenticatedRequest, context: RouteContext) {
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  const isAdmin = req.user?.adm || false;
  
  if (!currentCommunityId || !currentUserId) {
    return NextResponse.json({ error: 'Authentication and community context required' }, { status: 401 });
  }
  
  try {
    const params = await context.params;
    const partnershipId = parseInt(params.id, 10);
    
    if (isNaN(partnershipId)) {
      return NextResponse.json({ error: 'Invalid partnership ID' }, { status: 400 });
    }
    
    console.log(`[API DELETE /api/communities/partnerships/${partnershipId}] User ${currentUserId} attempting to delete partnership`);
    
    const row = await getPartnershipWithDetails(partnershipId);
    
    if (!row) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }
    
    // Check if user has access to this partnership
    const isSourceCommunity = row.source_community_id === currentCommunityId;
    const isTargetCommunity = row.target_community_id === currentCommunityId;
    const isInviter = row.invited_by_user_id === currentUserId;
    
    if (!isSourceCommunity && !isTargetCommunity) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }
    
    // Only allow deletion if:
    // 1. User is admin (superadmin), OR
    // 2. User is the inviter and partnership is pending/rejected/cancelled
    const canDelete = isAdmin || 
                     (isInviter && ['pending', 'rejected', 'cancelled'].includes(row.status));
    
    if (!canDelete) {
      return NextResponse.json({ 
        error: 'Cannot delete active partnerships. Use suspend instead.' 
      }, { status: 403 });
    }
    
    // Delete the partnership
    await query('DELETE FROM community_partnerships WHERE id = $1', [partnershipId]);
    
    console.log(`[API DELETE /api/communities/partnerships/${partnershipId}] Partnership deleted by user ${currentUserId}`);
    
    // TODO: Emit real-time event for partnership deletion
    
    return NextResponse.json({ 
      success: true, 
      message: 'Partnership deleted successfully' 
    });
    
  } catch (error) {
    console.error('[API DELETE /api/communities/partnerships/[id]] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete partnership' 
    }, { status: 500 });
  }
}

export const GET = withAuth(getPartnershipHandler, false);
export const PUT = withAuth(updatePartnershipHandler, false);
export const DELETE = withAuth(deletePartnershipHandler, false); 