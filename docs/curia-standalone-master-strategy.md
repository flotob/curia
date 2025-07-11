# Curia Standalone Platform - Master Strategy & Roadmap

*Single source of truth for the Curia standalone transformation project*

**Last Updated:** January 2025  
**Status:** Phase 1 - Infrastructure Complete, Moving to Identity System  
**Next Milestone:** Progressive Iframe Authentication (3 weeks)

---

## 🎯 Executive Summary

**Vision:** Transform Curia from a Common Ground-dependent plugin into a fully autonomous, embeddable forum platform that anyone can deploy on their website.

**Mission:** Democratize sophisticated forum technology through a simple JavaScript snippet, while maintaining optional compatibility with the existing Common Ground ecosystem.

**Current State:** ✅ Complete infrastructure independence achieved. Ready to build standalone identity and community management systems.

**Core Value Proposition:** "Stripe for Forums" - Any website owner can embed a fully-featured forum with just a script tag, while retaining complete isolation and security.

---

## 📊 Project Status Dashboard

### ✅ **Completed Phases**
- **Infrastructure Untethering** (Dec 2024 - Jan 2025) - COMPLETE
  - Migrated to `@curia_/cg-plugin-lib@1.0.6` with full type safety
  - Built production-ready host service with health checks on Railway
  - Extended database schema for multi-identity support ✅ **ALREADY DEPLOYED**
  - Fixed production deployment and build issues

### 🚧 **Current Phase: Progressive Iframe Authentication**
- **Start Date:** January 2025
- **Target:** Seamless iframe experience with authentication flow in 3 weeks
- **Key Deliverable:** Multi-stage iframe that handles auth → community → forum progression

### 📋 **Strategic Phase Analysis**

**Current Planned Order:**
1. Phase 1: Progressive Iframe Authentication (3 weeks) - IN PROGRESS
2. Phase 2: Community Management (3 weeks) 
3. Phase 3: Embedding System (4 weeks) ⭐ **CORE VALUE PROPOSITION**
4. Phase 4: Production Optimization (4 weeks)

**⚡ Alternative High-Impact Ordering:**
1. Phase 1: Progressive Iframe Authentication (current)
2. **Phase 2: Embedding System** (move from Phase 3) ⭐ 
3. Phase 3: Community Management (defer)
4. Phase 4: Production Optimization

**Arguments for Reordering:**
- ✅ **Faster Time to Market**: Deliver core value proposition sooner
- ✅ **Business Validation**: Test market demand with basic embedding capability  
- ✅ **Technical Independence**: Embedding mainly needs identity + existing forum features
- ✅ **User Journey**: Most users will embed existing communities before creating new ones
- ✅ **Industry Standard**: Well-established pattern (Disqus, Stripe, etc.) with clear implementation path

**Arguments for Current Order:**
- ⚠️ **Admin Controls**: Community management tools before external embedding
- ⚠️ **Security**: Full permission systems before opening to external sites
- ⚠️ **Polish**: More complete feature set for initial market entry

**📝 Decision Pending**: Evaluate after Phase 1 completion based on technical complexity and business priorities.

---

## 🏗️ Technical Architecture Overview

### **Current Infrastructure** ✅
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main App      │    │   Host Service  │    │   Database      │
│   (Next.js)     │    │   (Railway)     │    │   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • Forum features│◀──▶│ • API endpoints │◀──▶│ • User data     │
│ • Gating system │    │ • Auth system   │    │ • Communities   │
│ • Real-time     │    │ • Request sign  │    │ • Sessions      │
│ • AI features   │    │ • Health checks │    │ • Identity data │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Target Progressive Iframe Architecture** 🎯
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Any Website   │    │ Standalone App  │    │   Database      │
│                 │    │   (Railway)     │    │   (PostgreSQL)  │
│ 1. <script>     │    │                 │    │                 │
│ 2. <iframe>     │───▶│ PROGRESSIVE     │◀──▶│ • Users + auth  │
│ 3. Responsive   │    │ EXPERIENCE:     │    │ • Communities   │
│    container    │    │                 │    │ • Sessions      │
│                 │    │ Stage 1: Check  │    │ • Forum data    │
│                 │◀───│ Stage 2: Auth   │    │                 │
│ 4. Auto-resize  │    │ Stage 3: Select │    │                 │
│                 │    │ Stage 4: Forum  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Progressive Iframe Experience:**
1. **Stage 1 - Session Check**: Instant check for existing authentication (cookie/localStorage)
2. **Stage 2 - Authentication**: If needed, show wallet connection UI (ENS, UP, or Anonymous)
3. **Stage 3 - Community Selection**: If needed, show community picker or creation
4. **Stage 4 - Forum Application**: Full forum loads with established user + community context

**Deployment Architecture:**
- **Standalone Instance**: Separate deployment of Curia service (new auth system)
- **CG Instance**: Existing CG-embedded version (legacy auth system)
- **Shared Database**: Both instances use same PostgreSQL database
- **Account Merging**: Future feature to unify standalone + CG accounts

**Detailed Architecture References:**
- 📄 [Identity System Architecture](./standalone-identity-system-architecture.md)
- 📄 [Host Service Research](./standalone-host-service-research.md)
- 📄 [Embedding Implementation Guide](./snippet-howto.md) ⭐ **NEW**

---

## 🛤️ Active Roadmap

### **Phase 1: Progressive Iframe Authentication** 🚧 *IN PROGRESS*
**Timeline:** 3 weeks (Jan 2025)  
**Goal:** Seamless iframe experience that handles authentication → community → forum progression

#### **Week 1: Progressive Iframe Foundation**
- [ ] **1.1** Create iframe router system
  - Route-based stage management (`/embed?stage=auth`, `/embed?stage=community`, `/embed?stage=forum`)
  - Session detection and automatic stage advancement
  - Smooth transitions between stages
- [ ] **1.2** Authentication session management
  - Cookie-based session persistence (30-day expiration)
  - Session validation and refresh logic
  - Anonymous session creation for immediate access

#### **Week 2: Wallet Authentication Flows**
- [ ] **2.1** ENS authentication interface
  - Wallet connection UI (MetaMask, WalletConnect, etc.)
  - ENS domain verification and signature flow
  - User creation and session establishment
- [ ] **2.2** Universal Profile authentication
  - UP extension detection and connection
  - UP metadata fetching and signature verification
  - Profile data extraction and storage

#### **Week 3: Community Integration & Polish**
- [ ] **3.1** Community selection stage
  - Community picker interface for authenticated users
  - Default community assignment for specific embeds
  - Community creation flow (if enabled)
- [ ] **3.2** Stage transition system
  - Smooth loading states between stages
  - Error handling and retry mechanisms
  - Iframe height adjustment for different stages

**Success Criteria:**
- [ ] User visits third-party site → iframe loads instantly
- [ ] If no session: authentication UI appears seamlessly in iframe
- [ ] After auth: community selection (if needed) appears in same iframe
- [ ] Finally: full forum loads in same iframe with proper context
- [ ] Entire flow feels like single, progressive application load

### **Phase 2: Community Management** 📅 *PLANNED*
**Timeline:** 3 weeks (Feb 2025)  
**Goal:** Users can create and manage communities

#### **Week 4: Community Creation**
- [ ] **4.1** Community creation interface
- [ ] **4.2** Ownership and permission systems
- [ ] **4.3** Basic community settings

#### **Week 5: Community Discovery**
- [ ] **5.1** Public community browsing
- [ ] **5.2** Join/leave community flows
- [ ] **5.3** Community search and filtering

#### **Week 6: Integration & Testing**
- [ ] **6.1** Community stage integration with iframe flow
- [ ] **6.2** Context validation and error handling
- [ ] **6.3** End-to-end user journey testing

**Success Criteria:**
- [ ] Users can create communities without CG
- [ ] Community discovery and joining works
- [ ] Full context flows to main application

### **Phase 3: Embedding System** 📅 *CORE VALUE PROPOSITION* ⭐
**Timeline:** 4 weeks (Mar 2025)  
**Goal:** Any website can embed Curia forums with a simple script tag

#### **Week 7: JavaScript Snippet Foundation**
- [ ] **7.1** Core embed.js script development
  - Minimal, stable snippet that won't require updates
  - Data attribute configuration (community ID, theme, etc.)
  - Async loading with no render blocking
  - iframe injection and initialization
- [ ] **7.2** Iframe security and isolation
  - X-Frame-Options configuration for embed routes
  - Content Security Policy frame-ancestors setup
  - Cross-origin communication security
  - Domain validation and restrictions

#### **Week 8: Communication Infrastructure**
- [ ] **8.1** PostMessage communication system
  - Secure origin verification and handshake
  - Authentication token passing from parent to iframe
  - Height adjustment messages for responsive design
  - Event forwarding (optional analytics integration)
- [ ] **8.2** Identity integration with embedding
  - Single Sign-On via postMessage + JWT
  - Anonymous user handling in embedded context
  - Session persistence across page reloads
  - Community/domain restriction enforcement

#### **Week 9: Responsive Design & UX**
- [ ] **9.1** Automatic iframe resizing
  - Integration with iframe-resizer library for dynamic height
  - Content-aware sizing for forum navigation
  - Responsive width handling (100% container width)
  - Mobile optimization and touch interaction
- [ ] **9.2** Performance optimization
  - Lazy loading support (loading="lazy" attribute)
  - Minimal embed script size (<5KB)
  - CDN setup for static assets
  - Preloading strategies for common use cases

#### **Week 10: Advanced Embedding Features**
- [ ] **10.1** Customization and theming
  - Theme selection via data attributes
  - Custom CSS injection support (limited scope)
  - Brand color and styling options
  - Community-specific appearance settings
- [ ] **10.2** Admin dashboard and analytics
  - Embed code generation interface
  - Usage tracking and analytics dashboard
  - Domain management and restrictions
  - Error monitoring and debugging tools

**Key Technical Decisions:**
- **Snippet Strategy**: Static `embed.js` hosted on CDN with data attribute configuration
- **Communication Library**: iframe-resizer for automatic sizing + custom postMessage for auth
- **Security Model**: Origin verification + JWT tokens for authentication
- **Fallback Strategy**: Fixed height iframe if dynamic resizing fails
- **Browser Support**: Modern browsers (2025 standards) with IE11+ compatibility

**Industry Reference Implementation:**
```html
<!-- User embeds this on their site -->
<div id="curia-forum"></div>
<script 
  src="https://curia.com/embed.js" 
  data-community="abc123"
  data-theme="light"
  async>
</script>
```

**Success Criteria:**
- [ ] 5-minute setup: snippet → working forum on any website
- [ ] Responsive design across all devices and container sizes
- [ ] Secure authentication flow with wallet connections
- [ ] <100ms iframe load times with proper lazy loading
- [ ] Zero CSS/JS conflicts with host site (complete isolation)
- [ ] Real-world testing on WordPress, Wix, static HTML sites

### **Phase 4: Production Optimization** 📅 *PLANNED*
**Timeline:** 4 weeks (Apr 2025)  
**Goal:** Scale-ready infrastructure

#### **Week 11-12: Performance & Scale**
- [ ] **11.1** Database optimization and caching
- [ ] **11.2** CDN setup and asset optimization
- [ ] **12.1** Load testing and bottleneck fixes
- [ ] **12.2** Monitoring and alerting systems

#### **Week 13-14: Advanced Features**
- [ ] **13.1** Advanced analytics dashboard
- [ ] **13.2** Webhook system for integrations
- [ ] **14.1** Custom domain support
- [ ] **14.2** Premium features and billing

**Success Criteria:**
- [ ] 1000+ concurrent communities supported
- [ ] <100ms iframe load times
- [ ] 99.9% uptime with monitoring

---

## 🎯 Implementation Strategy

### **Core Principles**
1. **Progressive Enhancement** - Iframe starts simple, progressively reveals complexity
2. **User-Centric Design** - 5-minute setup from any website to working forum
3. **Security First** - Proper wallet authentication, secure cross-origin communication
4. **Performance Focus** - Fast loading, responsive embeds, scalable infrastructure

### **Technical Approach**
- **Separate Instance Deployment** - Standalone version deployed independently from CG version
- **Shared Database** - Both instances use same PostgreSQL database for data consistency
- **Progressive Iframe Experience** - Single iframe handles auth → community → forum stages
- **Future Account Merging** - Allow users to unify standalone + CG accounts later

### **Key Architectural Decisions**
- ✅ **PostgreSQL** for primary data storage (complex relationships, ACID compliance)
- ✅ **Next.js API Routes** for host service (familiar stack, good performance)
- ✅ **Progressive Iframe** stages via routing (seamless user experience)
- ✅ **Cookie + JWT Sessions** with wallet signature verification (crypto-native auth)
- ✅ **Separate Deployments** with shared database (deployment independence)
- 🆕 **iframe-resizer Library** for automatic height adjustment (industry standard)
- 🆕 **Penpal or Postmate** for structured postMessage communication (promise-based)
- 🆕 **CDN Distribution** for embed.js script (global performance)

---

## 📋 Key Decisions Log

### **Recent Decisions (Jan 2025)**
- **✅ Library Migration Strategy**: Use `@curia_/cg-plugin-lib` v1.0.6 for drop-in compatibility
- **✅ Host Service Deployment**: Railway for production hosting with health checks
- **✅ Database Schema**: Extended existing tables (ALREADY DEPLOYED) ✅
- **✅ Environment Variables**: Use `NEXT_PUBLIC_HOST_SERVICE_URL` for environment-aware URLs
- **🆕 Progressive Iframe Architecture**: Single iframe with stage-based routing for seamless UX
- **🆕 Deployment Strategy**: Separate standalone instance with shared database
- **🆕 Account Strategy**: Build standalone-first, add CG account merging later

### **Pending Decisions**
- **⏳ Phase Ordering**: Embedding System as Phase 2 vs Phase 3 (strategic importance)
- **⏳ Community Context**: Default community vs community selection requirement
- **⏳ Anonymous User Limits**: What functionality to allow before sign-up required
- **⏳ Session Management**: Cookie vs localStorage for session persistence
- **⏳ Embedding Security**: Domain whitelist vs open embedding policy
- **⏳ Communication Library**: iframe-resizer + custom vs Penpal/Postmate

### **Future Decisions**
- **🔮 Account Merging**: How to unify standalone + CG accounts
- **🔮 Billing Model**: Free tier limits, premium features, pricing strategy
- **🔮 Custom Domains**: SSL handling, DNS management, subdomain vs full domain
- **🔮 Federation**: Inter-community communication and cross-community features
- **🔮 Advanced Embedding**: Multiple forums per page, widget variations

---

## 📊 Success Metrics & KPIs

### **Technical Metrics**
- **Performance**: <100ms iframe load, <500ms first paint
- **Reliability**: 99.9% uptime, <0.1% error rate
- **Security**: Zero security incidents, regular audits
- **Scale**: 1000+ communities, 10k+ concurrent users

### **User Experience Metrics**
- **Onboarding**: <5 minutes from signup to embedded forum
- **Authentication**: <30 seconds for wallet connection
- **Integration**: <2 minutes from script tag to working forum
- **Retention**: >60% weekly active users
- **Support**: <24h response time for issues

### **Business Metrics**
- **Adoption**: 1000+ websites using embeds by Q3 2025
- **Growth**: 25% month-over-month community creation
- **Engagement**: >80% of created communities remain active
- **Revenue**: Sustainable monetization by Q4 2025

### **Embedding-Specific Metrics**
- **Integration Success Rate**: >95% successful embeds on first attempt
- **Performance Impact**: <100KB total load (script + initial iframe)
- **Cross-Browser Compatibility**: Works on >95% of target browsers
- **Mobile Experience**: Equal performance on desktop and mobile

---

## 🚧 Current Sprint (Week 1)

### **This Week's Focus: Progressive Iframe Foundation**
**Sprint Goal:** Working iframe with stage-based routing and session detection

### **Active Tasks**
- [ ] **Design iframe routing system** (`/embed?stage=auth|community|forum`)
- [ ] **Implement session detection logic** (cookie-based authentication check)
- [ ] **Build stage transition framework** (smooth progression between stages)
- [ ] **Create basic authentication UI** (wallet connection interface)

### **Technical Priorities**
1. **Progressive Experience**: Iframe feels like single app with multiple stages
2. **Session Management**: Reliable cookie-based session detection and persistence
3. **Stage Routing**: Clean URL-based stage management within iframe
4. **Performance**: Fast stage transitions and loading states

### **Blockers & Risks**
- None currently identified

### **Next Week Preview**
- ENS wallet connection and signature verification
- Universal Profile extension integration
- User account creation and session establishment

### **Post-Phase 1 Strategic Decision**
- **Evaluate Phase Reordering**: Assess whether to move Embedding System to Phase 2
- **Criteria**: Technical complexity of iframe stages vs business value of early embedding
- **Timeline Impact**: Potential acceleration of market entry vs feature completeness

---

## 📚 Reference Documentation

### **Architecture & Research**
- 📄 [Standalone Identity System Architecture](./standalone-identity-system-architecture.md)
- 📄 [Host Service Research & Implementation](./standalone-host-service-research.md)
- 📄 [Embedding Implementation Guide](./snippet-howto.md) ⭐ **COMPREHENSIVE TECHNICAL GUIDE**
- 📄 [Untethering Migration Tracking](./untethering-migration-tracking.md) *(archived)*

### **Technical Implementation**
- 🗂️ Database Schema: `docs/current-db-schema.md` (includes standalone identity tables) ✅
- 🗂️ Host Service Code: `servers/host-service/`
- 🗂️ Main Application: `src/` (with standalone architecture)

### **Embedding Resources**
- 🔧 iframe-resizer: Automatic height adjustment library
- 🔧 Penpal: Promise-based iframe communication
- 🔧 Postmate: Lightweight postMessage abstraction
- 📖 MDN postMessage: Security best practices
- 📖 Web.dev Embeds: Performance optimization guide

### **Deployment & Operations**
- 🚀 Host Service: Railway deployment with health checks
- 🗄️ Database: PostgreSQL with identity-aware schema (shared between instances)
- 🔧 Environment: Development + production configurations

---

## 🤝 Team & Communication

### **Key Stakeholders**
- **Project Lead**: Florian (vision, strategy, technical decisions)
- **Development**: AI Assistant (implementation, research, documentation)
- **External**: Library Agent (maintains `@curia_/cg-plugin-lib`)

### **Communication Protocols**
- **Weekly Updates**: This document updated with progress
- **Technical Decisions**: Logged in "Key Decisions" section
- **Blockers**: Escalated immediately, tracked in current sprint
- **Architecture Changes**: Discussed before implementation

### **Success Tracking**
- **Weekly**: Sprint goals and task completion
- **Monthly**: Phase milestones and KPI review
- **Quarterly**: Strategy review and roadmap updates

---

## 🎯 Next Actions

### **Immediate (This Week)**
1. **Start progressive iframe development** in new `/embed` routes
2. **Design stage-based routing system** with smooth transitions
3. **Implement session detection** with cookie-based persistence
4. **Create authentication UI foundation** for wallet connections

### **Short-term (2-4 weeks)**
1. **Complete ENS authentication** end-to-end in iframe
2. **Add Universal Profile support** with UP extension integration
3. **Build community selection stage** for authenticated users
4. **Test complete progressive experience** from auth to forum

### **Strategic Decision Point (End of Phase 1)**
1. **Evaluate embedding system priority** (Phase 2 vs Phase 3)
2. **Assess technical readiness** for embedding implementation
3. **Consider market validation strategy** with early embedding capability
4. **Plan resource allocation** for maximum business impact

### **Medium-term (2-3 months)**
1. **Complete chosen Phase 2** (Community Management OR Embedding System)
2. **Build remaining core functionality** 
3. **Launch beta program** with select partners
4. **Optimize for scale** and performance

---

*This document is the single source of truth for the Curia standalone project. It should be updated weekly with progress, decisions, and any changes to strategy or timeline.*

**🔄 Last Updated**: January 2025 by AI Assistant  
**📅 Next Review**: Weekly Sprint Updates + Strategic Phase Ordering Decision  
**📍 Current Phase**: Progressive Iframe Authentication (Week 1/3)  
**🎯 Strategic Focus**: Progressive iframe experience as seamless authentication flow 