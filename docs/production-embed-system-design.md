# Production Embed System Design

**Date**: January 2025  
**Status**: Research & Design Phase  
**Goal**: Self-contained embed.js script for production websites

## 🎯 The Challenge

### Current Working Architecture (Demo Page)
```
Demo Page (localhost:3001/demo) ← CONTAINS ALL LOGIC
├── ClientPluginHost initialization
├── PostMessage API routing  
├── Auth context management
├── Database provider integration
├── Iframe switching logic
└── Creates: <iframe src="/embed"> → forum
```

**Problem**: Customers can't use this - they'd need to implement ClientPluginHost logic on their website.

### Target Production Architecture
```
Customer Website (any domain)
├── Just includes: <script src="embed.js" data-community="xyz"></script>
└── Embed Script does EVERYTHING:
    ├── Creates container element
    ├── Initializes ClientPluginHost internally
    ├── Handles all PostMessage routing
    ├── Manages auth context
    ├── Switches iframe phases
    └── Provides complete forum experience
```

**Goal**: Customer includes one script tag → complete forum works.

## 🏗️ Architecture Design

### Development vs Production Structure

#### **Development Structure** (Within Host Service)
```
servers/host-service/
├── src/
│   ├── app/embed.js/route.ts        # REPLACE: Current template string approach
│   ├── lib/embed/                   # NEW: Well-structured embed source
│   │   ├── core/
│   │   │   ├── EmbedConfig.ts       # Configuration parser
│   │   │   ├── EmbedLifecycle.ts    # Initialization & cleanup
│   │   │   ├── ErrorHandler.ts      # Error handling & recovery
│   │   │   └── PerformanceMonitor.ts # Metrics & monitoring
│   │   ├── plugin-host/
│   │   │   ├── InternalPluginHost.ts # ClientPluginHost logic
│   │   │   ├── ApiRouter.ts         # Route forum requests
│   │   │   ├── AuthContext.ts       # Auth state management
│   │   │   └── PostMessageHandler.ts # Message routing
│   │   ├── ui/
│   │   │   ├── ContainerManager.ts  # DOM container creation
│   │   │   ├── IframeManager.ts     # Iframe lifecycle
│   │   │   ├── ErrorUI.ts           # Error state components
│   │   │   └── LoadingUI.ts         # Loading states
│   │   ├── utils/
│   │   │   ├── DOMUtils.ts          # Safe DOM manipulation
│   │   │   ├── SecurityUtils.ts     # Origin validation, XSS
│   │   │   ├── StyleIsolation.ts    # CSS isolation
│   │   │   └── NetworkUtils.ts      # HTTP helpers
│   │   ├── types/
│   │   │   ├── EmbedConfig.ts       # Configuration types
│   │   │   ├── PostMessage.ts       # Message types
│   │   │   └── ApiTypes.ts          # API request/response types
│   │   └── main.ts                  # Entry point - builds the embed script
│   └── ... (existing host service structure)
```

#### **Production Output** (Via Next.js API Route)
```
GET /embed.js                        # Serves compiled embed script
├── Generated from lib/embed/main.ts
├── Includes all modules compiled together
├── Production minification
└── Source maps for debugging
```

### Core Requirements

#### **1. Self-Contained Application**
The embed.js must be a complete, standalone application:
- ✅ **Zero Dependencies**: No external libraries required
- ✅ **No Host Logic**: Customer website needs zero implementation
- ✅ **Complete API Handling**: All PostMessage routing internal
- ✅ **Robust Error Handling**: Graceful failures and recovery
- ✅ **Cross-Browser Support**: Works on all modern browsers

#### **2. Security Model**
Since this runs on customer domains, security is critical:
- 🔒 **Sandboxed Execution**: Isolate from customer's code
- 🔒 **HTTPS Only**: Force secure connections in production
- 🔒 **Origin Validation**: Validate PostMessage origins strictly
- 🔒 **No Global Pollution**: Don't conflict with existing code
- 🔒 **Content Security**: Protect against XSS and injection

#### **3. Configuration Interface**
Simple but powerful configuration via script attributes:
```html
<script src="https://host.com/embed.js"
        data-community="my-community"
        data-theme="light|dark|auto"
        data-container="optional-element-id"
        data-height="600px"
        data-anonymous="true|false">
</script>
```

#### **4. Production Robustness**
This will be included on customer websites, so it must be bulletproof:
- 🛡️ **Network Resilience**: Handle timeouts, retries, offline scenarios
- 🛡️ **DOM Safety**: Work with any customer HTML/CSS
- 🛡️ **Memory Management**: No leaks, proper cleanup
- 🛡️ **Performance**: Fast loading, minimal impact
- 🛡️ **Monitoring**: Error reporting for debugging

## 📋 Detailed Component Design

### **1. Embed Script Architecture**

```javascript
// embed.js - Complete self-contained application
(function() {
  'use strict';
  
  // PHASE 1: Configuration & Initialization
  const EmbedConfig = {
    parseScriptAttributes(),
    validateConfiguration(),
    createContainer(),
    setupErrorHandling()
  };
  
  // PHASE 2: Client Plugin Host (Internal)
  const InternalPluginHost = {
    initializeClientPluginHost(),
    handlePostMessageFromForum(),
    routeApiCallsToHostService(),
    manageAuthContext()
  };
  
  // PHASE 3: Iframe Management
  const IframeManager = {
    createAuthIframe(),      // Phase 1: /embed
    switchToForumIframe(),   // Phase 2: forum URL
    handleIframeErrors(),
    manageResize()
  };
  
  // PHASE 4: Lifecycle Management
  const EmbedLifecycle = {
    initialize(),
    handleAuthCompletion(),
    cleanup(),
    errorRecovery()
  };
  
})();
```

### **2. Internal ClientPluginHost Integration**

**Current**: ClientPluginHost is imported by demo page  
**Target**: ClientPluginHost logic embedded directly in embed.js

```javascript
// Inside embed.js - Self-contained plugin host
class EmbedPluginHost {
  constructor(hostServiceUrl, authContext) {
    this.hostServiceUrl = hostServiceUrl;
    this.authContext = authContext;
    this.setupPostMessageListener();
  }
  
  setupPostMessageListener() {
    window.addEventListener('message', (event) => {
      // Handle forum API requests
      if (event.data.type === 'api_request') {
        this.routeApiCall(event.data);
      }
    });
  }
  
  async routeApiCall(request) {
    // Make HTTP call to host service
    const response = await fetch(`${this.hostServiceUrl}/api/${request.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: request.method,
        userId: this.authContext.userId,
        communityId: this.authContext.communityId,
        ...request.params
      })
    });
    
    // Send response back to forum
    this.sendToForum({
      type: 'api_response',
      requestId: request.requestId,
      data: await response.json()
    });
  }
}
```

### **3. Configuration System**

```javascript
// Configuration parser for script attributes
const parseEmbedConfig = () => {
  const script = document.currentScript;
  if (!script) throw new Error('Could not find embed script element');
  
  return {
    community: script.getAttribute('data-community'),
    theme: script.getAttribute('data-theme') || 'light',
    container: script.getAttribute('data-container'),
    height: script.getAttribute('data-height') || '600px',
    allowAnonymous: script.getAttribute('data-anonymous') === 'true',
    // Advanced configuration
    hostService: script.getAttribute('data-host') || autoDetectHost(),
    debug: script.getAttribute('data-debug') === 'true'
  };
};

// Auto-detect host service URL from script src
const autoDetectHost = () => {
  const script = document.currentScript;
  const scriptUrl = new URL(script.src);
  return `${scriptUrl.protocol}//${scriptUrl.host}`;
};
```

### **4. Container Management**

```javascript
// Safe container creation that doesn't interfere with customer site
const createEmbedContainer = (config) => {
  let container;
  
  if (config.container) {
    // Use customer-specified container
    container = document.getElementById(config.container);
    if (!container) {
      throw new Error(`Container element '${config.container}' not found`);
    }
  } else {
    // Create container at script location
    container = document.createElement('div');
    container.id = `curia-embed-${generateUniqueId()}`;
    container.className = 'curia-embed-container';
    
    // Insert after the script tag
    const script = document.currentScript;
    script.parentNode.insertBefore(container, script.nextSibling);
  }
  
  // Apply safe styling that doesn't conflict
  applyIsolatedStyles(container);
  return container;
};
```

### **5. Error Handling & Recovery**

```javascript
// Comprehensive error handling for production
class EmbedErrorHandler {
  constructor(config) {
    this.config = config;
    this.setupGlobalHandlers();
  }
  
  setupGlobalHandlers() {
    // Catch all embed-related errors
    window.addEventListener('error', (event) => {
      if (this.isEmbedError(event)) {
        this.handleError(event.error);
      }
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isEmbedPromise(event.promise)) {
        this.handleError(event.reason);
      }
    });
  }
  
  handleError(error) {
    // Log to host service for monitoring
    this.reportError(error);
    
    // Show user-friendly error UI
    this.showErrorState(error);
    
    // Attempt recovery if possible
    this.attemptRecovery(error);
  }
  
  showErrorState(error) {
    const container = this.getEmbedContainer();
    container.innerHTML = `
      <div class="curia-error-state">
        <h3>Forum Temporarily Unavailable</h3>
        <p>We're experiencing technical difficulties. Please try again in a few moments.</p>
        <button onclick="window.curiaEmbed.retry()">Retry</button>
      </div>
    `;
  }
}
```

## 🔧 Build System Architecture

### **Using Existing Host Service Infrastructure**

#### **Current State Analysis**
The current `src/app/embed.js/route.ts` is actually pretty sophisticated (349 lines):

```typescript
// CURRENT: Template string with good logic, bad architecture
export async function GET() {
  const embedScript = `
    (function() {
      'use strict';
      
      // ✅ GOOD LOGIC (but in template string):
      // - Configuration parsing from data attributes
      // - Container creation and management  
      // - Iframe lifecycle with loading states
      // - Phase switching (auth → forum)
      // - PostMessage communication foundation
      // - Error handling and recovery
      // - Proper event listeners
      
      // ❌ PROBLEMS:
      // - 349 lines of template string hell
      // - No TypeScript support
      // - No testing capability
      // - No proper tooling (ESLint, etc.)
      // - No modular structure
    })();
  `;
  
  return new Response(embedScript, {
    headers: { 'Content-Type': 'application/javascript' }
  });
}
```

**The logic is actually quite good - we just need to extract it into proper TypeScript modules!**

#### **New Approach** (Within Host Service)
```typescript
// src/app/embed.js/route.ts - NEW APPROACH
import { buildEmbedScript } from '@/lib/embed/main';

export async function GET() {
  const embedScript = await buildEmbedScript({
    environment: process.env.NODE_ENV || 'development',
    minify: process.env.NODE_ENV === 'production',
    sourceMap: process.env.NODE_ENV === 'development'
  });
  
  return new Response(embedScript, {
    headers: { 
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600' // 1 hour cache
    }
  });
}
```

#### **Build Function Architecture**
```typescript
// src/lib/embed/main.ts - ENTRY POINT
import { EmbedConfig } from './core/EmbedConfig';
import { InternalPluginHost } from './plugin-host/InternalPluginHost';
import { ContainerManager } from './ui/ContainerManager';
import { ErrorHandler } from './core/ErrorHandler';

export async function buildEmbedScript(options: BuildOptions): Promise<string> {
  // Import all modules
  const modules = {
    EmbedConfig: await import('./core/EmbedConfig'),
    InternalPluginHost: await import('./plugin-host/InternalPluginHost'),
    ContainerManager: await import('./ui/ContainerManager'),
    ErrorHandler: await import('./core/ErrorHandler'),
    // ... all other modules
  };
  
  // Build the complete script
  const script = `
    (function() {
      'use strict';
      
      ${combineModules(modules)}
      
      // Initialize when script loads
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEmbed);
      } else {
        initializeEmbed();
      }
    })();
  `;
  
  return options.minify ? minifyScript(script) : script;
}
```

### **Leverage Existing Next.js Infrastructure**
- ✅ **TypeScript**: Already configured and working
- ✅ **Build System**: Next.js handles TypeScript compilation
- ✅ **Development**: Hot reload already works
- ✅ **Production**: Next.js optimization built-in
- ✅ **Deployment**: Existing deployment pipeline works

## 🔧 Implementation Strategy

### **Phase 1: Replace Template String Hell**
1. **Create `src/lib/embed/` structure**: Set up well-organized modules within host service
2. **Build system function**: Create `buildEmbedScript()` in `src/lib/embed/main.ts`
3. **Replace API route**: Update `src/app/embed.js/route.ts` to use new build function
4. **Verify serving**: Ensure `/embed.js` endpoint works with new architecture

### **Phase 2: Extract Demo Logic**
1. **Analyze demo page**: Study `src/app/demo/page.tsx` ClientPluginHost usage
2. **Create typed interfaces**: Define PostMessage and API types in `src/lib/embed/types/`
3. **Module extraction**: Move ClientPluginHost logic to `src/lib/embed/plugin-host/`
4. **InternalPluginHost**: Implement as proper TypeScript class within host service

### **Phase 3: Self-Contained Plugin Host**
1. **API routing**: Build `ApiRouter` that handles all forum PostMessage requests
2. **Auth context**: Create `AuthContext` that manages user/community state
3. **PostMessage handling**: Complete `PostMessageHandler` with all routing logic
4. **UI components**: Build `ContainerManager`, `IframeManager`, `ErrorUI` modules

### **Phase 4: Production Hardening**
1. **Error handling**: Comprehensive `ErrorHandler` with recovery and reporting
2. **Security**: `SecurityUtils` with origin validation and XSS protection
3. **Performance**: `PerformanceMonitor` with metrics collection
4. **Minification**: Add proper minification and source maps to build process

### **Phase 5: Test & Validate**
1. **Create demo2**: Add `src/app/demo2/page.tsx` with just `<script src="/embed.js">`
2. **Test extraction**: Verify all demo logic now works in standalone script
3. **Cross-browser testing**: Ensure compatibility across environments
4. **Performance testing**: Validate loading speed and memory usage

## 🛡️ Security Considerations

### **Script Injection Protection**
```javascript
// Prevent script injection in configuration
const sanitizeConfig = (config) => {
  const allowedKeys = ['community', 'theme', 'container', 'height'];
  const sanitized = {};
  
  for (const key of allowedKeys) {
    if (config[key]) {
      sanitized[key] = String(config[key]).replace(/[<>"']/g, '');
    }
  }
  
  return sanitized;
};
```

### **CSS Isolation**
```javascript
// Prevent CSS conflicts with customer site
const applyIsolatedStyles = (container) => {
  // Use CSS custom properties for isolation
  container.style.cssText = `
    --curia-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --curia-border: 1px solid #e2e8f0;
    font-family: var(--curia-font);
    border: var(--curia-border);
    border-radius: 8px;
    overflow: hidden;
    background: white;
    max-width: 100%;
    height: ${config.height};
  `;
};
```

### **Origin Validation**
```javascript
// Strict origin validation for PostMessage
const validateMessageOrigin = (event) => {
  const allowedOrigins = [
    config.hostService,           // Host service
    config.forumUrl,              // Forum URL
    window.location.origin        // Current page (for internal messages)
  ];
  
  return allowedOrigins.includes(event.origin);
};
```

## 📊 Production Monitoring

### **Error Reporting**
```javascript
// Report errors to host service for monitoring
const reportError = async (error, context) => {
  try {
    await fetch(`${config.hostService}/api/embed/error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        },
        context: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          embedConfig: config,
          timestamp: new Date().toISOString()
        }
      })
    });
  } catch (reportingError) {
    // Silently fail - don't break customer site
    console.warn('Failed to report embed error:', reportingError);
  }
};
```

### **Performance Metrics**
```javascript
// Track performance for optimization
const trackPerformance = () => {
  const startTime = performance.now();
  
  return {
    recordLoadTime: () => {
      const loadTime = performance.now() - startTime;
      reportMetric('embed_load_time', loadTime);
    },
    
    recordAuthTime: () => {
      const authTime = performance.now() - startTime;
      reportMetric('embed_auth_time', authTime);
    },
    
    recordForumLoadTime: () => {
      const forumTime = performance.now() - startTime;
      reportMetric('embed_forum_load_time', forumTime);
    }
  };
};
```

## 🧪 Testing Strategy

### **Unit Testing**
- **Configuration parsing**: Test all attribute combinations
- **Error handling**: Test all failure scenarios
- **API routing**: Test all PostMessage flows
- **Container creation**: Test DOM manipulation safety

### **Integration Testing**
- **Demo2 validation**: Complete end-to-end flows
- **Cross-browser**: Chrome, Firefox, Safari, Edge
- **Mobile testing**: iOS Safari, Android Chrome
- **Customer site simulation**: Various HTML/CSS environments

### **Production Testing**
- **Performance**: Loading speed, memory usage
- **Security**: XSS protection, origin validation
- **Reliability**: Network failures, timeouts, recovery
- **Monitoring**: Error reporting, metrics collection

## 📦 Deployment Strategy

### **CDN Distribution**
```
https://embed.curia.app/embed.js       # Production
https://embed.curia.app/embed.dev.js   # Development/testing
https://embed.curia.app/v1/embed.js    # Versioned (for stability)
```

### **Version Management**
- **Semantic versioning**: Major.minor.patch for tracking
- **Backward compatibility**: Maintain API stability
- **Gradual rollout**: Test on staging before production
- **Rollback capability**: Quick revert if issues found

### **Update Strategy**
```javascript
// Self-updating mechanism (optional)
const checkForUpdates = async () => {
  const currentVersion = EMBED_VERSION;
  const latestVersion = await fetch(`${config.hostService}/api/embed/version`);
  
  if (shouldUpdate(currentVersion, latestVersion)) {
    showUpdateNotification();
  }
};
```

## 🎯 Success Criteria

### **Technical Goals**
- ✅ **Single script tag**: Complete forum works with one line
- ✅ **Zero dependencies**: No external libraries required
- ✅ **Self-contained**: All logic in embed.js
- ✅ **Production ready**: Error handling, monitoring, security
- ✅ **Cross-browser**: Works on all modern browsers

### **User Experience Goals**
- ✅ **Fast loading**: < 2 seconds to interactive forum
- ✅ **Seamless auth**: Wallet connection flows smoothly
- ✅ **Real data**: User `ens:florianglatz.eth` works end-to-end
- ✅ **Error graceful**: Friendly error states and recovery
- ✅ **Responsive**: Works on desktop and mobile

### **Developer Experience Goals**
- ✅ **Simple integration**: Copy-paste script tag
- ✅ **Easy configuration**: Data attributes for customization
- ✅ **Good documentation**: Clear examples and troubleshooting
- ✅ **Reliable**: Consistent behavior across environments

---

## 🎉 Major Milestone Achieved

### **End-to-End Working System** ✅
**Date**: January 2025  
**Status**: COMPLETE - Real authentication and database integration working

#### **What's Working Now**
- ✅ **Real Authentication**: Users like `ens:florianglatz.eth` flow through entire system
- ✅ **Database Integration**: Complete PostgreSQL queries replace all mock data
- ✅ **Forum Loading**: Full Curia forum loads with real user context
- ✅ **API Communication**: PostMessage protocol working correctly
- ✅ **Demo Page**: Complete working implementation at `/demo`

#### **Technical Achievements**
1. **Fixed Authentication Flow**: SessionCheckStep now extracts real user data from existing sessions
2. **API Format Resolution**: Fixed double wrapper format that forum expects: `{data: {data: {...}}}`
3. **Database Translation**: Complete translation layer converts DB schema to forum-expected format
4. **Real User Context**: No more fallback session users - real users throughout system

#### **Architecture Proven**
```
WORKING FLOW:
Demo Page → ClientPluginHost → PostMessage → Host Service → PostgreSQL
                ↓
Users: ens:florianglatz.eth (real) → Complete Forum Experience
```

#### **Critical Discovery**
- **Current embed.js is broken**: 349-line template string in API route
- **No build system**: No TypeScript, ESLint, minification, or source maps
- **Template string hell**: Unmaintainable and untestable
- **Need proper architecture**: Mini-app structure with real tooling

### **The Gap: Demo → Production**
**Current**: Demo page contains all logic (ClientPluginHost, PostMessage, auth context)  
**Target**: Self-contained embed.js script for production websites  
**Challenge**: Customer includes one script tag → complete forum works

---

## 🚀 Next Steps

1. **Create `src/lib/embed/` structure**: Set up well-organized modules within existing host service
2. **Replace template string approach**: Build `buildEmbedScript()` function to generate proper JavaScript
3. **Extract demo logic**: Move working ClientPluginHost logic to structured TypeScript modules
4. **Self-contained plugin host**: Implement complete API routing internally within the embed script
5. **Production hardening**: Add error handling, security, performance optimization to build process
6. **Demo2 validation**: Create minimal test page with just `<script src="/embed.js">`
7. **Serve via existing infrastructure**: Use existing Next.js `/embed.js` route and deployment pipeline

**This will be the final production-ready embed system that customers can trust - built within our existing, proven infrastructure.** 