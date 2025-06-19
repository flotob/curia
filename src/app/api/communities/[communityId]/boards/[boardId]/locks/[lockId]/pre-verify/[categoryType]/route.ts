/**
 * API Endpoint: POST /api/communities/[communityId]/boards/[boardId]/locks/[lockId]/pre-verify/[categoryType]
 * 
 * Submits verification for a specific category of a specific lock on a specific board.
 * Uses board verification context with 4-hour expiration (vs 30 minutes for posts).
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
// Note: We don't import category renderers here since this is server-side
// We handle verification directly using verification functions

interface PreVerificationRequest {
  signature?: string;
  message?: string;
  address?: string;
  verificationData?: unknown;
}

interface PreVerificationResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
}

async function submitBoardLockPreVerificationHandler(
  req: AuthenticatedRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { communityId, boardId, lockId, categoryType } = params;
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!communityId || !boardId || !lockId || !categoryType) {
      return NextResponse.json({ 
        error: 'Community ID, Board ID, Lock ID, and Category Type are required' 
      }, { status: 400 });
    }

    // Parse request body
    const body: PreVerificationRequest = await req.json();
    const { signature, message, address, verificationData } = body;

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

    // Fetch lock gating configuration to get category requirements
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

    const gatingCategories = gatingConfig.categories || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetCategory = gatingCategories.find((cat: any) => cat.type === categoryType && cat.enabled);

    if (!targetCategory) {
      return NextResponse.json({ 
        error: `Category ${categoryType} not found or not enabled for this lock` 
      }, { status: 404 });
    }

    // Perform server-side verification based on category type
    let verificationResult;
    
    if (categoryType === 'universal_profile') {
      // Import UP verification function
      const { verifyPostGatingRequirements } = await import('@/lib/verification/upVerification');
      
      if (!address) {
        return NextResponse.json({ 
          error: 'Address is required for Universal Profile verification' 
        }, { status: 400 });
      }

      // Create a mock post settings object with the requirements
      const mockPostSettings = {
        responsePermissions: {
          upGating: targetCategory.requirements
        }
      };

      verificationResult = await verifyPostGatingRequirements(address, mockPostSettings);
    } else if (categoryType === 'ethereum_profile') {
      // Import Ethereum verification function
      const { verifyEthereumGatingRequirements } = await import('@/lib/ethereum/verification');
      
      if (!address) {
        return NextResponse.json({ 
          error: 'Address is required for Ethereum Profile verification' 
        }, { status: 400 });
      }

      verificationResult = await verifyEthereumGatingRequirements(
        address,
        targetCategory.requirements
      );
    } else {
      return NextResponse.json({ 
        error: `Verification not supported for category type: ${categoryType}` 
      }, { status: 400 });
    }

    if (!verificationResult.valid) {
      return NextResponse.json({ 
        success: false,
        message: verificationResult.error || 'Verification failed',
      }, { status: 400 });
    }

    // Calculate expiration time (4 hours for board verification vs 30 minutes for posts)
    const boardVerificationDuration = lockGating.verificationDuration || 4; // hours
    const expiresAt = new Date(Date.now() + boardVerificationDuration * 60 * 60 * 1000);

    // Store verification in database with board context
    const verificationDataToStore = {
      signature,
      message,
      address,
      timestamp: new Date().toISOString(),
      requirements: targetCategory.requirements,
      verificationResult: verificationResult || {},
      ...(verificationData || {})
    };

    // Use INSERT ... ON CONFLICT to handle race conditions
    await query(
      `INSERT INTO pre_verifications 
       (user_id, board_id, category_type, verification_data, verification_status, expires_at, resource_type, verified_at) 
       VALUES ($1, $2, $3, $4, 'verified', $5, 'board', NOW())
       ON CONFLICT (user_id, board_id, category_type) WHERE resource_type = 'board' AND board_id IS NOT NULL
       DO UPDATE SET 
         verification_data = EXCLUDED.verification_data,
         verification_status = 'verified',
         expires_at = EXCLUDED.expires_at,
         verified_at = NOW(),
         updated_at = NOW()`,
      [
        user.sub,
        boardId,
        categoryType,
        JSON.stringify(verificationDataToStore),
        expiresAt.toISOString()
      ]
    );

    console.log(`[API board-lock-pre-verify] Verified ${categoryType} for user ${user.sub} on board ${boardId}, lock ${lockId} (expires: ${expiresAt.toISOString()})`);

    const response: PreVerificationResponse = {
      success: true,
      message: `${categoryType} verification completed for board access`,
      expiresAt: expiresAt.toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error submitting board lock pre-verification:`, error);
    return NextResponse.json({ 
      success: false,
      message: 'Failed to submit verification' 
    }, { status: 500 });
  }
}

export const POST = withAuth(submitBoardLockPreVerificationHandler); 