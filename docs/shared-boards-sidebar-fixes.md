# Shared Board Sidebar Fixes

## Overview
Fixed two specific issues in the right sidebar's ContextualNavigationCard component to improve shared board functionality and consistency with PostCard behavior.

## ✅ Fix 1: Home Navigation Issue

### Problem
When clicking "Home" in the shared board version of the right sidebar component, the navigation didn't work properly. The home link preserved all URL parameters including `boardId`, which kept users in the board context instead of taking them to the actual home feed.

### Root Cause
```typescript
// BEFORE: Preserved all parameters including boardId
const handleHomeClick = () => {
  const url = buildInternalUrl('/');
  router.push(url);
};
```

The `buildInternalUrl('/')` function preserved all existing URL parameters, including `boardId`, which meant clicking "Home" didn't actually take users to the home feed.

### Solution
```typescript
// AFTER: Explicitly remove boardId parameter while preserving others
const handleHomeClick = () => {
  // Go to home, removing boardId parameter but preserving others
  const params = new URLSearchParams();
  
  // Preserve existing params except boardId
  if (searchParams) {
    searchParams.forEach((value, key) => {
      if (key !== 'boardId') {
        params.set(key, value);
      }
    });
  }
  
  const homeUrl = params.toString() ? `/?${params.toString()}` : '/';
  router.push(homeUrl);
};
```

### Impact
- ✅ Home navigation now works correctly for both shared and owned boards
- ✅ Preserves important parameters like theme (`cg_theme`) while removing board context
- ✅ Consistent behavior across all board types

## ✅ Fix 2: Share Link URL Generation

### Problem
The post details view in the right sidebar showed a share link copy-to-clipboard button, but it used simple URL generation instead of the sophisticated shared board-aware URL generation used in the PostCard component. This meant:
- Shared board posts generated incorrect share URLs
- URLs pointed to importing community instead of source community
- No semantic URL generation with proper community context

### Root Cause
```typescript
// BEFORE: Simple URL generation
const handleCopyPostLink = async () => {
  if (currentPost && currentBoard) {
    const url = `${window.location.origin}/board/${currentBoard.id}/post/${currentPost.id}`;
    // Simple clipboard copy...
  }
};
```

The sidebar used basic URL construction while PostCard used sophisticated logic to detect shared boards and generate proper semantic URLs with source community context.

### Solution
Implemented the same sophisticated URL generation logic as PostCard:

```typescript
// AFTER: Sophisticated shared board-aware URL generation
const handleSharePost = async () => {
  if (!currentPost || !currentBoard) {
    console.error('[ContextualNavigationCard] Cannot share post: missing post or board data');
    return;
  }

  let generatedShareUrl: string;
  
  try {
    // Detect shared board and get appropriate community context
    let communityShortId = user?.communityShortId;
    let pluginId = user?.pluginId;

    // For shared boards, use source community context instead of importing community
    if (currentBoard.is_imported && currentBoard.source_community_id && token) {
      try {
        const sourceCommunity = await authFetchJson<ApiCommunity>(
          `/api/communities/${currentBoard.source_community_id}`, 
          { token }
        );
        communityShortId = sourceCommunity.communityShortId;
        pluginId = sourceCommunity.pluginId;
      } catch (error) {
        // Fall back to importing community context
      }
    }

    generatedShareUrl = await buildExternalShareUrl(
      currentPost.id, 
      currentBoard.id, 
      communityShortId || undefined,
      pluginId || undefined,
      currentPost.title,
      currentBoard.name
    );
    
  } catch (shareUrlError) {
    // Fallback to internal URL if semantic URL generation fails
    generatedShareUrl = `${window.location.origin}/board/${currentBoard.id}/post/${currentPost.id}`;
  }

  // Try Web Share API first (mobile-friendly)
  if (isWebShareSupported && isMobileDevice) {
    try {
      await navigator.share({
        title: currentPost.title,
        text: `Check out this discussion: "${currentPost.title}"`,
        url: generatedShareUrl,
      });
      return;
    } catch (webShareError) {
      if (webShareError instanceof Error && webShareError.name === 'AbortError') {
        return; // User cancelled
      }
      // Continue to clipboard fallback
    }
  }

  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(generatedShareUrl);
    toast.success('Post link copied to clipboard');
  } catch (err) {
    toast.error('Failed to copy link');
  }
};
```

### Key Improvements

#### **1. Shared Board Context Detection**
- Detects when viewing shared boards via `currentBoard.is_imported`
- Fetches source community metadata for proper URL generation
- Falls back gracefully to importing community context if needed

#### **2. Semantic URL Generation**
- Uses `buildExternalShareUrl()` for proper semantic URLs
- Includes source community short ID and plugin ID
- Generates user-friendly URLs instead of internal board/post IDs

#### **3. Enhanced User Experience**
- **Mobile Support**: Tries Web Share API first on mobile devices
- **Graceful Fallbacks**: Internal URL fallback if semantic URL generation fails
- **User Feedback**: Proper success/error toast messages
- **Cancellation Handling**: Respects user cancellation of Web Share dialog

#### **4. Consistency with PostCard**
- Same URL generation logic across all share buttons
- Consistent behavior for both shared and owned boards
- Same mobile detection and Web Share API usage

### Impact
- ✅ **Correct URLs**: Share URLs now point to source community for shared boards
- ✅ **Semantic URLs**: Generates user-friendly semantic URLs instead of internal IDs
- ✅ **Mobile Optimization**: Web Share API support for better mobile experience
- ✅ **Consistency**: Same sharing behavior across PostCard and sidebar
- ✅ **Reliability**: Robust fallback chain ensures sharing always works

## 🔧 Technical Details

### **Dependencies Added**
```typescript
import { buildExternalShareUrl } from '@/utils/urlBuilder';
import { ApiCommunity } from '@/app/api/communities/route';
```

### **API Integration**
- Uses `/api/communities/[communityId]` endpoint to fetch source community metadata
- Handles authentication with existing token from auth context
- Proper error handling and fallback strategies

### **Type Safety**
- Fixed property name mapping: `communityShortId` and `pluginId` (camelCase) instead of snake_case database fields
- Full TypeScript integration with existing interfaces
- Proper error handling with typed exceptions

## 🧪 Validation

### **Build Validation**
- ✅ Clean TypeScript compilation
- ✅ No new ESLint errors
- ✅ All existing functionality preserved
- ✅ Only standard Next.js warnings (unrelated to changes)

### **Functionality Testing**
- ✅ Home navigation works for both shared and owned boards
- ✅ Share URLs generate correctly for shared board posts
- ✅ Fallback mechanisms work when APIs fail
- ✅ Mobile Web Share API integration works properly

## 📝 Summary

These two fixes complete the shared board sidebar implementation by addressing the remaining UX inconsistencies:

1. **Navigation Consistency**: Home links now work properly across all board types
2. **Sharing Parity**: Share functionality now matches PostCard behavior with sophisticated URL generation

The shared board sidebar now provides a completely consistent and professional user experience that properly handles all edge cases while maintaining backward compatibility with owned boards. Users can confidently navigate and share content whether they're viewing owned or shared boards, with the system automatically handling the complex community context switching behind the scenes. 