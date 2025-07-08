# Telegram Community Settings Enhancement Roadmap

## Executive Summary

**Goal**: Enhance the community settings page with comprehensive Telegram group management, real-time updates via React Query polling, and a subtle admin banner system to increase Telegram integration adoption.

**Key Features**:
1. **Connected Groups Display** - List all registered Telegram groups for a community
2. **Real-time Updates** - 3-second polling when community settings page is open
3. **Admin Banner System** - Encourage Telegram setup for communities without connected groups

## Current State Analysis

### ✅ **Existing Infrastructure**
- **Community Settings Page**: `/community-settings` with admin access control
- **Telegram Groups Database**: `telegram_groups` table with complete schema
- **TelegramService**: `getGroupsByCommunity()` method already available
- **Admin Detection**: `user.isAdmin` and `NEXT_PUBLIC_SUPERADMIN_ID` environment variable
- **React Query Setup**: Global configuration with 5min staleTime, 30min gcTime
- **UI Components**: shadcn/ui with consistent theming and card layouts
- **Toast System**: `useToast` hook for user feedback

### 📊 **Database Schema (Available)**
```sql
CREATE TABLE telegram_groups (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  chat_title TEXT NOT NULL,
  community_id TEXT REFERENCES communities(id) ON DELETE CASCADE,
  registered_by_user_id TEXT NOT NULL,
  notification_settings JSONB DEFAULT '{}' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  bot_permissions JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 🎯 **Admin Detection Logic (Available)**
```typescript
// From community-settings page
if (user && !user.isAdmin && user.userId !== process.env.NEXT_PUBLIC_SUPERADMIN_ID) {
  // Access denied logic
}
```

## Implementation Roadmap

### **Phase 1: API Foundation** (30 minutes)

#### **Step 1.1: Create Telegram Groups API Route**
- **File**: `src/app/api/telegram/groups/route.ts`
- **Purpose**: Fetch connected groups for community with proper admin access control
- **Methods**: 
  - `GET` - List groups for authenticated admin
  - Optional `DELETE` - Remove group registration (for admin management)

```typescript
// /api/telegram/groups
export async function GET(req: NextRequest) {
  // Extract community ID from user token
  // Validate admin access
  // Call telegramService.getGroupsByCommunity()
  // Return formatted group list with metadata
}
```

#### **Step 1.2: Extend Community API** 
- **File**: `src/app/api/communities/[communityId]/route.ts`
- **Purpose**: Include Telegram group count in community data
- **Enhancement**: Add `telegram_groups_count` field for banner logic

### **Phase 2: Community Settings Enhancement** (45 minutes)

#### **Step 2.1: Create TelegramGroupsSection Component**
- **File**: `src/components/settings/TelegramGroupsSection.tsx`
- **Features**:
  - Display connected groups in card format
  - Real-time polling (3s interval when page active)
  - Group registration instructions
  - Individual group management (notification settings)
  - Empty state with clear call-to-action

```typescript
interface TelegramGroup {
  id: number;
  chat_id: string;
  chat_title: string;
  registered_by_user_id: string;
  notification_settings: {
    enabled: boolean;
    events: string[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function TelegramGroupsSection({ communityId }: { communityId: string }) {
  // React Query with 3s polling
  // Group list rendering
  // Registration instructions modal
}
```

#### **Step 2.2: Integrate into Community Settings Page**
- **File**: `src/app/community-settings/page.tsx`
- **Integration**: Add new section below "Plugin Access Control"
- **Layout**: Full-width card in existing grid system

### **Phase 3: React Query Real-time Updates** (20 minutes)

#### **Step 3.1: Implement Polling Strategy**
```typescript
const { data: telegramGroups, refetch } = useQuery({
  queryKey: ['telegramGroups', user?.cid],
  queryFn: async () => {
    const response = await authFetchJson<TelegramGroup[]>('/api/telegram/groups', { token });
    return response;
  },
  enabled: !!user?.cid && !!token && user.isAdmin,
  refetchInterval: 3000, // 3 seconds when page is active
  refetchIntervalInBackground: false, // Stop polling when tab inactive
  staleTime: 1000, // Keep data fresh
});
```

#### **Step 3.2: Optimistic Updates**
- Invalidate queries when users register new groups
- Show loading states during updates
- Toast notifications for successful group additions

### **Phase 4: Admin Banner System** (45 minutes)

#### **Step 4.1: Create TelegramSetupBanner Component**
- **File**: `src/components/banners/TelegramSetupBanner.tsx`
- **Features**:
  - Subtle design matching existing UI
  - Dismissible with localStorage persistence
  - Direct link to community settings
  - Admin-only visibility

```typescript
export function TelegramSetupBanner({ 
  communityId, 
  hasConnectedGroups 
}: { 
  communityId: string; 
  hasConnectedGroups: boolean; 
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  useEffect(() => {
    const dismissed = localStorage.getItem(`telegram-banner-dismissed-${communityId}`);
    setIsDismissed(dismissed === 'true');
  }, [communityId]);

  // Only show if no connected groups and not dismissed
  if (hasConnectedGroups || isDismissed) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
      {/* Banner content with dismiss button */}
    </div>
  );
}
```

#### **Step 4.2: Integrate Banner into Main Layout**
- **File**: `src/app/page.tsx` (main forum page)
- **Placement**: Below header, above feed
- **Logic**: Show only to admins of communities without Telegram groups

#### **Step 4.3: LocalStorage Banner Management**
```typescript
// Utility functions
export const TelegramBannerUtils = {
  isDismissed: (communityId: string): boolean => {
    return localStorage.getItem(`telegram-banner-dismissed-${communityId}`) === 'true';
  },
  
  dismiss: (communityId: string): void => {
    localStorage.setItem(`telegram-banner-dismissed-${communityId}`, 'true');
  },
  
  reset: (communityId: string): void => {
    localStorage.removeItem(`telegram-banner-dismissed-${communityId}`);
  }
};
```

## Detailed Component Specifications

### **TelegramGroupsSection Component**

#### **UI Layout**
```tsx
<Card className="lg:col-span-2">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MessageSquare size={20} />
      Telegram Notifications
    </CardTitle>
    <CardDescription>
      Manage Telegram groups receiving forum notifications
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Connected Groups List */}
    {/* Registration Instructions */}
    {/* Empty State */}
  </CardContent>
</Card>
```

#### **Features Matrix**
| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Group List** | Display connected groups with metadata | Map over `telegramGroups` array |
| **Real-time Updates** | 3s polling when page active | React Query `refetchInterval: 3000` |
| **Registration Status** | Show active/inactive groups | Color-coded badges |
| **Last Updated** | Show when group was registered | `useTimeSince` hook |
| **Quick Actions** | Test notification, view settings | Dropdown menu per group |
| **Empty State** | Encourage first group setup | Call-to-action with instructions |

### **TelegramSetupBanner Component**

#### **Design Specification**
- **Style**: Subtle blue accent, not intrusive
- **Content**: "Set up Telegram notifications to keep your community engaged"
- **CTA**: Button linking to community settings
- **Dismiss**: X button with localStorage persistence
- **Responsive**: Mobile-friendly design

#### **Visibility Logic**
```typescript
const shouldShowBanner = 
  user?.isAdmin && // Only admins see banner
  !hasConnectedGroups && // No groups connected
  !TelegramBannerUtils.isDismissed(communityId); // Not dismissed
```

## Implementation Steps

### **Step-by-Step Execution Plan**

#### **🔨 Phase 1: API Foundation (Day 1 - 30 min)**
1. Create `/api/telegram/groups` route
2. Test with existing data
3. Add error handling and logging

#### **🎨 Phase 2: UI Components (Day 1 - 45 min)**
1. Build `TelegramGroupsSection` component
2. Integrate into community settings page
3. Style with existing theme system

#### **⚡ Phase 3: Real-time Updates (Day 1 - 20 min)**
1. Add React Query polling
2. Test update frequency
3. Handle background/foreground state

#### **📢 Phase 4: Banner System (Day 2 - 45 min)**
1. Create banner component
2. Implement localStorage logic
3. Integrate into main layout
4. Test admin visibility

#### **🧪 Phase 5: Testing & Polish (Day 2 - 30 min)**
1. End-to-end testing
2. Mobile responsiveness
3. Error state handling
4. Performance validation

## Technical Considerations

### **Performance Optimizations**
- **Conditional Polling**: Only poll when page is active and user is admin
- **Background Pause**: Stop polling when tab is inactive
- **Efficient Updates**: Use React Query's built-in caching and deduplication
- **LocalStorage Optimization**: Debounce banner state changes

### **Error Handling**
- **API Failures**: Graceful degradation with retry logic
- **Network Issues**: Show offline state, retry on reconnection
- **Permissions**: Clear error messages for non-admin users

### **Accessibility**
- **Screen Readers**: Proper ARIA labels for dynamic content
- **Keyboard Navigation**: Focus management for interactive elements
- **Color Contrast**: Ensure banner meets WCAG guidelines

## Success Metrics

### **Immediate Goals**
- ✅ Admin users can view connected Telegram groups
- ✅ Real-time updates work within 3 seconds
- ✅ Banner encourages Telegram setup for new communities
- ✅ localStorage persistence works across sessions

### **Long-term Impact**
- 📈 Increased Telegram group registrations (track via database)
- 📈 Higher community engagement through notifications
- 📈 Reduced admin confusion about Telegram setup
- 📈 Improved admin workflow efficiency

## Future Enhancements

### **Phase 2 Additions (Future)**
1. **Group Analytics**: Message delivery stats, engagement metrics
2. **Notification Scheduling**: Quiet hours configuration via UI
3. **Multi-Group Management**: Bulk actions, group templates
4. **Advanced Settings**: Per-group notification customization
5. **Integration Health**: Bot permission monitoring, connection status

### **Banner System Extensions**
1. **Dynamic Content**: Different messages based on community size/activity
2. **Progressive Disclosure**: Multi-step onboarding flow
3. **A/B Testing**: Different banner styles and messaging
4. **Admin Onboarding**: Context-aware help system

---

## Ready for Implementation

This roadmap provides a complete blueprint for enhancing Telegram integration visibility and management. The phased approach ensures incremental progress with immediate value delivery while building toward comprehensive Telegram community management capabilities.

**Next Steps**: Begin with Phase 1 API foundation to establish the data layer, then move through UI development with real-time features. 