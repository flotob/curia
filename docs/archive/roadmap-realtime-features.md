# Roadmap: Enhanced Real-Time Features

This document outlines planned real-time features to enhance user interactivity and engagement within the plugin.

## Phase 1: Core Real-Time UX Improvements

### 1. Intelligent React Query Invalidation
- **Goal:** Ensure the UI reflects real-time data changes (new posts, votes, comments) immediately after a user receives a notification for an event they did not initiate.
- **Mechanism:**
    - When `SocketContext.tsx` receives events like `'newPost'`, `'voteUpdate'`, `'newComment'`:
        - Check if the event was triggered by the current user (using `userId` or similar from the event payload).
        - If not, use `queryClient.invalidateQueries({ queryKey: [...] })` to invalidate the relevant React Query query keys.
- **Identified Query Keys & Invalidation Strategy:**
    - **`newPost` Event (payload includes `board_id` of the new post):**
        - Invalidate `['posts', eventPayload.board_id]`. (Invalidates the post list for the specific board where the new post was added).
        - Consider invalidating `['posts', null]` or `['posts', undefined]` if you have a global feed that should also show this new post.
    - **`voteUpdate` Event (payload includes `postId`, `board_id`, `newCount`, `userIdVoted`):**
        - Invalidate `['posts', eventPayload.board_id]`. (To refresh vote counts in the list for that board).
        - *If individual posts are fetched and cached with a key like `['post', eventPayload.postId]`, invalidate that too.*
    - **`newComment` Event (payload includes `postId`, `comment: { author_user_id, ... }`, and implicitly `board_id` from context or by fetching post details):**
        - Invalidate `['comments', eventPayload.postId]`. (Refreshes the comment list for the specific post).
        - Invalidate `['posts', board_id_of_the_post]`. (To refresh comment counts on the post if displayed in a list. `board_id_of_the_post` would need to be available or fetched, or we invalidate all `['posts', boardId]` instances if simpler, though less targeted).
- **Acceptance Criteria:**
    - User A sees User B's new post appear in their feed without manual refresh.
    - User A sees the vote count on a post update immediately after User B votes.
    - User A sees User B's new comment appear under a post without manual refresh.

### 2. Actionable Notifications: Jump to Content
- **Goal:** Allow users to click on a real-time notification (toast) to navigate directly to the relevant content.
- **Mechanism (Details Page Approach Recommended):**
    - **Prerequisite:** Ensure a route and view exist for displaying a single post's details (e.g., `/board/[boardId]/post/[postId]`). If not, this needs to be created.
    - Modify `sonner` toast configurations in `SocketContext.tsx`.
    - When a toast for `'newPost'` or `'newComment'` is generated, include an action or make the toast itself clickable.
    - The click handler will use Next.js router (`next/navigation`) to navigate to the post details page, using the `postId` from the event payload.
    - For `'newComment'`, navigate to the post and ideally scroll to/highlight the new comment.
- **Acceptance Criteria:**
    - Clicking a "new post" notification takes the user to the details view of that post.
    - Clicking a "new comment" notification takes the user to the post where the comment was made (ideally highlighting the comment).

## Phase 2: Enhanced Presence & Interaction

### 3. Online Users Sidebar (Global & Room-Specific)
- **Goal:** Display a sidebar showing (a) all users currently online in the plugin instance, and (b) users online in the specific board/room the current user is viewing.
- **Mechanism - Server (`server.ts`):**
    - **Global List:**
        - On socket connect (after auth): Add user (ID, name, avatar) to a global list of online users.
        - On socket disconnect: Remove user from the list.
        - Periodically, or on list change, broadcast the updated global online user list (or diffs) to all connected clients via a new socket event (e.g., `'globalOnlineUsersUpdate'`).
    - **Room-Specific List:**
        - When a user joins a board room (`joinBoard` event):
            - Add user to a list for that room.
            - Emit an updated user list for that specific room to all users in that room (e.g., `'roomUsersUpdate'`).
        - When a user leaves a board room or disconnects:
            - Remove user from the room list.
            - Emit an updated user list for that room.
        - The existing `'userJoinedBoard'` and `'userLeftBoard'` events can be augmented or used to feed this.
- **Mechanism - Client (`SocketContext.tsx` and new UI component):**
    - Listen for `'globalOnlineUsersUpdate'` and `'roomUsersUpdate'`.
    - Store these lists in React state (perhaps in `SocketContext` or a dedicated context/store).
    - Create a new sidebar UI component to display these two lists.
- **Acceptance Criteria:**
    - Sidebar displays a list of all authenticated users connected to the socket server.
    - Sidebar displays a separate list of users who have joined the same board room as the current user.
    - Lists update in near real-time as users connect, disconnect, or change rooms.

### 4. P2P "Pokes" (Optional Extension to Online Users Sidebar)
- **Goal:** Allow users to send a simple, ephemeral "poke" notification to another online user via the sidebar.
- **Mechanism - Server (`server.ts`):**
    - Client A sends a `'sendPoke'` event with `targetUserId` and `pokerUserName`.
    - Server looks up `targetUserId`'s current socket ID.
    - If found, server emits a `'pokeReceived'` event directly to that target socket ID with `pokerUserName`.
- **Mechanism - Client:**
    - UI in sidebar to trigger a poke on a user.
    - Listen for `'pokeReceived'` event and display a simple notification/toast (e.g., "You were poked by [UserName]!").
- **Acceptance Criteria:**
    - User A can click a "poke" button next to User B in the online list.
    - User B receives a "poke" notification from User A.
    - No data is stored in the database.

## Phase 3: Future Considerations (Beyond Immediate Scope)
- Full P2P ephemeral chat.
- Advanced typing indicators within P2P chat.
- User status (available, busy, away). 