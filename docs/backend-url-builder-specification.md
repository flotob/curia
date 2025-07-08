# Backend URL Builder Library Specification

## Executive Summary

This document specifies a new backend URL building library that provides server-side semantic URL generation equivalent to the frontend `buildExternalShareUrl()` function, but without HTTP API dependencies that cause failures in server contexts like RSS feeds, Telegram notifications, and email systems.

## Problem Statement

### Current Architecture Issues

**Frontend URL Building (`buildExternalShareUrl`)**:
- ✅ Creates beautiful semantic URLs: `domain.com/evil/general-discussion/post-title`
- ✅ Tracks URL usage in database
- ❌ Makes HTTP API calls to `/api/links`
- ❌ Fails in server contexts (RSS, Telegram, webhooks)
- ❌ Requires user context (CG iframe, JWT tokens)

**Current Server Workaround (`buildLegacyExternalShareUrl`)**:
- ✅ Works in server contexts
- ✅ No API dependencies
- ❌ Creates ugly URLs: `domain.com/board/215/post/252?token=ABC123`
- ❌ Limited tracking capabilities
- ❌ Inconsistent with frontend experience

### Business Impact

**RSS Feeds**: Currently serve ugly URLs that look unprofessional in RSS readers
**Telegram Notifications**: Share ugly URLs instead of clean semantic ones
**Email Notifications**: Future feature would use ugly URLs
**SEO Impact**: Semantic URLs are better for search engines
**User Experience**: Inconsistent URL formatting across contexts

## Requirements

### Functional Requirements

1. **Semantic URL Generation**: Create clean URLs like `domain.com/community/board/post-title`
2. **Database Integration**: Direct database operations without HTTP calls
3. **Server-Side Compatibility**: Work in any Node.js server context
4. **URL Tracking**: Maintain usage statistics and analytics
5. **Slug Generation**: Convert titles to URL-safe slugs with collision handling
6. **Backward Compatibility**: Don't break existing frontend code
7. **Performance**: Fast URL generation suitable for bulk operations (RSS feeds)

### Non-Functional Requirements

1. **Reliability**: No HTTP call dependencies that can fail
2. **Performance**: < 50ms URL generation time
3. **Scalability**: Handle bulk URL generation (50+ URLs for RSS)
4. **Maintainability**: Single source of truth for URL logic
5. **Type Safety**: Full TypeScript support
6. **Error Handling**: Graceful fallbacks for edge cases

## Current System Analysis

### Frontend URL Building Flow

```typescript
// 1. User clicks share button
buildExternalShareUrl(postId, boardId, communityShortId, pluginId, title, boardName)

// 2. Makes HTTP POST to /api/links
fetch('/api/links', {
  method: 'POST',
  body: JSON.stringify({
    postId, postTitle, boardId, boardName,
    shareSource, communityShortId, pluginId
  })
})

// 3. /api/links endpoint:
//    - Generates URL slug from title
//    - Checks for slug collisions
//    - Creates database record
//    - Returns semantic URL

// 4. Returns: https://domain.com/evil/general-discussion/my-awesome-post
```

### Current Database Schema

```sql
-- Links table stores semantic URLs
CREATE TABLE links (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,                    -- "my-awesome-post"
  community_short_id VARCHAR(100) NOT NULL,            -- "evil"
  board_slug VARCHAR(255) NOT NULL,                    -- "general-discussion"
  post_id INTEGER NOT NULL,
  board_id INTEGER NOT NULL,
  plugin_id VARCHAR(255) NOT NULL,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  post_title VARCHAR(500) NOT NULL,
  board_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  -- URL format: {base_url}/{community_short_id}/{board_slug}/{slug}
);
```

## Proposed Architecture

### Core Library Structure

```
src/lib/backend-url-builder/
├── index.ts                 # Main exports
├── SemanticUrlBuilder.ts    # Core URL building logic
├── SlugGenerator.ts         # Title → slug conversion
├── DatabaseService.ts       # Direct DB operations
├── UrlValidator.ts          # URL validation & collision handling
├── types.ts                 # TypeScript interfaces
└── __tests__/              # Unit tests
```

### Key Components

#### 1. SemanticUrlBuilder (Main Interface)

```typescript
export class SemanticUrlBuilder {
  // Primary method - equivalent to buildExternalShareUrl
  async generateSemanticUrl(params: SemanticUrlParams): Promise<string>
  
  // Bulk generation for RSS/email systems
  async generateBulkUrls(posts: BulkUrlParams[]): Promise<BulkUrlResult[]>
  
  // Check if URL exists without creating it
  async checkUrlExists(postId: number): Promise<string | null>
}

interface SemanticUrlParams {
  postId: number;
  boardId: number;
  postTitle: string;
  boardName: string;
  communityShortId: string;
  pluginId: string;
  shareSource: string;
  baseUrl?: string; // Optional override for testing
}
```

#### 2. SlugGenerator (URL Slug Creation)

```typescript
export class SlugGenerator {
  // Convert title to URL-safe slug
  generateSlug(title: string): string;
  
  // Handle slug collisions with numbered suffixes
  async resolveUniqueSlug(baseSlug: string, excludeIds?: number[]): Promise<string>;
  
  // Convert board name to URL slug
  generateBoardSlug(boardName: string): string;
}
```

#### 3. DatabaseService (Direct DB Operations)

```typescript
export class DatabaseService {
  // Create new semantic URL record
  async createUrlRecord(params: CreateUrlParams): Promise<UrlRecord>;
  
  // Find existing URL by post ID
  async findUrlByPostId(postId: number): Promise<UrlRecord | null>;
  
  // Check slug collision
  async checkSlugExists(slug: string, communityShortId: string, boardSlug: string): Promise<boolean>;
  
  // Update access count
  async incrementAccessCount(linkId: number): Promise<void>;
}
```

### URL Format Specification

**Standard Format**: `{baseUrl}/{communityShortId}/{boardSlug}/{postSlug}`

**Examples**:
- `https://curia.gg/evil/general-discussion/ban-voidcatcher-exposed`
- `https://curia.gg/commonground/announcements/new-governance-proposal`

**Slug Rules**:
- Lowercase alphanumeric + hyphens only
- Max 100 characters
- Collision handling with numbered suffixes: `post-title`, `post-title-2`, `post-title-3`

## Implementation Strategy

### Phase 1: Core Library Development

**Week 1: Foundation**
1. Create `SemanticUrlBuilder` class with basic URL generation
2. Implement `SlugGenerator` with title → slug conversion
3. Add `DatabaseService` with direct database operations
4. Unit tests for core functionality

**Week 2: Advanced Features**
1. Slug collision detection and resolution
2. Bulk URL generation for RSS feeds
3. Error handling and fallback logic
4. Integration tests with real database

### Phase 2: Integration & Migration

**Week 3: RSS Integration**
1. Update RSS endpoint to use new backend library
2. Test RSS feeds show beautiful URLs
3. Performance testing with large feeds

**Week 4: Broader Integration**
1. Update Telegram notification system
2. Prepare for email notification integration
3. Add monitoring and logging

### Phase 3: Optimization & Frontend Alignment

**Week 5: Performance Optimization**
1. Database query optimization
2. Bulk operation improvements
3. Caching layer for frequently accessed URLs

**Week 6: Frontend Migration Planning**
1. Analyze frontend `buildExternalShareUrl` usage
2. Plan gradual migration strategy
3. Ensure backward compatibility

## Database Considerations

### New Indexes Needed

```sql
-- Optimize slug collision checking
CREATE INDEX idx_links_slug_community_board ON links(slug, community_short_id, board_slug);

-- Optimize post ID lookups
CREATE INDEX idx_links_post_id ON links(post_id);

-- Optimize bulk operations
CREATE INDEX idx_links_created_at ON links(created_at);
```

### Migration Considerations

- Existing `links` table can be reused as-is
- New backend library should be compatible with existing records
- No schema changes required initially

## Error Handling Strategy

### Graceful Degradation

```typescript
try {
  // Attempt semantic URL generation
  return await semanticUrlBuilder.generateSemanticUrl(params);
} catch (error) {
  console.warn('Semantic URL generation failed, falling back to legacy:', error);
  // Fallback to legacy token URLs
  return buildLegacyExternalShareUrl(postId, boardId, communityShortId, pluginId);
}
```

### Error Categories

1. **Database Errors**: Connection issues, query failures
2. **Validation Errors**: Invalid input parameters
3. **Collision Errors**: Unable to resolve unique slug after multiple attempts
4. **Configuration Errors**: Missing base URL or database config

## Testing Strategy

### Unit Tests
- Slug generation and collision handling
- URL format validation
- Database service operations
- Error handling scenarios

### Integration Tests
- End-to-end URL generation
- RSS feed URL quality
- Performance with bulk operations
- Database transaction handling

### Performance Tests
- Single URL generation: < 50ms
- Bulk URL generation (50 URLs): < 2 seconds
- Concurrent URL generation
- Database connection pooling

## Monitoring & Analytics

### Metrics to Track
- URL generation success rate
- Average generation time
- Fallback usage frequency
- Database query performance
- Slug collision frequency

### Logging Strategy
- Info: Successful URL generation
- Warn: Fallback to legacy URLs
- Error: Database failures or invalid inputs
- Debug: Slug collision resolution steps

## Future Considerations

### Potential Enhancements

1. **Custom URL Patterns**: Community-specific URL formats
2. **URL Expiration**: Time-based URL invalidation
3. **URL Redirects**: Handle slug changes when post titles change
4. **Caching Layer**: Redis cache for frequently accessed URLs
5. **URL Analytics**: Detailed click tracking and analytics

### Scalability Considerations

1. **Database Sharding**: Partition links table by community
2. **CDN Integration**: Cache semantic URLs at edge locations
3. **Async Generation**: Queue-based URL generation for bulk operations
4. **Microservice Architecture**: Separate URL service for high availability

## Success Criteria

### Technical Metrics
- ✅ RSS feeds serve semantic URLs instead of token URLs
- ✅ URL generation time < 50ms (95th percentile)
- ✅ Zero HTTP API dependencies in server contexts
- ✅ 99.9% URL generation success rate
- ✅ Backward compatibility with existing frontend code

### Business Metrics
- ✅ Professional-looking URLs in all sharing contexts
- ✅ Consistent URL format across frontend and backend
- ✅ Improved SEO potential for shared content
- ✅ Better user experience for RSS subscribers
- ✅ Foundation for future notification systems

## Conclusion

The Backend URL Builder Library will solve the fundamental architectural issue where server-side contexts cannot generate beautiful semantic URLs. By providing direct database operations without HTTP dependencies, we'll achieve consistent, professional URL generation across all contexts while maintaining performance and reliability.

This library represents a critical infrastructure improvement that will benefit RSS feeds immediately and enable future features like email notifications, improved Telegram integration, and enhanced SEO capabilities. 