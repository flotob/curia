# Privacy-Aware Social Media Previews - Research & Implementation Spec

## Executive Summary

This document specifies the enhancement of social media previews (both OG images and metadata) to respect the three-tier gating system implemented in Curia. The goal is to provide appropriate preview content based on privacy levels while encouraging engagement and clearly communicating access requirements.

## Current Gating System Analysis

### 1. Community-Level Gating (`CommunitySettings`)
**Purpose**: Restrict entire plugin access to specific roles  
**Implementation**: `settings.permissions.allowedRoles[]` in communities table  
**Current UI**: Shield icon in access gates, role selection interfaces  
**Detection**: `SettingsUtils.hasPermissionRestrictions(communitySettings)`

```typescript
interface CommunitySettings {
  permissions?: {
    allowedRoles?: string[]; // Role IDs that can access the entire plugin
  };
}
```

### 2. Board-Level Gating (`BoardSettings`) 
**Purpose**: Restrict specific board access within a community  
**Implementation**: `settings.permissions.allowedRoles[]` in boards table  
**Current UI**: Board access forms, permission indicators  
**Detection**: `SettingsUtils.hasPermissionRestrictions(boardSettings)`

```typescript
interface BoardSettings {
  permissions?: {
    allowedRoles?: string[]; // Role IDs that can access this board
  };
}
```

### 3. Post-Level Response Gating (`PostSettings`)
**Purpose**: Restrict commenting on posts based on Universal Profile requirements  
**Implementation**: `settings.responsePermissions.upGating` in posts table  
**Current UI**: Requirement badges, verification interfaces, detailed requirement displays  
**Detection**: `SettingsUtils.hasUPGating(postSettings)`

```typescript
interface PostSettings {
  responsePermissions?: {
    upGating?: {
      enabled: boolean;
      requirements: {
        minLyxBalance?: string; // Wei amount
        requiredTokens?: TokenRequirement[];
        followerRequirements?: FollowerRequirement[];
      };
    };
  };
}
```

## Privacy-Aware Preview Strategy

### Content Visibility Matrix

| Community Gated | Board Gated | Post Gated | Content Shown | Title Shown | Requirements Shown |
|-----------------|-------------|------------|---------------|-------------|-------------------|
| ❌ | ❌ | ❌ | ✅ Full Content | ✅ | ❌ |
| ❌ | ❌ | ✅ | ✅ Full Content | ✅ | ✅ Post Requirements |
| ❌ | ✅ | ❌ | ❌ Hidden | ✅ | ✅ Board Role Requirements |
| ❌ | ✅ | ✅ | ❌ Hidden | ✅ | ✅ Board + Post Requirements |
| ✅ | ❌ | ❌ | ❌ Hidden | ✅ | ✅ Community Role Requirements |
| ✅ | ❌ | ✅ | ❌ Hidden | ✅ | ✅ Community + Post Requirements |
| ✅ | ✅ | ❌ | ❌ Hidden | ✅ | ✅ Community + Board Requirements |
| ✅ | ✅ | ✅ | ❌ Hidden | ✅ | ✅ All Three Requirements |

### Core Privacy Principles

1. **Title Always Visible**: Post titles are considered public for discovery
2. **Content Privacy**: Post content is hidden if community or board is gated
3. **Author & Metadata**: Always shown (encourages community engagement)
4. **Clear Requirements**: Gating conditions are prominently displayed
5. **Call-to-Action**: Invite users to join/meet requirements

## Enhanced Metadata Generation

### Current Implementation Review

**Files to Modify**:
- `src/app/api/posts/[postId]/metadata/route.ts` - Add gating detection
- `src/utils/metadataUtils.ts` - Enhance description generation
- `src/app/api/og-image/route.tsx` - Add gating visual indicators

### Enhanced Metadata API

```typescript
// Enhanced PostMetadata interface
interface EnhancedPostMetadata extends PostMetadata {
  // Existing fields...
  
  // New gating context
  gatingContext: {
    communityGated: boolean;
    boardGated: boolean;
    postGated: boolean;
    communityRoles?: string[]; // Role names, not IDs
    boardRoles?: string[]; // Role names, not IDs
    postRequirements?: {
      lyxRequired?: string; // Formatted amount (e.g., "100 LYX")
      tokensRequired?: Array<{
        name: string;
        symbol: string;
        amount: string;
        type: 'LSP7' | 'LSP8';
      }>;
      followersRequired?: Array<{
        type: 'minimum_followers' | 'followed_by' | 'following';
        displayValue: string; // Human-readable requirement
      }>;
    };
  };
}
```

### Privacy-Aware Description Generation

```typescript
export function generatePrivacyAwareDescription(
  postData: EnhancedPostMetadata, 
  maxLength: number = 160
): string {
  const { gatingContext } = postData;
  
  // Base description from content (if allowed)
  let description = '';
  if (!gatingContext.communityGated && !gatingContext.boardGated) {
    description = extractDescription(postData.content, 60); // Shorter for gating info
  } else {
    description = "This discussion is part of a private community.";
  }
  
  // Add author and board context
  const context = `Posted by ${postData.author_name} in ${postData.board_name}`;
  
  // Add gating information
  const gatingInfo = generateGatingDescription(gatingContext);
  
  // Combine and limit length
  const fullDescription = [description, context, gatingInfo]
    .filter(Boolean)
    .join(' • ');
    
  return fullDescription.length > maxLength 
    ? fullDescription.substring(0, maxLength - 3) + '...'
    : fullDescription;
}

function generateGatingDescription(gatingContext: GatingContext): string {
  const requirements = [];
  
  if (gatingContext.communityGated) {
    requirements.push(`Community access required`);
  }
  
  if (gatingContext.boardGated) {
    requirements.push(`Board access required`);
  }
  
  if (gatingContext.postGated && gatingContext.postRequirements) {
    const { postRequirements } = gatingContext;
    const postReqs = [];
    
    if (postRequirements.lyxRequired) {
      postReqs.push(`${postRequirements.lyxRequired} required`);
    }
    
    if (postRequirements.tokensRequired?.length) {
      postReqs.push(`${postRequirements.tokensRequired.length} token types required`);
    }
    
    if (postReqs.length > 0) {
      requirements.push(`UP verification: ${postReqs.join(', ')}`);
    }
  }
  
  return requirements.length > 0 ? requirements.join(' • ') : '';
}
```

## Enhanced OG Image Generation

### Visual Gating Indicators

**Design Elements**:
1. **Gating Badge**: Overlay indicating privacy level
2. **Requirement Icons**: Visual indicators for different requirements
3. **Privacy Blur**: Content area styling for gated content
4. **Call-to-Action**: Modified CTA based on gating

### Updated OG Image Component

```typescript
// Enhanced parameters for OG image generation
interface OGImageParams {
  title: string;
  author: string;
  board: string;
  id: string;
  
  // New gating parameters
  communityGated?: boolean;
  boardGated?: boolean;
  postGated?: boolean;
  
  // Requirement summaries for display
  lyxRequired?: string;
  tokenCount?: number;
  followerCount?: number;
  roleRequired?: string; // Primary role name
}
```

### Gating Visual Elements

```typescript
// Privacy indicator overlay
{isGated && (
  <div style={{
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
  }}>
    🔒 {getGatingLabel(communityGated, boardGated, postGated)}
  </div>
)}

// Modified content area for gated posts
{(communityGated || boardGated) ? (
  <div style={{
    fontSize: '56px',
    fontWeight: '800',
    color: 'white',
    lineHeight: '1.1',
    margin: '0',
    textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    marginBottom: '32px',
    filter: 'blur(1px)',
    opacity: 0.7,
  }}>
    {displayTitle}
  </div>
) : (
  // Normal title display
)}

// Requirements summary section
{requirements.length > 0 && (
  <div style={{
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }}>
    <div style={{
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '600',
    }}>
      Requirements:
    </div>
    {requirements.map((req, index) => (
      <div key={index} style={{
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        alignItems: 'center',
      }}>
        {req.icon} {req.text}
      </div>
    ))}
  </div>
)}

// Modified CTA based on gating
<div style={{
  backgroundColor: isGated ? 'rgba(59, 130, 246, 0.9)' : 'rgba(255, 255, 255, 0.9)',
  borderRadius: '12px',
  padding: '16px 24px',
  color: isGated ? 'white' : '#1a202c',
  fontSize: '18px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
}}>
  {isGated ? '🔐 Join to Access' : '💬 Join Discussion'}
</div>
```

### Requirement Icon Mapping

```typescript
function getRequirementIcons(gatingContext: GatingContext): RequirementIcon[] {
  const icons = [];
  
  if (gatingContext.communityGated || gatingContext.boardGated) {
    icons.push({ icon: '👥', text: 'Role Required' });
  }
  
  if (gatingContext.postGated) {
    const { postRequirements } = gatingContext;
    
    if (postRequirements?.lyxRequired) {
      icons.push({ icon: '💰', text: `${postRequirements.lyxRequired}` });
    }
    
    if (postRequirements?.tokensRequired?.length) {
      icons.push({ icon: '🪙', text: `${postRequirements.tokensRequired.length} tokens` });
    }
    
    if (postRequirements?.followersRequired?.length) {
      icons.push({ icon: '👥', text: 'Followers required' });
    }
  }
  
  return icons;
}
```

## Implementation Phases

### Phase 1: Metadata Enhancement (Week 1)
**Goal**: Enhance metadata API to include gating context

1. **Modify `/api/posts/[postId]/metadata`**:
   - Detect community, board, and post gating
   - Resolve role IDs to role names
   - Format UP requirements for display
   - Return enhanced metadata with gating context

2. **Update `metadataUtils.ts`**:
   - Implement privacy-aware description generation
   - Create gating-specific messaging
   - Handle content privacy logic

3. **Testing**:
   - Verify gating detection accuracy
   - Test metadata generation for all gating combinations
   - Validate description length and formatting

### Phase 2: OG Image Enhancement (Week 2)
**Goal**: Visual indicators for gated content in social previews

1. **Enhance `/api/og-image`**:
   - Accept gating parameters
   - Add visual privacy indicators
   - Implement requirement icons and summaries
   - Modify CTAs based on gating status

2. **Design Implementation**:
   - Privacy badge overlay system
   - Content blurring for gated posts
   - Requirement icon library
   - Responsive layout for various requirement counts

3. **Testing**:
   - Generate images for all gating scenarios
   - Verify visual clarity and readability
   - Test across different social media platforms

### Phase 3: Integration & Polish (Week 3)
**Goal**: Complete integration and testing

1. **End-to-End Testing**:
   - Test shared URLs on major platforms
   - Verify meta tag parsing
   - Check image generation performance

2. **Performance Optimization**:
   - Cache gating context detection
   - Optimize image generation speed
   - Implement error fallbacks

3. **Documentation**:
   - Update sharing documentation
   - Create gating preview examples
   - Document new privacy features

## Expected Outcomes

### Before Implementation
```
🔗 Shared Link Preview:
   Title: "My Secret Project Update"
   Description: "Here are the confidential details about our project roadmap..."
   Image: Full content preview
   
❌ Problem: Private content exposed in social previews
```

### After Implementation

**Community Gated Post**:
```
🔗 Shared Link Preview:
   Title: "My Secret Project Update"
   Description: "This discussion is part of a private community. Posted by Alice in Core Team • Community access required"
   Image: [🔒 Community Access] [Title with slight blur] [👥 Role Required] [🔐 Join to Access]
```

**UP Gated Post**:
```
🔗 Shared Link Preview:
   Title: "Premium Features Discussion"
   Description: "Exploring new premium features for holders. Posted by Bob in Premium • UP verification: 100 LYX, 2 token types required"
   Image: [🔒 UP Required] [Clear title] [💰 100 LYX] [🪙 2 tokens] [🔐 Join to Access]
```

**Public Post**:
```
🔗 Shared Link Preview:
   Title: "Welcome to Our Community!"
   Description: "We're excited to have you join our growing community. Here's what you can expect..."
   Image: [Clear title] [Full content preview] [💬 Join Discussion]
```

## Security Considerations

### Privacy Protection
1. **Content Leakage Prevention**: Never expose private content in previews
2. **Role Information**: Show role names, not IDs or sensitive details
3. **Requirement Clarity**: Show what's needed without revealing private data

### Performance Considerations
1. **Caching Strategy**: Cache gating context detection results
2. **Fallback Handling**: Graceful degradation if gating detection fails
3. **Rate Limiting**: Prevent abuse of metadata/image generation endpoints

### User Experience
1. **Clear Messaging**: Users understand why content is restricted
2. **Actionable CTAs**: Clear paths to meet requirements
3. **Visual Consistency**: Gating indicators match existing UI patterns

## Testing Strategy

### Automated Testing
```typescript
describe('Privacy-Aware Social Previews', () => {
  test('public posts show full content', async () => {
    const metadata = await generateMetadata(publicPost);
    expect(metadata.description).toContain(postContent);
    expect(metadata.gatingContext.communityGated).toBe(false);
  });
  
  test('community gated posts hide content', async () => {
    const metadata = await generateMetadata(communityGatedPost);
    expect(metadata.description).not.toContain(postContent);
    expect(metadata.description).toContain('private community');
  });
  
  test('UP gated posts show requirements', async () => {
    const metadata = await generateMetadata(upGatedPost);
    expect(metadata.description).toContain('100 LYX');
    expect(metadata.gatingContext.postRequirements.lyxRequired).toBe('100 LYX');
  });
});
```

### Manual Testing Scenarios
1. **Cross-Platform Validation**: Test previews on Twitter, Discord, Telegram, WhatsApp
2. **Gating Combination Matrix**: All 8 possible gating combinations
3. **Requirement Variations**: Different UP requirements (LYX only, tokens only, combined)
4. **Edge Cases**: Missing data, invalid settings, network failures

## Success Metrics

### Privacy Goals
- ✅ 0% private content exposure in social previews
- ✅ 100% gating context accuracy
- ✅ Clear requirement communication

### Engagement Goals  
- ↗️ Increased click-through rates on gated content previews
- ↗️ Higher conversion to meeting requirements
- ↗️ Improved social sharing of appropriate content

### Technical Goals
- ⚡ <2s metadata generation time
- ⚡ <3s OG image generation time
- 🔄 99.9% preview generation success rate

## Future Enhancements

### Advanced Privacy Features
1. **Content Teasing**: Show first sentence of gated content
2. **Requirement Estimation**: "Join 2 more roles to access"
3. **Progressive Disclosure**: Different content levels based on viewer permissions

### Social Integration
1. **Platform-Specific Optimization**: Tailored previews for each platform
2. **Dynamic Previews**: Real-time requirement checking for logged-in users
3. **Social Proof**: "5 of your connections can access this content"

### Analytics & Insights
1. **Preview Performance**: Track click-through rates by gating type
2. **Conversion Tracking**: Monitor requirement completion rates
3. **Content Discovery**: Identify high-value gated content for promotion

---

This specification provides a comprehensive framework for implementing privacy-aware social media previews that respect user privacy while encouraging appropriate engagement and community growth. 