# Lock Management Implementation Research

## Overview

This document outlines the implementation plan for adding lock management functionality to the existing lock system. The goal is to enable users to **rename**, **delete**, and **duplicate** locks from both the lock browser and lock detail modal.

## Current System Assessment

### ✅ Excellent Foundation Already Exists

The current lock system has a robust foundation that makes this implementation straightforward:

**Database Layer:**
- ✅ Complete `locks` table schema with all necessary fields
- ✅ Proper foreign key constraints and indexes  
- ✅ Usage tracking via `lock_stats` view
- ✅ Permission system (owner/admin access)
- ✅ Unique name constraints per community/user

**API Layer:**
- ✅ `GET /api/locks/[lockId]` - Individual lock retrieval
- ✅ `PUT /api/locks/[lockId]` - Update lock (perfect for rename)
- ✅ `DELETE /api/locks/[lockId]` - Delete with usage validation
- ✅ `POST /api/locks` - Create lock (can be used for duplicate)
- ✅ Comprehensive permission checking
- ✅ Real-time event emission for updates

**Frontend Components:**
- ✅ `LockBrowser` - Main browsing interface
- ✅ `LockCard` - Individual lock display
- ✅ `LockPreviewModal` - Detailed lock preview
- ✅ Permission props (`canEdit`, `canDelete`) already available

### ❌ Missing Components

**UI Actions:**
- ❌ No action buttons/menus in `LockCard`
- ❌ No management actions in `LockPreviewModal`
- ❌ No confirmation dialogs for destructive actions
- ❌ No duplicate functionality

## Implementation Plan

### Phase 1: UI Action Infrastructure

#### 1.1 LockCard Action Menu
**Location:** `src/components/locks/LockCard.tsx`

Add contextual action menu that appears on hover/click:
```tsx
// Add to LockCard component
{lock.canEdit && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onRename(lock)}>
        <Edit2 className="h-4 w-4 mr-2" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDuplicate(lock)}>
        <Copy className="h-4 w-4 mr-2" />
        Duplicate
      </DropdownMenuItem>
      {lock.canDelete && (
        <DropdownMenuItem 
          onClick={() => onDelete(lock)}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

**Design Considerations:**
- Only show menu for locks user can edit
- Use consistent icons and terminology
- Color-code destructive actions (delete in red)
- Position menu to avoid clipping

#### 1.2 LockPreviewModal Action Bar
**Location:** `src/components/locks/LockPreviewModal.tsx`

Add action buttons in the modal footer:
```tsx
// Add to LockPreviewModal footer
<div className="flex justify-between items-center">
  <div className="text-xs text-muted-foreground">
    {/* Existing metadata */}
  </div>
  
  <div className="flex items-center space-x-2">
    {lock.canEdit && (
      <>
        <Button variant="outline" size="sm" onClick={() => onRename(lock)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Rename
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDuplicate(lock)}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </Button>
        {lock.canDelete && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(lock)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </>
    )}
    <Button onClick={onClose} variant="outline">
      Close Preview
    </Button>
  </div>
</div>
```

### Phase 2: Action Implementation

#### 2.1 Rename Functionality
**API:** Use existing `PUT /api/locks/[lockId]` endpoint

**Implementation:**
1. **Inline Rename (Preferred):**
   - Click rename → name becomes editable input
   - ESC to cancel, Enter to save
   - Real-time validation with existing name check
   - Optimistic updates with rollback on error

2. **Modal Rename (Alternative):**
   - Click rename → opens simple modal with input
   - More robust for mobile/complex scenarios

**Example Implementation:**
```tsx
const handleRename = async (lock: LockWithStats, newName: string) => {
  try {
    const response = await fetch(`/api/locks/${lock.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newName.trim() })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to rename lock');
    }
    
    // Refresh lock list
    queryClient.invalidateQueries(['locks']);
    showSuccessToast(`Lock renamed to "${newName}"`);
    
  } catch (error) {
    showErrorToast(error.message);
  }
};
```

#### 2.2 Delete Functionality
**API:** Use existing `DELETE /api/locks/[lockId]` endpoint

**Implementation:**
1. **Confirmation Dialog:**
   ```tsx
   <AlertDialog>
     <AlertDialogContent>
       <AlertDialogHeader>
         <AlertDialogTitle>Delete Lock</AlertDialogTitle>
         <AlertDialogDescription>
           Are you sure you want to delete "{lock.name}"? 
           This action cannot be undone.
           {lock.usageCount > 0 && (
             <div className="mt-2 text-amber-600">
               ⚠️ This lock is currently used by {lock.usageCount} posts.
             </div>
           )}
         </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
         <AlertDialogCancel>Cancel</AlertDialogCancel>
         <AlertDialogAction 
           onClick={() => confirmDelete(lock)}
           className="bg-destructive"
         >
           Delete Lock
         </AlertDialogAction>
       </AlertDialogFooter>
     </AlertDialogContent>
   </AlertDialog>
   ```

2. **Error Handling:**
   - Show clear error if lock is in use
   - Suggest removing from posts first
   - Provide links to posts using the lock

#### 2.3 Duplicate Functionality
**API:** Create new `POST /api/locks/[lockId]/duplicate` endpoint

**Backend Implementation:**
```typescript
// POST /api/locks/[lockId]/duplicate
async function duplicateLockHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const lockId = parseInt(params.lockId, 10);
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid;
  
  // 1. Get source lock
  const sourceLock = await query('SELECT * FROM locks WHERE id = $1', [lockId]);
  
  // 2. Check permissions (can view source lock)
  
  // 3. Generate unique name
  const baseName = `${sourceLock.name} (Copy)`;
  let finalName = baseName;
  let counter = 1;
  
  while (await nameExists(finalName, currentUserId, currentCommunityId)) {
    finalName = `${baseName} ${counter}`;
    counter++;
  }
  
  // 4. Create duplicate with new name
  const duplicateData = {
    name: finalName,
    description: sourceLock.description,
    icon: sourceLock.icon,
    color: sourceLock.color,
    gating_config: sourceLock.gating_config,
    creator_user_id: currentUserId, // New owner
    community_id: currentCommunityId,
    is_template: false, // Duplicates are not templates
    is_public: false, // Duplicates start as private
    tags: [...sourceLock.tags, 'duplicated'] // Add tag for tracking
  };
  
  // 5. Insert and return new lock
}
```

**Frontend Implementation:**
```tsx
const handleDuplicate = async (sourceLock: LockWithStats) => {
  try {
    const response = await fetch(`/api/locks/${sourceLock.id}/duplicate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    
    // Refresh and highlight new lock
    queryClient.invalidateQueries(['locks']);
    showSuccessToast(`Lock duplicated as "${result.data.name}"`);
    
    // Optional: Open rename dialog for immediate customization
    setRenameTarget(result.data);
    
  } catch (error) {
    showErrorToast(`Failed to duplicate lock: ${error.message}`);
  }
};
```

### Phase 3: User Experience Enhancements

#### 3.1 Confirmation Dialogs
Create reusable confirmation components:

**DeleteLockDialog:**
- Show lock usage statistics
- Warn about consequences
- Provide alternative actions (remove from posts first)

**RenameLockDialog:**
- Real-time name validation
- Show character limits
- Preview how name will appear

#### 3.2 Success/Error Feedback
**Toast Notifications:**
```tsx
// Success messages
"Lock renamed successfully"
"Lock duplicated as 'New Name'"
"Lock deleted successfully"

// Error messages  
"Cannot delete lock: in use by 3 posts"
"Name already exists"
"Failed to rename lock"
```

**Loading States:**
- Disable buttons during operations
- Show loading spinners
- Prevent double-clicks

#### 3.3 Real-time Updates
**React Query Integration:**
```tsx
// Invalidate and refresh after operations
queryClient.invalidateQueries(['locks']);
queryClient.invalidateQueries(['locks', lockId]);

// Optimistic updates for immediate feedback
queryClient.setQueryData(['locks'], (old) => 
  old.map(lock => lock.id === updatedLock.id ? updatedLock : lock)
);
```

### Phase 4: Permission Refinements

#### 4.1 Enhanced Permission Logic
```tsx
interface LockPermissions {
  canView: boolean;    // Can see in browser
  canEdit: boolean;    // Can rename, change settings
  canDelete: boolean;  // Can delete (only if not in use)
  canDuplicate: boolean; // Can create copies
  canShare: boolean;   // Can make public
}

const getLockPermissions = (lock: LockWithStats, user: User): LockPermissions => {
  const isOwner = lock.creatorUserId === user.userId;
  const isAdmin = user.isAdmin;
  const canAccess = isOwner || lock.isPublic || lock.isTemplate || isAdmin;
  
  return {
    canView: canAccess,
    canEdit: isOwner || isAdmin,
    canDelete: (isOwner || isAdmin) && lock.usageCount === 0,
    canDuplicate: canAccess, // Anyone who can view can duplicate
    canShare: isOwner || isAdmin
  };
};
```

#### 4.2 Contextual Actions
- **Templates:** Allow duplication but not deletion
- **Public Locks:** Allow duplication by anyone
- **In-Use Locks:** Disable deletion, show usage info
- **Admin Users:** Can manage all locks in community

## Technical Considerations

### Security
- ✅ All operations require authentication
- ✅ Permission checks at API level
- ✅ Community isolation (can't access other communities' locks)
- ✅ Owner/admin authorization for modifications

### Performance
- ✅ Real-time updates via existing event system
- ✅ Optimistic UI updates for immediate feedback
- ✅ Efficient database queries with proper indexes
- ✅ React Query caching and invalidation

### Error Handling
- ✅ Comprehensive validation at API level
- ✅ User-friendly error messages
- ✅ Graceful fallbacks for failed operations
- ✅ Proper HTTP status codes and error details

### Data Integrity
- ✅ Foreign key constraints prevent orphaned references
- ✅ Usage tracking prevents deletion of active locks
- ✅ Unique name constraints prevent conflicts
- ✅ Atomic operations with database transactions

## Implementation Priority

### High Priority (MVP)
1. **Rename in LockPreviewModal** - Most requested feature
2. **Delete with confirmation** - Basic management need
3. **Duplicate API + frontend** - Enables lock reuse

### Medium Priority (Enhancement)
1. **Rename in LockCard** - Improved convenience
2. **Batch operations** - Select multiple locks
3. **Usage visualization** - Show which posts use a lock

### Low Priority (Future)
1. **Lock versioning** - Track changes over time
2. **Lock sharing** - Share across communities
3. **Advanced permissions** - Granular access control

## Success Metrics

### User Experience
- **Reduced lock creation time** (via duplication)
- **Improved lock organization** (via renaming)
- **Cleaner lock library** (via deletion)

### Technical Performance
- **< 500ms response time** for all operations
- **Real-time updates** within 1 second
- **Zero data corruption** from concurrent operations

### Adoption
- **> 70% of active users** use management features within 30 days
- **> 50% reduction** in duplicate lock creation
- **Positive user feedback** on ease of use

## Conclusion

The implementation is highly feasible due to the excellent foundation already in place. The majority of the work involves UI enhancements and one new API endpoint (duplicate). The existing permission system, database schema, and API endpoints provide a robust base for adding these management features.

**Estimated Implementation Time:** 2-3 days
- Day 1: UI actions and rename functionality
- Day 2: Delete confirmation and duplicate API
- Day 3: Polish, testing, and documentation

The implementation will significantly improve the user experience of lock management while maintaining the security and performance characteristics of the existing system. 