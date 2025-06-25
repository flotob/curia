# Commenter-Side Multi-Category Gating Architecture

## Current State Analysis

### ✅ What We Have (Poster Side)
```
PostGatingControls
    ↓
CategoryRegistry (registerCategories.ts)
    ↓
UniversalProfileRenderer + EthereumProfileRenderer
    ↓
JSON Storage: {"categories": [{"type": "ethereum_profile", "requirements": {...}}]}
```

### ✅ What We Have (Commenter Side - UP Only)
```
NewCommentForm
    ↓ (detects hasUPGating)
InlineUPConnection (hardcoded UP)
    ↓
UPSocialProfile + Web3-Onboard
    ↓
Challenge/Signature System (UP only)
    ↓
Backend Verification (UP only)
```

### ❌ What's Missing (Commenter Side - Multi-Category)
- **Generic Category Detection**: NewCommentForm only checks old `upGating` format
- **Category-Specific UI Components**: No Ethereum connection widget
- **Multi-Category Verification**: Challenge system only supports UP addresses
- **Category-Aware Comment Form**: No way to handle multiple gating requirements
- **Ethereum Wallet Integration**: No MetaMask/WalletConnect support for ETH verification

## Architectural Decision: Extend Category System to Commenter Side

**YES, we should use the category registry pattern on commenter side for these reasons:**

1. **Consistency**: Same abstraction pattern across poster/commenter sides
2. **Extensibility**: Easy to add new gating types (NFT, DAO membership, etc.)
3. **Maintainability**: Category-specific logic encapsulated in renderers
4. **Type Safety**: Leverages existing TypeScript category interfaces

## Proposed Architecture

### 1. Enhanced Category Renderer Interface

```typescript
// Extend existing CategoryRenderer to include commenter-side methods
interface CategoryRenderer {
  // Existing poster-side methods
  getMetadata(): GatingCategoryMetadata;
  getDefaultRequirements(): unknown;
  renderDisplay(props: CategoryRendererProps): ReactNode;
  renderConfig(props: CategoryConfigProps): ReactNode;
  
  // NEW: Commenter-side methods
  renderConnection(props: CategoryConnectionProps): ReactNode;
  generateChallenge(address: string, postId: number): Promise<VerificationChallenge>;
  verifyRequirements(address: string, requirements: unknown): Promise<VerificationResult>;
  validateSignature(challenge: VerificationChallenge): Promise<boolean>;
}

// New props interface for connection UI
interface CategoryConnectionProps {
  requirements: unknown;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  userStatus?: VerificationStatus;
  disabled?: boolean;
}
```

### 2. Generic Multi-Category Connection Component

Replace hardcoded `InlineUPConnection` with:

```typescript
// src/components/gating/MultiCategoryConnection.tsx
interface MultiCategoryConnectionProps {
  postSettings: PostSettings;
  onVerificationComplete: (challenges: VerificationChallenge[]) => void;
  disabled?: boolean;
}

export const MultiCategoryConnection: React.FC<MultiCategoryConnectionProps> = ({
  postSettings,
  onVerificationComplete,
  disabled
}) => {
  const [activeConnections, setActiveConnections] = useState<Map<string, ConnectionState>>();
  const [verificationResults, setVerificationResults] = useState<Map<string, VerificationResult>>();
  
  // Get all enabled categories from post settings
  const activeCategories = SettingsUtils.getGatingCategories(postSettings);
  const requireAll = postSettings.responsePermissions?.requireAll || false;
  
  // For each category, render its connection component
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center text-sm">
          <Shield className="h-4 w-4 mr-2" />
          Verification Required
        </CardTitle>
        <CardDescription>
          {requireAll 
            ? `You must satisfy ALL ${activeCategories.length} requirements to comment`
            : `You must satisfy ANY of ${activeCategories.length} requirements to comment`
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {activeCategories.map((category) => {
          const renderer = categoryRegistry.get(category.type);
          if (!renderer) return null;
          
          return (
            <div key={category.type} className="border rounded-lg p-4">
              {renderer.renderConnection({
                requirements: category.requirements,
                onConnect: () => handleCategoryConnect(category.type),
                onDisconnect: () => handleCategoryDisconnect(category.type),
                userStatus: verificationResults.get(category.type),
                disabled
              })}
            </div>
          );
        })}
        
        {/* Overall status and submit button */}
        <CategoryVerificationSummary 
          categories={activeCategories}
          results={verificationResults}
          requireAll={requireAll}
          onSubmit={handleVerificationSubmit}
        />
      </CardContent>
    </Card>
  );
};
```

### 3. Enhanced Verification Challenge System

```typescript
// src/lib/verification/multiCategoryChallenge.ts

// Enhanced challenge structure
interface VerificationChallenge {
  // Challenge metadata
  nonce: string;
  timestamp: number;
  postId: number;
  chainId: number;
  
  // Multi-category support
  categories: Array<{
    type: string;                    // 'universal_profile' | 'ethereum_profile'
    address: string;                 // Address for this category
    signature?: string;              // Category-specific signature
    requirements: unknown;           // Category-specific requirements to verify
  }>;
  
  // Overall verification mode
  requireAll: boolean;               // Whether all categories must pass or just one
}

export class MultiCategoryVerifier {
  
  static async generateChallenges(
    postSettings: PostSettings,
    connectedCategories: Map<string, string> // categoryType -> address
  ): Promise<VerificationChallenge> {
    
    const activeCategories = SettingsUtils.getGatingCategories(postSettings);
    const categoryData: VerificationChallenge['categories'] = [];
    
    // Generate challenge data for each connected category
    for (const category of activeCategories) {
      const address = connectedCategories.get(category.type);
      if (!address) continue; // Skip if user hasn't connected this category
      
      const renderer = categoryRegistry.get(category.type);
      if (!renderer) continue;
      
      // Each category renderer generates its own challenge data
      const categoryChallenge = await renderer.generateChallenge(address, postId);
      categoryData.push({
        type: category.type,
        address,
        requirements: category.requirements
      });
    }
    
    return {
      nonce: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now(),
      postId,
      chainId: 42, // LUKSO by default, but categories can override
      categories: categoryData,
      requireAll: postSettings.responsePermissions?.requireAll || false
    };
  }
  
  static async verifyChallenge(
    challenge: VerificationChallenge,
    postSettings: PostSettings
  ): Promise<{ valid: boolean; error?: string }> {
    
    const requiredCategories = SettingsUtils.getGatingCategories(postSettings);
    const errors: string[] = [];
    let validCount = 0;
    
    // Verify each category in the challenge
    for (const categoryData of challenge.categories) {
      const renderer = categoryRegistry.get(categoryData.type);
      if (!renderer) {
        errors.push(`Unknown category type: ${categoryData.type}`);
        continue;
      }
      
      // Verify signature for this category
      const signatureValid = await renderer.validateSignature({
        ...challenge,
        address: categoryData.address,
        signature: categoryData.signature
      });
      
      if (!signatureValid) {
        errors.push(`Invalid signature for ${categoryData.type}`);
        continue;
      }
      
      // Verify requirements for this category
      const requirementsValid = await renderer.verifyRequirements(
        categoryData.address,
        categoryData.requirements
      );
      
      if (requirementsValid.isValid) {
        validCount++;
      } else {
        errors.push(`${categoryData.type}: ${requirementsValid.missingRequirements.join(', ')}`);
      }
    }
    
    // Check if verification passes based on requireAll mode
    const passes = challenge.requireAll 
      ? validCount === requiredCategories.length
      : validCount > 0;
      
    return {
      valid: passes,
      error: passes ? undefined : errors.join('; ')
    };
  }
}
```

### 4. Category-Specific Implementations

#### A. Enhanced Universal Profile Renderer

```typescript
// src/lib/gating/renderers/UniversalProfileRenderer.tsx

export class UniversalProfileRenderer implements CategoryRenderer {
  
  // NEW: Commenter-side connection UI
  renderConnection(props: CategoryConnectionProps): ReactNode {
    return (
      <UPConnectionWidget
        requirements={props.requirements as UPGatingRequirements}
        onConnect={props.onConnect}
        onDisconnect={props.onDisconnect}
        userStatus={props.userStatus}
        disabled={props.disabled}
      />
    );
  }
  
  // NEW: Challenge generation for UP
  async generateChallenge(upAddress: string, postId: number): Promise<Partial<VerificationChallenge>> {
    return {
      // UP-specific challenge data
      chainId: 42, // LUKSO
      categories: [{
        type: 'universal_profile',
        address: upAddress,
        requirements: {} // Will be filled by caller
      }]
    };
  }
  
  // NEW: Server-side requirement verification
  async verifyRequirements(upAddress: string, requirements: UPGatingRequirements): Promise<VerificationResult> {
    // Existing UP verification logic, but wrapped in new interface
    return await verifyUPGatingRequirements(upAddress, requirements);
  }
  
  // NEW: UP signature validation
  async validateSignature(challenge: VerificationChallenge): Promise<boolean> {
    // Use existing ERC-1271 validation logic
    return await verifyUPSignature(challenge.address, challenge);
  }
}
```

#### B. New Ethereum Profile Renderer

```typescript
// src/lib/gating/renderers/EthereumProfileRenderer.tsx

export class EthereumProfileRenderer implements CategoryRenderer {
  
  renderConnection(props: CategoryConnectionProps): ReactNode {
    return (
      <EthereumConnectionWidget
        requirements={props.requirements as EthereumGatingRequirements}
        onConnect={props.onConnect}
        onDisconnect={props.onDisconnect}
        userStatus={props.userStatus}
        disabled={props.disabled}
      />
    );
  }
  
  async generateChallenge(ethAddress: string, postId: number): Promise<Partial<VerificationChallenge>> {
    return {
      chainId: 1, // Ethereum Mainnet
      categories: [{
        type: 'ethereum_profile',
        address: ethAddress,
        requirements: {} // Will be filled by caller
      }]
    };
  }
  
  async verifyRequirements(ethAddress: string, requirements: EthereumGatingRequirements): Promise<VerificationResult> {
    // Use existing Ethereum verification logic
    return await verifyEthereumGatingRequirements(ethAddress, requirements);
  }
  
  async validateSignature(challenge: VerificationChallenge): Promise<boolean> {
    // Standard ECDSA signature validation for Ethereum
    return await verifyEthereumSignature(challenge.address, challenge);
  }
}
```

### 5. Wallet Integration Architecture

#### Universal Profile Integration (Existing)
```typescript
// Keep existing Web3-Onboard + UP Social Profile integration
// Already works via useConditionalUniversalProfile hook
```

#### Ethereum Wallet Integration (New)
```typescript
// src/contexts/EthereumProfileContext.tsx
export const EthereumProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [efpData, setEfpData] = useState<EFPProfileData | null>(null);
  
  // Use wagmi/viem for Ethereum wallet connection
  const { address, isConnected } = useAccount();
  const { signMessage } = useSignMessage();
  
  const connectEthereumWallet = async () => {
    // Connect via WalletConnect/MetaMask
    // Resolve ENS name if available
    // Fetch EFP profile data
  };
  
  return (
    <EthereumProfileContext.Provider value={{
      ethAddress,
      ensName,
      efpData,
      isConnected,
      signMessage,
      connectWallet: connectEthereumWallet,
      disconnect: disconnectEthereumWallet
    }}>
      {children}
    </EthereumProfileContext.Provider>
  );
};
```

### 6. Updated NewCommentForm Integration

```typescript
// src/components/voting/NewCommentForm.tsx
export const NewCommentForm: React.FC<NewCommentFormProps> = ({ postId, post }) => {
  
  // Detect ANY gating (old or new format)
  const hasGating = post ? SettingsUtils.hasAnyGating(post.settings) : false;
  const [verificationChallenges, setVerificationChallenges] = useState<VerificationChallenge[]>([]);
  
  const handleVerificationComplete = (challenges: VerificationChallenge[]) => {
    setVerificationChallenges(challenges);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let challengeData: VerificationChallenge | undefined;
    
    if (hasGating) {
      if (verificationChallenges.length === 0) {
        setError('Please complete verification requirements to comment.');
        return;
      }
      
      // Use the first valid challenge (or combine them)
      challengeData = verificationChallenges[0];
    }
    
    // Submit comment with challenge data
    submitCommentMutation.mutate({
      content: editorContent,
      parentCommentId,
      challenge: challengeData
    });
  };
  
  // Show verification UI if gating is enabled and user hasn't verified
  if (hasGating && verificationChallenges.length === 0) {
    return (
      <div className="mt-6">
        <MultiCategoryConnection
          postSettings={post.settings}
          onVerificationComplete={handleVerificationComplete}
        />
      </div>
    );
  }
  
  // Show normal comment form
  return (
    <Card>
      {/* Normal comment form UI */}
      {hasGating && verificationChallenges.length > 0 && (
        <VerificationStatusBadge challenges={verificationChallenges} />
      )}
    </Card>
  );
};
```

### 7. Backend API Updates

```typescript
// src/app/api/posts/[postId]/comments/route.ts

async function createCommentHandler(req: AuthenticatedRequest, context: RouteContext) {
  const { content, parentCommentId, challenge }: {
    content: string;
    parentCommentId?: number;
    challenge?: VerificationChallenge; // Multi-category challenge
  } = await req.json();
  
  // Check if post has any gating
  if (SettingsUtils.hasAnyGating(postSettings)) {
    if (!challenge) {
      return NextResponse.json({ 
        error: 'This post requires verification to comment' 
      }, { status: 403 });
    }
    
    // Use new multi-category verification
    const verificationResult = await MultiCategoryVerifier.verifyChallenge(
      challenge, 
      postSettings
    );
    
    if (!verificationResult.valid) {
      return NextResponse.json({ 
        error: `Verification failed: ${verificationResult.error}` 
      }, { status: 403 });
    }
  }
  
  // Create comment - verification passed
  return createComment(content, postId, userId, parentCommentId);
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] **Enhanced CategoryRenderer Interface**
  - Add `renderConnection`, `generateChallenge`, `verifyRequirements`, `validateSignature` methods
  - Update existing renderers to implement new methods
  
- [ ] **Multi-Category Challenge System**
  - Create `MultiCategoryVerifier` class
  - Update `VerificationChallenge` interface for multi-category support
  - Add nonce management for multiple categories

- [ ] **Generic Connection Component**
  - Create `MultiCategoryConnection` component
  - Replace hardcoded `InlineUPConnection` usage
  - Add category-specific UI routing

### Phase 2: Ethereum Integration (Week 2)
- [ ] **Ethereum Wallet Context**
  - Set up wagmi/viem for Ethereum wallet connection
  - Add MetaMask/WalletConnect support
  - Implement ENS resolution and EFP profile fetching
  
- [ ] **Ethereum Connection Widget**
  - Create `EthereumConnectionWidget` component
  - Add ENS verification UI
  - Add ERC-20/721/1155 requirement display

- [ ] **Ethereum Verification**
  - Implement Ethereum signature validation
  - Add server-side Ethereum requirement verification
  - Integration with existing `verifyEthereumGatingRequirements`

### Phase 3: Integration & Polish (Week 3)
- [ ] **NewCommentForm Updates**
  - Replace UP-specific logic with multi-category logic
  - Add verification status display
  - Handle multiple challenge submission

- [ ] **Backend API Updates**
  - Update challenge generation endpoint for multi-category
  - Update comment creation endpoint for multi-category verification
  - Add comprehensive error handling

- [ ] **Testing & Documentation**
  - Unit tests for all new components
  - Integration tests for verification flows
  - Update documentation and examples

## Dependencies Required

### New Dependencies
```bash
# Ethereum wallet integration
npm install wagmi viem @wagmi/core

# ENS and EFP support (already researched)
npm install @ethereum-identity-kit/core @ethereum-identity-kit/react

# Additional utility libraries
npm install @tanstack/react-query@4 # For caching wallet state
```

### Existing Dependencies (Already Available)
- `ethers@5.x` - For signature validation and blockchain calls
- `@erc725/erc725.js` - For UP profile data
- `@lukso/lsp-smart-contracts` - For LSP standard interfaces
- `@web3-onboard/react` - For UP wallet connection

## Migration Strategy

### Backward Compatibility
1. **Dual Format Support**: Continue supporting old `upGating` format during transition
2. **Graceful Fallback**: If category renderer fails, fall back to basic verification
3. **Progressive Enhancement**: New features work alongside existing UP verification

### Migration Steps
1. **Phase 1**: Deploy enhanced renderers with backward compatibility
2. **Phase 2**: Add Ethereum support while keeping UP working
3. **Phase 3**: Migrate all verification flows to new system
4. **Phase 4**: Remove legacy `upGating` support (future)

## Risk Assessment

### High Risk ⚠️
- **Signature Validation**: Different signature schemes for UP vs Ethereum
- **Multi-Chain Complexity**: Managing LUKSO + Ethereum state simultaneously
- **User Experience**: Multiple wallet connections may confuse users

### Medium Risk ⚡
- **Performance**: Multiple blockchain calls for verification
- **Error Handling**: Complex failure states with multiple categories
- **Testing**: Integration testing across multiple wallet types

### Low Risk ✅
- **Architecture**: Extending existing proven patterns
- **Type Safety**: Full TypeScript coverage
- **Maintainability**: Category system provides good separation of concerns

## Success Metrics

### Technical Goals
- [ ] Zero breaking changes to existing UP verification
- [ ] <2 second verification time for typical requirements
- [ ] 100% TypeScript coverage for new components
- [ ] Comprehensive error handling for all failure modes

### User Experience Goals
- [ ] Clear indication of what verification is required
- [ ] Intuitive connection flow for each wallet type
- [ ] Helpful error messages for failed verification
- [ ] Consistent UI/UX across all gating categories

### Business Goals
- [ ] Support for Ethereum ecosystem gating (ENS, EFP, NFTs)
- [ ] Foundation for future gating types (DAO membership, etc.)
- [ ] Maintainable codebase that scales with new requirements

## Next Steps - Immediate Action Plan

### 🎯 TODAY: Start with CategoryRenderer Enhancement
1. **Update CategoryRenderer Interface** (30 minutes)
   - Add new commenter-side methods to interface
   - Update existing renderers with stub implementations

2. **Create MultiCategoryConnection Component** (2 hours)
   - Basic component structure
   - Integration with category registry
   - Simple connection state management

3. **Test with Existing UP Categories** (1 hour)
   - Verify backward compatibility
   - Test with existing UP gating posts
   - Ensure no breaking changes

### 🔧 TOMORROW: Multi-Category Challenge System
1. **Enhanced VerificationChallenge Interface** (1 hour)
2. **MultiCategoryVerifier Implementation** (2 hours)
3. **Update NewCommentForm Integration** (1 hour)

### 📋 Definition of Done for Phase 1
- [ ] Existing UP verification works through new category system
- [ ] MultiCategoryConnection renders UP connection widget correctly
- [ ] No breaking changes to existing functionality
- [ ] Foundation ready for Ethereum integration

This approach ensures we build on the solid foundation you've already created while extending it in a maintainable, type-safe way that will scale to support additional gating mechanisms in the future. 