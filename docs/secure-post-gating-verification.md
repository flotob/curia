# Secure Post Gating Verification System

## Current State Analysis

### What We Have ✅
- **Database Schema**: Posts with jsonb settings field storing UP gating requirements
- **Frontend UI**: PostGatingControls for setting LYX/token requirements  
- **UP Integration**: Universal Profile connection with Web3-Onboard + ethers.js
- **Basic Verification**: Frontend LYX balance checking via `getLyxBalance()`
- **Type System**: Complete TypeScript interfaces for PostSettings, TokenRequirement, etc.

### What's Missing ❌
- **Comment Enforcement**: Actual blocking mechanism in NewCommentForm
- **Backend Verification**: Server-side validation of UP requirements
- **Security**: Frontend verification can be bypassed with dev tools
- **Signed Challenges**: Cryptographic proof of requirement fulfillment

## Security Requirements

### Attack Vectors to Address
1. **Client-Side Bypass**: User modifies JavaScript to skip verification
2. **Fake Balances**: User manipulates frontend state to fake token ownership
3. **Network Spoofing**: User provides fake RPC responses
4. **Replay Attacks**: User reuses old valid proofs
5. **Address Spoofing**: User claims to own a different UP address

### Security Goals
1. **Cryptographic Proof**: User must sign a challenge proving UP ownership
2. **Fresh Verification**: Server independently verifies requirements on-chain
3. **Replay Protection**: Challenges must be time-limited and single-use
4. **Complete Validation**: Server checks both signature and requirements

## Proposed Architecture: Signed Challenge System

### High-Level Flow
```
1. User attempts to comment on gated post
2. Frontend checks requirements (instant feedback)
3. If requirements met, generate verification challenge
4. User signs challenge with UP (wallet prompt)
5. Frontend submits comment + signed challenge
6. Backend verifies signature + independently checks requirements
7. Comment accepted/rejected based on server verification
```

### Challenge Structure
```typescript
interface VerificationChallenge {
  // Challenge metadata
  nonce: string;           // Random nonce for replay protection
  timestamp: number;       // Unix timestamp for expiry
  postId: number;          // Post being commented on
  upAddress: string;       // Universal Profile address
  
  // Required proofs
  requirements: {
    lyxBalance?: {
      minAmount: string;   // Wei amount required
      blockNumber?: number; // Optional: specific block for verification
    };
    tokens?: Array<{
      contractAddress: string;
      tokenType: 'LSP7' | 'LSP8';
      minAmount?: string;
      tokenId?: string;
    }>;
  };
  
  // Signature data
  signature?: string;      // User's signature of challenge
  signingMethod: 'personal_sign' | 'typed_data_v4';
}
```

### Verification Library Architecture

**Shared Module**: `src/lib/verification/upGatingVerification.ts`
```typescript
// Shared between frontend and backend
export class UPGatingVerifier {
  // Challenge generation
  static generateChallenge(postSettings: PostSettings, upAddress: string): VerificationChallenge
  
  // Frontend verification (UX feedback)
  async verifyRequirementsFrontend(challenge: VerificationChallenge): Promise<VerificationResult>
  
  // Backend verification (security enforcement)  
  async verifyRequirementsBackend(challenge: VerificationChallenge): Promise<VerificationResult>
  
  // Signature validation
  static validateSignature(challenge: VerificationChallenge): boolean
  
  // Challenge validation (nonce, timestamp, etc.)
  static validateChallenge(challenge: VerificationChallenge): boolean
}
```

## Key Technical Insights from Research

### 🔐 Signature Verification (Critical)
```typescript
// ❌ WRONG: Don't use simple ECDSA recovery for UPs
const recovered = ethers.utils.verifyMessage(message, signature);

// ✅ CORRECT: Use UP's ERC-1271 isValidSignature()
const profile = new ethers.Contract(upAddress, LSP0ABI, provider);
const hash = ethers.utils.hashMessage(challengeString);
const result = await profile.isValidSignature(hash, signature);
const isValid = result === '0x1626ba7e';
```

### 📝 Challenge Message Format
```typescript
// Include UP address + chain ID to prevent replay attacks
const challengeMessage = `LUKSO Common Ground Comment Challenge:

Profile: ${upAddress}
PostID: ${postId}
Nonce: ${nonce}
Chain: 42 (LUKSO Mainnet)
Issued At: ${new Date().toISOString()}

Sign this message to prove you own the profile and meet the requirements to comment.`;
```

### 🎯 LSP5 Asset Discovery Optimization
```typescript
// ✅ Efficient: Check UP's asset registry first
const erc725 = new ERC725([], upAddress, provider);
const receivedAssets = await erc725.getData('LSP5ReceivedAssets[]');

// Only call balanceOf() on tokens the user actually holds
if (receivedAssets.includes(tokenAddress)) {
  const balance = await token.balanceOf(upAddress);
}
```

### ⚡ Performance Pattern
```typescript
// ✅ Parallel verification for multiple requirements
const [lyxBalance, token1Balance, token2Balance] = await Promise.all([
  provider.getBalance(upAddress),
  token1.balanceOf(upAddress),
  token2.balanceOf(upAddress)
]);
```

## Implementation Strategy - UPDATED

### Phase 1A: Basic Challenge Infrastructure (1-2 days)
**Goal**: Set up the secure challenge-response system with LYX-only verification

**Frontend:**
- Create shared challenge message format with UP address + chain ID + nonce
- Add challenge generation in `NewCommentForm.tsx`
- Implement EIP-191 signature request via `signMessage()`

**Backend:**
- Add challenge validation endpoint
- Implement ERC-1271 signature verification using UP's `isValidSignature()`
- Basic nonce tracking with in-memory cache

**Shared Library:**
- Create `src/lib/verification/challengeUtils.ts` for message formatting
- Challenge expiry validation (5 minutes)

### Phase 1B: LYX Balance Verification (1-2 days)  
**Goal**: Complete LYX gating with backend enforcement

**Backend:**
- Independent LYX balance checking via `provider.getBalance()`
- Update comments API to enforce gating requirements
- Error handling for RPC failures

**Frontend:**
- Block comment submission for insufficient LYX
- Clear error messages and user guidance
- Loading states during verification

### Phase 1C: Production Hardening (1-2 days)
**Goal**: Make the LYX system production-ready

**Security:**
- Rate limiting for challenge requests
- Multiple RPC provider fallback
- Comprehensive error handling

**UX:**
- Optimistic frontend balance checking
- Clear requirement display
- Testnet support for development

### Phase 2: LSP7/LSP8 Token Support (3-4 days)
**Goal**: Add full token verification using LUKSO standards

**Core Features:**
- LSP5-ReceivedAssets for asset discovery
- Proper LSP7/LSP8 interface detection
- Parallel token verification calls

### Phase 3: Performance & Polish (2-3 days)
**Goal**: Optimize for production scale

**Optimizations:**
- 30-60 second caching with TTL
- Multicall for batch verification
- Frontend asset caching on UP connect

## Technical Implementation Details

### Frontend Verification Flow
```typescript
// In NewCommentForm.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Check if post has gating enabled
  const postSettings = await getPostSettings(postId);
  if (!SettingsUtils.hasUPGating(postSettings)) {
    // No gating - submit normally
    return submitComment(content);
  }
  
  // Generate and sign challenge
  const challenge = UPGatingVerifier.generateChallenge(postSettings, upAddress);
  const signature = await signChallenge(challenge);
  challenge.signature = signature;
  
  // Submit comment with signed challenge
  return submitGatedComment(content, challenge);
};
```

### Backend Verification Flow  
```typescript
// In /api/posts/[postId]/comments/route.ts
export async function POST(req: AuthenticatedRequest) {
  const { content, challenge } = await req.json();
  
  // Basic validation
  if (!UPGatingVerifier.validateChallenge(challenge)) {
    return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
  }
  
  // Verify signature
  if (!UPGatingVerifier.validateSignature(challenge)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Independent verification of requirements
  const verifier = new UPGatingVerifier(luksoRpcProvider);
  const result = await verifier.verifyRequirementsBackend(challenge);
  
  if (!result.isValid) {
    return NextResponse.json({ 
      error: 'Requirements not met', 
      details: result.missingRequirements 
    }, { status: 403 });
  }
  
  // Requirements verified - create comment
  return createComment(content, postId, userId);
}
```

### Shared Verification Engine
```typescript
// src/lib/verification/upGatingVerification.ts
export class UPGatingVerifier {
  private provider: ethers.providers.Provider;
  
  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }
  
  async verifyLyxBalance(
    upAddress: string, 
    minAmount: string, 
    blockNumber?: number
  ): Promise<boolean> {
    const balance = await this.provider.getBalance(
      upAddress, 
      blockNumber || 'latest'
    );
    return balance.gte(ethers.BigNumber.from(minAmount));
  }
  
  async verifyTokenRequirements(
    upAddress: string,
    requirements: TokenRequirement[]
  ): Promise<VerificationResult> {
    // Implementation using proper LSP7/LSP8 detection
    // and ERC725.js for UP asset discovery
  }
}
```

## Security Considerations

### Nonce Management
```typescript
// Backend nonce tracking
interface ChallengeNonce {
  nonce: string;
  upAddress: string;
  postId: number;
  createdAt: Date;
  used: boolean;
}

// Prevent replay attacks
const CHALLENGE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const isNonceValid = (nonce: ChallengeNonce) => {
  return !nonce.used && (Date.now() - nonce.createdAt.getTime()) < CHALLENGE_EXPIRY;
};
```

### Signature Validation
```typescript
// Validate challenge signature
static validateSignature(challenge: VerificationChallenge): boolean {
  const message = this.createSigningMessage(challenge);
  const recoveredAddress = ethers.utils.verifyMessage(message, challenge.signature);
  
  // For UPs, need to verify the recovered address is authorized
  // This requires checking the UP's Key Manager (LSP6) for authorized keys
  return this.isAuthorizedSigner(challenge.upAddress, recoveredAddress);
}
```

### Rate Limiting
```typescript
// Prevent spam challenges
const RATE_LIMIT = {
  maxChallenges: 10,    // Max challenges per hour
  maxComments: 5,       // Max gated comments per hour  
  windowMs: 60 * 60 * 1000 // 1 hour window
};
```

## User Experience Considerations

### Frontend UX Flow
1. **Seamless for Qualified Users**: If user meets requirements, show normal comment form
2. **Clear Requirements Display**: Show what's needed if user doesn't qualify
3. **Progressive Enhancement**: Form works normally for non-gated posts
4. **Error Handling**: Clear feedback for verification failures
5. **Loading States**: Show verification in progress

### Error Messages
```typescript
const ERROR_MESSAGES = {
  NOT_CONNECTED: "Connect your Universal Profile to comment on this post",
  INSUFFICIENT_LYX: "You need at least {amount} LYX to comment on this post",
  MISSING_TOKEN: "You need {tokenName} to comment on this post", 
  WRONG_NETWORK: "Switch to LUKSO network to verify requirements",
  VERIFICATION_FAILED: "Unable to verify requirements. Please try again.",
  SIGNATURE_REQUIRED: "Sign the verification challenge to prove requirements"
};
```

### UI Components
```typescript
// New components needed
<RequirementsDisplay postSettings={postSettings} userStatus={verificationResult} />
<VerificationChallenge onSigned={handleSignedChallenge} />
<GatedCommentForm postId={postId} requirements={requirements} />
```

## Performance Optimizations

### Caching Strategy
- **Frontend**: Cache verification results for 60 seconds
- **Backend**: Cache UP balances for 30 seconds with Redis
- **Challenges**: Pre-generate challenge templates

### Efficient Verification
- **Parallel Checks**: Verify LYX and tokens simultaneously
- **Early Exit**: Stop verification on first failed requirement
- **Batch RPC**: Use multicall for multiple token checks

## Testing Strategy

### Unit Tests
- Challenge generation and validation
- Signature verification logic  
- Requirement checking algorithms
- Error handling and edge cases

### Integration Tests
- Full frontend verification flow
- Backend API verification
- UP connection and signing
- Real LUKSO mainnet testing

### Security Tests
- Replay attack prevention
- Signature forgery attempts
- Nonce reuse detection
- Rate limiting enforcement

## Migration Plan

### Phase 1 Implementation (Week 1)
- [ ] Create shared verification library
- [ ] Implement basic LYX challenge system
- [ ] Add frontend verification UI
- [ ] Backend API challenge validation
- [ ] Nonce tracking system

### Phase 2 Enhancement (Week 2)  
- [ ] LSP7/LSP8 token support
- [ ] ERC725.js integration
- [ ] Proper interface detection
- [ ] Performance optimizations

### Phase 3 Polish (Week 3)
- [ ] Advanced caching
- [ ] Rate limiting
- [ ] Comprehensive testing
- [ ] Documentation

## Open Questions

1. **Signature Method**: Personal sign vs TypedData v4 for challenges?
2. **Block Number**: Should challenges specify exact block for verification?
3. **Fallback Strategy**: What if UP extension unavailable? 
4. **Gas Considerations**: How to handle verification costs?
5. **Multi-Network**: Support testnet for development?

## Next Steps - IMMEDIATE ACTION PLAN

### 🎯 Phase 1A: Start with Challenge Infrastructure (TODAY)

**Step 1** (30 minutes): Create the shared challenge utility
- [ ] Create `src/lib/verification/challengeUtils.ts`
- [ ] Implement secure challenge message generation
- [ ] Add nonce generation with crypto.randomBytes

**Step 2** (1 hour): Add challenge generation to frontend
- [ ] Modify `NewCommentForm.tsx` to detect gated posts
- [ ] Add challenge generation before comment submission
- [ ] Implement signature request with error handling

**Step 3** (1 hour): Basic backend validation setup
- [ ] Add challenge validation to comments API
- [ ] Implement ERC-1271 signature verification
- [ ] Add in-memory nonce tracking

### 🔧 Required Dependencies
```bash
# Already installed:
# - ethers@5.x
# - @erc725/erc725.js

# May need to add:
npm install @lukso/lsp-smart-contracts
```

### 📋 Definition of Done for Phase 1A
- [ ] User can sign a challenge when commenting on gated posts
- [ ] Backend validates signature using UP's `isValidSignature()`
- [ ] Nonce prevents replay attacks
- [ ] Clear error messages for validation failures

**Timeline**: Complete Phase 1A today, then assess before moving to Phase 1B

This approach keeps us focused on proving the security model first, then building on that foundation.

This architecture provides a secure, scalable foundation for post gating that can be extended to support additional verification types and requirements in the future. 