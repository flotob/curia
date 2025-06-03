# Multi-Device Presence Enhancement Research & Implementation Plan

## 🎯 **Executive Summary**

**Current State**: Our socket.io presence system tracks users by their Common Ground `userId`, treating multiple browser tabs/devices as a single presence.

**Opportunity**: Use the unique `frameUID` from Common Ground's plugin iframe container to distinguish between multiple devices/tabs per user, enabling rich multi-device presence visualization.

**Vision**: Users can see "John is online on 2 devices: viewing Board A on desktop, Board B on mobile"

---

## 🔍 **Current Architecture Analysis**

### **Presence Data Structure (Current)**
```typescript
interface UserPresence {
  userId: string;           // Common Ground user ID (same across all devices)
  userName: string;
  avatarUrl?: string;
  communityId: string;
  currentBoardId?: number;
  currentBoardName?: string;
  connectedAt: Date;
  lastSeen: Date;
  socketId: string;         // Socket.IO socket ID (changes per connection)
}
```

### **Key Limitation**
- **Single Presence Per User**: `globalPresence.set(user.sub, userPresence)` overwrites previous connections
- **No Device Distinction**: User with 3 open tabs appears as single presence
- **Lost Context**: Can't see what different devices are viewing

### **Current Flow**
```
User A opens Tab 1 → UserPresence { userId: "A", boardId: 5 }
User A opens Tab 2 → UserPresence { userId: "A", boardId: 3 } ← OVERWRITES Tab 1
Tab 1 data is lost!
```

---

## 🚀 **Enhanced Multi-Device Architecture**

### **New Presence Data Structure**
```typescript
interface DevicePresence {
  userId: string;               // Common Ground user ID
  userName: string;
  avatarUrl?: string;
  communityId: string;
  currentBoardId?: number;
  currentBoardName?: string;
  connectedAt: Date;
  lastSeen: Date;
  socketId: string;
  frameUID: string;             // 🆕 Unique iframe identifier
  deviceType?: 'desktop' | 'mobile' | 'tablet';  // 🆕 Device classification
  userAgent?: string;           // 🆕 For device detection
}

interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  devices: DevicePresence[];    // 🆕 Array of active devices
  totalDevices: number;         // 🆕 Computed field
  isOnline: boolean;            // 🆕 True if any device is online
  lastSeen: Date;               // 🆕 Most recent activity across all devices
}
```

### **Enhanced Flow**
```
User A opens Tab 1 → DevicePresence { frameUID: "ABC123", boardId: 5 }
User A opens Tab 2 → DevicePresence { frameUID: "XYZ789", boardId: 3 }
Result: UserPresence { 
  userId: "A", 
  devices: [
    { frameUID: "ABC123", boardId: 5 },
    { frameUID: "XYZ789", boardId: 3 }
  ]
}
```

---

## 🛠 **Implementation Plan**

### **Phase 1: Data Structure Migration**

#### **Server-Side Changes (server.ts)**
```typescript
// Current: Map<userId, UserPresence>
const globalPresence = new Map<string, UserPresence>();

// Enhanced: Track devices separately + aggregate user view
const devicePresence = new Map<string, DevicePresence>(); // key: frameUID
const userPresence = new Map<string, UserPresence>();     // key: userId

// Helper function to aggregate user presence from devices
function aggregateUserPresence(userId: string): UserPresence {
  const userDevices = Array.from(devicePresence.values())
    .filter(device => device.userId === userId);
  
  if (userDevices.length === 0) {
    userPresence.delete(userId);
    return null;
  }

  const mostRecent = userDevices.reduce((latest, current) => 
    current.lastSeen > latest.lastSeen ? current : latest
  );

  return {
    userId,
    userName: mostRecent.userName,
    avatarUrl: mostRecent.avatarUrl,
    communityId: mostRecent.communityId,
    devices: userDevices,
    totalDevices: userDevices.length,
    isOnline: true,
    lastSeen: mostRecent.lastSeen
  };
}
```

#### **Socket Connection Handler Updates**
```typescript
io.on('connection', (socket: AuthenticatedSocket) => {
  const user = socket.data.user;
  const frameUID = socket.handshake.auth.frameUID; // 🆕 Extract from auth
  
  // Create device-specific presence
  const devicePresence: DevicePresence = {
    userId: user.sub,
    userName: user.name || 'Unknown',
    avatarUrl: user.picture || undefined,
    communityId: user.cid || 'unknown',
    frameUID: frameUID,
    socketId: socket.id,
    connectedAt: new Date(),
    lastSeen: new Date(),
    deviceType: detectDeviceType(socket.handshake.headers['user-agent']),
    userAgent: socket.handshake.headers['user-agent']
  };
  
  // Store device presence
  devicePresence.set(frameUID, devicePresence);
  
  // Aggregate and update user presence
  const aggregatedUser = aggregateUserPresence(user.sub);
  userPresence.set(user.sub, aggregatedUser);
  
  // Broadcast enhanced presence
  broadcastEvent({
    eventName: 'userPresenceUpdate',
    payload: { userPresence: aggregatedUser },
    config: { globalRoom: true, specificRooms: [], invalidateForAllUsers: false }
  });
});
```

### **Phase 2: Client-Side Integration**

#### **SocketContext Enhancement**
```typescript
// Enhanced context to include frameUID
const { iframeUid } = useCgLib();

// Include frameUID in socket auth
useEffect(() => {
  const newSocket = io(socketUrl, {
    transports: ['websocket'],
    auth: {
      token: token,
      frameUID: iframeUid  // 🆕 Pass frameUID to server
    }
  });
}, [token, iframeUid]);

// Enhanced state management
const [userPresenceMap, setUserPresenceMap] = useState<Map<string, UserPresence>>(new Map());

// Event handlers for multi-device presence
newSocket.on('userPresenceUpdate', ({ userPresence }: { userPresence: UserPresence }) => {
  setUserPresenceMap(prev => {
    const updated = new Map(prev);
    updated.set(userPresence.userId, userPresence);
    return updated;
  });
});
```

### **Phase 3: UI Enhancements**

#### **Enhanced OnlineUsersSidebar**
```tsx
export function OnlineUsersSidebar() {
  const { userPresenceMap } = useSocket();
  
  return (
    <div className="space-y-4">
      {Array.from(userPresenceMap.values()).map(user => (
        <UserPresenceCard key={user.userId} user={user} />
      ))}
    </div>
  );
}

function UserPresenceCard({ user }: { user: UserPresence }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback>{user.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{user.userName}</span>
              {user.totalDevices > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {user.totalDevices} devices
                </Badge>
              )}
            </div>
            
            {/* Device-specific information */}
            <div className="space-y-1 mt-2">
              {user.devices.map(device => (
                <DevicePresenceItem key={device.frameUID} device={device} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DevicePresenceItem({ device }: { device: DevicePresence }) {
  const deviceIcon = device.deviceType === 'mobile' ? '📱' : 
                    device.deviceType === 'tablet' ? '📊' : '💻';
  
  return (
    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
      <span>{deviceIcon}</span>
      <span>{device.deviceType}</span>
      {device.currentBoardName && (
        <>
          <span>•</span>
          <span>viewing {device.currentBoardName}</span>
        </>
      )}
    </div>
  );
}
```

---

## 🔧 **Technical Implementation Details**

### **Device Type Detection**
```typescript
function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase();
  
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
}
```

### **FrameUID Authentication**
```typescript
// In socket middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const frameUID = socket.handshake.auth.frameUID;
  
  if (!frameUID) {
    return next(new Error('frameUID required'));
  }
  
  // Verify token and attach user data
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.data.user = decoded;
    socket.data.frameUID = frameUID;
    next();
  });
});
```

### **Memory Management**
```typescript
// Enhanced cleanup on disconnect
socket.on('disconnect', () => {
  const frameUID = socket.data.frameUID;
  const userId = socket.data.user.sub;
  
  // Remove device presence
  devicePresence.delete(frameUID);
  
  // Recalculate user presence
  const updatedUser = aggregateUserPresence(userId);
  if (updatedUser) {
    userPresence.set(userId, updatedUser);
    broadcastEvent({
      eventName: 'userPresenceUpdate',
      payload: { userPresence: updatedUser }
    });
  } else {
    // User completely offline
    userPresence.delete(userId);
    broadcastEvent({
      eventName: 'userOffline',
      payload: { userId }
    });
  }
});
```

---

## 📊 **Benefits & Use Cases**

### **Enhanced Collaboration Awareness**
- **Multi-tasking Visibility**: See when users are active across multiple boards
- **Device Context**: Know if someone is on mobile (might have limited input) vs desktop
- **Real-time Coordination**: "John is viewing the same board on 2 devices - probably presenting"

### **Improved UX Scenarios**
1. **Meeting Coordination**: "5 people viewing Board A, 3 on mobile (probably in meeting room)"
2. **Cross-device Workflows**: User researching on tablet while writing on desktop
3. **Admin Oversight**: Moderators can see user engagement patterns across devices

### **Analytics Opportunities**
- **Device Usage Patterns**: Which boards are more popular on mobile vs desktop?
- **Multi-device Usage**: How often do users use multiple devices simultaneously?
- **Engagement Metrics**: Device-specific activity duration and patterns

---

## ⚠️ **Challenges & Considerations**

### **Privacy Concerns**
- **Device Tracking**: Users might feel uncomfortable with device-level tracking
- **Solution**: Add privacy settings to control device visibility granularity

### **Performance Impact**
- **Increased Data**: More presence events and larger payload sizes
- **Solution**: Implement presence aggregation debouncing and selective updates

### **Edge Cases**
- **Duplicate FrameUIDs**: Unlikely but possible in edge cases
- **Solution**: Fallback to `${frameUID}-${socketId}` composite keys

### **UI Complexity**
- **Information Overload**: Too much device info might clutter the sidebar
- **Solution**: Progressive disclosure - show device count, expand for details

---

## 🚀 **Implementation Roadmap**

### **Sprint 1: Core Infrastructure (1 week)**
- [ ] Enhance server-side presence data structures
- [ ] Update socket connection handlers to use frameUID
- [ ] Implement device type detection
- [ ] Add frameUID to client socket auth

### **Sprint 2: Backend Logic (1 week)**  
- [ ] Device presence aggregation logic
- [ ] Enhanced event broadcasting for multi-device updates
- [ ] Memory management and cleanup procedures
- [ ] API endpoints for presence debugging

### **Sprint 3: Frontend Integration (1 week)**
- [ ] Update SocketContext for multi-device presence
- [ ] Enhanced OnlineUsersSidebar with device visualization
- [ ] Device-specific UI components and icons
- [ ] Responsive design for mobile vs desktop views

### **Sprint 4: Polish & Optimization (1 week)**
- [ ] Performance optimization and debouncing
- [ ] Error handling and edge case management
- [ ] User privacy controls and settings
- [ ] Documentation and testing

---

## 🎯 **Success Metrics**

### **Technical Metrics**
- **Presence Accuracy**: 99%+ device presence detection accuracy
- **Performance**: <100ms presence update latency
- **Memory Usage**: <10MB additional server memory for 1000 concurrent devices

### **User Experience Metrics**
- **Collaboration Awareness**: User reports of improved team coordination
- **Feature Adoption**: >50% of users actively viewing device-specific presence
- **User Satisfaction**: Positive feedback on multi-device visibility

### **Business Value**
- **Engagement**: Increased average session duration due to better collaboration
- **Platform Stickiness**: Users find unique value in multi-device awareness
- **Analytics Insights**: Actionable data on device usage patterns

---

## 🔮 **Future Enhancements**

### **Advanced Device Intelligence**
- **Cross-device Handoff**: "Continue reading this post on your phone"
- **Smart Notifications**: Route notifications to the most active device
- **Synchronized Cursors**: See what other users are looking at in real-time

### **Presence-based Features**
- **Device-aware UI**: Different interface optimizations per device type
- **Collaboration Tools**: Device-specific role assignments (presenter, note-taker)
- **Meeting Mode**: Automatic board sharing across user's devices

This multi-device presence enhancement transforms our basic "who's online" feature into a rich, contextual collaboration awareness system that leverages the unique capabilities of Common Ground's iframe architecture. 