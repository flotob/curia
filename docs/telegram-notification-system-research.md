# Telegram Notification System Research & Implementation Plan

## Executive Summary

This document outlines the implementation of a Telegram notification system that extends our existing Socket.IO real-time notification infrastructure. The system will allow users and communities to invite our Telegram bot into their groups, register those groups with our platform, and receive real-time notifications about forum activities (posts, upvotes, comments, etc.) directly in Telegram.

## Current State Analysis

### Existing Infrastructure
- **Socket.IO Notification System**: Real-time notifications for user activities
- **Event Types**: Posts, upvotes, comments, user presence
- **Database**: PostgreSQL with existing notification/event tracking
- **Authentication**: Privy-based user authentication
- **API**: Next.js API routes with authentication middleware

### Integration Goals
- Extend existing notification events to Telegram groups
- Maintain real-time characteristics
- Provide user-friendly group registration process
- Handle Telegram's rate limits and reliability requirements
- Scale to support multiple communities and groups

## Technical Research Findings

### Telegram Bot API 2024 Capabilities

**Current Version**: Bot API 9.0 (April 2025)

**Key Features for Our Use Case**:
- Group management and message posting
- Webhook support for real-time updates
- Rich message formatting (Markdown/HTML)
- Rate limiting with auto-retry mechanisms
- Group membership tracking

**Rate Limits (2024)**:
- **Per Chat**: ~1 message/second (flexible)
- **Bulk Notifications**: ~30 messages/second
- **Group Limits**: 20 messages/minute per group
- **Dynamic**: Limits adjust based on bot usage patterns and content

**Best Practices**:
- Use webhooks over polling for production
- Implement auto-retry for 429 errors (required)
- Never artificially throttle - let Telegram's limits guide flow
- Queue-based broadcasting for reliability

### Group Management Flow

**User Journey**:
1. User invites bot to their Telegram group
2. Bot detects addition via webhook
3. User visits our platform to register the group
4. System validates bot membership and stores registration
5. Notifications begin flowing to registered group

**Technical Implementation**:
- Bot receives `my_chat_member` updates when added/removed
- Store group registrations with permissions and notification preferences
- Validate bot has necessary permissions before enabling notifications

## System Architecture

### Database Schema Extensions

```sql
-- Telegram bot registrations
CREATE TABLE telegram_groups (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  chat_title TEXT NOT NULL,
  community_id TEXT REFERENCES communities(id) ON DELETE CASCADE,
  registered_by_user_id TEXT NOT NULL,
  notification_settings JSONB DEFAULT '{}' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  bot_permissions JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Notification delivery tracking
CREATE TABLE telegram_notifications (
  id SERIAL PRIMARY KEY,
  telegram_group_id INTEGER REFERENCES telegram_groups(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  source_post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  source_comment_id INTEGER REFERENCES comments(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  telegram_message_id INTEGER,
  delivery_status TEXT DEFAULT 'pending' NOT NULL, -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX telegram_groups_community_id_idx ON telegram_groups(community_id);
CREATE INDEX telegram_groups_active_idx ON telegram_groups(is_active) WHERE is_active = true;
CREATE INDEX telegram_notifications_status_idx ON telegram_notifications(delivery_status);
CREATE INDEX telegram_notifications_created_idx ON telegram_notifications(created_at);
```

### API Endpoints

```typescript
// Bot webhook endpoint
POST /api/telegram/webhook
- Receives Telegram updates
- Handles bot additions/removals from groups
- Processes commands and user interactions

// Group registration
POST /api/telegram/groups
- Registers a Telegram group for notifications
- Validates user permissions and bot membership
- Configures notification preferences

GET /api/telegram/groups
- Lists registered groups for authenticated user/community
- Shows current notification settings

PUT /api/telegram/groups/[groupId]
- Updates notification settings for a group
- Enables/disables specific notification types

DELETE /api/telegram/groups/[groupId]
- Unregisters a group from notifications
- Validates user permissions

// Bot management
GET /api/telegram/bot/info
- Returns bot information for frontend display
- Shows bot username for invitation instructions

POST /api/telegram/test/[groupId]
- Sends test notification to verify setup
- Admin/owner only functionality
```

### Notification Service Architecture

```typescript
// Core notification service
class TelegramNotificationService {
  async sendNotification(event: NotificationEvent): Promise<void>
  async broadcastToGroups(groups: TelegramGroup[], message: string): Promise<void>
  async formatMessage(event: NotificationEvent): Promise<string>
  async handleRateLimit(error: TelegramError): Promise<void>
}

// Integration with existing Socket.IO events
class NotificationBridge {
  async handleSocketEvent(event: SocketEvent): Promise<void>
  async routeToTelegram(event: SocketEvent): Promise<void>
  async filterByPreferences(event: SocketEvent, group: TelegramGroup): Promise<boolean>
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Basic Telegram bot setup and webhook handling

**Deliverables**:
- Create Telegram bot via BotFather
- Implement webhook endpoint for receiving updates
- Database migration for telegram_groups table
- Basic bot addition/removal detection
- Environment configuration

**Code Components**:
```typescript
// /api/telegram/webhook
export default async function handler(req: NextRequest) {
  // Verify webhook authenticity
  // Parse Telegram update
  // Handle my_chat_member events
  // Store/update group information
}
```

**Success Criteria**:
- Bot can be added to groups
- System detects and logs group additions
- Webhook processes updates reliably

### Phase 2: Group Registration (Week 2)
**Goal**: User-facing group registration and management

**Deliverables**:
- Group registration API endpoints
- Frontend UI for group management
- Validation of bot permissions
- Basic notification preferences
- User permission checks

**Code Components**:
```typescript
// Group registration logic
async function registerTelegramGroup(
  chatId: bigint,
  userId: string,
  communityId: string,
  preferences: NotificationSettings
): Promise<TelegramGroup>

// Frontend component
<TelegramGroupManager
  community={community}
  groups={registeredGroups}
  onRegister={handleGroupRegistration}
  onUpdate={handleSettingsUpdate}
/>
```

**Success Criteria**:
- Users can register groups through UI
- System validates bot membership
- Basic notification preferences work
- Groups can be enabled/disabled

### Phase 3: Notification Integration (Week 3)
**Goal**: Connect existing Socket.IO events to Telegram delivery

**Deliverables**:
- Notification message formatting
- Integration with existing event system
- Rate limiting and auto-retry
- Delivery status tracking
- Error handling and monitoring

**Code Components**:
```typescript
// Event bridge
export async function broadcastToTelegram(event: NotificationEvent) {
  const relevantGroups = await getGroupsForEvent(event);
  const message = await formatNotificationMessage(event);
  
  for (const group of relevantGroups) {
    await queueTelegramMessage(group.chatId, message);
  }
}

// Message formatting
function formatPostNotification(post: Post, author: User): string {
  return `🆕 **New Post in ${post.board_name}**\n\n` +
         `**${post.title}**\n` +
         `by ${author.name}\n\n` +
         `👍 ${post.upvote_count} | 💬 ${post.comment_count}\n\n` +
         `[View Post](${buildExternalShareUrl(post.id, post.board_id)})`;
}
```

**Success Criteria**:
- New posts trigger Telegram notifications
- Messages are properly formatted
- Rate limits are respected
- Delivery failures are handled gracefully

### Phase 4: Advanced Features (Week 4)
**Goal**: Polish, monitoring, and advanced notification types

**Deliverables**:
- Additional notification types (upvotes, comments)
- Advanced formatting and customization
- Notification analytics and monitoring
- Admin tools and debugging
- Performance optimization

**Code Components**:
```typescript
// Advanced notification types
const NOTIFICATION_TYPES = {
  NEW_POST: 'new_post',
  NEW_COMMENT: 'new_comment', 
  POST_UPVOTED: 'post_upvoted',
  USER_MENTION: 'user_mention',
  BOARD_ACTIVITY: 'board_activity'
} as const;

// Analytics tracking
async function trackNotificationDelivery(
  groupId: number,
  notificationType: string,
  success: boolean,
  error?: string
) {
  await db.query(`
    INSERT INTO telegram_notifications 
    (telegram_group_id, notification_type, delivery_status, error_message)
    VALUES ($1, $2, $3, $4)
  `, [groupId, notificationType, success ? 'sent' : 'failed', error]);
}
```

**Success Criteria**:
- Multiple notification types working
- Rich message formatting with links
- Analytics dashboard for monitoring
- Error rates < 1% for non-rate-limit issues

## Technical Implementation Details

### Bot Setup and Configuration

```typescript
// Environment variables
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=random_secret_for_security
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username

// Bot initialization
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Set webhook
const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;
await bot.telegram.setWebhook(webhookUrl, {
  secret_token: process.env.TELEGRAM_WEBHOOK_SECRET
});
```

### Webhook Security and Validation

```typescript
// Webhook verification
function verifyTelegramWebhook(body: string, signature: string): boolean {
  const crypto = require('crypto');
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return signature === hash;
}
```

### Message Queue Implementation

```typescript
// Simple in-memory queue (Phase 1-3)
class TelegramMessageQueue {
  private queue: TelegramMessage[] = [];
  private processing = false;
  
  async add(chatId: bigint, text: string): Promise<void> {
    this.queue.push({ chatId, text, timestamp: Date.now() });
    this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const message = this.queue.shift();
    
    try {
      await this.sendWithRetry(message.chatId, message.text);
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      // Log to monitoring system
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }
  
  private async sendWithRetry(chatId: bigint, text: string): Promise<void> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await bot.telegram.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        });
        return;
      } catch (error) {
        if (error.response?.error_code === 429) {
          const retryAfter = error.response.parameters?.retry_after || 1;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
}
```

### Frontend Integration

```typescript
// Group management component
export function TelegramIntegration({ community }: { community: Community }) {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const inviteUrl = `https://t.me/${botUsername}?startgroup=true`;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Telegram Notifications</h3>
        <Button 
          onClick={() => setShowInstructions(true)}
          variant="outline"
        >
          Add Group
        </Button>
      </div>
      
      {showInstructions && (
        <InstructionModal
          botUsername={botUsername}
          inviteUrl={inviteUrl}
          onClose={() => setShowInstructions(false)}
        />
      )}
      
      <RegisteredGroupsList 
        groups={groups}
        onUpdate={updateGroupSettings}
        onRemove={removeGroup}
      />
    </div>
  );
}
```

## Monitoring and Analytics

### Key Metrics to Track

1. **Delivery Metrics**:
   - Messages sent per hour/day
   - Delivery success rate
   - Rate limit encounters
   - Average delivery time

2. **User Engagement**:
   - Groups registered vs. groups active
   - Notification types most used
   - User retention in groups

3. **System Health**:
   - Webhook uptime
   - API response times
   - Error rates by type
   - Queue depth and processing time

### Error Handling Strategy

```typescript
enum TelegramErrorType {
  RATE_LIMITED = 'rate_limited',
  BOT_REMOVED = 'bot_removed',
  CHAT_NOT_FOUND = 'chat_not_found',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

async function handleTelegramError(
  error: any, 
  chatId: bigint, 
  groupId: number
): Promise<void> {
  const errorType = classifyTelegramError(error);
  
  switch (errorType) {
    case TelegramErrorType.BOT_REMOVED:
      await deactivateGroup(groupId);
      break;
      
    case TelegramErrorType.RATE_LIMITED:
      // Auto-retry handles this
      break;
      
    case TelegramErrorType.INSUFFICIENT_PERMISSIONS:
      await markGroupAsNeedsAttention(groupId);
      break;
      
    default:
      await logError(error, chatId, groupId);
  }
}
```

## Security Considerations

### Data Protection
- Store only necessary Telegram data (chat_id, title)
- Implement proper user permission checks
- Secure webhook endpoint with signature verification
- Regular cleanup of old notification logs

### Rate Limiting Protection
- Implement queue-based sending to prevent API abuse
- Monitor for unusual sending patterns
- Auto-retry with exponential backoff
- Circuit breaker for persistent failures

### User Privacy
- Clear disclosure of what data is shared with Telegram
- User control over notification types and frequency
- Easy unsubscription process
- Comply with relevant privacy regulations

## Future Enhancements

### Phase 5+: Advanced Features
- **Interactive Buttons**: Allow users to upvote/reply from Telegram
- **Digest Notifications**: Weekly/daily activity summaries
- **Thread Support**: Better organization for high-activity communities
- **Multi-language Support**: Localized notifications
- **Premium Features**: Enhanced formatting, priority delivery

### Scalability Considerations
- Redis-based message queue for multi-instance deployments
- Database sharding for high-volume communities
- CDN integration for media sharing
- Webhook load balancing

## Risk Assessment

### High Priority Risks
1. **Rate Limiting**: Telegram's dynamic limits could affect delivery
   - **Mitigation**: Robust auto-retry, queue management, monitoring

2. **Bot Removal**: Users removing bot breaks notifications
   - **Mitigation**: Webhook detection, graceful degradation, re-invitation flow

3. **Notification Spam**: Too many notifications annoy users
   - **Mitigation**: Smart filtering, user preferences, digest options

### Medium Priority Risks
1. **API Changes**: Telegram Bot API evolution
   - **Mitigation**: Regular updates, deprecation monitoring

2. **Scale Issues**: High-volume communities overwhelming system
   - **Mitigation**: Queue architecture, rate monitoring, premium tiers

## Success Metrics

### Launch Criteria (Phase 3)
- [ ] Bot can be added to groups successfully
- [ ] Group registration works end-to-end  
- [ ] New post notifications deliver reliably
- [ ] Rate limiting is handled gracefully
- [ ] Error rate < 5% (excluding rate limits)

### Growth Metrics (Phase 4+)
- Groups registered per week
- Active groups (receiving notifications)
- User satisfaction scores
- Notification engagement rates
- System uptime > 99.5%

## Conclusion

This Telegram notification system will provide a natural extension to our existing real-time notification infrastructure, allowing communities to stay connected through their preferred communication platform. The phased approach ensures we can validate the core concept quickly while building toward a robust, scalable solution.

The implementation leverages proven patterns from Telegram bot development, integrates seamlessly with our existing authentication and event systems, and provides a foundation for future community engagement features.

**Next Steps**: 
1. Review and approve technical approach
2. Begin Phase 1 implementation
3. Set up monitoring and error tracking
4. Plan user communication and documentation

---

*Research compiled from Telegram Bot API documentation, community best practices, and analysis of existing notification infrastructure.* 