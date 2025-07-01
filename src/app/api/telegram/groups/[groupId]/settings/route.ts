import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';

interface BoardNotificationSettings {
  enabled: boolean;
  events: string[];
}

interface NotificationSettings {
  enabled: boolean;
  events: string[];
  boards?: Record<string, BoardNotificationSettings>;
  quiet_hours?: {
    start: string;
    end: string;
    timezone?: string;
  };
}

interface UpdateSettingsRequest {
  notification_settings: NotificationSettings;
}

/**
 * PUT /api/telegram/groups/[groupId]/settings
 * 
 * Updates notification settings for a specific Telegram group
 * Requires admin access to the community that owns the group
 */
export const PUT = withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
  try {
    const params = await context.params;
    const { groupId } = params;
    const { user } = req;
    
    // Validate admin access
    if (!user?.adm && user?.sub !== process.env.NEXT_PUBLIC_SUPERADMIN_ID) {
      console.warn(`[API PUT /api/telegram/groups/${groupId}/settings] Non-admin user ${user?.sub} attempted access`);
      return NextResponse.json(
        { error: 'Admin access required' }, 
        { status: 403 }
      );
    }
    
    const communityId = user?.cid;
    if (!communityId) {
      console.warn(`[API PUT /api/telegram/groups/${groupId}/settings] No community ID found for user ${user?.sub}`);
      return NextResponse.json(
        { error: 'Community ID not found in user context' }, 
        { status: 400 }
      );
    }

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' }, 
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

    // Validate event types
    const validEvents = ['new_post', 'comment', 'upvote'];
    const invalidEvents = notification_settings.events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid event types: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}` }, 
        { status: 400 }
      );
    }

    // Validate board settings if provided
    if (notification_settings.boards) {
      for (const [boardId, boardSettings] of Object.entries(notification_settings.boards)) {
        if (!/^\d+$/.test(boardId)) {
          return NextResponse.json(
            { error: `Invalid board ID: ${boardId}. Board IDs must be numeric strings.` }, 
            { status: 400 }
          );
        }

        if (typeof boardSettings.enabled !== 'boolean') {
          return NextResponse.json(
            { error: `Board ${boardId} settings: enabled must be a boolean` }, 
            { status: 400 }
          );
        }

        if (!Array.isArray(boardSettings.events)) {
          return NextResponse.json(
            { error: `Board ${boardId} settings: events must be an array` }, 
            { status: 400 }
          );
        }

        const invalidBoardEvents = boardSettings.events.filter(event => !validEvents.includes(event));
        if (invalidBoardEvents.length > 0) {
          return NextResponse.json(
            { error: `Board ${boardId} has invalid event types: ${invalidBoardEvents.join(', ')}` }, 
            { status: 400 }
          );
        }
      }
    }

    // Verify the group exists and belongs to the user's community
    const groupResult = await query(
      'SELECT id, chat_id, chat_title, community_id FROM telegram_groups WHERE id = $1 AND community_id = $2 AND is_active = true',
      [groupId, communityId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Telegram group not found or not accessible' }, 
        { status: 404 }
      );
    }

    const group = groupResult.rows[0];

    // Update the notification settings
    const updateResult = await query(
      'UPDATE telegram_groups SET notification_settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(notification_settings), groupId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update group settings' }, 
        { status: 500 }
      );
    }

    const updatedGroup = updateResult.rows[0];

    console.log(`[API PUT /api/telegram/groups/${groupId}/settings] Admin ${user.sub} updated settings for group "${group.chat_title}" in community ${communityId}`);

    return NextResponse.json({
      success: true,
      group: {
        id: updatedGroup.id,
        chat_id: updatedGroup.chat_id,
        chat_title: updatedGroup.chat_title,
        notification_settings: updatedGroup.notification_settings,
        updated_at: updatedGroup.updated_at.toISOString(),
      }
    });

  } catch (error) {
    const params = await context.params;
    const { groupId } = params;
    console.error(`[API PUT /api/telegram/groups/${groupId}/settings] Error updating group settings:`, error);
    
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