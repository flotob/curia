# Infinite Scroll Implementation Specification

**Goal:** Transform our existing pagination-based feed into an infinite scroll system by upgrading the `/api/posts` endpoint and `FeedList.tsx` component.

---

## 📋 **Current Architecture Analysis**

### What We Have:
- ✅ `/api/posts` endpoint with page-based pagination (`page`, `limit` params)
- ✅ `FeedList.tsx` with traditional pagination UI (Previous/Next buttons)
- ✅ React Query setup with cache keys: `['posts', currentPage, boardId]`
- ✅ Board filtering via `boardId` parameter
- ✅ Authentication and access control integration
- ✅ Optimistic updates for voting

### What We're Upgrading:
- 🔄 **API**: Replace page-based with cursor-based pagination in existing `/api/posts`
- 🔄 **Component**: Replace pagination UI with infinite scroll in existing `FeedList.tsx`
- 🔄 **React Query**: Switch from `useQuery` to `useInfiniteQuery`

---

## 🏗️ **Implementation Strategy**

### Approach: **Direct Replacement**
Just upgrade our existing code - no feature flags, no dual modes, no complexity:

1. **API**: Modify `/api/posts` to use cursor-based pagination
2. **Component**: Transform `FeedList.tsx` to use infinite scroll
3. **Caching**: Switch React Query from `useQuery` to `useInfiniteQuery`

---

## 📦 **Phase 1: API Enhancement**

### WP1.1: Upgrade `/api/posts` to Cursor-Based Pagination

**File:** `src/app/api/posts/route.ts`

**Current Implementation:**
```typescript
const page = parseInt(searchParams.get('page') || '1', 10);
const limit = parseInt(searchParams.get('limit') || '10', 10);
const offset = (page - 1) * limit;

// Query with OFFSET
ORDER BY p.upvote_count DESC, p.created_at DESC 
LIMIT $n OFFSET $offset
```

**New Implementation:**
```typescript
const cursor = searchParams.get('cursor'); // Replace page param
const limit = parseInt(searchParams.get('limit') || '20', 10); // Increase default

// Parse cursor if provided
interface CursorData {
  upvoteCount: number;
  createdAt: string;
  postId: number;
}

function parseCursor(cursor: string): CursorData | null {
  if (!cursor) return null;
  const [upvoteCount, createdAt, postId] = cursor.split('_');
  return {
    upvoteCount: parseInt(upvoteCount),
    createdAt: createdAt,
    postId: parseInt(postId)
  };
}

function buildCursorWhere(cursor: string | null, baseWhere: string): { where: string; params: any[] } {
  if (!cursor) return { where: baseWhere, params: [] };
  
  const cursorData = parseCursor(cursor);
  if (!cursorData) return { where: baseWhere, params: [] };
  
  const cursorWhere = `${baseWhere} AND (
    p.upvote_count < $x OR 
    (p.upvote_count = $x AND p.created_at < $y) OR
    (p.upvote_count = $x AND p.created_at = $y AND p.id < $z)
  )`;
  
  return {
    where: cursorWhere,
    params: [cursorData.upvoteCount, cursorData.createdAt, cursorData.postId]
  };
}

// Enhanced query with cursor
const { where: whereClause, params: cursorParams } = buildCursorWhere(
  cursor, 
  `WHERE b.community_id = $${baseParams.length}`
);

const allParams = [...baseParams, ...cursorParams];

// Query with cursor pagination (no OFFSET needed!)
ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC
LIMIT $limit
```

**Updated Response Interface:**
```typescript
// Replace existing pagination response
interface PostsResponse {
  posts: ApiPost[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

// Generate cursor from last post
function generateNextCursor(posts: ApiPost[]): string | null {
  if (posts.length === 0) return null;
  const lastPost = posts[posts.length - 1];
  return `${lastPost.upvote_count}_${lastPost.created_at}_${lastPost.id}`;
}

// Update return statement
return NextResponse.json({
  posts,
  pagination: {
    nextCursor: posts.length === limit ? generateNextCursor(posts) : null,
    hasMore: posts.length === limit,
    limit,
  },
});
```

### WP1.2: Add Database Index Optimization

**File:** Create database migration for better cursor performance

```sql
-- Add composite index for cursor-based queries
-- This index supports: ORDER BY upvote_count DESC, created_at DESC, id DESC
CREATE INDEX CONCURRENTLY posts_cursor_pagination_idx 
ON posts (upvote_count DESC, created_at DESC, id DESC);

-- This also helps with cursor WHERE conditions
-- WHERE (upvote_count, created_at, id) < (val1, val2, val3)
```

---

## 📦 **Phase 2: Frontend Transformation**

### WP2.1: Create Infinite Scroll Hooks

**File:** `src/hooks/useInfiniteScroll.ts`

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { ApiPost } from '@/app/api/posts/route';

interface UseInfiniteScrollOptions {
  token: string | null;
  boardId?: string | null;
  enabled?: boolean;
}

interface PostsResponse {
  posts: ApiPost[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

async function fetchPostsWithCursor(
  cursor: string | null, 
  boardId: string | null, 
  token: string
): Promise<PostsResponse> {
  const params = new URLSearchParams({
    limit: '20', // Larger page size for infinite scroll
  });
  
  if (cursor) params.append('cursor', cursor);
  if (boardId) params.append('boardId', boardId);
  
  return authFetchJson<PostsResponse>(`/api/posts?${params.toString()}`, { token });
}

export function useInfiniteScroll({ token, boardId, enabled = true }: UseInfiniteScrollOptions) {
  const query = useInfiniteQuery({
    queryKey: ['posts', boardId], // Simplified cache key
    queryFn: ({ pageParam = null }) => fetchPostsWithCursor(pageParam, boardId, token!),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    enabled: enabled && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Flatten pages into single posts array
  const posts = query.data?.pages.flatMap(page => page.posts) ?? [];

  return {
    posts,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    error: query.error,
    hasMore: query.hasNextPage ?? false,
    fetchMore: query.fetchNextPage,
    refresh: query.refetch,
  };
}
```

**File:** `src/hooks/useIntersectionObserver.ts`

```typescript
import { useEffect, useRef } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useIntersectionObserver(
  callback: () => void,
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0.1, rootMargin = '100px', enabled = true } = options;
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !targetRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, [callback, threshold, rootMargin, enabled]);

  return targetRef;
}
```

### WP2.2: Transform `FeedList.tsx` to Infinite Scroll

**File:** `src/components/voting/FeedList.tsx`

```typescript
'use client';

import React from 'react';
import { PostCard } from './PostCard';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface FeedListProps {
  boardId?: string | null;
}

export const FeedList: React.FC<FeedListProps> = ({ boardId }) => {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const {
    posts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    fetchMore,
    refresh
  } = useInfiniteScroll({
    token,
    boardId,
    enabled: isAuthenticated
  });

  // Intersection observer for auto-loading more posts
  const loadMoreTrigger = useIntersectionObserver(
    () => {
      if (!isLoadingMore && hasMore) {
        fetchMore();
      }
    },
    { enabled: !isLoading && !error }
  );

  // Auth loading state
  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center py-8 sm:py-10">
        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
        <p className="ml-3 text-base sm:text-lg">Authenticating...</p>
      </div>
    );
  }
  
  // Not authenticated
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="text-center py-8 sm:py-10 text-muted-foreground px-4">
        <p className="text-sm sm:text-base">Please log in to view posts.</p>
      </div>
    );
  }

  // Initial loading
  if (isLoading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center py-8 sm:py-10">
        <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
        <p className="ml-3 text-base sm:text-lg">Loading posts...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-red-500 text-center py-8 sm:py-10 px-4 text-sm sm:text-base">
        Error loading posts: {error.message}
      </div>
    );
  }

  // Empty state
  if (!isLoading && posts.length === 0) {
    return (
      <div className="text-center py-8 sm:py-10 text-muted-foreground px-4 text-sm sm:text-base">
        No posts yet. Be the first to submit one!
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Posts List */}
      <div className="space-y-3 sm:space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} showBoardContext={!boardId} />
        ))}
      </div>

      {/* Load More Section */}
      {hasMore && (
        <div ref={loadMoreTrigger} className="py-6">
          {isLoadingMore ? (
            <div className="flex justify-center items-center">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading more posts...</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                onClick={() => fetchMore()}
                variant="outline"
                size="lg"
                className="min-h-[44px] px-8"
              >
                Load More Posts
              </Button>
            </div>
          )}
        </div>
      )}

      {/* End of Feed */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">You've reached the end!</p>
        </div>
      )}
    </div>
  );
};
```

---

## 📦 **Phase 3: React Query Integration**

### WP3.1: Update Cache Invalidation

**Files:** `src/components/voting/VoteButton.tsx`, `src/components/voting/NewPostForm.tsx`

```typescript
// Update cache invalidation for infinite queries
const queryClient = useQueryClient();

// After successful vote or new post
onSuccess: () => {
  // Invalidate infinite scroll cache
  queryClient.invalidateQueries(['posts', boardId]);
  
  // Optimistic update for infinite queries
  queryClient.setQueryData(['posts', boardId], (oldData: any) => {
    if (!oldData) return oldData;
    
    return {
      ...oldData,
      pages: oldData.pages.map((page: any) => ({
        ...page,
        posts: page.posts.map((post: any) => 
          post.id === postId 
            ? { ...post, upvote_count: newCount, user_has_upvoted: newVoteState }
            : post
        )
      }))
    };
  });
}
```

---

## 🛠️ **Implementation Checklist**

### Phase 1: API Enhancement (2-3 days)
- [ ] Modify `/api/posts` to accept `cursor` parameter instead of `page`
- [ ] Implement cursor parsing and WHERE clause generation
- [ ] Update response interface to include `nextCursor` and `hasMore`
- [ ] Add database index for cursor-based queries

### Phase 2: Frontend Transformation (3-4 days)
- [ ] Create `useInfiniteScroll` hook with React Query
- [ ] Create `useIntersectionObserver` hook
- [ ] Transform `FeedList.tsx` to use infinite scroll
- [ ] Add loading states and error handling

### Phase 3: Integration & Polish (2-3 days)
- [ ] Update cache invalidation in voting and posting components
- [ ] Add optimistic updates for infinite queries
- [ ] Test infinite scroll behavior thoroughly
- [ ] Mobile testing and polish

**Total Estimated Time: 7-10 days**

---

## 🎯 **Success Criteria**

- ✅ Smooth infinite scroll on desktop and mobile
- ✅ Fast API responses with cursor-based pagination
- ✅ All existing functionality preserved (voting, board filtering, auth)
- ✅ No performance issues or memory leaks

---

**Let's just build this thing!** 🚀 