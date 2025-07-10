# Standalone Host Service Project - Research & Implementation Strategy

## Executive Summary

This document outlines the strategy for transforming Curia from a Common Ground-dependent plugin into a standalone embeddable forum system. The goal is to create a "host service" that allows anyone to embed Curia forums on their own websites via a simple JavaScript snippet, while maintaining optional compatibility with the existing Common Ground ecosystem.

## Project Vision & Goals

### 🎯 **Core Vision**
Enable **any website owner** to embed a sophisticated forum system by simply adding a JavaScript snippet to their page - no complex setup, no server management, just instant community functionality.

### 🚀 **Strategic Goals**
1. **Democratize Forum Technology**: Make advanced forum features accessible to any website
2. **Escape Platform Dependency**: Reduce reliance on Common Ground's centralized infrastructure  
3. **Preserve Investment**: Maintain compatibility with existing CG communities and users
4. **Scale Globally**: Create embeddable solution that works on millions of websites

### 📊 **Success Metrics**
- 1000+ websites embedding Curia forums within 6 months
- Seamless dual-mode operation (CG + standalone)
- <100ms iframe load times on embedded sites
- 99.9% uptime for host service infrastructure

## Current State Analysis

### ✅ **What We Have**
- **Sophisticated Forum App**: Production-ready Curia with advanced gating, real-time features, AI integration
- **Drop-in Libraries**: Replacement libraries for `@common-ground-dao/cg-plugin-lib` that work with new host service
- **Plugin Architecture**: Existing iframe-based embedding foundation from CG integration
- **Reference Implementation**: Example host app demonstrating the concept

### ❌ **What We Need**
- **Production Host Service**: Scalable backend infrastructure for authentication, data, signing
- **Embedding Infrastructure**: JavaScript snippet generation and cross-origin communication
- **Identity Bridge**: System for proving CG identity and merging accounts
- **Admin Platform**: Interface for managing communities, users, and embeddings

## Technical Architecture

### 🏗️ **System Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Any Website   │    │   Host Service  │    │   Curia Forum   │
│                 │    │   (Railway)     │    │   (iframe)      │
│ 1. Embed JS     │    │                 │    │                 │
│ 2. Load iframe  │───▶│ 3. Serve forum  │───▶│ 4. Run with     │
│ 3. Responsive   │    │ 4. Auth & data  │◀───│    new libs     │
│    container    │    │ 5. Sign requests│    │ 5. Real-time    │
│                 │    │ 6. Admin dash   │    │    features     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🔄 **Dual Compatibility Architecture**

```typescript
// Environment Detection Pattern
const isStandalone = new URLSearchParams(window.location.search).get('mod') === 'standalone';

// Dynamic Library Loading
if (isStandalone) {
  const { PluginClient } = await import('@curia_/cg-plugin-lib');
  // Use new host service APIs
} else {
  const { PluginClient } = await import('@common-ground-dao/cg-plugin-lib');
  // Use Common Ground APIs
}
```

## Implementation Strategy

### 📁 **Project Structure**

```
curia2/
├── src/                          # Main forum application
├── workers/                      # Existing worker services
│   └── embedding-worker/
├── servers/                      # 🆕 New server applications
│   └── host-service/            # 🆕 Main host service
│       ├── src/
│       │   ├── app/             # Next.js API routes
│       │   ├── components/      # Admin dashboard UI
│       │   ├── lib/             # Core business logic
│       │   ├── services/        # External integrations
│       │   └── types/           # TypeScript definitions
│       ├── package.json
│       ├── railway.toml         # Railway deployment config
│       └── Dockerfile
├── packages/                     # 🆕 Shared packages
│   ├── embedding-snippet/       # 🆕 JavaScript snippet
│   └── shared-types/            # 🆕 Shared TypeScript types
└── docs/
    └── standalone-host-service-research.md
```

### 🏢 **Host Service Architecture**

#### **Core Services**

```typescript
// Authentication Service
class AuthService {
  async createAccount(email: string, password: string): Promise<User>
  async authenticateUser(credentials: LoginCredentials): Promise<SessionToken>
  async verifySession(token: string): Promise<User | null>
  async linkCGAccount(cgProof: CGIdentityProof): Promise<void>
}

// Community Management Service  
class CommunityService {
  async createCommunity(ownerId: string, config: CommunityConfig): Promise<Community>
  async getCommunityInfo(communityId: string): Promise<CommunityInfo>
  async updateCommunitySettings(communityId: string, settings: Settings): Promise<void>
  async generateEmbedCode(communityId: string): Promise<EmbedSnippet>
}

// Data Provider Service (mirrors CG API interface)
class DataProvider {
  async getUserInfo(userId: string, communityId: string): Promise<UserInfo>
  async getUserFriends(userId: string, communityId: string): Promise<UserInfo[]>
  async giveRole(fromUserId: string, toUserId: string, roleId: string): Promise<boolean>
  // ... all other CG API methods
}

// Request Signing Service
class SigningService {
  async signRequest(payload: any, communityId: string): Promise<SignedRequest>
  async verifySignature(signedRequest: SignedRequest): Promise<boolean>
}
```

#### **Database Schema**

```sql
-- Host service database tables
CREATE TABLE host_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- CG linking
  cg_user_id TEXT,
  cg_link_verified_at TIMESTAMP,
  cg_link_proof JSONB
);

CREATE TABLE host_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES host_users(id),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255), -- Website where it's embedded
  
  -- Crypto keys for signing
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  
  -- Configuration
  settings JSONB DEFAULT '{}',
  embed_settings JSONB DEFAULT '{}',
  
  -- CG linking
  cg_community_id TEXT,
  cg_link_verified_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES host_communities(id),
  user_id UUID REFERENCES host_users(id),
  roles TEXT[] DEFAULT '{}',
  joined_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(community_id, user_id)
);

CREATE TABLE embed_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES host_communities(id),
  domain VARCHAR(255),
  page_url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  event_type VARCHAR(50), -- 'load', 'interaction', 'error'
  event_data JSONB
);
```

### 📜 **JavaScript Embedding System**

#### **Embed Snippet Generation**

```typescript
// Host service generates custom snippet for each community
class EmbedGenerator {
  generateSnippet(communityId: string, options: EmbedOptions): string {
    return `
<script>
(function() {
  const config = {
    communityId: '${communityId}',
    hostUrl: '${process.env.HOST_SERVICE_URL}',
    mode: 'standalone',
    responsive: ${options.responsive},
    theme: '${options.theme}',
    height: '${options.height || 'auto'}'
  };
  
  // Create iframe container
  const container = document.getElementById('${options.containerId}');
  if (!container) {
    console.error('Curia: Container element not found');
    return;
  }
  
  // Load iframe with authentication
  const iframe = document.createElement('iframe');
  iframe.src = config.hostUrl + '/forum/' + config.communityId + '?mod=standalone&embed=true';
  iframe.style.width = '100%';
  iframe.style.height = config.height;
  iframe.style.border = 'none';
  
  container.appendChild(iframe);
  
  // Cross-origin communication
  window.addEventListener('message', function(event) {
    if (event.origin !== config.hostUrl) return;
    
    if (event.data.type === 'RESIZE') {
      iframe.style.height = event.data.height + 'px';
    }
  });
})();
</script>`;
  }
}
```

#### **Cross-Origin Communication**

```typescript
// Inside Curia iframe
class EmbedCommunication {
  private parentOrigin: string;
  
  constructor() {
    this.parentOrigin = document.referrer ? new URL(document.referrer).origin : '*';
    this.setupMessageHandlers();
  }
  
  // Send height updates to parent
  updateHeight() {
    const height = document.body.scrollHeight;
    window.parent.postMessage({
      type: 'RESIZE',
      height: height
    }, this.parentOrigin);
  }
  
  // Handle authentication flows
  handleAuthStateChange(isAuthenticated: boolean) {
    window.parent.postMessage({
      type: 'AUTH_STATE_CHANGE',
      authenticated: isAuthenticated
    }, this.parentOrigin);
  }
}
```

### 🔗 **Identity Bridge System**

#### **CG Identity Verification**

```typescript
// Proof generation on CG side
class CGIdentityProof {
  async generateProof(userId: string, targetHostDomain: string): Promise<CGProof> {
    const payload = {
      cgUserId: userId,
      targetHost: targetHostDomain,
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    };
    
    // Sign with user's wallet or CG's signing key
    const signature = await this.signPayload(payload);
    
    return {
      payload,
      signature,
      cgCommunityId: this.currentCommunityId,
      verificationUrl: `https://app.cg/verify-identity/${btoa(JSON.stringify(payload))}`
    };
  }
}

// Verification on host service side
class IdentityBridge {
  async verifyCGIdentity(proof: CGProof): Promise<boolean> {
    // 1. Verify signature against CG's public key
    const signatureValid = await this.verifyCGSignature(proof.payload, proof.signature);
    
    // 2. Check timestamp (prevent replay attacks)
    const timestampValid = Date.now() - proof.payload.timestamp < 300000; // 5 minutes
    
    // 3. Optional: Call CG API to double-check user exists
    const userExists = await this.verifyCGUserExists(proof.payload.cgUserId);
    
    return signatureValid && timestampValid && userExists;
  }
  
  async linkAccounts(hostUserId: string, cgProof: CGProof): Promise<void> {
    if (!await this.verifyCGIdentity(cgProof)) {
      throw new Error('Invalid CG identity proof');
    }
    
    await this.database.query(`
      UPDATE host_users 
      SET cg_user_id = $1, cg_link_verified_at = NOW(), cg_link_proof = $2
      WHERE id = $3
    `, [cgProof.payload.cgUserId, cgProof, hostUserId]);
  }
}
```

#### **Account Merging Flow**

```typescript
class AccountMerger {
  async suggestMerges(userId: string): Promise<MergeSuggestion[]> {
    // Find potential duplicates by email, display name, wallet address
    const suggestions = await this.findPotentialDuplicates(userId);
    
    return suggestions.map(suggestion => ({
      targetAccount: suggestion,
      confidence: this.calculateMergeConfidence(userId, suggestion.id),
      conflicts: this.identifyConflicts(userId, suggestion.id)
    }));
  }
  
  async mergeCommunities(sourceCommunityId: string, targetCommunityId: string): Promise<void> {
    // 1. Transfer all members, posts, settings
    // 2. Update all references
    // 3. Archive source community
    // 4. Notify all affected users
  }
}
```

## Implementation Phases & Priorities

### 🚀 **Phase 1: Core Host Service Infrastructure (Months 1-2)**

**Priority: Critical - Foundation for everything else**

#### **Week 1-2: Basic Server Setup**
- [ ] Create `servers/host-service/` directory structure
- [ ] Set up Next.js API routes for core endpoints
- [ ] Implement basic PostgreSQL schema
- [ ] Create authentication system (email/password)
- [ ] Set up Railway deployment configuration

#### **Week 3-4: Core API Implementation** 
- [ ] Implement user management APIs
- [ ] Build community creation and management
- [ ] Create data provider service mirroring CG API interface
- [ ] Implement request signing service
- [ ] Add basic admin dashboard

#### **Week 5-8: Testing & Hardening**
- [ ] Comprehensive API testing
- [ ] Security hardening (rate limiting, validation)
- [ ] Performance optimization
- [ ] Error handling and logging
- [ ] Basic monitoring setup

**Success Criteria**: Host service can serve basic community data and authenticate users

### 🎨 **Phase 2: Embedding System (Months 2-3)**

**Priority: High - Core user-facing feature**

#### **Week 9-10: JavaScript Snippet**
- [ ] Create `packages/embedding-snippet/` package
- [ ] Implement snippet generation service
- [ ] Build cross-origin communication system
- [ ] Create responsive iframe handling

#### **Week 11-12: Embed Dashboard**
- [ ] Build admin interface for community owners
- [ ] Create embed code generator with customization options
- [ ] Implement analytics tracking for embeds
- [ ] Add embed preview functionality

**Success Criteria**: Any website can embed a working Curia forum via JavaScript snippet

### 🔄 **Phase 3: Dual Compatibility (Months 3-4)**

**Priority: High - Maintains CG compatibility**

#### **Week 13-14: Library Detection**
- [ ] Implement environment detection in main Curia app
- [ ] Create dynamic library loading system
- [ ] Update authentication flows for dual mode
- [ ] Test library switching functionality

#### **Week 15-16: Integration Testing**
- [ ] Test Curia app in both CG and standalone modes
- [ ] Verify feature parity between environments
- [ ] Performance testing in both modes
- [ ] Bug fixes and optimization

**Success Criteria**: Curia works seamlessly in both Common Ground and standalone hosting

### 🔗 **Phase 4: Identity Bridge (Months 4-5)**

**Priority: Medium - Important for user migration**

#### **Week 17-18: CG Identity Verification**
- [ ] Implement CG identity proof generation
- [ ] Build verification system on host service
- [ ] Create account linking flows
- [ ] Add CG user data migration

#### **Week 19-20: Account Merging**
- [ ] Build duplicate detection algorithms
- [ ] Create community merging tools
- [ ] Implement user-friendly merge flows
- [ ] Add conflict resolution interface

**Success Criteria**: Users can prove CG identity and merge accounts seamlessly

### 📈 **Phase 5: Production Optimization (Months 5-6)**

**Priority: Medium - Scale and reliability**

#### **Week 21-22: Performance & Scale**
- [ ] Database optimization and indexing
- [ ] CDN setup for static assets
- [ ] Caching layer implementation
- [ ] Load testing and bottleneck identification

#### **Week 23-24: Advanced Features**
- [ ] Advanced analytics and reporting
- [ ] Webhook system for external integrations
- [ ] Custom domain support for communities
- [ ] Premium features and billing integration

**Success Criteria**: System handles 1000+ concurrent communities with high performance

## Critical Technical Decisions

### 🔐 **Authentication Strategy**

**Decision**: Start with email/password + JWT, add wallet auth later
- **Rationale**: Fastest path to market, familiar UX for non-crypto users
- **Future**: Add MetaMask/wallet authentication for web3 communities

### 💾 **Data Storage Strategy**

**Decision**: PostgreSQL for primary data, Redis for caching/sessions
- **Rationale**: Proven stack, ACID compliance, complex relationship queries
- **Scaling**: Partition by community_id, add read replicas as needed

### 🔑 **Cryptographic Key Management**

**Decision**: Generate unique keypair per community, encrypt private keys at rest
- **Rationale**: Isolation between communities, enables community data portability
- **Security**: Use AES-256 encryption, store decryption keys in environment

### 🌐 **Cross-Origin Communication**

**Decision**: PostMessage API with origin validation
- **Rationale**: Standard browser API, works across all modern browsers
- **Security**: Strict origin checking, message type validation

### 📊 **Analytics & Monitoring**

**Decision**: Custom analytics for embed tracking + standard monitoring (DataDog/Sentry)
- **Rationale**: Need custom metrics for embed performance, standard tools for infrastructure

## Risk Assessment & Mitigation

### 🚨 **High-Risk Items**

1. **Security Vulnerabilities in Cross-Origin Communication**
   - **Risk**: XSS attacks, data leakage, unauthorized access
   - **Mitigation**: Strict CSP policies, message validation, origin checking

2. **Performance Issues with Large-Scale Embedding**  
   - **Risk**: Slow iframe loads, poor user experience
   - **Mitigation**: CDN deployment, aggressive caching, performance monitoring

3. **CG Platform Changes Breaking Compatibility**
   - **Risk**: Updates to CG libraries break dual compatibility
   - **Mitigation**: Version pinning, comprehensive test suite, graceful degradation

### ⚠️ **Medium-Risk Items**

1. **Database Scaling Challenges**
   - **Risk**: PostgreSQL performance degrades with growth
   - **Mitigation**: Early partitioning strategy, monitoring, scaling plan

2. **Complex Account Merging Edge Cases**
   - **Risk**: Data loss during merges, user confusion
   - **Mitigation**: Extensive testing, rollback capabilities, clear UX

## Success Metrics & KPIs

### 📊 **Technical Metrics**
- **Performance**: <100ms iframe load time, 99.9% uptime
- **Security**: Zero security incidents, regular security audits
- **Reliability**: <0.1% error rate, graceful degradation

### 📈 **Business Metrics**  
- **Adoption**: 1000+ embedded forums in 6 months
- **Engagement**: >60% user retention week-over-week
- **Growth**: 25% month-over-month community creation

### 👥 **User Experience Metrics**
- **Ease of Use**: <5 minutes from signup to embedded forum
- **Documentation**: Self-service rate >80%
- **Support**: <24h response time for paid customers

## Next Steps & Immediate Actions

### 🎯 **Immediate Priorities (Next 2 Weeks)**

1. **Architecture Finalization**
   - [ ] Review this research document with team
   - [ ] Make key technical decisions (auth, storage, etc.)
   - [ ] Finalize project structure and naming conventions

2. **Project Scaffolding**
   - [ ] Create `servers/host-service/` structure
   - [ ] Set up development environment
   - [ ] Initialize database schema
   - [ ] Configure Railway deployment pipeline

3. **Core Service Development**
   - [ ] Implement basic user registration/authentication
   - [ ] Create community management endpoints
   - [ ] Build request signing service
   - [ ] Set up basic admin dashboard

### 🔄 **Iterative Development Approach**

**Week 1**: Basic host service with user auth
**Week 2**: Community management + data APIs
**Week 3**: Request signing + security hardening
**Week 4**: Basic embedding system
**Week 5**: Integration with main Curia app
**Week 6**: Testing + bug fixes
**Week 7**: Dual compatibility implementation
**Week 8**: Identity bridge basics

## Conclusion

This project represents a significant evolution of Curia from a platform-dependent plugin to a standalone embeddable solution. The technical foundation is solid with the completed drop-in libraries, and the architecture outlined here provides a clear path to implementation.

The key to success will be:
1. **Methodical execution** of the phased approach
2. **Early testing** of embedding functionality 
3. **Security-first** approach to cross-origin communication
4. **User-centric design** for the account merging experience

With careful implementation, this could position Curia as the leading embeddable forum solution, democratizing advanced community features for any website owner.

---

*This research document should be updated as implementation progresses and new insights emerge.* 