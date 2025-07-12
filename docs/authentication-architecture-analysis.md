# Authentication Architecture Analysis

## Overview

This document analyzes the current authentication architecture in the Curia embed system, specifically focusing on the division of responsibility between different components and identifying architectural weaknesses in the user authentication data flow.

## Current Architecture Components

### 1. **InternalPluginHost (Iframe Parent)**
- **Location**: `src/lib/embed/plugin-host/InternalPluginHost.ts`
- **Role**: Orchestrates the entire authentication flow
- **Responsibilities**:
  - Creates and manages auth iframe (`/embed`)
  - Receives authentication completion messages
  - Stores authentication context (`userId`, `communityId`, `sessionToken`)
  - Creates and switches to forum iframe
  - Handles API request routing from forum to host service

### 2. **Embed Route (Auth Iframe)**
- **Location**: `src/app/embed/page.tsx`
- **Role**: Handles user authentication inside iframe
- **Responsibilities**:
  - Session validation (if existing session exists)
  - Fresh authentication (ENS/UP/Anonymous)
  - Signature verification
  - Community selection
  - Sends completion message to parent

### 3. **Forum Service (Forum Iframe)**
- **Location**: External service (`https://embed.curia.network`)
- **Role**: Renders the actual forum interface
- **Responsibilities**:
  - Asks parent for user context via cglib
  - Renders forum based on provided authentication context
  - Makes API calls through parent's routing system

## Authentication Flow Analysis

### Current Flow Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  InternalPluginHost │    │   Embed Route       │    │   Forum Service     │
│  (Iframe Parent)    │    │   (Auth Iframe)     │    │   (Forum Iframe)    │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           │ 1. Create auth iframe     │                           │
           │──────────────────────────▶│                           │
           │                           │                           │
           │                           │ 2. Authenticate user      │
           │                           │    (ENS/UP/Anonymous)     │
           │                           │                           │
           │                           │ 3. Verify signature       │
           │                           │    Create user in DB      │
           │                           │                           │
           │                           │ 4. Select community       │
           │                           │                           │
           │ 5. Auth complete message  │                           │
           │◀──────────────────────────│                           │
           │   {userId, communityId,   │                           │
           │    sessionToken}          │                           │
           │                           │                           │
           │ 6. Create forum iframe    │                           │
           │───────────────────────────────────────────────────────▶│
           │                           │                           │
           │                           │                           │ 7. getUserInfo()
           │                           │                           │    getCommunityInfo()
           │◀──────────────────────────────────────────────────────│
           │                           │                           │
           │ 8. API responses          │                           │
           │───────────────────────────────────────────────────────▶│
```

### Data Flow Analysis

#### **Session Validation Flow (✅ WORKING)**
```
SessionCheckStep → /api/auth/validate-session → ProfileData with userId
→ Community Selection → Auth Complete → Forum works
```

#### **Fresh Authentication Flow (❌ BROKEN)**  
```
AuthenticationStep → ProfileData without userId
→ SignatureVerificationStep → User created in DB, session token generated
→ ProfilePreviewStep → Still using ProfileData without userId
→ Community Selection → Auth Complete with userId=undefined → Forum fails
```

## The Core Architectural Issue

### **Problem**: Inconsistent ProfileData Population

The fundamental issue is that `ProfileData` gets created at **different points** with **different data sources**:

1. **Fresh Auth**: ProfileData created from wallet connection (no database userId)
2. **Session Validation**: ProfileData created from database query (includes userId)

### **Root Cause**: Missing Data Bridge

The `SignatureVerificationStep` creates the user in the database and generates a session token, but **doesn't update the ProfileData** with the database user information.

```typescript
// What happens now (BROKEN):
AuthenticationStep → ProfileData { type: 'ens', address: '0x...', name: 'florianglatz.eth' }
SignatureVerificationStep → User created in DB as 'ens:florianglatz.eth'
ProfilePreviewStep → Still using ProfileData without userId
Auth Complete → { userId: undefined, ... }

// What should happen (FIXED):
AuthenticationStep → ProfileData { type: 'ens', address: '0x...', name: 'florianglatz.eth' }
SignatureVerificationStep → User created in DB as 'ens:florianglatz.eth'
                         → ProfileData updated with { userId: 'ens:florianglatz.eth' }
ProfilePreviewStep → ProfileData now complete with userId
Auth Complete → { userId: 'ens:florianglatz.eth', ... }
```

## Service Boundaries and Responsibilities

### **Current Division of Responsibility**

#### **Same Service, Different Contexts**
- **InternalPluginHost**: Runs in customer's domain context
- **Embed Route**: Runs in host service domain context (iframe)
- **Forum Service**: Runs in forum service domain context (iframe)

#### **Authentication Responsibility Split**
1. **InternalPluginHost**: 
   - ✅ Orchestration and storage of auth context
   - ✅ API request routing to host service
   
2. **Embed Route**:
   - ✅ User authentication and verification
   - ❌ Incomplete ProfileData population
   - ✅ Community selection
   
3. **Forum Service**:
   - ✅ Trusts provided authentication context
   - ✅ Renders forum based on context

### **The Architectural Weakness**

**The issue isn't the division of responsibility** - it's the **incomplete data flow** between the authentication step and the context passing step.

The embed route successfully:
- Authenticates users
- Creates database records
- Generates session tokens
- Selects communities

But it fails to:
- **Update ProfileData with database user information**
- **Ensure consistent data flow between fresh auth and session validation**

## Impact Analysis

### **Current Impact**
- ❌ Fresh ENS authentication fails to load forum
- ✅ Session validation works perfectly
- ❌ Production deployments fail for new users
- ✅ Development with existing sessions works
- ❌ Inconsistent user experience

### **Scope of Issue**
- **ENS Authentication**: Confirmed broken
- **UP Authentication**: Likely broken (same data flow)
- **Anonymous Authentication**: Likely broken (same data flow)
- **Session Validation**: Working correctly

## Proposed Solution Architecture

### **1. Data Flow Correction**
Update `SignatureVerificationStep` to populate ProfileData with database user information:

```typescript
// After signature verification succeeds:
const response = await fetch('/api/auth/verify-signature', { ... });
const { user, sessionToken } = await response.json();

// Update ProfileData with database information
const updatedProfileData = {
  ...profileData,
  userId: user.user_id,  // Add database user ID
  // Keep existing wallet/ENS data
};

setProfileData(updatedProfileData);
```

### **2. Consistent ProfileData Structure**
Ensure all authentication paths result in the same ProfileData structure:

```typescript
interface ProfileData {
  userId: string;           // Database user ID (required)
  type: 'ens' | 'up' | 'anon';
  address?: string;         // Wallet address
  name: string;             // Display name
  domain?: string;          // ENS domain
  avatar?: string;          // Profile picture
  // ... other fields
}
```

### **3. Validation Layer**
Add validation to ensure ProfileData is complete before auth completion:

```typescript
function validateProfileData(profileData: ProfileData): boolean {
  return !!(profileData.userId && profileData.name);
}
```

## Future Architectural Improvements

### **1. Authentication Service Abstraction**
Create a dedicated authentication service that handles all authentication flows consistently:

```typescript
interface AuthenticationService {
  validateSession(token: string): Promise<ProfileData>;
  authenticateENS(signature: SignatureData): Promise<ProfileData>;
  authenticateUP(signature: SignatureData): Promise<ProfileData>;
  authenticateAnonymous(): Promise<ProfileData>;
}
```

### **2. Centralized ProfileData Management**
Implement a ProfileData manager that ensures consistency:

```typescript
class ProfileDataManager {
  private profileData: ProfileData | null = null;
  
  async populateFromSession(sessionToken: string): Promise<void>
  async populateFromAuthentication(authData: AuthData): Promise<void>
  async ensureComplete(): Promise<void>
  
  getProfileData(): ProfileData | null
  isComplete(): boolean
}
```

### **3. Enhanced Error Handling**
Add comprehensive error handling and logging for authentication flow debugging:

```typescript
interface AuthFlowLogger {
  logAuthStart(method: string): void;
  logAuthStep(step: string, data: any): void;
  logAuthComplete(profileData: ProfileData): void;
  logAuthError(error: Error, context: any): void;
}
```

## Testing Strategy

### **Current Testing Gaps**
- ❌ No automated tests for fresh authentication flow
- ❌ No tests for ProfileData consistency
- ❌ No integration tests for auth completion flow

### **Proposed Testing Approach**
1. **Unit Tests**: ProfileData creation and validation
2. **Integration Tests**: End-to-end authentication flows
3. **Cross-Domain Tests**: Iframe communication testing
4. **Production Monitoring**: Authentication success/failure tracking

## Conclusion

The authentication architecture is fundamentally sound, but has a critical data flow gap in the fresh authentication path. The solution is straightforward: update ProfileData with database user information after signature verification completes.

This fix will:
- ✅ Make fresh authentication work consistently
- ✅ Maintain the existing successful session validation flow
- ✅ Provide a clean foundation for UP and Anonymous authentication
- ✅ Ensure consistent user experience across all authentication methods

The division of responsibility between components is appropriate and doesn't need restructuring - just the data flow completion.

---

**Status**: Analysis Complete - Ready for Implementation
**Priority**: Critical - Blocks production deployments
**Estimated Fix**: 1-2 hours implementation + testing 