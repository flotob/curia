# Curia Standalone Platform - Master Strategy & Roadmap

*Single source of truth for the Curia standalone transformation project*

**Last Updated:** January 2025  
**Status:** Phase 1 - Progressive Iframe Authentication (Week 1/3) 🚧  
**Next Milestone:** "Moment of Delight" Profile Preview + Signature Verification

---

## 🎯 Executive Summary

**Vision:** Transform Curia from a Common Ground-dependent plugin into a fully autonomous, embeddable forum platform that anyone can deploy on their website.

**Mission:** Democratize sophisticated forum technology through a simple JavaScript snippet, while maintaining optional compatibility with the existing Common Ground ecosystem.

**Current State:** ✅ Complete infrastructure independence achieved. 🚧 Building progressive iframe authentication with "moment of delight" experience.

**Core Value Proposition:** "Stripe for Forums" - Any website owner can embed a fully-featured forum with just a script tag, while retaining complete isolation and security.

---

## 🌟 **"Moment of Delight" Authentication Flow** ⭐ *NEW FOCUS*

**Current Issue:** Authentication flow rushes from wallet connection → community selection without the magical profile preview moment.

**Target Experience:**
1. **Connection Step**: User clicks "Connect ENS/Universal Profile" 
2. **🎉 Moment of Delight**: Beautiful profile card appears showing:
   - Profile picture/avatar 
   - ENS name or UP username
   - Wallet address (formatted)
   - Follower count, balances, verification badges
   - "Switch Account" and "Continue" buttons
3. **Signature Verification**: "Prove it's really your wallet" → sign message
4. **Success State**: "Authenticated ✓" → proceed to community selection
5. **Community Selection**: Choose or create community (existing step)
6. **Forum Load**: Full forum with authenticated context

**Key Components to Rebuild:**
- 🎨 **Profile Preview Cards** (we had `UPProfileDisplay`, `EthereumRichRequirementsDisplay`)
- ✍️ **Signature Verification UI** (message signing + verification)
- 🔄 **Account Switching** (disconnect/reconnect flow)
- ✅ **Success States** (beautiful confirmation screens)

**Missing Pieces:**
- [ ] Profile metadata fetching (ENS names, UP profiles, follower counts)
- [ ] Signature challenge generation and verification  
- [ ] Account switching UI patterns
- [ ] Smooth transitions between auth stages

---

## 📊 Project Status Dashboard

### ✅ **Completed Phases**
- **Infrastructure Untethering** (Dec 2024 - Jan 2025) - COMPLETE
  - Migrated to `@curia_/cg-plugin-lib@1.0.6` with full type safety
  - Built production-ready host service with health checks on Railway
  - Extended database schema for multi-identity support ✅ **ALREADY DEPLOYED**
  - Fixed production deployment and build issues
  - Built beautiful professional design system with proper CSS ✅

### 🚧 **Current Phase: Progressive Iframe Authentication** *REVISED ROADMAP*
- **Start Date:** January 2025
- **Target:** Seamless iframe experience with delightful authentication flow
- **Current Status:** Basic iframe stages working, need profile preview + signature verification

### 📋 **Revised Phase 1 Roadmap** 🔄

**Current Planned Order:**
1. ✅ **Week 1a: Basic Iframe Foundation** - COMPLETE 
   - Progressive iframe stages (loading → auth → community → forum) ✅
   - Professional design system with CSS theme support ✅
   - Anonymous authentication working ✅
2. 🚧 **Week 1b: "Moment of Delight" Authentication** - IN PROGRESS
   - Profile preview cards with rich metadata
   - Signature verification flow
   - Account switching capabilities  
3. **Week 2: Complete Wallet Integration** 
   - ENS authentication with metadata fetching
   - Universal Profile with social data
   - Database integration for wallet verification
4. **Week 3: Community Integration & Polish**
   - Community selection stage refinement
   - End-to-end testing and polish
   - Error handling and edge cases

---

## 🏗️ Technical Architecture Overview

### **Current Progressive Iframe Architecture** ✅
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Any Website   │    │ Standalone App  │    │   Database      │
│                 │    │   (Railway)     │    │   (PostgreSQL)  │
│ 1. <script>     │    │                 │    │                 │
│ 2. <iframe>     │───▶│ PROGRESSIVE     │◀──▶│ • Users + auth  │
│ 3. Responsive   │    │ EXPERIENCE:     │    │ • Communities   │
│    container    │    │                 │    │ • Sessions      │
│                 │    │ ✅ Stage 1: Load │    │ • Forum data    │
│                 │◀───│ ✅ Stage 2: Auth │    │                 │
│ 4. Auto-resize  │    │ 🚧 Stage 3: Profile│                 │
│                 │    │ 🚧 Stage 4: Sign │    │                 │
│                 │    │ ✅ Stage 5: Community│                │
│                 │    │ ✅ Stage 6: Forum │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Enhanced Progressive Iframe Experience:**
1. **Stage 1 - Session Check**: ✅ Instant check for existing authentication
2. **Stage 2 - Authentication**: ✅ Show wallet connection options (ENS, UP, Anonymous)
3. **🆕 Stage 3 - Profile Preview**: 🚧 "Moment of delight" with rich profile data 
4. **🆕 Stage 4 - Signature Verification**: 🚧 "Prove it's your wallet" → sign message
5. **Stage 5 - Community Selection**: ✅ Choose/create community (if needed)
6. **Stage 6 - Forum Application**: ✅ Full forum loads with established context

---

## 🛤️ Active Roadmap

### **🚧 Current Sprint: "Moment of Delight" Authentication**
**Timeline:** 1 week remaining (Jan 2025)  
**Goal:** Add profile preview + signature verification between wallet connection and community

#### **This Week's Immediate Tasks:**
- [ ] **1.1** Add Profile Preview Stage
  - Create `/embed?stage=profile-preview` route
  - Build `ProfilePreviewStep` component with rich metadata display
  - Integrate ENS/UP profile fetching (names, avatars, follower counts)
  - Add "Switch Account" and "Continue" buttons
- [ ] **1.2** Add Signature Verification Stage  
  - Create `/embed?stage=signature-verification` route
  - Generate challenge messages for wallet signatures
  - Implement signature verification with backend
  - Beautiful success/error states
- [ ] **1.3** Enhanced Transitions
  - Smooth transitions between: connection → profile → signature → community
  - Loading states and error handling
  - Iframe height adjustments for new stages

**Success Criteria:**
- [ ] User connects wallet → sees beautiful profile card with metadata
- [ ] User can switch accounts or continue to signature
- [ ] Signature verification works end-to-end with database
- [ ] Entire flow feels magical and delightful

### **Week 2: Complete Wallet Integration** 📅 *PLANNED*
**Timeline:** 1 week (Feb 2025)  
**Goal:** Full ENS + Universal Profile integration with metadata

#### **Week 2: Wallet Authentication Flows**
- [ ] **2.1** ENS authentication interface
  - Complete wallet connection UI (MetaMask, WalletConnect, etc.)
  - ENS domain verification and rich metadata fetching
  - User creation and session establishment
- [ ] **2.2** Universal Profile authentication
  - UP extension detection and connection
  - UP metadata fetching (social profiles, verification status)
  - Profile data extraction and storage

#### **Week 3: Community Integration & Polish**
- [ ] **3.1** Community selection stage
  - Community picker interface for authenticated users
  - Default community assignment for specific embeds
  - Community creation flow (if enabled)
- [ ] **3.2** Stage transition system
  - Smooth loading states between stages
  - Error handling and retry mechanisms
  - Complete end-to-end testing

**Success Criteria:**
- [ ] Complete auth flow: wallet → profile → signature → community → forum
- [ ] All metadata loading (ENS names, UP profiles, follower counts)
- [ ] Professional UX with error handling and edge cases
- [ ] Ready for Phase 2 (Community Management or Embedding System)

### **Phase 2: Community Management** 📅 *PLANNED*
**Timeline:** 3 weeks (Feb 2025)  
**Goal:** Users can create and manage communities

### **Phase 3: Embedding System** 📅 *CORE VALUE PROPOSITION* ⭐
**Timeline:** 4 weeks (Mar 2025)  
**Goal:** Any website can embed Curia forums with a simple script tag

### **Phase 4: Production Optimization** 📅 *PLANNED*
**Timeline:** 4 weeks (Apr 2025)  
**Goal:** Scale-ready infrastructure

---

## 🎯 Implementation Strategy

### **Core Principles**
1. **✨ Moment of Delight** - Make wallet connection feel magical with rich profile previews
2. **Progressive Enhancement** - Iframe starts simple, progressively reveals complexity
3. **User-Centric Design** - 5-minute setup from any website to working forum
4. **Security First** - Proper wallet authentication, secure cross-origin communication

### **Technical Approach**
- **🆕 Enhanced Progressive Stages** - Add profile preview + signature verification stages
- **Separate Instance Deployment** - Standalone version deployed independently from CG version
- **Shared Database** - Both instances use same PostgreSQL database for data consistency
- **Future Account Merging** - Allow users to unify standalone + CG accounts later

### **Key Architectural Decisions**
- ✅ **PostgreSQL** for primary data storage (complex relationships, ACID compliance)
- ✅ **Next.js API Routes** for host service (familiar stack, good performance)
- ✅ **Progressive Iframe** stages via routing (seamless user experience)
- ✅ **Cookie + JWT Sessions** with wallet signature verification (crypto-native auth)
- ✅ **Professional Design System** with proper CSS and theme support
- 🆕 **Rich Profile Components** reusing battle-tested patterns from main app
- 🆕 **Signature Challenge System** for wallet ownership verification
- 🆕 **Metadata Fetching** for ENS, UP, and social data integration

---

## 📋 Key Decisions Log

### **Recent Decisions (Jan 2025)**
- **✅ Library Migration Strategy**: Use `@curia_/cg-plugin-lib` v1.0.6 for drop-in compatibility
- **✅ Host Service Deployment**: Railway for production hosting with health checks
- **✅ Database Schema**: Extended existing tables (ALREADY DEPLOYED) ✅
- **✅ Progressive Iframe Architecture**: Single iframe with stage-based routing for seamless UX
- **✅ Professional Design System**: Fixed CSS compilation issues, beautiful theme support
- **🆕 "Moment of Delight" Focus**: Add profile preview + signature verification stages
- **🆕 Enhanced Auth Flow**: 6-stage experience instead of 4-stage for better UX

### **Pending Decisions**
- **⏳ Profile Metadata Sources**: ENS vs UP vs social data priority and fallbacks
- **⏳ Signature Challenge Format**: Message format and validation approach
- **⏳ Account Switching UX**: Modal vs inline vs new page approach
- **⏳ Error Handling Strategy**: Retry mechanics vs fallback flows
- **⏳ Phase Ordering**: Embedding System as Phase 2 vs Phase 3 (strategic importance)

---

## 🚧 Current Sprint (Week 1 Continued)

### **🎯 Immediate Focus: "Moment of Delight" Implementation**
**Sprint Goal:** Add profile preview + signature verification stages for magical auth experience

### **🔥 Active Tasks (Next 2-3 Days)**
- [ ] **Profile Preview Stage**: Create beautiful profile cards showing connected wallet info
- [ ] **Signature Verification**: Challenge generation + message signing flow
- [ ] **Enhance Stage Transitions**: Smooth progression through enhanced 6-stage flow
- [ ] **Test "Moment of Delight"**: Ensure the profile preview feels magical

### **Technical Priorities**
1. **✨ Delightful UX**: Profile cards that make users feel proud of their wallets
2. **🔐 Security**: Proper signature verification with challenge-response
3. **🔄 Flow Smoothness**: Seamless transitions without jarring jumps
4. **📊 Rich Data**: All the metadata we had before (names, avatars, stats)

### **🚨 Critical Path Dependencies**
- **Profile Metadata APIs**: Need ENS resolution and UP profile fetching  
- **Signature Backend**: Challenge generation and verification endpoints
- **UI Components**: Rich profile cards and signature verification screens

### **Blockers & Risks**
- None currently identified (design system working, infrastructure solid)

### **Next Week Preview**
- Complete wallet authentication with full metadata integration
- End-to-end testing of entire auth flow
- Polish and error handling for all edge cases

---

## 📚 Reference Documentation

### **Architecture & Research**
- 📄 [Standalone Identity System Architecture](./standalone-identity-system-architecture.md)
- 📄 [Host Service Research & Implementation](./standalone-host-service-research.md)
- 📄 [Wallet Integration Consistency Analysis](./wallet-integration-consistency-analysis.md) ⭐ **BATTLE-TESTED PATTERNS**

### **Component References** 🆕
- 🎨 **Profile Components**: `UPProfileDisplay`, `EthereumRichRequirementsDisplay`
- 🔐 **Auth Components**: `UniversalProfileContext`, `EthereumProfileContext`  
- ✨ **UI Patterns**: Rich category headers, profile preview cards, verification badges

---

## 🎯 Next Actions

### **🔥 Immediate (Next 48 Hours)**
1. **Create Profile Preview Stage** - Beautiful cards showing connected wallet info
2. **Build Signature Verification** - Challenge generation + message signing flow
3. **Enhance Stage Transitions** - Smooth progression through enhanced 6-stage flow
4. **Test "Moment of Delight"** - Ensure the profile preview feels magical

### **Short-term (This Week)**
1. **Complete enhanced auth flow** with profile preview + signature verification
2. **Add metadata fetching** for ENS names, UP profiles, social data
3. **Polish transitions and error states** for professional UX
4. **Validate against main app patterns** for consistency

### **Medium-term (2-3 weeks)**
1. **Complete wallet integration** with full ENS + UP support
2. **Finalize community selection** integration with auth flow
3. **End-to-end testing** of complete iframe experience  
4. **Phase 2 decision** (Community Management vs Embedding System priority)

---

*This document is the single source of truth for the Curia standalone project. Updated with enhanced "moment of delight" authentication focus.*

**🔄 Last Updated**: January 2025 - Enhanced Auth Flow Focus  
**📅 Next Review**: Enhanced auth flow completion + Phase 2 planning  
**📍 Current Phase**: Progressive Iframe Authentication (Week 1/3) - "Moment of Delight" Focus  
**🎯 Strategic Priority**: 6-stage auth flow with profile preview + signature verification ✨ 