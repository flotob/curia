# Lock Management Implementation Research

## Overview

This document outlines the implementation plan for adding lock management functionality to the existing lock system. The goal is to enable users to **rename**, **delete**, and **duplicate** locks from both the lock browser and lock detail modal.

## Current System Assessment ✅ VERIFIED

### ✅ Backend Infrastructure (COMPLETE)

**Database Layer:**
- ✅ Complete `locks` table schema with all necessary fields
- ✅ Proper foreign key constraints and indexes  
- ✅ Usage tracking via `lock_stats` view
- ✅ Permission system (owner/admin access) with `canEdit`/`canDelete`
- ✅ Unique name constraints per community/user

**API Endpoints (ALL IMPLEMENTED):**
- ✅ `GET /api/locks/[lockId]` - Get individual lock details
- ✅ `PUT /api/locks/[lockId]` - Update lock (supports name, description, icon, color, gatingConfig, tags, isPublic)
- ✅ `DELETE /api/locks/[lockId]` - Delete with comprehensive usage validation
- ✅ `POST /api/locks` - Create new lock (can be reused for duplication)
- ✅ `GET /api/locks` - List locks with filtering (search, createdBy, tags, etc.)
- ✅ Complete permission checking (owner/admin authorization)
- ✅ Real-time event emission (lockUpdated, lockDeleted, newLock)
- ✅ Usage validation (prevents deletion of locks in use)
- ✅ Name uniqueness validation

### ✅ Frontend Components (BASIC STRUCTURE EXISTS)

**Existing Components:**
- ✅ `LockBrowser` - Main browsing interface with filtering/search
- ✅ `LockCard` - Individual lock display (grid/list views)
- ✅ `LockPreviewModal` - Detailed lock preview
- ✅ Permission props (`canEdit`, `canDelete`, `isOwned`) available in lock objects

**Current Data Fetching:**
- ✅ Manual `fetch()` calls with proper auth headers
- ✅ Loading states and error handling
- ✅ Basic caching via component state

### ❌ Missing Frontend Infrastructure

**UI Actions (NONE IMPLEMENTED):**
- ❌ No action buttons/menus in `LockCard`
- ❌ No management actions in `LockPreviewModal`
- ❌ No confirmation dialogs for destructive actions
- ❌ No inline rename functionality
- ❌ No duplicate workflow

**Data Management:**
- ❌ No React Query hooks for lock operations
- ❌ No optimistic updates
- ❌ Manual cache invalidation (just reloads all locks)
- ❌ No real-time updates integration

## Implementation Plan (REVISED AFTER INVESTIGATION)

### Phase 1: React Query Infrastructure

#### 1.1 Create Lock Management Hooks
**Location:** `src/hooks/useLockManagement.ts` (NEW FILE)

Since no React Query hooks exist yet, create proper data management layer:
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch, authFetchJson } from '@/utils/authFetch';

// Get all locks
export const useLocks = (filters?: LockFilters) => {
  return useQuery({
    queryKey: ['locks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.createdBy) params.append('createdBy', filters.createdBy);
      // ... other filters
      
      const response = await authFetchJson(`/api/locks?${params}`);
      return response.data;
    }
  });
};

// Rename lock mutation
export const useRenameLock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ lockId, name }: { lockId: number; name: string }) => {
      return authFetchJson(`/api/locks/${lockId}`, {
        method: 'PUT',
        body: { name }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locks'] });
    }
  });
};

// Delete lock mutation  
export const useDeleteLock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lockId: number) => {
      return authFetch(`/api/locks/${lockId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locks'] });
    }
  });
};

// Duplicate lock mutation
export const useDuplicateLock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sourceLockId: number) => {
      // Get source lock data
      const sourceLock = await authFetchJson(`/api/locks/${sourceLockId}`);
      
      // Create duplicate with modified name
      const duplicateData = {
        name: `${sourceLock.data.name} (Copy)`,
        description: sourceLock.data.description,
        icon: sourceLock.data.icon,
        color: sourceLock.data.color,
        gatingConfig: sourceLock.data.gatingConfig,
        tags: [...(sourceLock.data.tags || []), 'duplicated'],
        isPublic: false // Duplicates start as private
      };
      
      return authFetchJson('/api/locks', {
        method: 'POST',
        body: duplicateData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locks'] });
    }
  });
};
```

#### 1.2 Update LockBrowser to Use React Query
**Location:** `src/components/locks/LockBrowser.tsx`

Replace manual fetch logic with React Query hooks:
```tsx
// Replace existing useState and fetch logic with:
const { data: locks = [], isLoading, error, refetch } = useLocks(filters);
```

### Phase 2: UI Action Infrastructure

#### 2.1 LockCard Action Menu
**Location:** `src/components/locks/LockCard.tsx`

Add contextual action menu that appears on hover/click:
```tsx
// Add to LockCard component (only show for locks user can edit)
{lock.canEdit && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onRename?.(lock)}>
        <Edit2 className="h-4 w-4 mr-2" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDuplicate?.(lock)}>
        <Copy className="h-4 w-4 mr-2" />
        Duplicate
      </DropdownMenuItem>
      {lock.canDelete && (
        <DropdownMenuItem 
          onClick={() => onDelete?.(lock)}
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

#### 2.2 LockPreviewModal Action Bar
**Location:** `src/components/locks/LockPreviewModal.tsx`

Add action buttons in the modal footer:
```tsx
// Add management actions to footer
{lock?.canEdit && (
  <div className="flex items-center space-x-2">
    <Button variant="outline" size="sm" onClick={() => handleRename(lock)}>
      <Edit2 className="h-4 w-4 mr-2" />
      Rename
    </Button>
    <Button variant="outline" size="sm" onClick={() => handleDuplicate(lock)}>
      <Copy className="h-4 w-4 mr-2" />
      Duplicate
    </Button>
    {lock.canDelete && (
      <Button variant="destructive" size="sm" onClick={() => handleDelete(lock)}>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    )}
  </div>
)}
```

### Phase 3: Action Implementation

#### 3.1 Rename Functionality
**API:** ✅ Use existing `PUT /api/locks/[lockId]` endpoint (already supports name updates)

**Implementation Options:**
1. **Inline Rename (Recommended):**
   - Click rename → name becomes editable input
   - ESC to cancel, Enter to save
   - Real-time validation with existing name check
   - Optimistic updates with rollback on error

**React Query Implementation:**
```tsx
const LockManagementProvider = ({ children }) => {
  const renameMutation = useRenameLock();
  const deleteMutation = useDeleteLock();
  const duplicateMutation = useDuplicateLock();
  
  const handleRename = async (lock: LockWithStats, newName: string) => {
    try {
      await renameMutation.mutateAsync({ lockId: lock.id, name: newName.trim() });
      toast.success(`Lock renamed to "${newName}"`);
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  // Pass handlers to children
  return (
    <LockManagementContext.Provider value={{ handleRename, handleDelete, handleDuplicate }}>
      {children}
    </LockManagementContext.Provider>
  );
};
```

#### 3.2 Delete Functionality
**API:** ✅ Use existing `DELETE /api/locks/[lockId]` endpoint (already handles usage validation)

**Implementation:**
```tsx
// Confirmation dialog component
const DeleteLockDialog = ({ lock, onConfirm, onCancel }) => (
  <AlertDialog open={!!lock} onOpenChange={onCancel}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Lock</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete "{lock?.name}"? 
          This action cannot be undone.
          {lock?.usageCount > 0 && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center text-amber-800">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="font-medium">Lock is in use</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                This lock is currently used by {lock.usageCount} post(s). 
                Remove it from all posts before deleting.
              </p>
            </div>
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction 
          onClick={() => onConfirm(lock)}
          className="bg-destructive hover:bg-destructive/90"
          disabled={lock?.usageCount > 0}
        >
          Delete Lock
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
```

#### 3.3 Duplicate Functionality
**API:** ✅ Use existing `POST /api/locks` endpoint (no new endpoint needed)

**Implementation Strategy:**
1. Fetch source lock data via `GET /api/locks/[lockId]`
2. Modify name to avoid conflicts: `"Original Name (Copy)"`
3. Create new lock via `POST /api/locks` with modified data
4. Handle unique name generation client-side

**Smart Name Generation:**
```tsx
const generateUniqueName = async (baseName: string, existingLocks: LockWithStats[]) => {
  const existingNames = existingLocks.map(lock => lock.name.toLowerCase());
  
  let candidateName = `${baseName} (Copy)`;
  let counter = 1;
  
  while (existingNames.includes(candidateName.toLowerCase())) {
    candidateName = `${baseName} (Copy ${counter})`;
    counter++;
  }
  
  return candidateName;
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

## Conclusion ✅ UPDATED AFTER INVESTIGATION

The implementation is **highly feasible** with excellent backend foundation already in place. The backend APIs are 100% complete - no new endpoints needed!

### ✅ What's Already Done (Backend)
- **All CRUD endpoints** implemented with full permission system
- **Usage validation** prevents deletion of active locks
- **Real-time events** for updates
- **Name uniqueness** validation
- **Comprehensive error handling**

### 🔧 What Needs Building (Frontend Only)
1. **React Query hooks** for proper data management
2. **Action menus** in LockCard and LockPreviewModal
3. **Confirmation dialogs** for destructive actions
4. **Inline rename** functionality
5. **Smart duplicate** logic with name generation

### 📅 Revised Implementation Timeline

**Estimated Implementation Time:** 1-2 days (reduced from 2-3 days)

**Day 1: Data Layer & Core Actions**
- ✅ Create `useLockManagement.ts` hooks (2 hours)
- ✅ Update LockBrowser to use React Query (1 hour)
- ✅ Add action menus to LockCard & LockPreviewModal (2 hours)
- ✅ Implement rename functionality (2 hours)

**Day 2: Polish & Confirmation UX**
- ✅ Create delete confirmation dialog (2 hours)
- ✅ Implement duplicate functionality (2 hours)
- ✅ Add optimistic updates and loading states (2 hours)
- ✅ Testing and polish (2 hours)

### 🎯 Key Implementation Benefits
- **No backend work needed** - just UI development
- **Leverage existing infrastructure** - auth, permissions, events
- **Professional UX patterns** - React Query, optimistic updates
- **Consistent with existing codebase** - same patterns as other features

The implementation will provide a **significant UX improvement** with minimal development effort, leveraging the robust foundation that's already in place. 