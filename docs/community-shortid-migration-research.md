# Community Short ID Migration Research & Implementation Plan

## Executive Summary

**Problem**: Communities can change their `communityShortId` in the Common Ground app, which breaks existing shareable links stored in our database. When a community changes from `oldcommunity` to `newcommunity`, all previously generated semantic URLs (`/c/oldcommunity/board/post`) become invalid.

**Solution**: Implement an automatic migration system that tracks old community short IDs and updates existing links when they're accessed. This ensures backward compatibility while maintaining the benefits of semantic URLs.

**Impact**: 
- ✅ Old shareable links continue to work
- ✅ New links use updated community short IDs  
- ✅ Telegram notifications get updated URLs automatically
- ✅ Zero downtime for communities changing their short IDs

## Current System Analysis

### Existing Shareable Link Architecture

Our system uses a sophisticated semantic URL approach with database storage:

#### Database Schema (`links` table)
```sql
CREATE TABLE "links" (
  "id" integer PRIMARY KEY,
  "slug" varchar(255) NOT NULL UNIQUE,
  "community_short_id" varchar(100) NOT NULL,  -- 🚨 THIS BECOMES STALE
  "board_slug" varchar(255) NOT NULL,
  "post_id" integer NOT NULL,
  "board_id" integer NOT NULL,
  "plugin_id" varchar(255) NOT NULL,
  "share_token" varchar(255) NOT NULL UNIQUE,
  "post_title" varchar(500) NOT NULL,
  "board_name" varchar(255) NOT NULL,
  -- ... other fields
);
```

#### Current URL Generation Flow
1. **User clicks "Share" in PostCard** → calls `buildExternalShareUrl()`
2. **System checks for existing URL** → `SemanticUrlService.findByPostId()`
3. **If exists**: Return existing URL from database
4. **If not**: Create new semantic URL → `SemanticUrlService.create()`
5. **URL format**: `/c/{community_short_id}/{board_slug}/{slug}`

#### Current Usage Locations
- **User Share Modal**: PostCard component → buildExternalShareUrl()
- **Telegram Notifications**: TelegramEventHandler → generateSemanticUrlDirect()
- **URL Resolution**: `/c/[...path]` page → SemanticUrlService.resolve()

### The Breaking Change Scenario

**Timeline of Failure**:
```
Day 1: Community "alpha" creates posts
       → Links: /c/alpha/general/my-awesome-post
       → Database stores: community_short_id = "alpha"

Day 30: Community changes short ID to "alpha-dao"
        → New Common Ground URL: /c/alpha-dao/plugin/xxx
        → But database still has: community_short_id = "alpha"
        
Day 31: User accesses old link /c/alpha/general/my-awesome-post
        → SemanticUrlService.resolve() finds record
        → Redirects to: /c/alpha/plugin/xxx  ❌ BROKEN!
        
Day 31: User shares new post 
        → Gets current short ID "alpha-dao" from user context
        → Creates: /c/alpha-dao/general/new-post
        → But old links still broken
```

## Proposed Solution Architecture

### Core Strategy: Community Short ID History + Auto-Migration

1. **Track Historical Short IDs**: Store array of all previous community short IDs
2. **Runtime Detection**: Compare current vs. stored community short ID on every link access/generation
3. **Automatic Migration**: Update database when mismatch detected
4. **Backward Compatibility**: Old URLs continue working via redirect

### Database Schema Enhancement

#### New Migration: Add Historical Tracking
```sql
-- New migration: add_community_shortid_history_to_links
ALTER TABLE links 
ADD COLUMN community_shortid_history TEXT[] DEFAULT '{}' NOT NULL;

-- Index for historical lookups
CREATE INDEX links_community_shortid_history_idx 
ON links USING GIN (community_shortid_history);

-- Update existing records to include current short ID in history
UPDATE links 
SET community_shortid_history = ARRAY[community_short_id]
WHERE community_shortid_history = '{}';
```

#### Enhanced Schema
```sql
CREATE TABLE "links" (
  -- ... existing fields ...
  "community_short_id" varchar(100) NOT NULL,           -- Current/latest short ID
  "community_shortid_history" TEXT[] DEFAULT '{}',      -- 🆕 Historical short IDs
  -- ... rest of fields ...
);
```

### Enhanced Service Layer

#### Updated SemanticUrlService
```typescript
export class SemanticUrlService {
  /**
   * Create or retrieve semantic URL with community ID migration
   */
  static async createOrUpdate(params: CreateSemanticUrlParams): Promise<SemanticUrlData> {
    const { postId, communityShortId, ...otherParams } = params;
    
    // Check if URL already exists for this post
    const existingUrl = await this.findByPostId(postId);
    
    if (existingUrl) {
      // Check if community short ID has changed
      if (existingUrl.communityShortId !== communityShortId) {
        console.log(`[SemanticUrlService] Community short ID changed: ${existingUrl.communityShortId} → ${communityShortId}`);
        
        // Update the record with new short ID and add old one to history
        const updatedUrl = await this.migrateCommunityShortId(
          existingUrl.id,
          communityShortId,
          existingUrl.communityShortId
        );
        
        return updatedUrl;
      }
      
      // No change needed, return existing
      return existingUrl;
    }
    
    // Create new URL (original flow)
    return await this.create(params);
  }
  
  /**
   * Migrate community short ID and update history
   */
  static async migrateCommunityShortId(
    linkId: number,
    newCommunityShortId: string,
    oldCommunityShortId: string
  ): Promise<SemanticUrlData> {
    const result = await db.query(`
      UPDATE links
      SET 
        community_short_id = $2,
        community_shortid_history = 
          CASE 
            WHEN $3 = ANY(community_shortid_history) THEN community_shortid_history
            ELSE community_shortid_history || $3
          END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [linkId, newCommunityShortId, oldCommunityShortId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Failed to migrate community short ID for link ${linkId}`);
    }
    
    console.log(`[SemanticUrlService] Migrated link ${linkId}: ${oldCommunityShortId} → ${newCommunityShortId}`);
    return this.mapDbResult(result.rows[0]);
  }
  
  /**
   * Enhanced resolve that handles historical short IDs
   */
  static async resolve(semanticPath: string): Promise<SemanticUrlData | null> {
    const pathParts = semanticPath.replace(/^\/c\//, '').split('/');
    if (pathParts.length !== 3) return null;
    
    const [communityShortId, boardSlug, slug] = pathParts;
    
    // First try current community short ID
    let result = await this.findByPath(communityShortId, boardSlug, slug);
    
    if (!result) {
      // Try to find by historical community short IDs
      result = await this.findByHistoricalPath(communityShortId, boardSlug, slug);
      
      if (result) {
        console.log(`[SemanticUrlService] Found link via historical short ID: ${communityShortId} → ${result.communityShortId}`);
        // Note: The redirect will happen at the resolution layer
      }
    }
    
    return result;
  }
  
  /**
   * Find link by historical community short ID
   */
  private static async findByHistoricalPath(
    historicalShortId: string,
    boardSlug: string,
    slug: string
  ): Promise<SemanticUrlData | null> {
    const result = await db.query(`
      SELECT * FROM links
      WHERE $1 = ANY(community_shortid_history)
        AND board_slug = $2
        AND slug = $3
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `, [historicalShortId, boardSlug, slug]);
    
    return result.rows.length > 0 ? this.mapDbResult(result.rows[0]) : null;
  }
}
```

### Enhanced URL Generation Functions

#### Updated buildExternalShareUrl
```typescript
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
    console.warn('NEXT_PUBLIC_PLUGIN_BASE_URL not configured, falling back to internal URL');
    return buildPostUrl(postId, boardId, false);
  }
  
  // Try to generate semantic URL if all data available and enabled
  if (useSemanticUrl && communityShortId && pluginId && postTitle && boardName) {
    try {
      console.log(`[buildExternalShareUrl] Creating/updating semantic URL for post ${postId}`);
      
      const { authFetchJson } = await import('@/utils/authFetch');
      
      // 🆕 Use new createOrUpdate API endpoint that handles migration
      const result = await authFetchJson<CreateSemanticUrlResponse>('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          postTitle,
          boardId,
          boardName,
          communityShortId, // 🆕 This might be different from stored value
          shareSource: 'direct_share'
        }),
      });
      
      console.log(`[buildExternalShareUrl] Successfully created/updated semantic URL: ${result.url}`);
      return result.url;
      
    } catch (error) {
      console.warn('[buildExternalShareUrl] Failed to create semantic URL, falling back to legacy:', error);
    }
  }
  
  // Fallback to legacy URL generation
  return buildLegacyExternalShareUrl(postId, boardId, communityShortId, pluginId);
}
```

#### Enhanced Telegram URL Generation
```typescript
export async function generateSemanticUrlDirect(
  postId: number,
  boardId: number,
  postTitle: string,
  boardName: string,
  communityShortId: string,
  pluginId: string
): Promise<string> {
  try {
    console.log(`[DirectURLGenerator] Creating/updating semantic URL for post ${postId}`);
    
    // 🆕 Use createOrUpdate instead of create
    const semanticUrl = await SemanticUrlService.createOrUpdate({
      postId,
      postTitle,
      boardId,
      boardName,
      communityShortId, // 🆕 Current community short ID from runtime context
      pluginId,
      shareSource: 'telegram_notification'
    });
    
    // Build full URL directly
    const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
    const fullUrl = SemanticUrlService.buildFullUrl(semanticUrl, baseUrl);
    
    console.log(`[DirectURLGenerator] Created/updated semantic URL for post ${postId}: ${fullUrl}`);
    return fullUrl;
    
  } catch (error) {
    console.warn(`[DirectURLGenerator] Semantic URL failed for post ${postId}, using legacy:`, error);
    return generateLegacyUrlDirect(postId, boardId, communityShortId, pluginId);
  }
}
```

### Enhanced API Endpoint

#### Updated /api/links Route
```typescript
// src/app/api/links/route.ts
export async function POST(req: AuthenticatedRequest) {
  try {
    const { 
      postId, 
      postTitle, 
      boardId, 
      boardName, 
      communityShortId, // 🆕 Current community short ID from user context
      shareSource 
    } = await req.json();
    
    // Get user's community context for verification
    const userCommunityId = req.user?.cid;
    if (!userCommunityId) {
      return NextResponse.json({ error: 'No community context' }, { status: 400 });
    }
    
    // 🆕 Use createOrUpdate to handle community short ID migration
    const semanticUrl = await SemanticUrlService.createOrUpdate({
      postId,
      postTitle,
      boardId,
      boardName,
      communityShortId, // 🆕 This may differ from stored value
      pluginId: req.user?.pluginId || '',
      sharedByUserId: req.user?.sub,
      shareSource: shareSource || 'direct_share'
    });
    
    const baseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
    const fullUrl = SemanticUrlService.buildFullUrl(semanticUrl, baseUrl);
    
    return NextResponse.json({
      id: semanticUrl.id,
      url: fullUrl,
      slug: semanticUrl.slug,
      shareToken: semanticUrl.shareToken,
      isExisting: true, // Could be existing or newly migrated
    });
    
  } catch (error) {
    console.error('[Links API] Error creating/updating semantic URL:', error);
    return NextResponse.json(
      { error: 'Failed to create shareable URL' }, 
      { status: 500 }
    );
  }
}
```

### Enhanced URL Resolution

#### Updated Semantic URL Handler
```typescript
// src/app/c/[...path]/page.tsx
export default async function SemanticUrlHandler({ params }: SemanticUrlPageProps) {
  const { path } = await params;
  const semanticPath = `/c/${path.join('/')}`;
  
  try {
    // Database lookup for semantic URL (includes historical lookup)
    const semanticUrl = await SemanticUrlService.resolve(semanticPath);
    
    if (!semanticUrl) {
      console.warn(`[SemanticUrlHandler] URL not found: ${semanticPath}`);
      notFound();
    }
    
    // 🆕 Check if this was resolved via historical short ID
    const [requestedShortId] = path;
    const actualShortId = semanticUrl.communityShortId;
    
    if (requestedShortId !== actualShortId) {
      console.log(`[SemanticUrlHandler] Historical short ID used: ${requestedShortId} → ${actualShortId}`);
      
      // Redirect to updated URL with current community short ID
      const updatedPath = `/c/${actualShortId}/${semanticUrl.boardSlug}/${semanticUrl.slug}`;
      const commonGroundUrl = `${process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL}/c/${actualShortId}/plugin/${semanticUrl.pluginId}`;
      
      console.log(`[SemanticUrlHandler] Redirecting to updated community short ID: ${updatedPath} → ${commonGroundUrl}`);
      
      const response = NextResponse.redirect(commonGroundUrl);
      
      // Set same cookies as normal flow
      const sharedContentToken = `${semanticUrl.postId}-${semanticUrl.boardId}-${Date.now()}`;
      const postData = JSON.stringify({
        postId: semanticUrl.postId,
        boardId: semanticUrl.boardId,
        token: semanticUrl.shareToken,
        timestamp: Date.now()
      });
      
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
      
      return response;
    }
    
    // Normal flow - no community short ID change detected
    await SemanticUrlService.recordAccess(semanticUrl.id);
    
    // ... rest of existing implementation
    
  } catch (error) {
    console.error('[SemanticUrlHandler] Error resolving URL:', error);
    notFound();
  }
}
```

## Implementation Roadmap

### Phase 1: Database Migration (30 minutes)
**Goal**: Add community short ID history tracking to existing links

**Tasks**:
1. **Create Migration File** (5 min)
   ```bash
   yarn migrate:create add-community-shortid-history-to-links
   ```

2. **Write Migration** (15 min)
   ```typescript
   export async function up(pgm: MigrationBuilder): Promise<void> {
     // Add history column
     pgm.addColumn('links', {
       community_shortid_history: {
         type: 'text[]',
         notNull: true,
         default: '{}'
       }
     });
     
     // Create GIN index for array searches
     pgm.createIndex('links', 'community_shortid_history', {
       method: 'gin'
     });
     
     // Populate history with current short IDs
     pgm.sql(`
       UPDATE links 
       SET community_shortid_history = ARRAY[community_short_id]
       WHERE community_shortid_history = '{}'
     `);
   }
   
   export async function down(pgm: MigrationBuilder): Promise<void> {
     pgm.dropIndex('links', 'community_shortid_history');
     pgm.dropColumn('links', 'community_shortid_history');
   }
   ```

3. **Run Migration** (5 min)
   ```bash
   yarn migrate:up
   ```

4. **Verify Schema** (5 min)
   - Check database structure
   - Verify existing records have populated history

### Phase 2: Service Layer Enhancement (45 minutes)
**Goal**: Implement community short ID migration logic

**Tasks**:
1. **Enhance SemanticUrlService** (25 min)
   - Add `createOrUpdate()` method
   - Add `migrateCommunityShortId()` method  
   - Add `findByHistoricalPath()` method
   - Update `resolve()` to check historical short IDs

2. **Update Type Definitions** (10 min)
   ```typescript
   interface SemanticUrlData {
     // ... existing fields
     communityShortIdHistory: string[]; // 🆕 Add to interface
   }
   
   interface CreateSemanticUrlParams {
     // ... existing fields
     // communityShortId may differ from stored value
   }
   ```

3. **Add Database Mapping** (10 min)
   ```typescript
   private static mapDbResult(row: any): SemanticUrlData {
     return {
       // ... existing mappings
       communityShortIdHistory: row.community_shortid_history || [] // 🆕
     };
   }
   ```

### Phase 3: API Integration (30 minutes)
**Goal**: Update API endpoints to use new migration logic

**Tasks**:
1. **Update /api/links Route** (15 min)
   - Change `SemanticUrlService.create()` → `SemanticUrlService.createOrUpdate()`
   - Add logging for migration events
   - Update response structure if needed

2. **Update Direct URL Generators** (15 min)
   - Update `generateSemanticUrlDirect()` in `directUrlGenerator.ts`
   - Update `generateTelegramShareUrl()` in `shareUrlGenerator.ts`
   - Ensure Telegram notifications get migrated URLs

### Phase 4: URL Resolution Enhancement (30 minutes)
**Goal**: Handle historical short IDs in URL resolution

**Tasks**:
1. **Update Semantic URL Handler** (20 min)
   - Add historical short ID detection
   - Add redirect logic for migrated URLs
   - Preserve cookie setting for iframe detection

2. **Add Logging** (10 min)
   - Log migration redirects
   - Track usage of historical short IDs
   - Monitor for migration patterns

### Phase 5: Testing & Validation (45 minutes)
**Goal**: Comprehensive testing of migration system

**Tasks**:
1. **Unit Testing** (15 min)
   - Test `SemanticUrlService.createOrUpdate()`
   - Test historical short ID lookup
   - Test URL resolution with old short IDs

2. **Integration Testing** (15 min)
   - Test PostCard share flow with community change
   - Test Telegram notification URL generation
   - Test old URL resolution and redirect

3. **Manual Testing** (15 min)
   - Simulate community short ID change in database
   - Test old URLs still work
   - Test new URLs use updated short ID
   - Verify Telegram notifications work

## Error Handling & Edge Cases

### Potential Issues
1. **Multiple Rapid Community ID Changes**: Handle case where community changes ID multiple times quickly
2. **Database Consistency**: Ensure atomic updates to avoid partial migration states
3. **URL Collision**: Handle case where historical lookup returns multiple results
4. **Performance Impact**: Monitor query performance with GIN index on array field

### Error Handling Strategy
```typescript
export class SemanticUrlService {
  static async migrateCommunityShortId(
    linkId: number,
    newCommunityShortId: string,
    oldCommunityShortId: string
  ): Promise<SemanticUrlData> {
    try {
      // Use transaction for atomic updates
      return await db.transaction(async (client) => {
        const result = await client.query(`
          UPDATE links
          SET 
            community_short_id = $2,
            community_shortid_history = 
              CASE 
                WHEN $3 = ANY(community_shortid_history) THEN community_shortid_history
                ELSE community_shortid_history || $3
              END,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [linkId, newCommunityShortId, oldCommunityShortId]);
        
        if (result.rows.length === 0) {
          throw new Error(`No link found with ID ${linkId}`);
        }
        
        // Log successful migration
        console.log(`[SemanticUrlService] Successfully migrated link ${linkId}: ${oldCommunityShortId} → ${newCommunityShortId}`);
        
        return this.mapDbResult(result.rows[0]);
      });
      
    } catch (error) {
      console.error(`[SemanticUrlService] Failed to migrate community short ID for link ${linkId}:`, error);
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
```

### Performance Considerations
1. **Index Optimization**: GIN index on `community_shortid_history` for efficient array searches
2. **Query Caching**: Consider caching frequent lookups
3. **Batch Operations**: For bulk migrations, implement batch update logic
4. **Monitoring**: Track query performance and migration frequency

## Rollback Strategy

### Safe Rollback Approach
1. **Database Level**: Migration includes `down()` function to remove history column
2. **Code Level**: All changes are additive - can deploy with feature flag
3. **URL Level**: Old URLs continue working even without migration (just use current short ID)

### Rollback Commands
```bash
# Rollback database migration
yarn migrate:down

# Revert to old service methods (if needed)
git revert <commit-hash>

# Old URLs will still resolve to current community short ID
# (may not be ideal but functional)
```

## Success Metrics

### Implementation Success
- ✅ All existing links continue working after community short ID change
- ✅ New links use updated community short ID
- ✅ Historical short IDs are tracked in database
- ✅ URL resolution handles both current and historical short IDs
- ✅ Telegram notifications automatically get updated URLs

### Performance Metrics
- 📊 URL resolution time < 100ms (including historical lookup)
- 📊 Migration operation time < 50ms per link
- 📊 Database query performance maintained
- 📊 Zero downtime during community short ID changes

### User Experience
- 🎯 Seamless experience for users with old bookmarks
- 🎯 No broken links in Telegram message history
- 🎯 Automatic redirect to correct community context
- 🎯 Transparent migration with proper logging

## Next Steps

After reviewing this research document, the recommended implementation approach is:

1. **Start with Phase 1** (Database Migration) - Safe, reversible foundation
2. **Implement Phase 2** (Service Layer) - Core migration logic
3. **Test thoroughly** before deploying Phase 3-4 (API & Resolution)
4. **Monitor performance** and migration patterns in production
5. **Document** any community short ID change procedures for users

This solution ensures backward compatibility while providing automatic migration, making the system resilient to community identity changes without breaking existing shareable links. 