# User-Community Relationships, Friends List & Database Enhancement Research

## 📋 **Overview**

This document outlines the implementation of persistent user-community relationships tracking, user friends list storage, and enhancement of the communities table schema to support offline URL generation and cross-device "What's New" functionality.

## 🎯 **Problem Statement**

### **Current Limitations:**

1. **No User-Community Relationship Tracking**: 
   - We don't know which communities a user has accessed
   - No persistent record of user engagement across communities
   - "What's New" feature only works on single device sessions

2. **Missing Community Metadata in Database**:
   - `communityShortId` and `pluginId` only available at runtime from CG lib
   - Cannot build external URLs without active user session
   - Share functionality fails in server-side contexts (Telegram notifications, etc.)

3. **No Friends List Persistence**:
   - Friends data only available via CG lib at runtime
   - Cannot build friend-based features without active session
   - Cannot implement friend activity notifications or filters

4. **Limited Cross-Device Experience**:
   - User's "last visit" tied to JWT token lifecycle
   - No persistence across devices or browser sessions
   - Cannot track community engagement patterns

## 🔍 **Current State Analysis**

### **Session Data Flow:**
```typescript
// Currently received from CG lib in session creation:
interface SessionRequestBody {
  userId: string;
  communityId: string;
  communityShortId?: string;  // ← Needed for URLs, not persisted
  pluginId?: string;          // ← Needed for URLs, not persisted
  // ... other fields
}

// Available via CG lib (not currently retrieved in session):
interface UserFriendsResponsePayload {
  friends: Array<{
    id: string;               // ← CG user ID
    name: string;             // ← Display name
    imageUrl?: string;        // ← Profile picture URL
  }>;
  totalCount: number;
}
```

### **CG Lib Integration Pattern:**
```typescript
// From howto-cg-lib.md - Friends retrieval pattern:
const retrieveUserFriends = async (cgInstance: CgPluginLib) => {
  try {
    const friendsResponse = await cgInstance.getUserFriends(10, 0);
    return friendsResponse?.data ?? null;
  } catch (error) {
    console.error('Failed to retrieve user friends:', error);
    return { error: error.message };
  }
};

// Plugin ID extraction:
const pluginId = cgInstance.getContextData()?.pluginId;

// Community URL extraction:
const communityInfo = await cgInstance.getCommunityInfo();
const communityShortId = communityInfo.data.url; // This is the slug/short ID
```

## 🗄️ **Proposed Database Schema Changes**

### **1. New Table: `user_communities`**

```sql
CREATE TABLE "user_communities" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  "community_id" TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  "first_visited_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_visited_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "visit_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique user-community relationships
  UNIQUE(user_id, community_id)
);

-- Performance indexes
CREATE INDEX idx_user_communities_user_id ON user_communities(user_id);
CREATE INDEX idx_user_communities_community_id ON user_communities(community_id);
CREATE INDEX idx_user_communities_last_visited ON user_communities(last_visited_at);
CREATE INDEX idx_user_communities_user_last_visited ON user_communities(user_id, last_visited_at);

-- Trigger for updated_at
CREATE TRIGGER set_timestamp_user_communities
  BEFORE UPDATE ON user_communities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
```

### **2. New Table: `user_friends`**

```sql
CREATE TABLE "user_friends" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  "friend_user_id" TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  "friend_name" TEXT NOT NULL,
  "friend_image_url" TEXT,
  "friendship_status" TEXT NOT NULL DEFAULT 'active', -- active, removed, blocked
  "synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique friendship relationships
  UNIQUE(user_id, friend_user_id),
  
  -- Prevent self-friendship
  CHECK(user_id != friend_user_id)
);

-- Performance indexes
CREATE INDEX idx_user_friends_user_id ON user_friends(user_id);
CREATE INDEX idx_user_friends_friend_user_id ON user_friends(friend_user_id);
CREATE INDEX idx_user_friends_status ON user_friends(friendship_status) WHERE friendship_status = 'active';
CREATE INDEX idx_user_friends_synced ON user_friends(synced_at);

-- Trigger for updated_at
CREATE TRIGGER set_timestamp_user_friends
  BEFORE UPDATE ON user_friends
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
```

### **3. Enhanced Table: `communities`**

```sql
-- Add new columns to existing communities table
ALTER TABLE communities 
ADD COLUMN "community_short_id" TEXT,
ADD COLUMN "plugin_id" TEXT,
ADD COLUMN "community_url" TEXT; -- For future use if needed

-- Create indexes for new fields
CREATE INDEX idx_communities_short_id ON communities(community_short_id);
CREATE INDEX idx_communities_plugin_id ON communities(plugin_id);

-- Optional: Add constraints if these should be unique
-- CREATE UNIQUE INDEX idx_communities_short_id_unique ON communities(community_short_id) WHERE community_short_id IS NOT NULL;
-- CREATE UNIQUE INDEX idx_communities_plugin_id_unique ON communities(plugin_id) WHERE plugin_id IS NOT NULL;
```

## 🏗️ **Implementation Plan**

### **Phase 1: Database Schema Updates**

#### **Step 1.1: Create Migration**
```typescript
// migrations/XXXX_add_user_relationships_and_friends.ts
export async function up(sql: any) {
  // Create user_communities table
  await sql`
    CREATE TABLE user_communities (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      first_visited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_visited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      visit_count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, community_id)
    )
  `;
  
  // Create user_friends table
  await sql`
    CREATE TABLE user_friends (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      friend_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      friend_name TEXT NOT NULL,
      friend_image_url TEXT,
      friendship_status TEXT NOT NULL DEFAULT 'active',
      synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_user_id),
      CHECK(user_id != friend_user_id)
    )
  `;
  
  // Add indexes for user_communities
  await sql`CREATE INDEX idx_user_communities_user_id ON user_communities(user_id)`;
  await sql`CREATE INDEX idx_user_communities_community_id ON user_communities(community_id)`;
  await sql`CREATE INDEX idx_user_communities_last_visited ON user_communities(last_visited_at)`;
  
  // Add indexes for user_friends
  await sql`CREATE INDEX idx_user_friends_user_id ON user_friends(user_id)`;
  await sql`CREATE INDEX idx_user_friends_friend_user_id ON user_friends(friend_user_id)`;
  await sql`CREATE INDEX idx_user_friends_status ON user_friends(friendship_status) WHERE friendship_status = 'active'`;
  
  // Add community enhancements
  await sql`ALTER TABLE communities ADD COLUMN community_short_id TEXT`;
  await sql`ALTER TABLE communities ADD COLUMN plugin_id TEXT`;
  await sql`CREATE INDEX idx_communities_short_id ON communities(community_short_id)`;
  await sql`CREATE INDEX idx_communities_plugin_id ON communities(plugin_id)`;
}
```

#### **Step 1.2: Update TypeScript Interfaces**
```typescript
// types/database.ts
export interface UserCommunity {
  id: number;
  userId: string;
  communityId: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  visitCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserFriend {
  id: number;
  userId: string;
  friendUserId: string;
  friendName: string;
  friendImageUrl?: string;
  friendshipStatus: 'active' | 'removed' | 'blocked';
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedCommunity {
  id: string;
  name: string;
  communityShortId?: string;  // From CG lib
  pluginId?: string;          // From CG lib
  settings: any;
  createdAt: string;
  updatedAt: string;
}
```

### **Phase 2: Session Integration with CG Lib Data**

#### **Step 2.1: Enhanced Session Route with Friends Sync**
```typescript
// app/api/auth/session/route.ts - Enhanced with CG lib integration
export async function POST(req: NextRequest) {
  // ... existing session setup ...

  // 1. Enhanced community upsert with CG lib data
  await query(
    `INSERT INTO communities (id, name, community_short_id, plugin_id, updated_at) 
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE SET 
       name = EXCLUDED.name,
       community_short_id = COALESCE(EXCLUDED.community_short_id, communities.community_short_id),
       plugin_id = COALESCE(EXCLUDED.plugin_id, communities.plugin_id),
       updated_at = NOW()`,
    [communityId, communityName, communityShortId, pluginId]
  );

  // 2. Track user-community relationship
  await query(
    `INSERT INTO user_communities (user_id, community_id, last_visited_at, visit_count)
     VALUES ($1, $2, NOW(), 1)
     ON CONFLICT (user_id, community_id) DO UPDATE SET
       last_visited_at = NOW(),
       visit_count = user_communities.visit_count + 1,
       updated_at = NOW()`,
    [userId, communityId]
  );

  // 3. Schedule friends sync (async background job)
  scheduleFriendsSync(userId);

  // ... rest of session creation ...
}
```

#### **Step 2.2: Friends Sync Service**
```typescript
// lib/friendsSync.ts
export class FriendsSyncService {
  static async syncUserFriends(userId: string): Promise<void> {
    try {
      // This would be called from a background job or cron
      // In practice, we'd need the CG instance which requires active session
      // So this might be triggered from frontend after session establishment
      
      console.log(`[FriendsSync] Starting sync for user ${userId}`);
      
      // Mark sync attempt
      await query(
        `UPDATE users SET updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
      
    } catch (error) {
      console.error(`[FriendsSync] Failed for user ${userId}:`, error);
    }
  }

  static async updateFriendsFromCgLib(
    userId: string, 
    friendsData: UserFriendsResponsePayload
  ): Promise<void> {
    const { friends } = friendsData;
    
    for (const friend of friends) {
      // Upsert friend user record
      await query(
        `INSERT INTO users (user_id, name, profile_picture_url, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           name = EXCLUDED.name,
           profile_picture_url = EXCLUDED.profile_picture_url,
           updated_at = NOW()`,
        [friend.id, friend.name, friend.imageUrl]
      );

      // Upsert friendship relationship
      await query(
        `INSERT INTO user_friends (user_id, friend_user_id, friend_name, friend_image_url, synced_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, friend_user_id) DO UPDATE SET
           friend_name = EXCLUDED.friend_name,
           friend_image_url = EXCLUDED.friend_image_url,
           friendship_status = 'active',
           synced_at = NOW(),
           updated_at = NOW()`,
        [userId, friend.id, friend.name, friend.imageUrl]
      );
    }

    console.log(`[FriendsSync] Updated ${friends.length} friends for user ${userId}`);
  }
}
```

#### **Step 2.3: Frontend Friends Sync Integration**
```typescript
// contexts/AuthContext.tsx - Add friends sync after session
useEffect(() => {
  if (token && cgInstance) {
    // Sync friends data after successful session
    const syncFriends = async () => {
      try {
        const friendsResponse = await cgInstance.getUserFriends(50, 0); // Get first 50 friends
        
        if (friendsResponse?.data) {
          // Send to backend for database sync
          await authFetchJson('/api/me/sync-friends', {
            method: 'POST',
            token,
            body: JSON.stringify(friendsResponse.data)
          });
          
          console.log('[Auth] Friends sync completed');
        }
      } catch (error) {
        console.error('[Auth] Friends sync failed:', error);
      }
    };

    syncFriends();
  }
}, [token, cgInstance]);
```

#### **Step 2.4: Friends Sync API Endpoint**
```typescript
// app/api/me/sync-friends/route.ts
export async function POST(request: NextRequest) {
  const user = await withAuth(request);
  
  try {
    const friendsData: UserFriendsResponsePayload = await request.json();
    
    await FriendsSyncService.updateFriendsFromCgLib(user.userId, friendsData);
    
    return NextResponse.json({ 
      success: true, 
      syncedCount: friendsData.friends.length 
    });
    
  } catch (error) {
    console.error('[FriendsSync] API error:', error);
    return NextResponse.json(
      { error: 'Friends sync failed' },
      { status: 500 }
    );
  }
}
```

### **Phase 3: Enhanced What's New with Friends**

#### **Step 3.1: Cross-Device Activity Tracking**
```typescript
// app/api/me/whats-new/route.ts - Enhanced with friends activity
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const user = await withAuth(request);
  
  // Get user's last visit from persistent storage
  const userCommunityData = await query(
    `SELECT last_visited_at FROM user_communities 
     WHERE user_id = $1 AND community_id = $2`,
    [user.userId, user.communityId]
  );
  
  const previousVisit = userCommunityData.rows[0]?.last_visited_at;
  
  // Enhanced activity with friends filter
  if (type === 'friends_activity') {
    const friendsActivity = await query(`
      SELECT DISTINCT
        p.id as post_id,
        p.title,
        p.content,
        p.created_at,
        p.author_user_id,
        u.name as author_name,
        u.profile_picture_url as author_avatar,
        b.id as board_id,
        b.name as board_name,
        'friend_post' as activity_type,
        CASE WHEN p.created_at > $1 THEN true ELSE false END as is_new
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      JOIN boards b ON p.board_id = b.id
      JOIN user_friends uf ON p.author_user_id = uf.friend_user_id
      WHERE uf.user_id = $2 
        AND uf.friendship_status = 'active'
        AND b.community_id = $3
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [previousVisit || '1970-01-01', user.userId, user.communityId]);
    
    return NextResponse.json({
      activities: friendsActivity.rows,
      crossDevice: true,
      lastVisit: previousVisit
    });
  }
  
  // ... rest of existing What's New logic
}
```

### **Phase 4: URL Generation & Community Services**

#### **Step 4.1: Community Data Service**
```typescript
// lib/communityData.ts
export class CommunityDataService {
  static async getCommunityMetadata(communityId: string) {
    const result = await query(
      `SELECT community_short_id, plugin_id FROM communities WHERE id = $1`,
      [communityId]
    );
    
    return result.rows[0] || null;
  }
  
  static async getCommunitiesForUser(userId: string) {
    const result = await query(
      `SELECT c.*, uc.last_visited_at, uc.visit_count 
       FROM communities c
       JOIN user_communities uc ON c.id = uc.community_id
       WHERE uc.user_id = $1
       ORDER BY uc.last_visited_at DESC`,
      [userId]
    );
    
    return result.rows;
  }

  static async getUserFriends(userId: string, limit = 50, offset = 0) {
    const result = await query(
      `SELECT 
         uf.friend_user_id,
         uf.friend_name,
         uf.friend_image_url,
         uf.synced_at,
         u.name as current_name,
         u.profile_picture_url as current_avatar
       FROM user_friends uf
       LEFT JOIN users u ON uf.friend_user_id = u.user_id
       WHERE uf.user_id = $1 AND uf.friendship_status = 'active'
       ORDER BY uf.friend_name
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  }
}
```

## 🚀 **Benefits & Use Cases**

### **Immediate Benefits:**
1. **Reliable URL Generation**: Share URLs work in all contexts (Telegram, email, etc.)
2. **Cross-Device What's New**: Users see consistent activity across all devices
3. **Friends-Based Features**: Filter posts by friends, friend activity notifications
4. **Community Analytics**: Track user engagement and friendship patterns
5. **Persistent User Context**: Maintain user preferences and social graph

### **Enhanced What's New Features:**
1. **Friends Activity Feed**: "Your friend Alice posted in #general"
2. **Cross-Community Friends**: See friend activity across all communities
3. **Friend-First Notifications**: Prioritize content from friends
4. **Social Discovery**: "3 of your friends are active in this board"

### **Future Opportunities:**
1. **Friend Recommendations**: Suggest mutual friends or similar interests
2. **Social Proof**: "5 friends liked this post"
3. **Collaborative Features**: Friend-based polls, collaborative editing
4. **Social Analytics**: Friendship network analysis, community clustering
5. **Enhanced Gating**: Friend-based access controls ("friends of community members")

## 🔧 **Migration Strategy**

### **Data Migration:**
1. **Backfill User Communities**: Create records from existing session data
2. **Initial Friends Sync**: Trigger friends sync for all active users
3. **Community Metadata**: Populate from next CG lib interactions
4. **Gradual Enhancement**: Fallback to JWT/runtime data until DB populated

### **Backward Compatibility:**
1. **Dual Data Sources**: Check database first, fallback to CG lib if needed
2. **Graceful Degradation**: Features work with partial data
3. **Progressive Enhancement**: New features activate as data becomes available

## 📊 **Implementation Metrics**

### **Success Criteria:**
- [ ] 100% of share URLs work without active user sessions
- [ ] Cross-device "What's New" consistency achieved
- [ ] Friends data sync for 95%+ of active users
- [ ] User-community relationship tracking for all users
- [ ] Zero regression in existing functionality

### **Performance Considerations:**
- Index optimization for friends and community queries
- Efficient friends sync with rate limiting (CG lib allows max 1 navigation per 5 seconds)
- Batch updates during high-traffic periods
- Cached friends data with smart invalidation

## 🎯 **Next Steps**

1. **Review & Approval**: Stakeholder review of enhanced schema
2. **Database Migration**: Create and test comprehensive migration
3. **Phase 1 Implementation**: Basic relationships and friends tables
4. **Phase 2 Integration**: CG lib integration and friends sync
5. **Phase 3 Enhancement**: Friends-based What's New features
6. **Phase 4 URL Generation**: Database-backed URL generation
7. **Testing & Rollout**: Comprehensive testing and gradual rollout

---

## 📝 **Technical Notes**

### **CG Lib Integration Considerations:**
- Friends sync requires active CG lib session (frontend-triggered)
- Rate limiting: CG lib has built-in rate limits (1 navigation per 5 seconds)
- Pagination: Friends API supports `getUserFriends(limit, offset)` for large friend lists
- Error handling: Robust fallbacks when CG lib calls fail

### **Database Considerations:**
- Friends relationships are uni-directional (A knows B ≠ B knows A)
- Soft deletion via `friendship_status` field preserves history
- Regular sync needed to maintain fresh friends data
- Consider friend removal/blocking status from CG lib

### **Security Considerations:**
- Validate CG lib data before database insertion
- Prevent friendship spoofing through proper session validation
- Consider privacy implications of friends list storage
- GDPR compliance for social relationship data 

## 🔗 **Cross-Community Linking Strategy**

### **URL Types & Context**

The application uses **two distinct URL patterns** for different purposes:

1. **External Share URLs** (sharing outside Common Ground):
   - Uses `NEXT_PUBLIC_PLUGIN_BASE_URL` 
   - Example: `https://my-plugin.com/board/123/post/456?token=abc`
   - Purpose: Social media, email, external sharing
   - Includes share tokens, analytics tracking

2. **Common Ground Internal Navigation URLs** (navigating within Common Ground):
   - Uses `COMMON_GROUND_BASE_URL` environment variable  
   - Format: `${COMMON_GROUND_BASE_URL}/c/{communityShortId}/plugin/{pluginId}`
   - Example: `https://app.commonground.wtf/c/commonground/plugin/abc-123`
   - Purpose: Cross-community navigation within Common Ground platform

### **Sidebar Activity Links Requirements**

When displaying cross-community friend activity in the right sidebar, we use **Common Ground Internal Navigation URLs** (like the existing share-redirect route):

#### **Community Name Linking Rules:**
1. **Link Community Names ONLY**: When showing "Your friend Alice posted in **CommonGround**", only link the community name "CommonGround"
2. **Use Common Ground Internal Navigation**: Links go to `${COMMON_GROUND_BASE_URL}/c/{communityShortId}/plugin/{pluginId}` (same pattern as share-redirect route)
3. **No Post/Content Links**: Do NOT link to specific posts/comments in other communities (we can't navigate to them)
4. **Conditional Linking**: Only create links if we have BOTH `community_short_id` AND `plugin_id` in database

#### **Implementation Logic:**
```typescript
// Cross-community activity display logic
interface CrossCommunityActivity {
  friendName: string;
  activityType: 'post' | 'comment' | 'reaction';
  activityTitle: string;        // NOT linkable
  communityId: string;
  communityName: string;
  communityShortId?: string;    // Required for linking
  pluginId?: string;            // Required for linking
}

// Environment configuration
const COMMON_GROUND_BASE_URL = process.env.COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';

// Sidebar rendering logic (matches share-redirect pattern)
const renderCrossCommunityActivity = (activity: CrossCommunityActivity) => {
  const canLinkToCommunity = activity.communityShortId && activity.pluginId;
  
  if (canLinkToCommunity) {
    // Use Common Ground internal navigation URL (same as share-redirect route)
    const communityUrl = `${COMMON_GROUND_BASE_URL}/c/${activity.communityShortId}/plugin/${activity.pluginId}`;
    
    return (
      <div>
        Your friend {activity.friendName} {activity.activityType}ed in{' '}
        <a 
          href={communityUrl} 
          className="text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {activity.communityName}
        </a>
        : "{activity.activityTitle}" {/* NOT a link */}
      </div>
    );
  } else {
    // No link - just text (community metadata incomplete)
    return (
      <div>
        Your friend {activity.friendName} {activity.activityType}ed in{' '}
        <span className="text-gray-600">{activity.communityName}</span>
        : "{activity.activityTitle}"
      </div>
    );
  }
};
```

#### **Database Requirements for Cross-Community Links:**
```sql
-- Enhanced cross-community activity query
SELECT 
  p.title as activity_title,
  p.author_user_id,
  u.name as friend_name,
  b.community_id,
  c.name as community_name,
  c.community_short_id,    -- Required for Common Ground navigation
  c.plugin_id,             -- Required for Common Ground navigation
  'post' as activity_type
FROM posts p
JOIN users u ON p.author_user_id = u.user_id
JOIN boards b ON p.board_id = b.id
JOIN communities c ON b.community_id = c.id
JOIN user_friends uf ON p.author_user_id = uf.friend_user_id
WHERE uf.user_id = $1 
  AND uf.friendship_status = 'active'
  AND b.community_id != $2  -- Cross-community only
ORDER BY p.created_at DESC;
```

#### **Existing Pattern Reference:**
This follows the exact same pattern as the existing `share-redirect` route:

```typescript
// From src/app/api/share-redirect/route.ts (line 53)
const commonGroundBaseUrl = process.env.COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
const commonGroundUrl = `${commonGroundBaseUrl}/c/${communityShortId}/plugin/${pluginId}`;

// Redirect to Common Ground plugin home page
const response = NextResponse.redirect(commonGroundUrl);
```

#### **Graceful Degradation:**
- **Missing pluginId/communityShortId**: Show activity as plain text (no community link)
- **Unknown Communities**: Display "posted in [Unknown Community]" 
- **Link Building Failure**: Fallback to text-only display

#### **User Experience:**
```
✅ Good: "Alice posted in CommonGround: 'New governance proposal'"
                      ^-- Common Ground    ^-- not clickable
                          internal link

❌ Bad:  "Alice posted in CommonGround: 'New governance proposal'"
                      ^-- clickable    ^-- also clickable (broken)
```

### **Environment Variables Required:**
```bash
# For Common Ground internal navigation (sidebar community links)
COMMON_GROUND_BASE_URL=https://app.commonground.wtf

# For external sharing (existing share functionality)  
NEXT_PUBLIC_PLUGIN_BASE_URL=https://my-plugin.com
```

### **Implementation Priority:**
1. **Phase 1**: Store `community_short_id` and `plugin_id` during session creation
2. **Phase 2**: Implement conditional community linking in sidebar using Common Ground internal navigation URLs
3. **Phase 3**: Add fallback handling for communities without complete metadata
4. **Phase 4**: Background job to backfill missing community metadata

--- 