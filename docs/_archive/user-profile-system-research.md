# User Profile System Research & Implementation Plan

## Objective
Create a comprehensive user profile system that:
1. Shows user activity across all communities (like What's New page)
2. Accessible from sidebar navigation
3. Viewable by others (same view for self/others, no editing)
4. Enhance What's New page with mentions section at top

## Research Progress

### Phase 1: Understanding Current Architecture
*Status: In Progress*

#### What's New Page Analysis
- Need to understand how cross-community data aggregation works
- How activity feed is built and displayed
- Data fetching patterns and API endpoints

#### Mentions System Analysis
- How mentions are currently stored and retrieved
- Integration with posts/comments
- JSON mention format: `@{"id":"user123","label":"alice#hashtag"}`

#### Sidebar Navigation Analysis
- Current navigation structure
- How to add profile link at bottom
- Navigation patterns and routing

#### User Data Architecture
- How user data is currently fetched and displayed
- Available user endpoints and data structures
- Cross-community user context handling

---

## Findings

### Current Architecture Discoveries

#### What's New Page Architecture ✅
**Frontend Pattern (src/app/whats-new/page.tsx):**
- **Community Selection**: Dropdown selector allowing cross-community activity viewing
- **Activity Categories**: 4 main categories (comments on my posts, comments on posts I joined, reactions on my content, new posts in active boards)
- **Collapsible Sections**: Each category can be collapsed/expanded with "NEW" count previews
- **Filtering**: Per-category "show only new" toggle + pagination controls
- **Cross-Community Navigation**: Uses `useCrossCommunityNavigation` hook for external links
- **Activity Items**: Rich activity cards with avatars, content previews, timestamps, "NEW" badges
- **Community Context**: Badge indicators for cross-community items

**Backend Pattern (src/app/api/me/whats-new/route.ts):**
- **Community Filtering**: `communityId` parameter for cross-community data (defaults to user's home community)
- **4 Activity Types**: Dedicated queries for each activity category with community scoping
- **SQL Patterns**: Complex JOINs across posts, comments, reactions, boards, communities tables
- **Pagination**: limit/offset with total counts and hasMore flags
- **Cross-Community Data**: Includes `community_short_id`, `plugin_id` for external navigation
- **Summary Counts**: NEW vs TOTAL counts for each category

**Key Insight**: The What's New system already has the infrastructure for cross-community user activity aggregation!

#### Sidebar Navigation Analysis ✅
**Structure Pattern (src/components/layout/Sidebar.tsx):**
- **Navigation Sections**: Home, What's New, Boards, Shared Boards, Access Control (Locks)
- **Footer Section**: Admin-only links (Partnerships, Community Settings)
- **Theme Support**: Dynamic theming with light/dark mode support
- **URL Building**: `buildUrl()` helper preserves existing params
- **Active States**: Beautiful gradient backgrounds and icons for active pages
- **Mobile Support**: Responsive design with mobile slide-out

**Profile Link Location**: Should be added to footer section alongside admin links (or above them for all users)

#### Mentions System Analysis ✅
**Storage Pattern**: JSON format in markdown: `@{"id":"user123","label":"alice#hashtag"}`
**Components**: MentionExtension.ts, UserProfilePopover.tsx, MentionList.tsx
**API Integration**: Uses `/api/users/search` for autocomplete, `/api/users/[userId]` for profile data
**Backward Compatibility**: Supports old @username and @username#userId formats

#### User Profile API Analysis ✅
**Current Endpoint (src/app/api/users/[userId]/route.ts):**
- **Basic Data**: id, name, profile_picture_url, source, friendship_status
- **Extended Data** (detailed=true): communities list, activity stats (posts/comments count), join date
- **Dual Lookup**: Checks both friends table and users table with priority system
- **Cross-Community**: Uses user_communities table for community membership data

**Current UserProfilePopover**: Has "View Full Profile" button (currently stub) ready for implementation

#### Mentions Query Pattern ✅
**For User Profile Activity**: 
```sql
-- Find posts/comments mentioning specific user
SELECT p.*, c.* FROM posts p 
WHERE p.content LIKE '%@{"id":"user123"%'
UNION
SELECT c.*, p.* FROM comments c 
WHERE c.content LIKE '%@{"id":"user123"%'
```

**For What's New Mentions Section**:
- Search pattern: `content LIKE '%@{"id":"' || $userId || '"%'`
- Include cross-community metadata for navigation
- Order by creation date for chronological feed

---

## Implementation Plan

### Phase 1: User Profile Page Foundation 🚀
**Leverage What's New Architecture Pattern**
1. **Create Profile Page** (`src/app/profile/[userId]/page.tsx`)
   - Reuse What's New page component patterns and styling
   - Implement CommunitySelector for cross-community viewing
   - Show user's activity across all communities they're a member of

2. **Extend What's New API** (`src/app/api/users/[userId]/activity/route.ts`)
   - New endpoint following What's New API patterns
   - Same 4 activity categories but filtered by user instead of "my activity"
   - Support communityId parameter for cross-community filtering
   - Include proper pagination and cross-community navigation metadata

3. **Add Sidebar Profile Link**
   - Add to footer section in Sidebar.tsx
   - Available to all users (not just admins)
   - Use User icon with beautiful gradient styling matching existing patterns

### Phase 2: What's New Mentions Enhancement 📬
**Add Mentions Section to What's New Page**
1. **New Activity Category**: "Mentions" (at top, most relevant)
2. **Backend Query**: Search posts/comments containing user's mention JSON format
3. **Frontend Integration**: Add as first category in What's New page
4. **Cross-Community Support**: Include mentions from all communities user has access to

### Phase 3: Profile Integration & Polish ✨
1. **Connect UserProfilePopover**: Make "View Full Profile" button navigate to profile page
2. **Self-Profile Access**: Add "My Profile" to sidebar for easy self-access
3. **URL Routing**: Support both `/profile/[userId]` and `/profile` (self) routes
4. **Theme Consistency**: Ensure profile page matches app theming (light/dark mode)

---

## Summary & Next Steps

### ✅ **Research Complete - Ready for Implementation!**

**Key Finding**: The What's New system provides the perfect foundation! It already handles:
- Cross-community activity aggregation
- Beautiful collapsible category UI
- Pagination and filtering
- Cross-community navigation
- Real-time activity feeds

### 🎯 **Recommended Implementation Order**

**PHASE 1** - User Profile Page (High Impact, Low Risk)
- Reuse 90% of What's New page code and styling
- Create user activity API endpoint following same patterns
- Add sidebar profile link (simple navigation addition)
- **Estimated Effort**: 1-2 days

**PHASE 2** - What's New Mentions (High Value Addition)
- Add mentions as 5th category to existing What's New page
- Simple SQL LIKE query on mention JSON format
- Leverages existing UI and backend infrastructure
- **Estimated Effort**: 4-6 hours

**PHASE 3** - Integration Polish (UX Completeness)
- Connect UserProfilePopover "View Profile" button
- Add "My Profile" to sidebar for self-access
- URL routing and theme consistency
- **Estimated Effort**: 2-3 hours

### 🚀 **Ready to Start?**
All research is complete. The architecture is well-understood and the implementation path is clear. We can begin with Phase 1 immediately! 