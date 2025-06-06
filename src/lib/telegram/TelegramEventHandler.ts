import { query } from '../db';
import { telegramService, NotificationData } from './TelegramService';
import { generateTelegramShareUrl } from './shareUrlGenerator';
import { fetchPostMetadataDirect } from './directMetadataFetcher';
import { generateTelegramOgImage } from './ogImageGenerator';

interface BroadcastEventDetails {
  room: string;
  eventName: string;
  payload: Record<string, unknown>;
}

interface BoardContext {
  boardId: number;
  communityId: string;
  boardName?: string;
}

/**
 * Vote notification thresholds - notify on these milestones
 * Starting from 1 upvote to ensure all activity is captured
 */
const VOTE_NOTIFICATION_THRESHOLDS = [1, 2, 3, 5, 10, 25, 50, 100, 250, 500, 1000];

/**
 * TelegramEventHandler processes Socket.IO broadcast events and sends
 * corresponding notifications to registered Telegram groups
 */
export class TelegramEventHandler {
  /**
   * Get base URL for OG image generation
   * Uses environment variables to determine the correct base URL
   */
  private getBaseUrl(): string {
    // Try different environment variables in order of preference
    const baseUrl = 
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
      process.env.PUBLIC_URL ||
      'http://localhost:3000'; // fallback for development
    
    console.log(`[TelegramEventHandler] Using base URL: ${baseUrl}`);
    return baseUrl;
  }

  /**
   * Escape HTML special characters for Telegram HTML parsing
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  /**
   * Main event handler - routes events to appropriate processors
   */
  async handleBroadcastEvent(eventDetails: BroadcastEventDetails): Promise<void> {
    const { room, eventName, payload } = eventDetails;
    
    console.log(`[TelegramEventHandler] Processing event: ${eventName} for room: ${room}`);
    
    try {
      // Resolve board context from room (e.g., "board:123" -> { boardId: 123, communityId: "..." })
      const boardContext = await this.resolveBoardContext(room);
      if (!boardContext) {
        console.log(`[TelegramEventHandler] Skipping event ${eventName} - not a board room or board not found`);
        return;
      }
      
      // Route event to appropriate handler
      switch (eventName) {
        case 'newPost':
          await this.handleNewPost(payload, boardContext);
          break;
        case 'voteUpdate':
          await this.handleVoteUpdate(payload, boardContext);
          break;
        case 'newComment':
          await this.handleNewComment(payload, boardContext);
          break;
        case 'postDeleted':
          await this.handlePostDeleted(payload);
          break;
        case 'boardSettingsChanged':
          // Skip board settings changes - internal admin events
          console.log(`[TelegramEventHandler] Skipping boardSettingsChanged event`);
          break;
        default:
          console.log(`[TelegramEventHandler] Unknown event type: ${eventName}`);
      }
    } catch (error) {
      // Log error but don't throw - we must not crash the main event system
      console.error(`[TelegramEventHandler] Error processing ${eventName} event:`, error);
    }
  }

  /**
   * Resolve board context from room string (e.g., "board:123" -> board info)
   */
  private async resolveBoardContext(room: string): Promise<BoardContext | null> {
    if (!room.startsWith('board:')) {
      return null; // Not a board room
    }
    
    const boardIdStr = room.split(':')[1];
    const boardId = parseInt(boardIdStr, 10);
    
    if (isNaN(boardId)) {
      console.warn(`[TelegramEventHandler] Invalid board ID in room: ${room}`);
      return null;
    }
    
    try {
      const result = await query(
        'SELECT id, community_id, name FROM boards WHERE id = $1',
        [boardId]
      );
      
      if (result.rows.length === 0) {
        console.warn(`[TelegramEventHandler] Board not found: ${boardId}`);
        return null;
      }
      
      const board = result.rows[0];
      return {
        boardId: board.id,
        communityId: board.community_id,
        boardName: board.name
      };
    } catch (error) {
      console.error(`[TelegramEventHandler] Error resolving board context for ${room}:`, error);
      return null;
    }
  }

  /**
   * Handle new post notifications with OG image
   */
  private async handleNewPost(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
    console.log(`[TelegramEventHandler] Processing new post notification with OG image for community ${boardContext.communityId}`);
    
    const postId = payload.id as number;
    const postTitle = (payload.title as string) || 'Untitled Post';
    
    try {
      // Fetch complete post metadata with gating context
      const metadata = await fetchPostMetadataDirect(postId);
      if (!metadata) {
        console.warn(`[TelegramEventHandler] Could not fetch metadata for post ${postId}, falling back to text notification`);
        await this.handleNewPostFallback(payload, boardContext);
        return;
      }
      
      // Generate OG image
      const baseUrl = this.getBaseUrl();
      const imageBuffer = await generateTelegramOgImage(metadata, baseUrl);
      
      // Generate shareable URL
      const shareUrl = await generateTelegramShareUrl(
        postId,
        boardContext.boardId,
        postTitle,
        boardContext.boardName,
        payload.communityShortId as string,
        payload.pluginId as string
      );
      
      // Create caption for the image
      const caption = `🆕 <b>New Post</b>\n\n📝 <b>${this.escapeHtml(postTitle)}</b>\n👤 by ${this.escapeHtml(metadata.author_name)}\n📋 in ${this.escapeHtml(boardContext.boardName || 'Board')}`;
      
      // Send image notification with caption and URL
      const result = await telegramService.sendImageNotificationToCommunity(
        boardContext.communityId,
        imageBuffer,
        shareUrl,
        caption
      );
      
      console.log(`[TelegramEventHandler] OG image new post notification sent: ${result.sent} successful, ${result.failed} failed`);
      
    } catch (error) {
      console.error(`[TelegramEventHandler] Error sending OG image notification, falling back to text:`, error);
      await this.handleNewPostFallback(payload, boardContext);
    }
  }
  
  /**
   * Fallback to text notification if OG image fails
   */
  private async handleNewPostFallback(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
    const postId = payload.id as number;
    const postTitle = (payload.title as string) || 'Untitled Post';
    
    const shareUrl = await generateTelegramShareUrl(
      postId,
      boardContext.boardId,
      postTitle,
      boardContext.boardName,
      payload.communityShortId as string,
      payload.pluginId as string
    );
    
    const notificationData: NotificationData = {
      type: 'new_post',
      post_id: postId,
      post_title: postTitle,
      user_name: (payload.author_name as string) || 'Unknown User',
      community_name: 'Community',
      board_name: boardContext.boardName || 'Board'
    };
    
    const result = await telegramService.sendTwoPartNotification(
      boardContext.communityId,
      notificationData,
      shareUrl
    );
    
    console.log(`[TelegramEventHandler] Fallback new post notification sent: ${result.sent} successful, ${result.failed} failed`);
  }

  /**
   * Handle vote update notifications with smart thresholds
   */
  private async handleVoteUpdate(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
    const postId = payload.postId as number;
    const newCount = payload.newCount as number;
    const post_title = payload.post_title as string;
    
    // Only notify on milestone upvotes to prevent spam
    if (!VOTE_NOTIFICATION_THRESHOLDS.includes(newCount)) {
      console.log(`[TelegramEventHandler] Skipping vote notification - count ${newCount} not a milestone`);
      return;
    }
    
    console.log(`[TelegramEventHandler] Processing vote milestone notification: ${newCount} votes for post ${postId}`);
    
    // Generate shareable URL
    const shareUrl = await generateTelegramShareUrl(
      postId,
      boardContext.boardId,
      post_title || 'Untitled Post',
      boardContext.boardName,
      payload.communityShortId as string,
      payload.pluginId as string
    );
    
    const notificationData: NotificationData = {
      type: 'upvote',
      post_id: postId,
      post_title: post_title || 'Untitled Post',
      user_name: 'Community', // Don't show individual voter for milestones
      metadata: {
        upvote_count: newCount,
        is_milestone: true
      }
      // Note: No post_url in rich message - comes separately
    };
    
    // Send two-part notification: rich message + clean link
    const result = await telegramService.sendTwoPartNotification(
      boardContext.communityId,
      notificationData,
      shareUrl
    );
    
    console.log(`[TelegramEventHandler] Two-part vote milestone notification sent: ${result.sent} successful, ${result.failed} failed`);
  }

  /**
   * Handle new comment notifications
   */
  private async handleNewComment(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
    const postId = payload.postId as number;
    const post_title = payload.post_title as string;
    console.log(`[TelegramEventHandler] Processing new comment notification for post ${postId}`);
    
    const comment = (payload.comment as Record<string, unknown>) || {};
    
    // Generate shareable URL
    const shareUrl = await generateTelegramShareUrl(
      postId,
      boardContext.boardId,
      post_title || 'Untitled Post', // ✅ Now uses real post title from payload
      boardContext.boardName,
      payload.communityShortId as string,
      payload.pluginId as string
    );
    
    const notificationData: NotificationData = {
      type: 'comment',
      post_id: postId,
      post_title: post_title || 'Untitled Post', // ✅ Now uses real post title from payload
      user_name: (comment.author_name as string) || 'Unknown User'
      // Note: No content or post_url in rich message - content removed for simplicity, URL comes separately
    };
    
    // Send two-part notification: rich message + clean link
    const result = await telegramService.sendTwoPartNotification(
      boardContext.communityId,
      notificationData,
      shareUrl
    );
    
    console.log(`[TelegramEventHandler] Two-part new comment notification sent: ${result.sent} successful, ${result.failed} failed`);
  }

  /**
   * Handle post deletion notifications (optional)
   */
  private async handlePostDeleted(payload: Record<string, unknown>): Promise<void> {
    const postId = payload.postId as number;
    console.log(`[TelegramEventHandler] Processing post deletion notification for post ${postId}`);
    
    // Only notify for post deletions if we want to inform about moderation actions
    // For now, let's skip these as they might be too noisy
    console.log(`[TelegramEventHandler] Skipping post deletion notification - feature disabled`);
  }
}

// Export singleton instance
export const telegramEventHandler = new TelegramEventHandler(); 