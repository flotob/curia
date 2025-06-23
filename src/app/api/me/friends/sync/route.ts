import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';

interface Friend {
  id: string;
  name: string;
  image?: string;
  // Add other properties as needed based on CG lib response
}

interface SyncRequest {
  friends: Friend[];
  clearExisting?: boolean;
}

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in request' },
        { status: 400 }
      );
    }

    // Accept friends data from frontend (which has access to CG lib)
    const body = await req.json() as SyncRequest;
    const { friends, clearExisting = false } = body;

    if (!Array.isArray(friends)) {
      return NextResponse.json(
        { error: 'Friends array is required' },
        { status: 400 }
      );
    }

    console.log(`[Friends Sync] Starting friends sync for user ${userId} (${friends.length} friends, clearExisting: ${clearExisting})`);

    // Validate friends data structure
    for (const friend of friends) {
      if (!friend.id || !friend.name) {
        return NextResponse.json(
          { error: 'Each friend must have id and name properties' },
          { status: 400 }
        );
      }
    }

    // Clear existing friends if requested
    if (clearExisting) {
      try {
        const deleteResult = await query(
          `UPDATE user_friends SET friendship_status = 'removed', updated_at = NOW() 
           WHERE user_id = $1 AND friendship_status = 'active';`,
          [userId]
        );
        console.log(`[Friends Sync] Marked ${deleteResult.rowCount || 0} existing friends as removed`);
      } catch (clearError) {
        console.error('[Friends Sync] Error clearing existing friends:', clearError);
        return NextResponse.json(
          { error: 'Failed to clear existing friends', details: clearError },
          { status: 500 }
        );
      }
    }

    // Sync friends to database
    let syncedCount = 0;
    const errors: string[] = [];

    for (const friend of friends) {
      try {
        // Ensure friend user exists in users table
        await query(
          `INSERT INTO users (user_id, name, profile_picture_url, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id) DO UPDATE SET 
             name = COALESCE(EXCLUDED.name, users.name),
             profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, users.profile_picture_url),
             updated_at = NOW();`,
          [friend.id, friend.name, friend.image || null]
        );

        // Upsert friendship record
        await query(
          `INSERT INTO user_friends (user_id, friend_user_id, friend_name, friend_image_url, friendship_status, synced_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'active', NOW(), NOW(), NOW())
           ON CONFLICT (user_id, friend_user_id) DO UPDATE SET
             friend_name = EXCLUDED.friend_name,
             friend_image_url = EXCLUDED.friend_image_url,
             friendship_status = 'active',
             synced_at = NOW(),
             updated_at = NOW();`,
          [userId, friend.id, friend.name, friend.image || null]
        );

        syncedCount++;
        
      } catch (dbError) {
        console.error(`[Friends Sync] Error syncing friend ${friend.id}:`, dbError);
        errors.push(`Failed to sync friend ${friend.name} (${friend.id}): ${dbError}`);
      }
    }

    // Mark friends not in current sync as potentially removed (optional - could be configurable)
    // For now, we'll just update sync timestamps and leave friendship_status management to future iterations

    console.log(`[Friends Sync] Completed sync for user ${userId}. Synced: ${syncedCount}/${friends.length}`);

    return NextResponse.json({
      success: true,
      data: {
        syncedCount,
        totalReceived: friends.length,
        clearedExisting: clearExisting,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Friends Sync] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler); 