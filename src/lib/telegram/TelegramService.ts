import { query } from '../db';

interface TelegramGroup {
  id: number;
  chat_id: string;
  chat_title: string;
  community_id: string;
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
  registered_by_user_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface SendMessageOptions {
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  reply_markup?: Record<string, unknown>;
}

export interface NotificationData {
  type: 'new_post' | 'upvote' | 'comment' | 'user_activity';
  post_id?: number;
  post_title?: string;
  post_url?: string;
  user_name?: string;
  community_name?: string;
  board_name?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export class TelegramService {
  private botToken: string | null = null;
  private baseUrl: string | null = null;
  
  // Rate limiting: Telegram allows 30 messages per second to different chats
  private messageQueue: Array<{ chatId: string; message: string; options?: SendMessageOptions }> = [];
  private isProcessingQueue = false;
  private readonly maxMessagesPerSecond = 25; // Conservative limit
  
  constructor() {
    // Don't initialize immediately - use lazy initialization
    this.initializeIfNeeded();
  }

  /**
   * Lazy initialization of bot token and base URL
   * This allows the service to be imported before env vars are loaded
   */
  private initializeIfNeeded(): void {
    if (this.botToken && this.baseUrl) {
      return; // Already initialized
    }

    this.botToken = process.env.TELEGRAM_BOT_API_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
    if (!this.botToken) {
      // Don't throw during construction/import, only when actually trying to use the service
      console.warn('[TelegramService] Bot token not available in environment variables');
      return;
    }
    
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    console.log('[TelegramService] Initialized with bot token');
  }

  /**
   * Ensure service is properly initialized before use
   */
  private ensureInitialized(): void {
    this.initializeIfNeeded();
    
    if (!this.botToken || !this.baseUrl) {
      throw new Error('TelegramService not properly initialized: TELEGRAM_BOT_API_TOKEN or TELEGRAM_BOT_TOKEN environment variable is required');
    }
  }

  /**
   * Send a message to a specific Telegram chat
   */
  async sendMessage(
    chatId: string, 
    message: string, 
    options: SendMessageOptions = {}
  ): Promise<boolean> {
    try {
      // Ensure service is initialized before use
      this.ensureInitialized();

      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: options.disable_web_page_preview ?? true,
        disable_notification: options.disable_notification ?? false,
        ...options.reply_markup && { reply_markup: options.reply_markup }
      };

      const response = await fetch(`${this.baseUrl!}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[TelegramService] Failed to send message to ${chatId}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return false;
      }

      const result = await response.json();
      console.log(`[TelegramService] Message sent successfully to ${chatId}`, {
        messageId: result.result?.message_id
      });
      return true;
    } catch (error) {
      console.error(`[TelegramService] Error sending message to ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Send a message with rate limiting
   */
  async sendMessageQueued(
    chatId: string, 
    message: string, 
    options: SendMessageOptions = {}
  ): Promise<void> {
    this.messageQueue.push({ chatId, message, options });
    
    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
  }

  /**
   * Process the message queue with rate limiting
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    const batchSize = this.maxMessagesPerSecond;
    
    while (this.messageQueue.length > 0) {
      const batch = this.messageQueue.splice(0, batchSize);
      const startTime = Date.now();
      
      // Send batch of messages
      await Promise.all(
        batch.map(({ chatId, message, options }) => 
          this.sendMessage(chatId, message, options)
        )
      );
      
      // Ensure we don't exceed rate limits
      const elapsedTime = Date.now() - startTime;
      const remainingTime = 1000 - elapsedTime;
      
      if (remainingTime > 0 && this.messageQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Get all active Telegram groups for a community
   */
  async getGroupsByCommunity(communityId: string): Promise<TelegramGroup[]> {
    try {
      const result = await query(`
        SELECT * FROM telegram_groups 
        WHERE community_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `, [communityId]);
      
      return result.rows.map(row => ({
        ...row,
        chat_id: row.chat_id.toString() // Ensure string type for chat_id
      }));
    } catch (error) {
      console.error(`[TelegramService] Error fetching groups for community ${communityId}:`, error);
      return [];
    }
  }

  /**
   * Send single notification to all groups in a community with optional clickable link
   */
  async sendNotificationToCommunity(
    communityId: string,
    notificationData: NotificationData,
    shareUrl?: string
  ): Promise<{ sent: number; failed: number }> {
    const groups = await this.getGroupsByCommunity(communityId);
    
    if (groups.length === 0) {
      console.log(`[TelegramService] No active Telegram groups found for community ${communityId}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`[TelegramService] Sending ${notificationData.type} notification to ${groups.length} groups`);
    
    const message = this.formatNotificationMessage(notificationData, shareUrl);
    let sent = 0;
    let failed = 0;

    // Filter groups based on notification settings
    const eligibleGroups = groups.filter(group => 
      this.shouldSendNotification(group, notificationData)
    );

    // Send to all eligible groups
    for (const group of eligibleGroups) {
      try {
        const success = await this.sendMessage(group.chat_id, message);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[TelegramService] Failed to send to group ${group.chat_id}:`, error);
        failed++;
      }
    }

    console.log(`[TelegramService] Notification sent: ${sent} successful, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Send a single notification with clickable title link
   * Replaces the old two-part notification system for better UX
   */
  async sendTwoPartNotification(
    communityId: string,
    notificationData: NotificationData,
    shareUrl: string
  ): Promise<{ sent: number; failed: number }> {
    console.log(`[TelegramService] Sending single ${notificationData.type} notification with clickable link to community ${communityId}`);
    
    // Use the updated single message method with clickable title
    return this.sendNotificationToCommunity(communityId, notificationData, shareUrl);
  }

  /**
   * Send photo with caption to Telegram
   */
  async sendPhoto(
    chatId: string,
    imageBuffer: Buffer,
    caption?: string
  ): Promise<boolean> {
    try {
      // Ensure service is initialized before use
      this.ensureInitialized();

      console.log(`[TelegramService] Sending photo to chat ${chatId} (${imageBuffer.length} bytes)`);

      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'og-image.png');
      
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }

      const response = await fetch(`${this.baseUrl!}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[TelegramService] Failed to send photo to ${chatId}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return false;
      }

      const result = await response.json();
      console.log(`[TelegramService] Photo sent successfully to ${chatId}`, {
        messageId: result.result?.message_id
      });
      return true;
    } catch (error) {
      console.error(`[TelegramService] Error sending photo to ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Send rich image notification to all groups in a community with clickable caption
   */
  async sendImageNotificationToCommunity(
    communityId: string,
    imageBuffer: Buffer,
    shareUrl: string,
    caption?: string
  ): Promise<{ sent: number; failed: number }> {
    const groups = await this.getGroupsByCommunity(communityId);
    
    if (groups.length === 0) {
      console.log(`[TelegramService] No active groups for community ${communityId}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`[TelegramService] Sending image notification to ${groups.length} groups`);
    
    let sent = 0;
    let failed = 0;

    for (const group of groups) {
      try {
        // Send image with caption that already contains clickable links
        const photoSuccess = await this.sendPhoto(group.chat_id, imageBuffer, caption);
        
        if (photoSuccess) {
          sent++;
        } else {
          failed++;
        }
        
      } catch (error) {
        console.error(`[TelegramService] Failed to send image notification to group ${group.chat_id}:`, error);
        failed++;
      }
    }

    console.log(`[TelegramService] Image notification sent: ${sent} successful, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Check if notification should be sent to a group based on settings
   */
  private shouldSendNotification(group: TelegramGroup, notification: NotificationData): boolean {
    const settings = group.notification_settings;
    
    // Check if notifications are enabled
    if (!settings.enabled) {
      return false;
    }

    // Check board-specific settings first (if board_id is available in metadata)
    const boardId = notification.metadata?.board_id;
    if (boardId && settings.boards && settings.boards[boardId.toString()]) {
      const boardSettings = settings.boards[boardId.toString()];
      
      // Use board-specific settings
      if (!boardSettings.enabled) {
        return false;
      }
      
      // Check if this event type is enabled for this board
      if (boardSettings.events && boardSettings.events.length > 0) {
        if (!boardSettings.events.includes(notification.type)) {
          return false;
        }
      }
      
      // Board-specific settings passed, check quiet hours
      if (settings.quiet_hours && this.isInQuietHours(settings.quiet_hours)) {
        return false;
      }
      
      return true;
    }

    // Fall back to global settings
    // Check if this event type is enabled globally
    if (settings.events && settings.events.length > 0) {
      if (!settings.events.includes(notification.type)) {
        return false;
      }
    }

    // Check quiet hours (if configured)
    if (settings.quiet_hours && this.isInQuietHours(settings.quiet_hours)) {
      return false;
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(quietHours: { start: string; end: string; timezone?: string }): boolean {
    try {
      const now = new Date();
      const timeZone = quietHours.timezone || 'UTC';
      
      // Convert current time to the specified timezone
      const currentTime = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }).format(now);

      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      const currentMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = quietHours.start.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;

      const [endHour, endMinute] = quietHours.end.split(':').map(Number);
      const endMinutes = endHour * 60 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 - 08:00)
      if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      } else {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }
    } catch (error) {
      console.error('[TelegramService] Error checking quiet hours:', error);
      return false; // Default to sending if there's an error
    }
  }

  /**
   * Format notification data into a nice Telegram message with clickable title
   */
  private formatNotificationMessage(data: NotificationData, shareUrl?: string): string {
    switch (data.type) {
      case 'new_post':
        return this.formatNewPostMessage(data, shareUrl);
      case 'upvote':
        return this.formatUpvoteMessage(data, shareUrl);
      case 'comment':
        return this.formatCommentMessage(data, shareUrl);
      case 'user_activity':
        return this.formatUserActivityMessage(data, shareUrl);
      default:
        return this.formatGenericMessage(data, shareUrl);
    }
  }

  private formatNewPostMessage(data: NotificationData, shareUrl?: string): string {
    const { post_title, user_name, community_name, board_name } = data;
    const title = post_title || 'Untitled Post';
    
    // Make title clickable if shareUrl is provided
    const formattedTitle = shareUrl 
      ? `<a href="${shareUrl}">${this.escapeHtml(title)}</a>`
      : `<b>${this.escapeHtml(title)}</b>`;
    
    return `🆕 <b>New Post</b>

📝 ${formattedTitle}
👤 by ${this.escapeHtml(user_name || 'Unknown User')}
📋 in ${this.escapeHtml(board_name || 'General')} • ${this.escapeHtml(community_name || 'Community')}`;
  }

  private formatUpvoteMessage(data: NotificationData, shareUrl?: string): string {
    const { post_title, metadata } = data;
    const upvoteCount = metadata?.upvote_count || 1;
    const title = post_title || 'Untitled Post';
    
    // Make title clickable if shareUrl is provided
    const formattedTitle = shareUrl 
      ? `<a href="${shareUrl}">${this.escapeHtml(title)}</a>`
      : `<b>${this.escapeHtml(title)}</b>`;
    
    return `👍 <b>Post Upvoted</b>

📝 ${formattedTitle}
📊 ${upvoteCount} ${upvoteCount === 1 ? 'upvote' : 'upvotes'} total`;
  }

  private formatCommentMessage(data: NotificationData, shareUrl?: string): string {
    const { post_title, user_name } = data;
    const title = post_title || 'Untitled Post';
    
    // Make title clickable if shareUrl is provided
    const formattedTitle = shareUrl 
      ? `<a href="${shareUrl}">${this.escapeHtml(title)}</a>`
      : `<b>${this.escapeHtml(title)}</b>`;
    
    return `💬 <b>New Comment</b>

📝 on ${formattedTitle}
👤 by ${this.escapeHtml(user_name || 'Unknown User')}`;
  }

  private formatUserActivityMessage(data: NotificationData, shareUrl?: string): string { // eslint-disable-line @typescript-eslint/no-unused-vars
    const { user_name, content, metadata } = data;
    
    return `👋 <b>User Activity</b>

👤 ${this.escapeHtml(user_name || 'Unknown User')} ${content || 'is active'}
${metadata?.details ? `\n${this.escapeHtml(String(metadata.details))}` : ''}`;
  }

  private formatGenericMessage(data: NotificationData, shareUrl?: string): string { // eslint-disable-line @typescript-eslint/no-unused-vars
    const { content, user_name } = data;
    
    return `🔔 <b>Notification</b>

${content ? this.escapeHtml(content) : 'Something happened'}
${user_name ? `\n👤 ${this.escapeHtml(user_name)}` : ''}`;
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
   * Register a new Telegram group
   */
  async registerGroup(
    chatId: string,
    chatTitle: string,
    communityId: string,
    registeredByUserId: string,
    notificationSettings: Record<string, unknown> = {}
  ): Promise<boolean> {
    try {
      const defaultSettings = {
        enabled: true,
        events: ['new_post', 'upvote', 'comment'],
        ...notificationSettings
      };

      await query(`
        INSERT INTO telegram_groups (
          chat_id, chat_title, community_id, registered_by_user_id, 
          notification_settings, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (chat_id) DO UPDATE SET
          chat_title = EXCLUDED.chat_title,
          community_id = EXCLUDED.community_id,
          notification_settings = EXCLUDED.notification_settings,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      `, [
        chatId,
        chatTitle,
        communityId,
        registeredByUserId,
        JSON.stringify(defaultSettings),
        true
      ]);

      console.log(`[TelegramService] Group registered: ${chatTitle} (${chatId}) for community ${communityId}`);
      return true;
    } catch (error) {
      console.error(`[TelegramService] Error registering group ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Deactivate a Telegram group (when bot is removed)
   */
  async deactivateGroup(chatId: string): Promise<boolean> {
    try {
      await query(`
        UPDATE telegram_groups 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE chat_id = $1
      `, [chatId]);

      console.log(`[TelegramService] Group deactivated: ${chatId}`);
      return true;
    } catch (error) {
      console.error(`[TelegramService] Error deactivating group ${chatId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const telegramService = new TelegramService(); 