# Ethereum ENS/EFP Gating System - Research & Implementation Guide

## Executive Summary

This document outlines the implementation strategy for adding **Ethereum ENS/EFP gating** as our second gating category alongside Universal Profile. The system will leverage ENS (Ethereum Name Service) for identity verification, EFP (Ethereum Follow Protocol) for social proof, and standard Ethereum token contracts (ERC-20, ERC-721, ERC-1155) for asset-based gating.

## 1. System Architecture Analysis

### Current Universal Profile Gating Pattern
Our existing system follows this architecture:
- **CategoryRenderer Interface**: `UniversalProfileRenderer` implements standardized interface
- **Requirements Structure**: `UPGatingRequirements` defines gating criteria  
- **Context Provider**: `UniversalProfileContext` manages wallet connection & verification
- **Server Verification**: Raw RPC calls to LUKSO network in API routes
- **Multi-Category Support**: Registry system supports multiple gating providers

### Proposed Ethereum Gating Architecture
We'll mirror this exact pattern for Ethereum:

```typescript
// New category type in existing enum
type GatingCategoryType = 'universal_profile' | 'ethereum_profile' | ...

// New requirements structure  
interface EthereumGatingRequirements {
  // ENS requirements
  requiresENS?: boolean;
  ensDomainPatterns?: string[]; // e.g., ["*.eth", "*.xyz"]
  
  // EFP social requirements
  minimumFollowers?: number;
  mustFollowAddresses?: string[]; // Must follow specific addresses
  mustBeFollowedByAddresses?: string[]; // Must be followed by specific addresses
  
  // Token requirements
  minimumETHBalance?: string; // in wei
  requiredERC20Tokens?: ERC20Requirement[];
  requiredERC721Collections?: ERC721Requirement[];
  requiredERC1155Tokens?: ERC1155Requirement[];
}
```

## 2. Technical Implementation Strategy

### 2.1 Core Renderer Implementation

Following `UniversalProfileRenderer.tsx` pattern:

```typescript
// src/lib/gating/renderers/EthereumProfileRenderer.tsx
export class EthereumProfileRenderer implements CategoryRenderer {
  getMetadata(): GatingCategoryMetadata {
    return {
      name: 'Ethereum Profile',
      description: 'Ethereum blockchain identity & social verification',
      icon: '⟠', // Ethereum diamond
      brandColor: '#627EEA', // Ethereum blue
      shortName: 'ETH'
    };
  }

  renderDisplay(props: CategoryRendererProps): ReactNode {
    return <EthereumDisplayComponent {...props} />;
  }

  renderConfig(props: CategoryConfigProps): ReactNode {
    return <EthereumConfigComponent {...props} />;
  }

  async verify(requirements: unknown, userWallet: string): Promise<VerificationResult> {
    // Client-side verification logic
  }

  validateRequirements(requirements: unknown): { valid: boolean; errors: string[] } {
    // Validate requirements structure
  }

  getDefaultRequirements(): EthereumGatingRequirements {
    return {
      requiresENS: false,
      minimumFollowers: undefined,
      minimumETHBalance: undefined,
      requiredERC20Tokens: [],
      requiredERC721Collections: [],
      requiredERC1155Tokens: []
    };
  }
}
```

### 2.2 Context Provider Architecture

Create `EthereumProfileContext.tsx` mirroring `UniversalProfileContext.tsx`:

```typescript
interface EthereumProfileContextType {
  // Connection state
  isConnected: boolean;
  ethAddress: string | null;
  isConnecting: boolean;
  connectionError: string | null;
  isCorrectChain: boolean; // Ethereum mainnet
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToEthereum: () => Promise<void>;
  
  // Verification methods
  verifyETHBalance: (minBalance: string) => Promise<boolean>;
  verifyERC20Requirements: (requirements: ERC20Requirement[]) => Promise<VerificationResult>;
  verifyERC721Requirements: (requirements: ERC721Requirement[]) => Promise<VerificationResult>;
  verifyERC1155Requirements: (requirements: ERC1155Requirement[]) => Promise<VerificationResult>;
  verifyENSRequirements: (requiresENS: boolean, patterns?: string[]) => Promise<VerificationResult>;
  verifyEFPRequirements: (requirements: EFPRequirement[]) => Promise<VerificationResult>;
  verifyPostRequirements: (settings: PostSettings) => Promise<VerificationResult>;
  
  // Profile methods
  getETHBalance: () => Promise<string>;
  getENSProfile: () => Promise<{ name?: string; avatar?: string }>;
  getEFPStats: () => Promise<{ followers: number; following: number }>;
  signMessage: (message: string) => Promise<string>;
}
```

### 2.3 Server-Side Verification Strategy

Following the LUKSO pattern with raw RPC calls for Next.js compatibility:

```typescript
// src/app/api/posts/[postId]/comments/route.ts (extend existing)

// Ethereum mainnet RPC configuration
const ETHEREUM_RPC_URLS = [
  process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
  'https://mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
  'https://eth-mainnet.alchemyapi.io/v2/' + process.env.ALCHEMY_API_KEY,
  'https://cloudflare-eth.com'
].filter(Boolean) as string[];

// Raw RPC helper (similar to rawLuksoCall)
async function rawEthereumCall(method: string, params: unknown[] = []): Promise<unknown> {
  const body = { jsonrpc: "2.0", id: 1, method, params };
  
  for (const rpcUrl of ETHEREUM_RPC_URLS) {
    try {
      console.log(`[rawEthereumCall] Trying ${method} on ${rpcUrl}`);
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      
      const { result, error } = await res.json();
      if (error) throw new Error(error.message || 'RPC error');
      
      return result;
    } catch (error) {
      console.warn(`[rawEthereumCall] Failed ${method} on ${rpcUrl}:`, error);
    }
  }
  
  throw new Error(`All Ethereum RPC endpoints failed for ${method}`);
}

// Verification functions
async function verifyETHBalance(ethAddress: string, minBalance: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const balanceHex = await rawEthereumCall('eth_getBalance', [ethAddress, 'latest']);
    const balance = ethers.BigNumber.from(balanceHex);
    const minBalanceBN = ethers.BigNumber.from(minBalance);
    
    if (balance.lt(minBalanceBN)) {
      const balanceEth = ethers.utils.formatEther(balance);
      const minBalanceEth = ethers.utils.formatEther(minBalance);
      return { 
        valid: false, 
        error: `Insufficient ETH balance. Required: ${minBalanceEth} ETH, Current: ${balanceEth} ETH` 
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('[verifyETHBalance] Failed:', error);
    return { valid: false, error: 'Unable to verify ETH balance' };
  }
}

async function verifyERC20Balance(ethAddress: string, requirement: ERC20Requirement): Promise<{ valid: boolean; error?: string }> {
  try {
    // Manual ABI encoding for balanceOf(address)
    const balanceOfSelector = '0x70a08231'; // balanceOf(address)
    const addressParam = ethAddress.slice(2).padStart(64, '0');
    const callData = balanceOfSelector + addressParam;

    const balanceHex = await rawEthereumCall('eth_call', [
      { to: requirement.contractAddress, data: callData },
      'latest'
    ]);

    const balance = ethers.BigNumber.from(balanceHex);
    const minBalance = ethers.BigNumber.from(requirement.minimum);

    if (balance.lt(minBalance)) {
      return { 
        valid: false, 
        error: `Insufficient ${requirement.symbol || requirement.contractAddress} balance` 
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('[verifyERC20Balance] Failed:', error);
    return { valid: false, error: `Unable to verify ${requirement.symbol} balance` };
  }
}

async function verifyERC721Ownership(ethAddress: string, requirement: ERC721Requirement): Promise<{ valid: boolean; error?: string }> {
  try {
    // Manual ABI encoding for balanceOf(address) - ERC721
    const balanceOfSelector = '0x70a08231';
    const addressParam = ethAddress.slice(2).padStart(64, '0');
    const callData = balanceOfSelector + addressParam;

    const balanceHex = await rawEthereumCall('eth_call', [
      { to: requirement.contractAddress, data: callData },
      'latest'
    ]);

    const nftCount = ethers.BigNumber.from(balanceHex);
    const minRequired = ethers.BigNumber.from(requirement.minimumCount || '1');

    if (nftCount.lt(minRequired)) {
      return { 
        valid: false, 
        error: `Insufficient NFTs from ${requirement.contractAddress}. Required: ${minRequired.toString()}, Current: ${nftCount.toString()}` 
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('[verifyERC721Ownership] Failed:', error);
    return { valid: false, error: `Unable to verify NFT ownership` };
  }
}

async function verifyENSName(ethAddress: string, requiresENS: boolean, patterns?: string[]): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!requiresENS) return { valid: true };

    // Use ENS registry to resolve reverse lookup
    // This would require ENS contract calls or use of a service like ENS metadata API
    // For now, placeholder - would implement similar raw contract calls
    
    return { valid: true }; // Placeholder
  } catch (error) {
    console.error('[verifyENSName] Failed:', error);
    return { valid: false, error: 'Unable to verify ENS name' };
  }
}

async function verifyEFPFollowers(ethAddress: string, minimumFollowers?: number): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!minimumFollowers || minimumFollowers <= 0) return { valid: true };

    // Use EFP API
    const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${ethAddress}/stats`);
    if (!response.ok) throw new Error('EFP API error');
    
    const data = await response.json();
    const followerCount = data.followers ?? 0;
    
    if (followerCount < minimumFollowers) {
      return { 
        valid: false, 
        error: `Insufficient followers. Required: ${minimumFollowers}, Current: ${followerCount}` 
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('[verifyEFPFollowers] Failed:', error);
    return { valid: false, error: 'Unable to verify EFP followers' };
  }
}
```

## 3. Frontend Integration Strategy

### 3.1 Wallet Connection

Use Web3-Onboard with Ethereum configuration:

```typescript
// Update src/contexts/EthereumProfileContext.tsx
const ethereumMainnet = {
  id: '0x1', // 1 in hex
  token: 'ETH',
  label: 'Ethereum Mainnet',
  rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://cloudflare-eth.com'
};

// Configure Web3-Onboard for Ethereum
const initEthereumOnboard = () => {
  return init({
    wallets: [injected],
    chains: [ethereumMainnet],
    appMetadata: {
      name: 'Curia',
      description: 'Community governance and discussions'
    }
  });
};
```

### 3.2 Display Components

Following `UPDisplayComponent` pattern:

```typescript
// src/lib/gating/renderers/EthereumProfileRenderer.tsx
const EthereumDisplayComponent: React.FC<EthereumDisplayComponentProps> = ({
  requirements,
  userStatus,
  isExpanded,
  onToggleExpanded,
  metadata,
  onConnect,
  onDisconnect
}) => {
  const [ensProfile, setEnsProfile] = useState<{ name?: string; avatar?: string }>();
  const [efpStats, setEfpStats] = useState<{ followers: number; following: number }>();
  
  // Fetch ENS profile and EFP stats when connected
  useEffect(() => {
    if (userStatus.connected && ethAddress) {
      fetchENSProfile(ethAddress).then(setEnsProfile);
      fetchEFPStats(ethAddress).then(setEfpStats);
    }
  }, [userStatus.connected, ethAddress]);

  return (
    <div className="border-l-4 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
         style={{ borderLeftColor: metadata.brandColor }}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{metadata.icon}</span>
          <span className="font-medium text-sm">{metadata.name}</span>
          {userStatus.connected && (
            <Badge variant={userStatus.verified ? "default" : "secondary"} className="text-xs">
              {userStatus.verified ? "Verified" : "Connected"}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onToggleExpanded}>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {/* Requirements Summary */}
      <div className="space-y-3">
        {/* ETH Balance */}
        {requirements.minimumETHBalance && (
          <RequirementDisplay
            icon={<Coins size={10} />}
            label={`${ethers.utils.formatEther(requirements.minimumETHBalance)} ETH minimum`}
            status={userStatus.verified}
          />
        )}

        {/* ENS Requirement */}
        {requirements.requiresENS && (
          <RequirementDisplay
            icon={<User size={10} />}
            label="ENS name required"
            status={userStatus.verified}
            details={ensProfile?.name}
          />
        )}

        {/* EFP Followers */}
        {requirements.minimumFollowers && (
          <RequirementDisplay
            icon={<Users size={10} />}
            label={`${requirements.minimumFollowers} followers minimum`}
            status={userStatus.verified}
            details={efpStats ? `${efpStats.followers} followers` : undefined}
          />
        )}

        {/* Token Requirements */}
        {requirements.requiredERC20Tokens?.map((token, idx) => (
          <RequirementDisplay
            key={idx}
            icon={<span>🪙</span>}
            label={`${token.symbol || 'Token'} required`}
            status={userStatus.verified}
          />
        ))}

        {/* NFT Requirements */}
        {requirements.requiredERC721Collections?.map((nft, idx) => (
          <RequirementDisplay
            key={idx}
            icon={<span>🖼️</span>}
            label={`${nft.name || 'NFT'} collection`}
            status={userStatus.verified}
          />
        ))}
      </div>

      {/* Connection Controls */}
      {!userStatus.connected && (
        <Button onClick={onConnect} className="w-full mt-3">
          Connect Ethereum Wallet
        </Button>
      )}
    </div>
  );
};
```

### 3.3 Configuration Components

Following `PostGatingControls.tsx` pattern:

```typescript
const EthereumConfigComponent: React.FC<EthereumConfigComponentProps> = ({
  requirements,
  onChange,
  disabled
}) => {
  const handleETHBalanceChange = (ethAmount: string) => {
    try {
      if (!ethAmount.trim()) {
        const newRequirements = { ...requirements };
        delete newRequirements.minimumETHBalance;
        onChange(newRequirements);
        return;
      }

      const weiAmount = ethers.utils.parseEther(ethAmount).toString();
      onChange({ ...requirements, minimumETHBalance: weiAmount });
    } catch (error) {
      console.error('Invalid ETH amount:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* ETH Balance Requirement */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Coins className="h-4 w-4 text-blue-500" />
          <Label className="text-sm font-medium">Minimum ETH Balance</Label>
        </div>
        <div className="flex space-x-2">
          <Input
            type="number"
            placeholder="e.g., 1.5"
            value={requirements.minimumETHBalance ? ethers.utils.formatEther(requirements.minimumETHBalance) : ''}
            onChange={(e) => handleETHBalanceChange(e.target.value)}
            disabled={disabled}
            className="text-sm"
          />
          <div className="flex items-center px-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">ETH</span>
          </div>
        </div>
      </div>

      {/* ENS Requirements */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={requirements.requiresENS || false}
            onChange={(e) => onChange({ ...requirements, requiresENS: e.target.checked })}
            disabled={disabled}
            className="h-4 w-4"
          />
          <Label className="text-sm font-medium">Require ENS Name</Label>
        </div>
        {requirements.requiresENS && (
          <Input
            type="text"
            placeholder="e.g., *.eth, *.xyz (comma-separated)"
            value={requirements.ensDomainPatterns?.join(', ') || ''}
            onChange={(e) => {
              const patterns = e.target.value.split(',').map(s => s.trim()).filter(s => s);
              onChange({ ...requirements, ensDomainPatterns: patterns.length ? patterns : undefined });
            }}
            disabled={disabled}
            className="text-sm ml-6"
          />
        )}
      </div>

      {/* EFP Followers */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-blue-500" />
          <Label className="text-sm font-medium">Minimum EFP Followers</Label>
        </div>
        <Input
          type="number"
          placeholder="e.g., 100"
          value={requirements.minimumFollowers || ''}
          onChange={(e) => onChange({ ...requirements, minimumFollowers: e.target.value ? parseInt(e.target.value) : undefined })}
          disabled={disabled}
          className="text-sm"
        />
      </div>

      {/* Token Requirements - Dynamic Lists */}
      <TokenRequirementsSection
        requirements={requirements}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};
```

## 4. Database Integration

### 4.1 Settings Schema Extension

Extend existing `PostSettings` to support Ethereum gating:

```typescript
// Update src/types/settings.ts
interface PostSettings {
  responsePermissions?: {
    // Legacy formats
    upGating?: { enabled: boolean; requirements: UPGatingRequirements; };
    ethereumGating?: { enabled: boolean; requirements: EthereumGatingRequirements; };
    
    // New multi-category format (preferred)
    categories?: GatingCategory[];
    requireAll?: boolean;
    requireAny?: boolean;
  };
}

// Add to union type
type GatingCategoryType = 'universal_profile' | 'ethereum_profile';

interface EthereumGatingCategory extends GatingCategory {
  type: 'ethereum_profile';
  requirements: EthereumGatingRequirements;
}
```

### 4.2 Settings Utilities Extension

Extend `SettingsUtils` for Ethereum gating:

```typescript
// Update src/types/settings.ts SettingsUtils
export const SettingsUtils = {
  // ... existing methods

  /**
   * Checks if post has Ethereum gating enabled
   */
  hasEthereumGating: (settings: PostSettings): boolean => {
    return !!(settings?.responsePermissions?.ethereumGating?.enabled);
  },

  /**
   * Gets Ethereum gating requirements from post settings
   */
  getEthereumGatingRequirements: (settings: PostSettings): EthereumGatingRequirements | null => {
    if (!SettingsUtils.hasEthereumGating(settings)) return null;
    return settings.responsePermissions!.ethereumGating!.requirements;
  },

  /**
   * Checks if post has any gating (UP, Ethereum, or multi-category)
   */
  hasAnyGating: (settings: PostSettings): boolean => {
    return SettingsUtils.hasUPGating(settings) || 
           SettingsUtils.hasEthereumGating(settings) || 
           SettingsUtils.hasMultiCategoryGating(settings);
  }
};
```

## 5. API Service Integrations

### 5.1 ENS Resolution Service

```typescript
// src/lib/ensResolver.ts
export class ENSResolver {
  private provider: ethers.providers.JsonRpcProvider;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://cloudflare-eth.com';
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  async resolveAddress(address: string): Promise<string | null> {
    try {
      return await this.provider.lookupAddress(address);
    } catch (error) {
      console.error('ENS resolution failed:', error);
      return null;
    }
  }

  async resolveAvatar(ensName: string): Promise<string | null> {
    try {
      return await this.provider.getAvatar(ensName);
    } catch (error) {
      console.error('ENS avatar resolution failed:', error);
      return null;
    }
  }

  async validateENSPattern(ensName: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      if (pattern === '*') return true;
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(1);
        return ensName.endsWith(suffix);
      }
      return ensName === pattern;
    });
  }
}
```

### 5.2 EFP Integration Service

```typescript
// src/lib/efpService.ts
export class EFPService {
  private baseUrl = 'https://api.ethfollow.xyz/api/v1';

  async getFollowerStats(address: string): Promise<{ followers: number; following: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${address}/stats`);
      if (!response.ok) throw new Error(`EFP API error: ${response.status}`);
      
      const data = await response.json();
      return {
        followers: data.followers || 0,
        following: data.following || 0
      };
    } catch (error) {
      console.error('EFP stats fetch failed:', error);
      return { followers: 0, following: 0 };
    }
  }

  async checkFollowRelationship(followerAddress: string, targetAddress: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${followerAddress}/following/${targetAddress}`);
      return response.ok;
    } catch (error) {
      console.error('EFP relationship check failed:', error);
      return false;
    }
  }

  async getFollowingList(address: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${address}/following`);
      if (!response.ok) throw new Error(`EFP API error: ${response.status}`);
      
      const data = await response.json();
      return data.map((item: any) => item.address);
    } catch (error) {
      console.error('EFP following list fetch failed:', error);
      return [];
    }
  }
}
```

## 6. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
1. **Create Ethereum types and interfaces**
   - [ ] Define `EthereumGatingRequirements` interface
   - [ ] Extend `GatingCategoryType` union
   - [ ] Update `PostSettings` interface
   - [ ] Extend `SettingsUtils` with Ethereum methods

2. **Implement EthereumProfileRenderer**
   - [ ] Create `src/lib/gating/renderers/EthereumProfileRenderer.tsx`
   - [ ] Implement `CategoryRenderer` interface
   - [ ] Add basic validation and default requirements

3. **Register new category**
   - [ ] Update `src/lib/gating/registerCategories.ts`
   - [ ] Add Ethereum renderer to registry
   - [ ] Test category registration

### Phase 2: Frontend Integration (Week 2)
1. **Create EthereumProfileContext**
   - [ ] Implement wallet connection with Web3-Onboard
   - [ ] Add Ethereum mainnet configuration
   - [ ] Implement connection state management
   - [ ] Add network switching functionality

2. **Implement Display Components**
   - [ ] Create `EthereumDisplayComponent`
   - [ ] Add ENS profile display
   - [ ] Add EFP stats display
   - [ ] Add verification status indicators

3. **Implement Configuration Components**
   - [ ] Create `EthereumConfigComponent`
   - [ ] Add ETH balance requirements UI
   - [ ] Add ENS requirements UI
   - [ ] Add EFP follower requirements UI
   - [ ] Add token requirements UI (ERC-20, ERC-721, ERC-1155)

### Phase 3: Backend Verification (Week 3)
1. **Implement Raw RPC Layer**
   - [ ] Add Ethereum RPC configuration
   - [ ] Implement `rawEthereumCall` function
   - [ ] Add fallback RPC URLs
   - [ ] Test RPC connectivity

2. **Server-Side Verification Functions**
   - [ ] Implement `verifyETHBalance`
   - [ ] Implement `verifyERC20Balance`
   - [ ] Implement `verifyERC721Ownership`
   - [ ] Implement `verifyERC1155Balance`
   - [ ] Implement `verifyENSRequirements`
   - [ ] Implement `verifyEFPRequirements`

3. **API Route Integration**
   - [ ] Extend comment API route to handle Ethereum gating
   - [ ] Add signature verification for Ethereum addresses
   - [ ] Implement comprehensive gating validation
   - [ ] Add error handling and user feedback

### Phase 4: Service Integration (Week 4)
1. **ENS Integration**
   - [ ] Implement ENS resolver service
   - [ ] Add ENS name resolution
   - [ ] Add ENS avatar resolution
   - [ ] Add ENS pattern validation

2. **EFP Integration**
   - [ ] Implement EFP service
   - [ ] Add follower stats fetching
   - [ ] Add follow relationship checking
   - [ ] Add caching for API responses

3. **Token Metadata Services**
   - [ ] Add ERC-20 token metadata fetching
   - [ ] Add ERC-721 collection metadata
   - [ ] Add contract validation
   - [ ] Implement token symbol/name resolution

### Phase 5: Testing & Polish (Week 5)
1. **Unit Testing**
   - [ ] Test all verification functions
   - [ ] Test React components
   - [ ] Test API integrations
   - [ ] Test error scenarios

2. **Integration Testing**
   - [ ] Test full gating flow
   - [ ] Test multi-category scenarios
   - [ ] Test wallet connection flows
   - [ ] Test server-side enforcement

3. **Performance Optimization**
   - [ ] Implement caching for API calls
   - [ ] Optimize RPC call patterns
   - [ ] Add loading states
   - [ ] Implement retry logic

4. **Documentation & Deployment**
   - [ ] Update admin documentation
   - [ ] Create user guides
   - [ ] Deploy to staging
   - [ ] Production rollout

## 7. Technical Considerations

### 7.1 RPC Provider Configuration
- Use multiple RPC providers for redundancy (Infura, Alchemy, CloudFlare)
- Implement rate limiting and caching
- Handle network errors gracefully
- Consider using Multicall for batch operations

### 7.2 Security Considerations
- Validate all contract addresses
- Implement proper signature verification
- Add rate limiting for external API calls
- Handle malicious contract interactions safely

### 7.3 Performance Optimizations
- Cache ENS resolutions for 1 hour
- Cache EFP stats for 5 minutes
- Batch token balance checks where possible
- Implement progressive loading for requirements

### 7.4 Error Handling Strategy
- Graceful degradation when services are unavailable
- Clear user feedback for unmet requirements
- Retry mechanisms for transient failures
- Fallback behaviors for critical functionality

## 8. Migration Strategy

### 8.1 Backward Compatibility
- Support legacy gating formats during transition
- Provide migration utilities for existing posts
- Maintain API compatibility
- Gradual rollout to communities

### 8.2 Feature Flags
- Use feature flags for gradual rollout
- A/B testing for new gating categories
- Community-level enabling/disabling
- Admin controls for feature management

## 9. Success Metrics

### 9.1 Technical Metrics
- API response times < 2 seconds
- RPC call success rate > 99%
- Zero critical security issues
- Client-side verification accuracy > 99%

### 9.2 User Experience Metrics
- Wallet connection success rate > 95%
- User understanding of requirements (survey-based)
- Error resolution time < 30 seconds
- Admin configuration completion rate > 90%

## 10. Future Enhancements

### 10.1 Additional Token Standards
- Support for more exotic token types
- Integration with DeFi protocols
- NFT metadata-based gating
- Cross-chain token verification

### 10.2 Advanced Social Features
- Twitter/X integration via account linking
- GitHub integration for developer communities
- Discord integration for gaming communities
- LinkedIn integration for professional communities

### 10.3 AI-Powered Features
- Automatic spam detection
- Reputation scoring
- Content recommendation based on gating
- Smart requirement suggestions

---

This implementation follows the exact patterns established by Universal Profile gating while adapting to the Ethereum ecosystem. The modular architecture ensures easy maintenance and future extensibility. 