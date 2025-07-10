# Production Common Ground Host Application Architecture

## Executive Summary

This document outlines the architecture and implementation strategy for building a production-grade Common Ground host application that provides real data, verifies plugin authenticity, and ensures proper user authentication.

## Current State vs. Production Requirements

### Current Implementation
- ✅ Mock data generation (getUserInfo, getCommunityInfo, etc.)
- ✅ Plugin iframe sandboxing and postMessage communication
- ✅ Request signing by plugins using our client library
- ❌ **No signature verification by host**
- ❌ **No real data sources**
- ❌ **No user authentication verification**
- ❌ **No community authorization**

### Production Requirements
- ✅ Real data integration (users, communities, social graphs)
- ✅ Cryptographic signature verification
- ✅ Community authentication and authorization
- ✅ User session management
- ✅ Security hardening (replay protection, rate limiting)
- ✅ Audit logging and monitoring

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Community     │    │   Production    │    │   Plugin        │
│   Website       │    │   Host App      │    │   (iframe)      │
│                 │    │                 │    │                 │
│ 1. User login   │    │ 3. Verify       │    │ 4. Sign &       │
│ 2. Generate     │────▶│    community    │◀───│    send         │
│    auth token   │    │    auth token   │    │    requests     │
│                 │    │ 5. Verify       │    │                 │
│                 │    │    signatures   │    │                 │
│                 │    │ 6. Return real  │    │                 │
│                 │    │    data         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Data Sources  │
                       │                 │
                       │ • User DB       │
                       │ • Community DB  │
                       │ • Social Graph  │
                       │ • Blockchain    │
                       └─────────────────┘
```

## Component Analysis

### 1. Community Authentication Layer

**Challenge**: How does the host app know a user is legitimately from a specific community?

**Solution Options**:

#### Option A: JWT Token Flow
```typescript
// Community website generates JWT after user login
const communityToken = jwt.sign({
  userId: "user123",
  communityId: "community456", 
  permissions: ["read_profile", "manage_roles"],
  exp: Date.now() + 3600000 // 1 hour
}, COMMUNITY_PRIVATE_KEY);

// Token passed to plugin via URL parameter or postMessage
// Plugin includes token in all API requests
```

#### Option B: OAuth-style Flow
```typescript
// 1. Community redirects to host app with authorization code
// 2. Host app exchanges code for access token with community
// 3. Host app validates user session with community
// 4. Host app issues its own session token to plugin
```

#### Option C: Blockchain-based Proof
```typescript
// User signs a message with their wallet
// Message includes timestamp and community ID
// Host app verifies signature against community member registry
const message = `${userId}:${communityId}:${timestamp}`;
const signature = await wallet.signMessage(message);
```

**Recommendation**: Start with JWT tokens (Option A) for simplicity, with blockchain proof as future enhancement.

### 2. Signature Verification System

**Current Gap**: Our host app receives signed requests but doesn't verify them.

**Implementation Strategy**:

```typescript
// In production host app
class SignatureVerifier {
  private communityKeys: Map<string, CryptoKey> = new Map();
  
  async verifyCommunityRequest(
    communityId: string,
    signature: string, 
    payload: string,
    timestamp: number
  ): Promise<boolean> {
    // 1. Check timestamp (prevent replay attacks)
    if (Date.now() - timestamp > 300000) { // 5 minutes
      throw new Error('Request expired');
    }
    
    // 2. Get community's public key
    const publicKey = await this.getCommunityPublicKey(communityId);
    
    // 3. Verify signature
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      Buffer.from(signature, 'base64'),
      new TextEncoder().encode(payload)
    );
    
    return isValid;
  }
  
  private async getCommunityPublicKey(communityId: string): Promise<CryptoKey> {
    // Load from registry, cache, or community API
    if (!this.communityKeys.has(communityId)) {
      const keyData = await this.fetchCommunityKey(communityId);
      const key = await crypto.subtle.importKey(/* ... */);
      this.communityKeys.set(communityId, key);
    }
    return this.communityKeys.get(communityId)!;
  }
}
```

### 3. Community Registry & Key Management

**Challenge**: How do we manage which communities are authorized and their public keys?

**Registry Structure**:
```typescript
interface CommunityRegistry {
  communities: {
    [communityId: string]: {
      name: string;
      domain: string;
      publicKey: string; // PEM format
      permissions: string[];
      status: 'active' | 'suspended' | 'pending';
      registrationDate: string;
      lastUpdated: string;
    }
  };
}
```

**Key Distribution Options**:
1. **Manual Registration**: Communities submit public keys through admin interface
2. **Automated Discovery**: Fetch from `/.well-known/cg-public-key` endpoint
3. **Blockchain Registry**: Store public keys on-chain for transparency
4. **Federated**: Each community hosts their own key, we cache them

### 4. Real Data Integration

**Current Mock Data → Real Data Sources**:

```typescript
class ProductionDataProvider {
  async getUserInfo(userId: string, communityId: string): Promise<UserInfo> {
    // Query real user database
    const user = await this.userRepository.findByCommunity(userId, communityId);
    return {
      userId: user.id,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      // ... other real fields
    };
  }
  
  async getCommunityInfo(communityId: string): Promise<CommunityInfo> {
    // Query community database
    const community = await this.communityRepository.findById(communityId);
    return {
      communityId: community.id,
      name: community.name,
      memberCount: await this.getMemberCount(communityId),
      // ... other real fields
    };
  }
  
  async getUserFriends(userId: string, communityId: string): Promise<UserInfo[]> {
    // Query social graph database
    const friendIds = await this.socialGraphService.getFriends(userId, communityId);
    return Promise.all(friendIds.map(id => this.getUserInfo(id, communityId)));
  }
  
  async giveRole(
    fromUserId: string, 
    toUserId: string, 
    roleId: string, 
    communityId: string
  ): Promise<boolean> {
    // 1. Verify fromUser has permission to assign roleId
    const hasPermission = await this.permissionService.canAssignRole(
      fromUserId, roleId, communityId
    );
    if (!hasPermission) throw new Error('Insufficient permissions');
    
    // 2. Assign role in database
    await this.roleService.assignRole(toUserId, roleId, communityId);
    
    // 3. Log the action
    await this.auditLogger.log({
      action: 'role_assigned',
      fromUser: fromUserId,
      toUser: toUserId,
      role: roleId,
      community: communityId,
      timestamp: new Date()
    });
    
    return true;
  }
}
```

### 5. Security Hardening

**Essential Security Measures**:

```typescript
class SecurityMiddleware {
  // Rate limiting per community/user
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();
  
  async validateRequest(request: PluginRequest): Promise<void> {
    // 1. Rate limiting
    await this.checkRateLimit(request.communityId, request.userId);
    
    // 2. Request structure validation
    this.validateRequestStructure(request);
    
    // 3. Timestamp validation (prevent replay)
    this.validateTimestamp(request.timestamp);
    
    // 4. Signature verification
    await this.verifySignature(request);
    
    // 5. Community authorization
    await this.verifyCommunityAuth(request.communityToken);
  }
  
  private async checkRateLimit(communityId: string, userId: string): Promise<void> {
    const key = `${communityId}:${userId}`;
    const limit = this.rateLimiter.get(key);
    
    if (limit && limit.count > 100 && Date.now() < limit.resetTime) {
      throw new Error('Rate limit exceeded');
    }
    
    // Update counter
    this.rateLimiter.set(key, {
      count: (limit?.count || 0) + 1,
      resetTime: limit?.resetTime || Date.now() + 3600000 // 1 hour
    });
  }
}
```

## Implementation Phases

### Phase 1: Basic Production Setup (Week 1-2)
- [ ] Replace mock data with real database integration
- [ ] Implement basic signature verification
- [ ] Create community registry system
- [ ] Add JWT-based community authentication

### Phase 2: Security Hardening (Week 3-4)
- [ ] Add rate limiting and replay protection
- [ ] Implement comprehensive request validation
- [ ] Add audit logging system
- [ ] Security testing and penetration testing

### Phase 3: Advanced Features (Week 5-6)
- [ ] Blockchain-based authentication option
- [ ] Federated key discovery
- [ ] Advanced permission system
- [ ] Monitoring and alerting

### Phase 4: Production Deployment (Week 7-8)
- [ ] Load testing and performance optimization
- [ ] Disaster recovery setup
- [ ] Documentation and API specifications
- [ ] Community onboarding process

## Technical Stack Recommendations

**Backend Framework**: Next.js API routes (current) or dedicated Express.js server
**Database**: PostgreSQL for relational data + Redis for caching
**Authentication**: JWT + optional blockchain verification
**Monitoring**: DataDog/New Relic + structured logging
**Deployment**: Vercel/AWS with CDN for global performance

## Open Questions & Decisions Needed

1. **Community Onboarding**: How do new communities register and get approved?
2. **Data Ownership**: Who owns the user data - communities or the host platform?
3. **Monetization**: How does the host platform sustain itself?
4. **Compliance**: GDPR, data residency, user consent management?
5. **Scaling**: How to handle thousands of communities and millions of users?

## Next Steps

1. **Prototype the signature verification system** in our current host app
2. **Design the community registry schema** and admin interface
3. **Build a simple real data provider** with PostgreSQL
4. **Test end-to-end flow** with one real community

This architecture provides a solid foundation for a production Common Ground host while maintaining the plugin compatibility we've already achieved. 

## Perfect! ✅ Updated Package Names to `@curia_`

I've updated both packages to use your new organization:
- `@curia_/cg-plugin-lib` (client library)
- `@curia_/cg-plugin-lib-host` (server library)

## Next Steps:

### 1. Set up your npm authentication:
```bash
<code_block_to_apply_changes_from>
# Replace with your actual access token
npm config set //registry.npmjs.org/:_authToken your-actual-token-here
```

### 2. Verify authentication works:
```bash
npm whoami
# Should show your npm username
```

### 3. Check if your package names are available:
```bash
npm view @curia_/cg-plugin-lib
npm view @curia_/cg-plugin-lib-host
# Should show "npm error code E404" if available (good!)
```

### 4. Test publish (dry run):
```bash
cd packages/cg-plugin-lib
npm publish --dry-run
```

**After you set up the auth token, run those commands and let me know what happens!** 

The packages are now properly configured with:
- ✅ Your organization: `@curia_`
- ✅ Your authorship: Florian Glatz  
- ✅ Your copyright
- ✅ No fake repository URLs
- ✅ Professional npm metadata

Once your auth works, you'll be ready to publish! 🚀 