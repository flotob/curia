# Curia Standalone Migration Plan

## Project Overview

Curia is currently a forum application running as an iframe plugin within Common Ground (app.cg), a third-party social platform. The goal is to "untether" Curia from Common Ground and make it a standalone application that can be embedded via iframe on any website.

## Current Architecture Analysis

### Common Ground Integration Points

Based on analysis of the codebase, Curia currently relies heavily on Common Ground's CgPluginLib:

#### 1. Authentication & User Management
- **CgPluginLib Integration**: `/src/contexts/CgLibContext.tsx` manages the entire CG plugin lifecycle
- **User Authentication**: `/src/contexts/AuthContext.tsx` fetches user data via `cgInstance.getUserInfo()`
- **Community Data**: `cgInstance.getCommunityInfo()` provides community context and roles
- **Server-side Signing**: `/src/app/api/sign/route.ts` uses `CgPluginLibHost` for request signing

#### 2. Social Features
- **Friends System**: `/src/utils/friendsSync.ts` syncs friends via `cgInstance.getUserFriends()`
- **Cross-Community Navigation**: Custom navigation between communities via `cgInstance.navigate()`
- **Social Profiles**: Integration with Twitter, Farcaster, email through CG user profiles

#### 3. Authentication Providers
- **ENS Integration**: Already deeply integrated via Ethereum wallet connections
- **Universal Profile (LUKSO)**: Comprehensive integration in `/src/lib/upProfile.ts` and related components
- **Ethereum Wallets**: Full Web3 integration with Wagmi, RainbowKit

#### 4. Current Dependencies
```json
{
  "@common-ground-dao/cg-plugin-lib": "^0.9.13",
  "@common-ground-dao/cg-plugin-lib-host": "^0.9.6"
}
```

## Migration Strategy

### Phase 1: Translation Layer (HIGH COMPLEXITY)
Create a compatibility layer that provides the same interface as CgPluginLib but works in standalone mode.

#### 1.1 Iframe Communication Protocol (Medium Complexity)
- **Goal**: Replace CG's iframe communication with our own protocol
- **Implementation**: 
  - Create `/src/lib/iframe-communication.ts` for parent-child window messaging
  - Support configuration via URL parameters (community settings, theme, etc.)
  - Handle auth tokens passed from parent window

#### 1.2 Authentication Translation Layer (High Complexity)
- **Goal**: Replace CgPluginLib authentication with standalone auth
- **Implementation**:
  - Create `/src/lib/standalone-auth.ts` to mimic CgPluginLib interface
  - Replace `cgInstance.getUserInfo()` with direct ENS/UP authentication
  - Replace community/role management with our own system
  - Maintain existing JWT-based API authentication

#### 1.3 Mock CgPluginLib Interface (High Complexity)
- **Goal**: Minimize changes to existing codebase by providing compatible interface
- **Implementation**:
  - Create `/src/lib/mock-cglib.ts` that implements CgPluginLib interface
  - Mock methods like `getUserInfo()`, `getCommunityInfo()`, `getUserFriends()`
  - Use adapter pattern to translate between standalone and CG interfaces

### Phase 2: Standalone Features (MEDIUM COMPLEXITY)

#### 2.1 User Registration & Authentication (Medium Complexity)
- **ENS Signup**: Already implemented, extend for standalone use
- **Universal Profile Signup**: Already implemented, extend for standalone use
- **User Profile Management**: Create standalone user profiles table
- **Session Management**: Extend existing JWT system

#### 2.2 Community Management (Medium Complexity)
- **Community Creation**: Allow users to create their own forum communities
- **Role Management**: Implement community-specific roles without CG dependency
- **Community Settings**: Extend existing settings system

#### 2.3 Friends & Social Features (Low-Medium Complexity)
- **Friend System**: Replace CG friends with blockchain-based following (ENS/UP)
- **Social Profiles**: Direct integration with ENS, UP social metadata
- **Cross-Community Features**: Remove or replace with blockchain-based discovery

### Phase 3: Embedding System (MEDIUM COMPLEXITY)

#### 3.1 Embeddable Widget (Medium Complexity)
- **Iframe Script**: Create copy-paste JavaScript for website embedding
- **Configuration**: Support theme customization, feature toggles via URL params
- **Responsive Design**: Ensure iframe works on mobile and desktop

#### 3.2 Website & Documentation (Low Complexity)
- **Marketing Site**: Create standalone website explaining Curia
- **Embedding Guide**: Documentation for website owners
- **Demo/Examples**: Show different embedding configurations

### Phase 4: Data Migration & Deployment (LOW-MEDIUM COMPLEXITY)

#### 4.1 Database Schema Updates (Low Complexity)
- **Remove CG Dependencies**: Remove community_id foreign key constraints
- **User ID Migration**: Handle transition from CG user IDs to blockchain addresses
- **Community Data**: Ensure existing communities work in standalone mode

#### 4.2 Deployment Strategy (Medium Complexity)
- **Dual Mode**: Support both CG plugin mode and standalone mode during transition
- **Environment Variables**: Feature flags to toggle between modes
- **Migration Tools**: Scripts to migrate existing data

## Implementation Roadmap

### Sprint 1-2: Translation Layer Foundation (2-3 weeks)
- [ ] Create mock CgPluginLib interface
- [ ] Implement iframe communication protocol
- [ ] Build authentication translation layer
- [ ] Test existing features with translation layer

### Sprint 3-4: Standalone Authentication (2-3 weeks)
- [ ] ENS-based user registration and login
- [ ] Universal Profile registration and login
- [ ] Standalone user profile management
- [ ] Community creation without CG dependency

### Sprint 5-6: Embedding System (2 weeks)
- [ ] Create embeddable iframe script
- [ ] Build configuration system
- [ ] Develop standalone website
- [ ] Create embedding documentation

### Sprint 7: Testing & Polish (1 week)
- [ ] End-to-end testing of standalone mode
- [ ] Performance optimization
- [ ] UI/UX improvements for standalone experience
- [ ] Documentation and guides

## Complexity Assessment

### High Complexity Components
1. **Authentication Translation Layer** - Core system replacement
2. **CgPluginLib Interface Mocking** - Maintaining compatibility while changing backend
3. **Data Migration Strategy** - Handling existing communities and users

### Medium Complexity Components
1. **Iframe Communication Protocol** - Standard web technology
2. **Standalone User Management** - Extending existing system
3. **Community Management** - Mostly database changes
4. **Embedding Widget System** - Standard iframe implementation

### Low Complexity Components
1. **Website Creation** - Static site development
2. **Database Schema Updates** - Straightforward migrations
3. **Documentation** - Content creation
4. **ENS/UP Extensions** - Building on existing integrations

## Technical Considerations

### Maintaining App Size & Complexity
- **Translation Layer**: Keeps existing codebase largely unchanged
- **Feature Flags**: Allow gradual migration without breaking changes
- **Modular Architecture**: Standalone features as optional modules
- **Bundle Splitting**: Separate CG plugin code from standalone code

### Security Considerations
- **Iframe Security**: Proper CORS, CSP, and postMessage validation
- **Authentication**: Secure handling of blockchain-based auth
- **Data Privacy**: User data handling in standalone mode
- **Rate Limiting**: Protect against abuse in public embedding

### Performance Considerations
- **Bundle Size**: Avoid duplicating Web3 libraries between modes
- **Lazy Loading**: Load CG or standalone modules as needed
- **Caching**: Efficient blockchain data caching
- **Database Optimization**: Queries optimized for both modes

## Risk Assessment

### High Risk
- **User Experience Disruption**: Changes to familiar authentication flow
- **Data Migration**: Risk of losing existing community data
- **Compatibility Issues**: Breaking existing CG plugin functionality

### Medium Risk
- **Development Timeline**: Complex translation layer may take longer than estimated
- **Third-party Dependencies**: Reliance on ENS/LUKSO infrastructure
- **Testing Coverage**: Ensuring both modes work correctly

### Low Risk
- **Technical Implementation**: Most components use standard web technologies
- **Blockchain Integration**: Already well-established in current codebase
- **Embedding Technology**: Standard iframe patterns

## Success Metrics

### Technical Metrics
- [ ] Zero breaking changes to existing CG plugin functionality
- [ ] <2 second load time for embedded widget
- [ ] 100% feature parity between CG and standalone modes
- [ ] <10% bundle size increase

### User Experience Metrics
- [ ] Seamless authentication with ENS/UP wallets
- [ ] Easy embedding process (copy-paste single script)
- [ ] Responsive design across devices
- [ ] Clear documentation and examples

### Business Metrics
- [ ] Successful migration of existing communities
- [ ] New community creation in standalone mode
- [ ] Website embeds by external users
- [ ] Reduced dependency on Common Ground platform

## Conclusion

The migration to standalone Curia is technically feasible but requires careful planning around the translation layer. The key to success is maintaining compatibility with existing functionality while building new standalone capabilities. The phased approach allows for gradual migration and testing at each stage.

The most complex aspect is creating a seamless translation layer that maintains the existing CgPluginLib interface while providing standalone functionality. However, Curia's existing strong Web3 integration (ENS, Universal Profiles, Ethereum) provides a solid foundation for standalone authentication and user management.

Total estimated timeline: **7-9 weeks** with a team of 2-3 developers.