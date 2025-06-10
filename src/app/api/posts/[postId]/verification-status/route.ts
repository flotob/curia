/**
 * API Endpoint: GET /api/posts/[postId]/verification-status
 * 
 * Returns the current verification status for a user on a post.
 * Used to determine if the user can post comments based on pre-verifications.
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { SettingsUtils, PostSettings } from '@/types/settings';

interface VerificationStatusResponse {
  canComment: boolean;
  requireAll: boolean;
  totalCategories: number;
  verifiedCategories: number;
  categories: CategoryVerificationStatus[];
  message?: string;
}

interface CategoryVerificationStatus {
  type: string;
  required: boolean;
  verified: boolean;
  expiresAt?: string;
  metadata?: {
    name: string;
    description: string;
  };
}

// Category metadata
const CATEGORY_METADATA = {
  universal_profile: {
    name: 'LUKSO Universal Profile',
    description: 'Verify your Universal Profile and token holdings',
  },
  ethereum_profile: {
    name: 'Ethereum Profile',
    description: 'Verify your Ethereum address, ENS domain, and token holdings',
  },
};

async function getVerificationStatusHandler(
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
    // Get post settings and verify access
    const postResult = await query(
      `SELECT p.settings as post_settings, p.board_id, b.community_id
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       WHERE p.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { post_settings, community_id } = postResult.rows[0];

    // Verify user has access to this community
    if (community_id !== user.cid) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Parse post settings
    const postSettings: PostSettings = typeof post_settings === 'string' 
      ? JSON.parse(post_settings) 
      : (post_settings || {});

    // Check if post has any gating
    if (!SettingsUtils.hasAnyGating(postSettings)) {
      return NextResponse.json({
        canComment: true,
        requireAll: false,
        totalCategories: 0,
        verifiedCategories: 0,
        categories: [],
        message: 'No verification required for this post',
      } as VerificationStatusResponse);
    }

    // Get gating categories
    const categories = SettingsUtils.getGatingCategories(postSettings);
    const requireAll = postSettings.responsePermissions?.requireAll || false;

    // Get current verification statuses for this user (only non-expired)
    const verificationResult = await query(
      `SELECT category_type, verification_status, expires_at 
       FROM pre_verifications 
       WHERE user_id = $1 AND post_id = $2 AND expires_at > NOW() AND verification_status = 'verified'`,
      [user.sub, postId]
    );

    const verifiedCategoryMap = new Map<string, { verification_status: string; expires_at?: string }>();
    verificationResult.rows.forEach(row => {
      verifiedCategoryMap.set(row.category_type, row);
    });

    // Build category status array
    const categoryStatuses: CategoryVerificationStatus[] = categories.map(category => {
      const verification = verifiedCategoryMap.get(category.type);
      
      return {
        type: category.type,
        required: category.enabled,
        verified: !!verification,
        expiresAt: verification?.expires_at,
        metadata: CATEGORY_METADATA[category.type as keyof typeof CATEGORY_METADATA],
      };
    });

    // Calculate verification status
    const enabledCategories = categories.filter(cat => cat.enabled);
    const verifiedCount = categoryStatuses.filter(cat => cat.required && cat.verified).length;
    const totalRequired = enabledCategories.length;

    let canComment = false;
    let message = '';

    if (totalRequired === 0) {
      canComment = true;
      message = 'No verification required';
    } else if (requireAll) {
      canComment = verifiedCount === totalRequired;
      message = canComment 
        ? 'All requirements verified - you can comment' 
        : `Need to verify all ${totalRequired} requirements (${verifiedCount} completed)`;
    } else {
      canComment = verifiedCount > 0;
      message = canComment 
        ? 'Requirements satisfied - you can comment' 
        : `Need to verify at least 1 of ${totalRequired} requirements`;
    }

    const response: VerificationStatusResponse = {
      canComment,
      requireAll,
      totalCategories: totalRequired,
      verifiedCategories: verifiedCount,
      categories: categoryStatuses,
      message,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error fetching verification status for post ${postId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
  }
}

export const GET = withAuth(getVerificationStatusHandler, false); 