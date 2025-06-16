/**
 * API Endpoint: GET /api/posts/[postId]/gating-requirements
 * 
 * Returns gating categories for a post and the current user's verification status
 * for each category. Used by the slot-based verification UI.
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { SettingsUtils, PostSettings } from '@/types/settings';
import { GatingCategory } from '@/types/gating';

interface GatingRequirementResponse {
  postId: number;
  requireAll: boolean;
  categories: CategoryStatus[];
}

interface CategoryStatus {
  type: string;
  enabled: boolean;
  requirements: unknown;
  verificationStatus: 'not_started' | 'pending' | 'verified' | 'expired';
  verifiedAt?: string;
  expiresAt?: string;
  metadata?: {
    name: string;
    description: string;
    icon: string;
  };
  verificationData?: {
    walletAddress?: string;
    verifiedProfiles?: {
      displayName?: string;
      username?: string;
      avatar?: string;
      ensName?: string;
      isVerified?: boolean;
    };
    verifiedBalances?: {
      native?: string;
      tokens?: Array<{
        address: string;
        symbol: string;
        name?: string;
        balance: string;
        formattedBalance: string;
      }>;
    };
    verifiedSocial?: {
      followerCount?: number;
      followingAddresses?: string[];
      followedByAddresses?: string[];
    };
    signature?: string;
    challenge?: unknown;
  };
}

// Category metadata for display
const CATEGORY_METADATA = {
  universal_profile: {
    name: 'LUKSO Universal Profile',
    description: 'Verify your Universal Profile and token holdings',
    icon: 'UserCheck',
  },
  ethereum_profile: {
    name: 'Ethereum Profile',
    description: 'Verify your Ethereum address, ENS domain, and token holdings',
    icon: 'Shield',
  },
};

async function getGatingRequirementsHandler(
  req: AuthenticatedRequest,
  context: RouteContext
) {
  const user = req.user;
  const params = await context.params;
  const postId = parseInt(params.postId!, 10);

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    // Get post settings, lock data and verify access
    const postResult = await query(
      `SELECT p.settings as post_settings, p.board_id, p.lock_id, b.community_id, 
              b.settings as board_settings, l.gating_config as lock_gating_config
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       LEFT JOIN locks l ON p.lock_id = l.id
       WHERE p.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { post_settings, community_id, lock_id, lock_gating_config } = postResult.rows[0];

    // Verify user has access to this community
    if (community_id !== user.cid) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Parse post settings
    const postSettings: PostSettings = typeof post_settings === 'string' 
      ? JSON.parse(post_settings) 
      : (post_settings || {});

    // Check if post has any gating (legacy OR lock-based)
    const hasLegacyGating = SettingsUtils.hasAnyGating(postSettings);
    const hasLockGating = !!lock_id && !!lock_gating_config;
    
    if (!hasLegacyGating && !hasLockGating) {
      return NextResponse.json({
        postId,
        requireAll: false,
        categories: [],
      } as GatingRequirementResponse);
    }

    // Determine which gating configuration to use
    let gatingCategories: GatingCategory[];
    let requireAll: boolean;
    
    if (hasLockGating) {
      // Use lock-based gating configuration
      const lockGatingConfig = typeof lock_gating_config === 'string' 
        ? JSON.parse(lock_gating_config) 
        : lock_gating_config;
      
      gatingCategories = lockGatingConfig.categories || [];
      // Backward compatibility: handle both requireAll and requireAny fields
      if (lockGatingConfig.requireAll !== undefined) {
        requireAll = lockGatingConfig.requireAll;
      } else if (lockGatingConfig.requireAny !== undefined) {
        requireAll = !lockGatingConfig.requireAny; // requireAny: false means requireAll: true
      } else {
        requireAll = false; // Default to requireAny behavior for backward compatibility
      }
      
      console.log(`[API gating-requirements] Using lock-based gating for post ${postId}, lock_id: ${lock_id}`);
    } else {
      // Use legacy post settings gating
      gatingCategories = SettingsUtils.getGatingCategories(postSettings);
      requireAll = postSettings.responsePermissions?.requireAll || false;
      
      console.log(`[API gating-requirements] Using legacy gating for post ${postId}`);
    }

    // Get current verification statuses for this user (including verification_data)
    const verificationResult = await query(
      `SELECT category_type, verification_status, verified_at, expires_at, verification_data 
       FROM pre_verifications 
       WHERE user_id = $1 AND post_id = $2 AND expires_at > NOW()`,
      [user.sub, postId]
    );

    const verificationMap = new Map<string, { 
      verification_status: string; 
      verified_at?: string; 
      expires_at?: string; 
      verification_data?: unknown;
    }>();
    verificationResult.rows.forEach(row => {
      verificationMap.set(row.category_type, row);
    });

    // Build category status array
    const categoryStatuses: CategoryStatus[] = gatingCategories.map((category: GatingCategory) => {
      const verification = verificationMap.get(category.type);
      let verificationStatus: CategoryStatus['verificationStatus'] = 'not_started';

      if (verification) {
        verificationStatus = verification.verification_status as CategoryStatus['verificationStatus'];
      }

      // Parse verification data if available
      let verificationData: CategoryStatus['verificationData'];
      if (verification?.verification_data) {
        try {
          verificationData = typeof verification.verification_data === 'string' 
            ? JSON.parse(verification.verification_data)
            : verification.verification_data;
        } catch (error) {
          console.error(`[API] Failed to parse verification_data for ${category.type}:`, error);
        }
      }

      return {
        type: category.type,
        enabled: category.enabled,
        requirements: category.requirements,
        verificationStatus,
        verifiedAt: verification?.verified_at,
        expiresAt: verification?.expires_at,
        metadata: CATEGORY_METADATA[category.type as keyof typeof CATEGORY_METADATA],
        verificationData,
      };
    });

    console.log(`[API gating-requirements] Post ${postId}: Found ${gatingCategories.length} categories (${hasLockGating ? 'lock-based' : 'legacy'})`);

    const response: GatingRequirementResponse = {
      postId,
      requireAll,
      categories: categoryStatuses,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error fetching gating requirements for post ${postId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch gating requirements' }, { status: 500 });
  }
}

export const GET = withAuth(getGatingRequirementsHandler, false); 