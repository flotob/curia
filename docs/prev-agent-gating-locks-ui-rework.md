# Comprehensive Briefing: Reimagining Post Gating UI with "Lock" System

## Project Overview

You are tasked with completely reworking the UI side of our post drafting process for defining gating conditions. The goal is to replace the current complex gating configuration with a simplified "lock" concept where users can create reusable gating configurations ("locks") and easily select from previously created ones.

## Current System Analysis

### Current Post Drafting & Gating Architecture
Search files...

Ran tool

Read file: docs/current-db-schema.md


Search files...

# Comprehensive Briefing: Redesigning Post Gating UI with "Lock" System

## Mission Statement

You are tasked with **completely reimagining the UI/UX for post gating configuration** in our community platform. The goal is to replace the current complex, technical gating interface with an intuitive "lock" system where users can create reusable gating configurations and easily apply them to posts.

## Current System Overview

### Database Architecture

**Current Post Storage (`posts` table):**
```sql
CREATE TABLE "public"."posts" (
    "id" integer DEFAULT nextval('posts_id_seq') NOT NULL,
    "author_user_id" text NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" text NOT NULL,
    "tags" text[],
    "upvote_count" integer DEFAULT '0' NOT NULL,
    "comment_count" integer DEFAULT '0' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "board_id" integer NOT NULL,
    "settings" jsonb DEFAULT '{}' NOT NULL,  -- ← GATING CONFIG STORED HERE
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);
```

**Current Gating Settings Structure:**
```json
{
  "responsePermissions": {
    "categories": [
      {
        "type": "universal_profile",
        "enabled": true,
        "requirements": {
          "minLyxBalance": "42000000000000000000",
          "requiredTokens": [
            {
              "name": "Just a Potato 🥔",
              "symbol": "POTATO", 
              "minAmount": "1000000000000000000",
              "tokenType": "LSP7",
              "contractAddress": "0x80d898c5a3a0b118a0c8c8adcdbb260fc687f1ce"
            }
          ],
          "followerRequirements": [
            {
              "type": "followed_by",
              "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
            }
          ]
        }
      },
      {
        "type": "ethereum_profile",
        "enabled": true,
        "requirements": {
          "requiresENS": true,
          "minimumETHBalance": "7000000000000000",
          "efpRequirements": [
            {
              "type": "minimum_followers",
              "value": "3"
            }
          ],
          "requiredERC20Tokens": [
            {
              "name": "SHIB",
              "symbol": "SHIB",
              "minimum": "1234",
              "contractAddress": "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"
            }
          ]
        }
      }
    ],
    "requireAny": true
  }
}
```

### Current UI Components

**Main Configuration Entry Point:**
- `src/components/posting/PostGatingControls.tsx` - 312 lines of complex configuration UI
- Users must configure each gating requirement from scratch for every post
- Exposed technical details like contract addresses, token decimals, wei amounts

**Current Gating Renderer System:**
```typescript
interface CategoryRenderer {
  getMetadata(): GatingCategoryMetadata;
  getDefaultRequirements(): unknown;
  renderConfig(props: CategoryConfigProps): ReactNode;
  renderConnection(props: CategoryConnectionProps): ReactNode;
  renderDisplay(props: CategoryRendererProps): ReactNode;
}
```

**Example Renderers:**
- `src/lib/gating/renderers/UniversalProfileRenderer.tsx` - LUKSO blockchain gating
- `src/lib/gating/renderers/EthereumProfileRenderer.tsx` - Ethereum blockchain gating

**Configuration Components:**
- Complex token requirement forms with contract addresses
- Manual follower requirement configuration  
- Technical balance inputs (wei amounts, decimals)
- Multiple blockchain network handling

## Problems with Current System

### 1. **Overwhelming Complexity**
- Users see raw contract addresses (e.g., `0x80d898c5a3a0b118a0c8c8adcdbb260fc687f1ce`)
- Technical terminology (LSP7, ERC-20, wei, decimals)
- Multiple expanding sections and configuration panels
- No guidance on what makes sense to configure

### 2. **No Reusability**
- Each post requires complete reconfiguration from scratch
- No way to save commonly used gating patterns
- Complex configurations get lost when posts are created
- Users reinvent the wheel for every gated post

### 3. **Poor User Experience**
- Cognitive overload from too many options
- Easy to make mistakes in configuration
- No preview of what the gating will actually look like
- No templates or starting points

### 4. **Technical Barriers**
- Requires blockchain knowledge to use effectively
- Users need to know contract addresses, token symbols
- Complex social network configurations (EFP follower requirements)
- Network-specific nuances (LUKSO vs Ethereum)

## Vision: The "Lock" System

### Core Concept

A **"Lock"** is a reusable, user-friendly gating configuration that can be:
1. **Created once** with a simple, guided interface
2. **Named meaningfully** (e.g., "VIP Members Only", "Token Holders", "OG Community")
3. **Stored in database** for reuse across posts
4. **Shared between users** (community templates)
5. **Applied instantly** to new posts

### User Experience Flow

```
1. Create Post → 2. Choose Gating → 3. Select Lock → 4. Publish
                      ↓
                  "Create New Lock" 
                      ↓
                  Simple Lock Builder
                      ↓
                  Save & Apply Lock
```

### Lock Categories

**Personal Locks** (created by user):
- "My Token Holders" 
- "Close Friends Only"
- "Premium Members"

**Community Templates** (curated):
- "ENS Holders"
- "NFT Collectors" 
- "DeFi Veterans"
- "LUKSO Builders"

**Quick Locks** (system-generated):
- "ETH Holders (0.1+ ETH)"
- "Any ENS Name"
- "100+ Followers"

## Technical Implementation Requirements

### Database Schema Design

You need to design a new database table structure for storing locks:

```sql
-- Example structure (you should refine this)
CREATE TABLE "locks" (
  "id" integer PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "description" text,
  "icon" varchar(50), -- emoji or icon identifier
  "color" varchar(20), -- brand color
  "gating_config" jsonb NOT NULL, -- the actual gating requirements
  "creator_user_id" text REFERENCES users(user_id),
  "is_template" boolean DEFAULT false, -- community template vs personal
  "is_public" boolean DEFAULT false, -- shareable by other users
  "usage_count" integer DEFAULT 0, -- how many times used
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);
```

### UI Components to Build

#### 1. **Lock Selection Interface**
Replace `PostGatingControls.tsx` with a clean lock selection interface:

```typescript
interface LockSelectorProps {
  onLockSelected: (lock: Lock) => void;
  onCreateNew: () => void;
  userLocks: Lock[];
  templateLocks: Lock[];
}

// Visual design: Card-based interface showing:
// - Lock name and description
// - Visual preview of requirements
// - Usage statistics
// - Quick apply button
```

#### 2. **Lock Builder Interface**
Simplified configuration interface that abstracts away technical details:

```typescript
interface LockBuilderProps {
  onSave: (lock: Lock) => void;
  onCancel: () => void;
  editingLock?: Lock; // for editing existing locks
}

// Features needed:
// - Step-by-step wizard interface
// - Visual preview of requirements
// - User-friendly language
// - Validation and error handling
// - "Test Lock" functionality
```

#### 3. **Lock Preview Component**
Show what a lock looks like to end users:

```typescript
interface LockPreviewProps {
  lock: Lock;
  userStatus?: VerificationStatus;
  variant: 'compact' | 'detailed';
}

// Shows:
// - Lock name and description
// - Requirements in user-friendly language
// - User's current status (if connected)
// - Visual status indicators
```

### API Requirements

You'll need to build several new API endpoints:

```typescript
// Locks API
GET    /api/locks              // Get user's locks + templates
POST   /api/locks              // Create new lock
PUT    /api/locks/:id          // Update lock
DELETE /api/locks/:id          // Delete lock
POST   /api/locks/:id/test     // Test lock requirements for user

// Posts integration
POST   /api/posts/:id/apply-lock  // Apply lock to existing post
```

### Integration with Existing System

The lock system must integrate seamlessly with the existing gating infrastructure:

1. **Maintain Backward Compatibility**: Existing posts with old gating format must continue to work
2. **Reuse Verification System**: Locks should generate the same `gating_config` JSON that current verification system expects
3. **Preserve Category Renderers**: The `UniversalProfileRenderer` and `EthereumProfileRenderer` should continue to work with lock-generated configurations

## UI/UX Design Principles

### 1. **Progressive Disclosure**
- Start with simple lock selection
- Reveal complexity only when creating custom locks
- Use wizards and step-by-step flows for complex configuration

### 2. **User-Friendly Language**
- Replace "ERC-20 token requirements" with "Require specific tokens"
- Replace contract addresses with token names/symbols
- Use visual icons and colors instead of technical jargon

### 3. **Visual Design Hierarchy**
```
Lock Selection Interface:
┌─────────────────────────────────────┐
│  🔒 Choose Access Requirements      │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 🎯  │ │ 💎  │ │ 👥  │ │ ➕  │   │
│  │VIP  │ │ETH  │ │ENS  │ │New │   │
│  │Only │ │Hold.│ │Hold.│ │Lock│   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│  Recent Locks:                      │
│  • My Premium Members               │
│  • Token Holder Exclusive           │
│                                     │
└─────────────────────────────────────┘
```

### 4. **Smart Defaults**
- Provide sensible default configurations
- Learn from user behavior to suggest locks
- Auto-generate lock names based on requirements

### 5. **Immediate Feedback**
- Live preview of how lock will look to users
- Validation messages in real-time
- "Test with my wallet" functionality

## Technical Challenges to Solve

### 1. **Requirements Translation**
You need to build a system that translates user-friendly inputs into the technical gating requirements format. For example:

```typescript
// User Input: "ETH Holders (0.5+ ETH)"
// Should generate:
{
  type: "ethereum_profile",
  enabled: true,
  requirements: {
    minimumETHBalance: "500000000000000000" // 0.5 ETH in wei
  }
}
```

### 2. **Smart Token Search**
Instead of requiring contract addresses, users should be able to search for tokens by name:

```typescript
// User types: "USDC"
// System should find: 
{
  name: "USD Coin",
  symbol: "USDC", 
  contractAddress: "0xA0b86a33E6417C85dC8E...",
  decimals: 6
}
```

### 3. **Cross-Chain Complexity**
The system needs to handle both LUKSO (Universal Profiles) and Ethereum requirements elegantly without exposing users to blockchain complexity.

### 4. **Requirement Validation**
- Validate that token contracts exist and are legitimate
- Check that follower requirements reference valid addresses
- Ensure balance requirements are reasonable
- Prevent impossible combinations

## Success Metrics

The new lock system should achieve:

1. **Usability**: Users can create gated posts 5x faster than current system
2. **Adoption**: 80% of gated posts use locks instead of custom configuration
3. **Reuse**: Average lock is used 3+ times across different posts
4. **Error Reduction**: 90% fewer configuration errors compared to current system
5. **User Satisfaction**: Post creators rate the gating experience 4.5+ stars

## Implementation Phases

### Phase 1: Database & API Foundation
- Design and implement locks database schema
- Build CRUD APIs for lock management
- Create lock validation system
- Build lock-to-gating-config translation layer

### Phase 2: Core UI Components
- Build lock selection interface
- Implement lock preview component
- Create basic lock builder (simplified version)
- Integrate with existing post creation flow

### Phase 3: Advanced Builder
- Build full lock creation wizard
- Implement token search and selection
- Add social requirement configuration
- Create lock testing functionality

### Phase 4: Templates & Polish
- Create curated lock templates
- Build lock sharing functionality
- Add usage analytics and recommendations
- Polish UI/UX based on user feedback

## Key Files to Study

Before starting implementation, thoroughly understand these existing files:

**Current Gating System:**
- `src/components/posting/PostGatingControls.tsx` - Main configuration interface
- `src/types/settings.ts` - Settings and requirements type definitions
- `src/lib/gating/renderers/UniversalProfileRenderer.tsx` - LUKSO gating implementation
- `src/lib/gating/renderers/EthereumProfileRenderer.tsx` - Ethereum gating implementation

**Database Schema:**
- `docs/current-db-schema.md` - Current database structure with `posts.settings` JSONB storage

**Type Definitions:**
- `src/types/gating.ts` - Comprehensive gating types and interfaces

**Current UI Patterns:**
- `src/components/gating/GatingCategoriesContainer.tsx` - Multi-category gating display
- `src/components/gating/GatingRequirementsPanel.tsx` - Requirements verification UI

## Critical Requirements

1. **Backward Compatibility**: Do not break existing gated posts
2. **Performance**: Lock selection must be fast and responsive
3. **Security**: Validate all lock configurations server-side
4. **Accessibility**: Follow WCAG 2.1 AA guidelines
5. **Mobile-Friendly**: Works well on all device sizes
6. **Intuitive UX**: No blockchain knowledge required for basic usage

## Questions to Consider

As you design the system, consider:

1. How do you handle lock versioning when requirements change?
2. Should locks be transferable between users/communities?
3. How do you prevent malicious or impossible lock configurations?
4. What happens when a lock's underlying tokens or contracts become invalid?
5. How do you handle privacy (personal vs public locks)?
6. Should there be lock categories or tags for organization?
7. How do you migrate existing complex gating configurations to locks?

This briefing provides the complete context needed to revolutionize our post gating UX. The goal is to transform a technical, complex system into an intuitive, reusable, and user-friendly experience that democratizes access control for all community members.