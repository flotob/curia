Understood. I’ll prepare a detailed implementation guide for your Cursor AI agent covering:

* How to build an in-browser, extensionless Ethereum wallet using Porto.sh that users create explicitly inside the CG plugin.
* How to integrate this Porto wallet with the Circles SDK to complete on-chain signup (Safe creation + Circles avatar registration).
* How to record newly created wallets in your PostgreSQL schema and manage a shared "waiting for trust" pool visible to all plugin users.
* How to programmatically create Circles organizations and groups via the SDK from within the plugin, and design a UI + data layer to manage that structure effectively.

I’ll include precise code snippets, database adjustments, and frontend/backend architecture suggestions.

I’ll let you know when it’s ready.


# Common Ground Plugin: Porto Wallet & Circles Integration Implementation Guide

## 1. Build an Extensionless In-Browser Wallet with Porto.sh

To onboard users without requiring browser extensions, integrate the **Porto SDK** into the Next.js Common Ground plugin. Porto allows creating a self-custodial Ethereum account entirely in the browser. Key steps for implementing the in-browser wallet:

* **Include Porto SDK:** Install Porto via npm (the package name is `porto`) and import it in the plugin. This provides the APIs to create and manage accounts.
* **User-Initiated Wallet Creation:** Add a “**Create Wallet**” button to the plugin UI (e.g. on a onboarding screen or user settings). When clicked, trigger Porto to generate a new account. For example, call `Porto.create()` to initialize a wallet instance. This will create a new Ethereum keypair (and possibly prompt the user for any necessary authentication, depending on Porto’s implementation).
* **Configure for Gnosis Chain:** Ensure the Porto wallet connects to Gnosis Chain (Chain ID 100). If using Wagmi for React integration (as Porto recommends), include the Gnosis chain in the Wagmi config. For example, import the Gnosis chain and provide an RPC URL for it. In a Wagmi setup, you might do: `createConfig({ chains: [gnosis], connectors: [porto()], ... transports: { [gnosis.id]: http(<GNOSIS_RPC_URL>) } })`. This ensures all transactions/signing use Gnosis Chain endpoints. If not using Wagmi, you can manually instruct Porto’s provider to use a Gnosis RPC (e.g., via a chain switch request or Porto SDK option).
* **Obtain an Ethers Signer:** Once the Porto wallet is created, get a signer that can be used with Ethers.js. Porto provides an EIP-1193 compatible provider (`porto.provider`). You can wrap this in an Ethers `BrowserProvider` and call `getSigner()`, similar to how one would with `window.ethereum`. For example:

  ```ts
  const porto = Porto.create();
  await porto.provider.request({ method: 'eth_requestAccounts' }); 
  const ethersProvider = new ethers.BrowserProvider(porto.provider);
  const signer = await ethersProvider.getSigner();
  ```

  This signer represents the user’s new account and will be used for blockchain interactions.
* **Persist Wallet Keys:** Implement wallet **persistence** so the user doesn’t have to create a new account each session. Porto (especially via Wagmi) can store session data automatically in `localStorage` if configured. Ensure the connector storage is set to `localStorage` or use IndexedDB for larger/structured data. If managing manually, securely store the wallet’s private key or seed phrase: for example, encrypt it with a user-provided password or device keystore and save to `indexedDB` or `localStorage`. This allows the plugin to reload the wallet on page refresh. *(Note: Emphasize security – never store the raw key unencrypted. Porto’s future WebAuthn/passkey support could be leveraged to safeguard the key in hardware.)*
* **Gnosis Chain Compatibility:** The generated wallet must be able to send transactions on Gnosis. After creation, verify the provider is set to chain ID 100. If not, explicitly request adding/switching to Gnosis chain (e.g., using `porto.provider.request({ method: 'wallet_addEthereumChain', params: [{...}] })` with Gnosis RPC details). The wallet’s address should be a valid Gnosis chain address (Ethereum-format). Test that `signer.getAddress()` returns an address and that a simple chain query (like `provider.getBalance`) works on Gnosis.
* **No Extension Needed:** All of the above happens inside the Common Ground plugin’s iframe or web context – no MetaMask or external wallet extension. The user experience is a seamless “Create Wallet” flow entirely within the app. Once completed, the user now has an Ethereum account (EOA) in the browser that can sign transactions.

By the end of this step, each user can generate and persist a Gnosis Chain wallet inside the plugin. This wallet’s **signer** will be used for all subsequent Circles interactions (including deploying a Safe and signing trust transactions), acting as the user’s identity in the Circles system.

## 2. Use the Porto Wallet to Onboard Users to Circles

With an in-browser wallet available, the next step is to register the user on **Circles** (the UBI/social-trust currency on Gnosis). We use the Circles SDK (v0.27.3) to deploy a personal Safe (avatar) and register it with the Circles Hub contract. Implementation plan:

* **Circles SDK Integration:** Add the Circles SDK package (`@circles-sdk/sdk`) to the project. Configure it with the correct network settings for Gnosis. For example, define a `chainConfig` with the Circles Hub addresses and RPC endpoints. On Gnosis mainnet (production), the config will include the Circles V1 Hub contract address (and V2 Hub if using new features). *(The Circles documentation provides example configs for Chiado testnet; use the mainnet equivalents for Gnosis chain.)*
* **Initialize SDK with Signer:** Use the Porto wallet’s ethers Signer to initialize the Circles SDK. For instance: `const sdk = new Sdk(chainConfig, signer)`. This binds the user’s wallet to the SDK, so that any Circles actions will be signed by the user. Ensure this is done **after** the user’s wallet is ready (e.g., after Create Wallet and any required user approval).
* **Register the User’s Avatar (Safe):** Invoke the Circles sign-up method to create a personal avatar for the user on Circles. In Circles v1, call `sdk.registerHuman()`. This transaction will:

  * Deploy a Gnosis Safe contract where the user’s EOA (the Porto wallet) is the owner.
  * Register the Safe as the user’s identity in the Circles Hub (so the network recognizes this Safe address as a Circles participant).
  * Optionally, mint the user’s personal Circles token (in v1, each human gets an ERC20 token for their UBI currency).

  If using Circles V2, the analogous call is `sdk.registerHumanV2(cid)` (after obtaining a profile CID for the user’s avatar metadata). For initial implementation, Circles V1 is simpler (no IPFS profile needed). The SDK will handle the Safe deployment and contract calls under the hood. This is a one-time operation – an address can only sign up once.
* **Handle Sign-Up Errors:** Be prepared to catch errors during sign-up (for example, if the user is already registered). The Circles SDK will throw if an account tries to register twice (an account can only be associated with one Circles avatar). Handle this gracefully:

  * Before calling sign-up, you can check registration status with `sdk.data.getAvatarInfo(userAddress)`. If it returns an Avatar record, the user already has a Circles Safe. In that case, skip creation and simply use the existing avatar.
  * If an error is thrown due to duplicate sign-up or other issues (like insufficient gas), catch it and display an informative message (e.g., “You are already registered in Circles” or “Failed to create Circles account – please ensure you have enough xDAI for gas”).
* **Persist Avatar (Safe) Address:** On successful sign-up, retrieve the new Safe (avatar) address. The `registerHuman()` call returns an `AvatarInterface` object representing the new user avatar. You can get the address via `avatar.address`. Save this address in the plugin’s PostgreSQL database:

  * **Users Table:** Add a column (e.g., `circles_safe_address`) to the existing `users` table to store each user’s Circles Safe. Update the current user’s record with the new Safe address (linking the Common Ground user ID to their Circles identity).
  * This persistence allows quick lookups of a user’s Circles address later (for trust relationships, balance queries, etc.). It also helps to map on-chain events back to user profiles in the UI.
* **Post-SignUp Feedback:** Inform the user that their Circles account is ready. The UI can now display their Circles avatar address (or a shortened version) and possibly their initial Circles token symbol (often the user’s name or alias is used as currency symbol in Circles v1). At this point, the user effectively has:

  * A Gnosis Safe contract (avatar) that they control via their Porto wallet signer.
  * A personal Circles currency (in v1, an ERC20 token contract specific to their Safe).
  * Registration in the Circles Hub (so others can trust them or send them Circles).
* **Graceful Duplicates and Login:** If a returning user already has a Circles Safe (stored from a previous session), ensure the frontend loads their wallet and does *not* try to sign up again. Instead, just reuse their existing `circles_safe_address` from the database. The SDK can retrieve the Avatar via `sdk.getAvatar(existingAddress)` to perform actions. This way, the flow for an existing user is simply “load wallet -> set up SDK -> ready”, skipping sign-up.

By completing this step, each user in the community now has a Circles **avatar Safe** on Gnosis chain associated with their profile. This Safe will serve as their identity for trust relations and currency balance. The system is now ready to facilitate trust connections and currency transfers using the Circles SDK, with the Porto wallet signer ensuring all actions are user-approved on-chain.

## 3. PostgreSQL Trust-Seeker Coordination Layer

Once users are signed up in Circles, they need **trust connections** to fully participate (since in Circles, one can only send currency that others trust). We implement a coordination layer to help new users get trusted by others in their Common Ground community. This involves a new database table for tracking trust requests, API endpoints, and UI components:

* **Trust Requests Table:** Define a new Postgres table (e.g., `circles_trust_requests`) to log users who are seeking trust. This table will serve as a queue or bulletin board of new members awaiting trust from peers. Proposed schema and fields:

  * `user_id` – The Common Ground user ID of the person who needs trust. (Foreign key to `users` table).
  * `circles_safe_address` – The Circles Safe address of that user (for quick reference, denormalized from the users table for convenience).
  * `community_id` – The ID of the community in which the user is seeking trust. This ensures that trust requests are scoped to each Common Ground community (so you only see requests relevant to your community).
  * `notes` – Text field for an optional message from the user requesting trust (e.g., “Hi, I’m new here, excited to join – please trust me!”). This lets users personalize their request or provide context.
  * `status` – Status of the request (e.g., `'pending'` for active requests, `'fulfilled'` or `'trusted'` once the user has received sufficient trust, `'revoked'` if the request was cancelled or removed).
  * `created_at` – Timestamp when the request was created (for sorting and freshness).

  Example creation SQL (illustrative):

  ```sql
  CREATE TABLE circles_trust_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    circles_safe_address TEXT,
    community_id INTEGER,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

  Index the table on `community_id` and perhaps `status` for efficient querying of active requests per community.
* **Creating Trust Requests:** Insert a row into `circles_trust_requests` whenever a user finishes Circles sign-up. This can be done automatically as part of the sign-up API flow. For example, after storing the user’s Safe address, create a new trust request entry with status `'pending'`. This flags the user as waiting for trust. If you want to require an explicit action, you could instead trigger this when the user clicks a “Request Trust” button after sign-up, but auto-creation is seamless. Include any note the user provided (you might let them write a short intro message during onboarding).
* **Listing Trust-Seekers (UI):** Build a UI component (accessible to community members, possibly in a “Circles” panel or sidebar) that lists all **pending trust requests** in the user’s community. For each entry:

  * Show the user’s display name (retrieved via join on `user_id` to the users table) and possibly their avatar or profile picture for recognition.
  * Show the user’s Circles address (perhaps abbreviated) and the time since they joined (using `created_at`).
  * If a note was provided, display it under their name (this personal touch can encourage trust).
  * A prominent **“Trust this user”** action button next to each entry.
  * Consider highlighting or sorting new requests (e.g., the most recent, or those with no trusts yet) to draw attention.
* **Trust Action Workflow:** When a community member clicks “Trust this user” for a given request:

  1. **Verification**: Ensure the current user is themselves a Circles participant (i.e., they have a wallet and a Circles Safe). If not, prompt them to create a wallet and sign up first, since only a registered Circles avatar can form trust connections.
  2. **Circles SDK Trust Call**: Use the current user’s SDK/Avatar to initiate a trust transaction. The Circles SDK `Avatar` object provides a `.trust(address)` method to trust another avatar. Under the hood, this will call the Circles Hub contract’s `trust` function to establish a one-way trust link from the current user’s Safe to the new user’s Safe. Invoke this as an on-chain action:

     ```ts
     const currentAvatar = await sdk.getAvatar(currentUserSafe);
     await currentAvatar.trust(targetUserSafe);  // targetUserSafe is the address from the trust request
     ```

     The user will sign this transaction with their Porto wallet (prompting confirmation). On success, the blockchain now records that “User A trusts User B.”
  3. **UI Update & Error Handling**: Optimistically update the UI to reflect the trust. For example, disable or remove the “Trust” button for that entry (since this particular user has now trusted them). If the trust transaction fails (or is reverted because the trust already exists), catch the error and show a message (e.g., “Could not trust user – perhaps you already trust them or have insufficient funds”). The Circles protocol typically prevents duplicate trusts; one cannot trust the same person twice, so your UI should ideally hide or disable the button if `currentUser` already trusts `targetUser`.
  4. **Marking Request Fulfilled**: Decide when to mark the trust request as resolved. **Option A:** As soon as *one* person trusts the new user, you could remove them from the “waiting” list (status = `'fulfilled'`). This would mean they are no longer completely untrusted. **Option B:** require multiple trust connections (e.g., 3 people) before considering the request fulfilled. In that case, you’d track how many distinct users have trusted the new user (which you can monitor via events or a trust relations table) and only close the request when a threshold is met. For simplicity, you might start with Option A (first trust fulfills the request) – it’s a clear signal the user is not isolated anymore. Whichever approach, implement the logic in the backend:

     * If fulfilled: update `circles_trust_requests.status` to `'fulfilled'` (or simply delete the row) once the condition is satisfied.
     * This can be done in real-time by listening for the trust transaction to confirm, or via a background sync that checks trust connections (see section 5 on caching).
* **API Endpoints:** Provide REST/GraphQL API endpoints for managing trust requests:

  * `POST /api/circles/trust_requests`: Creates a new trust request. Called after sign-up (with the current user’s ID and safe address, plus an optional note).
  * `GET /api/circles/trust_requests?community=<id>`: Retrieves pending trust requests for a community (for populating the list).
  * `POST /api/circles/trust_requests/<request_id>/trust`: Endpoint to initiate a trust action for a given request (if you prefer doing the trust server-side via a relayer, though the simpler pattern is to handle it on the client as described).
  * `DELETE /api/circles/trust_requests/<request_id>` or `PATCH /api/circles/trust_requests/<id>` with status: Allows revoking or cancelling a trust request. For example:

    * If a user leaves the community or no longer wants to participate, an admin or the user can remove their request (set status to `'revoked'` or delete it).
    * If an admin feels a request is inappropriate (spam, etc.), they can remove it.
  * Ensure these endpoints have proper authorization (e.g., only the request owner or admins can revoke, only logged-in users can create a request for themselves).
* **Encouraging Reciprocal Trust:** While not explicitly required, the UI could also allow the new user to **trust others back**. Trust in Circles is one-directional, but mutual trust is beneficial. For example, once User A trusts new User B, maybe prompt User B (the new user) to also trust User A (this can help integrate them into the network). This can be a future improvement: for now, the focus is on getting others to trust the newcomer so the newcomer’s currency is accepted.

By implementing this coordination layer, new community members can smoothly bootstrap their Circles connections. The **trust request board** creates social visibility: existing members see who’s new and can welcome them by trusting them (essentially vouching for them economically). This structure also helps avoid “stranded” users by actively prompting the community to include them. All the data is stored in Postgres for persistence and easy querying, while actual trust actions are confirmed on-chain via the Circles smart contracts.

## 4. Programmatic Creation of Circles Organizations and Groups

In addition to individual user accounts, Circles supports **organizational avatars** and **group avatars** – these allow communities and sub-groups to have their own Circles Safe accounts and currencies. We will enable plugin admins to create a Circles organization for their Common Ground community, and groups under that organization. These entities will be stored in new database tables and managed via the SDK:

* **Database Schema for Orgs & Groups:** Introduce two new tables, e.g. `circles_organizations` and `circles_groups`, to store metadata:

  * **`circles_organizations`:** represents a Circles organizational avatar (usually one per community).

    * `org_id` (PK)
    * `community_id` – links to the Common Ground community this org belongs to.
    * `org_name` – a friendly name for the organization (e.g., the community name or any label the admin chooses).
    * `org_safe_address` – the Gnosis Safe address of the organization’s Circles avatar.
    * `org_token_address` (optional) – the ERC-20 token contract address for the org’s currency (if using Circles v1). In Circles v2, this might be an ERC-1155 token ID or similar concept for the org’s token, but for simplicity you can omit or repurpose this field later. It’s useful to store if available, since the org can also have a token like any avatar.
    * `created_at` – timestamp.
  * **`circles_groups`:** represents group avatars (could be multiple per org/community).

    * `group_id` (PK)
    * `org_id` – foreign key reference to the parent `circles_organizations`.
    * `group_name` – name of the group (e.g., “Project Alpha” or “Local Circle”).
    * `group_symbol` – shorthand or currency symbol for the group’s token (e.g., “ALPHA”).
    * `group_safe_address` – the Safe address of this group avatar.
    * `group_token` – token contract or identifier for the group’s currency (if available; e.g., an ERC-20 address for v1 or an ERC-1155 ID for v2). This helps track balances of the group’s token.
    * `created_at` – timestamp.
    * (Optional) `metadata_cid` – if Circles v2, you might store the IPFS CID of the group’s profile (containing description, image, etc.). This can be fetched via the Circles profile service.
* **Creating an Organization Avatar:** Allow a plugin admin to create a Circles organization for their community (likely one org per community to serve as an umbrella account/treasury).

  * **Admin UI:** In the plugin settings or an admin-only section, provide a “**Create Community Organization**” button (shown if no org exists yet for that community). You might auto-fill the org name with the community’s name, and allow the admin to adjust it or add an image (if supporting profile metadata).
  * **Circles SDK Call:** Use the Circles SDK via the admin’s signer to register an organization avatar. For Circles v1, call `sdk.registerOrganization()`. For v2, the method is `sdk.registerOrganizationV2(cid)` (after preparing a profile). The admin’s Porto wallet will sign the transaction, and the result will be a new Safe contract for the organization. The admin’s address will be the owner of this Safe by default (since they initiated it).

    * Just like a human sign-up, this Safe is deployed and registered, but marked as an **Organization** type in Circles. (Organizations do not receive UBI minting, but they can hold and transfer tokens and be trusted/untrusted like any avatar).
    * Capture the returned Avatar’s address (`orgSafeAddress`) and any token address (Circles v1 will create a token contract for the org as issuer). Save these in the `circles_organizations` table along with the community ID and chosen name.
    * After creation, the community now has an organizational Circles account – essentially a communal wallet. This could be used as a community fund or hub for trust routing.
  * **Permissions:** Only allow community administrators (or authorized roles) to create an org. It’s a one-time action – once an org exists, typically you wouldn’t create another for the same community.
  * **Multi-Owner Consideration:** Initially, the org Safe has the admin as the sole owner (threshold 1). If desired, the admin can later add additional owners to the Safe (for example, other community leaders) via Gnosis Safe mechanisms. This would decentralize control of the org funds. (This can be done outside the plugin using the Safe’s interface, or via a Safe SDK transaction – an advanced task beyond initial scope).
* **Creating Circles Groups:** Groups are sub-avatars that can represent teams, projects, or sub-communities within the main community/org. We leverage Circles V2 for group creation (as v1 does not have a group concept).

  * **Admin UI for Groups:** Once an organization exists, provide admin options to create one or more **Groups** under it. For example, an admin can input a group name and (optionally) a token symbol or description, then click “Create Group”.
  * **Circles Group Contract:** Circles v2 introduces a group avatar abstraction. The SDK provides `registerGroupV2(mintPolicyAddress, profile)` to create a group. Implementation:

    * **Mint Policy:** Determine the **mint policy contract address** for groups on Gnosis. Circles has a standard minting policy (contract) that defines how group currency can be issued. For Gnosis mainnet, use the standard policy provided by Circles (e.g., `0x5Ea08c967C69255d82a4d26e36823a720E7D0317` as the “StandardMintPolicy” on Gnosis).
    * **Group Profile Metadata:** Prepare a `GroupProfile` object for the new group. This includes the group’s name, token symbol, and possibly description and image URLs. If available, use the Circles Profiles SDK to upload this metadata to IPFS and obtain a CID (content ID). The `@circles-sdk/profiles` package can validate and send this profile data. Ensure the name is <= 36 chars, description <= 500 chars, image size <= 150KB as per Circles profile limits.
    * **SDK call:** Invoke the group registration:

      ```ts
      const groupAvatar = await sdk.registerGroupV2(mintPolicyAddress, groupProfile);
      ```

      This will deploy a new Safe contract for the group (similar to human/org avatars) and set up its token according to the mint policy. The returned `groupAvatar` contains details of the new group (address, etc.). Log the resulting Safe address.
    * **Assign Ownership:** By default, the account calling `registerGroupV2` becomes the owner of the group Safe. If the admin initiated it with their personal wallet, they are the initial controller. If the intention is to tie the group to the organization, you could later transfer ownership or add the org Safe as an owner of the group Safe. (This is an advanced step not directly supported by a single SDK call – it would require using the Safe’s API to add an owner. For now, the admin can manage the group’s Safe on behalf of the org.)
    * **Store in DB:** Save the new group in `circles_groups` table:

      * Link it to the `org_id` of the parent community org.
      * Set `group_name` and `group_symbol` from the input.
      * Store the `group_safe_address`. If the Circles SDK provides a token identifier or address for the group’s currency, store that in `group_token`. For Circles v2, each avatar (whether human, org, or group) is represented by a unique token (often an ERC1155 token ID) on the hub – the `AvatarInterface` or AvatarInfo may contain a token ID or address. Record what is available so you can reference balances later.
  * **Viewing Groups and Members:** Once groups are created, provide UI to list them and inspect their details:

    * List all groups for the community under the org (maybe in an admin dashboard or a public community page if desired). Display the `group_name`, token symbol, and possibly the Safe address (shortened).
    * Allow clicking on a group to view its “members” and statistics. **Group members** could be defined in various ways; a straightforward approach is to treat any user who interacts with the group’s currency as a member. However, a more explicit approach is to have an **off-chain membership list** or to use trust relationships:

      * You could create a join table `circles_group_members(user_id, group_id)` when adding members manually. But leveraging Circles trust is more decentralized: for example, consider a user a member if **mutual trust** exists between the user’s avatar and the group’s avatar. In practice, to add a member to a group:

        * The group admin (who controls the group Safe) can trust the user’s Safe (meaning the group accepts that user’s personal currency).
        * The user can trust the group’s Safe (meaning the user is willing to hold/accept the group’s currency).
        * Once both trusts are in place, the user is effectively part of the group’s trust network (they can send and receive the group token).
      * Implement a process for this: the admin UI could have a control to “Add user to group” which triggers the above two trust actions. The user would need to confirm trusting the group (or this could be implied if they join knowingly), and the admin (as group Safe owner) would execute a trust from the group side. (Executing a trust from a Safe might require using the Safe transaction API, since the group Safe itself must call the hub. Initially, you might skip the group->user trust for simplicity, or handle it if the admin’s EOA is also the group Safe owner by directly calling with that same signer).
      * For now, if manual membership management is complex, you could treat **any user who trusts the group** as a member. That means if a user opts into the group’s currency (trusts the group), include them in the list of members.
    * **Balances:** For each group, display relevant balances:

      * The group’s own token supply or balance information. For instance, how much of the group’s token has been minted or is held by the group Safe.
      * Each member’s balance of the group’s token. If the group token is freely mintable (via the mint policy), members might have certain allocations. The plugin can query the Circles data (or use `sdk.data`) to get how much of `group_token` each member Safe holds.
      * Also possibly show the group Safe’s balances of members’ personal tokens (if group has been receiving contributions from members). This gives an idea of how much value the group has collected from members.
      * All these can be cached in the database for quick display (see section 5). For example, a table of `circles_balances(user_safe, token, amount)` that can store the holdings periodically synced from chain.
    * Ensure normal users (non-admins) can at least view group info and their own balances, but only admins can create or configure groups.
* **Organization Fees (Community Treasury):** The organization account can act as a **community treasury or hub**. We want it to potentially receive fees or donations from member interactions:

  * **Trust Routing:** By positioning the organization in the trust graph between members, it can naturally facilitate routing of transactions. For example, if every member trusts the org and the org trusts every member, any transfer between two members could be routed via the org if direct trust is missing. While the Circles protocol doesn’t automatically deduct fees for hops, this structure means the org Safe might accumulate some balances simply by being a highly connected node (members may route payments through it and could leave some tokens with it).
  * **Fee Configuration:** In the plugin, allow admins to set a **fee percentage** that the organization should receive from group transactions or community trades. E.g., an admin might set a 2% fee on transfers. Enforcing this requires custom logic: one approach is to intercept or wrap transfers made through the plugin. For instance, if member A is paying member B 100 Circles, the plugin could split the transfer: send 98 directly to B and 2 to the org Safe (assuming A has trust to org and org to B). This effectively “tips” the org on each transfer. Implementing such logic can be complex and might not cover all scenarios (users could still transact outside the plugin without fees), but as a guided practice within the plugin it’s doable.
  * **Direct Tips:** A simpler alternative (or addition) is to encourage **direct tipping** or contributions to the organization. Provide a UI button like “Tip the Community Fund” which allows any user to transfer some of their balance to the org Safe. This uses a standard Circles transfer (`avatar.transfer(orgAddress, amount)`).
  * **Storing Fee Config:** Add a field in `circles_organizations` table for `fee_percent` (numeric). Admins can update this via an API or settings UI. The plugin, when facilitating transfers or other transactions, can read this setting and apply the fee policy.
  * **Transparency:** Show the organization’s balance on the community page (how much value it holds) and perhaps how it’s intended to be used (for community projects, etc.), to incentivize members to trust and use it.

Putting it together, by programmatically creating an **organization avatar** for each community and enabling **group avatars**, we give communities structured ways to organize economic activity:

* The **organization Safe** can serve as a central account (e.g., a community treasury or a local business in Circles context).
* **Groups** allow segmentation – e.g., subgroups of users with their own token (perhaps representing local trust circles or projects) that still tie into the community’s org (the org could be the one that sets up these groups and potentially receives a share of their activity).
* All orgs and groups are real on-chain entities (Safes) created via the Circles SDK, and their metadata is stored in our DB for quick reference and UI display. Admins have full control to create and manage these without leaving the Common Ground app.

## 5. UI and Data Caching via Postgres

To provide a smooth, **real-time experience** of Circles within the plugin, we will use the PostgreSQL database as a caching layer for on-chain data and implement intuitive UI elements. Key considerations:

* **Address-to-User Mapping:** Maintain an up-to-date mapping of Circles addresses to Common Ground user IDs in the database. This is largely handled by storing each user’s `circles_safe_address` in the users table (from step 2). Additionally, for any orgs or groups we create, store their addresses in `circles_organizations` and `circles_groups` tables along with human-readable names. This mapping lets us translate blockchain events (which involve only addresses) into user or group names in the UI. For example, if we receive an event that `0xABC... trusted 0xDEF...`, we can look up those addresses in our tables and display “Alice trusted Bob” in the context of the community.

* **Caching Circles Data:** Periodically synchronize important Circles data to the database. This could be done with a scheduled job (e.g., every 30 seconds or a minute) or via event subscriptions if available. Two main categories to sync:

  * **Trust Relationships:** Query the Circles indexer or use the SDK’s data interface to get current trust connections among our community’s users. For instance, the Circles SDK provides `CirclesData` queries or you can listen to Trust events on the hub contract. You might create a table `circles_trust_relations(truster_safe, trustee_safe, created_at)` to store known trust links. On each sync, fetch any new trust events (filtering by our known addresses if possible) and update the table. This allows generating views like “who trusts this user” and helps decide when to mark trust requests fulfilled. It also means we can quickly answer queries like “does User X already trust User Y?” from the database instead of always calling the chain.
  * **Balances:** Fetch Circles balances for users, orgs, and groups. Circles balances can mean:

    * *Personal token balances:* How much of each user’s own token is held or remaining. (In Circles, each human has a personal currency. It might be useful to show a user how much of their own coins they’ve issued vs how much remain mintable if there’s a cap.)
    * *Trust balance (spending power):* Circles is trust-based, so a user’s effective spending power depends on who trusts them and how much. You might use the `Avatar.getMaxTransferableAmount(to)` method for specific pairs, but for a general display, you could show total incoming trust connections (count or sum if trust had weights).
    * *Group token balances:* For each group, how much of the group’s currency each member holds, and how much is in the group’s Safe. For example, if group “Alpha” has a token and Alice holds 50 Alpha, Bob holds 20 Alpha, and the org Safe holds 100 Alpha, you’d sync those amounts. The Circles indexer (Pathfinder) can likely provide token holder balances for the ERC20/ERC1155 tokens. You could also use `sdk.data.getTokenBalances(avatarAddress)` to get what tokens an avatar holds.
    * *Organization holdings:* The org Safe might accumulate various tokens (personal tokens of members, group tokens, etc.). Summarize this as well – e.g., the org’s total “portfolio” in Circles value.
  * **Sync Strategy:** Use a combination of on-chain event logs and RPC queries. For trust relations, subscribe to the `Trust` event on the Circles Hub (as shown in some example code) or poll the SDK’s events API. For balances, a straightforward approach is to periodically iterate over each known avatar in the community and query their balances via SDK or a subgraph. (Be mindful of rate limits; if the community grows large, an indexer API is preferred over individual calls).
  * **Caching Duration:** Having the DB cache updated every \~30 seconds is usually sufficient to feel “near real-time” for users. Optionally, implement a webhook or socket from the indexer if available – e.g., if the Circles indexer can call a webhook when a new trust or transfer occurs involving one of our community addresses, use that to instantly update records.

* **Real-Time UI Updates:** To make the UI dynamic:

  * Consider using WebSockets or Server-Sent Events to push updates to the front-end when relevant data changes. For example, if someone trusts a new user (and we log that in the DB), broadcast an update so that the new user’s trust request disappears (or changes status) on everyone’s screen without a full page reload.
  * Similarly, if a new user signs up and a trust request is created, broadcast to others in the community that a new trust-seeker has appeared in the list.
  * A simpler approach if not using sockets is to have the front-end poll the API for changes every N seconds, but push is more efficient and real-time.

* **Intuitive UI/UX:**

  * **Highlight New Users:** Emphasize users who *need* trust. For instance, you could show a banner “🌟 3 new members joined and await your trust” with a link to the trust list. In the list, you might highlight those with no trusts yet or those who joined in the last day.
  * **Org/Group Hierarchy Display:** Present the relationship between the community org and groups in a clear way. For example, on a “Community Circles” page:

    * Show the **Community Organization** at the top (with name and maybe a badge indicating it’s an org). Display its Circles address and current balance (sum of all tokens it holds, or at least its own token if any).
    * Under that, list **Groups** as sub-sections. Each group entry shows the group name, token symbol, and could show stats like “X members” and “Total group tokens in circulation”. This conveys the structure: the org is parent, groups are child entities.
    * Clicking a group reveals its member list and detailed balances (as discussed: who the members are and how much group currency each has, etc.).
    * You could use collapsible panels or tabs for each group.
    * Include actions inline: e.g., next to each member in a group, an admin might see an “Remove member” (which could trigger an untrust from the group or removal from internal list), or a user might see whether they trust each other member.
  * **Inline Trust Actions:** Make it easy to form connections wherever a user’s name appears. For instance:

    * On a member’s profile card or list entry, if the current user hasn’t trusted them yet, show a small “Trust” icon/button. Conversely, if already trusted, maybe a checkmark or an “Untrust” option if needed. This encourages the growth of the trust network organically.
    * Similarly, for groups: if a user is viewing a group and is not yet trusting that group, offer a “Join Group (trust group’s currency)” button. And if they have joined, maybe allow “Leave group (untrust)” if desired.
    * These inline actions mean the user doesn’t have to navigate specifically to the trust request list to build connections; they can do it in context (e.g., trust someone after reading their intro post, etc., if the plugin surfaces those).

* **Cache Invalidation & Consistency:** Decide on a strategy for keeping the cache in sync:

  * If using polling, simply refresh the cache at intervals (this may momentarily show stale data between intervals, but acceptable if short).
  * When the plugin itself causes a state change (e.g., user trusts someone via our UI), we can immediately update the DB (optimistic update) instead of waiting for the next poll.
  * If a user performs an action outside our plugin (unlikely in this context, but possible via another Circles interface), our polling or indexer events will catch it within a short time and update.
  * Provide a manual refresh option in the UI as well (e.g., a “Refresh” button on the Circles dashboard) for users who want to fetch the latest state on demand.

* **Overall User Flow:** Now the entire flow is contained within the Common Ground plugin:

  1. **Onboarding:** User creates a wallet (Porto) and clicks “Sign Up to Circles”. The plugin deploys their Safe and registers them – all in-app. A trust request is automatically posted for them.
  2. **Trust Building:** Existing members see the newcomer in the trust list and can trust them with one click. The newcomer starts getting connections. The UI updates to reflect who’s trusted them. The newcomer can also reciprocate trust or trust others from the same interface.
  3. **Community Structures:** The user might also see that their community has an organization account (perhaps labeled with the community name) and maybe groups they can join. For example, an “Artisans Group” exists – they can choose to join (which triggers trust to that group’s token). All of this happens without any browser extensions or external dApps.
  4. **Transacting:** With trust links established, users can start transacting Circles (transfers, etc.) directly in the plugin (though implementing transfers was not explicitly detailed in the scope, the groundwork is laid: they have avatars and trust relationships, so a simple transfer UI could be added to send Circles to others).
  5. **Feedback & Activity:** The plugin’s UI can show a live feed of Circles activity in the community – e.g., “Alice trusted Bob (5m ago)”, “Carol joined the community – needs trust”, “Dave sent 10 tokens to Group Alpha”. This makes the system feel alive and integrated into the social context of the community.

* **Passkey Compatibility:** As a final note, ensure the architecture is **future-proof** for passkeys and advanced security. The in-browser wallet we set up with Porto should work with WebAuthn in the future. Porto’s roadmap or similar solutions might allow storing the private key in a hardware-backed credential (so the user can use biometrics or device PIN to unlock it, rather than a plaintext localStorage item). Our implementation should be ready to adopt that:

  * For instance, if Porto allows `Porto.create({ auth: "webauthn" })` in the future, we can plug that in to enhance key security.
  * Meanwhile, clearly communicate to users how their key is stored and encourage them to save backup phrases if provided.
  * Being “passkey-compatible” means when the capability is available, users could secure their wallet with a platform authenticator (for now, just keep code modular enough to swap the storage mechanism).

In summary, the plugin uses Postgres to maintain a **local mirror** of the Circles state relevant to the community, enabling rich UI features like user-friendly names, quick lookups, and notifications. All interactions (wallet creation, safe deployment, trust links, group creation) happen **within the plugin’s context** – the user never has to go to an external wallet or website. Communities can self-organize economically: onboarding members into Circles, establishing trust, forming groups, and managing a community fund, all through an intuitive interface. By following this guide, the Common Ground Curia plugin will provide a zero-extension, seamless Circles experience that lowers the barrier for users to join and participate in the network’s social economy.

**Sources:**

* Porto SDK Documentation – *Getting Started* (in-browser wallet setup and usage with Wagmi)
* Circles SDK Documentation – *Initialization and Sign-Up* (registering human and organization avatars)
* Circles SDK Documentation – *Avatar Trust Method* (trusting another avatar on-chain)
* Circles Developer Docs – *Group Avatar Creation* (parameters for creating group avatars with a minting policy)
