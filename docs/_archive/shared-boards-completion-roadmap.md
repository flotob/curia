# Shared Boards Feature Completion Roadmap

## Overview
Complete the shared boards feature implementation with proper UX, backend validation, and cross-community functionality.

## Issues to Resolve
1. **UX/Terminology** - "Import" should be "Shared Boards"
2. **Cache Invalidation** - Sidebar doesn't update after adding shared board
3. **Socket Context** - Wrong community access errors
4. **Backend Validation** - Board resolution doesn't handle imported boards
5. **Global Search/Posting** - Fails in shared board context
6. **Partnership Management** - Cannot edit existing partnership permissions

---

## Phase 1: UX/Terminology Fixes ⭐ (EASY - 30min)

### 1.1 Update Sidebar Button
- [ ] Change "Import Boards" to "Shared Boards" 
- [ ] Use Plus icon (same as Create Board)
- [ ] Update hover text to "Add Shared Board"

### 1.2 Update Management Page
- [ ] Change page title from "Import Boards" to "Shared Boards"
- [ ] Change button from "Import Board" to "Add to Sidebar"
- [ ] Update descriptions and help text
- [ ] Change URL from `/create-shared-board` to `/shared-boards`

**Files to Update:**
- `src/components/layout/Sidebar.tsx`
- `src/app/create-shared-board/page.tsx` (rename to `shared-boards`)
- Update routing if needed

---

## Phase 2: Cache Invalidation ⭐⭐ (EASY-MEDIUM - 45min)

### 2.1 Identify Cache Keys
- [ ] Find React Query key for sidebar shared boards data
- [ ] Understand `useSharedBoards` hook caching strategy

### 2.2 Fix Cache Invalidation
- [ ] Add proper invalidation after "Add to Sidebar" action
- [ ] Ensure sidebar updates immediately
- [ ] Test cache invalidation works correctly

**Files to Update:**
- `src/app/create-shared-board/page.tsx` (shared boards page)
- `src/hooks/useSharedBoards.ts`

---

## Phase 3: Partnership Permission Editing ⭐⭐⭐ (MEDIUM - 2hr)

### 3.1 Update Partnership API
- [ ] Extend `PUT /api/communities/partnerships/[id]` to handle permission updates
- [ ] Add validation for permission changes
- [ ] Ensure proper authorization (only community admins)

### 3.2 Create Permission Edit UI
- [ ] Add "Edit Permissions" button to active partnerships
- [ ] Create modal/form for editing permissions
- [ ] Include board sharing toggle with clear description
- [ ] Handle save/cancel actions

### 3.3 Update Partnership Components
- [ ] Modify `PartnershipCard` to show edit option
- [ ] Add permission editing to partnership manager
- [ ] Update partnership display to show current permissions

**Files to Update:**
- `src/app/api/communities/partnerships/[id]/route.ts`
- `src/components/partnerships/PartnershipCard.tsx`
- `src/components/partnerships/PartnershipManager.tsx`
- Create new: `src/components/partnerships/EditPermissionsModal.tsx`

---

## Phase 4: Backend Board Resolution ⭐⭐⭐⭐ (MEDIUM-HARD - 3hr)

### 4.1 Audit Board Validation Points
- [ ] Find all "board belongs to community" checks in codebase
- [ ] Identify API endpoints that need shared board support
- [ ] Map out database queries that need extending

### 4.2 Create Shared Board Validation Utility
```typescript
// src/lib/boardValidation.ts
export async function validateBoardAccess(
  boardId: number, 
  communityId: string
): Promise<{ isOwned: boolean; isImported: boolean; isValid: boolean }>
```

### 4.3 Update Database Queries
- [ ] Extend board queries to JOIN with `imported_boards`
- [ ] Update board resolution to handle both owned and imported boards
- [ ] Ensure proper access control for imported boards

### 4.4 Update API Endpoints
- [ ] Global search API endpoints
- [ ] Post creation endpoints  
- [ ] Board metadata endpoints
- [ ] Any other endpoints that validate board ownership

**Files to Update:**
- Create: `src/lib/boardValidation.ts`
- `src/app/api/search/posts/route.ts`
- `src/app/api/posts/route.ts`
- `src/app/api/communities/[communityId]/boards/[boardId]/route.ts`
- Any other endpoints found in audit

---

## Phase 5: Socket Context Issues ⭐⭐⭐⭐⭐ (HARD - 2hr)

### 5.1 Understand Socket Community Context
- [ ] Audit how `SocketContext` determines current community
- [ ] Understand "Access denied: wrong community" error source
- [ ] Map socket event handlers that validate community access

### 5.2 Handle Shared Board Context
- [ ] Modify socket context to handle shared board scenarios
- [ ] Ensure proper community context for shared boards
- [ ] Update socket room joining logic for imported boards

### 5.3 Test Socket Functionality
- [ ] Test real-time updates in shared board context
- [ ] Verify socket connections work correctly
- [ ] Ensure no "wrong community" errors

**Files to Update:**
- `src/contexts/SocketContext.tsx`
- Potentially server-side socket handlers

---

## Phase 6: Global Search & Post Creation ⭐⭐⭐⭐⭐ (HARD - 2.5hr)

### 6.1 Update Global Search
- [ ] Modify search components to handle shared board context
- [ ] Ensure search works correctly in imported boards
- [ ] Handle routing and context preservation

### 6.2 Fix Post Creation
- [ ] Update post creation form to work with shared boards
- [ ] Handle board validation in shared board scenarios
- [ ] Ensure proper community context for new posts

### 6.3 Update Navigation & Context
- [ ] Ensure proper URL structure for shared boards
- [ ] Handle breadcrumbs and navigation context
- [ ] Update any hardcoded community assumptions

**Files to Update:**
- `src/components/search/GlobalSearchModal.tsx`
- Post creation components
- Navigation components
- Context providers that assume community ownership

---

## Testing Strategy

### Phase 1-2 Testing
- [ ] Verify UX changes look correct
- [ ] Test cache invalidation works immediately

### Phase 3 Testing  
- [ ] Test partnership permission editing
- [ ] Verify only admins can edit permissions
- [ ] Test board sharing enable/disable flow

### Phase 4-6 Testing
- [ ] Test shared board access from multiple contexts
- [ ] Verify search works in shared boards
- [ ] Test post creation in shared boards
- [ ] Verify socket connections work correctly
- [ ] Test cross-community functionality end-to-end

---

## Success Criteria

✅ **UX**: Users understand "shared boards" terminology and flow  
✅ **Functionality**: Shared boards appear immediately in sidebar after adding  
✅ **Permissions**: Admins can enable board sharing for existing partnerships  
✅ **Backend**: All validation handles both owned and imported boards  
✅ **Search**: Global search works correctly in shared board context  
✅ **Posting**: Users can create posts in shared boards  
✅ **Sockets**: Real-time updates work in shared board context  
✅ **Navigation**: Smooth navigation between communities and shared boards

---

## Implementation Order Rationale

1. **UX fixes first** - Quick wins, improve user understanding
2. **Cache fixes** - Essential for good UX, relatively simple
3. **Partnership editing** - Enables feature usage, moderate complexity
4. **Backend validation** - Core functionality, complex but contained
5. **Socket issues** - Complex, affects real-time features
6. **Search/posting** - Most complex, depends on backend validation

Each phase builds on the previous ones and can be tested independently. 