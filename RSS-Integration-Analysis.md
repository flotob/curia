# RSS Feed Integration Analysis

## 1. Board Structure & Schema

### Database Schema Overview
Based on the schema in `docs/current-db-schema.md`, here's the relevant structure:

#### `boards` table
- `id` (integer, primary key)
- `community_id` (text, foreign key to communities)
- `name` (varchar(255))
- `description` (text)
- `settings` (jsonb) - Contains permissions and gating configuration
- `created_at`, `updated_at` (timestamps)

#### `communities` table
- `id` (text, primary key)
- `name` (text)
- `community_short_id` (text) - Used for URL building
- `plugin_id` (text) - Used for Common Ground routing
- `settings` (jsonb) - Contains community-level permissions
- `logo_url` (text)

#### `posts` table
- `id` (integer, primary key)
- `board_id` (integer, foreign key to boards)
- `title` (varchar(255))
- `content` (text)
- `author_user_id` (text)
- `settings` (jsonb) - Contains post-level gating
- `lock_id` (integer, optional) - References locks table for reusable gating
- `created_at`, `updated_at` (timestamps)

#### `locks` table
- `id` (integer, primary key)
- `name` (varchar(255))
- `gating_config` (jsonb) - Complete gating configuration
- `community_id` (text)
- `is_public` (boolean)
- `creator_user_id` (text)

## 2. Role Gating Mechanisms

### Board-Level Gating
Boards can be gated through `boards.settings.permissions.allowedRoles`:

```json
{
  "permissions": {
    "allowedRoles": ["role1", "role2"] // Array of role IDs
  }
}
```

**Read Gating**: When `allowedRoles` is set, only users with those roles can read the board.

**Write Gating**: Implemented through the `locks` system:
- `boards.settings.permissions.locks.lockIds` - Array of lock IDs
- Users must pass verification defined in the lock to create posts

### Community-Level Gating
Communities can be entirely private through `communities.settings`:

```json
{
  "permissions": {
    "allowedRoles": ["role1", "role2"] // Makes entire community private
  }
}
```

### Post-Level Gating
Posts can have individual gating through:
- `posts.settings.responsePermissions` - Direct gating configuration
- `posts.lock_id` - Reference to reusable lock configuration

## 3. External URL Structure

### How External URLs Work
Based on `src/utils/urlBuilder.ts` and `src/components/voting/PostCard.tsx`:

1. **Semantic URLs**: Modern approach using `links` table
   - Creates SEO-friendly URLs: `/{community-short-id}/{board-slug}/{post-slug}`
   - Stored in `links` table with metadata
   - Tracks access counts and sharing metrics

2. **Legacy URLs**: Fallback approach
   - Direct URLs: `/board/{boardId}/post/{postId}`
   - Includes share tokens for tracking

3. **URL Building Process**:
   - `buildExternalShareUrl()` tries semantic URL first
   - Falls back to legacy URL if semantic fails
   - Handles shared boards by using source community context

### Key Components
- `src/utils/urlBuilder.ts`: URL building utilities
- `src/components/voting/PostCard.tsx`: Share button implementation
- `src/app/api/links/route.ts`: Semantic URL creation API

## 4. RSS Implementation Requirements

### RSS Feed Eligibility
A board should expose RSS if:
1. **Community is NOT role-gated** (public community)
2. **Board is NOT role-gated** (no `allowedRoles` in board settings)
3. **Board is NOT write-gated with locks** (posts can be read publicly)

### RSS Feed Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{Board Name} - {Community Name}</title>
    <description>{Board Description}</description>
    <link>{External Board URL}</link>
    <item>
      <title>{Post Title}</title>
      <description>{Post Content as HTML}</description>
      <link>{External Post URL}</link>
      <pubDate>{Post Created Date}</pubDate>
      <guid>{External Post URL}</guid>
    </item>
  </channel>
</rss>
```

### Implementation Plan

#### 1. RSS Feed Generation API
Create `src/app/api/boards/[boardId]/rss/route.ts`:
- Check if board is RSS-eligible (public)
- Generate RSS XML for board posts
- Convert markdown content to HTML
- Use external URLs for all links

#### 2. RSS Icon & Modal
Modify `src/app/page.tsx` board header section:
- Add RSS icon next to board name
- Implement modal to show RSS URL or privacy message
- Check board eligibility client-side

#### 3. RSS Eligibility Check
Create utility function:
```typescript
function isBoardRSSEligible(board: ApiBoard, community: ApiCommunity): boolean {
  // Check community privacy
  const communityGated = community.settings?.permissions?.allowedRoles?.length > 0;
  
  // Check board privacy
  const boardGated = board.settings?.permissions?.allowedRoles?.length > 0;
  
  // Check board write locks (read access still public)
  const hasWriteLocks = board.settings?.permissions?.locks?.lockIds?.length > 0;
  
  return !communityGated && !boardGated;
}
```

#### 4. Markdown to HTML Conversion
- Use existing TipTap utilities or a dedicated markdown parser
- Ensure all internal links become external URLs
- Handle images and media properly

### Key Files to Modify

1. **`src/app/page.tsx`** - Add RSS icon and modal
2. **`src/app/api/boards/[boardId]/rss/route.ts`** - RSS feed generation
3. **`src/lib/rss.ts`** - RSS utilities and eligibility checks
4. **`src/components/modals/RSSModal.tsx`** - RSS modal component

### External URL Integration
- Reuse `buildExternalShareUrl()` from `src/utils/urlBuilder.ts`
- Ensure all RSS post links use semantic URLs
- Handle shared boards correctly (use source community context)

### Security Considerations
- Validate board access before generating RSS
- Rate limit RSS endpoint
- Cache RSS feeds for performance
- Sanitize HTML content in RSS

This analysis provides the foundation for implementing RSS feeds that respect the existing gating mechanisms while providing public access to eligible boards.