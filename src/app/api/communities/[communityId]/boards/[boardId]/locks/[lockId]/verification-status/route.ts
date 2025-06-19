/**
 * API Endpoint: GET /api/communities/[communityId]/boards/[boardId]/locks/[lockId]/verification-status
 * 
 * Returns verification status for a specific lock on a specific board for the current user.
 * Uses board verification context with longer expiration times.
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { GatingCategory } from '@/types/gating';

interface BoardLockVerificationStatusResponse {
  lockId: number;
  canComment: boolean;
  requireAll: boolean;
  totalCategories: number;
  verifiedCategories: number;
  categories: CategoryVerificationStatus[];
  message?: string;
}

interface CategoryVerificationStatus {
  type: string;
  verificationStatus: 'not_started' | 'verified' | 'expired';
  verifiedAt?: string;
  expiresAt?: string;
  metadata?: {
    icon: string;
    name: string;
    brandColor: string;
  };
}

// Category metadata (same as other gating endpoints)
const CATEGORY_METADATA = {
  universal_profile: {
    icon: '🆙',
    name: 'Universal Profile',
    brandColor: '#fe005b'
  },
  ethereum_profile: {
    icon: '⟠',
    name: 'Ethereum Profile', 
    brandColor: '#627eea'
  }
};

async function getBoardLockVerificationStatusHandler(
  req: AuthenticatedRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { communityId, boardId, lockId } = params;
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!communityId || !boardId || !lockId) {
      return NextResponse.json({ error: 'Community ID, Board ID, and Lock ID are required' }, { status: 400 });
    }

    // Verify board exists and has lock gating with this lock
    const boardResult = await query(
      `SELECT id, settings FROM boards WHERE id = $1 AND community_id = $2`,
      [boardId, communityId]
    );

    if (boardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const board = boardResult.rows[0];
    const boardSettings = board.settings || {};
    const lockGating = boardSettings.permissions?.locks;

    if (!lockGating || !lockGating.lockIds || !lockGating.lockIds.includes(parseInt(lockId, 10))) {
      return NextResponse.json({ error: 'Lock not configured for this board' }, { status: 404 });
    }

    // Fetch lock gating configuration
    const lockResult = await query(
      'SELECT id, name, gating_config FROM locks WHERE id = $1',
      [lockId]
    );

    if (lockResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lock not found' }, { status: 404 });
    }

    const lock = lockResult.rows[0];
    
    // Parse gating configuration
    let gatingConfig;
    try {
      gatingConfig = typeof lock.gating_config === 'string' 
        ? JSON.parse(lock.gating_config) 
        : lock.gating_config;
    } catch (error) {
      console.error(`[API] Failed to parse gating_config for lock ${lockId}:`, error);
      return NextResponse.json({ error: 'Invalid lock configuration' }, { status: 500 });
    }

    const gatingCategories: GatingCategory[] = gatingConfig.categories || [];
    
    // Backward compatibility: handle both requireAll and requireAny fields
    let requireAll: boolean;
    if (gatingConfig.requireAll !== undefined) {
      requireAll = gatingConfig.requireAll;
    } else if (gatingConfig.requireAny !== undefined) {
      requireAll = !gatingConfig.requireAny; // requireAny: false means requireAll: true
    } else {
      requireAll = false; // Default to requireAny behavior for backward compatibility
    }

    // Get current verification statuses for this user and specific lock (only non-expired)
    const verificationResult = await query(
      `SELECT category_type, verification_status, verified_at, expires_at 
       FROM pre_verifications 
       WHERE user_id = $1 AND lock_id = $2
         AND expires_at > NOW() AND verification_status = 'verified'`,
      [user.sub, lockId]
    );

    // Create a map of verified categories
    const verificationMap = new Map<string, { 
      verification_status: string; 
      verified_at?: string; 
      expires_at?: string; 
    }>();
    verificationResult.rows.forEach(row => {
      verificationMap.set(row.category_type, row);
    });

    // Build category verification status array
    const categoryStatuses: CategoryVerificationStatus[] = gatingCategories
      .filter(cat => cat.enabled)
      .map((category: GatingCategory) => {
        const verification = verificationMap.get(category.type);
        let verificationStatus: CategoryVerificationStatus['verificationStatus'] = 'not_started';

        if (verification) {
          if (verification.verification_status === 'verified') {
            verificationStatus = 'verified';
          }
        }

        return {
          type: category.type,
          verificationStatus,
          verifiedAt: verification?.verified_at,
          expiresAt: verification?.expires_at,
          metadata: CATEGORY_METADATA[category.type as keyof typeof CATEGORY_METADATA],
        };
      });

    // Calculate verification stats
    const enabledCategories = gatingCategories.filter(cat => cat.enabled);
    const verifiedCategories = categoryStatuses.filter(cat => cat.verificationStatus === 'verified').length;
    const totalCategories = enabledCategories.length;

    // Determine if user can comment based on fulfillment mode
    const canComment = requireAll 
      ? verifiedCategories >= totalCategories 
      : verifiedCategories >= 1;

    // Generate status message
    let message: string;
    if (canComment) {
      message = 'All verification requirements met - you can post and comment on this board';
    } else if (verifiedCategories > 0) {
      message = `${verifiedCategories} of ${totalCategories} requirements verified. ${
        requireAll 
          ? `Complete ${totalCategories - verifiedCategories} more to unlock access.`
          : 'Complete any remaining requirement to unlock access.'
      }`;
    } else {
      message = `Complete ${requireAll ? 'all' : 'any'} ${totalCategories} verification requirements to unlock board access`;
    }

    console.log(`[API board-lock-verification] Board ${boardId}, Lock ${lockId}: ${verifiedCategories}/${totalCategories} verified, can comment: ${canComment}`);

    const response: BoardLockVerificationStatusResponse = {
      lockId: parseInt(lockId, 10),
      canComment,
      requireAll,
      totalCategories,
      verifiedCategories,
      categories: categoryStatuses,
      message,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error fetching board lock verification status:`, error);
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
  }
}

export const GET = withAuth(getBoardLockVerificationStatusHandler); 