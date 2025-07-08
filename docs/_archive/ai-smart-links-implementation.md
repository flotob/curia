# Smart Link Interception System for AI Chat

## Overview
Implemented a comprehensive smart link interception system that ensures all links in AI chat responses work correctly within the Common Ground platform constraints.

## Problem Solved
- **Broken External Links**: Regular external links were blocked by Common Ground's iframe security
- **Broken Internal Links**: Internal links didn't use proper Next.js routing or URL builders
- **Mixed Navigation**: No consistent handling between external and internal navigation

## Solution: Smart Link Classification & Routing

### Link Classification Logic
Our system automatically identifies and categorizes links:

#### External Links
- **External Websites**: `https://example.com` → Use `cgInstance.navigate()`
- **Other Communities**: `https://app.commonground.wtf/c/other-community/plugin/uuid` → Use `cgInstance.navigate()`

#### Internal Links  
- **Posts**: `/board/123/post/456` → Extract IDs, use `buildPostUrl()` + Next.js router
- **Boards**: `/board/123` → Use Next.js router
- **Internal Routes**: `/settings`, `/locks` → Use Next.js router

### Technical Implementation

#### Enhanced MarkdownContent Component
Location: `src/components/ai/AIChatInterface.tsx`

**Key Features:**
- Replaced dangerous `dangerouslySetInnerHTML` with proper React element parsing
- Real-time link classification on click
- Error handling with graceful fallbacks
- Comprehensive logging for debugging

#### Smart Navigation Flow
```typescript
// 1. Link Click Intercepted
handleLinkClick(e) → e.preventDefault()

// 2. Link Classification  
classifyLink(href) → { type: 'external_web', url: '...' }

// 3. Appropriate Navigation
switch(type) {
  case 'external_web': cgInstance.navigate(url)
  case 'internal_post': router.push(buildPostUrl(postId, boardId))  
  case 'internal_route': router.push(url)
}
```

## Examples of Working Links

### AI can now naturally include working links:
- **External**: `"Check out [this Web3 resource](https://ethereum.org) for more info"`
- **Other Communities**: `"Similar discussion in [another community](https://app.commonground.wtf/c/other/plugin/uuid)"`
- **Internal Posts**: `"See [this previous post](/board/42/post/123) about governance"`
- **Internal Routes**: `"Visit your [lock settings](/locks) to configure gating"`

## Benefits

### User Experience
- ✅ All AI-generated links work as expected
- ✅ Consistent navigation behavior
- ✅ No more broken link frustration

### Developer Experience  
- ✅ AI can naturally reference content without worrying about navigation
- ✅ Consistent with function card navigation patterns
- ✅ Future-proof for any link type AI might generate

### Platform Integration
- ✅ Respects Common Ground iframe constraints
- ✅ Uses proper URL builders and routing utilities
- ✅ Maintains security best practices

## Technical Details

### Dependencies Added
- `useRouter` from Next.js for internal navigation
- `buildPostUrl` from our URL utilities
- `useCgLib` for Common Ground navigation context

### Error Handling
- Graceful fallback to `window.open()` if CG navigation fails
- Console logging for debugging navigation issues
- Safe defaults for unknown link types

### Performance
- Link classification only runs on click (not render)
- Efficient regex parsing for URL patterns
- No performance impact on non-link content

## Future Enhancements
- Could add support for more URL patterns as needed
- Could add analytics tracking for link clicks
- Could add user preferences for link behavior

## Testing
The system handles:
- ✅ External website links
- ✅ Other Common Ground community links  
- ✅ Internal post navigation with proper URL building
- ✅ Internal route navigation
- ✅ Error scenarios with fallback behavior

This implementation ensures AI assistants can naturally reference content while maintaining proper navigation within the Common Ground platform. 