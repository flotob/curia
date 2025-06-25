I'll examine the debug page implementation to understand how it retrieves user friends, plugin ID, and community information, then explain this for another AI agent.
Read file: src/components/DebugSettingsView.tsx

Read file: src/context/CgLibContext.tsx

Read file: src/hooks/useCgQuery.ts

Read file: src/context/AuthContext.tsx

# How to Retrieve User Friends, Plugin ID, and Community Data in a CG Plugin Repository

Based on the debug page implementation, here's a comprehensive guide for another AI agent on how to retrieve key data points in a Common Ground plugin context.

## **Core Architecture Overview**

The Common Ground plugin system uses a **CgPluginLib** instance that provides access to user data, community information, and plugin context. All data retrieval flows through this centralized library instance.

### **1. Setting Up the Common Ground Library Context**

```typescript
// src/context/CgLibContext.tsx
import { CgPluginLib } from '@common-ground-dao/cg-plugin-lib';

interface CgLibContextType {
  cgInstance: CgPluginLib | null;
  isInitializing: boolean;
  initError: Error | null;
  iframeUid: string | null;
}

export function CgLibProvider({ children }: { children: React.ReactNode }) {
  const [cgInstance, setCgInstance] = useState<CgPluginLib | null>(null);
  const searchParams = useSearchParams();
  const iframeUid = useMemo(() => searchParams.get('iframeUid'), [searchParams]);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_PUBKEY as string;
    
    if (!publicKey || !iframeUid) return;

    CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
      .then(instance => {
        setCgInstance(instance);
      })
      .catch(error => {
        setInitError(error);
      });
  }, [iframeUid]);

  // ... context provider implementation
}
```

### **Key Requirements:**
- **iframeUid**: Retrieved from URL search parameters when plugin loads
- **Public Key**: Set in environment as `NEXT_PUBLIC_PUBKEY`
- **Signature Endpoint**: `/api/sign` route for authentication

---

## **2. Retrieving User Friends List**

### **Method 1: Direct Instance Call (Debug Pattern)**
```typescript
// From DebugSettingsView.tsx - Direct approach
const retrieveUserFriends = async (cgInstance: CgPluginLib) => {
  try {
    const friendsResponse = await (cgInstance as any).getUserFriends(10, 0);
    return friendsResponse?.data ?? null;
  } catch (error) {
    console.error('Failed to retrieve user friends:', error);
    return { error: error.message };
  }
};

// Usage in component
const { cgInstance } = useCgLib();
const [friendsData, setFriendsData] = useState(null);

useEffect(() => {
  if (cgInstance) {
    retrieveUserFriends(cgInstance).then(setFriendsData);
  }
}, [cgInstance]);
```

### **Method 2: Using useCgQuery Hook (Recommended)**
```typescript
// src/hooks/useCgQuery.ts - Structured approach with React Query
import { useCgQuery } from '@/hooks/useCgQuery';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';

// In your component:
const { iframeUid } = useCgLib();

const { data: friends, isLoading, error } = useCgQuery<
  UserFriendsResponsePayload,
  Error
>(
  ['userFriends', iframeUid, 10, 0], // queryKey with pagination
  async (instance) => (await instance.getUserFriends(10, 0)).data,
  { enabled: !!iframeUid }
);
```

### **Friends Data Structure:**
```typescript
interface UserFriendsResponsePayload {
  friends: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    // ... other friend properties
  }>;
  totalCount: number;
  // ... pagination info
}
```

---

## **3. Retrieving Plugin ID**

### **Plugin Context Data Access**
```typescript
// From AuthContext.tsx - Plugin ID retrieval
const retrievePluginId = (cgInstance: CgPluginLib): string | null => {
  try {
    const rawPluginContext = cgInstance.getContextData();
    
    // Validate structure
    if (
      !rawPluginContext || 
      typeof rawPluginContext !== 'object' || 
      typeof rawPluginContext.pluginId !== 'string'
    ) {
      console.error('Plugin context invalid:', rawPluginContext);
      return null;
    }
    
    return rawPluginContext.pluginId;
  } catch (error) {
    console.error('Failed to get plugin context:', error);
    return null;
  }
};

// Usage with React hook
const { cgInstance } = useCgLib();

const pluginId = useMemo(() => {
  if (cgInstance) {
    return cgInstance.getContextData()?.pluginId || null;
  }
  return null;
}, [cgInstance]);
```

### **Plugin Context Structure:**
```typescript
interface PluginContextData {
  pluginId: string;           // The plugin definition ID
  assignableRoleIds: string[]; // Role IDs this plugin can assign
  // ... other context properties
}
```

### **Extracting Assignable Role IDs:**
```typescript
const pluginContextAssignableRoleIds = useMemo(() => {
  if (cgInstance) {
    const context = cgInstance.getContextData();
    if (context && Array.isArray(context.assignableRoleIds)) {
      return context.assignableRoleIds.filter(id => typeof id === 'string');
    }
  }
  return [];
}, [cgInstance]);
```

---

## **4. Retrieving Community URL/Slug**

### **Community Information Access**
```typescript
// Community data retrieval
const { data: communityInfo } = useCgQuery<CommunityInfoResponsePayload, Error>(
  ['communityInfo', iframeUid],
  async (instance) => (await instance.getCommunityInfo()).data,
  { enabled: !!iframeUid }
);

// Extract community URL (slug)
const communitySlug = useMemo(() => {
  return communityInfo?.url || null; // This is the community's short URL/slug
}, [communityInfo]);

// Extract community ID (long form)
const communityId = useMemo(() => {
  return communityInfo?.id || null;
}, [communityInfo]);
```

### **Community Data Structure:**
```typescript
interface CommunityInfoResponsePayload {
  id: string;              // Long-form community ID
  url: string;             // Community slug/short URL
  title: string;           // Community display name
  smallLogoUrl?: string;   // Logo URL
  headerImageUrl?: string; // Header image URL
  largeLogoUrl?: string;   // Large logo URL
  official?: boolean;      // Official community flag
  premium?: string;        // Premium status
  roles: Array<{           // Available community roles
    id: string;
    title: string;
    type: string;
    permissions: string[];
    assignmentRules: object | null;
  }>;
}
```

---

## **5. Complete Data Retrieval Pattern (Debug Implementation)**

Here's the exact pattern from the debug page that retrieves all data points:

```typescript
// Complete debug data fetching pattern
export const DebugSettingsView: React.FC = () => {
  const { cgInstance, isInitializing } = useCgLib();
  const [allData, setAllData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isInitializing || !cgInstance) return;

    const fetchAllData = async () => {
      const fetched: Record<string, any> = {};

      // 1. User Information
      try {
        const userInfoResponse = await (cgInstance as any).getUserInfo();
        fetched.userInfo = userInfoResponse?.data ?? { error: 'Failed to fetch user info' };
      } catch (e) {
        fetched.userInfo = { error: `Failed to retrieve user info: ${e.message}` };
      }

      // 2. Community Information (includes URL/slug)
      try {
        const communityInfoResponse = await (cgInstance as any).getCommunityInfo();
        fetched.communityInfo = communityInfoResponse?.data ?? { error: 'Failed to fetch community info' };
      } catch (e) {
        fetched.communityInfo = { error: `Failed to retrieve community info: ${e.message}` };
      }

      // 3. User Friends List
      try {
        const friendsResponse = await (cgInstance as any).getUserFriends(10, 0);
        fetched.userFriends = friendsResponse?.data ?? { error: 'Failed to fetch user friends' };
      } catch (e) {
        fetched.userFriends = { error: `Failed to retrieve user friends: ${e.message}` };
      }

      // 4. Plugin Context Data (includes Plugin ID)
      try {
        const pluginContextData = cgInstance.getContextData();
        fetched.pluginContext = pluginContextData ?? { error: 'getContextData returned null' };
      } catch (e) {
        fetched.pluginContext = { error: `Failed to retrieve plugin context: ${e.message}` };
      }

      setAllData(fetched);
    };

    fetchAllData();
  }, [cgInstance, isInitializing]);

  // Extract specific values:
  const communityUrl = allData.communityInfo?.url;        // Community slug
  const pluginId = allData.pluginContext?.pluginId;      // Plugin ID
  const friends = allData.userFriends?.friends;          // Friends array
  
  return (
    <div>
      {/* Display all the retrieved data */}
      <pre>{JSON.stringify(allData, null, 2)}</pre>
    </div>
  );
};
```

---

## **6. Best Practices for Data Retrieval**

### **Error Handling Pattern**
```typescript
const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Unknown error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as { message: string }).message;
  }
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Could not stringify error object';
  }
};
```

### **Loading State Management**
```typescript
const [isLoadingData, setIsLoadingData] = useState(true);
const [dataFetchError, setDataFetchError] = useState<string | null>(null);

// Always wrap data fetching in try-catch
try {
  const data = await cgInstance.someMethod();
  // Handle success
} catch (error) {
  setDataFetchError(getErrorMessage(error));
} finally {
  setIsLoadingData(false);
}
```

### **TypeScript Safety**
```typescript
// Always type-check the cgInstance before using
if (cgInstance && typeof (cgInstance as any).getUserFriends === 'function') {
  // Safe to call the method
} else {
  // Method not available - handle gracefully
}
```

---

## **7. Environment Setup Requirements**

### **Required Environment Variables**
```bash
# .env.local
NEXT_PUBLIC_PUBKEY=your_public_key_here
```

### **Required Dependencies**
```json
{
  "@common-ground-dao/cg-plugin-lib": "^0.9.6",
  "@common-ground-dao/cg-plugin-lib-host": "^0.9.6",
  "@tanstack/react-query": "^5.74.11"
}
```

### **URL Parameters**
The plugin receives `iframeUid` as a search parameter when loaded by the Common Ground platform:
```
https://your-plugin.com?iframeUid=some-unique-identifier
```

This comprehensive pattern allows you to retrieve all the key data points (friends list, plugin ID, community URL) that a Common Ground plugin needs to function properly. The debug page serves as the reference implementation for this data retrieval pattern.