# Smart Feed System Roadmap

**Goal:** Transform the current simple feed into an intelligent, paginated system with configurable ranking algorithms that balance recency and popularity.

---

## 📋 **Current State Analysis**

### What We Have:
- ✅ Feed ordered by upvotes DESC, then creation date DESC (most upvoted first)
- ✅ Simple upvote system with optimistic updates and vote counts
- ✅ Board-based filtering (shows posts from specific boards)
- ✅ Community and board settings stored in JSONB columns
- ✅ Role-based access control for boards
- ✅ Basic pagination with Previous/Next buttons (not infinite scroll)

### What's Missing:
- ❌ Smart ranking algorithm that balances recency with popularity
- ❌ Infinite scroll UX (currently uses traditional pagination)
- ❌ Configurable feed algorithms per community/board
- ❌ Mobile-optimized infinite loading
- ❌ Admin controls for feed behavior

---

## 🎯 **Vision & Goals**

### Primary Objectives:
1. **Smart Ranking**: Posts ranked by configurable formula balancing recency + popularity
2. **Infinite Scroll**: Smooth pagination that works on all devices
3. **Configurable Bias**: Admins control recency vs popularity balance via sliders
4. **Future-Ready**: Architecture that supports additional ranking signals later

### Success Metrics:
- 📱 Smooth infinite scroll on mobile and desktop
- ⚡ Fast feed loading (< 500ms initial load)
- 🎛️ Intuitive admin controls for feed behavior
- 🔄 Real-time adaptation to community preferences

---

## 🏗️ **Technical Architecture**

### 1. Ranking Algorithm Framework

**Current Algorithm:**
```sql
ORDER BY p.upvote_count DESC, p.created_at DESC
```
- Simple upvote-based ranking (most popular first)
- Creation date as tiebreaker for posts with same upvote count
- No recency boost for newer content

**Enhanced Algorithm (v1):**
```typescript
score = baseScore + (recencyBias * recencyFactor)

where:
  baseScore = log(max(upvotes + 1, 1))  // Logarithmic scaling prevents runaway leaders
  recencyFactor = exp(-ageInHours / decayRate)  // Exponential decay over time
  recencyBias = 0.0 to 1.0 (from admin slider)
  decayRate = 24 hours (can be made configurable later)
```

**Why This Enhancement:**
- **Current issue**: Popular posts dominate indefinitely, newer content gets buried
- **Logarithmic upvotes**: Prevents posts with 100+ upvotes from completely dominating
- **Exponential decay**: Recent posts get significant boost that fades naturally
- **Configurable bias**: 0 = current behavior (pure popularity), 1 = heavily favor recent content
- **Extensible**: Easy to add more signals (comments, author reputation, etc.)

### 2. Database Strategy

**Posts Table Enhancement:**
```sql
-- Add computed score column with index for fast sorting
ALTER TABLE posts ADD COLUMN feed_score DECIMAL(10,4) DEFAULT 0;
CREATE INDEX posts_feed_score_desc_idx ON posts (feed_score DESC, created_at DESC);

-- Add trigger to recalculate scores on upvote changes
CREATE OR REPLACE FUNCTION update_post_feed_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Score calculation will be done in application layer initially
  -- Later we can move to database functions for better performance
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Settings Schema:**
```typescript
// Community Settings
interface CommunitySettings {
  permissions?: { allowedRoles?: string[] };
  feed?: {
    recencyBias: number;        // 0.0 - 1.0 (default: 0.3)
    pageSize: number;           // posts per page (default: 20)
    refreshInterval: number;    // minutes between score recalculation (default: 60)
  };
}

// Board Settings (inherits from community, can override)
interface BoardSettings {
  permissions?: { allowedRoles?: string[] };
  feed?: {
    recencyBias?: number;       // overrides community setting if specified
    pageSize?: number;          // overrides community setting if specified
  };
}
```

### 3. API Design

**New Feed Endpoint:**
```typescript
GET /api/feed?cursor={cursor}&limit={limit}&boardId={boardId}

Response:
{
  posts: Post[],
  pagination: {
    nextCursor: string | null,
    hasMore: boolean,
    totalEstimate: number
  },
  algorithm: {
    recencyBias: number,
    lastUpdated: string
  }
}
```

**Cursor Strategy:**
- Use compound cursor: `{score}_{postId}` for consistent pagination
- Handles real-time updates without duplicates or skips
- Backwards compatible with existing feed

### 4. Frontend Architecture

**Components Structure:**
```
components/
├── feed/
│   ├── SmartFeedList.tsx          // Main infinite scroll container
│   ├── FeedPost.tsx               // Individual post with ranking info
│   ├── FeedPagination.tsx         // Cursor-based pagination logic
│   └── FeedSettings.tsx           // Real-time feed controls (future)
├── settings/
│   ├── FeedAlgorithmForm.tsx      // Recency bias slider component
│   └── FeedPreview.tsx            // Live preview of algorithm changes
```

---

## 📦 **Implementation Roadmap**

### **Phase 1: Foundation (Week 1)**

#### WP1.1: Database Schema Updates
- **Goal**: Add feed scoring infrastructure to database
- **Tasks**:
  - Add `feed_score` column to posts table with index
  - Create migration for existing posts (initial score = upvote_count)
  - Add feed settings to community/board settings interfaces
- **Acceptance**: All existing posts have calculated feed scores

#### WP1.2: Settings Storage Framework
- **Goal**: Extend settings system to support feed configuration
- **Tasks**:
  - Update `CommunitySettings` and `BoardSettings` TypeScript interfaces
  - Add feed settings validation to API endpoints
  - Create default feed settings for existing communities/boards
- **Acceptance**: Feed settings can be stored and retrieved via API

#### WP1.3: Basic Ranking Algorithm Service
- **Goal**: Implement core ranking calculation logic
- **Tasks**:
  - Create `FeedRankingService` with pluggable algorithm interface
  - Implement initial recency+upvotes formula
  - Add batch score recalculation utility
- **Acceptance**: Can calculate feed scores for any post given settings

### **Phase 2: Smart Feed API (Week 2)**

#### WP2.1: Cursor-Based Pagination API
- **Goal**: Create new feed endpoint with proper pagination
- **Tasks**:
  - Build `/api/feed` endpoint with cursor pagination
  - Implement score-based sorting with cursor consistency
  - Add board filtering and access control integration
- **Acceptance**: API returns paginated posts sorted by calculated score

#### WP2.2: Score Calculation Integration
- **Goal**: Connect ranking algorithm to feed API
- **Tasks**:
  - Integrate `FeedRankingService` into feed API
  - Add settings inheritance (board inherits from community)
  - Implement real-time score updates on upvote changes
- **Acceptance**: Feed API returns posts ranked by configurable algorithm

#### WP2.3: Performance Optimization
- **Goal**: Ensure feed performs well at scale
- **Tasks**:
  - Add database query optimization and caching
  - Implement score recalculation background job
  - Add performance monitoring and logging
- **Acceptance**: Feed loads in <500ms with 1000+ posts

### **Phase 3: Frontend Infinite Scroll (Week 3)**

#### WP3.1: Infinite Scroll Component
- **Goal**: Replace current feed with smooth infinite scroll
- **Tasks**:
  - Create `SmartFeedList` component with intersection observer
  - Implement cursor-based pagination state management
  - Add loading states and error handling
- **Acceptance**: Users can scroll infinitely through feed

#### WP3.2: Mobile Optimization
- **Goal**: Ensure excellent mobile UX
- **Tasks**:
  - Optimize scroll performance on mobile devices
  - Add pull-to-refresh functionality
  - Implement proper touch event handling
- **Acceptance**: Smooth scrolling on iOS and Android browsers

#### WP3.3: Feed State Management
- **Goal**: Proper caching and real-time updates
- **Tasks**:
  - Integrate with React Query for caching
  - Add optimistic updates for new posts/votes
  - Handle real-time score changes gracefully
- **Acceptance**: Feed updates smoothly without jarring UI changes

### **Phase 4: Admin Controls (Week 4)**

#### WP4.1: Recency Bias Settings UI
- **Goal**: Add feed algorithm controls to admin settings
- **Tasks**:
  - Create `FeedAlgorithmForm` component with slider
  - Add to community settings page
  - Add to board settings/creation pages
- **Acceptance**: Admins can configure recency bias via intuitive slider

#### WP4.2: Live Feed Preview
- **Goal**: Admins can see algorithm effects in real-time
- **Tasks**:
  - Create `FeedPreview` component showing ranking changes
  - Add preview mode to settings forms
  - Show before/after post ordering
- **Acceptance**: Admins see immediate feedback when adjusting settings

#### WP4.3: Settings Validation & Rollout
- **Goal**: Ensure settings work properly across all scenarios
- **Tasks**:
  - Add comprehensive settings validation
  - Implement gradual rollout for algorithm changes
  - Add admin notifications for feed performance
- **Acceptance**: Settings changes apply consistently and safely

---

## 🔮 **Future Extensions (Phase 5+)**

### Advanced Ranking Signals:
- **Comment velocity**: Posts generating discussion get boosted
- **Author reputation**: Trusted contributors get slight boost
- **Topic modeling**: Content relevance scoring
- **Engagement patterns**: Click-through rates, time spent reading
- **Community health**: Diversity scoring to prevent echo chambers

### Personalization:
- **Individual preferences**: Per-user recency bias settings
- **Interaction history**: Boost content similar to user's past engagement
- **Social signals**: Friend/connection activity influence
- **Time-based patterns**: Different algorithms for different times of day

### Advanced Features:
- **A/B testing framework**: Test different algorithms with user cohorts
- **Feed analytics**: Admin dashboard showing engagement metrics
- **Content recommendations**: "You might also like" sidebar
- **Trending detection**: Identify rapidly growing content

---

## 🎛️ **Technical Considerations**

### Performance:
- **Score caching**: Calculate scores periodically, not on every request
- **Database optimization**: Proper indexing strategy for complex sorts
- **CDN integration**: Cache feed pages for anonymous users
- **Background jobs**: Score recalculation in async workers

### Scalability:
- **Horizontal scaling**: Algorithm service can run on multiple instances
- **Database sharding**: Partition by community if needed
- **Content delivery**: Static content caching and optimization
- **Rate limiting**: Prevent feed API abuse

### Monitoring:
- **Algorithm performance**: Track ranking quality metrics
- **User engagement**: Monitor scroll depth, time on feed
- **Technical metrics**: API response times, error rates
- **Business metrics**: User retention, content discovery rates

### Security:
- **Access control**: Ensure feed respects board permissions
- **Vote manipulation**: Detect and prevent artificial scoring
- **Content safety**: Integration with moderation systems
- **Privacy**: Respect user data preferences

---

## 🏁 **Success Criteria**

### Technical:
- ✅ Feed loads < 500ms initial, < 200ms pagination
- ✅ Smooth 60fps scrolling on all target devices
- ✅ Zero data loss during real-time updates
- ✅ 99.9% API uptime

### User Experience:
- ✅ Intuitive infinite scroll with clear loading states
- ✅ Relevant content surfaces based on recency/popularity balance
- ✅ Admin controls are discoverable and effective
- ✅ Mobile experience rivals native apps

### Business:
- ✅ Increased user engagement (session time, scroll depth)
- ✅ Better content discovery (votes on new posts)
- ✅ Admin satisfaction with customization options
- ✅ Foundation for future personalization features

---

*This roadmap provides a solid foundation that can evolve based on user feedback and technical learnings during implementation.* 