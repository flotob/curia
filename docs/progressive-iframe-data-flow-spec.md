# Progressive Iframe Data Flow - Technical Specification

*Detailed specification for the seamless iframe experience that handles auth → community → forum progression*

**Last Updated:** January 2025  
**Status:** Phase 1 Implementation Guide  
**Context:** Standalone Curia deployment architecture

---

## 🎯 Overview

The Progressive Iframe is the core innovation of the Curia standalone platform. From a third-party website's perspective, they embed a single iframe that "just works." Under the hood, this iframe intelligently manages multiple stages to create a seamless user experience.

**Key Insight:** The iframe IS the application, but it progressively transforms from authentication UI → community selection → full forum based on user state.

---

## 🏗️ Architecture Summary

### **Single Iframe, Multiple Stages**
```
Third-party website embeds ONE iframe:
<iframe src="https://curia.standalone.com/embed"></iframe>

That iframe internally handles:
Stage 1: Session Check    (instant/automatic)
Stage 2: Authentication   (if needed)  
Stage 3: Community Select (if needed)
Stage 4: Forum App        (final state)
```

### **Deployment Context**
- **Standalone Instance**: New deployment at `curia.standalone.com` (or similar)
- **Database**: Shared PostgreSQL with CG instance (same tables)
- **Users Table**: Already extended with `identity_type`, `wallet_address`, `ens_domain`, `up_address` columns
- **Sessions Table**: `authentication_sessions` table already exists
- **Account Merging**: Future feature to unify standalone + CG accounts

---

## 📋 Stage-by-Stage Data Flow

### **Stage 1: Session Check** ⚡ *Instant*

**Purpose:** Determine if user has existing authentication  
**Duration:** <100ms (no user interaction)  
**URL:** `/embed` → automatically routes based on session state

```typescript
// Automatic session detection flow
async function detectUserSession(): Promise<SessionState> {
  // 1. Check for authentication cookie
  const sessionCookie = getCookie('curia_session_token');
  
  if (!sessionCookie) {
    return { authenticated: false, stage: 'auth' };
  }
  
  // 2. Validate session with database
  const session = await validateSession(sessionCookie);
  
  if (!session || session.expired) {
    return { authenticated: false, stage: 'auth' };
  }
  
  // 3. Check community context
  const communityContext = getCommunityFromUrl() || session.lastCommunity;
  
  if (!communityContext) {
    return { 
      authenticated: true, 
      user: session.user,
      stage: 'community' 
    };
  }
  
  // 4. All context available - go to forum
  return {
    authenticated: true,
    user: session.user,
    community: communityContext,
    stage: 'forum'
  };
}
```

**Possible Outcomes:**
- ✅ **Valid session + community context** → Stage 4 (Forum App)
- ✅ **Valid session, no community** → Stage 3 (Community Select) 
- ❌ **No session or expired** → Stage 2 (Authentication)

### **Stage 2: Authentication** 🔐 *User Interaction Required*

**Purpose:** Establish user identity via wallet signature or anonymous mode  
**Duration:** 30 seconds - 2 minutes (user dependent)  
**URL:** `/embed?stage=auth`

#### **UI Interface:**
```typescript
interface AuthenticationStage {
  // Three main options presented to user
  options: [
    {
      type: 'ens',
      title: 'Sign in with ENS Domain',
      description: 'Connect your Ethereum wallet',
      action: () => initiateENSAuth()
    },
    {
      type: 'universal_profile', 
      title: 'Sign in with Universal Profile',
      description: 'Connect your LUKSO profile',
      action: () => initiateUPAuth()
    },
    {
      type: 'anonymous',
      title: 'Continue as Guest',
      description: 'Browse without signing in',
      action: () => createAnonymousSession()
    }
  ];
}
```

#### **ENS Authentication Flow:**
```typescript
async function initiateENSAuth(): Promise<AuthResult> {
  // 1. Connect wallet
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  
  // 2. Verify ENS ownership
  const ensName = await provider.lookupAddress(address);
  if (!ensName) {
    throw new Error('No ENS domain found for this wallet');
  }
  
  // 3. Create signature challenge
  const message = `Sign this message to authenticate with Curia using your ENS domain: ${ensName}\n\nTimestamp: ${Date.now()}`;
  const signature = await signer.signMessage(message);
  
  // 4. Submit to backend
  const response = await fetch('/api/auth/identity-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityType: 'ens',
      walletAddress: address,
      ensName,
      signedMessage: message,
      signature
    })
  });
  
  if (!response.ok) throw new Error('Authentication failed');
  
  const { sessionToken, user } = await response.json();
  
  // 5. Store session and advance to next stage
  setCookie('curia_session_token', sessionToken, { expires: 30 }); // 30 days
  return { success: true, user, nextStage: 'community' };
}
```

#### **Universal Profile Authentication Flow:**
```typescript
async function initiateUPAuth(): Promise<AuthResult> {
  // 1. Connect UP extension
  if (!window.lukso) {
    throw new Error('Universal Profile extension not found');
  }
  
  const accounts = await window.lukso.request({ method: 'eth_requestAccounts' });
  const upAddress = accounts[0];
  
  // 2. Fetch UP metadata
  const erc725 = new ERC725(LSP3ProfileSchema, upAddress, RPC_URL);
  const profileData = await erc725.fetchData(['LSP3Profile']);
  
  // 3. Create signature challenge
  const message = `Sign this message to authenticate with Curia using your Universal Profile\n\nAddress: ${upAddress}\nTimestamp: ${Date.now()}`;
  const signature = await window.lukso.request({
    method: 'personal_sign',
    params: [message, upAddress]
  });
  
  // 4. Submit to backend (similar to ENS flow)
  // 5. Store session and advance to next stage
}
```

#### **Anonymous Session Flow:**
```typescript
async function createAnonymousSession(): Promise<AuthResult> {
  // 1. Generate anonymous user (no user interaction)
  const response = await fetch('/api/auth/identity-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityType: 'anonymous'
    })
  });
  
  if (!response.ok) throw new Error('Anonymous session creation failed');
  
  const { sessionToken, user } = await response.json();
  
  // 2. Store session and advance (anonymous users still need community context)
  setCookie('curia_session_token', sessionToken, { expires: 1 }); // 1 day for anonymous
  return { success: true, user, nextStage: 'community' };
}
```

**Stage Completion:** User now has established identity and active session

### **Stage 3: Community Selection** 🏘️ *Optional/Contextual*

**Purpose:** Determine which community the user wants to access  
**Duration:** 5-30 seconds (user dependent)  
**URL:** `/embed?stage=community&session=<token>`

**When This Stage is Skipped:**
- Community specified in embed URL: `/embed?community=abc123`
- User has a recent community preference in session
- Single-community mode (future configuration option)

**When This Stage is Required:**
- Multi-community access (user can choose)
- First-time user with no community preference
- User explicitly requested community selector

#### **UI Interface:**
```typescript
interface CommunitySelectionStage {
  // Options presented to user
  options: [
    {
      type: 'join_existing',
      title: 'Join Existing Community',
      action: () => showCommunityBrowser()
    },
    {
      type: 'create_new',
      title: 'Create New Community', 
      action: () => showCommunityCreator(),
      enabled: user.identityType !== 'anonymous' // Requires authentication
    },
    {
      type: 'recent',
      title: 'Recent Communities',
      communities: user.recentCommunities,
      action: (communityId) => selectCommunity(communityId)
    }
  ];
}
```

#### **Community Selection Flow:**
```typescript
async function selectCommunity(communityId: string): Promise<CommunityResult> {
  // 1. Validate community access
  const response = await fetch(`/api/communities/${communityId}/access-check`, {
    headers: { 'Authorization': `Bearer ${getSessionToken()}` }
  });
  
  if (!response.ok) {
    throw new Error('Community access denied');
  }
  
  const { community, userRole } = await response.json();
  
  // 2. Update session with community context
  await fetch('/api/auth/update-session', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSessionToken()}`
    },
    body: JSON.stringify({
      communityId,
      lastCommunity: communityId
    })
  });
  
  // 3. Advance to forum stage
  return { 
    success: true, 
    community, 
    userRole,
    nextStage: 'forum'
  };
}
```

**Stage Completion:** User + Community context established

### **Stage 4: Forum Application** 🎉 *Final State*

**Purpose:** Load the full Curia forum experience  
**Duration:** 200-500ms (app loading)  
**URL:** `/embed?stage=forum&session=<token>&community=<id>`

**Context Available:**
```typescript
interface ForumContext {
  user: {
    id: string;
    identityType: 'ens' | 'universal_profile' | 'anonymous';
    displayName: string;
    walletAddress?: string;
    ensName?: string;
    upAddress?: string;
    isAnonymous: boolean;
  };
  community: {
    id: string;
    name: string;
    shortId: string;
    settings: CommunitySettings;
  };
  session: {
    token: string;
    expiresAt: Date;
    permissions: string[];
  };
}
```

**Application Loading:**
```typescript
async function loadForumApplication(context: ForumContext): Promise<void> {
  // 1. Initialize forum application with full context
  const forumApp = new CuriaForumApp({
    user: context.user,
    community: context.community,
    session: context.session,
    mode: 'standalone' // vs 'common_ground'
  });
  
  // 2. Load initial data (posts, boards, etc.)
  await forumApp.initialize();
  
  // 3. Render full forum interface
  forumApp.render();
  
  // 4. Set up real-time connections, event handlers, etc.
  forumApp.enableRealTime();
}
```

**Stage Completion:** User is in full forum experience

---

## 🔄 Stage Transition Logic

### **Routing System**
```typescript
// iframe URL routing handles stage progression automatically
class ProgressiveIframeRouter {
  async route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const stage = url.searchParams.get('stage');
    const session = url.searchParams.get('session');
    
    // If no stage specified, detect from session
    if (!stage) {
      const detectedStage = await this.detectStage(request);
      return redirect(`/embed?stage=${detectedStage}`);
    }
    
    switch (stage) {
      case 'auth':
        return this.renderAuthenticationStage();
      case 'community':
        return this.renderCommunitySelectionStage(session);
      case 'forum':
        return this.renderForumApplication(session);
      default:
        return this.detectStage(request);
    }
  }
  
  async detectStage(request: Request): Promise<string> {
    const sessionState = await detectUserSession(request);
    return sessionState.stage;
  }
}
```

### **Smooth Transitions**
```typescript
// Each stage transition includes loading states and animations
class StageTransition {
  async transitionTo(nextStage: string, context: any): Promise<void> {
    // 1. Show loading state
    this.showLoadingOverlay(`Loading ${nextStage}...`);
    
    // 2. Prepare next stage
    await this.prepareStage(nextStage, context);
    
    // 3. Animate transition
    await this.animateTransition(nextStage);
    
    // 4. Update URL and render
    window.history.pushState(null, '', `/embed?stage=${nextStage}`);
    this.renderStage(nextStage, context);
  }
  
  private async animateTransition(nextStage: string): Promise<void> {
    // Fade out current stage
    await this.fadeOut(this.currentStageElement, 200);
    
    // Fade in next stage
    await this.fadeIn(this.nextStageElement, 200);
  }
}
```

---

## 💾 Session Management

### **Cookie-Based Sessions**
```typescript
interface SessionCookie {
  sessionToken: string;        // UUID referencing authentication_sessions table
  expiresAt: Date;            // 30 days for authenticated, 1 day for anonymous
  lastCommunity?: string;     // Most recent community access
  preferences: {
    theme: 'light' | 'dark';
    language: string;
  };
}

// Session validation
async function validateSession(sessionToken: string): Promise<Session | null> {
  const session = await db.query(`
    SELECT s.*, u.* 
    FROM authentication_sessions s
    JOIN users u ON s.user_id = u.user_id  
    WHERE s.session_token = $1 
      AND s.expires_at > CURRENT_TIMESTAMP 
      AND s.is_active = true
  `, [sessionToken]);
  
  if (!session.rows[0]) return null;
  
  // Update last_accessed_at
  await db.query(`
    UPDATE authentication_sessions 
    SET last_accessed_at = CURRENT_TIMESTAMP 
    WHERE session_token = $1
  `, [sessionToken]);
  
  return mapSessionData(session.rows[0]);
}
```

### **Session Security**
```typescript
// Session creation with proper security
async function createSession(user: User, authData: AuthData): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + (user.isAnonymous ? 1 : 30) * 24 * 60 * 60 * 1000);
  
  await db.query(`
    INSERT INTO authentication_sessions 
    (user_id, session_token, identity_type, wallet_address, signed_message, signature, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    user.id,
    sessionToken,
    authData.identityType,
    authData.walletAddress,
    authData.signedMessage,
    authData.signature,
    expiresAt
  ]);
  
  return sessionToken;
}
```

---

## 🎨 User Experience Considerations

### **Loading States**
- **Stage 1**: Invisible to user (instant detection)
- **Stage 2**: "Connecting wallet..." / "Please sign message..."
- **Stage 3**: "Loading communities..." / "Validating access..."
- **Stage 4**: "Loading forum..." with skeleton UI

### **Error Handling**
- **Wallet connection failed** → Allow retry or fallback to anonymous
- **Community access denied** → Show error + community browser
- **Session expired** → Automatically restart from Stage 2

### **Progressive Enhancement**
- **Anonymous users** can browse and read
- **Authenticated users** can post and comment  
- **Community members** get full feature access

### **Mobile Optimization**
- Touch-friendly wallet connection flows
- Responsive design across all stages
- Fast transitions to avoid frustration

---

## 🔧 Implementation Priority

### **Week 1: Core Infrastructure**
1. **Stage routing system** (`/embed?stage=X`)
2. **Session detection logic** (cookie validation)
3. **Basic stage transitions** (URL updates, loading states)

### **Week 2: Authentication Flows** 
1. **ENS wallet connection** (MetaMask integration)
2. **Universal Profile connection** (UP extension)
3. **Anonymous session creation** (instant fallback)

### **Week 3: Community & Polish**
1. **Community selection interface** (picker + creation)
2. **Forum application loading** (full context handoff)
3. **Error handling and edge cases** (offline, expired sessions, etc.)

---

## 🎯 Success Metrics

### **Performance Targets**
- **Stage 1 → 4 (authenticated user)**: <500ms total
- **Stage 1 → 2 → 4 (new user)**: <30 seconds including wallet interaction
- **Stage transitions**: <200ms each

### **User Experience Targets**
- **Seamless experience**: User never realizes they're going through stages
- **Error recovery**: Clear next steps when something fails
- **Mobile parity**: Equal experience on desktop and mobile

---

This specification provides the complete technical roadmap for implementing the Progressive Iframe experience. The key insight is that we're building a **state machine** inside an iframe that provides a seamless user experience while handling complex authentication and community selection logic behind the scenes.

Ready to implement this approach for Phase 1? 