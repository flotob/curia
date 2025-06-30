# Custom Hooks Analysis Report

## Overview
This report analyzes all custom hooks in `src/hooks/` and identifies patterns, inconsistencies, and consolidation opportunities across 20+ hooks handling data fetching, state management, and user interactions.

## 1. Similar Data Fetching Patterns

### 1.1 React Query Patterns
**Consistent Patterns:**
- Most hooks use `@tanstack/react-query` for data fetching
- Common pattern: `authFetchJson` with authentication tokens
- Standard query keys with array format: `['resource', id, filters]`

**Inconsistent Patterns:**
- **Stale time variations:** Range from 30s (`useLockUsage`) to 5min (`useImportableBoards`)
- **Refetch intervals:** Some use 20s (`useVerificationStatus`), others 30s (`useGatingRequirements`), some none
- **Error handling:** Some return errors in state, others throw exceptions

### 1.2 Manual State Management vs React Query
**Manual State Hooks:**
- `useMentionSearch` - Uses `useState` + `useCallback` for search functionality
- `useTippingEligibility` - Manual state with `useEffect` for auto-fetching
- `useFriends` - Complex manual state for CG lib integration

**React Query Hooks:**
- `useLockUsage`, `useSharedBoards`, `useLockManagement` - Standard React Query patterns

**Recommendation:** Convert manual state hooks to React Query for consistency.

### 1.3 Authentication Patterns
**Inconsistent auth handling:**
```typescript
// Pattern 1: useAuth hook
const { token } = useAuth();

// Pattern 2: Direct token parameter
{ token: token }

// Pattern 3: Manual token handling
authFetch('/api/endpoint', { token })
```

## 2. Hooks That Could Be Generalized

### 2.1 Verification Hooks Family
**Current Specialized Hooks:**
- `useUPRequirementVerification` - Universal Profile verification
- `useEthereumRequirementVerification` - Ethereum verification
- `useUpFollowerVerification` - UP social verification
- `useUpLyxBalance` - LYX balance checking

**Generalization Opportunity:**
Create `useRequirementVerification<T>(provider: T, requirements: Requirements)` with:
- Generic provider interface
- Unified verification state structure
- Common error handling patterns

### 2.2 Resource Management Hooks
**Current Pattern:**
```typescript
// useLockManagement.ts - Locks CRUD
export const useLocks = (filters) => useQuery(...)
export const useRenameLock = () => useMutation(...)
export const useDeleteLock = () => useMutation(...)

// Similar pattern could apply to other resources
```

**Generalization:**
Create `useResourceManagement<T>(resourceType)` factory returning:
- `useList(filters)` - List with filtering
- `useCreate()` - Creation mutation
- `useUpdate()` - Update mutation
- `useDelete()` - Delete mutation

### 2.3 Board Operations Family
**Current Hooks:**
- `useSharedBoards` - Imported boards
- `useShareableBoards` - Deprecated sharing
- `useImportableBoards` - Available for import
- `useImportBoard` - Import action

**Generalization:**
Create `useBoardOperations(communityId)` returning all board operations.

## 3. Reimplemented Utility Functions

### 3.1 Authentication Utilities
**Repeated Pattern:**
```typescript
// Found in multiple hooks
const { token } = useAuth();
const response = await authFetchJson(endpoint, { token });
```

**Consolidation:** Create `useAuthenticatedQuery` and `useAuthenticatedMutation` wrappers.

### 3.2 Query Key Generation
**Repeated Pattern:**
```typescript
// Different approaches to query keys
queryKey: ['locks', lockId]
queryKey: ['contextual-gating-requirements', lockId, verificationContext]
queryKey: ['imported-boards', communityId]
```

**Consolidation:** Create `createQueryKey(resource, ...identifiers)` utility.

### 3.3 Error Handling
**Inconsistent Error Handling:**
```typescript
// Pattern 1: Try-catch with state
try { /* fetch */ } catch (err) { setError(err.message) }

// Pattern 2: React Query automatic error handling
// Pattern 3: Custom error objects
```

**Consolidation:** Standardize error handling with `useErrorHandler` hook.

### 3.4 Loading State Management
**Repeated Pattern:**
```typescript
const [isLoading, setIsLoading] = useState(false);
// ... setIsLoading(true) ... setIsLoading(false)
```

Found in: `useMentionSearch`, `useTippingEligibility`, `useFriends`, `useUpLyxBalance`

### 3.5 Cache Invalidation
**Repeated Pattern:**
```typescript
// Different invalidation approaches
queryClient.invalidateQueries({ queryKey: ['resource', id] });
queryClient.setQueryData(['resource', id], newData);
```

Found in: `useSharedBoards`, `useLockManagement`, `useContextualGatingData`

## 4. React Query Usage Inconsistencies

### 4.1 Configuration Inconsistencies
| Hook | Stale Time | Refetch Interval | GC Time | Background Refetch |
|------|------------|------------------|---------|-------------------|
| `useLockUsage` | 30s | None | 5min | - |
| `useGatingRequirements` | 2min | 30s | Default | false |
| `useVerificationStatus` | 1min | 20s | Default | false |
| `useImportedBoards` | 2min | 5min | Default | false |
| `useImportableBoards` | 5min | 10min | Default | - |
| `useLocks` | 5min | None | 10min | - |

**Recommendations:**
- Standardize stale times by data volatility
- Consistent background refetch policies
- Unified GC time strategies

### 4.2 Query Key Inconsistencies
**Inconsistent Naming:**
```typescript
// Different naming conventions
['locks', lockId]
['lockUsage', lockId]  
['gating-requirements', postId]
['contextual-gating-requirements', lockId, context]
```

**Recommendations:**
- Standardize kebab-case vs camelCase
- Consistent ordering (resource, id, filters)

### 4.3 Enabled Condition Patterns
**Inconsistent Patterns:**
```typescript
// Pattern 1: Multiple conditions
enabled: !!token && !!postId

// Pattern 2: Complex conditions  
enabled: !!token && !!communityId && verificationContext.type !== 'preview'

// Pattern 3: Simple conditions
enabled: !!lockId && lockId > 0
```

### 4.4 Data Transformation Inconsistencies
**Inconsistent Response Handling:**
```typescript
// Pattern 1: Direct return
queryFn: () => authFetchJson<T>(endpoint)

// Pattern 2: Response unwrapping
queryFn: async () => {
  const response = await authFetchJson<{data: T}>(endpoint);
  return response.data;
}

// Pattern 3: Manual error checking
queryFn: async () => {
  const response = await authFetchJson<{success: boolean, data: T}>(endpoint);
  if (!response.success) throw new Error(response.error);
  return response.data;
}
```

## 5. Consolidation Recommendations

### 5.1 Create Base Hook Utilities
```typescript
// utils/hooks.ts
export const useAuthenticatedQuery = <T>(
  queryKey: QueryKey,
  endpoint: string,
  options?: QueryOptions
) => {
  const { token } = useAuth();
  return useQuery({
    queryKey,
    queryFn: () => authFetchJson<T>(endpoint, { token }),
    enabled: !!token,
    ...options
  });
};

export const useResourceCRUD = <T>(resourceName: string) => {
  // ... unified CRUD operations
};
```

### 5.2 Standardize Configuration
```typescript
// config/reactQuery.ts
export const QUERY_DEFAULTS = {
  STALE_TIMES: {
    STATIC: 5 * 60 * 1000,      // 5min - rarely changing data
    DYNAMIC: 1 * 60 * 1000,     // 1min - frequently changing
    REAL_TIME: 30 * 1000,       // 30s - real-time data
  },
  REFETCH_INTERVALS: {
    SLOW: 5 * 60 * 1000,        // 5min
    MEDIUM: 30 * 1000,          // 30s  
    FAST: 10 * 1000,            // 10s
  }
};
```

### 5.3 Create Verification Hook Factory
```typescript
// hooks/verification/useVerificationFactory.ts
export const createVerificationHook = <T>(
  provider: VerificationProvider<T>
) => {
  return (address: string | null, requirements: T) => {
    // Unified verification logic
  };
};
```

## 6. Priority Actions

### High Priority
1. **Standardize React Query configurations** - Use consistent stale times and refetch intervals
2. **Create `useAuthenticatedQuery` wrapper** - Eliminate repeated auth token handling
3. **Consolidate error handling patterns** - Unified error state management

### Medium Priority  
1. **Generalize verification hooks** - Create verification hook factory
2. **Standardize query key naming** - Consistent kebab-case format
3. **Create resource management factory** - Generalize CRUD operations

### Low Priority
1. **Convert manual state hooks to React Query** - Better caching and error handling
2. **Create query key utility functions** - Centralized key generation
3. **Standardize data transformation patterns** - Consistent response handling

## 7. Files Requiring Attention

**Immediate Refactoring:**
- `src/hooks/useMentionSearch.ts` - Convert to React Query
- `src/hooks/useTippingEligibility.ts` - Inconsistent with other hooks
- `src/hooks/useContextualGatingData.ts` - Complex, needs simplification

**Configuration Standardization:**
- `src/hooks/useGatingData.ts` - Different intervals than similar hooks
- `src/hooks/useSharedBoards.ts` - Inconsistent stale times
- `src/hooks/useLockManagement.ts` - Good pattern to replicate

**Pattern Consolidation:**
- All hooks in `src/hooks/gating/` - Need unified interface
- Verification-related hooks - Create common abstraction