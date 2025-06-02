# Roadmap: Real-time Presence System & Global Room Architecture

## Executive Summary

This document outlines the implementation plan for a comprehensive real-time presence system that addresses current limitations in cross-room communication and adds rich online presence features.

### Current Architecture Analysis

**Current Room Structure:**
```
User Authentication → Auto-join: community:${user.cid}
User Navigation → Manual join: board:${boardId}
```

**Current Limitations:**
1. **Cross-room communication gap**: User A on home feed (in `community:A` only) cannot see activities from User B in `board:5` (in `community:B` + `board:5`)
2. **No global presence awareness**: Users cannot see who else is online
3. **Limited real-time invalidation**: React Query invalidation only occurs for users who receive socket events
4. **No board-level presence**: Cannot see who else is viewing the same board

**Target Architecture:**
```
User Authentication → Auto-join: global + community:${user.cid}
User Navigation → Manual join: board:${boardId}
Real-time presence tracking across all room levels
```

---

## Phase 1: Global Room Infrastructure

### WP1.1: Implement Global Room System
**Objective:** Create a global room where all authenticated users participate

**Server-side changes (server.ts):**
```typescript
// Auto-join users to global room on authentication
socket.join('global');
socket.join(`community:${decoded.cid}`);

// Track global user presence
const globalPresence = new Map<string, UserPresence>();
```

**User Presence Interface:**
```typescript
interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  currentBoardId?: number;
  connectedAt: Date;
  lastSeen: Date;
}
```

**Events to implement:**
- `userOnline` → Broadcast to `global` room when user connects
- `userOffline` → Broadcast to `global` room when user disconnects
- `userBoardChanged` → Broadcast to `global` room when user changes boards

### WP1.2: Enhanced Event Broadcasting Strategy
**Objective:** Determine which events should broadcast globally vs. room-specifically

**Global Events (broadcast to `global` room):**
- `userOnline` / `userOffline` - Global presence changes
- `newPost` - All users should see new posts for home feed invalidation
- `newBoard` - All users should see new boards for sidebar updates

**Board-specific Events (broadcast to `board:${boardId}` room):**
- `userJoinedBoard` / `userLeftBoard` - Board presence
- `userTyping` - Typing indicators
- `voteUpdate` - Vote changes (also broadcast globally for home feed)
- `newComment` - Comment notifications (also broadcast globally for home feed)

**Dual Broadcasting Pattern:**
```typescript
// New post: broadcast to both global and board rooms
io.to('global').emit('newPost', payload);
io.to(`board:${boardId}`).emit('newPost', payload);
```

### WP1.3: Database Schema for Presence Tracking
**Objective:** Determine if we need database tables for persistent presence tracking

**Analysis:** 
- **In-memory approach**: Store presence data in server memory (Map/Set structures)
  - Pros: Fast, no DB overhead, real-time
  - Cons: Lost on server restart, no persistence
- **Database approach**: Create `user_presence` table
  - Pros: Persistent, can track historical data
  - Cons: DB overhead, potential lag

**Recommendation:** Start with in-memory for MVP, add database persistence in Phase 2

**If database approach chosen:**
```sql
CREATE TABLE user_presence (
  user_id TEXT PRIMARY KEY,
  is_online BOOLEAN DEFAULT FALSE,
  current_board_id INTEGER REFERENCES boards(id),
  connected_at TIMESTAMPTZ,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  socket_id TEXT
);
```

---

## Phase 2: Online Users Sidebar Component

### WP2.1: Create OnlineUsersSidebar Component
**Location:** `src/components/presence/OnlineUsersSidebar.tsx`

**Features:**
- Global online users list
- Current board participants (when viewing a board)
- User avatars and names
- Online status indicators
- Expandable/collapsible sections

**UI Structure:**
```
┌─ Online Users ─────────────┐
│ 🟢 Global (12 online)      │
│   👤 Alice (Admin)         │
│   👤 Bob                   │
│   👤 Charlie               │
│                            │
│ 📋 In This Board (3)       │
│   👤 Alice (typing...)     │
│   👤 Bob                   │
│   👤 You                   │
└────────────────────────────┘
```

**Data Management:**
```typescript
interface OnlineUser {
  userId: string;
  userName: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  currentBoardId?: number;
  isTyping?: boolean;
}

// Socket context additions
const [globalOnlineUsers, setGlobalOnlineUsers] = useState<OnlineUser[]>([]);
const [boardOnlineUsers, setBoardOnlineUsers] = useState<OnlineUser[]>([]);
```

### WP2.2: Integrate Sidebar into Main Layout
**Location:** `src/components/layout/MainLayoutWithSidebar.tsx`

**Layout Changes:**
```
┌─LeftSidebar ─┬─ MainContent ─┬─ RightSidebar ─┐
│ - Home       │               │ Online Users   │
│ - Boards     │   Feed/Post   │ - Global       │
│ - Settings   │   Content     │ - Current Room │
└──────────────┴───────────────┴────────────────┘
```

**Responsive Behavior:**
- Desktop: Show both sidebars
- Tablet: Hide right sidebar by default, toggle button
- Mobile: Overlay right sidebar when opened

### WP2.3: Socket Event Handlers for Presence
**Location:** `src/contexts/SocketContext.tsx`

**New Event Handlers:**
```typescript
socket.on('userOnline', (user: OnlineUser) => {
  setGlobalOnlineUsers(prev => [...prev.filter(u => u.userId !== user.userId), user]);
});

socket.on('userOffline', ({ userId }: { userId: string }) => {
  setGlobalOnlineUsers(prev => prev.filter(u => u.userId !== userId));
});

socket.on('userJoinedBoard', (data: { userId: string; userName: string; boardId: number }) => {
  // Update board-specific presence
  setBoardOnlineUsers(prev => [...prev.filter(u => u.userId !== data.userId), {
    userId: data.userId,
    userName: data.userName,
    currentBoardId: data.boardId
  }]);
});

socket.on('globalPresenceSync', (users: OnlineUser[]) => {
  // Initial sync when user connects
  setGlobalOnlineUsers(users);
});
```

---

## Phase 3: Advanced Presence Features

### WP3.1: Real-time Typing Indicators
**Enhancement:** Extend current typing system to show in sidebar

**Current Implementation:** Typing events are board-specific
**Enhancement:** Show typing status in sidebar for current board users

```typescript
socket.on('userTyping', ({ userId, isTyping, postId }: TypingEvent) => {
  setBoardOnlineUsers(prev => 
    prev.map(user => 
      user.userId === userId 
        ? { ...user, isTyping: isTyping ? (postId ? `commenting on post ${postId}` : 'composing post') : false }
        : user
    )
  );
});
```

### WP3.2: User Interaction Features
**Features to implement:**

1. **Click on user → View profile** (future enhancement)
2. **Hover on user → Show tooltip** with online duration
3. **Admin indicators** in user list
4. **Board navigation** - click on user to see what board they're viewing

### WP3.3: Presence Cleanup & Connection Management
**Objective:** Handle edge cases and cleanup

**Connection Cleanup:**
- Remove users from presence on disconnect
- Handle page refresh scenarios
- Detect and remove stale connections

**Server-side Presence Management:**
```typescript
// On disconnect
socket.on('disconnect', () => {
  globalPresence.delete(user.sub);
  io.to('global').emit('userOffline', { userId: user.sub });
  
  // Cleanup board presence
  for (const room of socket.rooms) {
    if (room.startsWith('board:')) {
      const boardId = room.split(':')[1];
      socket.to(room).emit('userLeftBoard', { userId: user.sub, boardId: parseInt(boardId) });
    }
  }
});
```

---

## Phase 4: Performance & Scalability

### WP4.1: Presence Data Optimization
**Objectives:**
- Minimize data transfer for presence updates
- Implement efficient diff-based updates
- Add pagination for large user lists

**Optimization Strategies:**
```typescript
// Only send changed presence data
const presenceDiff = {
  added: newUsers,
  removed: disconnectedUserIds,
  updated: changedUsers
};

// Paginated presence for large communities
const paginatedPresence = {
  users: globalUsers.slice(offset, offset + limit),
  total: globalUsers.length,
  hasMore: globalUsers.length > offset + limit
};
```

### WP4.2: Rate Limiting & Debouncing
**Prevent spam and improve performance:**

```typescript
// Debounce typing indicators
const debouncedTyping = debounce((boardId: number, isTyping: boolean) => {
  socket.emit('typing', { boardId, isTyping });
}, 300);

// Rate limit presence updates
const rateLimitedPresenceUpdate = rateLimit({
  windowMs: 1000, // 1 second
  max: 5 // Max 5 presence updates per second
});
```

### WP4.3: Memory Management
**Prevent memory leaks in long-running sessions:**

```typescript
// Periodic cleanup of stale connections
setInterval(() => {
  const staleThreshold = Date.now() - (5 * 60 * 1000); // 5 minutes
  for (const [userId, presence] of globalPresence.entries()) {
    if (presence.lastSeen.getTime() < staleThreshold) {
      globalPresence.delete(userId);
      io.to('global').emit('userOffline', { userId });
    }
  }
}, 60000); // Run every minute
```

---

## Implementation Strategy

### Priority Order:
1. **WP1.1** - Global room infrastructure (foundational)
2. **WP1.2** - Enhanced event broadcasting (fixes current limitation)
3. **WP2.1** - OnlineUsersSidebar component (user-facing feature)
4. **WP2.2** - Layout integration (complete the UX)
5. **WP2.3** - Socket event handlers (wire everything together)

### Migration Requirements:
**Database migrations needed:** Potentially none for MVP (in-memory approach)
**If database approach chosen:** Add `user_presence` table migration

### Risk Assessment:
**Low Risk:**
- In-memory presence tracking
- Socket event enhancements
- UI component development

**Medium Risk:**
- Layout changes (responsive design complexity)
- Performance with many online users

**High Risk:**
- Database-based presence (if chosen)
- Memory management at scale

### Success Metrics:
**Phase 1 Complete:**
- All users receive global events (newPost, newBoard)
- Home feed updates in real-time regardless of user location
- Global room functionality working

**Phase 2 Complete:**
- Right sidebar shows online users
- Board-specific presence visible
- Real-time presence updates working

**Full Implementation Complete:**
- Typing indicators in sidebar
- Smooth user experience across all screen sizes
- Performance optimized for 50+ concurrent users

---

## Database Schema Considerations

### Option A: In-Memory Only (Recommended for MVP)
**Pros:**
- No database overhead
- Instant updates
- Simple implementation

**Cons:**
- Lost on server restart
- No historical data
- Limited scalability

### Option B: Hybrid Approach (Future Enhancement)
**Combine in-memory for real-time + database for persistence:**

```sql
-- Migration: Add user session tracking
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (disconnected_at - connected_at))
  ) STORED
);

-- Migration: Add board visit tracking  
CREATE TABLE board_visits (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  board_id INTEGER NOT NULL REFERENCES boards(id),
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER
);
```

**Future analytics possibilities:**
- Most active users
- Most visited boards
- Peak online times
- User engagement patterns

---

## Conclusion

This roadmap addresses the fundamental cross-room communication limitation while building a foundation for rich presence features. The phased approach allows for iterative development and testing, with clear success criteria at each phase.

The key insight is that **some events need global broadcasting** to ensure all users (regardless of their current room) can maintain synchronized application state, particularly for the home feed aggregation feature. 