# Multi-Device Presence: UX Strategy & User Awareness

## 🎯 **The Core UX Question**

**Current State**: "John Smith viewing Board A"  
**Multi-Device Reality**: John has desktop on Board A + mobile on Board B  
**Question**: How do we display this to other users?

---

## 🎨 **Three UX Strategies**

### **Option 1: User-Centric Aggregation** ⭐ **RECOMMENDED**
```
👤 John Smith (2 devices)
   └── 💻 Desktop → Board A: General Discussion  
   └── 📱 Mobile → Board B: Product Ideas

👤 Alice Johnson  
   └── 💻 Desktop → Board A: General Discussion

👤 Bob Wilson (3 devices)
   └── 💻 Desktop → Board C: Support
   └── 📱 Mobile → Board A: General Discussion  
   └── 🖥️ Tablet → Board B: Product Ideas
```

**Pros:**
- ✅ Clean UI - no duplicate user names
- ✅ Clear user identity maintained  
- ✅ Rich context - see user's full activity
- ✅ Scales well with many devices
- ✅ Natural "expand to see details" UX

**Cons:**
- ⚠️ More complex state management
- ⚠️ Requires aggregation logic
- ⚠️ Slightly more implementation work

### **Option 2: Device-Centric Separation**
```
👤 John Smith (Desktop) → Board A  
📱 John Smith (Mobile) → Board B
👤 Alice Johnson (Desktop) → Board A
💻 Bob Wilson (Desktop) → Board C
📱 Bob Wilson (Mobile) → Board A
🖥️ Bob Wilson (Tablet) → Board B
```

**Pros:**
- ✅ Simple implementation - each device = separate entry
- ✅ No aggregation logic needed
- ✅ Easy to understand technically

**Cons:**
- ❌ Confusing UI with duplicate names
- ❌ Cluttered sidebar with heavy users  
- ❌ Hard to get unified view of a user
- ❌ Doesn't scale well

### **Option 3: Smart Hybrid** 
```
👤 John Smith 💻📱 → Viewing 2 boards
👤 Alice Johnson 💻 → Board A  
👤 Bob Wilson 💻📱🖥️ → Viewing 3 boards
```

**Pros:**
- ✅ Compact display
- ✅ Visual device indicators
- ✅ Clean when collapsed

**Cons:**
- ⚠️ Less informative at a glance
- ⚠️ Requires hover/click for details
- ⚠️ Device icons might be unclear

---

## 🧠 **User Mental Models**

### **"I want to see WHO is online"**
Users primarily think in terms of **people**, not devices. When someone asks "Is John online?", they mean "Can I reach John?" - not "Which specific device is John using?"

### **"I want to know WHERE people are"**
The secondary question is "What is John doing?" - are they actively participating in my board, or are they elsewhere?

### **"I want to understand availability"**
Multi-device presence actually indicates **higher availability** - John is "really online" if he's connected from multiple devices.

---

## 📊 **UX Impact Analysis**

### **Cognitive Load**
- **Option 1**: Lowest - clean user list, expandable details
- **Option 2**: Highest - must mentally deduplicate users
- **Option 3**: Medium - requires learning device icons

### **Information Density**
- **Option 1**: High when expanded, clean when collapsed
- **Option 2**: Very high - potentially cluttered
- **Option 3**: Medium - compact but less detailed

### **Discoverability**
- **Option 1**: Progressive disclosure - expand for details
- **Option 2**: Everything visible immediately
- **Option 3**: Hidden details require interaction

---

## 🎯 **Recommended Implementation: User-Centric Aggregation**

### **Why This Choice?**

1. **Aligns with User Mental Models**: People think about "Who is online", not "which devices are online"

2. **Scalable UX**: Works whether users have 1 device or 10 devices

3. **Progressive Disclosure**: Show high-level info by default, details on demand

4. **Rich Context**: Users can see the full scope of someone's activity

### **Detailed UX Specification**

#### **Collapsed State (Default)**
```typescript
interface UserPresenceDisplay {
  userName: "John Smith"
  deviceCount: 2
  isOnline: true
  primaryBoard: "Board A: General Discussion"  // Most recently active
  deviceIndicators: ["💻", "📱"]
  lastSeen: "2 minutes ago"
}
```

**Visual Design:**
```
┌─────────────────────────────────────┐
│ 👤 John Smith                  2️⃣💻📱 │
│    📋 Board A: General Discussion   │
│    🟢 Active 2 min ago              │
└─────────────────────────────────────┘
```

#### **Expanded State (On Click/Hover)**
```
┌─────────────────────────────────────┐
│ 👤 John Smith                  2️⃣💻📱 │
│                                     │
│ 💻 Desktop (Primary)                │
│    📋 Board A: General Discussion   │
│    ⌨️ Last active: 30 sec ago       │
│                                     │
│ 📱 Mobile                           │
│    📋 Board B: Product Ideas        │
│    👀 Viewing: 2 min ago            │
│                                     │
│ 🟢 Overall: Online since 10:30 AM   │
└─────────────────────────────────────┘
```

### **Device Priority Rules**
1. **Primary Device**: Most recently active device
2. **Board Display**: Show primary device's current board in collapsed view
3. **Activity Status**: Aggregate across all devices - "Active" if ANY device is active

### **Interaction Design**
- **Click User Card**: Expand/collapse device details
- **Click Board Name**: Navigate to that board
- **Hover Device Icon**: Tooltip with device type and activity
- **Long Press (Mobile)**: Quick actions menu

---

## 🔧 **Implementation Strategy**

### **Data Structure Evolution**
```typescript
// Current (Single Device)
interface OnlineUser {
  userId: string;
  userName: string;
  avatarUrl?: string;
  currentBoardId?: number;
  currentBoardName?: string;
}

// Enhanced (Multi-Device Aware)
interface EnhancedUserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  devices: DevicePresence[];
  totalDevices: number;
  isOnline: boolean;
  primaryDevice: DevicePresence;  // Most active device
  lastSeen: Date;                 // Across all devices
}

interface DevicePresence {
  frameUID: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  currentBoardId?: number;
  currentBoardName?: string;
  connectedAt: Date;
  lastSeen: Date;
  socketId: string;
  isActive: boolean;  // Active in last 30 seconds
}
```

### **Component Architecture**
```tsx
// Enhanced OnlineUsersSidebar
export function OnlineUsersSidebar() {
  const { enhancedUserPresence } = useSocket();
  
  return (
    <div className="space-y-2">
      {enhancedUserPresence.map(user => (
        <UserPresenceCard 
          key={user.userId} 
          user={user} 
          expandable={user.totalDevices > 1}
        />
      ))}
    </div>
  );
}

// New component for individual user cards
function UserPresenceCard({ user, expandable }: UserPresenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent 
        className="p-3 cursor-pointer" 
        onClick={() => expandable && setExpanded(!expanded)}
      >
        {/* Collapsed view */}
        <UserSummaryView user={user} />
        
        {/* Expanded device details */}
        {expanded && (
          <DeviceDetailsView devices={user.devices} />
        )}
      </CardContent>
    </Card>
  );
}
```

### **Server-Side Aggregation**
```typescript
// Server: Aggregate devices into user presence
function aggregateUserPresence(userId: string): EnhancedUserPresence {
  const userDevices = Array.from(devicePresence.values())
    .filter(device => device.userId === userId);
  
  if (userDevices.length === 0) return null;
  
  // Find primary device (most recently active)
  const primaryDevice = userDevices.reduce((primary, device) => 
    device.lastSeen > primary.lastSeen ? device : primary
  );
  
  return {
    userId,
    userName: primaryDevice.userName,
    avatarUrl: primaryDevice.avatarUrl,
    devices: userDevices.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()),
    totalDevices: userDevices.length,
    isOnline: userDevices.some(d => d.isActive),
    primaryDevice,
    lastSeen: new Date(Math.max(...userDevices.map(d => d.lastSeen.getTime())))
  };
}
```

---

## 🎨 **Visual Design Principles**

### **Hierarchy**
1. **User Identity** (name, avatar) - Primary
2. **Device Count + Icons** - Secondary  
3. **Current Activity** (board) - Tertiary
4. **Detailed Device Info** - On-demand

### **Progressive Disclosure**
- **Glance**: Who's online, how many devices
- **Focus**: What are they doing (primary activity)
- **Details**: Full device breakdown

### **Visual Cues**
- **Device Icons**: 💻 Desktop, 📱 Mobile, 🖥️ Tablet
- **Activity Indicators**: 🟢 Active, 🟡 Idle, ⚫ Away
- **Count Badges**: Numbers for device count
- **Board Links**: Clickable, colored differently

---

## ✅ **Next Steps**

1. **Validate Strategy**: Confirm user-centric aggregation approach
2. **Design System**: Create visual components for device indicators
3. **Implement Data Structures**: Enhance server-side presence tracking
4. **Build UI Components**: Progressive disclosure user cards
5. **Test & Iterate**: Validate with real usage patterns

**This strategy provides a clear, scalable, and user-friendly approach to multi-device presence that maintains user identity while providing rich context about device usage.** 