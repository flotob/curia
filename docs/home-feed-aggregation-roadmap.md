# Roadmap: Home Feed Aggregation - Reddit-Style Multi-Community Feed

This document outlines the work packages for implementing a Reddit-style home page that aggregates top/recent posts from **ALL boards across ALL communities**, while maintaining individual board-specific feeds.

## Current Architecture Analysis

**Existing Behavior:**
- Main page (`/`) shows posts filtered by user's current community (via JWT `user.cid`)
- `/api/posts` filters: `posts -> board_id -> boards.community_id = user.cid`
- Sidebar shows boards from current community only
- No cross-community aggregation exists

**Target Behavior:**
- **Home page (`/`)**: Aggregate posts from ALL boards across ALL communities (like Reddit front page)
- **Board pages (`/board/[boardId]` or `/community/[communityId]/board/[boardId]`)**: Show posts from specific board only
- Maintain current community context for posting (users still post to their own community's boards)

---

## Phase 1: API Infrastructure & Data Architecture

**Goal:** Create the backend infrastructure to support both aggregated home feed and board-specific feeds.

### WP1.1: Create Aggregated Home Feed API
- **Task:** Create `src/app/api/posts/home/route.ts`
- **Functionality:**
  - Fetch posts from ALL boards across ALL communities
  - Support sorting: `newest`, `upvotes`, `comments`
  - Support search across all posts (title/content)
  - Include pagination
  - Include community context in response (which community/board each post belongs to)
- **Query Structure:**
  ```sql
  SELECT 
    p.*, u.name AS author_name, u.profile_picture_url,
    b.name AS board_name, b.id AS board_id,
    c.name AS community_name, c.id AS community_id,
    CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted
  FROM posts p
  JOIN users u ON p.author_user_id = u.user_id
  JOIN boards b ON p.board_id = b.id
  JOIN communities c ON b.community_id = c.id
  LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1
  ORDER BY [dynamic based on sortBy]
  LIMIT $2 OFFSET $3
  ```
- **Enhanced ApiPost Interface:** Add `board_name`, `board_id`, `community_name`, `community_id` fields

### WP1.2: Enhance Board-Specific Posts API
- **Task:** Modify `src/app/api/posts/route.ts` or create `src/app/api/boards/[boardId]/posts/route.ts`
- **Functionality:**
  - Filter posts by specific board ID (instead of community)
  - Maintain existing sorting/search/pagination features
  - Remove community restriction - allow viewing any board (public boards)
- **Query Structure:**
  ```sql
  WHERE p.board_id = $1  -- Instead of WHERE b.community_id = user.cid
  ```

### WP1.3: Community Fetching for Home Feed
- **Task:** Create `src/app/api/communities/route.ts`
- **Functionality:**
  - Fetch all communities (for displaying community names in home feed)
  - Include basic metadata: `id`, `name`, `logoUrl`, `headerImageUrl`
  - No authentication required (public data)

---

## Phase 2: Routing & Navigation Structure

**Goal:** Implement proper routing structure to distinguish between home feed and board-specific feeds.

### WP2.1: Update Main Home Page (/)
- **Task:** Modify `src/app/page.tsx`
- **Functionality:**
  - Use `/api/posts/home` instead of `/api/posts`
  - Display community context for each post (e.g., "r/CommunityName • BoardName")
  - Remove community header (since it's aggregating across communities)
  - Add "Home" branding/header instead

### WP2.2: Create Board-Specific Page Structure
- **Task:** Create routing structure for individual boards
- **Options:**
  - Option A: `src/app/board/[boardId]/page.tsx` (simpler)
  - Option B: `src/app/community/[communityId]/board/[boardId]/page.tsx` (more explicit)
- **Recommendation:** Option A for simplicity
- **Functionality:**
  - Use board-specific posts API
  - Show board name and description
  - Show community context
  - Include posting form (respects user's community for posting)

### WP2.3: Update Sidebar Navigation
- **Task:** Modify `src/components/layout/Sidebar.tsx`
- **Functionality:**
  - Add "Home" link at top (to aggregated feed)
  - Section for "Your Community" with current community's boards
  - Distinguish active state between home vs specific board
  - Consider adding "All Communities" section (optional)

---

## Phase 3: UI/UX Enhancements

**Goal:** Enhance the user interface to clearly show context and improve navigation.

### WP3.1: Enhanced PostCard for Home Feed
- **Task:** Modify `src/components/voting/PostCard.tsx`
- **Functionality:**
  - Show community/board context for home feed posts
  - Add community avatar/logo
  - Format: "Posted in r/CommunityName • BoardName"
  - Make community/board names clickable (navigate to board page)
  - Conditional rendering based on feed type (home vs board-specific)

### WP3.2: Home Feed Header Component
- **Task:** Create `src/components/feed/HomeFeedHeader.tsx`
- **Functionality:**
  - "Home" title with Reddit-style styling
  - Sorting controls (Hot, New, Top)
  - Search across all posts
  - No community-specific header image

### WP3.3: Board Feed Header Component
- **Task:** Create `src/components/feed/BoardFeedHeader.tsx` 
- **Functionality:**
  - Board name and description
  - Community context breadcrumb
  - Board-specific sorting/search
  - Optional: Board header image (if we add this field later)

### WP3.4: Navigation Breadcrumbs
- **Task:** Create `src/components/navigation/Breadcrumbs.tsx`
- **Functionality:**
  - Home feed: "Home"
  - Board feed: "Home > CommunityName > BoardName"
  - Clickable navigation

---

## Phase 4: Advanced Features

**Goal:** Add sophisticated features for better user experience.

### WP4.1: Feed Type Toggle
- **Task:** Add toggle between "Home" and "Your Community" feeds
- **Functionality:**
  - Switch between aggregated home feed and current community feed
  - Remember preference in localStorage

### WP4.2: Community Discovery
- **Task:** Add community browsing capabilities
- **Functionality:**
  - List all communities
  - Search communities
  - Browse popular boards across communities

### WP4.3: Personalized Home Feed
- **Task:** Add user preferences for home feed
- **Functionality:**
  - Subscribe/unsubscribe to specific boards
  - Filter home feed to only show subscribed boards
  - Requires new database tables for user subscriptions

---

## Implementation Strategy

### Phase 1 Priority Order:
1. **WP1.1** (Home API) - Core functionality
2. **WP1.2** (Board API) - Required for board pages  
3. **WP2.1** (Home Page) - User-facing implementation
4. **WP2.2** (Board Pages) - Complete the routing
5. **WP3.1** (PostCard Context) - Essential UX improvement

### Key Decisions Needed:
1. **Routing Pattern**: Prefer `/board/[boardId]` vs `/community/[communityId]/board/[boardId]`?
2. **Default Sort**: What should home feed default to? (Hot/Popular vs Newest)
3. **Community Privacy**: Should all boards be publicly viewable or respect community permissions?
4. **Posting Context**: When viewing board from different community, where can user post?

### Database Considerations:
- Current schema supports this with no changes needed
- Future enhancement: Add `subscriptions` table for personalized feeds
- Consider adding `board.header_image_url` for board-specific branding

---

## Success Metrics

**Phase 1 Complete When:**
- Home page shows aggregated posts from all communities
- Individual board pages work correctly
- Sidebar navigation distinguishes between home and board views
- PostCard shows community context appropriately

**Full Implementation Complete When:**
- Users can seamlessly navigate between home feed and specific boards
- Community/board context is always clear
- Posting functionality works correctly in all contexts
- Search and sorting work across both feed types 