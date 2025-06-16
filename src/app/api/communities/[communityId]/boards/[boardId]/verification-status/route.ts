import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { SettingsUtils } from '@/types/settings';
import { 
  BoardVerificationStatus, 
  BoardVerificationApiResponse,
  LockVerificationStatus 
} from '@/types/boardVerification';
import { LockWithStats } from '@/types/locks';

// GET /api/communities/[communityId]/boards/[boardId]/verification-status
async function getBoardVerificationStatusHandler(
  req: AuthenticatedRequest, 
  context: RouteContext
) {
  const params = await context.params;
  const boardId = parseInt(params.boardId, 10);
  const communityId = params.communityId;
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;

  if (isNaN(boardId)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid board ID' 
    }, { status: 400 });
  }

  if (!currentUserId || !currentCommunityId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication required' 
    }, { status: 401 });
  }

  // Verify user belongs to the requested community
  if (communityId !== currentCommunityId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Access denied: community mismatch' 
    }, { status: 403 });
  }

  try {
    console.log(`[API] Fetching board verification status for board ${boardId}, user ${currentUserId}`);

    // Get board settings to check if lock gating is configured
    const boardResult = await query(
      'SELECT settings FROM boards WHERE id = $1 AND community_id = $2',
      [boardId, communityId]
    );

    if (boardResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Board not found' 
      }, { status: 404 });
    }

    const boardSettings = boardResult.rows[0].settings || {};
    const lockGating = SettingsUtils.getBoardLockGating(boardSettings);

    if (!lockGating || !lockGating.lockIds || lockGating.lockIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Board does not have lock gating configured' 
      }, { status: 400 });
    }

    console.log(`[API] Board ${boardId} has lock gating:`, lockGating);

    // Get lock details
    const lockIdsPlaceholders = lockGating.lockIds.map((_, index) => `$${index + 1}`).join(',');
    const locksResult = await query(
      `SELECT l.*, ls.posts_using_lock, u.name as creator_name
       FROM locks l
       LEFT JOIN lock_stats ls ON l.id = ls.id
       LEFT JOIN users u ON l.creator_user_id = u.user_id
       WHERE l.id IN (${lockIdsPlaceholders}) AND l.community_id = $${lockGating.lockIds.length + 1}`,
      [...lockGating.lockIds, communityId]
    );

    if (locksResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No locks found for this board' 
      }, { status: 404 });
    }

    // Transform locks to LockWithStats format
    const locks: LockWithStats[] = locksResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      icon: row.icon || undefined,
      color: row.color || undefined,
      gatingConfig: typeof row.gating_config === 'string' 
        ? JSON.parse(row.gating_config) 
        : row.gating_config,
      creatorUserId: row.creator_user_id,
      communityId: row.community_id,
      isTemplate: row.is_template,
      isPublic: row.is_public,
      tags: row.tags || [],
      usageCount: row.usage_count,
      successRate: row.success_rate,
      avgVerificationTime: row.avg_verification_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      postsUsingLock: row.posts_using_lock || 0,
      isOwned: row.creator_user_id === currentUserId,
      canEdit: row.creator_user_id === currentUserId,
      canDelete: row.creator_user_id === currentUserId
    }));

    // Check current verification status for each lock
    // For board-level gating, we'll check against a separate table or extend pre_verifications
    // For now, let's check if user has any recent verifications for these locks
    const verificationLockIdsPlaceholders = lockGating.lockIds.map((_, index) => `$${index + 2}`).join(',');
    const verificationResult = await query(
      `SELECT DISTINCT 
         pv.post_id,
         pv.category_type, 
         pv.verification_status, 
         pv.verified_at, 
         pv.expires_at,
         p.lock_id
       FROM pre_verifications pv
       JOIN posts p ON pv.post_id = p.id
       WHERE pv.user_id = $1 
         AND p.lock_id IN (${verificationLockIdsPlaceholders})
         AND pv.verification_status = 'verified'
         AND pv.expires_at > NOW()
       ORDER BY pv.verified_at DESC`,
      [currentUserId, ...lockGating.lockIds]
    );

    console.log(`[API] Found ${verificationResult.rows.length} recent verifications for user`);

    // Build lock status array
    const lockStatuses: LockVerificationStatus[] = locks.map(lock => {
      // Check if user has recent verification for this lock
      const recentVerification = verificationResult.rows.find(v => v.lock_id === lock.id);
      
      if (recentVerification) {
        return {
          lockId: lock.id,
          lock,
          verificationStatus: 'verified',
          verifiedAt: recentVerification.verified_at,
          expiresAt: recentVerification.expires_at
        };
      } else {
        return {
          lockId: lock.id,
          lock,
          verificationStatus: 'not_started',
          nextAction: {
            type: 'verify_requirements',
            label: 'Verify Requirements'
          }
        };
      }
    });

    // Calculate verification counts
    const verifiedCount = lockStatuses.filter(ls => ls.verificationStatus === 'verified').length;
    const requiredCount = lockGating.lockIds.length;

    // Determine if user has write access
    const hasWriteAccess = lockGating.fulfillment === 'any' 
      ? verifiedCount >= 1 
      : verifiedCount >= requiredCount;

    // Calculate expiry times
    const verifiedLocks = lockStatuses.filter(ls => ls.verificationStatus === 'verified');
    let expiresAt: string | undefined;
    let nextExpiryAt: string | undefined;

    if (verifiedLocks.length > 0) {
      const expiryTimes = verifiedLocks
        .map(ls => ls.expiresAt)
        .filter(Boolean)
        .map(time => new Date(time!).getTime())
        .sort((a, b) => a - b);

      if (expiryTimes.length > 0) {
        nextExpiryAt = new Date(expiryTimes[0]).toISOString();
        
        if (hasWriteAccess) {
          // For write access, use the earliest expiry that would break access
          if (lockGating.fulfillment === 'any') {
            // For ANY mode, access expires when the LAST verified lock expires
            expiresAt = new Date(expiryTimes[expiryTimes.length - 1]).toISOString();
          } else {
            // For ALL mode, access expires when the FIRST lock expires
            expiresAt = nextExpiryAt;
          }
        }
      }
    }

    const response: BoardVerificationStatus = {
      boardId,
      hasWriteAccess,
      fulfillmentMode: lockGating.fulfillment,
      verificationDuration: lockGating.verificationDuration || 4,
      lockStatuses,
      verifiedCount,
      requiredCount,
      expiresAt,
      nextExpiryAt
    };

    console.log(`[API] Board verification status:`, {
      boardId,
      hasWriteAccess,
      verifiedCount,
      requiredCount,
      fulfillment: lockGating.fulfillment
    });

    const apiResponse: BoardVerificationApiResponse = {
      success: true,
      data: response
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error(`[API] Error fetching board verification status:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch board verification status'
    }, { status: 500 });
  }
}

export const GET = withAuth(getBoardVerificationStatusHandler, false); 