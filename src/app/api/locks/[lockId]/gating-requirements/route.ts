/**
 * API Endpoint: GET /api/locks/[lockId]/gating-requirements
 * 
 * Returns gating configuration for a specific lock, formatted the same as
 * post gating requirements but sourced from the lock's gating_config.
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { GatingCategory } from '@/types/gating';

interface LockGatingRequirementResponse {
  lockId: number;
  requireAll: boolean;
  categories: CategoryStatus[];
}

interface CategoryStatus {
  type: string;
  enabled: boolean;
  requirements: unknown;
  verificationStatus: 'not_started';
  metadata?: {
    icon: string;
    name: string;
    brandColor: string;
  };
}

// Category metadata (same as post gating requirements)
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

async function getLockGatingRequirementsHandler(
  req: AuthenticatedRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { lockId } = params;

    if (!lockId) {
      return NextResponse.json({ error: 'Lock ID is required' }, { status: 400 });
    }

    // Fetch lock from database
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
    
    // Backward compatibility: handle both requireAll and requireAny fields
    let requireAll: boolean;
    if (gatingConfig.requireAll !== undefined) {
      requireAll = gatingConfig.requireAll;
    } else if (gatingConfig.requireAny !== undefined) {
      requireAll = !gatingConfig.requireAny; // requireAny: false means requireAll: true
    } else {
      requireAll = false; // Default to requireAny behavior for backward compatibility
    }

    // Build category status array (always 'not_started' for lock requirements endpoint)
    const categoryStatuses: CategoryStatus[] = gatingCategories.map((category: GatingCategory) => ({
      type: category.type,
      enabled: category.enabled,
      requirements: category.requirements,
      verificationStatus: 'not_started' as const,
      metadata: CATEGORY_METADATA[category.type as keyof typeof CATEGORY_METADATA],
    }));

    console.log(`[API locks/${lockId}/gating-requirements] Found ${gatingCategories.length} categories`);

    const response: LockGatingRequirementResponse = {
      lockId: parseInt(lockId, 10),
      requireAll,
      categories: categoryStatuses,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[API] Error fetching gating requirements for lock:`, error);
    return NextResponse.json({ error: 'Failed to fetch lock gating requirements' }, { status: 500 });
  }
}

export const GET = withAuth(getLockGatingRequirementsHandler); 