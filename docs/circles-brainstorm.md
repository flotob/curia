# MVP Implementation Roadmap: Circles Integration in Curia

**Overall Goal:** Incrementally integrate Circles.Network functionalities into the Curia plugin, starting with basic identity connection and gradually exploring economic interactions tied to Curia's content.

---

## **Phase 1: Foundation - Circles Identity & Test Page**

### **WP1.1: "Circles Tests" Page & Basic SDK Setup**
- **Goal:** Create a dedicated page within Curia for Circles experiments and allow a user to connect their wallet to initialize the Circles SDK.
- **Tasks:**
    1.  **Create New Page Component:**
        *   File: `src/app/circles-tests/page.tsx` (or similar based on routing).
        *   Basic UI: A title like "Circles Integration Tests".
    2.  **Add Sidebar Link:**
        *   Modify `src/components/layout/Sidebar.tsx` to include a new navigation item linking to this `/circles-tests` page. Choose an appropriate icon (e.g., a generic settings icon, a placeholder for a Circles icon).
    3.  **Circles SDK Installation & Context (if not already present for other features):**
        *   Ensure `@circles-sdk/sdk`, `@circles-sdk/adapter-ethers`, and `ethers` (v6) are installed (as per `o3-circles-integration.md`).
        *   Consider creating a lightweight React Context (`CirclesContext.tsx`) to hold the initialized `Sdk` instance and related state (e.g., `sdkInstance`, `isConnectedToCircles`, `userCirclesAddress`, `error`). This context provider would wrap the content of the `CirclesTestsPage` initially, and potentially more of the app later.
    4.  **"Connect Wallet & Init SDK" UI on Test Page:**
        *   Add a button: "Connect Wallet & Initialize Circles SDK".
        *   On click, this button will:
            *   Instantiate `BrowserProviderContractRunner` from `@circles-sdk/adapter-ethers`.
            *   Call `adapter.init()` (which prompts MetaMask or the browser wallet connection).
            *   If successful, instantiate `new Sdk(adapter, circlesConfig)` (using default `circlesConfig` for Gnosis Chain mainnet).
            *   Store the `sdk` instance in the `CirclesContext` (or local state on the page for this initial step).
            *   Display the connected EOA address (`adapter.address`) and a message like "Circles SDK Initialized" or any errors.
- **Acceptance Criteria:**
    *   A "Circles Tests" page is accessible from the sidebar.
    *   Users can click a button on this page to connect their Ethereum wallet (MetaMask).
    *   Upon successful wallet connection, the Circles SDK is initialized.
    *   The user's connected wallet address is displayed on the page.
    *   Connection/initialization errors are displayed.

### **WP1.2: Link Common Ground User to Circles Identity (Get/Display Circles Safe Address)**
- **Goal:** For a user whose wallet is connected and SDK initialized, retrieve their Circles Safe address and display it. Store this link in our database.
- **Tasks:**
    1.  **Fetch Circles Avatar:**
        *   After SDK initialization (from WP1.1), use `sdk.getAvatar(connectedEoaAddress)` to get the user's Circles Avatar information (which includes their Safe address).
        *   Display the user's Circles Safe address on the "Circles Tests" page (e.g., "Your Circles Safe: [address]").
        *   Handle cases where `getAvatar` might return null or throw an error (e.g., if the EOA hasn't signed up for Circles yet).
    2.  **Backend API to Store Mapping:**
        *   Create a new API route (e.g., `POST /api/user/link-circles-identity`).
        *   Input: `{ circlesSafeAddress: string }`.
        *   This endpoint should be protected by `withAuth` (so we know the Common Ground `userId` from `req.user.sub`).
        *   Logic: Update the `users` table in our PostgreSQL database, adding a new column (e.g., `circles_safe_address TEXT NULLABLE UNIQUE`) and store the provided `circlesSafeAddress` for the authenticated Curia user.
    3.  **Frontend Call to Store Mapping:**
        *   On the "Circles Tests" page, after successfully fetching the Circles Safe address, provide a button like "Link this Circles Safe to my Curia Account".
        *   On click, call the `/api/user/link-circles-identity` endpoint with the fetched Safe address.
        *   Display success/error messages for the linking process.
    4.  **Display Existing Link:**
        *   When the "Circles Tests" page loads, if the user is already authenticated in Curia, fetch their Curia user profile (which would now include `circles_safe_address` if previously linked) and display it.
        *   If a Circles Safe address is already linked, perhaps change the UI (e.g., show "Circles Account Linked: [address]" and hide the "Link..." button or change it to "Update/Relink").
- **Acceptance Criteria:**
    *   User can see their Circles Safe address on the test page if their connected wallet is a Circles user.
    *   User can click a button to associate this Circles Safe address with their Curia user profile in the database.
    *   The linked Circles Safe address is displayed on subsequent visits to the test page.
    *   Graceful handling if the EOA is not a Circles user (e.g., prompt to sign up via Circles Garden or Metri as a manual step for now).

---

*Previous Brainstorming Content (from AI analysis of o3-circles-integration.md):*

Okay, I've thoroughly studied the `docs/o3-circles-integration.md` document. It's a very detailed and insightful guide on Circles, its SDK, and how one might build a plugin around it, focusing on trust-based onboarding and a community currency.

Now, let's think about how we could potentially leverage Circles for the **existing Curia plugin** (our Next.js/Tiptap-based discussion and voting platform) or if it warrants a new, separate plugin.

**Recap of Our Existing Curia Plugin:**
*   Discussion forum/voting system (posts, comments, upvotes).
*   Organized into boards within Common Ground communities.
*   Has its own user profiles (synced from CG), posts, comments, votes tables in PostgreSQL.
*   Uses a plugin-specific JWT auth, derived from CG's user identity.
*   Focuses on information sharing, issue tracking, and community decision-making via discussions and voting.

**How Circles Could Potentially Leverage or Enhance the Curia Plugin:**

The core idea of Circles is a **Web-of-Trust-based community currency** and **Universal Basic Income (UBI)**. Value flows through social trust.

Here are several ways Circles could be integrated into or complement our existing Curia plugin, without pressure, just exploring ideas:

1.  **Rewarding Contributions & Engagement (Micro-Rewards/Tipping):**
    *   **Concept:** Users could use their personal Circles (CRC) or trusted CRC from others to reward or tip authors of valuable posts or insightful comments within Curia.
    *   **Integration:**
        *   Add a "Tip with Circles" button next to posts/comments.
        *   When clicked, it would initiate a Circles transfer (via the SDK) from the current user to the post/comment author's Circles address.
        *   The amount could be small, predefined, or user-inputted.
    *   **Value:**
        *   Encourages quality content and participation.
        *   Provides a tangible way for users to show appreciation beyond just an upvote.
        *   Introduces a micro-economy around the content generated in Curia.
        *   Leverages the UBI aspect of Circles – users have a continuously minting currency they can use for these small rewards.

2.  **Bounties for Posts/Issues:**
    *   **Concept:** Users could attach a Circles bounty to a post, especially if it's an issue, a question, or a request for help/contribution. The user who provides the accepted solution or best answer could claim the bounty.
    *   **Integration:**
        *   When creating a post, allow an option to "Add Circles Bounty" (e.g., 50 of the poster's CRC). This amount would need to be "escrowed" or "pledged" in some way (Circles itself doesn't have complex escrow in v1, so this might be a social pledge or a simple transfer to an "accepted solution" author later).
        *   The post displays the bounty.
        *   The original poster (or community mods) could mark a comment/reply as the "solution," triggering a Circles transfer to the solution provider.
    *   **Value:**
        *   Incentivizes solving problems or answering questions posted in Curia.
        *   Could be very useful for technical communities or support forums built with Curia.

3.  **Unlocking Content/Features or "Paying" for Attention:**
    *   **Concept:** Certain actions or content visibility could require a small Circles payment.
        *   Example: "Pin this post to the top of the board for X hours by paying Y CRC."
        *   Example: "Boost visibility of your feature request by staking/paying Z CRC."
    *   **Integration:** This is more complex and needs careful thought to avoid making the platform pay-to-play in a negative way. Payments could go to a community pool or be burned.
    *   **Value:** Could be a way for communities to self-fund certain platform features or for users to signal the importance of their content, using the community-generated currency.

4.  **Reputation & Trust Scores Based on Circles Activity:**
    *   **Concept:** A user's activity within the Circles network (how many people trust them, how much they transact responsibly) could contribute to a reputation score within Curia.
    *   **Integration:**
        *   Display a "Circles Trust Score" or "Circles Activity Level" on user profiles in Curia.
        *   This would require your backend to query Circles data (via SDK) about a user's trust connections or transaction history (if accessible and privacy-permitting).
    *   **Value:** Adds another dimension to user reputation beyond just post/comment history. A well-trusted Circles user might be seen as a more established community member.

5.  **Circles Onboarding as a Plugin Feature / Community Building:**
    *   **Concept:** Curia itself could become a primary place where users within a Common Ground community get onboarded onto Circles.
    *   **Integration:**
        *   Have a dedicated "Circles" section within the Curia plugin.
        *   Users can see who in their current Curia community is on Circles.
        *   Users can initiate the `sdk.signUp()` process directly from Curia.
        *   Curia could facilitate trust: "You and UserX both participate in Board Y. Would you like to trust UserX on Circles?"
    *   **Value:** This directly uses the onboarding strength of Circles. Curia becomes not just a discussion platform but also a gateway into the community's Circles economy. This could drive engagement to *both* Curia and Circles.

6.  **Gating Board Creation/Access with Circles Trust (Advanced):**
    *   **Concept:** To create a new board, or to gain access to certain "high-trust" boards in Curia, a user might need a minimum number of Circles trust connections from within that specific Common Ground community.
    *   **Integration:** Complex, as it requires cross-referencing CG community membership with Circles trust graph data.
    *   **Value:** Uses Circles' web-of-trust as a Sybil-resistance or reputation gate for certain Curia functionalities.

**Does it Make Sense for Curia, or a New Plugin?**

*   **Arguments for Integrating into Curia:**
    *   **Leverages Existing User Base & Context:** Curia already has users, posts, comments, and a community structure. Adding Circles features as enhancements (tipping, bounties) directly taps into this existing activity.
    *   **Synergy:** Discussions in Curia can lead to economic activity via Circles (e.g., a good answer gets a tip). The Circles economy can incentivize better content in Curia.
    *   **User Experience:** Users don't have to switch to a completely different plugin for these micro-economic interactions if they are related to content they are already consuming/creating in Curia.
    *   **Onboarding Power:** Curia could be a natural place to introduce community members to Circles, as it's already a hub for interaction.

*   **Arguments for a Separate "Circles Core" Plugin:**
    *   **Focus & Complexity:** Curia's primary focus is discussion/voting. Adding a full-fledged currency system could significantly increase its complexity and dilute its core purpose if not done carefully.
    *   **Circles as a Foundational Service:** Circles could be seen as a more fundamental economic layer that *multiple* CG plugins (including Curia) might want to interact with. A dedicated "Circles Wallet/Identity" plugin could manage a user's core Circles identity, balances, and trust graph, and then other plugins like Curia could integrate with *that* plugin via APIs or shared context.
    *   **Modularity:** If Circles integration is complex, keeping it separate makes both plugins easier to maintain and update independently.
    *   **User Choice:** Not all users of Curia might want to engage with Circles. A separate plugin makes it opt-in.

**Recommended Path (Exploring Without Pressure):**

Given we're "exploring without pressure," here's a potential phased approach that starts small within Curia and could lead to a more separate module if complexity grows:

1.  **MVP Integration within Curia (Lightweight):**
    *   **Focus:** Introduce the concept of Circles identity and simple tipping.
    *   **Steps:**
        *   Add a section in user profiles (within Curia) for users to optionally "Connect Circles Account" (triggering `sdk.signUp()` or linking an existing one by signing a message). Store the mapping (Curia User ID <-> Circles Safe Address) in your DB.
        *   Display a small "Tip with Circles" button on posts.
        *   Clicking it opens a simple modal: "Send X [Your Own CRC] to [Author's Circles Address]". The amount X could be fixed (e.g., 1 CRC, 5 CRC).
        *   This uses `sdk.transfer()` for a direct transfer of the tipper's *own* currency to the author (if the author has a Circles address linked). This avoids pathfinding initially but still introduces the concept.
    *   **Rationale:** This is a low-complexity entry point. It familiarizes users with Circles within a context they already use (Curia) and tests the basic SDK integration for identity and transfer. It doesn't require full trust graph visualization or pathfinding yet.

2.  **Iteration 2: Enhancing Trust and Transitive Tipping:**
    *   If the MVP is well-received, add features for users to **trust** other Curia users (who have Circles accounts) directly within Curia.
    *   Modify the tipping feature to use **transitive transfers**, allowing users to tip even if they don't directly trust the author, as long as a path exists. This makes tipping more versatile.
    *   Start displaying basic Circles trust info on Curia profiles (e.g., "Trusted by X people in this community").

3.  **Iteration 3: Bounties or More Advanced Features:**
    *   Explore the bounty system if it aligns with how Curia is used.

**Decision Point: Separate Plugin?**
*   If the Circles-related features become very rich and complex (full wallet management, detailed trust graph visualization, extensive onboarding flows independent of Curia's core content), then it might make sense to spin it out into a dedicated "Common Ground Circles Wallet" or "Community Economy" plugin.
*   Curia could then *integrate* with this dedicated Circles plugin (e.g., the "Tip" button in Curia could call an API exposed by the Circles plugin).

**Initial Exploration within Curia seems like the best first step.** It allows you to:
*   Test the waters with Circles functionality among your existing user base.
*   Leverage the social context of Curia for facilitating trust.
*   Build incrementally.

The `o3-circles-integration.md` provides an excellent technical guide for building the actual features (SDK setup, trust, transfer). The key for us now is to decide on the *scope* and *entry points* within Curia for a V1 Circles integration.

What are your thoughts on starting with a lightweight tipping/reward feature within Curia as an initial exploration? Or does another integration point feel more compelling?
