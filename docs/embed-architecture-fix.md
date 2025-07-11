# Embed System Architecture Fix

**Date**: January 2025  
**Status**: Analysis & Planning Phase  
**Problem**: Current architecture uses nested iframes instead of single iframe with src switching

## 🚨 Current Problem Analysis

### What We Built Wrong

**Incorrect Architecture:**
```
Customer Website
  └── Embed Script (/embed.js)
      └── Iframe #1: /embed (auth flow)
          └── ForumStep Component
              └── ClientPluginHost creates Iframe #2: localhost:3000 (forum)
```

**Problems:**
1. **Nested Iframes** - Complex, performance issues, security concerns
2. **Database Provider in Wrong Place** - In embed route instead of parent
3. **No Parent Communication** - Embed doesn't signal auth completion to parent
4. **Resource Duplication** - ClientPluginHost + PostMessage handling in child iframe

### What Should Be Built

**Correct Architecture:**
```
Customer Website  
  └── Embed Script (/embed.js) ← HAS DATABASE DATA PROVIDER + CLIENTPLUGINHOST
      └── Single Iframe that switches src:
          1. Phase 1: /embed (auth + community selection)
          2. Phase 2: localhost:3000?mod=standalone (forum)
```

## 🎯 Correct Architecture Design

### Component Responsibilities

#### **1. Parent Window (Customer Website + Embed Script)**
- **Database Provider**: Real PostgreSQL queries for `getUserInfo()`, `getCommunityInfo()`, etc.
- **ClientPluginHost**: Handles PostMessage communication with forum
- **Iframe Src Management**: Switches iframe between auth flow and forum
- **Auth Context Storage**: Stores user ID + community ID after auth completion
- **PostMessage Router**: Routes forum API calls to database provider

#### **2. Child Iframe Phase 1 (/embed)**
- **Authentication Flow**: Wallet connection, profile preview, signature
- **Community Selection**: Show available communities, let user pick
- **Parent Communication**: Send `auth-complete` message with user + community data
- **NO DATABASE PROVIDER**: Just UI for auth flow
- **NO FORUM LOADING**: Just signals completion to parent

#### **3. Child Iframe Phase 2 (localhost:3000?mod=standalone)**
- **Forum Application**: Real Curia forum in standalone mode
- **PostMessage API Calls**: Asks parent for user/community/friend data
- **NO AUTH UI**: Just forum functionality
- **Receives Responses**: Gets real database data from parent

### PostMessage Protocol Design

#### **Phase 1: Auth Completion**
```typescript
// From /embed to parent
{
  type: 'curia-auth-complete',
  userId: 'user_123' | 'anonymous_456',
  communityId: 'community_xyz',
  sessionToken: 'jwt_token_here',
  profileData: {
    type: 'ens' | 'universal_profile' | 'anonymous',
    name: 'vitalik.eth',
    address: '0x...',
    // ... other profile fields
  }
}
```

#### **Phase 2: Forum API Calls**
```typescript
// From forum to parent (existing @curia_ protocol)
{
  type: 'api_request',
  iframeUid: 'ABC123',
  requestId: 'req_456',
  method: 'getUserInfo' | 'getCommunityInfo' | 'getUserFriends',
  params: { limit: 10, offset: 0 }
}

// From parent to forum (existing @curia_ protocol)  
{
  type: 'api_response',
  iframeUid: 'ABC123',
  requestId: 'req_456',
  data: { /* real database response */ },
  error?: 'error message'
}
```

## 🔧 Implementation Plan

### **Step 1: Move Database Provider to Parent**

**Current Location**: `servers/host-service/src/lib/DataProvider.ts` (used in API routes)
**New Location**: Parent window (embed script or demo page)

**Changes Needed:**
- Move `DatabaseDataProvider` to client-side
- Convert database queries to API calls to host service
- Update demo page to instantiate and use provider

### **Step 2: Add Auth Completion Communication**

**Modify**: `/embed` route components
**Add**: PostMessage to parent when auth flow completes

**New Component**: `AuthCompletionHandler`
```typescript
// In CommunitySelectionStep or new component
const notifyAuthComplete = (userId: string, communityId: string) => {
  window.parent.postMessage({
    type: 'curia-auth-complete',
    userId,
    communityId,
    sessionToken,
    profileData
  }, '*');
};
```

### **Step 3: Update Parent Iframe Management**

**Modify**: Embed script (`/embed.js`) or demo page
**Add**: 
- Listen for `curia-auth-complete` messages
- Switch iframe src from `/embed` to forum URL
- Store auth context for PostMessage responses

**New Logic**:
```typescript
// In embed script or demo page
window.addEventListener('message', (event) => {
  if (event.data.type === 'curia-auth-complete') {
    // Store auth context
    authContext = {
      userId: event.data.userId,
      communityId: event.data.communityId,
      sessionToken: event.data.sessionToken
    };
    
    // Switch iframe to forum
    iframe.src = 'http://localhost:3000?mod=standalone&iframeUid=ABC123';
  }
});
```

### **Step 4: Remove Nested Iframe Logic**

**Remove**: `ForumStep` component's `ClientPluginHost` usage
**Replace**: Simple completion message or direct parent notification

**Update**: ForumStep becomes "AuthCompletedStep" that just sends PostMessage

### **Step 5: Connect Parent to Database**

**Add**: API communication from parent to host service
**Use**: Existing API routes (`/api/user`, `/api/community`) 
**Pass**: Real auth context to all database queries

## 🔍 Architecture Validation

### **Flow Validation**

1. **Customer embeds script** ✅
   - Embed script loads `/embed` in iframe
   - No database calls yet

2. **User authenticates** ✅  
   - /embed handles wallet connection
   - /embed collects community selection
   - /embed sends `curia-auth-complete` to parent

3. **Parent receives auth data** ✅
   - Parent stores userId + communityId  
   - Parent switches iframe src to forum
   - Parent initializes ClientPluginHost with auth context

4. **Forum loads and communicates** ✅
   - Forum sends `getUserInfo()` via PostMessage
   - Parent receives, queries database with real userId
   - Parent responds with real user data
   - Forum renders with real data

### **Data Flow Validation**

```
User Auth (in /embed) → PostMessage → Parent → Database → PostMessage → Forum
```

1. User connects wallet in `/embed` iframe
2. `/embed` sends auth data to parent via PostMessage  
3. Parent stores auth context and switches iframe to forum
4. Forum requests user data via PostMessage
5. Parent queries database with real userId/communityId
6. Parent responds with real database results
7. Forum displays real user/community data

### **Security Validation**

- ✅ Single iframe reduces attack surface
- ✅ PostMessage origin validation can be enforced
- ✅ Auth context stays in parent (customer's domain)
- ✅ Database credentials only in host service backend

## 🧪 Testing Strategy

### **Phase 1 Testing**
- Load demo page
- Verify `/embed` iframe loads auth flow
- Complete authentication
- Verify `curia-auth-complete` message sent to parent

### **Phase 2 Testing**  
- Verify parent receives auth message
- Verify iframe src switches to forum URL
- Verify forum loads in iframe

### **Phase 3 Testing**
- Verify forum sends PostMessage API calls
- Verify parent responds with real database data
- Verify forum displays real user/community information

### **Integration Testing**
- Test full flow: auth → community selection → forum loading → data display
- Test with different auth types (ENS, UP, anonymous)
- Test with different communities

## 🚧 Implementation Questions - RESOLVED

### **1. Client-Side Database Provider** ✅ **RESOLVED**
- **Answer**: Keep `DatabaseDataProvider` in host service (server-side)
- **Pattern**: Parent uses `ClientPluginHost` which makes HTTP calls to host service APIs
- **Evidence**: Test page already works this way - `ClientPluginHost` → API calls → `DatabaseDataProvider`

### **2. Demo vs Production** ✅ **RESOLVED**
- **Demo page**: Gets `ClientPluginHost` for testing (like current test page)
- **Production embed script**: Gets `ClientPluginHost` for customer sites
- **Both**: Make API calls to same host service endpoints
- **Database**: Always stays in host service backend

### **3. Auth Context Storage** ✅ **RESOLVED**
- **Location**: Parent window memory (not localStorage)
- **Method**: `ClientPluginHost.setAuthContext(authContext)`
- **Duration**: Session-based, cleared on page reload
- **Pattern**: Same as we built for ForumStep, but moved to parent

### **4. Error Handling** ✅ **RESOLVED**
- **Auth completion message**: Add retry logic and timeout
- **Forum iframe load**: Standard iframe error handling
- **API call failures**: `ClientPluginHost` already handles this
- **Network errors**: Host service API endpoints have error responses

## 🔧 Updated Implementation Plan

### **Step 1: Add ClientPluginHost to Demo Page** 
**Pattern**: Copy from test page
**Add**: Same `ClientPluginHost` initialization as test page
**Result**: Demo page can handle PostMessage from forum

### **Step 2: Add Auth Completion Communication**
**Modify**: `/embed` components
**Add**: Send `curia-auth-complete` message to parent
**Location**: After community selection completes

### **Step 3: Add Iframe Src Switching**
**Modify**: Demo page
**Add**: Listen for auth completion, switch iframe src
**Remove**: Manual "Load Embed" button (automatic after auth)

### **Step 4: Remove ForumStep Nested Iframe**
**Remove**: `ForumStep` component entirely  
**Replace**: Simple completion step that sends PostMessage
**Result**: No more nested iframes

### **Step 5: Update Embed Script for Production**
**Copy**: Demo page pattern to `/embed.js`
**Add**: Same `ClientPluginHost` logic
**Result**: Production embed script works like demo

## 📋 Final Architecture Summary

### **✅ Research Complete - Ready to Implement**

**Current Working Pattern (Test Page):**
```
Test Page (localhost:3001/test)
  └── ClientPluginHost
      └── Forum Iframe (localhost:3000?mod=standalone)
          └── PostMessage API calls
              └── Host Service APIs (/api/user, /api/community)
                  └── DatabaseDataProvider (real database)
```

**Target Pattern (Fixed Embed):**
```
Demo Page (localhost:3001/demo)  
  └── ClientPluginHost ← COPY FROM TEST PAGE
      └── Single Iframe (switches src):
          1. Phase 1: /embed (auth + community)
          2. Phase 2: localhost:3000?mod=standalone (forum)
              └── PostMessage API calls ← SAME AS TEST PAGE
                  └── Host Service APIs ← SAME AS TEST PAGE
                      └── DatabaseDataProvider ← SAME AS TEST PAGE
```

### **Key Insights from Research:**

1. **✅ Database provider stays server-side** - No client-side database connections needed
2. **✅ ClientPluginHost pattern proven** - Test page shows it works perfectly  
3. **✅ API endpoints already built** - `/api/user`, `/api/community` handle real database queries
4. **✅ PostMessage protocol established** - `@curia_` libraries define the interface
5. **✅ Auth context mechanism exists** - `ClientPluginHost.setAuthContext()` already implemented

### **Implementation Confidence: HIGH** 🚀

- **No architectural unknowns** - All patterns exist and work
- **No new API endpoints needed** - Host service APIs complete
- **No database changes needed** - DatabaseDataProvider works correctly
- **Clear step-by-step plan** - Each step builds on proven patterns

---

## 🎯 Ready to Begin Implementation

**All research complete. All questions resolved. Architecture validated.**

**Next**: Get approval and begin Step 1 - Add ClientPluginHost to Demo Page 