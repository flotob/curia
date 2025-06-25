# Enhanced Notifications & Post Detail Views - Research & Implementation Plan

## 🎯 **Project Goals**

### **Primary Objectives**
1. **Humanize Notifications**: Replace IDs with meaningful titles and names
2. **Enable Clickable Navigation**: Make notifications actionable with direct links to content
3. **Create Post Detail Views**: Build individual post pages for deep linking
4. **Enhance Real-time Context**: Provide richer, more informative event data

### **User Experience Goals**
- Users see post titles instead of "Post 123"
- Users see board names instead of "Board 215" 
- Users can click notifications to jump directly to relevant content
- Users can share and bookmark individual posts
- Users get contextual information in every notification

---

## 📊 **Current State Analysis**

### **Notification Issues Identified**

#### **1. Vote Updates - Missing Post Context**
**Current Implementation:**
```typescript
// SocketContext.tsx:109
toast.info(`Post ${voteData.postId} received ${voteData.newCount} vote${voteData.newCount !== 1 ? 's' : ''}`);
```
**Problem:** Shows "Post 123 received 5 votes" instead of meaningful title
**Impact:** Users can't identify which post was voted on

#### **2. Board Presence - Missing Board Names**
**Current Implementation:**
```typescript
// OnlineUsersSidebar.tsx:45
{user.currentBoardId && (
  <p className="text-xs text-muted-foreground">
    📋 Board {user.currentBoardId}
  </p>
)}
```
**Problem:** Shows "Board 215" instead of "General Discussion"
**Impact:** Users can't identify what board others are viewing

#### **3. Non-Clickable Notifications**
**Current Implementation:** All toasts are purely informational
**Problem:** No way to navigate to the content being discussed
**Impact:** Users must manually find the relevant post/board

#### **4. Generic Messages**
**Examples:**
- `toast.warning('A post was removed by moderators');` - Which post?
- `toast.info('Board settings have been updated');` - Which board?
- `toast.info('${userName} joined the discussion');` - Which discussion/board?

### **Missing Infrastructure**

#### **1. Post Detail Views**
**Current State:** No individual post pages exist
**Needed Routes:**
- `/post/[postId]` - Simple approach
- `/board/[boardId]/post/[postId]` - Board-contextualized approach (recommended)

#### **2. Enhanced Event Payloads**
**Current Payloads Missing:**
- Post titles in vote events
- Board names in presence events  
- Post titles in comment events
- Board names in settings events

#### **3. URL Generation Utilities**
**Missing Functions:**
- `buildPostUrl(postId, boardId)` 
- `buildBoardUrl(boardId)`
- `preserveUrlParams(newPath)` 

---

## 🏗️ **Technical Architecture Analysis**

### **Current Event Broadcasting System**

#### **Server-Side Event Structure** (`server.ts:177`)
```typescript
switch (eventName) {
  case 'newPost':
    config = {
      globalRoom: true,              // ✅ Reaches all users
      specificRooms: [room],         // ✅ Board-specific notifications
      invalidateForAllUsers: true    // ✅ React Query invalidation
    };
    break;
    
  case 'voteUpdate':
    payload: { postId, newCount, userIdVoted, board_id } // ❌ Missing post title
    break;
    
  case 'newComment':
    payload: { postId, comment: {...}, board_id } // ❌ Missing post title
    break;
}
```

#### **Client-Side Event Handlers** (`SocketContext.tsx`)
```typescript
// ✅ Good: New post with title
newSocket.on('newPost', (postData: { title: string, author_name: string, ... }) => {
  toast.success(`New post: "${postData.title}" by ${postData.author_name || 'Unknown'}`);
});

// ❌ Bad: Vote with only ID  
newSocket.on('voteUpdate', (voteData: { postId: number, newCount: number, ... }) => {
  toast.info(`Post ${voteData.postId} received ${voteData.newCount} votes`);
});

// ❌ Bad: Comment with only post ID
newSocket.on('newComment', (commentData: { postId: number, ... }) => {
  // No user-facing notification currently, but would have same issue
});
```

### **Current API Data Availability**

#### **Posts API** (`/api/posts/[postId]`)
**Available Data:**
```typescript
interface ApiPost {
  id: number;
  title: string;                    // ✅ Available for notifications
  author_name: string | null;       // ✅ Available
  board_id: number;                 // ✅ Available
  board_name: string;               // ✅ Available in list queries
  // ... other fields
}
```

#### **Boards API** (`/api/communities/[communityId]/boards`)
**Available Data:**
```typescript
interface ApiBoard {
  id: number;
  name: string;                     // ✅ Available for presence
  description: string | null;       // ✅ Available for context
  community_id: string;             // ✅ Available
}
```

### **Toast Action System** (`src/components/ui/toast.tsx`)
**Available Components:**
```typescript
// ✅ ToastAction exists for clickable buttons
const ToastAction = React.forwardRef<...>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action ref={ref} className={...} {...props} />
));

// ✅ Toast can accept action prop
type ToastProps = {
  title?: React.ReactNode
  description?: React.ReactNode  
  action?: ToastActionElement     // ← Available for click actions
}
```

### **Navigation System** (`cgInstance.navigate()`)
**Available Method:**
```typescript
// ✅ Proper navigation available
cgInstance.navigate(href)
  .then(() => console.log(`Navigation successful`))
  .catch(err => console.error(`Navigation failed:`, err));
```

---

## 🔍 **Detailed Solution Design**

### **Phase 1: Enhanced Event Payloads**

#### **1.1 Server-Side Payload Enhancement**

**Vote Update Enhancement** (`/api/posts/[postId]/votes/route.ts:96`)
```typescript
// Current payload
payload: { postId, newCount: updatedPost.upvote_count, userIdVoted: userId, board_id }

// Enhanced payload (need to fetch post title)
payload: { 
  postId, 
  postTitle: updatedPost.title,           // ← Add this
  newCount: updatedPost.upvote_count, 
  userIdVoted: userId, 
  board_id,
  boardName: boardData.name               // ← Add this
}
```

**New Comment Enhancement** (`/api/posts/[postId]/comments/route.ts:172`)
```typescript
// Current payload
payload: {
  postId: postId,
  comment: { id, post_id, author_user_id, author_name, content, ... }
}

// Enhanced payload (need to fetch post + board data)
payload: {
  postId: postId,
  postTitle: postData.title,              // ← Add this
  boardId: postData.board_id,             // ← Add this  
  boardName: boardData.name,              // ← Add this
  comment: { id, post_id, author_user_id, author_name, content, ... }
}
```

#### **1.2 Presence System Enhancement**

**Board Names in Presence** (`server.ts` user presence tracking)
```typescript
// Current UserPresence interface
interface UserPresence {
  userId: string;
  userName: string;
  communityId: string;
  currentBoardId?: number;        // ← Only ID available
  // ... other fields
}

// Enhanced UserPresence interface
interface UserPresence {
  userId: string;
  userName: string;
  communityId: string;
  currentBoardId?: number;
  currentBoardName?: string;      // ← Add board name
  // ... other fields
}
```

### **Phase 2: Post Detail Views**

#### **2.1 Route Structure Decision**

**Option A: Simple Route**
- Path: `/post/[postId]` 
- Pros: Shorter URLs, simpler routing
- Cons: No board context, harder breadcrumbs

**Option B: Board-Contextualized Route (Recommended)**
- Path: `/board/[boardId]/post/[postId]`
- Pros: Clear hierarchy, easy breadcrumbs, SEO-friendly
- Cons: Longer URLs, more complex routing

**Recommendation: Option B** for better UX and context

#### **2.2 Page Structure** 

**File Structure:**
```
src/app/
├── board/
│   └── [boardId]/
│       └── post/
│           └── [postId]/
│               └── page.tsx     // ← New post detail page
```

**Component Hierarchy:**
```typescript
// /board/[boardId]/post/[postId]/page.tsx
export default function PostDetailPage({ params }: { 
  params: { boardId: string; postId: string } 
}) {
  return (
    <div className="container mx-auto py-8">
      <PostDetailBreadcrumbs boardId={boardId} postId={postId} />
      <PostDetailCard post={post} showFullContent={true} />
      <CommentSection postId={postId} />
    </div>
  );
}
```

#### **2.3 API Enhancement**

**Single Post API** (`/api/posts/[postId]/route.ts:17`)
**Current:** `return NextResponse.json({ message: 'Not Implemented' }, { status: 501 });`
**Required:** Full implementation with board access control

```typescript
async function getSinglePostHandler(req: AuthenticatedRequest, context: RouteContext) {
  const postId = parseInt(context.params.postId, 10);
  const userId = req.user?.sub;
  
  // Get post with board info and permission check
  const result = await query(`
    SELECT 
      p.*,
      b.name as board_name,
      b.settings as board_settings,
      u.name as author_name,
      u.profile_picture_url as author_profile_picture_url,
      CASE WHEN v.user_id IS NOT NULL THEN true ELSE false END as user_has_upvoted
    FROM posts p
    JOIN boards b ON p.board_id = b.id  
    JOIN users u ON p.author_user_id = u.user_id
    LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $2
    WHERE p.id = $1
  `, [postId, userId]);
  
  // Permission checks...
  // Return enhanced post data...
}
```

### **Phase 3: Clickable Notifications**

#### **3.1 URL Generation Utilities**

**Create:** `src/utils/urlBuilder.ts`
```typescript
import { useSearchParams } from 'next/navigation';

export function buildPostUrl(postId: number, boardId: number, preserveParams: boolean = true): string {
  const baseUrl = `/board/${boardId}/post/${postId}`;
  
  if (!preserveParams || typeof window === 'undefined') {
    return baseUrl;
  }
  
  // Preserve Common Ground params (cg_theme, etc.)
  const searchParams = new URLSearchParams(window.location.search);
  const cgParams = new URLSearchParams();
  
  searchParams.forEach((value, key) => {
    if (key.startsWith('cg_')) {
      cgParams.set(key, value);
    }
  });
  
  return cgParams.toString() ? `${baseUrl}?${cgParams.toString()}` : baseUrl;
}

export function buildBoardUrl(boardId: number, preserveParams: boolean = true): string {
  const baseUrl = `/?boardId=${boardId}`;
  // Similar param preservation logic...
}
```

#### **3.2 Enhanced Toast Notifications**

**Vote Update with Action** (`SocketContext.tsx`)
```typescript
newSocket.on('voteUpdate', (voteData: { 
  postId: number; 
  postTitle: string;        // ← Enhanced payload
  newCount: number; 
  userIdVoted: string; 
  board_id: number;
  boardName: string;        // ← Enhanced payload
}) => {
  if (voteData.userIdVoted !== userId) {
    toast.info({
      title: "Post Updated",
      description: `"${voteData.postTitle}" received ${voteData.newCount} vote${voteData.newCount !== 1 ? 's' : ''}`,
      action: (
        <ToastAction 
          altText="View Post"
          onClick={() => {
            const url = buildPostUrl(voteData.postId, voteData.board_id);
            cgInstance?.navigate(url);
          }}
        >
          View
        </ToastAction>
      ),
    });
  }
});
```

**New Comment with Action**
```typescript
newSocket.on('newComment', (commentData: {
  postId: number;
  postTitle: string;        // ← Enhanced payload
  boardId: number;          // ← Enhanced payload  
  boardName: string;        // ← Enhanced payload
  comment: { author_name: string; /* ... */ };
}) => {
  toast.success({
    title: "New Comment",
    description: `${commentData.comment.author_name} commented on "${commentData.postTitle}"`,
    action: (
      <ToastAction 
        altText="View Post"
        onClick={() => {
          const url = buildPostUrl(commentData.postId, commentData.boardId);
          cgInstance?.navigate(url);
        }}
      >
        View
      </ToastAction>
    ),
  });
});
```

### **Phase 4: Enhanced Presence Display**

#### **4.1 Rich Presence Information** (`OnlineUsersSidebar.tsx`)
```typescript
// Current
{user.currentBoardId && (
  <p className="text-xs text-muted-foreground">
    📋 Board {user.currentBoardId}
  </p>
)}

// Enhanced
{user.currentBoardId && user.currentBoardName && (
  <button
    onClick={() => {
      const url = buildBoardUrl(user.currentBoardId);
      cgInstance?.navigate(url);
    }}
    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer flex items-center"
  >
    📋 {user.currentBoardName}
    <ExternalLink size={10} className="ml-1" />
  </button>
)}
```

---

## 🚀 **Implementation Phases**

### **Phase 1: Foundation (Week 1)**
**Goal:** Set up post detail views and enhanced APIs

**Tasks:**
1. ✅ Create `/board/[boardId]/post/[postId]/page.tsx` route
2. ✅ Implement single post API (`GET /api/posts/[postId]`)
3. ✅ Add board access control to single post API
4. ✅ Create `PostDetailCard` component with full content display
5. ✅ Create URL builder utilities
6. ✅ Add breadcrumb navigation

**Acceptance Criteria:**
- Individual post pages are accessible and secure
- URLs preserve Common Ground parameters
- Posts display with full content and comments
- Navigation breadcrumbs work correctly

### **Phase 2: Enhanced Payloads (Week 2)**
**Goal:** Enrich real-time event data with human-readable information

**Tasks:**
1. ✅ Enhance vote update API to include post title and board name
2. ✅ Enhance comment creation API to include post and board context
3. ✅ Update presence tracking to include board names
4. ✅ Modify server-side broadcasting to send enriched payloads
5. ✅ Test all event payloads for completeness

**Acceptance Criteria:**
- Vote notifications show post titles instead of IDs
- Presence sidebar shows board names instead of IDs
- All real-time events include contextual information

### **Phase 3: Clickable Notifications (Week 3)**
**Goal:** Make all notifications actionable with navigation

**Tasks:**
1. ✅ Update `SocketContext.tsx` with enhanced notification handlers
2. ✅ Add `ToastAction` components to relevant notifications
3. ✅ Implement click handlers using `cgInstance.navigate()`
4. ✅ Test navigation from notifications across devices
5. ✅ Add analytics tracking for notification clicks

**Acceptance Criteria:**
- Users can click vote notifications to view posts
- Users can click comment notifications to view posts
- Users can click presence indicators to view boards
- All navigation preserves Common Ground context

### **Phase 4: Polish & Optimization (Week 4)**
**Goal:** Refine UX and optimize performance

**Tasks:**
1. ✅ Optimize notification frequency and grouping
2. ✅ Add notification sound/visual preferences
3. ✅ Implement notification history/log
4. ✅ Add keyboard shortcuts for navigation
5. ✅ Performance testing and optimization

**Acceptance Criteria:**
- Notifications are not overwhelming or spammy
- Users can manage notification preferences
- Performance impact is minimal
- System is fully documented

---

## 📈 **Success Metrics**

### **User Experience Metrics**
- **Notification Click-Through Rate**: Target >15% of notifications clicked
- **Post Detail View Engagement**: Target >5min average time on page
- **Navigation Accuracy**: Target <2% incorrect navigation attempts
- **User Satisfaction**: Target >4.5/5 in feedback surveys

### **Technical Metrics**
- **Notification Delivery Time**: Target <100ms for real-time events  
- **Page Load Performance**: Target <1s for post detail views
- **API Response Time**: Target <200ms for single post API
- **Error Rate**: Target <0.1% for navigation actions

### **Business Metrics**
- **User Engagement**: Increase in time spent in plugin
- **Content Discovery**: Increase in posts viewed per session
- **Community Interaction**: Increase in comments and votes
- **Feature Adoption**: >80% of users use notification navigation

---

## 🔧 **Technical Considerations**

### **Security**
- **Board Access Control**: Every post detail view must check permissions
- **URL Parameter Validation**: Prevent injection through malicious URLs  
- **Rate Limiting**: Prevent notification spam or navigation abuse
- **Authentication**: Ensure all real-time events respect user auth

### **Performance**
- **Lazy Loading**: Load post details only when needed
- **Caching Strategy**: Cache board names and post titles for presence
- **Database Optimization**: Index postId + boardId combinations
- **Real-time Throttling**: Group rapid notifications to prevent UI spam

### **Scalability**
- **Event Payload Size**: Keep enriched payloads under 1KB
- **Memory Usage**: Efficient presence tracking for large user counts
- **Database Queries**: Optimize joins for post + board + user data
- **Client-Side State**: Minimize React Query cache invalidation

### **User Experience**
- **Loading States**: Show skeletons while loading post details
- **Error Handling**: Graceful degradation for failed navigation
- **Accessibility**: Keyboard navigation and screen reader support
- **Mobile Optimization**: Touch-friendly notification actions

---

## 📚 **Documentation Requirements**

### **User Documentation**
- **Feature Guide**: How to use clickable notifications
- **Navigation Guide**: Understanding post URLs and navigation
- **Privacy Guide**: What information is shared in notifications

### **Developer Documentation**  
- **API Reference**: Enhanced event payload specifications
- **Integration Guide**: Adding new notification types
- **Testing Guide**: How to test real-time features
- **Troubleshooting**: Common issues and solutions

### **System Documentation**
- **Architecture Diagram**: Event flow and component relationships
- **Database Schema**: Updates for enhanced presence tracking
- **Security Model**: Access control and permission flow
- **Performance Benchmarks**: Expected metrics and monitoring

---

## 🎯 **Next Steps Summary**

### **Immediate Actions (This Week)**
1. **Create research document** ✅ (this document)
2. **Set up post detail view foundation**
3. **Implement basic single post API**
4. **Create URL builder utilities**

### **Priority Implementation Order**
1. **Post Detail Views** (enables all navigation)
2. **Enhanced Event Payloads** (provides meaningful data) 
3. **Clickable Notifications** (user-facing improvement)
4. **Enhanced Presence** (contextual information)

### **Key Dependencies**
- Post detail views are prerequisite for all navigation
- Enhanced APIs enable meaningful notifications
- URL preservation ensures Common Ground integration
- Security model must be consistent across all features

This comprehensive implementation will transform the notification system from basic informational messages to a rich, actionable communication system that dramatically improves user engagement and content discovery. 