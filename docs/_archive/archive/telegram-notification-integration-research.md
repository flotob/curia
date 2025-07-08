# Telegram Notification Integration Research

## Executive Summary

This document outlines the implementation of Phase 2: integrating Telegram notifications with our existing Socket.IO real-time event system. The goal is to extend the current event broadcasting to simultaneously notify Telegram groups while maintaining clean architectural separation.

## Current Architecture Analysis

### ✅ **What's Already Built (Phase 2A Complete!)**

#### **1. Socket.IO Event System (Functional)**
- **Location**: `server.ts` lines 303-357
- **Event Emitter**: `process.customEventEmitter` shared between API routes and Socket.IO server
- **Flow**: API routes → `customEventEmitter.emit('broadcastEvent')` → Socket.IO broadcasts to web clients
- **Events**: `newPost`, `voteUpdate`, `newComment`, `postDeleted`, `boardSettingsChanged`

#### **2. TelegramService Infrastructure (Complete)**
- **Location**: `src/lib/telegram/TelegramService.ts`
- **Features**: Message sending, rate limiting, HTML formatting, group management
- **Database**: `telegram_groups` table with registered group (confirmed working)
- **Methods**: `sendNotificationToCommunity()`, rate-limited queuing, quiet hours
- **Fixed**: Lazy initialization to work with server.ts environment loading

#### **3. TelegramEventHandler (Phase 2A Complete!)**
- **Location**: `src/lib/telegram/TelegramEventHandler.ts`
- **Features**: Event routing, community resolution, smart vote thresholds
- **Integration**: Parallel event listener in `server.ts` 
- **Error Isolation**: Telegram failures don't affect Socket.IO system

#### **4. API Route Event Triggers (Working)**
- **Posts**: `src/app/api/posts/route.ts` - triggers `newPost` events ✅
- **Votes**: `src/app/api/posts/[postId]/votes/route.ts` - triggers `voteUpdate` events ✅
- **Comments**: Similar pattern (events implemented) ✅
- **Pattern**: Direct `process.customEventEmitter.emit()` calls in API routes

### ✅ **Phase 2A Results - System Working!**
- ✅ **End-to-End Flow**: Post creation → Telegram notification confirmed working
- ✅ **Error Isolation**: Telegram failures don't crash Socket.IO system
- ✅ **Community Resolution**: `board:X` rooms properly resolved to community IDs
- ✅ **Environment Variables**: Fixed server.ts loading order with lazy initialization

## Phase 2B Implementation Plan - User-Requested Improvements

### **Issues Identified & Solutions**

#### **1. Upvote Notifications Not Working**
**Problem**: Vote notifications not being sent to Telegram groups  
**Investigation Needed**: Check if vote thresholds are too high or payload structure mismatch  
**Vote Payload Structure** (from `/api/posts/[postId]/votes/route.ts`):
```javascript
{
  postId: number,
  newCount: number, 
  userIdVoted: string,
  board_id: number,
  post_title: string,
  board_name: string
}
```

**Current Thresholds**: `[5, 10, 25, 50, 100, 250, 500, 1000]`  
**Solution**: Debug vote event flow and potentially lower initial threshold to 3 or 1 for testing

#### **2. Two-Message System Implementation**
**Requirement**: Send 2 separate messages per notification:
1. **Message 1**: Rich notification (current format but simplified)
2. **Message 2**: Clean shareable link only

**Benefits**: 
- Rich notification provides context
- Clean link gets Telegram preview/unfurling
- Better UX for both information and sharing

#### **3. Shareable Link Integration**
**Current Issue**: Using simple post URLs instead of proper shareable links  
**Solution**: Use `buildExternalShareUrl()` from `src/utils/urlBuilder.ts`

**ShareURL Research Findings**:
- **Function**: `buildExternalShareUrl(postId, boardId, communityShortId, pluginId, postTitle, boardName)`
- **Features**: Generates semantic URLs with fallback to legacy URLs
- **Same as ShareModal**: Exact same URL generation used in PostCard share functionality
- **Location**: Already imported in PostCard, battle-tested

#### **4. Content Simplification**
**Requirement**: Remove post/comment content from notifications  
**Reason**: Content is complex object (TipTap JSON), not simple string  
**Solution**: Remove `content` field from notification data, keep titles and metadata only

## Phase 2B Detailed Implementation

### **Step 1: Debug Vote Notifications (30 minutes)**

#### **Issue Diagnosis**
```typescript
// Current vote thresholds might be too high for testing
const VOTE_NOTIFICATION_THRESHOLDS = [5, 10, 25, 50, 100, 250, 500, 1000];

// Potential solutions:
// 1. Lower first threshold to 1 for testing
// 2. Add logging to see what vote counts are being received
// 3. Verify payload field mapping is correct
```

#### **Debug Implementation**
```typescript
// In TelegramEventHandler.ts - add comprehensive logging
private async handleVoteUpdate(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
  const postId = payload.postId as number;
  const newCount = payload.newCount as number;
  const post_title = payload.post_title as string;
  
  // DEBUG: Log all vote events for debugging
  console.log(`[TelegramEventHandler] Vote event received - Post: ${postId}, Count: ${newCount}, Thresholds: ${VOTE_NOTIFICATION_THRESHOLDS}`);
  
  // Temporarily lower threshold for testing
  const TEST_THRESHOLDS = [1, 5, 10, 25, 50, 100];
  
  if (!TEST_THRESHOLDS.includes(newCount)) {
    console.log(`[TelegramEventHandler] Skipping vote notification - count ${newCount} not in test thresholds`);
    return;
  }
  // ... rest of implementation
}
```

### **Step 2: Implement Shareable Link Generation (45 minutes)**

#### **Create Enhanced URL Generator**
```typescript
// src/lib/telegram/shareUrlGenerator.ts
import { buildExternalShareUrl } from '@/utils/urlBuilder';

export async function generateTelegramShareUrl(
  postId: number,
  boardId: number,
  postTitle?: string,
  boardName?: string
): Promise<string> {
  try {
    // Use same logic as PostCard for consistency
    const shareUrl = await buildExternalShareUrl(
      postId,
      boardId,
      undefined, // communityShortId - not available in server context
      undefined, // pluginId - not available in server context  
      postTitle,
      boardName,
      true // useSemanticUrl
    );
    
    console.log(`[TelegramShareURL] Generated semantic URL for post ${postId}: ${shareUrl}`);
    return shareUrl;
    
  } catch (error) {
    console.warn(`[TelegramShareURL] Failed to generate semantic URL for post ${postId}, using fallback:`, error);
    
    // Fallback to simple URL with base URL from environment
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || '';
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, '')}/board/${boardId}/post/${postId}`;
    }
    
    // Last resort: relative URL
    return `/board/${boardId}/post/${postId}`;
  }
}
```

#### **Integration with TelegramEventHandler**
```typescript
// Update notification methods to use shareable URLs
import { generateTelegramShareUrl } from './shareUrlGenerator';

private async handleNewPost(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
  const postId = payload.id as number;
  const postTitle = (payload.title as string) || 'Untitled Post';
  
  // Generate proper shareable URL
  const shareUrl = await generateTelegramShareUrl(
    postId,
    boardContext.boardId,
    postTitle,
    boardContext.boardName
  );
  
  const notificationData: NotificationData = {
    type: 'new_post',
    post_id: postId,
    post_title: postTitle,
    user_name: (payload.author_name as string) || 'Unknown User',
    board_name: boardContext.boardName || 'Board',
    post_url: shareUrl // Now using proper shareable URL
  };
  // ... rest of implementation
}
```

### **Step 3: Implement Two-Message System (60 minutes)**

#### **Enhanced TelegramService Method**
```typescript
// Add new method to TelegramService.ts
/**
 * Send a two-message notification: rich context + clean share link
 */
async sendTwoPartNotification(
  communityId: string,
  notificationData: NotificationData,
  shareUrl: string
): Promise<{ sent: number; failed: number }> {
  const groups = await this.getGroupsByCommunity(communityId);
  
  if (groups.length === 0) {
    console.log(`[TelegramService] No active groups for community ${communityId}`);
    return { sent: 0, failed: 0 };
  }

  console.log(`[TelegramService] Sending two-part ${notificationData.type} notification to ${groups.length} groups`);
  
  // Filter groups based on notification settings
  const eligibleGroups = groups.filter(group => 
    this.shouldSendNotification(group, notificationData)
  );

  let sent = 0;
  let failed = 0;

  for (const group of eligibleGroups) {
    try {
      // Message 1: Rich notification (without content)
      const richMessage = this.formatNotificationMessage({
        ...notificationData,
        content: undefined, // Remove content from rich message
        post_url: undefined // Remove URL from rich message
      });
      
      const richSuccess = await this.sendMessage(group.chat_id, richMessage);
      if (!richSuccess) {
        failed++;
        continue; // Skip second message if first fails
      }
      
      // Small delay between messages to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Message 2: Clean share URL only
      const linkSuccess = await this.sendMessage(group.chat_id, shareUrl);
      
      if (richSuccess && linkSuccess) {
        sent++;
      } else {
        failed++;
      }
      
    } catch (error) {
      console.error(`[TelegramService] Failed to send two-part notification to group ${group.chat_id}:`, error);
      failed++;
    }
  }

  console.log(`[TelegramService] Two-part notification sent: ${sent} successful, ${failed} failed`);
  return { sent, failed };
}
```

#### **Update Event Handlers**
```typescript
// Update all event handlers to use two-part system
private async handleNewPost(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
  console.log(`[TelegramEventHandler] Processing new post notification for community ${boardContext.communityId}`);
  
  const postId = payload.id as number;
  const postTitle = (payload.title as string) || 'Untitled Post';
  
  // Generate shareable URL  
  const shareUrl = await generateTelegramShareUrl(
    postId,
    boardContext.boardId,
    postTitle,
    boardContext.boardName
  );
  
  const notificationData: NotificationData = {
    type: 'new_post',
    post_id: postId,
    post_title: postTitle,
    user_name: (payload.author_name as string) || 'Unknown User',
    community_name: 'Community',
    board_name: boardContext.boardName || 'Board'
    // Note: No post_url or content in rich message
  };
  
  // Send two-part notification
  const result = await telegramService.sendTwoPartNotification(
    boardContext.communityId,
    notificationData,
    shareUrl
  );
  
  console.log(`[TelegramEventHandler] Two-part new post notification sent: ${result.sent} successful, ${result.failed} failed`);
}
```

### **Step 4: Content Simplification (15 minutes)**

#### **Remove Content Parsing**
```typescript
// Update comment notification to not include content
private async handleNewComment(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
  const postId = payload.postId as number;
  
  const shareUrl = await generateTelegramShareUrl(postId, boardContext.boardId);
  
  const notificationData: NotificationData = {
    type: 'comment',
    post_id: postId,
    post_title: 'Post', // Could enhance with post title lookup
    user_name: 'Unknown User', // Extract from payload if available
    // content: undefined, // Removed entirely
  };
  
  // Send two-part notification
  const result = await telegramService.sendTwoPartNotification(
    boardContext.communityId,
    notificationData,
    shareUrl
  );
  // ... logging
}
```

#### **Update Message Formatting**
```typescript
// In TelegramService.ts - update formatters to handle missing content gracefully
private formatNewPostMessage(data: NotificationData): string {
  const { post_title, user_name, community_name, board_name } = data;
  
  return `🆕 <b>New Post</b>

📝 <b>${this.escapeHtml(post_title || 'Untitled Post')}</b>
👤 by ${this.escapeHtml(user_name || 'Unknown User')}
📋 in ${this.escapeHtml(board_name || 'General')} • ${this.escapeHtml(community_name || 'Community')}`;
  // Note: No link in rich message - comes separately
}

private formatCommentMessage(data: NotificationData): string {
  const { post_title, user_name } = data;
  
  return `💬 <b>New Comment</b>

📝 on <b>${this.escapeHtml(post_title || 'Untitled Post')}</b>
👤 by ${this.escapeHtml(user_name || 'Unknown User')}`;
  // Note: No content preview, no link - comes separately
}
```

## Phase 2B Implementation Sequence

### **Priority 1: Debug Vote Notifications (Critical)**
1. **Add comprehensive logging** to vote event handler
2. **Lower vote thresholds** temporarily for testing (1, 3, 5)
3. **Test vote flow** with manual voting
4. **Verify payload structure** matches expectations

### **Priority 2: Shareable Link Integration (High)**
1. **Create shareUrlGenerator utility** using `buildExternalShareUrl`
2. **Update all event handlers** to use shareable URLs
3. **Test URL generation** in development environment
4. **Fallback handling** for URL generation failures

### **Priority 3: Two-Message System (High)**
1. **Implement `sendTwoPartNotification`** method in TelegramService
2. **Update all event handlers** to use two-part system
3. **Add inter-message delays** to respect rate limits
4. **Test complete flow** with rich message + clean link

### **Priority 4: Content Simplification (Medium)**
1. **Remove content parsing** from comment notifications
2. **Update message formatters** to handle missing content
3. **Clean up notification data structures**
4. **Test simplified notifications**

## Testing Strategy

### **Manual Testing Sequence**
1. **Vote Testing**:
   - Create test post
   - Add upvotes incrementally (1, 3, 5, 10)
   - Verify Telegram notifications at each threshold
   
2. **Share URL Testing**:
   - Verify URLs work in browser
   - Check semantic vs. fallback URL generation
   - Test URL preview in Telegram
   
3. **Two-Message Testing**:
   - Verify both messages arrive
   - Check message order and timing
   - Test rate limit handling
   
4. **End-to-End Testing**:
   - Create post → verify 2 messages
   - Add comment → verify 2 messages  
   - Reach vote milestone → verify 2 messages

### **Error Testing**
1. **URL Generation Failures**: Test fallback behavior
2. **Telegram API Failures**: Verify error isolation
3. **Rate Limit Scenarios**: Test message queuing
4. **Invalid Payloads**: Test error handling

## Success Metrics

### **Phase 2B Completion Criteria**
1. ✅ **Vote Notifications Working**: Milestones trigger Telegram messages
2. ✅ **Two-Message System**: Rich notification + clean share link
3. ✅ **Shareable URLs**: Same URLs as ShareModal generates
4. ✅ **Content Simplified**: No complex content parsing
5. ✅ **Error Isolation**: Failures don't affect main system

### **Quality Metrics**
- **Vote Notification Rate**: >90% of milestones trigger notifications
- **URL Success Rate**: >95% generate valid shareable URLs
- **Message Delivery**: Both messages arrive in correct order
- **Performance**: No impact on API response times

## Open Questions & Decisions

### **1. Vote Threshold Strategy** 
- **Current**: `[5, 10, 25, 50, 100, 250, 500, 1000]`
- **Testing**: Lower to `[1, 3, 5, 10, 25, 50]` temporarily
- **Production**: Determine optimal thresholds based on usage

### **2. Inter-Message Timing**
- **Question**: How long to wait between rich message and share link?
- **Options**: 100ms, 500ms, 1000ms
- **Recommendation**: Start with 100ms, adjust based on rate limits

### **3. URL Fallback Strategy**
- **Question**: What to do when semantic URL generation fails?
- **Current**: Falls back to simple post URLs
- **Alternative**: Skip notification entirely vs. use fallback
- **Recommendation**: Always send notification with best available URL

### **4. Community Context in URLs**
- **Issue**: Server context doesn't have `communityShortId` or `pluginId`
- **Impact**: Semantic URLs may not have full context
- **Solution**: Database lookup or environment configuration

## Risk Assessment

### **Low Risk**
- ✅ **Two-Message System**: Incremental improvement to working system
- ✅ **Content Removal**: Simplification reduces complexity
- ✅ **Error Isolation**: Already proven in Phase 2A

### **Medium Risk**  
- ⚠️ **URL Generation**: External dependency on `buildExternalShareUrl`
- ⚠️ **Rate Limiting**: Two messages per event doubles message volume
- **Mitigation**: Proper delays, error handling, fallback URLs

### **High Risk**
- 🔴 **Vote Event Debug**: If vote events aren't firing, need deep investigation
- **Mitigation**: Comprehensive logging, step-by-step debugging

## Summary & Next Steps

Phase 2A delivered a working Telegram notification system. Phase 2B focuses on four key improvements:

1. **Fix vote notifications** (debug threshold/payload issues)
2. **Implement two-message system** (rich notification + clean link)  
3. **Use proper shareable URLs** (same as ShareModal)
4. **Simplify content handling** (remove complex parsing)

**Recommended Implementation Order**:
1. **Debug votes** (30 min) - Critical for testing
2. **Shareable URLs** (45 min) - Foundation for two-message system
3. **Two-message system** (60 min) - Core improvement
4. **Content simplification** (15 min) - Polish

**Total Estimated Time**: 2.5 hours for complete Phase 2B implementation

The system architecture remains robust with proper error isolation, and all improvements are additive to the working Phase 2A foundation. 