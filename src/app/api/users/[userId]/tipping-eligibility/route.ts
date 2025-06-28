import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { UserSettings } from '@/types/user';

interface TippingEligibilityResponse {
  eligible: boolean;
  upAddress?: string;
  verifiedAt?: string;
  source?: 'common_ground_profile' | 'lock_verification';
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
 * Check if a user is eligible for tipping based on LUKSO addresses from multiple sources
 * Priority: 1) Common Ground profile data, 2) Legacy lock verification data
 */
async function checkTippingEligibility(userId: string): Promise<TippingEligibilityResponse> {
  try {
    console.log(`[TippingEligibility] Checking eligibility for user: ${userId}`);
    
    // Method 1: Check Common Ground profile data (preferred source)
    const userResult = await query(
      `SELECT settings, updated_at FROM users WHERE user_id = $1`,
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const userRow = userResult.rows[0];
      const settings: UserSettings = userRow.settings || {};
      
      if (settings.lukso?.address && settings.lukso?.username) {
        const upAddress = settings.lukso.address;
        
        // Validate UP address format (0x + 40 hex characters)
        const upAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (upAddressRegex.test(upAddress)) {
          console.log(`[TippingEligibility] User ${userId} eligible via Common Ground profile: ${upAddress} (${settings.lukso.username})`);
          
          return {
            eligible: true,
            upAddress: upAddress,
            verifiedAt: userRow.updated_at,
            source: 'common_ground_profile'
          };
        } else {
          console.log(`[TippingEligibility] Invalid UP address format in CG profile for user ${userId}: ${upAddress}`);
        }
      }
    }
    
    // Method 2: Fallback to legacy lock verification data
    const verificationResult = await query(
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

    if (verificationResult.rows.length > 0) {
      const verification = verificationResult.rows[0];
      const upAddress = extractUpAddress(verification.verification_data);

      if (upAddress) {
        // Validate UP address format (0x + 40 hex characters)
        const upAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (upAddressRegex.test(upAddress)) {
          console.log(`[TippingEligibility] User ${userId} eligible via lock verification: ${upAddress}`);
          
          return {
            eligible: true,
            upAddress: upAddress,
            verifiedAt: verification.verified_at,
            source: 'lock_verification'
          };
        } else {
          console.log(`[TippingEligibility] Invalid UP address format in verification for user ${userId}: ${upAddress}`);
        }
      }
    }
    
    // No valid LUKSO address found in either source
    console.log(`[TippingEligibility] No valid LUKSO address found for user: ${userId}`);
    return {
      eligible: false,
      reason: 'No verified LUKSO Universal Profile address found'
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