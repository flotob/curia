import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';

interface TippingEligibilityResponse {
  eligible: boolean;
  upAddress?: string;
  verifiedAt?: string;
  reason?: string;
}

/**
 * Extract UP address from verification data
 * Handles both 'address' and 'upAddress' fields from verification_data JSON
 */
function extractUpAddress(verificationData: unknown): string | null {
  if (!verificationData || typeof verificationData !== 'object') {
    return null;
  }
  
  const data = verificationData as Record<string, unknown>;
  
  // Try upAddress first (more specific), then fallback to address
  const upAddress = data.upAddress || data.address;
  return typeof upAddress === 'string' ? upAddress : null;
}

/**
 * Check if a user is eligible for tipping based on verified Universal Profile addresses
 */
async function checkTippingEligibility(userId: string): Promise<TippingEligibilityResponse> {
  try {
    console.log(`[TippingEligibility] Checking eligibility for user: ${userId}`);
    
    // Query for ANY verified Universal Profile verifications (ignore expiry for tipping)
    const result = await query(
      `SELECT 
         verification_data,
         verified_at,
         expires_at
       FROM pre_verifications 
       WHERE user_id = $1 
         AND category_type = 'universal_profile'
         AND verification_status = 'verified'
       ORDER BY verified_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      console.log(`[TippingEligibility] No verified UP address found for user: ${userId}`);
      return {
        eligible: false,
        reason: 'No verified Universal Profile address found'
      };
    }

    const verification = result.rows[0];
    const upAddress = extractUpAddress(verification.verification_data);

    if (!upAddress) {
      console.log(`[TippingEligibility] No valid UP address in verification data for user: ${userId}`);
      return {
        eligible: false,
        reason: 'Verification data does not contain valid Universal Profile address'
      };
    }

    // Validate UP address format (0x + 40 hex characters)
    const upAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!upAddressRegex.test(upAddress)) {
      console.log(`[TippingEligibility] Invalid UP address format for user: ${userId}, address: ${upAddress}`);
      return {
        eligible: false,
        reason: 'Invalid Universal Profile address format'
      };
    }

    console.log(`[TippingEligibility] User ${userId} is eligible for tipping with UP address: ${upAddress}`);
    
    return {
      eligible: true,
      upAddress: upAddress,
      verifiedAt: verification.verified_at
    };

  } catch (error) {
    console.error(`[TippingEligibility] Database error for user ${userId}:`, error);
    return {
      eligible: false,
      reason: 'Database error while checking eligibility'
    };
  }
}

async function handler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const currentUserId = req.user?.sub;
    const params = await context.params;
    const { userId } = params;

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'User ID not found in authentication token' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[TippingEligibility API] Checking tipping eligibility for user ${userId} (requested by ${currentUserId})`);

    // Check if the target user exists
    const userExists = await query(
      `SELECT user_id FROM users WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (userExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check tipping eligibility
    const eligibility = await checkTippingEligibility(userId);

    return NextResponse.json({
      userId: userId,
      ...eligibility,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[TippingEligibility API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, false); 