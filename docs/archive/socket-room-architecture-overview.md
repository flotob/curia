# Socket.IO Room Architecture Overview

## 🚨 **Current Room Structure (THE PROBLEM)**

### **Rooms Users Join On Connection**
```typescript
// server.ts lines 439-440
socket.join('global');                    // ❌ EVERYONE gets EVERYTHING
socket.join(`community:${user.cid}`);     // ✅ Community-scoped (good but underused)
```

### **Rooms Users Join During Activity**
```typescript
// When viewing boards
socket.join(`board:${boardId}`);          // ✅ Board-specific presence/typing
```

### **Current Broadcasting Pattern (THE SPAM)**
```typescript
// server.ts broadcastEvent function
if (config.globalRoom) {
  io.to('global').emit(eventName, payload);     // ❌ Sends to ALL users across ALL communities
}
config.specificRooms.forEach(room => {
  io.to(room).emit(eventName, payload);         // ✅ Sends to specific board room
});
```

### **What Events Use Global Room** ❌
- `newPost` → **Sends to ALL users across ALL communities**
- `voteUpdate` → **Sends to ALL users across ALL communities** 
- `newComment` → **Sends to ALL users across ALL communities**
- `reactionUpdate` → **Sends to ALL users across ALL communities**
- `newBoard` → **Sends to ALL users across ALL communities**

### **Result: NOTIFICATION SPAM**
- User in Community A gets notifications about posts in Communities B, C, D, etc.
- Toast actions try internal navigation for cross-community content → 404s
- No admin control over what notifications communities share

---

## ✅ **Future Room Structure (THE SOLUTION)**

### **Phase 1: Community-Scoped Only**
```typescript
// Connection (remove global spam)
socket.join(`community:${user.cid}`);     // ✅ Primary notification target

// Activity-based rooms (keep existing)
socket.join(`board:${boardId}`);          // ✅ Board presence/typing
```

### **Phase 2: Partnership-Aware Broadcasting**
```typescript
// Broadcasting logic becomes:
1. Always send to source community: `community:${sourceCommunityId}`
2. Check partnerships: Get communities with notification permissions
3. Send to partner communities: `community:${partnerCommunityId}`
```

### **Phase 3: Enhanced Room Structure**
```typescript
// Core rooms
socket.join(`community:${user.cid}`);                    // Primary notifications
socket.join(`board:${boardId}`);                         // Board presence/typing

// Admin-only rooms  
socket.join(`community:${user.cid}:admins`);            // Admin notifications (partnerships, etc.)

// Optional: Advanced rooms (future)
socket.join(`user:${userId}`);                          // Personal notifications
socket.join(`post:${postId}`);                          // Post-specific discussions
```

---

## 📊 **Room Usage Matrix**

### **Current Broadcasting (BROKEN)**
| Event Type | Global Room | Community Room | Board Room | Result |
|------------|-------------|----------------|------------|---------|
| New Post | ✅ ALL USERS | ❌ Unused | ✅ Board viewers | SPAM |
| Vote Update | ✅ ALL USERS | ❌ Unused | ✅ Board viewers | SPAM |
| New Comment | ✅ ALL USERS | ❌ Unused | ✅ Board viewers | SPAM |
| New Board | ✅ ALL USERS | ❌ Unused | N/A | SPAM |

### **Future Broadcasting (CLEAN)**
| Event Type | Community Room | Partner Communities | Board Room | Result |
|------------|----------------|---------------------|------------|---------|
| New Post | ✅ Source only | ✅ If permitted | ✅ Board viewers | SCOPED |
| Vote Update | ✅ Source only | ✅ If permitted | ✅ Board viewers | SCOPED |
| New Comment | ✅ Source only | ✅ If permitted | ✅ Board viewers | SCOPED |
| New Board | ✅ Source only | ✅ If permitted | N/A | SCOPED |

---

## 🎯 **Answer to Your Questions**

### **Q1: Should global spam be community + partners with notifications enabled?**
**✅ YES, exactly!** The new flow should be:

1. **Always send to source community**: `community:${sourceCommunityId}`
2. **Check partnership permissions**: Query `community_partnerships` table
3. **Send to permitted partners**: `community:${partnerCommunityId}` (if notifications enabled)

### **Q2: Room overview after changes**

#### **Rooms Users Will Join:**
```typescript
// On connection
socket.join(`community:${user.cid}`);           // Primary notification target
if (user.adm) {
  socket.join(`community:${user.cid}:admins`);  // Admin-only notifications
}

// During activity  
socket.join(`board:${boardId}`);                // When viewing boards (presence/typing)
```

#### **Broadcasting Targets:**
```typescript
// For each event (e.g., new post in Community A):
1. io.to(`community:A`).emit(eventName, payload)

// If partnerships exist with notification permissions:
2. io.to(`community:B`).emit(eventName, payload)  // Partner community B
3. io.to(`community:C`).emit(eventName, payload)  // Partner community C

// Always:
4. io.to(`board:${boardId}`).emit(eventName, payload)  // Board-specific room
```

---

## 🔄 **Migration Strategy**

### **Phase 1: Remove Global Spam (Immediate)**
```typescript
// BEFORE (server.ts line 439)
socket.join('global');                    // ❌ Remove this
socket.join(`community:${user.cid}`);     // ✅ Keep this

// BEFORE (server.ts broadcastEvent)
io.to('global').emit(eventName, payload); // ❌ Remove this

// AFTER 
io.to(`community:${communityId}`).emit(eventName, payload); // ✅ Community-scoped
```

### **Phase 2: Add Partnership Logic**
```typescript
async function smartBroadcast(eventName, payload, sourceCommunityId) {
  // Always send to source community
  io.to(`community:${sourceCommunityId}`).emit(eventName, payload);
  
  // Get partner communities with notification permissions
  const partners = await getNotificationPartners(sourceCommunityId, eventName);
  
  // Send to permitted partners
  partners.forEach(partnerId => {
    io.to(`community:${partnerId}`).emit(eventName, {
      ...payload,
      isCrossCommunityNotification: true,
      sourceCommunityId,
      sourceCommunityName: 'Partner Community'
    });
  });
}
```

---

## 📈 **Expected Improvements**

### **Phase 1 Results:**
- ✅ **Zero cross-community spam**: Users only get notifications from their community
- ✅ **Performance improvement**: Fewer unnecessary broadcasts
- ✅ **No broken functionality**: Everything still works, just scoped correctly

### **Phase 2 Results:**
- ✅ **Controlled cross-community**: Only when explicitly enabled by partnerships
- ✅ **Admin control**: Communities choose what to share/receive
- ✅ **Proper navigation**: Cross-community notifications use correct URLs

### **User Experience:**
```typescript
// Local notification (same community)
toast.success("New post: 'Hello World'", {
  action: { label: 'View Post', onClick: () => router.push('/board/123/post/456') }
});

// Cross-community notification (partner community)  
toast.info("📡 Partner post: 'Hello from Community B'", {
  action: { label: 'View Post', onClick: () => navigateToCommunity('communityB', 'pluginB', 123, 456) }
});
```

---

This architecture provides clean separation between local and cross-community notifications while leveraging the existing partnership system for controlled sharing. 