# Roadmap: Feed Enhancements & Architecture Update

This document outlines the work packages for:
1.  Refactoring the data architecture to introduce 'Boards' and associate Posts with Communities via Boards.
2.  Enhancing the post feed with a new header, sorting, searching, filtering, and pagination within the context of the current user's community.

## Foundational Architecture Changes (Completed)

*   **Database Schema:**
    *   Added `boards` table (`id`, `community_id` FK to `communities`, `name`, `description`, timestamps).
    *   Modified `posts` table to include `board_id` (FK to `boards.id`).
*   **Backend Logic - Auto-Creation & Association:**
    *   `/api/auth/session/route.ts` now:
        *   Expects `communityId`, `communityName`, `userRoles` (IDs), and `communityRoles` (definitions with ID & title) from the client (`AuthContext.login`).
        *   Upserts community information into the `communities` table (using `communityId` as primary key and `communityName`).
        *   Upserts a default "General Discussion" board for the community if one doesn't exist.
        *   Determines admin status (`adm` JWT claim) by comparing user's role *titles* (derived from `userRoles` and `communityRoles`) against `NEXT_PUBLIC_ADMIN_ROLE_IDS`.
    *   `POST /api/posts/route.ts` now:
        *   Retrieves the user's `communityId` from their JWT (`user.cid`).
        *   Finds/creates the default board for that community.
        *   Associates the new post with this `board_id`.
*   **Backend Logic - Community-Scoped Feed:**
    *   `GET /api/posts/route.ts` now:
        *   Requires `communityId` (from JWT `user.cid`) to fetch posts.
        *   Filters posts to only show those belonging to boards within the user's current community.
        *   Pagination count (`totalPostsResult`) is also community-specific.
*   **Frontend Data Flow:**
    *   `AppInitializer.tsx` now fetches `userInfo.roles` (user's role IDs), `communityInfo.roles` (all community role definitions), and `communityInfo.title` (as `communityName`) and passes them to `AuthContext.login()`.
    *   `AuthContext.login()` forwards this data to `/api/auth/session`.

---

## Phase 1: Feed Toolbar - API Enhancements & Basic UI

**Goal:** Update the backend to support new query parameters for the community-scoped feed and create the initial frontend structure for the feed controls.

**Work Packages:**

1.  **WP1.1: Enhance `GET /api/posts` - Dynamic Sorting**
    *   **Task:** Modify `src/app/api/posts/route.ts` (ensure it operates within the already established community scope).
    *   Accept a `sortBy` query parameter (e.g., `newest`, `upvotes`, `comments`).
    *   Dynamically change the `ORDER BY` clause in the SQL query based on `sortBy`.
    *   Default to `upvotes` (or another sensible default like `newest`) if `sortBy` is not provided or invalid.
    *   **Testing:** Verify API responses with different `sortBy` values for a specific community.

2.  **WP1.2: Enhance `GET /api/posts` - Search within Community**
    *   **Task:** Modify `src/app/api/posts/route.ts`.
    *   Accept a `searchQuery` (or `q`) query parameter.
    *   Add to the `WHERE` clause (which already filters by `community_id`) conditions to search `posts.title` and `posts.content` (e.g., using `ILIKE '%searchQuery%'`).
    *   Update the `totalPostsResult` query (`SELECT COUNT(*)`) to include the search filter *and* the community filter.
    *   **Security:** Ensure proper sanitization or parameterized queries.
    *   **Testing:** Verify API responses with different search queries for a specific community.

3.  **WP1.3: (Future Placeholder) Enhance `GET /api/posts` - Tag Filtering within Community**
    *   *No change from previous roadmap, just noting it will operate within community scope.*

4.  **WP1.4: Feed Page & State Management (`src/app/page.tsx` or `src/app/feed/page.tsx`)**
    *   **Task:** Update the main feed page component.
    *   Initialize state variables for `searchTerm`, `sortBy`, `currentPage`.
    *   Fetch `communityInfo` using `useCgLib()` (needed for `FeedHeader`).
    *   The `communityId` for API calls will implicitly come from the user's JWT via `withAuth` on the backend. Ensure frontend `useQuery` doesn't redundantly pass it unless a specific override is ever needed.
    *   Set up a `useQuery` hook to fetch posts from `/api/posts`, passing `searchTerm`, `sortBy`, `currentPage` as query parameters.

5.  **WP1.5: Create `FeedHeader.tsx` Component**
    *   **Task:** Create `src/components/feed/FeedHeader.tsx`.
    *   Accept `communityInfo` as a prop.
    *   Display `communityInfo.title` and use `communityInfo.headerImageUrl` as a background image.
    *   Include placeholders for Search Input and Sort Select.
    *   **Styling:**
        *   Container div with `position: relative`.
        *   `<img>` tag for `headerImageUrl` with `object-fit: cover`, `position: absolute`, `inset-0`, `w-full`, `h-full`.
        *   Overlay div (absolute, inset-0) with a dark gradient (e.g., `bg-gradient-to-t from-black/70 via-black/50 to-transparent` or `bg-gradient-to-b from-slate-900/80 to-slate-900/20`). Adjust opacity and direction as needed for visual appeal and text readability.
        *   Community title (`<h1>` or `<h2>`) styled for visibility on the gradient.

6.  **WP1.6: Create `SearchInput.tsx` (Basic)**
    *   **Task:** Create `src/components/feed/SearchInput.tsx`.
    *   Use ShadCN `Input` with a search icon.
    *   Implement basic state and `onChange` handler. Debouncing will be added in Phase 2.
    *   Pass search term up to the parent (Feed Page).

7.  **WP1.7: Create `SortSelect.tsx` (Basic)**
    *   **Task:** Create `src/components/feed/SortSelect.tsx`.
    *   Use ShadCN `Select` with options: "Most Upvoted", "Newest", "Most Comments".
    *   Map these display names to API values (e.g., "upvotes", "newest", "comments").
    *   Pass selected sort option up to the parent (Feed Page).

8.  **WP1.8: Create `PaginationControls.tsx` (Basic)**
    *   **Task:** Create `src/components/feed/PaginationControls.tsx`.
    *   Use ShadCN `Pagination` components.
    *   Receive `currentPage`, `totalPages` from props.
    *   Handle page changes and pass them up to the parent.

## Phase 2: Frontend Interactivity & Refinements

**Goal:** Connect the UI controls to the API, implement debouncing for search, and refine the overall look and feel.

**Work Packages:**

1.  **WP2.1: Connect SearchInput to API**
    *   **Task:** In Feed Page, update `searchTerm` state from `SearchInput.tsx`.
    *   Implement debouncing for the `searchTerm` to avoid excessive API calls (e.g., using a `useDebounce` hook or `setTimeout`).
    *   `useQuery` for posts should re-fetch when debounced `searchTerm` changes.

2.  **WP2.2: Connect SortSelect to API**
    *   **Task:** In Feed Page, update `sortBy` state from `SortSelect.tsx`.
    *   `useQuery` for posts should re-fetch when `sortBy` changes.

3.  **WP2.3: Connect PaginationControls to API**
    *   **Task:** In Feed Page, update `currentPage` state from `PaginationControls.tsx`.
    *   `useQuery` for posts should re-fetch when `currentPage` changes.

4.  **WP2.4: Styling and Layout Refinements**
    *   **Task:** Polish the `FeedHeader.tsx`, controls alignment, spacing, and overall visual appeal.
    *   Ensure responsiveness.

## Phase 3: Tag Filtering (Future)

**Goal:** Implement the tag filtering functionality.

**Work Packages:**

1.  **WP3.1: Implement Tag Filtering in API**
    *   **Task:** Fully implement WP1.3 in `src/app/api/posts/route.ts`.

2.  **WP3.2: Create `TagFilter.tsx` Component**
    *   **Task:** Design and implement a UI for selecting tags (e.g., multi-select dropdown, list of checkboxes).
    *   Manage `activeTags` state in Feed Page.

3.  **WP3.3: Connect TagFilter to API**
    *   **Task:** `useQuery` for posts should re-fetch when `activeTags` change.

--- 