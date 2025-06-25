# Refined Multi-Device Presence Implementation Plan

## 🎯 **Key Discovery: Infrastructure Already Exists!**

After analyzing the codebase, I discovered that we already have the core infrastructure:

✅ **iframeUID is in JWT**: Already stored as `uid` in the JWT payload  
✅ **Socket Authentication**: JWT is decoded and available as `socket.data.user`  
✅ **Unique Device ID**: We can access frameUID via `user.uid`

**Example HTML**: `<iframe src="...?iframeUid=BHJ9ZHALPK&cg_theme=light">`  
**In JWT**: `{ sub: "user123", uid: "BHJ9ZHALPK", ... }`  
**In Socket**: `socket.data.user.uid` → `"BHJ9ZHALPK"`

---

## 🚀 **Simplified Implementation Strategy**

Since the infrastructure exists, we can implement this with **minimal changes** to the existing system:

### **Phase 1: Server-Side Multi-Device Tracking (2-3 days)**

#### **1.1 Enhanced Data Structures**
```typescript
// Add to server.ts after existing UserPresence interface
interface DevicePresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  currentBoardId?: number;
  currentBoardName?: string;
  connectedAt: Date;
  lastSeen: Date;
  socketId: string;
  frameUID: string;           // 🆕 From user.uid
  deviceType: string;         // 🆕 desktop/mobile/tablet
}

// Dual tracking system
const devicePresence = new Map<string, DevicePresence>(); // key: frameUID
const userPresence = new Map<string, UserPresence>();     // key: userId (aggregated)
```

#### **1.2 Device Type Detection Utility**
```typescript
function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
}
```

#### **1.3 Modified Connection Handler**
```typescript
// In io.on('connection', ...) - REPLACE existing presence logic
const user = socket.data.user;
const frameUID = user.uid; // 🎯 Already available from JWT!

if (!frameUID) {
  console.warn(`[Socket.IO] No frameUID for user ${user.sub}`);
  return;
}

// Create device-specific presence
const deviceInfo: DevicePresence = {
  userId: user.sub,
  userName: user.name || 'Unknown',
  avatarUrl: user.picture || undefined,
  communityId: user.cid || 'unknown',
  frameUID: frameUID,
  socketId: socket.id,
  connectedAt: new Date(),
  lastSeen: new Date(),
  deviceType: detectDeviceType(socket.handshake.headers['user-agent'] || ''),
  currentBoardId: undefined,
  currentBoardName: undefined
};

// Store device presence
devicePresence.set(frameUID, deviceInfo);

// Aggregate user presence from all devices
const userDevices = Array.from(devicePresence.values())
  .filter(d => d.userId === user.sub);

const aggregatedUser: UserPresence = {
  userId: user.sub,
  userName: user.name || 'Unknown',
  avatarUrl: user.picture || undefined,
  communityId: user.cid || 'unknown',
  devices: userDevices,           // 🆕 Include all devices
  totalDevices: userDevices.length, // 🆕 Device count
  isOnline: true,
  lastSeen: new Date(),
  socketId: socket.id // Keep for backward compatibility
};

userPresence.set(user.sub, aggregatedUser);
```

#### **1.4 Enhanced Disconnect Cleanup**
```typescript
socket.on('disconnect', (reason) => {
  const frameUID = user.uid;
  
  // Remove this specific device
  devicePresence.delete(frameUID);
  
  // Recalculate user presence
  const remainingDevices = Array.from(devicePresence.values())
    .filter(d => d.userId === user.sub);
  
  if (remainingDevices.length > 0) {
    // User still online on other devices
    const updatedUser: UserPresence = {
      ...userPresence.get(user.sub),
      devices: remainingDevices,
      totalDevices: remainingDevices.length,
      lastSeen: Math.max(...remainingDevices.map(d => d.lastSeen.getTime()))
    };
    userPresence.set(user.sub, updatedUser);
    
    broadcastEvent({
      eventName: 'userPresenceUpdate',
      payload: { userPresence: updatedUser }
    });
  } else {
    // User completely offline
    userPresence.delete(user.sub);
    broadcastEvent({
      eventName: 'userOffline', 
      payload: { userId: user.sub }
    });
  }
});
```

### **Phase 2: Client-Side Integration (1-2 days)**

#### **2.1 Enhanced SocketContext Types**
```typescript
// Add to SocketContext.tsx
interface DevicePresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  currentBoardId?: number;
  currentBoardName?: string;
  connectedAt: Date;
  lastSeen: Date;
  socketId: string;
  frameUID: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

interface EnhancedUserPresence extends OnlineUser {
  devices: DevicePresence[];
  totalDevices: number;
  isOnline: boolean;
}
```

#### **2.2 Event Handler Updates**
```typescript
// In SocketContext useEffect, REPLACE existing presence handlers
newSocket.on('userPresenceUpdate', ({ userPresence }: { userPresence: EnhancedUserPresence }) => {
  setGlobalOnlineUsers(prev => {
    const filtered = prev.filter(u => u.userId !== userPresence.userId);
    return [...filtered, userPresence];
  });
});

newSocket.on('globalPresenceSync', (users: EnhancedUserPresence[]) => {
  setGlobalOnlineUsers(users);
});
```

### **Phase 3: UI Enhancement (2-3 days)**

#### **3.1 Device-Aware User Cards**
```tsx
// Enhanced OnlineUsersSidebar.tsx
function UserPresenceCard({ user }: { user: EnhancedUserPresence }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback>{user.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium truncate">{user.userName}</span>
              
              {/* Multi-device indicator */}
              {user.totalDevices > 1 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer"
                  onClick={() => setExpanded(!expanded)}
                >
                  {user.totalDevices} devices
                </Badge>
              )}
            </div>
            
            {/* Single device or collapsed view */}
            {!expanded && (
              <DeviceSummary devices={user.devices} />
            )}
          </div>
          
          {/* Expand/collapse button for multi-device users */}
          {user.totalDevices > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                expanded && "rotate-180"
              )} />
            </Button>
          )}
        </div>
        
        {/* Expanded device list */}
        {expanded && user.totalDevices > 1 && (
          <div className="mt-3 space-y-2 pl-11">
            {user.devices.map(device => (
              <DevicePresenceItem key={device.frameUID} device={device} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### **3.2 Device Summary Component**
```tsx
function DeviceSummary({ devices }: { devices: DevicePresence[] }) {
  if (devices.length === 1) {
    return <DevicePresenceItem device={devices[0]} compact />;
  }
  
  // Multiple devices - show summary
  const deviceTypes = devices.reduce((acc, device) => {
    acc[device.deviceType] = (acc[device.deviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
      {Object.entries(deviceTypes).map(([type, count]) => (
        <span key={type} className="flex items-center space-x-1">
          <span>{getDeviceIcon(type)}</span>
          {count > 1 && <span>{count}</span>}
        </span>
      ))}
    </div>
  );
}
```

#### **3.3 Individual Device Component**
```tsx
function DevicePresenceItem({ device, compact = false }: { 
  device: DevicePresence; 
  compact?: boolean;
}) {
  const deviceIcon = getDeviceIcon(device.deviceType);
  
  return (
    <div className={cn(
      "flex items-center space-x-2 text-xs text-muted-foreground",
      compact && "text-xs"
    )}>
      <span className="text-sm">{deviceIcon}</span>
      {!compact && <span className="capitalize">{device.deviceType}</span>}
      
      {device.currentBoardName && (
        <>
          <span>•</span>
          <span className="truncate">
            {compact ? device.currentBoardName : `viewing ${device.currentBoardName}`}
          </span>
        </>
      )}
    </div>
  );
}

function getDeviceIcon(deviceType: string): string {
  switch (deviceType) {
    case 'mobile': return '📱';
    case 'tablet': return '📊'; 
    case 'desktop': return '💻';
    default: return '🖥️';
  }
}
```

---

## 🎨 **UI Design Philosophy**

### **Progressive Disclosure**
- **Single Device**: Show device type + current board
- **Multiple Devices**: Show device count badge + summary
- **Expanded View**: Full device list with individual contexts

### **Visual Hierarchy**
```
👤 John Smith (2 devices)              ← User name + device count
   📱 Mobile • viewing Board A          ← Device 1 when expanded  
   💻 Desktop • viewing Board B         ← Device 2 when expanded
```

### **Interaction States**
- **Hover**: Highlight user card
- **Click Badge**: Expand/collapse device list
- **Click Device**: Navigate to that board (future enhancement)

---

## 📋 **Implementation Checklist**

### **Week 1: Backend Infrastructure**
- [ ] Add DevicePresence interface and dual tracking maps
- [ ] Implement device type detection utility
- [ ] Modify socket connection handler to use frameUID from JWT
- [ ] Update disconnect cleanup logic for multi-device support
- [ ] Test with multiple browser tabs/devices

### **Week 2: Frontend Integration**  
- [ ] Update SocketContext types and event handlers
- [ ] Create enhanced UserPresenceCard component
- [ ] Implement DeviceSummary and DevicePresenceItem components
- [ ] Add expand/collapse functionality for multi-device users
- [ ] Test UI responsiveness across device types

### **Week 3: Polish & Testing**
- [ ] Refine UI animations and transitions
- [ ] Add keyboard navigation support
- [ ] Implement comprehensive error handling
- [ ] Performance testing with multiple devices
- [ ] User testing and feedback collection

---

## 🎯 **Success Metrics**

### **Technical Validation**
- [ ] Multiple tabs from same user show as separate devices
- [ ] Device type detection works correctly
- [ ] Board context updates in real-time per device
- [ ] Clean disconnect handling (no phantom devices)

### **UX Validation**
- [ ] Users can easily see multi-device presence
- [ ] Device information is useful, not overwhelming
- [ ] Smooth expand/collapse interactions
- [ ] Clear visual distinction between device types

### **Business Value**
- [ ] Enhanced collaboration awareness
- [ ] Improved meeting coordination 
- [ ] Better understanding of user engagement patterns
- [ ] Foundation for future cross-device features

---

## 🚀 **Next Steps**

**Immediate Action**: Start with Phase 1 backend changes since we have all the infrastructure needed.

**Key Advantage**: Since `iframeUID` is already in our JWT as `user.uid`, we can implement this **without any auth flow changes** - just modify the presence tracking logic.

**Risk Mitigation**: Keep existing presence system running in parallel during development to ensure no disruption to current users.

This refined plan leverages our existing infrastructure for a much simpler implementation path while delivering the full vision of multi-device presence awareness! 