# Common Ground Voting Plugin: Development Roadmap

This document outlines the development plan for the Common Ground Voting Plugin, based on the `voting-app-spec.md` and additional context provided. The goal is to create a plugin where community members can post needs/issues, upvote them, and engage in discussions, with a feature to suggest similar existing posts during creation.

## Guiding Principles & Key Decisions

*   **Authentication:** Strictly uses Common Ground's auth context via `CgPluginLib`. The existing boilerplate setup for plugin JWTs, `withAuth.ts`, and user profile sync will be leveraged.
*   **`users` Table Primary Key:** We will continue to use the Common Ground User ID (our `user_id` field, which is `cg_user_id` in some contexts) as the Primary Key for the `users` table. This is simpler and directly ties to the CG identity.
*   **Real-time Simulation:** Achieved via React Query cache invalidation and refetching for immediate UI updates on votes/posts.
*   **Qualified Posters:** The ability to post new issues/needs might be restricted to certain "qualified users." This will be addressed by potentially checking user roles from Common Ground against a configurable set of roles (via environment variables) that are allowed to post.
*   **Iterative Development:** Features will be built in phases to manage complexity.

## Phase 1: Core Backend & Data Model Extensions (Voting & Posts)

**Goal:** Extend the existing database schema to support posts, votes, and basic comments. Ensure foundational API structures are in place.

**Sub-Goals:**
1.  Finalize `users` table schema (already largely done, ensure alignment with spec's needs for `display_name`, `avatar_url`). ✔️
2.  Create `posts` table. ✔️
3.  Create `votes` table. ✔️
4.  Create a basic `comments` table. ✔️
5.  Develop initial API stubs for CRUD operations on these entities. ✔️

**Detailed Steps:**

1.  **Database Migrations:**
    *   **`users` Table Review:** ✔️ (Confirmed alignment, `created_at`/`updated_at` exist)
    *   **`posts` Table Migration (`create-posts-table`):** ✔️ (Implemented)
    *   **`votes` Table Migration (`create-votes-table`):** ✔️ (Implemented)
    *   **`comments` Table Migration (`create-comments-table`):** ✔️ (Implemented)

2.  **API Endpoint Stubs (Backend - Next.js API Routes):** ✔️ (All stubs created and auth protection reviewed/applied)
    *   `GET /api/posts`: ✔️
    *   `POST /api/posts`: ✔️
    *   `GET /api/posts/{postId}`: ✔️
    *   `POST /api/posts/{postId}/votes`: ✔️
    *   `DELETE /api/posts/{postId}/votes`: ✔️
    *   `GET /api/posts/{postId}/comments`: ✔️
    *   `POST /api/posts/{postId}/comments`: ✔️
    *   `GET /api/search/posts?query=<search_term>`: ✔️

## Phase 2: Core Voting & Post Feed Functionality

**Goal:** Implement the main feed display, post cards, and the upvoting mechanism.

**Detailed Steps:**

1.  **Implement `GET /api/posts` API Endpoint (Backend):** ✔️ (Logic implemented, reviewed, and appears complete)
    *   Fetch posts from the `posts` table. ✔️
    *   Join with `users` table to get author `name` and `profile_picture_url`. ✔️
    *   Calculate `userHasUpvoted` boolean for each post if an authenticated user ID is provided with the request. ✔️
    *   Sort posts by `upvote_count` DESC, then `created_at` DESC. ✔️
    *   Implement basic pagination. ✔️
2.  **Implement Vote API Endpoints (Backend):** (Next)
    *   **`POST /api/posts/{postId}/votes`:**
        *   Requires authenticated user (from `req.user.sub`).
        *   Insert a record into the `votes` table (`user_id`, `post_id`).
        *   Increment `upvote_count` on the corresponding `posts` table record.
        *   Increment `comment_count` on the corresponding `posts` table record when a new comment is added via its own endpoint.
        *   Handle potential unique constraint violation (user already voted) gracefully (e.g., return current state or 200 OK).
    *   **`DELETE /api/posts/{postId}/votes`:**
        *   Requires authenticated user.
        *   Delete record from `votes` table.
        *   Decrement `upvote_count` on the `posts` table record (ensure it doesn't go below 0).
3.  **Frontend Components:**
    *   **`VoteButton.tsx` (`src/components/voting/VoteButton.tsx`):**
        *   Props: `postId`, initial `upvoteCount`, initial `userHasUpvoted`, (potentially `disabled`).
        *   Uses `@tanstack/react-query`'s `useMutation` to call `POST/DELETE /api/posts/{postId}/votes`.
        *   Handles UI state (active/inactive color based on `userHasUpvoted`).
        *   On mutation success, invalidates the `['posts']` query key to trigger a feed refresh.
        *   Consider optimistic UI updates for count and button state.
    *   **`PostCard.tsx` (`src/components/voting/PostCard.tsx`):**
        *   Props: `post` object (containing all details including author info, tags, counts, `userHasUpvoted`).
        *   Displays title, content, author (name, avatar), tags, creation time (e.g., "8 hours ago" from `created_at`), upvote count, comment count.
        *   Integrates `VoteButton`.
        *   Placeholder icons for comment, share, bookmark.
    *   **`FeedList.tsx` (`src/components/voting/FeedList.tsx`):**
        *   Uses `useQuery(['posts', currentUser?.id])` to fetch data from `GET /api/posts`.
        *   Renders a list of `PostCard` components.
        *   Handles loading and error states.
4.  **Main Page (`src/app/page.tsx` or a new route like `/voting`):**
    *   Integrate `FeedList`.
    *   Ensure `AuthContext` is used to get current user status for passing to `FeedList` (for `userHasUpvoted` logic).

## Phase 3: Post Submission & "Similar Post" Suggestion

**Goal:** Allow qualified users to submit new posts, and implement the feature to suggest similar existing posts during typing.

**Detailed Steps:**

1.  **"Qualified Posters" Logic (Backend & Frontend):**
    *   Define an environment variable `NEXT_PUBLIC_POSTER_ROLE_IDS` (comma-separated role *titles* allowed to post).
    *   In `myInfo.tsx` (or a similar component that gates posting ability), fetch user roles and community roles. Compare against `NEXT_PUBLIC_POSTER_ROLE_IDS` to determine if the current user can post.
    *   The `POST /api/posts` endpoint should also re-verify this server-side using claims from the plugin JWT or by re-checking roles against the database if necessary (though JWT claim is better). For this, the `isAdmin` or a new specific `canPost` claim might need to be added to the plugin JWT if poster qualification is different from general admin.
        *   *Decision:* For MVP, let's assume any authenticated user can post. Role-based posting can be a future enhancement if needed, simplifying the JWT for now. If restriction is critical for MVP, we need to ensure the `POST /api/posts` endpoint uses `withAuth` and checks a relevant claim or re-fetches roles.
2.  **New Post Form Component (`src/components/voting/NewPostForm.tsx`):**
    *   Inputs for title, content (textarea), tags (e.g., comma-separated input, or a tag input component).
    *   Handles form state and submission.
3.  **Implement `POST /api/posts` API Endpoint (Backend):**
    *   Requires authenticated user.
    *   Takes `title`, `content`, `tags` from request body.
    *   `author_user_id` is `req.user.sub` (from JWT).
    *   Creates a new record in the `posts` table.
    *   Returns the created post or success status.
    *   After successful post creation, the client should invalidate `['posts']` query to refresh the feed.
4.  **"Similar Post" Suggestion Feature:**
    *   **API Endpoint `GET /api/search/posts?q=<query>` (Backend):**
        *   Takes a search query string `q`.
        *   Performs a simple keyword search against `posts.title` and `posts.content` (e.g., using `ILIKE '%query%'` or basic full-text search if PostgreSQL is configured for it).
        *   Returns a small list of matching/similar posts (e.g., top 3-5).
    *   **Frontend Integration in `NewPostForm.tsx`:**
        *   As the user types in the "title" or "content" field, debounce the input.
        *   After a short delay, call `GET /api/search/posts` with the typed query.
        *   Display suggested similar posts below the input fields.
        *   Each suggestion should be a link to that existing post (if a detail view exists) or clearly indicate it's an existing issue, perhaps with its current upvote count, prompting the user to "Upvote this instead?"

## Phase 4: Comments/Discussions Functionality

**Goal:** Allow users to comment on posts and view comments.

**Detailed Steps:**

1.  **Implement Comment API Endpoints (Backend):**
    *   **`GET /api/posts/{postId}/comments`:**
        *   Fetch all comments for a given `postId`, ordered by `created_at`.
        *   Join with `users` table to get author details for each comment.
        *   Handle threaded comments (fetch children for parent comments if `parent_comment_id` is used).
    *   **`POST /api/posts/{postId}/comments`:**
        *   Requires authenticated user.
        *   Takes `content` and optional `parent_comment_id` in the request body.
        *   Creates a new record in the `comments` table.
        *   Increment `comment_count` on the `posts` table record.
        *   Return the created comment or success status.
2.  **Frontend Components for Comments:**
    *   **`CommentList.tsx` (`src/components/voting/CommentList.tsx`):**
        *   Props: `postId`.
        *   Uses `useQuery` to fetch comments from `GET /api/posts/{postId}/comments`.
        *   Renders individual `CommentItem` components.
    *   **`CommentItem.tsx` (`src/components/voting/CommentItem.tsx`):**
        *   Props: `comment` object (author, content, timestamp, replies).
        *   Displays the comment.
        *   May include a "Reply" button.
    *   **`NewCommentForm.tsx` (`src/components/voting/NewCommentForm.tsx`):**
        *   Props: `postId`, `parentCommentId` (optional for replies).
        *   Form to submit a new comment.
        *   Uses `useMutation` to call `POST /api/posts/{postId}/comments`.
        *   On success, invalidates the comments query for that post.
3.  **Integrate into `PostCard.tsx` or a Post Detail View:**
    *   The comment icon on `PostCard` can now show the actual `comment_count`.
    *   Clicking it could either expand a comments section directly within/below the card or navigate to a dedicated post detail page where comments are displayed. For MVP, an inline expansion might be simpler.

## Phase 5: UI Polish, Theming, Accessibility, Roles & Permissions

**Goal:** Refine the user experience, ensure full theme support, meet accessibility standards, and implement any finer-grained role checks.

**Detailed Steps:**

1.  **UI/UX Refinements:**
    *   Implement responsive design thoroughly for all components.
    *   Add loading indicators for all data fetching and mutations.
    *   Implement error messages and toasts for API failures.
    *   Finalize styles for light/dark modes, including gradient backgrounds.
    *   Ensure smooth animations/transitions for voting and feed updates.
2.  **Advanced Theming:**
    *   Ensure `cg_bg_color` and `cg_fg_color` from iframe params are fully utilized to customize the theme beyond just light/dark mode toggle, if feasible with `shadcn/ui` CSS variable structure. (Current implementation sets `--background` and`--foreground`, might need to map to other `shadcn/ui` variables if they don't cascade properly).
3.  **Accessibility (A11y) Audit:**
    *   Thoroughly test keyboard navigation.
    *   Verify ARIA attributes and roles.
    *   Check color contrast across themes.
    *   Test with screen readers.
4.  **Role-Based Posting (If not MVP):**
    *   If posting needs to be restricted:
        *   Frontend: Conditionally render the "New Post" button/form based on user's qualification (determined by checking their CG roles against `NEXT_PUBLIC_POSTER_ROLE_IDS`).
        *   Backend (`POST /api/posts`): Re-verify user's qualification before creating a post. This might involve adding a specific claim like `canPost` to the plugin JWT or having the `withAuth` middleware (or the route handler itself) re-check roles if `NEXT_PUBLIC_POSTER_ROLE_IDS` are defined.
5.  **Documentation Updates:**
    *   Update `README.md` with final setup instructions, new environment variables, and usage guide for the voting features.
    *   Document API endpoints.

## Future Considerations (Post-MVP)

*   Notifications (e.g., when someone replies to your comment or your post gets many upvotes).
*   User profiles within the plugin (showing their posts, votes, comments).
*   More advanced search/filtering for posts (by tag, date, user).
*   Moderation tools for admins (edit/delete posts/comments).
*   Integration with Common Ground discussion threads if available.
*   Trending algorithm (beyond simple upvote count).

---
This roadmap provides a structured approach to building the voting plugin. Each phase builds upon the last, allowing for iterative development and testing.
