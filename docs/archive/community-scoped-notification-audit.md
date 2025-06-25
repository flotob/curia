# Community-Scoped Notification Implementation Audit

## 🎯 **Executive Summary**

**Current Issue**: The app uses a global Socket.IO room that broadcasts ALL notifications to ALL users across ALL communities, causing spam and broken cross-community navigation.

**Solution Strategy**: Replace the global room with community-scoped rooms + controlled cross-community notifications based on **existing partnership permissions**.

---

## 📍 **Critical Code Locations That Need Changes**

### **1. SERVER-SIDE SOCKET.IO (server.ts)**

#### **Current Global Room Usage** 
```typescript
// Lines 439-440: Auto-join global room
socket.join('global');
socket.join(`community:${user.cid}`);

// Line 144: Global broadcast function
io.to('global').emit(eventName, payload);
```

**Required Changes**:
- ✅ Remove `socket.join('global')` 
- ✅ Replace global broadcasts with community-scoped + partnership logic
- ✅ Add partnership permission checking before cross-community broadcasts

#### **Broadcasting Configuration (Lines 325-375)**
```typescript
case 'newPost':
  config = {
    globalRoom: true,              // ❌ REMOVE THIS
    specificRooms: [room],         // ✅ KEEP
    invalidateForAllUsers: true    // ✅ KEEP
  };
```

**Required Changes**:
- ✅ Set `globalRoom: false` for all event types except system announcements
- ✅ Add partnership-aware broadcasting logic using **existing partnership permissions**
- ✅ Query `community_partnerships.source_to_target_permissions.allowCrossCommunityNotifications`

### **2. PARTNERSHIP PERMISSION QUERY (NEW FUNCTION)**

#### **Simple Partnership Query Function**:
```typescript
async function getNotificationPartners(sourceCommunityId: string): Promise<string[]> {
  const result = await query(`
    SELECT DISTINCT
      CASE 
        WHEN source_community_id = $1 AND (target_to_source_permissions->>'allowCrossCommunityNotifications')::boolean = true 
        THEN target_community_id
        WHEN target_community_id = $1 AND (source_to_target_permissions->>'allowCrossCommunityNotifications')::boolean = true
        THEN source_community_id  
        ELSE NULL
      END as partner_community_id
    FROM community_partnerships 
    WHERE status = 'accepted' 
      AND (source_community_id = $1 OR target_community_id = $1)
      AND partner_community_id IS NOT NULL
  `, [sourceCommunityId]);
  
  return result.rows.map(row => row.partner_community_id);
}
```

### **3. API ROUTE EMISSION CALLS (8+ files)**

#### **Files Using `emitter.emit('broadcastEvent')`**:
1. `src/app/api/posts/route.ts` (Line 437) - New posts
2. `src/app/api/posts/[postId]/votes/route.ts` (Lines 138, 290) - Vote updates  
3. `src/app/api/posts/[postId]/comments/route.ts` (Line 712) - New comments
4. `src/app/api/posts/[postId]/reactions/route.ts` (Line 300) - Reactions
5. `src/app/api/communities/[communityId]/boards/route.ts` (Line 155) - New boards
6. `src/app/api/locks/route.ts` (Line 346) - New locks
7. `src/app/api/locks/[lockId]/route.ts` (Lines 331, 423) - Lock updates
8. `src/app/api/posts/[postId]/apply-lock/route.ts` (Lines 145, 159, 282) - Lock applications

**Current Pattern**:
```typescript
emitter.emit('broadcastEvent', {
  room: `board:${boardId}`,
  eventName: 'newPost',
  payload: { /* ... */ }
});
```

**Required Changes**:
- ✅ Add community context to all events
- ✅ Include partnership metadata for cross-community routing
- ✅ Update payload to include `communityId`, `communityShortId`, `pluginId`

### **4. CLIENT-SIDE SOCKET HANDLERS (SocketContext.tsx)**

#### **Current Global Notification Handlers (Lines 257-340)**
```typescript
newSocket.on('newPost', (postData) => {
  toast.success(`New post: "${postData.title}"`, {
    action: {
      label: 'View Post',
      onClick: () => navigateToPost(postData.id, postData.board_id) // ❌ INTERNAL ONLY
    }
  });
});
```

**Required Changes**:
- ✅ Add cross-community detection logic
- ✅ Use cross-community navigation for non-local notifications
- ✅ Add visual indicators for cross-community vs local notifications
- ✅ Filter notifications based on user preferences

#### **Navigation Functions (Lines 185-200)**
```typescript
const navigateToPost = useCallback((postId: number, boardId: number) => {
  const url = `/board/${boardId}/post/${postId}`;
  router.push(url); // ❌ ONLY WORKS FOR SAME COMMUNITY
}, [router]);
```

**Required Changes**:
- ✅ Add cross-community navigation detection
- ✅ Use `useCrossCommunityNavigation` for external links
- ✅ Update toast actions to use correct navigation method

### **5. CROSS-COMMUNITY NAVIGATION INTEGRATION**

#### **Current useCrossCommunityNavigation Hook**
```typescript
// Already exists and works!
const { navigateToPost } = useCrossCommunityNavigation();
navigateToPost(communityShortId, pluginId, boardId, postId);
```

**Required Changes**:
- ✅ Integrate this hook into SocketContext
- ✅ Auto-detect when to use cross-community vs internal navigation
- ✅ Update all notification toast actions

### **6. NO DATABASE CHANGES NEEDED!**

#### **Existing Partnership Permissions Work Perfect**:
```json
// Already in community_partnerships table
"source_to_target_permissions": {
  "allowPresenceSharing": true,
  "allowCrossCommunitySearch": true, 
  "allowCrossCommunityNavigation": true,
  "allowCrossCommunityNotifications": true  // 🎯 This is what we need!
}
```

**Zero Schema Changes Required**:
- ✅ Partnership table already exists
- ✅ Notification permissions already exist
- ✅ Admin UI already exists for managing permissions

---

## 🔄 **Implementation Phases**

### **Phase 1: Foundation - Community Rooms Only**
**Goal**: Stop global notification spam without breaking existing functionality

**Changes**:
1. **server.ts Line 439**: Remove `socket.join('global')`
2. **server.ts Line 144**: Replace `io.to('global')` with `io.to('community:${communityId}')`
3. **server.ts Lines 325-375**: Set `globalRoom: false` for all events
4. **All API routes**: Add `communityId` to broadcastEvent payloads

**Test**: Verify notifications only go to same-community users

### **Phase 2: Partnership Permission System**
**Goal**: Add controlled cross-community notifications using **existing permissions**

**Changes**:
1. Add `getNotificationPartners()` function to query existing partnerships
2. Update broadcastEvent logic to check `allowCrossCommunityNotifications`
3. **NO database changes needed** - use existing partnership permissions!

**Test**: Verify partnership-based cross-community notifications work

### **Phase 3: Client-Side Cross-Community Support**
**Goal**: Fix broken navigation and add visual indicators

**Changes**:
1. **SocketContext.tsx**: Add cross-community detection logic
2. **Toast actions**: Use appropriate navigation method
3. **Visual indicators**: Show cross-community vs local notifications
4. **User preferences**: Use existing partnership settings

**Test**: Verify cross-community toast actions navigate correctly

### **Phase 4: Admin Interface & Polish**
**Goal**: Enhance existing partnership UI

**Changes**:
1. **NO new UI needed** - notification settings already in partnership management!
2. Add notification testing interface to existing partnership cards
3. Add notification analytics and insights
4. Polish UX with better visual feedback

---

## 🚨 **Critical Dependency Requirements**

### **Already Complete**:
1. ✅ **Community partnerships system** (done!)
2. ✅ **Partnership permissions** including `allowCrossCommunityNotifications` (done!)
3. ✅ **Admin UI** for managing partnership permissions (done!)

### **Must Implement**:
- Server-side community room logic
- Client-side cross-community navigation
- Partnership permission query function

---

## 🧪 **Testing Strategy**

### **Phase 1 Testing**:
```bash
# Verify community isolation
1. Create users in different communities
2. Create post in community A
3. Verify community B users DON'T get notifications
4. Verify community A users DO get notifications
```

### **Phase 2 Testing**:
```bash
# Verify partnership notifications
1. Create partnership between communities A & B
2. Enable "allowCrossCommunityNotifications" in partnership settings
3. Create post in community A
4. Verify community B gets notification IF permission enabled
5. Verify navigation works correctly
```

### **Cross-Community Navigation Testing**:
```bash
# Verify toast actions work
1. User in community B receives notification from community A
2. Click "View Post" in toast
3. Verify correct cross-community URL is generated
4. Verify post opens in community A context
```

---

## 📊 **Success Metrics**

### **Immediate (Phase 1)**:
- ✅ Zero cross-community notification spam
- ✅ All notifications stay within communities
- ✅ No broken functionality

### **Medium-term (Phase 2-3)**:
- ✅ Partnership-based cross-community notifications work using existing permissions
- ✅ Cross-community toast actions navigate correctly
- ✅ Visual distinction between local/cross-community notifications

### **Long-term (Phase 4)**:
- ✅ Admin satisfaction with notification controls (using existing partnership UI)
- ✅ User engagement with cross-community features
- ✅ Zero notification-related user complaints

---

## 🛠️ **Implementation Checklist**

### **Server-Side Changes**:
- [ ] Remove global room from socket connection
- [ ] Update broadcastEvent to use community rooms
- [ ] Add partnership permission checking using existing `allowCrossCommunityNotifications`
- [ ] Update all API routes to include community context
- [ ] Create `getNotificationPartners()` function

### **NO Database Changes**:
- [x] Partnership permissions already include `allowCrossCommunityNotifications`
- [x] Admin UI already exists for managing these permissions
- [x] Partnership system already handles bilateral permissions

### **Client-Side Changes**:
- [ ] Add cross-community detection to SocketContext
- [ ] Update toast navigation to use cross-community logic
- [ ] Add visual indicators for notification types
- [ ] Use existing partnership notification preferences

### **Admin Interface**:
- [x] Partnership notification controls already exist!
- [ ] Add notification testing interface to existing partnership cards
- [ ] Enhance existing partnership UI with notification status
- [ ] Create notification analytics dashboard

### **Testing & Validation**:
- [ ] Create automated tests for community isolation
- [ ] Test partnership notification flows using existing permissions
- [ ] Validate cross-community navigation
- [ ] Performance test with multiple communities

---

**Key Insight**: We can implement the entire system using existing infrastructure! No database changes needed - the partnership permissions already include `allowCrossCommunityNotifications`. This makes implementation much simpler and cleaner. 