import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { telegramService } from '@/lib/telegram/TelegramService';

interface UpdateSettingsRequest {
  notification_settings: {
    enabled: boolean;
    events: string[];
    quiet_hours?: {
      start: string;
      end: string;
      timezone?: string;
    };
    boards?: {
      [boardId: string]: {
        enabled: boolean;
        events: string[];
      };
    };
  };
}

/**
 * PUT /api/telegram/groups/[groupId]/settings
 * 
 * Updates notification settings for a specific Telegram group
 * Requires admin access to the community
 */
export const PUT = withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
  try {
    const { user } = req;
    const params = await context.params;
    const { groupId } = params;
    
    // Validate admin access
    if (!user?.adm && user?.sub !== process.env.NEXT_PUBLIC_SUPERADMIN_ID) {
      console.warn(`[API /api/telegram/groups/${groupId}/settings] Non-admin user ${user?.sub} attempted access`);
      return NextResponse.json(
        { error: 'Admin access required' }, 
        { status: 403 }
      );
    }
    
    // Get community ID from user token
    const communityId = user?.cid;
    if (!communityId) {
      console.warn(`[API /api/telegram/groups/${groupId}/settings] No community ID found for user ${user?.sub}`);
      return NextResponse.json(
        { error: 'Community ID not found in user context' }, 
        { status: 400 }
      );
    }

    // Parse request body
    const body: UpdateSettingsRequest = await req.json();
    const { notification_settings } = body;

    if (!notification_settings) {
      return NextResponse.json(
        { error: 'notification_settings is required' },
        { status: 400 }
      );
    }

    // Validate notification settings structure
    if (typeof notification_settings.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'notification_settings.enabled must be a boolean' },
        { status: 400 }
      );
    }

    if (!Array.isArray(notification_settings.events)) {
      return NextResponse.json(
        { error: 'notification_settings.events must be an array' },
        { status: 400 }
      );
    }

    // Validate board settings if provided
    if (notification_settings.boards) {
      for (const [boardId, boardSettings] of Object.entries(notification_settings.boards)) {
        if (typeof boardSettings.enabled !== 'boolean') {
          return NextResponse.json(
            { error: `Board ${boardId} settings.enabled must be a boolean` },
            { status: 400 }
          );
        }
        
        if (!Array.isArray(boardSettings.events)) {
          return NextResponse.json(
            { error: `Board ${boardId} settings.events must be an array` },
            { status: 400 }
          );
        }
      }
    }

    console.log(`[API /api/telegram/groups/${groupId}/settings] Updating settings for group ${groupId} by admin ${user.sub}`);

    // Update the group settings using TelegramService
    const updatedGroup = await telegramService.updateGroupSettings(
      parseInt(groupId),
      communityId,
      notification_settings
    );

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`[API /api/telegram/groups/${groupId}/settings] Successfully updated settings for group ${groupId}`);

    // Return the updated group data
    return NextResponse.json({
      id: updatedGroup.id,
      chat_id: updatedGroup.chat_id,
      chat_title: updatedGroup.chat_title,
      registered_by_user_id: updatedGroup.registered_by_user_id,
      notification_settings: updatedGroup.notification_settings,
      is_active: updatedGroup.is_active,
      created_at: updatedGroup.created_at.toISOString(),
      updated_at: updatedGroup.updated_at.toISOString(),
    });
    
  } catch (error) {
    const params = await context.params;
    console.error(`[API /api/telegram/groups/${params.groupId}/settings] Error updating settings:`, error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update group settings' }, 
      { status: 500 }
    );
  }
}, true); // Admin only