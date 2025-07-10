# Standalone Identity & Community Management System Architecture

## Overview

This document outlines the architecture for transforming Curia from a Common Ground-dependent forum into a fully standalone platform with its own identity and community management system. The core concept is an iframe-based "identity manager" that handles authentication, community selection, and provides context to the main application.

## Current State vs. Vision

### Current State (Post-Untethering)
- ✅ Migrated from `@common-ground-dao` to `@curia_` libraries
- ✅ Host service acts as iframe host (like Common Ground)
- ✅ Main app functions with CG context data
- ❌ Still dependent on Common Ground for user identity and community context

### Target Vision
- 🎯 **Self-contained identity provider** - Iframe manages authentication independently
- 🎯 **Multi-identity support** - ENS, Universal Profile, and anonymous users
- 🎯 **Community management** - Users can create/join communities without CG
- 🎯 **Persistent sessions** - 30-day authentication with wallet re-verification
- 🎯 **Legacy compatibility** - Existing CG users continue to work

## System Architecture

### Core Components

1. **Identity Manager (Iframe)**
   - Authentication flows (ENS, UP, Anonymous)
   - Community selection/creation
   - Session management
   - Context provider to main app

2. **Main Application**
   - Forum functionality (posts, comments, voting)
   - Gating system (locks, verification)
   - Receives identity/community context from iframe

3. **Database Layer**
   - Extended user schema with identity types
   - Community management tables
   - Session/authentication tracking

## User Journey & Flow

### 1. Initial Page Load
```
User visits site → Iframe loads → Authentication check
```

#### New User (No Session)
```
Iframe displays: "Welcome to Curia"
Options:
- [Sign in with ENS]
- [Sign in with Universal Profile] 
- [Continue as Guest]
```

#### Returning User (Valid Session)
```
Iframe displays: Community selector or directly loads context
```

### 2. Authentication Flows

#### ENS Authentication
1. User clicks "Sign in with ENS"
2. Wallet connection prompt (MetaMask, etc.)
3. Check for ENS domain ownership
4. Sign message to prove wallet control
5. Create/update user record with ENS identity
6. Set 30-day authentication cookie

#### Universal Profile Authentication
1. User clicks "Sign in with Universal Profile"
2. UP extension connection
3. Verify UP ownership and metadata
4. Sign message to prove UP control
5. Create/update user record with UP identity
6. Set 30-day authentication cookie

#### Anonymous Mode
1. User clicks "Continue as Guest"
2. Generate temporary user ID
3. Set session cookie (no persistent storage)
4. Limited functionality (read-only until sign-up)

### 3. Community Context

#### For New Authenticated Users
```
Iframe displays: "Choose your community experience"
Options:
- [Create New Community]
- [Join Existing Community] 
- [Browse Public Communities]
```

#### For Returning Users
```
Iframe displays: Last used community or community selector
```

### 4. Full Application Access
Once both identity and community context are established:
```
Iframe provides context to main app:
{
  user: { id, name, avatar, identityType, walletAddress },
  community: { id, name, shortId, settings },
  session: { authenticated, expiresAt }
}
```

## Database Schema Changes

### Extended Users Table
```sql
ALTER TABLE users ADD COLUMN identity_type VARCHAR(20) DEFAULT 'legacy';
ALTER TABLE users ADD COLUMN wallet_address TEXT;
ALTER TABLE users ADD COLUMN ens_domain TEXT;
ALTER TABLE users ADD COLUMN up_address TEXT;
ALTER TABLE users ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN auth_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN last_auth_at TIMESTAMPTZ;

-- Identity type constraints
ALTER TABLE users ADD CONSTRAINT check_identity_type 
  CHECK (identity_type IN ('legacy', 'ens', 'universal_profile', 'anonymous'));

-- Ensure identity data consistency
ALTER TABLE users ADD CONSTRAINT check_identity_data
  CHECK (
    (identity_type = 'legacy' AND wallet_address IS NULL) OR
    (identity_type = 'ens' AND ens_domain IS NOT NULL AND wallet_address IS NOT NULL) OR
    (identity_type = 'universal_profile' AND up_address IS NOT NULL) OR
    (identity_type = 'anonymous' AND is_anonymous = TRUE)
  );
```

### New Authentication Sessions Table
```sql
CREATE TABLE authentication_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  session_token TEXT UNIQUE NOT NULL,
  identity_type VARCHAR(20) NOT NULL,
  wallet_address TEXT,
  signed_message TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_auth_sessions_token ON authentication_sessions(session_token);
CREATE INDEX idx_auth_sessions_user_active ON authentication_sessions(user_id, is_active);
CREATE INDEX idx_auth_sessions_expires ON authentication_sessions(expires_at);
```

### Community Ownership & Access
```sql
-- Add community ownership
ALTER TABLE communities ADD COLUMN owner_user_id TEXT REFERENCES users(user_id);
ALTER TABLE communities ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE communities ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE;

-- Community membership table
CREATE TABLE community_memberships (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  community_id TEXT NOT NULL REFERENCES communities(id),
  role VARCHAR(20) DEFAULT 'member',
  status VARCHAR(20) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  invited_by_user_id TEXT REFERENCES users(user_id),
  
  UNIQUE(user_id, community_id)
);

CREATE INDEX idx_community_memberships_user ON community_memberships(user_id);
CREATE INDEX idx_community_memberships_community ON community_memberships(community_id);
```

## Technical Implementation Plan

### Phase 1: Authentication Infrastructure (Week 1-2)
- [ ] Design identity manager iframe interface
- [ ] Implement ENS authentication flow
- [ ] Implement Universal Profile authentication flow
- [ ] Create session management system
- [ ] Database schema migrations for identity types

### Phase 2: Community Management (Week 3-4)
- [ ] Build community creation flow
- [ ] Implement community discovery/joining
- [ ] Create community membership system
- [ ] Design community settings interface

### Phase 3: Integration & Context Passing (Week 5-6)
- [ ] Update main app to receive iframe context
- [ ] Implement context validation and fallbacks
- [ ] Create seamless transition between auth states
- [ ] Handle anonymous user upgrade flow

### Phase 4: Migration & Compatibility (Week 7-8)
- [ ] Build CG user migration tools
- [ ] Implement backward compatibility layer
- [ ] Create user data import/export
- [ ] Testing with mixed user types

## Key Technical Challenges

### 1. Cross-Frame Communication
- Secure message passing between iframe and parent
- Context synchronization
- State management across frames

### 2. Wallet Integration
- Multiple wallet types (MetaMask, UP Extension, etc.)
- Signature verification and security
- Handling wallet switching/disconnection

### 3. Session Management
- Secure cookie handling
- Re-authentication flows
- Session persistence across devices

### 4. Migration Strategy
- Gradual migration from CG dependencies
- Data consistency during transition
- User experience continuity

## Security Considerations

### Authentication Security
- Message signature verification
- Protection against replay attacks
- Secure session token generation
- Wallet address validation

### Cross-Frame Security
- Secure origins and CSP policies
- Message validation and sanitization
- Protection against clickjacking

### Data Privacy
- Minimal data collection
- User consent for community joining
- Anonymous user data handling

## Success Metrics

### Technical Metrics
- Authentication success rate > 95%
- Session persistence across page loads
- Cross-frame communication latency < 100ms
- Zero data loss during CG migration

### User Experience Metrics
- First-time user onboarding completion rate
- Return user authentication time < 3 seconds
- Community creation/joining success rate
- User retention after migration

## Future Enhancements

### Advanced Identity Features
- Multi-wallet support per user
- Social recovery mechanisms
- Advanced verification (KYC, social proofs)
- Identity reputation system

### Community Features
- Community-to-community relationships
- Federated community discovery
- Cross-community user migration
- Advanced permission systems

## Dependencies & Prerequisites

### External Services
- ENS resolver APIs
- LUKSO network access
- IPFS for metadata storage
- Wallet provider APIs

### Internal Infrastructure
- Extended database schema
- Enhanced authentication APIs
- Cross-frame communication protocols
- Session management services

---

## Next Steps

1. **Validate Architecture** - Review with stakeholders and technical team
2. **Create Detailed Specs** - Break down each component into implementable tasks
3. **Set Up Development Environment** - Prepare for iframe and authentication development
4. **Begin Phase 1 Implementation** - Start with core authentication infrastructure

This architecture represents a significant evolution from a CG-dependent forum to a fully autonomous community platform while maintaining the core functionality and user experience that makes Curia valuable. 