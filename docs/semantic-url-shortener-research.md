# Semantic URL Shortener Service - Database-Backed Solution

## Executive Summary

This document outlines the design for a **database-backed semantic URL shortener** that transforms cryptic forum share URLs into clean, human-readable final destination URLs while maintaining all existing functionality for Common Ground integration, social sharing, and analytics.

**Problem**: Current share URLs are user-hostile and expose implementation details:
```
curia.commonground.cg/board/389/post/34?token=MzQtMzg5LTE3NDkxOTUxMjAzMTIg9d4lp9dnuj&communityShortId=commonground&pluginId=6434de36-4e59-40ba-971b-d4ac5f6050bf
```

**Solution**: Clean, semantic URLs that work as final destinations:
```
curia.commonground.cg/c/commonground/general-discussion/introducing-new-governance-proposal
```

## Why Database-Backed Architecture is Required

### Context Requirements for Share URLs

Share URLs must contain sufficient context for Common Ground to properly route users:

1. **Plugin Instance Routing**: Requires `pluginId` (36-character UUID)
2. **Community Context**: Requires `communityShortId` 
3. **Content Navigation**: Requires `postId`, `boardId`
4. **Share Detection**: Requires unique share tokens for iframe handling
5. **Analytics & Tracking**: Requires share metadata and access tracking

### Why URL-Only Encoding Fails

**Technical Limitations:**
- **Plugin ID Length**: UUIDs are 36 characters, making URLs unwieldy
- **Context Explosion**: All required context creates URLs over 200 characters
- **Security Exposure**: Internal IDs and plugin UUIDs exposed in URLs
- **Inflexibility**: Cannot evolve URL structure without breaking existing links

**Functional Limitations:**
- **No Analytics**: Cannot track individual share instances or access patterns
- **No Management**: Cannot expire, update, or manage URLs at scale
- **No Customization**: Cannot support custom slugs or branding
- **Redirect Chains**: Still requires multi-hop redirects instead of final destinations

### Failed Approach: URL-Only Encoding

Our initial attempt at URL-only encoding (using patterns like `p34b389` in URLs) was fundamentally flawed because:

1. **Missing Plugin Context**: Cannot encode 36-character plugin UUIDs in user-friendly URLs
2. **Redirect Complexity**: Still required client-side detection and multiple redirects
3. **Not Final Destinations**: URLs were just redirect middleware, not true semantic endpoints
4. **No Share Context**: Cannot distinguish individual share instances for analytics

## Proposed Solution: Database-Backed Semantic URLs

### Database Schema

```sql
-- Migration: 001_create_links_table.sql
CREATE TABLE links (
    id SERIAL PRIMARY KEY,
    
    -- Semantic URL components (human-readable)
    slug VARCHAR(255) NOT NULL UNIQUE,              -- "introducing-new-governance-proposal"
    community_short_id VARCHAR(100) NOT NULL,       -- "commonground"
    board_slug VARCHAR(255) NOT NULL,               -- "general-discussion"
    
    -- Target content (for resolution)
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    
    -- Plugin context (required for Common Ground routing)
    plugin_id VARCHAR(255) NOT NULL,                -- Full plugin UUID
    
    -- Share context (for iframe detection and analytics)
    share_token VARCHAR(255) NOT NULL UNIQUE,       -- Unique per share instance
    shared_by_user_id VARCHAR(255) REFERENCES users(user_id),
    share_source VARCHAR(100),                      -- 'direct_share', 'social_media', 'email'
    
    -- Content metadata (for URL generation and SEO)
    post_title VARCHAR(500) NOT NULL,               -- Original post title
    board_name VARCHAR(255) NOT NULL,               -- Original board name
    
    -- Lifecycle management
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMPTZ,                         -- Optional expiration
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Ensure unique semantic paths
    CONSTRAINT links_unique_path UNIQUE (community_short_id, board_slug, slug)
);

-- Performance indexes
CREATE INDEX links_post_id_idx ON links(post_id);
CREATE INDEX links_board_id_idx ON links(board_id);
CREATE INDEX links_community_idx ON links(community_short_id);
CREATE INDEX links_created_at_idx ON links(created_at);
CREATE INDEX links_expires_at_idx ON links(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX links_access_count_idx ON links(access_count);

-- Updated timestamp trigger
CREATE TRIGGER set_timestamp_links 
    BEFORE UPDATE ON links 
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
```

### URL Structure & Examples

**Format**: `/c/{community_short_id}/{board_slug}/{post_slug}`

**Real Examples**:
- `/c/commonground/general-discussion/introducing-new-governance-proposal`
- `/c/dao-coalition/governance/quarterly-budget-review-q4-2024`
- `/c/makers/announcements/platform-v2-launch-december-update`
- `/c/ethereum-community/technical/eip-proposal-gas-optimization`

### API Architecture

```typescript
// POST /api/links - Generate new semantic URL
interface CreateLinkRequest {
  postId: number;
  shareSource?: 'direct_share' | 'social_media' | 'email' | 'embed';
  expiresIn?: string; // '7d', '30d', 'never'
  customSlug?: string; // Optional custom slug for admins
}

interface CreateLinkResponse {
  id: number;
  url: string; // Full semantic URL
  slug: string; // Just the slug portion
  shareToken: string;
  expiresAt?: string;
}

// GET /api/links/resolve - Resolve semantic URL to context
interface ResolveLinkRequest {
  path: string; // "/c/community/board/slug"
}

interface ResolveLinkResponse {
  postId: number;
  boardId: number;
  pluginId: string;
  communityShortId: string;
  shareToken: string;
  postTitle: string;
  boardName: string;
  accessCount: number;
  createdAt: string;
}

// GET /api/links/analytics/{id} - Analytics data
interface LinkAnalytics {
  totalAccess: number;
  dailyAccess: { date: string; count: number }[];
  shareSource: string;
  createdAt: string;
  lastAccessed: string;
}
```

## Implementation Roadmap

### Phase 1: Database Foundation (2-3 days)

**Goal**: Establish database schema and core service layer

**Work Packages:**

**1.1 Database Migration (4 hours)**
- Create `links` table migration
- Add indexes for performance optimization  
- Test migration rollback procedures
- **Deliverable**: Production-ready database schema

**1.2 Core Service Layer (6 hours)**
- Implement `SemanticUrlService` class with database operations
- Create URL slug generation utilities (handles collisions)
- Implement database CRUD operations
- Add comprehensive error handling and validation
- **Deliverable**: Complete service layer with unit tests

**1.3 API Endpoints (4 hours)**
- Build REST endpoints for URL generation and resolution
- Implement request validation and error handling
- Add rate limiting and security measures
- **Deliverable**: Complete API with comprehensive testing

### Phase 2: Route Handling & Resolution (1-2 days)

**Goal**: Enable semantic URL access and proper Common Ground redirects

**Work Packages:**

**2.1 Semantic URL Route Handler (3 hours)**
- Create `/c/[...path]` catch-all route with database lookup
- Implement proper Common Ground redirect with full plugin context
- Add analytics tracking for URL access
- Handle edge cases (expired URLs, deleted content)
- **Deliverable**: Working semantic URL resolution with analytics

**2.2 Share Context Integration (2 hours)**
- Implement cookie setting for iframe detection
- Ensure compatibility with existing Common Ground redirect flow
- Test end-to-end share workflow
- **Deliverable**: Complete share detection and iframe handling

**2.3 Performance Optimization (2 hours)**
- Implement Redis caching for frequently accessed URLs
- Add database query optimization
- Performance testing and benchmarking
- **Deliverable**: Sub-100ms URL resolution performance

### Phase 3: Frontend Integration (1 day)

**Goal**: Update sharing UI to generate and use semantic URLs

**Work Packages:**

**3.1 PostCard Integration (2 hours)**
- Update `buildExternalShareUrl` to call links API
- Implement fallback to legacy URLs during transition
- Add loading states for URL generation
- **Deliverable**: Posts generate semantic URLs when shared

**3.2 Share Modal Enhancement (2 hours)**
- Update ShareModal to display semantic URLs
- Add copy-to-clipboard functionality with analytics
- Implement preview/validation for custom slugs
- **Deliverable**: Enhanced sharing experience with semantic URLs

**3.3 Admin Controls (2 hours)**
- Add admin interface for URL management
- Implement custom slug creation for moderators
- Create URL analytics dashboard
- **Deliverable**: Administrative tools for URL management

### Phase 4: Advanced Features & Analytics (2-3 days)

**Goal**: Add analytics, management, and advanced features

**Work Packages:**

**4.1 Analytics Dashboard (4 hours)**
- Create URL analytics dashboard for admins
- Implement click tracking and access patterns
- Add export functionality for analytics data
- **Deliverable**: Comprehensive analytics and reporting

**4.2 Lifecycle Management (3 hours)**
- Implement URL expiration and cleanup jobs
- Add bulk operations for URL management
- Create migration tools for existing popular posts
- **Deliverable**: Complete URL lifecycle management

**4.3 Advanced Features (4 hours)**
- Custom slug validation and conflict resolution
- URL preview/metadata endpoints for social media
- Webhook notifications for URL events
- **Deliverable**: Production-ready feature set

## Route Handler Implementation

```typescript
// src/app/c/[...path]/page.tsx
import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { SemanticUrlService } from '@/lib/semantic-urls';

interface SemanticUrlPageProps {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SemanticUrlHandler({ params }: SemanticUrlPageProps) {
  const { path } = await params;
  const semanticPath = `/c/${path.join('/')}`;
  
  try {
    // Database lookup for semantic URL
    const semanticUrl = await SemanticUrlService.resolve(semanticPath);
    
    if (!semanticUrl) {
      console.warn(`[SemanticUrlHandler] URL not found: ${semanticPath}`);
      notFound();
    }
    
    // Update access analytics
    await SemanticUrlService.recordAccess(semanticUrl.id);
    
    // Set cookies for iframe detection (same as legacy system)
    const sharedContentToken = `${semanticUrl.postId}-${semanticUrl.boardId}-${Date.now()}`;
    const postData = JSON.stringify({
      postId: semanticUrl.postId,
      boardId: semanticUrl.boardId,
      token: semanticUrl.shareToken,
      timestamp: Date.now()
    });
    
    // Construct Common Ground URL with full plugin context
    const commonGroundBaseUrl = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
    const redirectUrl = `${commonGroundBaseUrl}/c/${semanticUrl.communityShortId}/plugin/${semanticUrl.pluginId}`;
    
    // Create redirect response with cookies
    const response = NextResponse.redirect(redirectUrl);
    
    // Set cookies for iframe share detection
    response.cookies.set('shared_content_token', sharedContentToken, {
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    response.cookies.set('shared_post_data', encodeURIComponent(postData), {
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    console.log(`[SemanticUrlHandler] Redirecting ${semanticPath} → ${redirectUrl}`);
    console.log(`[SemanticUrlHandler] Post context: ${semanticUrl.postTitle} (${semanticUrl.postId})`);
    
    return response;
    
  } catch (error) {
    console.error(`[SemanticUrlHandler] Error resolving URL ${semanticPath}:`, error);
    notFound();
  }
}
```

## Service Layer Implementation

```typescript
// src/lib/semantic-urls.ts
import { db } from '@/lib/db';

export interface SemanticUrlData {
  id: number;
  slug: string;
  communityShortId: string;
  boardSlug: string;
  postId: number;
  boardId: number;
  pluginId: string;
  shareToken: string;
  postTitle: string;
  boardName: string;
  sharedByUserId?: string;
  shareSource?: string;
  accessCount: number;
  createdAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;
}

export interface CreateSemanticUrlParams {
  postId: number;
  postTitle: string;
  boardId: number;
  boardName: string;
  communityShortId: string;
  pluginId: string;
  sharedByUserId?: string;
  shareSource?: string;
  expiresIn?: string; // '7d', '30d', 'never'
  customSlug?: string;
}

export class SemanticUrlService {
  /**
   * Generate a new semantic URL for a post
   */
  static async create(params: CreateSemanticUrlParams): Promise<SemanticUrlData> {
    const {
      postId,
      postTitle,
      boardId,
      boardName,
      communityShortId,
      pluginId,
      sharedByUserId,
      shareSource = 'direct_share',
      expiresIn,
      customSlug
    } = params;
    
    // Generate URL-safe slugs
    const boardSlug = this.createSlug(boardName);
    const baseSlug = customSlug || this.createSlug(postTitle);
    
    // Handle slug collisions
    const slug = await this.ensureUniqueSlug(communityShortId, boardSlug, baseSlug);
    
    // Calculate expiration
    const expiresAt = this.calculateExpiration(expiresIn);
    
    // Generate unique share token
    const shareToken = this.generateShareToken();
    
    // Insert into database
    const result = await db.query(`
      INSERT INTO links (
        slug, community_short_id, board_slug, post_id, board_id,
        plugin_id, share_token, post_title, board_name,
        shared_by_user_id, share_source, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      slug, communityShortId, boardSlug, postId, boardId,
      pluginId, shareToken, postTitle, boardName,
      sharedByUserId, shareSource, expiresAt
    ]);
    
    return this.mapDbResult(result.rows[0]);
  }
  
  /**
   * Resolve a semantic URL path to full context
   */
  static async resolve(path: string): Promise<SemanticUrlData | null> {
    // Parse path: "/c/community/board/slug"
    const pathMatch = path.match(/^\/c\/([^\/]+)\/([^\/]+)\/(.+)$/);
    if (!pathMatch) return null;
    
    const [, communityShortId, boardSlug, slug] = pathMatch;
    
    const result = await db.query(`
      SELECT * FROM links
      WHERE community_short_id = $1 
        AND board_slug = $2 
        AND slug = $3
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [communityShortId, boardSlug, slug]);
    
    if (result.rows.length === 0) return null;
    
    return this.mapDbResult(result.rows[0]);
  }
  
  /**
   * Record an access to a semantic URL for analytics
   */
  static async recordAccess(id: number): Promise<void> {
    await db.query(`
      UPDATE links 
      SET access_count = access_count + 1, 
          last_accessed_at = NOW()
      WHERE id = $1
    `, [id]);
  }
  
  /**
   * Create URL-safe slug from text
   */
  private static createSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
      .substring(0, 100);       // Limit length
  }
  
  /**
   * Ensure slug is unique within community/board context
   */
  private static async ensureUniqueSlug(
    communityShortId: string,
    boardSlug: string,
    baseSlug: string
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.slugExists(communityShortId, boardSlug, slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }
  
  /**
   * Check if slug already exists
   */
  private static async slugExists(
    communityShortId: string,
    boardSlug: string,
    slug: string
  ): Promise<boolean> {
    const result = await db.query(`
      SELECT 1 FROM links
      WHERE community_short_id = $1 
        AND board_slug = $2 
        AND slug = $3
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `, [communityShortId, boardSlug, slug]);
    
    return result.rows.length > 0;
  }
  
  /**
   * Generate unique share token
   */
  private static generateShareToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `semantic_${timestamp}_${random}`;
  }
  
  /**
   * Calculate expiration date from string
   */
  private static calculateExpiration(expiresIn?: string): Date | null {
    if (!expiresIn || expiresIn === 'never') return null;
    
    const now = new Date();
    switch (expiresIn) {
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }
  
  /**
   * Map database result to TypeScript interface
   */
  private static mapDbResult(row: any): SemanticUrlData {
    return {
      id: row.id,
      slug: row.slug,
      communityShortId: row.community_short_id,
      boardSlug: row.board_slug,
      postId: row.post_id,
      boardId: row.board_id,
      pluginId: row.plugin_id,
      shareToken: row.share_token,
      postTitle: row.post_title,
      boardName: row.board_name,
      sharedByUserId: row.shared_by_user_id,
      shareSource: row.share_source,
      accessCount: row.access_count,
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
      expiresAt: row.expires_at
    };
  }
}
```

## Migration Strategy

### 1. Backward Compatibility

```typescript
// Enhanced buildExternalShareUrl with database fallback
export async function buildExternalShareUrl(
  postId: number,
  boardId: number,
  communityShortId?: string,
  pluginId?: string,
  postTitle?: string,
  boardName?: string,
  useSemanticUrl: boolean = true
): Promise<string> {
  const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;
  
  if (!pluginBaseUrl) {
    console.warn('NEXT_PUBLIC_PLUGIN_BASE_URL not configured');
    return buildPostUrl(postId, boardId, false);
  }
  
  // Try to generate semantic URL if all data available
  if (useSemanticUrl && communityShortId && pluginId && postTitle && boardName) {
    try {
      const semanticUrl = await SemanticUrlService.create({
        postId,
        postTitle,
        boardId,
        boardName,
        communityShortId,
        pluginId,
        shareSource: 'direct_share'
      });
      
      return `${pluginBaseUrl}/c/${semanticUrl.communityShortId}/${semanticUrl.boardSlug}/${semanticUrl.slug}`;
      
    } catch (error) {
      console.warn('Failed to create semantic URL, falling back to legacy:', error);
    }
  }
  
  // Fallback to legacy URL generation
  return buildLegacyExternalShareUrl(postId, boardId, communityShortId, pluginId);
}
```

### 2. Gradual Rollout Plan

**Phase 1: Shadow Mode (Week 1)**
- Deploy database schema and services
- Generate semantic URLs but don't use them yet
- Monitor database performance and storage usage

**Phase 2: Opt-in Testing (Week 2)**
- Enable semantic URLs for specific communities/boards
- A/B test semantic vs legacy URLs
- Gather user feedback and analytics

**Phase 3: Default Rollout (Week 3)**
- Make semantic URLs the default for new shares
- Legacy URLs still supported for existing links
- Monitor performance and user adoption

**Phase 4: Full Migration (Week 4)**
- Migrate popular/recent posts to semantic URLs
- Implement legacy URL redirects to semantic URLs
- Deprecate legacy URL generation

### 3. Data Migration

```sql
-- Migrate existing popular posts to semantic URLs
INSERT INTO links (
  post_id, board_id, community_short_id, board_slug, slug,
  plugin_id, share_token, post_title, board_name,
  shared_by_user_id, share_source
)
SELECT 
  p.id,
  p.board_id,
  c.id,  -- Assumes community context available
  LOWER(REGEXP_REPLACE(b.name, '[^a-zA-Z0-9\s]', '', 'g')),  -- Board slug
  LOWER(REGEXP_REPLACE(p.title, '[^a-zA-Z0-9\s]', '', 'g')), -- Post slug
  '{{PLUGIN_ID}}',  -- Will need to be determined per community
  'migrated_' || p.id || '_' || EXTRACT(epoch FROM NOW()),
  p.title,
  b.name,
  p.author_user_id,
  'migration'
FROM posts p
JOIN boards b ON p.board_id = b.id
JOIN communities c ON b.community_id = c.id
WHERE p.upvote_count > 10 
   OR p.created_at > NOW() - INTERVAL '30 days'
   OR p.comment_count > 5;
```

## Benefits & Success Metrics

### User Experience Benefits
- **67% shorter URLs** compared to current system
- **Human-readable** URLs that convey content context
- **Final destinations** - no redirect chains or client-side hacks
- **Social media friendly** - clean URLs for sharing

### Technical Benefits
- **Complete plugin context** stored securely in database
- **Analytics & management** capabilities for URL lifecycle
- **Security improvement** - no internal IDs exposed in URLs
- **Future-proof** architecture for advanced features

### Business Benefits
- **Increased sharing** due to user-friendly URLs
- **Better SEO** with keyword-rich URL structure
- **Brand recognition** with semantic URL patterns
- **Analytics insights** into sharing patterns and popular content

### Success Metrics
1. **URL Generation**: 95% of new shares use semantic URLs
2. **Resolution Performance**: Sub-100ms database lookup
3. **User Adoption**: 80% preference for semantic URLs in A/B tests
4. **Social Sharing**: 25% increase in click-through rates
5. **Storage Efficiency**: Under 1MB storage for 10K URLs

## Cost Analysis

### Development Effort
- **Database & Service Layer**: 2-3 days
- **Route Handling & Integration**: 1-2 days  
- **Frontend Integration**: 1 day
- **Advanced Features**: 2-3 days
- **Total Development Time**: 6-9 days

### Infrastructure Impact
- **Storage**: ~250 bytes per URL (negligible cost)
- **Database Load**: Single lookup per URL access (minimal)
- **Caching**: Redis cache for popular URLs (standard cost)
- **Monitoring**: Standard observability tools

### ROI Analysis
- **Development Cost**: ~$15K-20K (1-2 developer weeks)
- **Infrastructure Cost**: ~$50/month additional
- **User Experience Value**: Significant improvement in shareability
- **SEO Value**: Better search visibility and click-through rates

## Risk Mitigation

### Technical Risks
- **Database Performance**: Mitigated by proper indexing and caching
- **URL Collisions**: Handled by automatic slug suffixing
- **Migration Complexity**: Phased rollout with fallback options

### Business Risks
- **User Confusion**: Clear communication and gradual rollout
- **Legacy URL Breakage**: Maintain backward compatibility indefinitely
- **SEO Impact**: Proper redirects and meta tag preservation

## Conclusion

The database-backed semantic URL shortener provides:

1. **True semantic URLs** that work as final destinations
2. **Complete context storage** for proper Common Ground routing  
3. **Analytics and management** capabilities for URL lifecycle
4. **Security and privacy** improvements over current system
5. **Future-proof architecture** for advanced sharing features

This solution addresses all limitations of URL-only encoding while providing a foundation for advanced sharing features, analytics, and user experience improvements.

**Recommended Next Step**: Begin Phase 1 (Database Foundation) with database schema creation and core service layer implementation. 