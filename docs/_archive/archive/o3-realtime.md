# 🚀 Real-Time Implementation Strategy for Curia Forum

## 🏗️ Architectural Approach

### **Hybrid Architecture (Recommended)**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Socket.IO Server │    │   Redis Cluster │
│  (API Routes)   │◄──►│   (Dedicated)     │◄──►│ (State + PubSub) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Permission      │    │   Room Management│
│   (Persistent)  │    │   Middleware      │    │   User Sessions │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Why Hybrid?**
- ✅ Keep existing Next.js API routes for CRUD operations
- ✅ Dedicated Socket.IO server for persistent WebSocket connections  
- ✅ Redis for scaling and state management
- ✅ Separate concerns: HTTP API vs Real-time events

## 🔐 Permission-Aware Room Architecture

### **Room Hierarchy**
```
community:{communityId}                    // Community-wide events
  └── board:{boardId}                     // Board-specific events  
      ├── post:{postId}                   // Post-specific events
      └── typing:{boardId}                // Typing indicators
```

### **Permission Middleware for Socket Connections**
```typescript
// Pseudo-code for socket middleware
const permissionMiddleware = async (socket, next) => {
  const token = socket.handshake.auth.token;
  const { user, isValid } = await validateJWT(token);
  
  if (!isValid) return next(new Error('Authentication failed'));
  
  // Attach user data to socket
  socket.userId = user.sub;
  socket.communityId = user.cid;
  socket.userRoles = user.roles;
  socket.isAdmin = user.adm;
  
  // Join community room immediately
  socket.join(`community:${user.cid}`);
  
  next();
};
```

## 📡 Real-Time Event Design

### **Event Categories**

#### **1. Board Events**
```typescript
// User joins board view → join room with permission check
'board:join' → Check board permissions → Join `board:{boardId}`

// New post created
'board:newPost' → Broadcast to `board:{boardId}` → {post, author}

// Board settings changed (admin only)  
'board:settingsChanged' → Recalculate room memberships
```

#### **2. Post Events**
```typescript
// Vote events
'post:voteAdded' → Broadcast to `board:{boardId}` → {postId, newCount}
'post:voteRemoved' → Broadcast to `board:{boardId}` → {postId, newCount}

// Comment events
'post:newComment' → Broadcast to `post:{postId}` → {comment, author}
'post:commentDeleted' → Broadcast to `post:{postId}` → {commentId}
```

#### **3. Presence Events**
```typescript
// User presence
'user:online' → Broadcast to `community:{communityId}` → {userId, boardId}
'user:offline' → Broadcast to `community:{communityId}` → {userId}

// Typing indicators
'typing:start' → Broadcast to `post:{postId}` → {userId, userName}
'typing:stop' → Broadcast to `post:{postId}` → {userId}
```

## 🗄️ Redis Data Structures

### **User Sessions**
```redis
# Active user sessions
SET user_session:{userId} '{"socketId": "abc123", "communityId": "...", "lastSeen": "..."}'
EXPIRE user_session:{userId} 300

# User's accessible boards (cached for performance)
SET user_boards:{userId} '["boardId1", "boardId2"]'
EXPIRE user_boards:{userId} 600
```

### **Room Management**
```redis
# Track users in board rooms  
SADD board_users:{boardId} userId1 userId2 userId3

# Track user's current board view
SET user_current_board:{userId} boardId
EXPIRE user_current_board:{userId} 1800
```

### **Permission Cache**
```redis
# Cache board permissions for fast room access control
HSET board_permissions:{boardId} "allowedRoles" '["role1", "role2"]'
HSET board_permissions:{boardId} "isPublic" "false"
```

## 🔧 Implementation Strategy

### **Phase 1: Foundation**
1. **Set up dedicated Socket.IO server** (Express + Socket.IO)
2. **Integrate Redis** for session management
3. **JWT authentication middleware** for socket connections
4. **Basic room joining** with permission checks

### **Phase 2: Core Events**
1. **Real-time voting** (immediate upvote count updates)
2. **Live comments** (new comments appear instantly)
3. **Board-level post feeds** (new posts broadcast to board rooms)

### **Phase 3: Advanced Features**
1. **User presence** (online/offline status)
2. **Typing indicators** for comments
3. **Live notifications** for mentions/replies
4. **Permission change handling** (dynamic room membership updates)

## 🚀 Integration with Existing Stack

### **TanStack Query + Socket.IO**
```typescript
// Optimistic updates + real-time sync pattern
const useOptimisticVote = (postId: number) => {
  const queryClient = useQueryClient();
  
  // Socket listener for real-time updates
  useEffect(() => {
    socket.on('post:voteChanged', ({ postId: updatedPostId, newCount }) => {
      if (postId === updatedPostId) {
        // Update cache with real-time data
        queryClient.setQueryData(['post', postId], (old: any) => ({
          ...old,
          upvote_count: newCount
        }));
      }
    });
  }, [postId]);
  
  return useMutation({
    mutationFn: votePost,
    onMutate: async (newVote) => {
      // Optimistic update
      const previousPost = queryClient.getQueryData(['post', postId]);
      queryClient.setQueryData(['post', postId], (old: any) => ({
        ...old,
        upvote_count: old.upvote_count + (newVote ? 1 : -1)
      }));
      return { previousPost };
    },
    onError: (err, newVote, context) => {
      // Rollback on error
      queryClient.setQueryData(['post', postId], context.previousPost);
    }
  });
};
```

### **Permission-Aware Room Joins**
```typescript
const joinBoardRoom = async (socket: Socket, boardId: string) => {
  const userRoles = socket.userRoles;
  const isAdmin = socket.isAdmin;
  
  // Get board permissions from Redis cache
  const boardPermissions = await redis.hgetall(`board_permissions:${boardId}`);
  
  // Check access using existing permission helper
  const canAccess = canUserAccessBoard(userRoles, boardPermissions, isAdmin);
  
  if (canAccess) {
    socket.join(`board:${boardId}`);
    await redis.sadd(`board_users:${boardId}`, socket.userId);
    
    // Broadcast user joined (for presence)
    socket.to(`board:${boardId}`).emit('user:joinedBoard', {
      userId: socket.userId,
      boardId
    });
  } else {
    socket.emit('error', { message: 'Access denied to board' });
  }
};
```

## 🛡️ Security Considerations

### **Rate Limiting**
```typescript
// Redis-based rate limiting for socket events
const rateLimitCheck = async (userId: string, eventType: string) => {
  const key = `rate_limit:${userId}:${eventType}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  
  return current <= 10; // Max 10 events per minute
};
```

### **Permission Validation**
- ✅ **Every socket event** validates user permissions
- ✅ **Board setting changes** immediately update room memberships  
- ✅ **JWT expiration** handled with graceful reconnection
- ✅ **Admin bypass** for all permission checks

## 📊 Performance Optimizations

### **Connection Pooling**
- Use Redis connection pooling for Socket.IO server
- Implement connection cleanup on user disconnect

### **Event Batching**  
- Batch similar events (multiple votes) to reduce Redis operations
- Debounce typing indicators to prevent spam

### **Selective Broadcasting**
- Only broadcast to users currently viewing the affected board/post
- Use Redis pub/sub for cross-server communication in multi-instance setups

## 🔄 Migration Strategy

### **Gradual Rollout**
1. **Deploy Socket.IO server** alongside existing Next.js app
2. **Add real-time features progressively** (voting first, then comments)  
3. **Monitor performance** and optimize Redis usage
4. **Feature flags** to enable/disable real-time features per community

### **Fallback Strategy**
- Maintain existing polling/refresh behavior as fallback
- Graceful degradation when Socket.IO server is unavailable
- Client-side detection of connection issues

---

## 🎯 **Recommended Tech Stack**

- **Socket.IO Server**: Express.js + Socket.IO + TypeScript
- **Redis**: Redis Cloud or AWS ElastiCache for production  
- **Authentication**: Reuse existing JWT validation logic
- **Deployment**: Separate Heroku/Railway app for Socket.IO server
- **Monitoring**: Socket.IO admin UI + Redis monitoring

This architecture provides a solid foundation for real-time features while respecting your complex permission system and existing infrastructure! 🚀
