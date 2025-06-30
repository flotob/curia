# Legacy Code Audit Report

## Executive Summary

This report identifies legacy code patterns and dead code across the codebase that can be safely removed or refactored to improve maintainability and reduce technical debt.

## 1. Backup and Temporary Files 

### 🗑️ Files to Delete

- **`src/components/layout/Sidebar.tsx.bak`** - 896-line backup file of old sidebar implementation
  - Contains outdated sidebar logic with shared boards integration
  - Current `Sidebar.tsx` is the active implementation
  - **Action:** Delete this backup file

### Test Pages (Development Artifacts)
- **`src/app/test-mini/page.tsx`** - Minimal test page with hardcoded content
- **`src/app/test-meta/page.tsx`** - Metadata testing page
  - Both appear to be development artifacts
  - **Action:** Consider removing if no longer needed for testing

## 2. Deprecated Hooks and Functions

### 🚫 Completely Deprecated Hook
- **`src/hooks/useShareableBoards.ts`** - Entire file marked as deprecated
  - Replaced by import model with `useImportableBoards` from `useSharedBoards.ts`
  - Contains only mock functions returning empty data
  - No actual usage found in codebase
  - **Action:** Delete this file

### 🚫 Deprecated Functions in `src/lib/upProfile.ts`
Lines 900-920 contain legacy utilities marked as deprecated:
```typescript
// ===== LEGACY UTILITIES (deprecated but maintained for compatibility) =====
export const getUPDisplayName = (address: string): Promise<string> // @deprecated
export const getUPProfileInfo = (address: string): Promise<UPProfileInfo> // @deprecated  
export const batchGetUPProfileInfo = (addresses: string[]): Promise<Record<string, UPProfileInfo>> // @deprecated
```
- **Action:** Remove these if no longer used, or at minimum add removal timeline

## 3. Commented-Out Code Blocks

### 🧹 Ready for Removal
- **`src/app/api/telegram/webhook/route.ts`** (Lines 8, 42-50):
  ```typescript
  // import crypto from 'crypto'; // TEMP: Commented out for testing
  // function verifyTelegramWebhook(body: string, signature: string): boolean {
  //   const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  //   ...
  ```
  - Commented out for testing, likely permanent
  - **Action:** Remove commented webhook verification code

- **Multiple Import Statements:**
  - `src/app/board/[boardId]/post/[postId]/page.tsx` Line 16
  - `src/components/voting/CommentItem.tsx` Line 29, 32
  - `src/components/voting/PostCard.tsx` Line 3-4
  - `src/components/partnerships/CreatePartnershipModal.tsx` Line 18
  - **Action:** Remove unused import statements

## 4. Console.log Statements (Debugging Leftovers)

### 🔍 Production Cleanup Needed

**High Priority (Server-side logging):**
- **`server.ts`** - 20+ console.log statements for debugging:
  ```typescript
  console.log('[Server] dotenv.config attempt for .env:', ...);
  console.log('[Socket.IO] User connected:', ...);
  console.log('[Partnership Broadcasting] Community has partners:', ...);
  ```
  - **Action:** Replace with proper logging framework or remove

**Medium Priority (Migration logging):**
- **Migration files** contain console.log statements:
  - `migrations/1749325316186_add-community-shortid-history-to-links.ts`
  - `migrations/1750695319391_add-logo-url-to-communities.ts`
  - Several others with migration progress logging
  - **Action:** Consider if migration logging is still needed

**Low Priority (Client-side debugging):**
- **`src/app/page.tsx`** - Board room auto-join logging
- **`src/utils/cookieDebug.ts`** - Debug utilities (intentional for dev tools)

## 5. Unused ESLint Disables

### 🔧 Review Required
Multiple files have `// eslint-disable-next-line @typescript-eslint/no-unused-vars`:
- `src/app/api/users/search/route.ts` Line 71
- `src/app/api/users/[userId]/route.ts` Line 71  
- `src/app/api/posts/[postId]/comments/route.ts` Lines 101, 207, 283
- `src/components/verification/UPVerificationWrapper.tsx` Lines 27, 29, 31
- `src/lib/gating/renderers/EthereumProfileRenderer.tsx` Lines 311-313

**Action:** Review if variables are actually unused and can be removed

## 6. TODO/FIXME Comments (Technical Debt)

### 📝 High Priority TODOs
- **`src/lib/lsp26/lsp26Registry.ts`** Line 10:
  ```typescript
  const LSP26_REGISTRY_ADDRESS = '0x...'; // TODO: Replace with actual address
  ```

- **`src/components/locks/LockCreationModal.tsx`** Lines 706, 917:
  ```typescript
  // TODO: Implement real validation logic in later phases
  // TODO: Show error toast/notification to user
  ```

### 📝 Integration TODOs
Multiple files reference Common Ground API integration:
- `src/app/api/posts/[postId]/metadata/route.ts` Line 66
- `src/lib/telegram/directMetadataFetcher.ts` Line 246, 258
- `src/lib/roleService.ts` Lines 86, 102

## 7. Environment Variables (Potential Cleanup)

### 🔍 Audit Recommended
Found 50+ environment variable references. Some potentially unused:
- `TELEGRAM_WEBHOOK_SECRET` (commented out in webhook handler)
- `NEXT_PUBLIC_SUPERADMIN_ID` (used in multiple auth checks)
- Various RPC URLs and API endpoints

**Action:** Audit which environment variables are actually required

## 8. Migration Files (Consolidation Opportunity)

### 📚 32 Migration Files Present
Migration timestamps span from `1748449754626` (Jan 2025) to `1751089365558` (Jan 2025).

**Considerations:**
- Early migrations could potentially be consolidated for new deployments
- Some migrations convert between formats (gating → categories → locks)
- **Action:** Consider creating consolidated schema for fresh deployments

## 9. Legacy Backward Compatibility Code

### 🔄 Maintained for Compatibility
- **`src/types/sharedBoards.ts`** Line 62: "Legacy types for backward compatibility"
- **`src/contexts/SocketContext.tsx`** Line 49: "Legacy interface for backward compatibility"
- **`src/hooks/useSharedBoards.ts`** Line 102: "Legacy aliases for backward compatibility"

**Action:** Evaluate if legacy compatibility is still needed

## Recommended Cleanup Priority

### 🚨 High Priority (Safe to Remove)
1. Delete `src/components/layout/Sidebar.tsx.bak`
2. Delete `src/hooks/useShareableBoards.ts`
3. Remove commented-out code blocks in webhook handler
4. Remove unused import statements

### 🔶 Medium Priority (Requires Review)
1. Review and remove/replace console.log statements in production code
2. Address high-priority TODOs (LSP26 registry address, validation logic)
3. Clean up unused ESLint disables
4. Evaluate test pages for removal

### 🔷 Low Priority (Future Consideration)
1. Consider migration file consolidation for new deployments
2. Audit environment variables for unused entries
3. Plan removal timeline for deprecated UP profile functions
4. Evaluate legacy compatibility code necessity

## Estimated Impact

- **Code reduction:** ~1,000+ lines of dead code removal
- **File reduction:** 2-3 files can be deleted
- **Maintenance improvement:** Reduced confusion from deprecated patterns
- **Build performance:** Slight improvement from fewer files to process

## Conclusion

The codebase is generally well-maintained with clear deprecation markers and backward compatibility considerations. Most legacy code appears to be intentionally preserved for compatibility or represents recent architectural changes that are properly deprecated but not yet removed.

Priority should be given to removing clearly dead files and commented-out code, while taking a measured approach to removing deprecated functions that may still have external dependencies.