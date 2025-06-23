import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';

async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
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

    console.log(`[Friends API] Fetching friends for user ${userId}`);

    // Fetch active friends from database with user details
    const friendsResult = await query(
      `SELECT 
         uf.friend_user_id as id,
         uf.friend_name as name,
         uf.friend_image_url as image,
         uf.friendship_status,
         uf.synced_at,
         u.name as user_name,
         u.profile_picture_url as user_image
       FROM user_friends uf
       LEFT JOIN users u ON u.user_id = uf.friend_user_id
       WHERE uf.user_id = $1 
         AND uf.friendship_status = 'active'
       ORDER BY uf.friend_name ASC;`,
      [userId]
    );

    const friends = friendsResult.rows.map(row => ({
      id: row.id,
      name: row.name || row.user_name || 'Unknown User',
      image: row.image || row.user_image,
      friendship_status: row.friendship_status,
      synced_at: row.synced_at
    }));

    console.log(`[Friends API] Found ${friends.length} active friends for user ${userId}`);

    return NextResponse.json({
      success: true,
      friends,
      count: friends.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Friends API] Error fetching friends:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler); 