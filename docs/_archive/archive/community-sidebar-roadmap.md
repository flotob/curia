# Roadmap: Community Sidebar Enhancement

**Goal:** Transform the sidebar into a community-centric navigation panel, visible to all users. It will display community branding, list community boards for navigation, and feature a modern, collapsible design.

---

## Phase 1: Core Sidebar Structure & Data Fetching

**Goal:** Implement the backend API to fetch boards for a community and create the basic frontend structure for the new sidebar, including fetching and displaying community information, the list of boards, and initial collapsible behavior.

**Work Packages:**

1.  **WP1.1: Create API Endpoint to Fetch Boards**
    *   **Task:** Create `src/app/api/communities/[communityId]/boards/route.ts`.
    *   **Method:** `GET`
    *   **Functionality:** 
        *   Accept `communityId` from the URL path.
        *   Query the `boards` table for all boards belonging to this `communityId` (columns: `id`, `name`, `description`).
        *   Order boards (e.g., by `name ASC`).
        *   Return an array of board objects.
    *   **Authentication:** Protect with `withAuth(..., false)` (all authenticated users can fetch boards for their community).
    *   **Testing:** Verify API responses with a valid `communityId`.

2.  **WP1.2: Update `MainLayoutWithSidebar.tsx` (Initial Setup)**
    *   **Task:** Modify `src/components/layout/MainLayoutWithSidebar.tsx`.
    *   Remove the `NEXT_PUBLIC_SUPERADMIN_ID` check. The sidebar will now be potentially visible to all users (its content will drive its utility).
    *   Fetch `communityInfo` using `useCgLib()` if not already available at this level (it might be passed down or fetched by a parent).
    *   Fetch the list of boards for the current community using a new `useQuery` hook that calls the API endpoint from WP1.1. The `communityId` for this call will come from `useAuth().user.cid` or `communityInfo.id`.
    *   Pass `communityInfo` and the fetched `boardsList` as props to the `Sidebar` component.
    *   Conditionally render the `Sidebar` only if `communityInfo` and `boardsList` are successfully loaded (and the user is authenticated, as boards are community-specific).

3.  **WP1.3: Revamp `Sidebar.tsx` - Branding Section**
    *   **Task:** Modify `src/components/layout/Sidebar.tsx`.
    *   Accept `communityInfo` (prop with `title`, `smallLogoUrl`, `headerImageUrl`) and `boardsList` (prop) .
    *   **Branding Area (Top):**
        *   Outer div with `position: relative` for the background image.
        *   Use `communityInfo.headerImageUrl` as a background (e.g., `<img>` tag, or `background-image` CSS).
        *   Apply a dark gradient overlay for text readability over the image.
        *   Display `communityInfo.smallLogoUrl` (as an `<img>`) and `communityInfo.title` prominently.
        *   Style this section attractively.

4.  **WP1.4: Revamp `Sidebar.tsx` - Board Listing Section**
    *   **Task:** Modify `src/components/layout/Sidebar.tsx`.
    *   Below the branding section, iterate over the `boardsList` prop.
    *   For each board, render a `Link` component (from `next/link`) to navigate to that board's view.
        *   **Navigation Path:** Decide on URL structure (e.g., `/feed?board=[boardId]` or `/community/[communityId]/board/[boardId]`). For simplicity, `?board=[boardId]` on the main feed page is easier to start with.
        *   Display `board.name`.
        *   Style active board link if `currentBoardId` is passed as a prop (or derived from URL query params).
    *   Include the existing "Feed" (Home) and "Debug" links, perhaps in a separate utility section or integrated thoughtfully.

5.  **WP1.5: Implement Basic Collapsible Sidebar State & Control**
    *   **Task:** Modify `Sidebar.tsx` and potentially `MainLayoutWithSidebar.tsx`.
    *   Add state for `isPinned` (default `true`) and `isHoverExpanded` (default `false`).
    *   When `isPinned` is true, sidebar has its full width.
    *   When `isPinned` is false, sidebar collapses to a narrow width (e.g., `w-16`). Content like text labels will be hidden, only icons visible.
    *   Add a pin/unpin toggle button (e.g., using a `Pin` / `PinOff` icon from Lucide) in the sidebar footer or header.
    *   Implement hover-to-expand: If `!isPinned`, hovering over the collapsed sidebar sets `isHoverExpanded = true`, expanding it temporarily. Mouse leave sets it back to `false`.
    *   Apply CSS transitions for smooth width changes.

---

## Phase 2: Feed Integration & Advanced Sidebar Features

**Goal:** Integrate board selection with the main feed, refine sidebar interactions, and add persistence for sidebar state.

**Work Packages:**

1.  **WP2.1: Update Feed Page to be Board-Aware**
    *   **Task:** Modify the main feed page component (`src/app/page.tsx` or `src/app/feed/page.tsx`).
    *   Read the active `boardId` from URL query parameters (`useSearchParams`).
    *   If a `boardId` is present, pass it to the `/api/posts` API call to fetch posts specifically for that board. (This requires `/api/posts` to be updated to filter by `board_id` if a `boardId` param is provided).
    *   If no `boardId` is in URL, fetch posts from the default board or an aggregated view (TBD, for now, can default to the first board in the list or a general community feed if `boardId` is omitted in API).

2.  **WP2.2: Update `/api/posts` GET Route for Optional `boardId` Filtering**
    *   **Task:** Modify `src/app/api/posts/route.ts`.
    *   Accept an optional `boardId` query parameter.
    *   If `boardId` is provided, add a `WHERE p.board_id = $X` condition to the SQL query (in addition to the existing `b.community_id` filter).
    *   Ensure the `totalPostsResult` query also accounts for this optional `boardId` filter.

3.  **WP2.3: Persist Sidebar Pinned State**
    *   **Task:** Use `localStorage` to save and retrieve the user's `isPinned` preference for the sidebar, so it persists across sessions.

4.  **WP2.4: Styling & UX Refinements**
    *   **Task:** Polish all animations, transitions, icon choices, and overall sidebar usability.
    *   Ensure accessibility (ARIA attributes for controls, keyboard navigation for board list).

---

## Phase 3: Future Enhancements (Ideas)

**Goal:** Explore additional valuable features for the community sidebar.

**Work Packages (Examples):**

1.  **WP3.1: Favorite/Pinned Boards by User**
2.  **WP3.2: "Create New Board" Functionality (Admin-only)**
3.  **WP3.3: Unread/New Activity Indicators for Boards**
4.  **WP3.4: Board Categories/Grouping**
5.  **WP3.5: Custom Icons per Board**
