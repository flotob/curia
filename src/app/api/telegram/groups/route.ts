import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { telegramService } from '@/lib/telegram/TelegramService';

export interface TelegramGroupResponse {
  id: number;
  chat_id: string;
  chat_title: string;
  registered_by_user_id: string;
  notification_settings: {
    enabled: boolean;
    events: string[];
    boards?: Record<string, {
      enabled: boolean;
      events: string[];
    }>;
    quiet_hours?: {
      start: string;
      end: string;
      timezone?: string;
    };
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/telegram/groups
 * 
 * Returns all active Telegram groups for the authenticated admin's community
 * Requires admin access to the community
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { user } = req;
    
    // Validate admin access
    if (!user?.adm && user?.sub !== process.env.NEXT_PUBLIC_SUPERADMIN_ID) {
      console.warn(`[API /api/telegram/groups] Non-admin user ${user?.sub} attempted access`);
      return NextResponse.json(
        { error: 'Admin access required' }, 
        { status: 403 }
      );
    }
    
    // Get community ID from user token
    const communityId = user?.cid;
    if (!communityId) {
      console.warn(`[API /api/telegram/groups] No community ID found for user ${user?.sub}`);
      return NextResponse.json(
        { error: 'Community ID not found in user context' }, 
        { status: 400 }
      );
    }
    
    console.log(`[API /api/telegram/groups] Fetching groups for community ${communityId} by admin ${user.sub}`);
    
    // Fetch groups using existing TelegramService
    const groups = await telegramService.getGroupsByCommunity(communityId);
    
    // Transform to consistent response format
    const responseGroups: TelegramGroupResponse[] = groups.map(group => ({
      id: group.id,
      chat_id: group.chat_id,
      chat_title: group.chat_title,
      registered_by_user_id: group.registered_by_user_id,
      notification_settings: group.notification_settings,
      is_active: group.is_active,
      created_at: group.created_at.toISOString(),
      updated_at: group.updated_at.toISOString(),
    }));
    
    console.log(`[API /api/telegram/groups] Returning ${responseGroups.length} groups for community ${communityId}`);
    
    return NextResponse.json(responseGroups);
    
  } catch (error) {
    console.error('[API /api/telegram/groups] Error fetching Telegram groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Telegram groups' }, 
      { status: 500 }
    );
  }
}, true); // Admin only

/**
 * DELETE /api/telegram/groups/[groupId]
 * 
 * Future: Allow admins to remove group registrations
 * Currently not implemented to keep scope focused
 */ 