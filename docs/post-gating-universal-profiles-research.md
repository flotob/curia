# Universal Profile Post Gating Integration Research & Strategic Plan

## Project Overview & Understanding

### What We Want to Achieve

We're implementing **post-level response gating** using **Universal Profiles (LUKSO/LSP standards)** as the first third-party integration for access control. This extends our existing hierarchical permission system:

**Current:** Community → Board → Post (content only)  
**New:** Community → Board → Post (content + UP-based response rules)

### MVP Requirements

1. **UI Integration:** Add gating controls below the "tags" field in post creation forms
2. **Token-Based Gating:** Users can set requirements for responders such as:
   - Minimum LYX balance on connected Universal Profile
   - Specific amounts of LSP7/LSP8 tokens required
3. **Verification:** Check conditions before allowing comments/responses
4. **User Experience:** Seamless integration with existing authentication and permission systems

## Current Architecture Analysis

### Database Schema Integration

The new migration adds a `settings` jsonb field to the `posts` table, following established patterns from `communities` and `boards` tables:

```sql
-- New field structure
ALTER TABLE posts ADD COLUMN settings jsonb NOT NULL DEFAULT '{}';
CREATE INDEX posts_settings_index ON posts USING gin (settings);
```

**Expected Post Settings Structure:**
```json
{
  "responsePermissions": {
    "upGating": {
      "enabled": true,
      "requirements": {
        "minLyxBalance": "100000000000000000000", // 100 LYX in wei
        "requiredTokens": [
          {
            "contractAddress": "0x...",
            "tokenType": "LSP7", // or "LSP8"
            "minAmount": "1000000000000000000000", // For LSP7
            "tokenId": "123" // For LSP8 (specific NFT)
          }
        ]
      }
    }
  }
}
```

### Existing Permission System

Our current system uses:
- **JWT authentication** with user roles and admin status
- **Board-level permissions** via `src/lib/boardPermissions.ts`
- **Real-time Socket.IO** events with permission-aware rooms
- **TypeScript types** in `src/types/settings.ts`

### Frontend Components

Key components to modify:
- `src/components/voting/NewPostForm.tsx` (collapsed form)
- `src/components/voting/ExpandedNewPostForm.tsx` (expanded form)
- `src/components/voting/NewCommentForm.tsx` (response gating check)

## Universal Profile Integration Strategy

### Authentication Flow

Based on the LUKSO research document, we'll implement:

1. **UP Connection:** Use Web3-Onboard with `@lukso/web3-onboard-config`
2. **Provider Integration:** Connect to LUKSO Universal Profile browser extension
3. **Address Capture:** Store connected UP address in user session/context
4. **Verification Context:** Pass UP address to gating checks

### Token Verification Implementation

**Frontend Approach (Recommended for MVP):**
```typescript
// Using ERC725.js and ethers.js for direct verification
import { ERC725 } from '@erc725/erc725.js';
import LSP5Schema from '@erc725/erc725.js/schemas/LSP5ReceivedAssets.json';

async function verifyTokenRequirements(
  upAddress: string, 
  requirements: TokenRequirement[]
): Promise<{ isValid: boolean; missingRequirements: string[] }> {
  // 1. Get UP's asset list via LSP5-ReceivedAssets
  // 2. Check LYX balance via provider.getBalance()
  // 3. For each required token, verify ownership and amounts
  // 4. Return verification result
}
```

**Benefits of Frontend Approach:**
- Direct blockchain interaction (no intermediary servers)
- Real-time verification when user attempts to comment
- Leverages user's connected wallet/extension
- Simpler infrastructure requirements

### Gating Points Integration

**Comment Creation Intercept:**
- Modify `NewCommentForm.tsx` to check post settings before submission
- If UP gating enabled, trigger verification flow
- Show appropriate UI feedback (requirements, verification status)

**API Protection:**
- Add server-side validation in `/api/posts/[postId]/comments/route.ts`
- Verify post settings before accepting comment creation
- Return appropriate error messages for failed gating

## Technical Implementation Plan

### Phase 1: Basic Infrastructure

1. **Extend Type System**
   ```typescript
   // src/types/settings.ts
   export interface PostSettings {
     responsePermissions?: {
       upGating?: {
         enabled: boolean;
         requirements: {
           minLyxBalance?: string; // Wei string
           requiredTokens?: TokenRequirement[];
         };
       };
     };
   }
   ```

2. **Universal Profile Context**
   ```typescript
   // src/contexts/UniversalProfileContext.tsx
   interface UPContextType {
     isConnected: boolean;
     upAddress: string | null;
     connect: () => Promise<void>;
     disconnect: () => void;
     verifyRequirements: (requirements: any) => Promise<boolean>;
   }
   ```

3. **Post Settings Database Integration**
   - Modify post creation API to handle settings field
   - Update `ApiPost` interface to include settings
   - Ensure settings are returned in post queries

### Phase 2: UI Components

1. **Post Gating Controls Component**
   ```typescript
   // src/components/posting/PostGatingControls.tsx
   interface PostGatingControlsProps {
     value: PostSettings['responsePermissions'];
     onChange: (value: PostSettings['responsePermissions']) => void;
     disabled?: boolean;
   }
   ```

2. **Form Integration**
   - Add gating controls to both NewPostForm variants
   - Include settings in post creation payload
   - Form validation for gating requirements

3. **Comment Gating UI**
   - Pre-comment verification flow
   - Requirements display for restricted posts
   - Connect UP button/flow integration

### Phase 3: Verification Engine

1. **UP Token Verification Service**
   ```typescript
   // src/lib/universalProfileVerification.ts
   export class UPVerificationService {
     async verifyLyxBalance(upAddress: string, minBalance: string): Promise<boolean>
     async verifyTokenOwnership(upAddress: string, requirements: TokenRequirement[]): Promise<VerificationResult>
     async verifyAllRequirements(upAddress: string, settings: PostSettings): Promise<boolean>
   }
   ```

2. **Comment Form Integration**
   - Pre-submit verification in NewCommentForm
   - Real-time requirement checking
   - Error handling and user guidance

3. **API-Level Validation**
   - Server-side verification (optional for MVP)
   - Prevent comment creation for non-compliant users
   - Consistent error handling

## Development Strategy & Risk Mitigation

### Technical Risks & Solutions

1. **LUKSO Network Connectivity**
   - **Risk:** Users may not have LUKSO RPC access
   - **Solution:** Provide fallback public RPC endpoints
   - **Fallback:** Graceful degradation to board-level permissions

2. **Universal Profile Adoption**
   - **Risk:** Users may not have Universal Profiles
   - **Solution:** Clear onboarding instructions
   - **Alternative:** Progressive enhancement (feature optional)

3. **Verification Performance**
   - **Risk:** Blockchain queries may be slow
   - **Solution:** Caching, optimistic UI updates
   - **Enhancement:** Background verification with status indicators

### User Experience Considerations

1. **Onboarding Flow**
   - Clear messaging about UP requirements
   - Links to Universal Profile creation tools
   - Fallback explanations for non-UP users

2. **Error Handling**
   - Specific error messages for each requirement type
   - Actionable guidance (e.g., "You need 50 more LYX tokens")
   - Retry mechanisms for network issues

3. **Progressive Enhancement**
   - Feature works as enhancement to existing system
   - Graceful fallback when UP unavailable
   - Clear indication of gated vs non-gated posts

## Implementation Phases & Timeline

### Sprint 1: Foundation (Week 1)
- [ ] Extend type system for post settings
- [ ] Create Universal Profile context and provider
- [ ] Basic Web3-Onboard integration for UP connection
- [ ] Update post creation API to handle settings field

### Sprint 2: UI Components (Week 2)
- [ ] Post gating controls component
- [ ] Integration with NewPostForm variants
- [ ] Basic UP connection button/flow
- [ ] Post settings validation

### Sprint 3: Verification Engine (Week 3)
- [ ] UP verification service implementation
- [ ] LYX balance checking
- [ ] LSP7/LSP8 token verification
- [ ] Comment form integration

### Sprint 4: Polish & Testing (Week 4)
- [ ] Error handling and user feedback
- [ ] Performance optimization
- [ ] Real-time updates for gating status
- [ ] Comprehensive testing

## Success Metrics & Validation

### Technical Validation
- [ ] Universal Profile connection success rate > 95%
- [ ] Token verification accuracy 100%
- [ ] Comment gating enforcement 100%
- [ ] Performance: Verification < 2 seconds

### User Experience Validation
- [ ] Clear understanding of gating requirements
- [ ] Successful UP onboarding flow
- [ ] Intuitive post creation with gating
- [ ] Effective error messaging and recovery

## Future Extensibility

### Additional Gating Types
1. **Social Gating (LSP26):** Require following specific profiles
2. **NFT Collection Gating:** Own any NFT from specific collections
3. **Profile Completeness:** Require specific LSP3 metadata fields
4. **Creation History:** Require having issued tokens (LSP12)

### Integration Framework
- Modular gating system for additional third-party integrations
- Standardized verification interface
- Plugin-style architecture for new gating types

## Next Steps & Questions

### Implementation Decisions ✅ CONFIRMED

1. **Verification Location:** ✅ Pure frontend verification for MVP simplicity
2. **Network:** ✅ LUKSO Mainnet directly (no testnet development phase)
3. **UP Storage:** ✅ Store connected UP addresses in database for persistence
4. **Implementation Order:** ✅ LYX balance gating first, then LSP7/LSP8 tokens

### Environment Configuration

LUKSO connectivity configured with:
```env
# WalletConnect & RainbowKit
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=9721fe6ba11e2808e7ac43fbf53a46f6

# LUKSO Mainnet (Primary)
NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL="https://rpc.mainnet.lukso.network"
NEXT_PUBLIC_LUKSO_MAINNET_CHAIN_ID="42"

# LUKSO Testnet (Fallback/Development)
NEXT_PUBLIC_LUKSO_TESTNET_RPC_URL="https://rpc.testnet.lukso.network"
NEXT_PUBLIC_LUKSO_TESTNET_CHAIN_ID="4201"
```

### Final Approach - READY FOR IMPLEMENTATION

1. **Pure frontend verification** using ERC725.js + ethers.js on LUKSO mainnet
2. **LYX balance gating implementation first** for immediate MVP value
3. **Web3-Onboard integration** with Universal Profile extension support
4. **Database persistence** of connected UP addresses for enhanced UX
5. **Progressive UI enhancement** of existing post creation forms 