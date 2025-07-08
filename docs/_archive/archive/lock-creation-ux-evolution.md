# Lock Creation UX Evolution

## Background
Based on user feedback during Phase 2 implementation, we've evolved from a category-first approach to a more intuitive requirement-first approach.

## Original vs Refined Approach

### ❌ Original Category-First Flow
```
Template Picker → Category Selection → Category Configuration → Preview → Save
```
**Problems:**
- Artificial barrier of choosing "categories" upfront
- Users think in concrete requirements, not abstract categories  
- Harder to mix/match requirements across categories
- More complex mental model

### ✅ Refined Requirement-First Flow  
```
Template Picker → Requirements List → Preview → Save
```
**Benefits:**
- Direct, concrete mental model
- Better requirement discovery
- Flexible mixing across categories
- Simpler user journey

## Detailed Screen Flows

### Screen 1: Template Picker (No Changes)
- ✅ **Current implementation is perfect**
- Visual template browser with search/filtering
- Templates can pre-populate requirements list
- "Start from scratch" option

### Screen 2: Requirements List Manager
**Initial State:**
- **From Template**: Pre-populated with template's requirements  
- **From Scratch**: Empty list with "Add your first requirement" prompt

**Interface Elements:**
- Search/filter field for requirement types
- Current requirements list (grouped by category for readability)
- "Add Requirement" button → navigates to requirement picker

**Requirements List Layout:**
```
🔍 [Search requirements...]

Current Requirements (3):

🪙 Token Requirements
  💎 LYX Balance: ≥ 50 LYX                    [Edit] [Remove]
  🎨 ERC-20: ≥ 1,000 USDC                     [Edit] [Remove]

👥 Social Requirements  
  📊 UP Followers: ≥ 100 followers            [Edit] [Remove]

[+ Add Requirement]
```

### Screen 2A: Add Requirement (Sub-Screen)
**Navigation**: Requirements List → Add Requirement Picker
**Mobile-Friendly**: Slide transition, not modal-from-modal

**Requirement Picker Interface:**
```
🔍 [Search all requirement types...]

🪙 Token Requirements
  💎 LYX Minimum Balance
  🏆 LSP7 Token Holding  
  🖼️ LSP8 NFT Ownership
  ⚡ ETH Minimum Balance
  🎨 ERC-20 Token Holding
  🖼️ ERC-721 NFT Ownership

👥 Social Requirements
  📊 UP Follower Count
  🤝 UP Must Follow Address
  ⭐ UP Must Be Followed By
  📈 EFP Follower Count
  🔗 EFP Must Follow User
  🎯 EFP Must Be Followed By

🌐 Identity Requirements
  🏷️ ENS Domain Ownership
  🎭 ENS Domain Pattern
```

### Screen 2B: Configure Requirement (Sub-Screen)
**Navigation**: Requirement Picker → Configure Selected Requirement
**Reuses Existing Components**: 
- UP requirements → UPConfigComponent pieces
- Ethereum requirements → EthereumConfigComponent pieces  
- Built-in validation from existing components

### Screen 3: Preview (Future Phase)
- Live wallet connection testing
- Requirement verification simulation

### Screen 4: Save (Future Phase)
- Final metadata review
- Lock persistence

## Technical Architecture

### State Management
```typescript
interface LockBuilderState {
  selectedTemplate: LockTemplate | null;
  metadata: {
    name: string;
    description: string; 
    icon: string;
  };
  requirements: GatingRequirement[]; // Flat list, no categories
}
```

### Requirement Structure
```typescript
interface GatingRequirement {
  id: string;
  type: RequirementType;
  category: 'token' | 'social' | 'identity'; // For grouping only
  config: RequirementConfig; // Type-specific configuration
  isValid: boolean;
}
```

### Component Reuse Strategy
- **90% Code Reuse**: Leverage existing UPConfigComponent & EthereumConfigComponent
- **Adaptation**: Extract individual requirement configurators
- **Consistency**: Same UX as post creation gating

## Implementation Phases

### ✅ Phase 1: Foundation (Complete)
- Modal infrastructure
- Progress stepper  
- Basic state management

### ✅ Phase 2: Smart Templates (Complete)
- Template picker with search/filtering
- Template data structure
- Template selection state

### 🎯 Phase 3: Requirements List Manager (Current)
**3A**: Requirements list interface
- Empty state handling
- Template pre-population  
- List display with grouping
- Edit/remove actions

**3B**: Add requirement picker
- Searchable requirement browser
- Category organization
- Mobile-friendly navigation

**3C**: Individual requirement configurators
- Extract from existing components
- Requirement-specific validation
- State synchronization

### 🔄 Phase 4: Preview Integration
- Live wallet testing
- Requirement verification

### 🔄 Phase 5: Polish & Launch
- Final UX refinements
- Performance optimization

## Key Design Decisions

1. **Template Integration**: Templates pre-populate requirements list for quick start
2. **Grouping Strategy**: Visual grouping by category for readability, not rigid separation
3. **Mobile Navigation**: Side-screen pattern instead of modal-from-modal
4. **Validation Strategy**: Built into individual requirement configuration components
5. **Code Reuse**: Leverage existing gating configuration components extensively

## Success Metrics
- Reduced cognitive load vs category-first approach
- Faster lock creation time
- Better requirement discoverability
- Higher completion rates 