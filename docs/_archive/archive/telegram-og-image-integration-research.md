# Telegram OG Image Integration Research & Implementation Plan

## Executive Summary

**Goal**: Replace two-message Telegram notifications (rich text + URL) with image-based notifications that include server-generated OG images as attachments. This approach eliminates reliance on client-side link previews (which don't work with bot API) and provides richer, more engaging notifications.

**Key Insight**: Telegram link previews are generated client-side. Since we send via bot API (server-to-server), no client generates previews. We must generate and attach images ourselves.

## Current State Analysis

### What We Have ✅
- **Working Telegram notification system** with two-message approach
- **Robust OG image generation** (`/api/og-image`) with privacy-aware features
- **Post metadata API** (`/api/posts/[postId]/metadata`) with gating context
- **Semantic URL system** (via SemanticUrlService) for direct database access
- **Community context** (communityShortId, pluginId) now passed in events

### Current Limitations ❌
- **No Telegram link previews** - bot API doesn't trigger client-side preview generation
- **Two-message redundancy** - rich text + URL creates noise
- **HTTP dependency** - buildExternalShareUrl fails server-side due to relative URL issues
- **No visual engagement** - text-only notifications lack impact

## Proposed Solution Architecture

### Core Concept: Image-First Notifications
Replace current two-message system with single image messages that contain:
1. **Server-generated OG image** with post content, author, board context
2. **Rich caption** with post details and clean share URL
3. **Direct image attachment** (no reliance on external preview generation)

### Technical Implementation Strategy

#### 1. Direct API Integration (No HTTP Calls)
- **Replace HTTP-based** `buildExternalShareUrl` with direct `SemanticUrlService.create()`
- **Eliminate server-side HTTP calls** that cause URL parsing errors
- **Use database-direct** approach for semantic URL generation

#### 2. Server-Side OG Image Generation
- **Leverage existing** `/api/og-image` infrastructure
- **Generate images in-memory** without saving to disk
- **Return image buffer** for direct Telegram attachment

#### 3. Enhanced Telegram Service
- **Add `sendPhoto` method** to TelegramService for image messages
- **Support image captions** with HTML formatting
- **Maintain rate limiting** and error handling

## Detailed Implementation Plan

### Phase 1: Enhanced URL Generation Service

#### 1.1 Create Direct Semantic URL Generator
```typescript
// src/lib/telegram/directUrlGenerator.ts
import { SemanticUrlService } from '@/lib/semantic-urls';

export async function generateSemanticUrlDirect(
  postId: number,
  boardId: number,
  postTitle: string,
  boardName: string,
  communityShortId: string,
  pluginId: string
): Promise<string> {
  try {
    // Direct database call - no HTTP
    const semanticUrl = await SemanticUrlService.create({
      postId,
      postTitle,
      boardId,
      boardName,
      communityShortId,
      pluginId,
      shareSource: 'telegram_notification'
    });
    
    // Build full URL directly
    const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
    return SemanticUrlService.buildFullUrl(semanticUrl, baseUrl);
    
  } catch (error) {
    console.warn('[DirectURLGenerator] Semantic URL failed, using legacy:', error);
    return generateLegacyUrlDirect(postId, boardId, communityShortId, pluginId);
  }
}
```

#### 1.2 Direct Metadata Fetcher
```typescript
// src/lib/telegram/directMetadataFetcher.ts
import { query } from '@/lib/db';
import type { EnhancedPostMetadata } from '@/app/api/posts/[postId]/metadata/route';

export async function fetchPostMetadataDirect(postId: number): Promise<EnhancedPostMetadata | null> {
  try {
    const result = await query(`
      SELECT 
        p.id, p.title, p.content, p.upvote_count, p.comment_count, 
        p.created_at, p.tags, p.settings as post_settings,
        b.name as board_name, b.settings as board_settings, b.community_id,
        c.settings as community_settings,
        u.name as author_name
      FROM posts p
      JOIN boards b ON p.board_id = b.id  
      JOIN communities c ON b.community_id = c.id
      JOIN users u ON p.author_user_id = u.user_id
      WHERE p.id = $1
    `, [postId]);
    
    if (result.rows.length === 0) return null;
    
    const postData = result.rows[0];
    // Process gating context same as metadata API
    return processGatingContext(postData);
    
  } catch (error) {
    console.error('[DirectMetadataFetcher] Error:', error);
    return null;
  }
}
```

### Phase 2: OG Image Buffer Generation

#### 2.1 Image Generator Service
```typescript
// src/lib/telegram/imageGenerator.ts
import { ImageResponse } from 'next/og';
import type { EnhancedPostMetadata } from '@/app/api/posts/[postId]/metadata/route';

export async function generateOGImageBuffer(
  postData: EnhancedPostMetadata
): Promise<Buffer> {
  try {
    // Use existing OG image generation logic but return buffer
    const imageResponse = new ImageResponse(
      // Same JSX structure as /api/og-image but with postData
      getOGImageJSX(postData),
      { width: 1200, height: 630 }
    );
    
    // Convert to buffer for Telegram attachment
    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
    
  } catch (error) {
    console.error('[ImageGenerator] Error generating OG image:', error);
    throw new Error('Failed to generate post image');
  }
}

function getOGImageJSX(postData: EnhancedPostMetadata) {
  // Extract existing JSX from /api/og-image route
  // Adapt for EnhancedPostMetadata structure
  // Include gating indicators, requirements, etc.
}
```

#### 2.2 Fallback Image Generator
```typescript
// Generate simple text-based image if OG generation fails
export async function generateFallbackImageBuffer(
  title: string,
  author: string,
  boardName: string
): Promise<Buffer> {
  // Simple text-based image generation
  // Minimal dependencies, guaranteed to work
}
```

### Phase 3: Enhanced Telegram Service

#### 3.1 Photo Sending Capability
```typescript
// Enhanced TelegramService with photo support
export class TelegramService {
  /**
   * Send photo with caption to Telegram chat
   */
  async sendPhoto(
    chatId: string,
    imageBuffer: Buffer,
    caption?: string,
    options: SendPhotoOptions = {}
  ): Promise<boolean> {
    try {
      this.ensureInitialized();
      
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', new Blob([imageBuffer]), 'post-preview.jpg');
      
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }
      
      const response = await fetch(`${this.baseUrl}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        console.error(`[TelegramService] Failed to send photo to ${chatId}:`, await response.text());
        return false;
      }
      
      console.log(`[TelegramService] Photo sent successfully to ${chatId}`);
      return true;
      
    } catch (error) {
      console.error(`[TelegramService] Error sending photo to ${chatId}:`, error);
      return false;
    }
  }
  
  /**
   * Send rich notification with image attachment
   */
  async sendImageNotification(
    communityId: string,
    notificationData: NotificationData,
    shareUrl: string
  ): Promise<{ sent: number; failed: number }> {
    const groups = await this.getGroupsByCommunity(communityId);
    
    if (groups.length === 0) {
      return { sent: 0, failed: 0 };
    }
    
    let sent = 0;
    let failed = 0;
    
    // Generate OG image for the post
    let imageBuffer: Buffer;
    try {
      const postMetadata = await fetchPostMetadataDirect(notificationData.post_id!);
      if (postMetadata) {
        imageBuffer = await generateOGImageBuffer(postMetadata);
      } else {
        imageBuffer = await generateFallbackImageBuffer(
          notificationData.post_title || 'Post',
          notificationData.user_name || 'User',
          notificationData.board_name || 'Board'
        );
      }
    } catch (error) {
      console.warn('[TelegramService] Image generation failed, using fallback:', error);
      imageBuffer = await generateFallbackImageBuffer(
        notificationData.post_title || 'Post',
        notificationData.user_name || 'User',
        notificationData.board_name || 'Board'
      );
    }
    
    // Create rich caption with share URL
    const caption = this.formatImageCaption(notificationData, shareUrl);
    
    // Send to all eligible groups
    const eligibleGroups = groups.filter(group => 
      this.shouldSendNotification(group, notificationData)
    );
    
    for (const group of eligibleGroups) {
      try {
        const success = await this.sendPhoto(group.chat_id, imageBuffer, caption);
        if (success) sent++;
        else failed++;
      } catch (error) {
        console.error(`[TelegramService] Failed to send image to ${group.chat_id}:`, error);
        failed++;
      }
    }
    
    return { sent, failed };
  }
  
  private formatImageCaption(data: NotificationData, shareUrl: string): string {
    switch (data.type) {
      case 'new_post':
        return `🆕 <b>New Post</b>\n\n📝 <b>${this.escapeHtml(data.post_title || 'Untitled')}</b>\n👤 by ${this.escapeHtml(data.user_name || 'Unknown')}\n📋 in ${this.escapeHtml(data.board_name || 'General')}\n\n🔗 ${shareUrl}`;
      case 'upvote':
        const count = data.metadata?.upvote_count || 1;
        return `👍 <b>Milestone Reached</b>\n\n📝 <b>${this.escapeHtml(data.post_title || 'Untitled')}</b>\n📊 ${count} ${count === 1 ? 'upvote' : 'upvotes'}\n\n🔗 ${shareUrl}`;
      case 'comment':
        return `💬 <b>New Comment</b>\n\n📝 on <b>${this.escapeHtml(data.post_title || 'Untitled')}</b>\n👤 by ${this.escapeHtml(data.user_name || 'Unknown')}\n\n🔗 ${shareUrl}`;
      default:
        return `🔔 <b>Activity</b>\n\n${data.content || 'Something happened'}\n\n🔗 ${shareUrl}`;
    }
  }
}
```

### Phase 4: Event Handler Integration

#### 4.1 Updated Telegram Event Handler
```typescript
// src/lib/telegram/TelegramEventHandler.ts (updated)
export class TelegramEventHandler {
  private async handleNewPost(payload: Record<string, unknown>, boardContext: BoardContext): Promise<void> {
    const postId = payload.id as number;
    const postTitle = (payload.title as string) || 'Untitled Post';
    
    // Generate semantic URL directly (no HTTP)
    const shareUrl = await generateSemanticUrlDirect(
      postId,
      boardContext.boardId,
      postTitle,
      boardContext.boardName || 'Board',
      payload.communityShortId as string,
      payload.pluginId as string
    );
    
    const notificationData: NotificationData = {
      type: 'new_post',
      post_id: postId,
      post_title: postTitle,
      user_name: (payload.author_name as string) || 'Unknown User',
      board_name: boardContext.boardName || 'Board'
    };
    
    // Send image notification instead of two-part text
    const result = await telegramService.sendImageNotification(
      boardContext.communityId,
      notificationData,
      shareUrl
    );
    
    console.log(`[TelegramEventHandler] Image notification sent: ${result.sent} successful, ${result.failed} failed`);
  }
  
  // Similar updates for handleVoteUpdate and handleNewComment
}
```

### Phase 5: Error Handling & Fallbacks

#### 5.1 Graceful Degradation
```typescript
export class TelegramNotificationOrchestrator {
  async sendNotification(
    communityId: string,
    notificationData: NotificationData,
    context: EventContext
  ): Promise<NotificationResult> {
    try {
      // Attempt image notification first
      return await this.sendImageNotification(communityId, notificationData, context);
    } catch (imageError) {
      console.warn('[TelegramOrchestrator] Image notification failed, falling back to text:', imageError);
      
      // Fallback to existing two-part text system
      return await this.sendTextNotification(communityId, notificationData, context);
    }
  }
  
  private async sendImageNotification(
    communityId: string,
    notificationData: NotificationData,
    context: EventContext
  ): Promise<NotificationResult> {
    // Generate URL directly
    const shareUrl = await generateSemanticUrlDirect(
      notificationData.post_id!,
      context.boardId,
      notificationData.post_title!,
      notificationData.board_name!,
      context.communityShortId,
      context.pluginId
    );
    
    // Send image with caption
    return await telegramService.sendImageNotification(
      communityId,
      notificationData,
      shareUrl
    );
  }
  
  private async sendTextNotification(
    communityId: string,
    notificationData: NotificationData,
    context: EventContext
  ): Promise<NotificationResult> {
    // Existing two-part system as fallback
    const shareUrl = await generateLegacyUrl(context);
    return await telegramService.sendTwoPartNotification(
      communityId,
      notificationData,
      shareUrl
    );
  }
}
```

## Implementation Roadmap

### Week 1: Foundation (Direct API Integration)
- [ ] **Create directUrlGenerator.ts** - Direct SemanticUrlService integration
- [ ] **Create directMetadataFetcher.ts** - Direct database metadata access
- [ ] **Test URL generation** without HTTP dependencies
- [ ] **Validate metadata fetching** with all gating contexts

### Week 2: Image Generation Pipeline
- [ ] **Create imageGenerator.ts** - OG image buffer generation
- [ ] **Extract OG image JSX** from existing `/api/og-image` route
- [ ] **Implement fallback generator** for error resilience
- [ ] **Test image generation** with various post types and gating

### Week 3: Enhanced Telegram Service
- [ ] **Add sendPhoto method** to TelegramService
- [ ] **Create sendImageNotification** orchestration method
- [ ] **Implement rich caption formatting** with HTML support
- [ ] **Test image sending** to development Telegram groups

### Week 4: Integration & Testing
- [ ] **Update TelegramEventHandler** to use image notifications
- [ ] **Implement error handling** and text fallbacks
- [ ] **Test complete flow** from post creation to Telegram image
- [ ] **Monitor performance** and optimize as needed

### Week 5: Deployment & Monitoring
- [ ] **Deploy to production** with feature flag
- [ ] **A/B test** image vs text notifications
- [ ] **Monitor engagement** and error rates
- [ ] **Gather user feedback** and iterate

## Technical Considerations

### Performance Optimizations
- **Image caching**: Cache generated OG images by post ID for repeated notifications
- **Lazy generation**: Only generate images when needed, not preemptively
- **Buffer pooling**: Reuse image buffers to reduce memory allocation
- **Rate limiting**: Respect Telegram's photo upload limits (more restrictive than text)

### Error Handling Strategies
- **Multiple fallback layers**: OG image → fallback image → text notification
- **Graceful degradation**: Never block notifications due to image generation failures
- **Monitoring**: Track image generation success rates and performance
- **Alerting**: Alert on high failure rates or performance degradation

### Security Considerations
- **Input validation**: Sanitize all text inputs for image generation
- **Resource limits**: Prevent DoS through image generation resource exhaustion
- **Buffer management**: Properly dispose of image buffers to prevent memory leaks
- **File type validation**: Ensure only image buffers are sent to Telegram

### Privacy & Compliance
- **Gating awareness**: Images should reflect gating status (blur, indicators)
- **Content filtering**: Respect privacy settings in image generation
- **GDPR compliance**: Track what metadata is embedded in images
- **User consent**: Ensure users consented to image-based notifications

## Success Metrics

### Engagement Metrics
- **Click-through rates**: Compare image vs text notification engagement
- **Response rates**: Comments/reactions to notifications
- **User feedback**: Survey responses on notification preference

### Technical Metrics
- **Generation success rate**: % of image generations that succeed
- **Delivery success rate**: % of image notifications delivered
- **Performance**: Image generation time and memory usage
- **Error rates**: Track fallback usage and failure modes

### Business Impact
- **User retention**: Do richer notifications improve retention?
- **Activity levels**: Does visual engagement drive more forum activity?
- **Community growth**: Do better notifications attract new users?

## Risk Mitigation

### High-Risk Areas
1. **Image generation failures** → Multiple fallback layers
2. **Memory usage spikes** → Buffer management and pooling
3. **Telegram API limits** → Rate limiting and queue management
4. **Performance degradation** → Caching and optimization

### Monitoring & Alerting
- **Real-time dashboards** for image generation metrics
- **Alerts** for high failure rates or performance issues
- **Log aggregation** for debugging complex failure scenarios
- **A/B testing framework** to measure impact and rollback if needed

## Future Enhancements

### Advanced Features
- **Animated images**: Support for GIF generation for dynamic content
- **Localization**: Generate images in user's preferred language
- **Personalization**: Customize images based on user preferences
- **Analytics**: Embed tracking pixels for engagement measurement

### Integration Opportunities
- **Discord integration**: Apply same approach to Discord notifications
- **Email newsletters**: Use same OG images for email content
- **Social sharing**: Enhanced social media preview experience
- **Mobile apps**: Rich push notifications with generated images

## Conclusion

This implementation transforms Telegram notifications from text-based to visual experiences that properly leverage the forum's existing OG image generation infrastructure. By eliminating HTTP dependencies and generating images server-side, we create a more engaging, reliable, and scalable notification system.

The phased approach ensures minimal risk while providing clear fallback paths. The direct API integration solves the immediate URL generation issues while opening possibilities for richer notification experiences across all platforms. 