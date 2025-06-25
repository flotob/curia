# React Query Refresh Strategy and Improvements

This document outlines the plan to enhance data freshness in the Curia plugin by implementing periodic refresh intervals and other React Query best practices.

## 1. Audit Summary

- **Posts Feed (`useInfiniteScroll` for `queryKey: ['posts', boardId]` in `src/hooks/useInfiniteScroll.ts`):**
    - Currently uses `staleTime: 5 minutes`. No automatic background refresh.
    - Mutations (create, delete, move post, add comment) correctly invalidate `['posts']`.
- **Comment List (`CommentList.tsx` using `useQuery` for `queryKey: ['comments', postId]`):**
    - No `staleTime` or `refetchInterval` currently active (a `staleTime` is commented out).
    - Mutations (add comment, delete comment) correctly invalidate `['comments', postId]`.
- **Other Queries (`communityInfo`, `boardInfo`, `boardsList`):**
    - Generally fetched on demand or less frequently. Do not seem to require aggressive periodic refreshing.
- **Query Invalidations:**
    - Strategic invalidations upon mutations are well-implemented, ensuring data is refetched after user actions.

## 2. Plan for Periodic Refresh and Enhancements

### 2.1. Posts Feed (Main Board/Feed)

- **File:** `src/hooks/useInfiniteScroll.ts`
- **Query Key:** `['posts', boardId]`
- **Requirement:** The main posts feed should update periodically to show new posts or changes to existing posts (e.g., updated vote counts if these are part of the `ApiPost` model and can be updated by other users).
- **Proposal:**
    - Add `refetchInterval` to the `useInfiniteQuery` options.
    - **Value:** `90 * 1000` (90 seconds). This provides a reasonable balance between data freshness and API load for a feed that is central to the application.
    - **Consideration:** `refetchIntervalInBackground: false` (default). Updates while the tab is not active might be excessive for this query.
    - The existing `staleTime: 5 * 60 * 1000` (5 minutes) can remain. It will still govern refetching on remount/focus if the `refetchInterval` hasn't triggered recently, providing an additional layer of freshness.

### 2.2. Open Comment Thread

- **File:** `src/components/voting/CommentList.tsx`
- **Query Key:** `['comments', postId]`
- **Requirement:** When a user has a post's comment section open, it should update in near real-time to show new comments from other users.
- **Proposal:**
    - Add `refetchInterval` to the `useQuery` options.
    - **Value:** `45 * 1000` (45 seconds). A shorter interval is justified here as comment threads are expected to be more dynamic when actively viewed.
    - **Conditional Refetching:** The `refetchInterval` should ideally only be active when the comment section for that *specific post* is visible and the query is enabled. React Query's `enabled` option for the query itself handles whether it fetches at all. If `CommentList` is only rendered when comments are visible, `refetchInterval` will naturally only apply when the component (and thus its query) is active. If `CommentList` could be mounted but hidden, a more explicit conditional `refetchInterval: isVisible ? 45000 : false` pattern might be needed, but given current structure, this is likely handled by component mounting/unmounting.
    - `staleTime`: Can be set to a short duration, e.g., `1 * 60 * 1000` (1 minute), or left to default if `refetchInterval` is the primary mechanism for freshness when active.

### 2.3. Strategic Query Invalidations

- **Status:** Currently well-implemented.
- **Action:** Maintain the existing logic for `queryClient.invalidateQueries` in mutation `onSuccess` callbacks. This is crucial for immediate feedback after user actions.

### 2.4. Optimistic Updates (Future Enhancement)

- **Consideration:** For actions like voting on posts/comments (if implemented), creating comments, or even creating posts, implementing optimistic updates would improve perceived performance.
- **Plan:** This can be a secondary phase of improvements after establishing baseline periodic refreshes. It involves updating the local React Query cache immediately upon initiating a mutation and then reverting if the server reports an error.

### 2.5. Default React Query Behaviors

- **Status:** `refetchOnWindowFocus`, `refetchOnReconnect`, `refetchOnMount` are default behaviors.
- **Action:** Keep these enabled as they contribute significantly to data freshness when the user interacts with the application or a component mounts.

## 3. Implementation Steps (Next Actions)

1.  **Modify `src/hooks/useInfiniteScroll.ts`:**
    - Add `refetchInterval: 90000` to the `useInfiniteQuery` options for `queryKey: ['posts', boardId]`.
2.  **Modify `src/components/voting/CommentList.tsx`:**
    - Add `refetchInterval: 45000` to the `useQuery` options for `queryKey: ['comments', postId]`.
    - Optionally, set `staleTime: 60000`.
3.  **Testing:**
    - Thoroughly test the application to ensure:
        - Posts feed updates periodically.
        - Open comment threads update periodically.
        - Mutations still correctly invalidate queries and trigger immediate refetches.
        - No excessive API calls are being made.
        - UI remains responsive.
4.  **Monitor:**
    - After deployment, monitor application performance and API load to ensure the chosen intervals are sustainable and effective. Adjust if necessary.

## 4. Open Questions/Considerations

- **Vote Counts:** If post vote counts are intended to update in real-time on the feed (even without the current user voting), the `refetchInterval` on `['posts']` will handle this. Ensure the `ApiPost` model returned by `/api/posts` includes updated vote counts.
- **Backend Performance:** Ensure the backend API endpoints (`/api/posts`, `/api/posts/[postId]/comments`) are efficient and can handle the increased load from periodic refetching, especially with many concurrent users. Consider caching strategies on the backend if not already in place.
- **User Experience for Background Refreshes:** While `isFetching` is true (including for background refetches triggered by `refetchInterval`), subtle loading indicators can be helpful. `CommentList.tsx` already has a small "Syncing..." indicator. A similar, non-intrusive indicator could be considered for the main feed if background updates are noticeable. 