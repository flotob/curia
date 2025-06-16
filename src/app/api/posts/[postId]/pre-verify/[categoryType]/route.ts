/**
 * API Endpoint: POST /api/posts/[postId]/pre-verify/[categoryType]
 * 
 * Accepts signature/challenge for a specific gating category and verifies it.
 * Stores the verification in pre_verifications table for later use.
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { SettingsUtils, PostSettings } from '@/types/settings';
import { VerificationChallenge } from '@/lib/verification/types';
import { ChallengeUtils, verifyPostGatingRequirements } from '@/lib/verification';
import { verifyEthereumGatingRequirements } from '@/lib/ethereum/verification';
import { EthereumGatingRequirements, UPGatingRequirements, GatingCategory } from '@/types/gating';

interface PreVerifyRequest {
  challenge: VerificationChallenge;
}

interface PreVerifyResponse {
  success: boolean;
  categoryType: string;
  verificationStatus: 'verified' | 'failed';
  expiresAt: string;
  error?: string;
}

async function preVerifyHandler(
  req: AuthenticatedRequest,
  context: RouteContext
) {
  const user = req.user;
  const params = await context.params;
  const postId = parseInt(params.postId!, 10);
  const categoryType = params.categoryType!;

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  if (!['ethereum_profile', 'universal_profile'].includes(categoryType)) {
    return NextResponse.json({ error: 'Invalid category type' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { challenge }: PreVerifyRequest = body;

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge data required' }, { status: 400 });
    }

    console.log(`[API] Pre-verifying ${categoryType} for user ${user.sub} on post ${postId}`);

    // Get post settings, lock data and verify access
    const postResult = await query(
      `SELECT p.settings as post_settings, p.board_id, p.lock_id, b.community_id,
              l.gating_config as lock_gating_config
       FROM posts p 
       JOIN boards b ON p.board_id = b.id 
       LEFT JOIN locks l ON p.lock_id = l.id
       WHERE p.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { post_settings, lock_id, lock_gating_config, community_id } = postResult.rows[0];

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
        error: 'No gating requirements found for this post' 
      }, { status: 400 });
    }

    // Determine which gating configuration to use
    let gatingCategories: GatingCategory[];

    if (hasLockGating) {
      // Use lock-based gating configuration
      const lockGatingConfig = typeof lock_gating_config === 'string' 
        ? JSON.parse(lock_gating_config) 
        : lock_gating_config;
      
      gatingCategories = lockGatingConfig.categories || [];
      
      console.log(`[API] Using lock-based gating for pre-verification, lock_id: ${lock_id}`);
    } else {
      // Use legacy post settings gating
      gatingCategories = SettingsUtils.getGatingCategories(postSettings);
      
      console.log(`[API] Using legacy gating for pre-verification`);
    }

    // Find and verify this category is enabled
    const targetCategory = gatingCategories.find((cat: GatingCategory) => cat.type === categoryType && cat.enabled);

    if (!targetCategory) {
      return NextResponse.json({ 
        error: `Category ${categoryType} is not enabled for this post` 
      }, { status: 400 });
    }

    // Validate challenge format
    const formatValidation = ChallengeUtils.validateChallengeFormat(challenge);
    if (!formatValidation.valid) {
      return NextResponse.json({ 
        error: `Invalid challenge: ${formatValidation.error}` 
      }, { status: 400 });
    }

    // Verify challenge is for this post
    if (challenge.postId !== postId) {
      return NextResponse.json({ 
        error: 'Challenge post ID mismatch' 
      }, { status: 400 });
    }

    // TODO: Implement signature verification once verification functions are exported
    // For Phase 1, we'll just validate the challenge format and store it
    // Phase 2 will add full signature verification
    
    const signatureValid = true; // Placeholder - will be implemented in Phase 2
    let requirementsValid = false;
    let verificationError = '';

    if (categoryType === 'ethereum_profile') {
      if (!challenge.ethAddress || !challenge.signature) {
        return NextResponse.json({ 
          error: 'Ethereum address and signature required' 
        }, { status: 400 });
      }

      // Verify Ethereum requirements (we can do this part)
      const requirementsResult = await verifyEthereumGatingRequirements(
        challenge.ethAddress,
        targetCategory.requirements as EthereumGatingRequirements
      );
      requirementsValid = requirementsResult.valid;
      
      if (!requirementsValid) {
        verificationError = requirementsResult.error || 'Ethereum requirements not met';
      }
    } else if (categoryType === 'universal_profile') {
      if (!challenge.upAddress) {
        return NextResponse.json({ 
          error: 'Universal Profile address required' 
        }, { status: 400 });
      }

      // ✅ FIXED: Use actual UP verification instead of hardcoded bypass
      const requirementsResult = await verifyPostGatingRequirements(
        challenge.upAddress,
        {
          responsePermissions: {
            upGating: {
              enabled: true,
              requirements: targetCategory.requirements as UPGatingRequirements
            }
          }
        }
      );
      requirementsValid = requirementsResult.valid;
      
      if (!requirementsValid) {
        verificationError = requirementsResult.error || 'Universal Profile requirements not met';
      }
    }

    const verificationStatus = (signatureValid && requirementsValid) ? 'verified' : 'failed';
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Store or update verification result
    await query(
      `INSERT INTO pre_verifications 
        (user_id, post_id, category_type, verification_data, verification_status, verified_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, post_id, category_type)
       DO UPDATE SET
         verification_data = EXCLUDED.verification_data,
         verification_status = EXCLUDED.verification_status,
         verified_at = EXCLUDED.verified_at,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [
        user.sub,
        postId,
        categoryType,
        JSON.stringify(challenge),
        verificationStatus,
        verificationStatus === 'verified' ? new Date().toISOString() : null,
        expiresAt.toISOString()
      ]
    );

    const response: PreVerifyResponse = {
      success: verificationStatus === 'verified',
      categoryType,
      verificationStatus,
      expiresAt: expiresAt.toISOString(),
      error: verificationStatus === 'failed' ? verificationError : undefined,
    };

    console.log(`[API] Pre-verification result for ${categoryType}: ${verificationStatus}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error in pre-verify for ${categoryType}:`, error);
    return NextResponse.json({ 
      error: 'Failed to process verification' 
    }, { status: 500 });
  }
}

export const POST = withAuth(preVerifyHandler, false); 