/**
 * API Endpoint: POST /api/locks/[lockId]/verify/[categoryType]
 * 
 * Generic lock verification endpoint that works for all contexts.
 * Replaces:
 * - POST /api/posts/{postId}/pre-verify/universal_profile
 * - POST /api/posts/{postId}/pre-verify/ethereum_profile
 * - POST /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/pre-verify/universal_profile
 * - POST /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/pre-verify/ethereum_profile
 * 
 * Usage:
 * POST /api/locks/123/verify/universal_profile
 * {
 *   "signature": "0x...",
 *   "message": "Verify universal_profile for lock access...",
 *   "address": "0x...",
 *   "context": { "type": "post", "id": 456 },
 *   "verificationData": { "requirements": {...} }
 * }
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { GatingCategory } from '@/types/gating';
import { verifyPostGatingRequirements } from '@/lib/verification';
import { verifyEthereumGatingRequirements } from '@/lib/ethereum/verification';
import { EthereumGatingRequirements, UPGatingRequirements } from '@/types/gating';
import { calculateExpirationDate, getBoardExpirationHours } from '@/lib/verification/config';

interface GenericVerificationRequest {
  signature: string;
  message: string;
  address: string;
  context: {
    type: 'post' | 'board';
    id: number;
  };
  verificationData?: {
    requirements?: unknown;
    [key: string]: unknown;
  };
}

interface GenericVerificationResponse {
  success: boolean;
  lockId: number;
  categoryType: string;
  context: { type: string; id: number };
  verificationStatus: 'verified' | 'failed';
  expiresAt?: string;
  message: string;
  error?: string;
}

async function genericVerificationHandler(
  req: AuthenticatedRequest,
  context: RouteContext
) {
  const user = req.user;
  const params = await context.params;
  const lockId = parseInt(params.lockId!, 10);
  const categoryType = params.categoryType!;

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (isNaN(lockId)) {
    return NextResponse.json({ error: 'Invalid lock ID' }, { status: 400 });
  }

  if (!['ethereum_profile', 'universal_profile'].includes(categoryType)) {
    return NextResponse.json({ error: 'Invalid category type' }, { status: 400 });
  }

  try {
    const body: GenericVerificationRequest = await req.json();
    const { signature, message, address, context: verificationContext, verificationData } = body;

    if (!signature || !message || !address || !verificationContext) {
      return NextResponse.json({ 
        error: 'Missing required fields: signature, message, address, context' 
      }, { status: 400 });
    }

    if (!verificationContext.type || !verificationContext.id) {
      return NextResponse.json({ 
        error: 'Invalid context format. Required: { type: "post"|"board", id: number }' 
      }, { status: 400 });
    }

    console.log(`[API] Generic verification for lock ${lockId}, category ${categoryType}, context: ${verificationContext.type}:${verificationContext.id}, user: ${user.sub}`);

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
    const targetCategory = gatingCategories.find((cat: GatingCategory) => cat.type === categoryType && cat.enabled);

    if (!targetCategory) {
      return NextResponse.json({ 
        error: `Category ${categoryType} not found or not enabled for this lock` 
      }, { status: 404 });
    }

    // Perform server-side verification based on category type
    let verificationResult;
    
    if (categoryType === 'universal_profile') {
      if (!address) {
        return NextResponse.json({ 
          error: 'Address is required for Universal Profile verification' 
        }, { status: 400 });
      }

      // Create a mock post settings object with the requirements
      const mockPostSettings = {
        responsePermissions: {
          upGating: {
            enabled: true,
            requirements: targetCategory.requirements as UPGatingRequirements
          }
        }
      };

      verificationResult = await verifyPostGatingRequirements(
        address, 
        mockPostSettings,
        targetCategory.fulfillment || 'all'
      );
    } else if (categoryType === 'ethereum_profile') {
      if (!address) {
        return NextResponse.json({ 
          error: 'Address is required for Ethereum Profile verification' 
        }, { status: 400 });
      }

      verificationResult = await verifyEthereumGatingRequirements(
        address,
        targetCategory.requirements as EthereumGatingRequirements,
        targetCategory.fulfillment || 'all'
      );
    } else {
      return NextResponse.json({ 
        error: `Verification not supported for category type: ${categoryType}` 
      }, { status: 400 });
    }

    if (!verificationResult.valid) {
      return NextResponse.json({ 
        success: false,
        lockId,
        categoryType,
        context: verificationContext,
        verificationStatus: 'failed',
        message: verificationResult.error || 'Verification failed',
        error: verificationResult.error || 'Requirements not met'
      } as GenericVerificationResponse, { status: 400 });
    }

    // Calculate expiration time using configuration system
    let expiresAt: Date;
    
    if (verificationContext.type === 'board') {
      // For board verification, use configuration-driven duration
      const hours = await getBoardExpirationHours(verificationContext.id);
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    } else {
      // For post verification, use configuration-driven duration
      expiresAt = calculateExpirationDate('post');
    }

    // Store verification in database
    const verificationDataToStore = {
      signature,
      message,
      address,
      timestamp: new Date().toISOString(),
      requirements: targetCategory.requirements,
      verificationResult: verificationResult || {},
      context: verificationContext,
      ...(verificationData || {})
    };

    // Use INSERT ... ON CONFLICT to handle race conditions
    await query(
      `INSERT INTO pre_verifications 
       (user_id, lock_id, category_type, verification_data, verification_status, expires_at, verified_at) 
       VALUES ($1, $2, $3, $4, 'verified', $5, NOW())
       ON CONFLICT (user_id, lock_id, category_type)
       DO UPDATE SET 
         verification_data = EXCLUDED.verification_data,
         verification_status = 'verified',
         expires_at = EXCLUDED.expires_at,
         verified_at = NOW(),
         updated_at = NOW()`,
      [
        user.sub,
        lockId,
        categoryType,
        JSON.stringify(verificationDataToStore),
        expiresAt.toISOString()
      ]
    );

    console.log(`[API] Generic verification completed for lock ${lockId}, category ${categoryType}, user ${user.sub} (expires: ${expiresAt.toISOString()})`);

    const response: GenericVerificationResponse = {
      success: true,
      lockId,
      categoryType,
      context: verificationContext,
      verificationStatus: 'verified',
      expiresAt: expiresAt.toISOString(),
      message: `${categoryType} verification completed successfully`,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error in generic verification for lock ${lockId}, category ${categoryType}:`, error);
    return NextResponse.json({ 
      success: false,
      lockId,
      categoryType,
      context: { type: 'unknown', id: 0 },
      verificationStatus: 'failed',
      message: 'Failed to process verification',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as GenericVerificationResponse, { status: 500 });
  }
}

export const POST = withAuth(genericVerificationHandler); 