# 🔗 LSP26 Follower Gating - Integration Research & Specification

## 🎯 **Overview**
Integration of **LSP26 Follower System** into our existing LUKSO Universal Profile gating infrastructure. This adds **social graph-based access control** alongside our current LYX balance, LSP7 token, and LSP8 NFT gating.

## 📚 **LSP26 Follower System Summary**

### **Core Technology**
- **Global Registry**: Single smart contract on LUKSO mainnet
- **Contract Address**: `0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA`
- **Standard**: LSP26 (LUKSO Social Recovery & Follower System)
- **Network**: LUKSO Mainnet (Chain ID: 0x2A / 42)

### **Key Functions**
```typescript
// Get follower count for an address
function followerCount(address addr) view returns (uint256)

// Check if one address follows another  
function isFollowing(address follower, address addr) view returns (bool)
```

### **Gating Opportunities**
1. **Minimum Follower Count**: "Must have ≥N followers"
2. **Followed By Specific Profile**: "Must be followed by address X"  
3. **Following Specific Profile**: "Must be following address X"

---

## 🏗️ **Integration Architecture**

### **Current System (Working)**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LYX Balance   │    │   LSP7 Tokens   │    │   LSP8 NFTs     │
│   Gating        │    │   Gating        │    │   Gating        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ UPGating System │
                    │ (Posts/Comments)│
                    └─────────────────┘
```

### **Enhanced System (Target)**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LYX Balance   │    │   LSP7 Tokens   │    │   LSP8 NFTs     │    │ LSP26 Followers │
│   Gating        │    │   Gating        │    │   Gating        │    │   Gating        │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         └───────────────────────┼───────────────────────┼───────────────────────┘
                                 │                       │
                    ┌─────────────────┐         ┌─────────────────┐
                    │ Enhanced UPGating System  │   LSP26 Registry │
                    │ (Posts/Comments)          │   Integration   │
                    └─────────────────┘         └─────────────────┘
```

---

## 📊 **Type Definitions & Data Models**

### **Extended UPGatingRequirements Interface**
```typescript
// Current interface (in types/settings.ts)
export interface UPGatingRequirements {
  minLyxBalance?: string;
  requiredTokens?: TokenRequirement[];
  // NEW: Add follower requirements
  followerRequirements?: FollowerRequirement[];
}

// New interface for follower requirements
export interface FollowerRequirement {
  type: 'minimum_followers' | 'followed_by' | 'following';
  value: string; // For minimum_followers: count, for others: UP address
  description?: string; // Human-readable description
}
```

### **Example Usage**
```typescript
// Minimum 100 followers
{
  type: 'minimum_followers',
  value: '100',
  description: 'Must have at least 100 followers'
}

// Must be followed by specific influencer
{
  type: 'followed_by', 
  value: '0x1234...abcd', // Influencer's UP address
  description: 'Must be followed by @LuksoInfluencer'
}

// Must be following official account
{
  type: 'following',
  value: '0x5678...efgh', // Official account UP address  
  description: 'Must be following @LuksoOfficial'
}
```

---

## 🔧 **Implementation Plan**

### **Phase 1: Core Infrastructure (2-3 hours)**

#### **1.1 LSP26 Contract Integration**
```typescript
// src/lib/lsp26.ts - New LSP26 utility library
export const LSP26_REGISTRY_ADDRESS = '0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA';
export const LSP26_ABI = [
  'function followerCount(address addr) view returns (uint256)',
  'function isFollowing(address follower, address addr) view returns (bool)'
];

export class LSP26Registry {
  // Follower count checking
  static async getFollowerCount(address: string, provider): Promise<number>
  
  // Follow relationship checking  
  static async isFollowing(follower: string, target: string, provider): Promise<boolean>
  
  // Batch checking for efficiency
  static async batchCheckFollowerRequirements(requirements: FollowerRequirement[], userAddress: string, provider): Promise<boolean[]>
}
```

#### **1.2 UniversalProfileContext Extension**
```typescript
// Add to src/contexts/UniversalProfileContext.tsx
export interface UniversalProfileContextType {
  // ... existing methods
  
  // NEW: Follower verification methods
  verifyFollowerRequirements: (requirements: FollowerRequirement[]) => Promise<VerificationResult>;
  getFollowerCount: (address?: string) => Promise<number>; // defaults to current user
  isFollowedBy: (followerAddress: string, targetAddress?: string) => Promise<boolean>;
  isFollowing: (targetAddress: string, followerAddress?: string) => Promise<boolean>;
}
```

#### **1.3 Backend Verification Enhancement**
```typescript
// src/lib/verification/lsp26Verification.ts
export async function verifyLSP26Requirements(
  userAddress: string,
  requirements: FollowerRequirement[]
): Promise<VerificationResult> {
  // Use direct JSON-RPC calls to LSP26 registry
  // Validate follower count, follow relationships
  // Return detailed verification results
}
```

### **Phase 2: UI/UX Integration (2-3 hours)**

#### **2.1 PostGatingControls Enhancement**
```typescript
// Add follower gating section to PostGatingControls.tsx
const FollowerGatingSection = () => {
  return (
    <div className="space-y-3">
      <Label>Follower Requirements</Label>
      
      {/* Minimum Followers Option */}
      <div className="space-y-2">
        <input type="radio" name="follower-type" value="minimum" />
        <Label>Minimum Followers</Label>
        <Input placeholder="e.g., 100" />
      </div>
      
      {/* Followed By Specific Profile */}
      <div className="space-y-2">
        <input type="radio" name="follower-type" value="followed-by" />
        <Label>Must be followed by</Label>
        <Input placeholder="Universal Profile address (0x...)" />
      </div>
      
      {/* Following Specific Profile */}
      <div className="space-y-2">
        <input type="radio" name="follower-type" value="following" />
        <Label>Must be following</Label>
        <Input placeholder="Universal Profile address (0x...)" />
      </div>
    </div>
  );
};
```

#### **2.2 InlineUPConnection Display**
```typescript
// Add follower requirement display to InlineUPConnection.tsx
const FollowerRequirementDisplay = ({ requirement, userStatus }) => {
  switch (requirement.type) {
    case 'minimum_followers':
      return (
        <div className="flex items-center justify-between">
          <span>Minimum {requirement.value} followers</span>
          <span className="font-mono">{userStatus.followerCount} followers</span>
          {userStatus.meetsRequirement ? <CheckCircle /> : <XCircle />}
        </div>
      );
      
    case 'followed_by':
      return (
        <div className="flex items-center justify-between">
          <span>Followed by {requirement.description || requirement.value}</span>
          {userStatus.meetsRequirement ? <CheckCircle /> : <XCircle />}
        </div>
      );
      
    // ... similar for 'following' type
  }
};
```

### **Phase 3: Advanced Features (2-3 hours)**

#### **3.1 Profile Address Resolution**
```typescript
// Integration with ENS/UP naming system
export async function resolveProfileAddress(input: string): Promise<string> {
  // Handle cases:
  // - Full address: 0x1234...abcd
  // - UP name: @username  
  // - ENS name: username.eth
  // - UP short URL: up.link/username
}
```

#### **3.2 Real-Time Profile Previews**
```typescript
// When user enters a profile address, show preview
const ProfilePreview = ({ address }) => {
  const { data: profile } = useUPProfile(address);
  
  return (
    <div className="flex items-center space-x-2 p-2 border rounded">
      <img src={profile?.profileImage} className="w-8 h-8 rounded-full" />
      <div>
        <div className="font-medium">{profile?.name || 'Unknown Profile'}</div>
        <div className="text-xs text-muted-foreground">
          {profile?.followerCount} followers
        </div>
      </div>
    </div>
  );
};
```

#### **3.3 Batch Optimization**
```typescript
// Optimize multiple follower checks with batching
export async function batchVerifyFollowerRequirements(
  userAddress: string,
  allRequirements: FollowerRequirement[][]
): Promise<VerificationResult[]> {
  // Group similar calls together
  // Use Promise.all for parallel execution
  // Cache results for repeated checks
}
```

---

## 🗄️ **Database Schema Updates**

### **No Schema Changes Required!** 
Our existing `posts.settings` JSONB column can store follower requirements:

```sql
-- Example post with follower gating
UPDATE posts 
SET settings = '{
  "responsePermissions": {
    "upGating": {
      "enabled": true,
      "requirements": {
        "minLyxBalance": "1000000000000000000",
        "followerRequirements": [
          {
            "type": "minimum_followers",
            "value": "50",
            "description": "Must have at least 50 followers"
          },
          {
            "type": "followed_by", 
            "value": "0x1234567890abcdef...",
            "description": "Must be followed by @LuksoInfluencer"
          }
        ]
      }
    }
  }
}'
WHERE id = 123;
```

---

## 🔐 **Security & Performance Considerations**

### **Security**
1. **Backend Verification**: Always verify follower requirements server-side
2. **Rate Limiting**: LSP26 calls are free but should be rate-limited
3. **Address Validation**: Validate UP addresses before LSP26 queries
4. **Caching**: Cache follower counts for performance (with reasonable TTL)

### **Performance Optimizations**
1. **Parallel Checks**: Verify LYX + tokens + followers simultaneously
2. **Smart Caching**: Cache follower counts (they change less frequently)
3. **Batch Requests**: Group multiple follower checks when possible
4. **Loading States**: Show progressive loading for each requirement type

### **Error Handling**
```typescript
// Graceful degradation when LSP26 is unavailable
try {
  const followerCount = await getFollowerCount(address);
  return followerCount >= minimumRequired;
} catch (error) {
  console.warn('LSP26 unavailable, allowing access:', error);
  return true; // Fail open (or implement fallback strategy)
}
```

---

## 🎨 **UX/UI Mockups**

### **Post Creation - Follower Gating Section**
```
┌─ Response Gating ─────────────────────────────────┐
│ ☑ Enable Universal Profile Gating                │
│                                                   │
│ ┌─ Requirements ─────────────────────────────────┐ │
│ │ LYX Balance: [100] LYX                        │ │
│ │                                               │ │  
│ │ Follower Requirements:                        │ │
│ │ ○ Minimum followers: [50] followers           │ │
│ │ ○ Followed by: [0x1234...] @LuksoInfluencer   │ │
│ │ ○ Following: [         ] (enter address)     │ │
│ │                                               │ │
│ │ Token Requirements:                           │ │
│ │ • LYXOG (LSP7): 1.0 tokens                   │ │
│ └───────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### **Comment Section - Follower Status Display**
```
┌─ Universal Profile Required ───────────────────────┐
│ This post requires verification to comment         │
│                                                    │
│ Requirements:                                      │
│ ✓ LYX Balance: 100 LYX                            │
│ ✓ Followers: 127 (≥50 required)                   │
│ ✗ Must be followed by @LuksoInfluencer            │
│ ✓ LYXOG Tokens: 2.5 tokens                       │
│                                                    │
│ [Connect Universal Profile] Status: 3/4 met       │
└────────────────────────────────────────────────────┘
```

---

## 🚀 **Implementation Priority & Timeline**

### **Phase 1 (Week 1): Core Integration - 8-10 hours**
- ✅ LSP26 contract integration (`src/lib/lsp26.ts`)
- ✅ Type definitions & interfaces (`types/settings.ts`)
- ✅ UniversalProfileContext follower methods
- ✅ Backend verification integration
- ✅ Basic UI for follower requirements

### **Phase 2 (Week 2): Enhanced UX - 6-8 hours**  
- ✅ Profile address resolution & validation
- ✅ Real-time follower status checking
- ✅ Profile previews in gating controls
- ✅ Improved error handling & loading states

### **Phase 3 (Week 3): Advanced Features - 4-6 hours**
- ✅ Performance optimizations (caching, batching)
- ✅ Advanced UI features (autocomplete, suggestions)
- ✅ Analytics & usage tracking
- ✅ Testing with real LUKSO profiles

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- LSP26 contract interaction functions
- Follower requirement validation logic
- Profile address resolution

### **Integration Tests**  
- End-to-end gating workflow
- Backend verification with real LSP26 data
- UI interaction flows

### **Manual Testing with Real Data**
- Test with actual LUKSO profiles that have followers
- Verify follower counts match official LUKSO tools
- Test follow relationship accuracy

---

## 💡 **Use Cases Unlocked**

### **Community Building**
```typescript
// "Only established members (50+ followers) can post"
{
  type: 'minimum_followers',
  value: '50',
  description: 'Established community members only'
}
```

### **Influencer Content**
```typescript
// "Content exclusive to my followers"  
{
  type: 'followed_by',
  value: '0x...influencer_address',
  description: 'Exclusive content for followers'
}
```

### **Brand Engagement**
```typescript
// "Must follow our official account to participate"
{
  type: 'following', 
  value: '0x...brand_address',
  description: 'Follow us to join the discussion'
}
```

### **Tiered Access**
```typescript
// Combine multiple requirements
{
  minLyxBalance: '10000000000000000000', // 10 LYX
  followerRequirements: [
    { type: 'minimum_followers', value: '100' },
    { type: 'following', value: '0x...official_account' }
  ],
  requiredTokens: [
    { tokenType: 'LSP7', contractAddress: '0x...', minAmount: '1000' }
  ]
}
```

---

## 🔗 **Next Steps**

1. **Create LSP26 utility library** with contract interaction functions
2. **Extend type definitions** for follower requirements
3. **Update UniversalProfileContext** with follower verification methods  
4. **Enhance PostGatingControls** with follower requirement UI
5. **Integrate backend verification** in comment/post APIs
6. **Update InlineUPConnection** to display follower status
7. **Add comprehensive testing** with real LUKSO follower data

This integration will make our platform one of the **first to leverage LUKSO's decentralized social graph** for content gating, adding a powerful social dimension to Universal Profile-based access control! 🌟 