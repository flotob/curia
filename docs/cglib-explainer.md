I'll examine the debug page implementation to explain how to pull the complete user info structure including all the social connections like Farcaster, LUKSO, etc.
Read file: src/components/DebugSettingsView.tsx

# Complete User Info Data Structure - Debug Page Implementation Guide

Based on the debug page implementation, here's how to pull the **complete** user info structure including all social connections.

## **1. Complete getUserInfo Response Structure**

The debug page shows this full structure is available:

```typescript
interface CompleteUserInfoResponse {
  // Basic user data
  id: string;
  name: string;
  imageUrl: string;
  premium: "GOLD" | "SILVER" | "BRONZE" | null;
  email: string;
  
  // Role assignments
  roles: string[]; // Array of role UUIDs
  
  // Social connections
  twitter?: {
    username: string;
  };
  
  lukso?: {
    username: string;  // e.g., "florian#0a60"
    address: string;   // e.g., "0x0a607f902CAa16a27AA3Aabd968892aa89ABDa92"
  };
  
  farcaster?: {
    displayName: string; // e.g., "Florian"
    username: string;    // e.g., "flx"
    fid: number;         // e.g., 13216
  };
  
  // Potentially other social connections...
}
```

---

## **2. Debug Page Implementation - The Complete Pattern**

```typescript
// From DebugSettingsView.tsx - EXACT implementation
const fetchData = async () => {
  const fetched: KeyValuePairs = {};

  try {
    // Step 1: Call getUserInfo
    const userInfoResponse = await (cgInstance as any).getUserInfo();
    
    // Step 2: Extract .data from response (THIS IS KEY!)
    fetched.userInfo = userInfoResponse?.data ?? { 
      error: getErrorMessage(userInfoResponse?.error) || 'Failed to fetch user info' 
    };
  } catch (e) {
    fetched.userInfo = { 
      error: `Failed to retrieve user info: ${getErrorMessage(e)}` 
    };
  }
  
  setAllData(fetched);
};
```

**Key insight: The response has a `.data` property that contains the actual user info!**

---

## **3. Why Your Current Implementation Only Gets Email/Premium**

Your current implementation is probably doing this:

```typescript
// ❌ WRONG - Missing .data extraction
const userInfo = await cgInstance.getUserInfo();
// This gives you the wrapper response, not the actual data

// ✅ CORRECT - Extract .data like debug page does
const userInfoResponse = await cgInstance.getUserInfo();
const userInfo = userInfoResponse?.data;
```

---

## **4. Complete Implementation Pattern**

### **Using useCgQuery Hook (Recommended)**

```typescript
// Complete user info with all social connections
const { data: fullUserInfo, isLoading, error } = useCgQuery<CompleteUserInfoResponse, Error>(
  ['userInfo', iframeUid],
  async (instance) => {
    const response = await instance.getUserInfo();
    return response.data; // Extract .data property!
  },
  { enabled: !!iframeUid }
);

// Now you can access everything:
const userId = fullUserInfo?.id;
const userName = fullUserInfo?.name;
const userEmail = fullUserInfo?.email;
const userPremium = fullUserInfo?.premium;
const userRoles = fullUserInfo?.roles || [];

// Social connections
const twitterUsername = fullUserInfo?.twitter?.username;
const luksoAddress = fullUserInfo?.lukso?.address;
const luksoUsername = fullUserInfo?.lukso?.username;
const farcasterDisplayName = fullUserInfo?.farcaster?.displayName;
const farcasterUsername = fullUserInfo?.farcaster?.username;
const farcasterFid = fullUserInfo?.farcaster?.fid;
```

### **Direct Implementation (Debug Style)**

```typescript
const [completeUserData, setCompleteUserData] = useState<any>(null);
const { cgInstance } = useCgLib();

useEffect(() => {
  const fetchCompleteUserInfo = async () => {
    if (!cgInstance) return;
    
    try {
      // Step 1: Call getUserInfo (returns wrapper)
      const userInfoResponse = await (cgInstance as any).getUserInfo();
      
      // Step 2: Extract .data (contains actual user data)
      const userData = userInfoResponse?.data;
      
      if (userData) {
        setCompleteUserData(userData);
        console.log('Complete user data:', userData);
        
        // Access all the fields
        console.log('Farcaster:', userData.farcaster);
        console.log('LUKSO:', userData.lukso);
        console.log('Twitter:', userData.twitter);
        console.log('Roles:', userData.roles);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  fetchCompleteUserInfo();
}, [cgInstance]);
```

---

## **5. Response Structure Breakdown**

```typescript
// What cgInstance.getUserInfo() returns:
{
  data: {
    // This is where all the user info actually lives!
    id: "86326068-5e1f-41b4-ba39-213402bf3601",
    name: "ada",
    imageUrl: "https://app.cg/files/...",
    roles: ["fb14a7d5-bbda-4257-8809-4229c2a71b0f", ...],
    premium: "GOLD",
    email: "fg@blockchain.lawyer",
    twitter: { username: "heckerhut" },
    lukso: { 
      username: "florian#0a60",
      address: "0x0a607f902CAa16a27AA3Aabd968892aa89ABDa92"
    },
    farcaster: {
      displayName: "Florian",
      username: "flx", 
      fid: 13216
    }
  },
  error?: string, // If there was an error
  success?: boolean // Success flag
}
```

---

## **6. Accessing Specific Social Data**

```typescript
const useUserSocialConnections = () => {
  const { data: userInfo } = useCgQuery<CompleteUserInfoResponse, Error>(
    ['userInfo', iframeUid],
    async (instance) => (await instance.getUserInfo()).data,
    { enabled: !!iframeUid }
  );

  return {
    // Twitter data
    hasTwitter: !!userInfo?.twitter,
    twitterUsername: userInfo?.twitter?.username,
    
    // LUKSO data  
    hasLukso: !!userInfo?.lukso,
    luksoAddress: userInfo?.lukso?.address,
    luksoUsername: userInfo?.lukso?.username,
    
    // Farcaster data
    hasFarcaster: !!userInfo?.farcaster,
    farcasterFid: userInfo?.farcaster?.fid,
    farcasterUsername: userInfo?.farcaster?.username,
    farcasterDisplayName: userInfo?.farcaster?.displayName,
    
    // Basic data
    userRoles: userInfo?.roles || [],
    premium: userInfo?.premium,
    email: userInfo?.email,
  };
};

// Usage in component:
const { 
  hasTwitter, 
  twitterUsername,
  hasLukso, 
  luksoAddress,
  hasFarcaster, 
  farcasterDisplayName 
} = useUserSocialConnections();
```

---

## **7. Complete Component Example**

```typescript
const UserProfileView = () => {
  const { cgInstance } = useCgLib();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!cgInstance) return;
      
      try {
        const response = await (cgInstance as any).getUserInfo();
        const completeUserData = response?.data; // EXTRACT .data!
        
        setUserData(completeUserData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [cgInstance]);

  if (!userData) return <div>Loading...</div>;

  return (
    <div className="user-profile">
      <h2>{userData.name}</h2>
      <p>Email: {userData.email}</p>
      <p>Premium: {userData.premium}</p>
      
      {/* Social Connections */}
      {userData.twitter && (
        <p>Twitter: @{userData.twitter.username}</p>
      )}
      
      {userData.lukso && (
        <div>
          <p>LUKSO Username: {userData.lukso.username}</p>
          <p>LUKSO Address: {userData.lukso.address}</p>
        </div>
      )}
      
      {userData.farcaster && (
        <div>
          <p>Farcaster: {userData.farcaster.displayName} (@{userData.farcaster.username})</p>
          <p>FID: {userData.farcaster.fid}</p>
        </div>
      )}
      
      {/* Roles */}
      <div>
        <h3>Roles ({userData.roles?.length || 0}):</h3>
        {userData.roles?.map((roleId: string) => (
          <span key={roleId}>{roleId.slice(0, 8)}...</span>
        ))}
      </div>
    </div>
  );
};
```

---

## **8. Key Debugging Points**

1. **Always extract `.data`**: `response.data` not just `response`
2. **Check response structure**: Log the full response to see what's available
3. **Handle optional fields**: Use `?.` for social connections that might not exist
4. **Error handling**: Check for `response.error` if `.data` is null

```typescript
// Debug the response structure
const response = await cgInstance.getUserInfo();
console.log('Full response:', response);
console.log('Data only:', response?.data);
console.log('Available social:', {
  twitter: response?.data?.twitter,
  lukso: response?.data?.lukso,
  farcaster: response?.data?.farcaster
});
```

The key insight is that **all** the rich user data (including social connections) is available in `response.data` - you just need to extract it properly like the debug page does! 🚀