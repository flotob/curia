/**
 * API Endpoint: GET /api/locks/[lockId]/verification-status
 * 
 * Generic lock verification status endpoint that works for all contexts.
 * Replaces:
 * - GET /api/posts/{postId}/verification-status
 * - GET /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/verification-status
 * 
 * Usage:
 * - GET /api/locks/123/verification-status?context=post:456
 * - GET /api/locks/123/verification-status?context=board:789
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { GatingCategory } from '@/types/gating';

interface GenericVerificationStatusResponse {
  canAccess: boolean;
  lockId: number;
  context: { type: string; id: number };
  requireAll: boolean;
  totalCategories: number;
  verifiedCategories: number;
  categories: CategoryVerificationStatus[];
  expiresAt?: string;
  message?: string;
}

interface CategoryVerificationStatus {
  type: string;
  verificationStatus: 'not_started' | 'pending' | 'verified' | 'expired';
  fulfillment?: 'any' | 'all';
  verifiedAt?: string;
  expiresAt?: string;
  metadata?: {
    icon: string;
    name: string;
    brandColor: string;
  };
}

// Category metadata
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

async function getGenericVerificationStatusHandler(
  req: AuthenticatedRequest,
  context: RouteContext
) {
  const user = req.user;
  const params = await context.params;
  const lockId = parseInt(params.lockId!, 10);

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (isNaN(lockId)) {
    return NextResponse.json({ error: 'Invalid lock ID' }, { status: 400 });
  }

  try {
    // Parse context from query parameter
    const url = new URL(req.url);
    const contextParam = url.searchParams.get('context');
    
    if (!contextParam) {
      return NextResponse.json({ error: 'Context parameter required (e.g., ?context=post:123)' }, { status: 400 });
    }

    const [contextType, contextIdStr] = contextParam.split(':');
    const contextId = parseInt(contextIdStr, 10);

    if (!contextType || isNaN(contextId)) {
      return NextResponse.json({ error: 'Invalid context format. Use: post:123 or board:456' }, { status: 400 });
    }

    console.log(`[API] Generic verification status for lock ${lockId}, context: ${contextType}:${contextId}, user: ${user.sub}`);

    // Fetch lock configuration
    const lockResult = await query(
      'SELECT id, name, gating_config, community_id FROM locks WHERE id = $1',
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
    
    // Determine fulfillment mode (backward compatibility)
    let requireAll: boolean;
    if (gatingConfig.requireAll !== undefined) {
      requireAll = gatingConfig.requireAll;
    } else if (gatingConfig.requireAny !== undefined) {
      requireAll = !gatingConfig.requireAny;
    } else {
      requireAll = false; // Default to requireAny behavior
    }

    // Get current verification statuses for this user and lock (only non-expired)
    const verificationResult = await query(
      `SELECT category_type, verification_status, verified_at, expires_at 
       FROM pre_verifications 
       WHERE user_id = $1 AND lock_id = $2 AND expires_at > NOW() AND verification_status = 'verified'`,
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
          fulfillment: category.fulfillment,
          verifiedAt: verification?.verified_at,
          expiresAt: verification?.expires_at,
          metadata: CATEGORY_METADATA[category.type as keyof typeof CATEGORY_METADATA],
        };
      });

    // Calculate verification stats
    const enabledCategories = gatingCategories.filter(cat => cat.enabled);
    const verifiedCategories = categoryStatuses.filter(cat => cat.verificationStatus === 'verified').length;
    const totalCategories = enabledCategories.length;

    // Determine if user can access based on fulfillment mode
    const canAccess = requireAll 
      ? verifiedCategories >= totalCategories 
      : verifiedCategories >= 1;

    // Calculate expiry time (when access will be lost)
    let expiresAt: string | undefined;
    if (canAccess) {
      const verifiedCats = categoryStatuses.filter(cat => cat.verificationStatus === 'verified');
      if (verifiedCats.length > 0) {
        const expiryTimes = verifiedCats
          .map(cat => cat.expiresAt)
          .filter(Boolean)
          .map(time => new Date(time!).getTime())
          .sort((a, b) => a - b);

        if (expiryTimes.length > 0) {
          if (requireAll) {
            // For ALL mode, access expires when the FIRST lock expires
            expiresAt = new Date(expiryTimes[0]).toISOString();
          } else {
            // For ANY mode, access expires when the LAST verified lock expires
            expiresAt = new Date(expiryTimes[expiryTimes.length - 1]).toISOString();
          }
        }
      }
    }

    // Generate status message
    let message: string;
    if (canAccess) {
      message = 'All verification requirements met - access granted';
    } else if (verifiedCategories > 0) {
      message = `${verifiedCategories} of ${totalCategories} requirements verified. ${
        requireAll 
          ? `Complete ${totalCategories - verifiedCategories} more to unlock access.`
          : 'Complete any remaining requirement to unlock access.'
      }`;
    } else {
      message = `Complete ${requireAll ? 'all' : 'any'} ${totalCategories} verification requirements to unlock access`;
    }

    console.log(`[API] Lock ${lockId} verification status: ${verifiedCategories}/${totalCategories} verified, can access: ${canAccess}`);

    const response: GenericVerificationStatusResponse = {
      canAccess,
      lockId,
      context: { type: contextType, id: contextId },
      requireAll,
      totalCategories,
      verifiedCategories,
      categories: categoryStatuses,
      expiresAt,
      message,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error fetching generic verification status for lock ${lockId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
  }
}

export const GET = withAuth(getGenericVerificationStatusHandler); 