# Untethering Migration Tracking

**Research Document: Complete Migration from Common Ground to Curia Libraries**

This document tracks the complete migration process from `@common-ground-dao` libraries to `@curia_` libraries, documenting every file change and providing a roadmap for implementing dual mode support.

## 📊 Migration Summary

**Status**: ✅ **COMPLETE**  
**Date**: January 2025  
**Result**: Successful drop-in replacement migration  
**Build Status**: ✅ Compiles successfully  
**Functionality**: ✅ All features preserved  

## 🎯 Scope & Objectives

### **Primary Goal**: Untether from Common Ground Dependencies
- Replace `@common-ground-dao/cg-plugin-lib` with `@curia_/cg-plugin-lib`
- Replace `@common-ground-dao/cg-plugin-lib-host` with `@curia_/cg-plugin-lib-host`
- Maintain 100% functional compatibility
- Enable standalone forum hosting via new host service

### **Future Goal**: Dual Mode Support
- Support both Common Ground and standalone modes simultaneously
- Runtime detection of environment (`?mod=standalone` parameter)
- Dynamic library loading based on context
- Seamless user experience across both modes

## 📁 Files Modified During Migration

### **1. Package Dependencies**
**File**: `package.json`
**Changes**:
```json
// REMOVED:
"@common-ground-dao/cg-plugin-lib": "^0.9.13"
"@common-ground-dao/cg-plugin-lib-host": "^0.9.6"

// ADDED:
"@curia_/cg-plugin-lib": "1.0.2"
"@curia_/cg-plugin-lib-host": "1.0.1"
```
**Impact**: Foundation dependency change
**Dual Mode Strategy**: Conditional imports or peer dependencies

### **2. Core Context System**
**File**: `src/contexts/CgLibContext.tsx`
**Changes**:
```typescript
// BEFORE:
import { CgPluginLib } from '@common-ground-dao/cg-plugin-lib';

// AFTER:
import { CgPluginLib } from '@curia_/cg-plugin-lib';
```
**Impact**: Core plugin communication system
**Dual Mode Strategy**: Dynamic import based on detected mode
**Priority**: 🔥 **CRITICAL** - Central to all plugin functionality

### **3. Request Signing System**
**File**: `src/app/api/sign/route.ts`
**Changes**:
```typescript
// BEFORE:
import { CgPluginLibHost } from "@common-ground-dao/cg-plugin-lib-host";

// AFTER:
import { CgPluginLibHost } from "@curia_/cg-plugin-lib-host";
```
**Impact**: Cryptographic request signing for API calls
**Dual Mode Strategy**: Runtime library selection
**Priority**: 🔥 **CRITICAL** - Required for secure API communication

### **4. Type Definitions (8 files)**
**Files**:
- `src/components/layout/MainLayoutWithSidebar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/access/CommunityAccessGate.tsx`
- `src/app/page.tsx`
- `src/app/create-board/page.tsx`
- `src/app/board-settings/page.tsx`
- `src/app/community-settings/page.tsx`

**Changes**:
```typescript
// BEFORE:
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

// AFTER:
import { CommunityInfoResponsePayload } from '@curia_/cg-plugin-lib';
```
**Impact**: TypeScript interface definitions for community data
**Dual Mode Strategy**: Shared type definitions or conditional imports
**Priority**: 🟡 **MEDIUM** - UI display components

### **5. Dependency Lockfile**
**File**: `yarn.lock`
**Changes**: Complete package resolution tree update
**Impact**: Ensures consistent dependency resolution
**Dual Mode Strategy**: Careful peer dependency management

## 🔧 Technical Migration Details

### **Library Compatibility Matrix**

| Feature | Common Ground Library | Curia Library | Status |
|---------|----------------------|---------------|--------|
| `CgPluginLib` class | ✅ | ✅ | ✅ Compatible |
| `CgPluginLibHost` class | ✅ | ✅ | ✅ Compatible |
| `CommunityInfoResponsePayload` | ✅ | ✅ | ✅ Enhanced* |
| `getUserInfo()` method | ✅ | ✅ | ✅ Compatible |
| `getCommunityInfo()` method | ✅ | ✅ | ✅ Compatible |
| `navigate()` method | ❌ Missing | ✅ | ✅ Added* |

**\*Enhanced**: Curia libraries include additional properties not in original CG libraries

### **Enhanced Properties Added**
```typescript
interface CommunityInfoResponsePayload {
  // Original CG properties
  id: string;
  title: string;
  // ... other existing properties

  // NEW in Curia libraries
  smallLogoUrl?: string;  // For sidebar community logos
  url?: string;          // For community URL references
}

class CgPluginLib {
  // ... existing methods
  
  // NEW in Curia libraries
  navigate(url: string): void;  // Navigation functionality
}
```

## 🎯 Dual Mode Implementation Strategy

### **Phase 1: Dynamic Library Loading**
```typescript
// In CgLibContext.tsx
const isStandalone = searchParams.get('mod') === 'standalone';

const CgPluginLib = isStandalone 
  ? (await import('@curia_/cg-plugin-lib')).CgPluginLib
  : (await import('@common-ground-dao/cg-plugin-lib')).CgPluginLib;
```

### **Phase 2: Runtime Environment Detection**
```typescript
// Detection logic
function detectEnvironment(): 'common-ground' | 'standalone' {
  // Method 1: URL parameter
  if (new URLSearchParams(window.location.search).get('mod') === 'standalone') {
    return 'standalone';
  }
  
  // Method 2: Host detection
  if (window.location.hostname.includes('curia-host')) {
    return 'standalone';
  }
  
  // Method 3: Parent window detection
  if (window.parent !== window && window.location.ancestorOrigins) {
    // Running in iframe - check if Common Ground or standalone host
    return detectHostType();
  }
  
  return 'common-ground'; // Default
}
```

### **Phase 3: Conditional Package Loading**
```json
// package.json - Both as peer dependencies
{
  "dependencies": {
    "@curia_/cg-plugin-lib": "^1.0.2"
  },
  "peerDependencies": {
    "@common-ground-dao/cg-plugin-lib": "^0.9.13"
  },
  "peerDependenciesMeta": {
    "@common-ground-dao/cg-plugin-lib": {
      "optional": true
    }
  }
}
```

### **Phase 4: Unified Interface Layer**
```typescript
// Create abstraction layer
interface UnifiedCgLib {
  getUserInfo(): Promise<any>;
  getCommunityInfo(): Promise<any>;
  navigate?(url: string): void;
}

class CgLibAdapter implements UnifiedCgLib {
  private lib: any;
  private mode: 'common-ground' | 'standalone';
  
  constructor(mode: 'common-ground' | 'standalone') {
    this.mode = mode;
    this.lib = mode === 'standalone' 
      ? new CuriaCgPluginLib() 
      : new CommonGroundCgPluginLib();
  }
  
  async getUserInfo() {
    return this.lib.getUserInfo();
  }
  
  async getCommunityInfo() {
    return this.lib.getCommunityInfo();
  }
  
  navigate(url: string) {
    if (this.lib.navigate) {
      this.lib.navigate(url);
    } else if (this.mode === 'common-ground') {
      // Fallback for CG mode
      window.parent.postMessage({ type: 'navigate', url }, '*');
    }
  }
}
```

## 🛠️ Implementation Roadmap

### **Stage 1: Preparation** (1-2 days)
- [ ] Install both libraries as dependencies
- [ ] Create environment detection utilities
- [ ] Set up conditional import infrastructure

### **Stage 2: Core Abstraction** (2-3 days)
- [ ] Create unified interface layer
- [ ] Update `CgLibContext.tsx` with dynamic loading
- [ ] Implement adapter pattern for library differences

### **Stage 3: Component Updates** (1-2 days)
- [ ] Update all 8 type import files with conditional logic
- [ ] Test UI components in both modes
- [ ] Verify type compatibility

### **Stage 4: API Layer** (1 day)
- [ ] Update `src/app/api/sign/route.ts` with dual mode support
- [ ] Test request signing in both environments
- [ ] Verify security model

### **Stage 5: Testing & Validation** (2-3 days)
- [ ] Comprehensive testing in Common Ground mode
- [ ] Comprehensive testing in standalone mode
- [ ] Edge case testing (mode switching, fallbacks)
- [ ] Performance testing (dynamic imports)

### **Stage 6: Documentation & Deployment** (1 day)
- [ ] Update deployment documentation
- [ ] Create mode-specific configuration guides
- [ ] Production deployment validation

## 🔍 Testing Strategy

### **Test Scenarios**
1. **Pure Common Ground Mode**: No `?mod=standalone` parameter
2. **Pure Standalone Mode**: With `?mod=standalone` parameter
3. **Mode Switching**: Transitioning between modes
4. **Fallback Handling**: When one library fails to load
5. **Performance Impact**: Dynamic import overhead

### **Critical Test Points**
- [ ] User authentication flow in both modes
- [ ] Community data loading in both modes
- [ ] Request signing functionality
- [ ] Navigation behavior
- [ ] Error handling and fallbacks

## 📈 Success Metrics

### **Functional Requirements**
- [ ] ✅ Both modes compile successfully
- [ ] ✅ All features work in Common Ground mode
- [ ] ✅ All features work in standalone mode
- [ ] ✅ Mode detection is reliable
- [ ] ✅ No performance degradation

### **Non-Functional Requirements**
- [ ] ✅ Bundle size impact < 10%
- [ ] ✅ Initial load time impact < 200ms
- [ ] ✅ Memory usage stable in both modes
- [ ] ✅ No TypeScript errors
- [ ] ✅ All existing tests pass

## 🚨 Risks & Mitigation

### **High Risk Areas**

#### **1. Library API Divergence**
**Risk**: Curia and Common Ground libraries diverge over time
**Mitigation**: 
- Maintain interface compatibility layer
- Regular compatibility testing
- Version pinning strategy

#### **2. Dynamic Import Performance**
**Risk**: Runtime library loading causes delays
**Mitigation**:
- Implement preloading strategies
- Cache loaded libraries
- Progressive enhancement approach

#### **3. Type System Conflicts**
**Risk**: Conflicting TypeScript definitions between libraries
**Mitigation**:
- Use module augmentation
- Conditional type definitions
- Strict version management

### **Medium Risk Areas**

#### **1. Build System Complexity**
**Risk**: Dual dependency management complicates builds
**Mitigation**:
- Clear dependency separation
- Automated testing for both modes
- Simplified deployment scripts

#### **2. User Experience Inconsistencies**
**Risk**: Subtle differences between modes confuse users
**Mitigation**:
- Comprehensive UI testing
- Feature parity validation
- User experience audits

## 📚 Reference Materials

### **Related Documentation**
- [Standalone Host Service Research](./standalone-host-service-research.md)
- [Dual Compatibility Guide](./dual-compatibility.md)
- [Host App Research 1](./host-app-research-1.md)
- [Host App Research 2](./host-app-research-2.md)

### **Key Repository Files**
- **Host Service**: `servers/host-service/`
- **Example Implementation**: `docs/example-host-app/`
- **Migration Scripts**: `scripts/` (future)

### **Library Documentation**
- **Curia Libraries**: Internal documentation
- **Common Ground Libraries**: CG plugin development docs

## 🔄 Future Considerations

### **Long-term Vision**
1. **Gradual Migration**: Move users from CG to standalone over time
2. **Feature Divergence**: Add standalone-only features
3. **Performance Optimization**: Optimize for standalone mode
4. **Community Ecosystem**: Build standalone hosting ecosystem

### **Deprecation Strategy**
1. **Phase 1**: Dual mode support (current goal)
2. **Phase 2**: Standalone mode preferred, CG mode maintained
3. **Phase 3**: CG mode deprecated with migration tools
4. **Phase 4**: Standalone mode only

## 💡 Lessons Learned

### **What Went Well**
- ✅ **Drop-in Replacement**: Curia libraries were truly compatible
- ✅ **Systematic Approach**: File-by-file migration was clean
- ✅ **Type Safety**: TypeScript caught all compatibility issues
- ✅ **Build Validation**: yarn build provided clear feedback

### **What Could Be Improved**
- ⚠️ **Documentation**: Need better library API documentation
- ⚠️ **Testing**: More comprehensive integration tests needed
- ⚠️ **Automation**: Migration could be partially automated

### **Best Practices Established**
1. **Incremental Migration**: Change one file type at a time
2. **Build-Driven Development**: Let the build system guide fixes
3. **Documentation First**: Document changes as you make them
4. **Interface Compatibility**: Maintain exact API compatibility

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: Before dual mode implementation  
**Maintainer**: Development Team 