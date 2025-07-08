Got it. I’ll analyze your repo to extract exactly how your app currently interacts with the Common Ground iframe runtime API. Then I’ll produce a detailed implementation guide for building a self-hosted iframe embedding system that fully replicates that behavior.

The guide will include:

* How the app currently detects and interacts with the Common Ground runtime.
* The expected structure and timing of the `cglib` API injected into the iframe.
* A self-hosted alternative script and iframe loader that replicates this runtime API.
* How to inject data like user and community info.
* Fallback and runtime detection logic for supporting both Common Ground and your own embedding.

I’ll let you know once the implementation guide is ready.


# Curia Standalone Embedding Guide (Untethering from Common Ground)

**Objective:** Enable the Curia discussion board (currently a Common Ground plugin) to run inside a custom iframe on any website, without requiring the Common Ground platform – *while preserving full functionality by mimicking Common Ground’s integration APIs*. This guide outlines how to reverse-engineer Curia’s Common Ground plugin integration and build a **drop-in replacement** iframe embedding system. The goal is that when Curia loads in our own iframe, it “thinks” it’s in the CG environment and works seamlessly, yet it can still run in the real Common Ground when needed.

## 1. Understanding the Current Common Ground Plugin Integration

Curia is presently designed to operate *within* Common Ground’s app container. It’s loaded as an iframe plugin, and the parent (Common Ground) provides a runtime API (`CgPluginLib`) to the iframe. Key integration points include:

* **Initialization via `CgPluginLib`:** Inside Curia’s code, a context provider initializes the Common Ground plugin library. On mount, it calls:

  ```typescript
  CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
  ```

  This returns a `cgInstance` object (the Common Ground plugin instance). The `iframeUid` (a unique plugin instance ID) is passed in as a query parameter when Common Ground loads the plugin iframe. A public key is also provided for request signing, and Curia’s backend has a corresponding private key to sign requests via the `/api/sign` endpoint. (This signing mechanism ensures secure communication between the plugin and Common Ground.)

* **Iframe Context Requirement:** The Curia app **expects** to find an `iframeUid` in its URL when running as a plugin. If not present, the app currently tries to redirect to a proper plugin URL or errors out. For example, in `CgLibContext`, if no `iframeUid` is found and the app is loaded in the top window (not inside an iframe), it will redirect the user to a configured `NEXT_PUBLIC_PLUGIN_INSTANCE_URL` (the Common Ground host). And if it’s in an iframe without `iframeUid`, it logs a warning and treats it as an initialization error. **This means in standalone mode we must handle `iframeUid` (either by providing one or disabling this redirect logic) so the app doesn’t self-redirect or throw an error.**

* **Data Access via `cgInstance`:** Once initialized, `cgInstance` provides asynchronous methods to get data about the current context:

  * `cgInstance.getUserInfo()` – Fetches the **current user’s profile** (ID, name, avatar URL, premium status, email, etc.) and connected social accounts (Twitter, LUKSO, Farcaster, etc.). The result comes as an object with a `.data` property containing these fields. (The `.data` wrapper is important – the raw response is wrapped and the actual user info lives under `data`.)
  * `cgInstance.getCommunityInfo()` – Retrieves **community context**: the community’s unique ID, title/name, short URL (slug), roles defined in that community, logo URL, etc.. This tells Curia which community it’s operating in.
  * `cgInstance.getContextData()` – Returns plugin-specific context, including the `pluginId` (the identifier of Curia as a plugin within Common Ground) and any role IDs assignable by the plugin. Curia uses `pluginId` for things like navigation and as part of its auth payload.
  * `cgInstance.getUserFriends(limit, offset)` – Returns the current user’s **friends list** (social contacts on Common Ground) with pagination. Curia uses this to sync the user’s friends into its own database for social features.
  * `cgInstance.navigate(url)` – Instructs the parent Common Ground app to **navigate** to a given URL. Curia uses this for cross-community navigation; e.g. to jump to a post in another community, it sets up some cookies and calls `cgInstance.navigate("https://app.cg/c/<otherCommunity>/plugin/<pluginId>")`. In the CG environment, this causes the parent window to navigate to the specified community’s plugin page.

* **Authentication via Common Ground:** On initial load, Curia doesn’t prompt for login itself – it relies on Common Ground to already know the user. The `cgInstance.getUserInfo()` call returns the user’s identity if they are logged into Common Ground. Curia then uses that data to log the user into the Curia backend. For example, on startup the app does:

  1. Wait for `cgInstance` to be ready (after `CgPluginLib.initialize` completes).
  2. Fetch user info and community info via `cgInstance`.
  3. Build a login payload with those details (user ID, name, roles, community ID, community name/slug, pluginId, etc.).
  4. Call `auth.login(payload)` which in turn creates a Curia JWT session via the `/api/auth/session` endpoint.

  Essentially, Common Ground is the identity provider – Curia trusts that data to create or find a user in its own database and issue a session token. This means **in standalone mode, we must replace this with our own authentication flow**, since Common Ground won’t be present to provide `getUserInfo` or `getCommunityInfo`. (We’ll address this with wallet-based login or similar.)

**Takeaway:** Curia’s codebase is tightly coupled to `cgInstance` for initialization, user context, and community context. To “untether” from Common Ground without rewriting the whole app, we need to **simulate `cgInstance` and its methods** when running outside of Common Ground. The strategy is to intercept or replace the CG plugin library calls with our own implementations that provide the same interface and data shape.

## 2. Key Common Ground APIs to Replicate

For our drop-in replacement to succeed, the following Common Ground plugin APIs and data structures need to be mimicked or replaced in standalone mode:

* **`CgPluginLib.initialize(iframeUid, signUrl, publicKey)`:** Sets up the communication channel with the parent CG app and returns a `CgPluginLib` instance. In standalone mode, we will provide our own initialization that returns a **mock `cgInstance`** without needing a CG host handshake. (In CG, this call triggers an RSA key exchange and messaging setup using the provided `iframeUid` and public key. In standalone, we won’t have a CG host to talk to, so we can skip actual handshake but still produce an object.)

* **`cgInstance.getUserInfo()` → **User Profile****: Returns an object `{ data: { id, name, imageUrl, email, premium, roles, ...socialAccounts } }`. In CG, this pulls from the CG user profile (including optional Twitter, LUKSO, Farcaster handles if the user connected them). Our standalone version should return similar data from **our own auth system** – e.g. user’s ID, name, avatar, roles, etc. If the user is not logged in yet in standalone, this could return an error or null data (so the app knows no user is present). We must ensure to include the `.data` wrapper for compatibility.

* **`cgInstance.getCommunityInfo()` → **Community Context****: Returns `{ data: { id, title, url, roles, smallLogoUrl, ...} }`, describing the current community. The `url` field is the community’s short name/slug (used in URLs). In standalone mode, we need to determine *which* community/forum the iframe is showing and supply its info. This might come from a configuration (e.g. a URL param or embed config specifying the community), and we’ll fetch from our database instead of CG. We should return at least an `id` (could be our own UUID), a `title` (community name), a `url` (short identifier), and any roles definitions if applicable. If initially we only support one community or a default, this can be static or configured.

* **`cgInstance.getContextData()` → **Plugin Context****: Returns an object with plugin-specific metadata. Most importantly, `pluginId` (the CG plugin definition ID) and possibly an array `assignableRoleIds` of role IDs that the plugin can manage. In standalone mode there is no “Common Ground plugin”, but to keep Curia happy we can return a dummy context. For example, define a constant pluginId (e.g. `"curiaStandalonePlugin"` or reuse the real pluginId if known and relevant) and any needed role IDs. This is mainly used for navigation URLs and possibly permission logic. In our auth, we included `pluginId` in the user’s JWT claims under `pluginId` – we might set a placeholder here just so the value isn’t null.

* **`cgInstance.getUserFriends(limit, offset)` → **Friends List****: Returns `{ data: { friends: [ {id, name, imageUrl}, ... ] } }` from the CG social graph. Curia currently calls this in a loop to gather all friends for the user upon login, and then syncs them to its own DB. In standalone mode, Common Ground friends will not be available. We have a few options:

  * Initially, **stub this out** to return an empty list or a not-supported error. (The app will skip friend sync if the method isn’t present or returns nothing.)
  * Eventually, replace with our own friends/follow system (e.g. follow users via blockchain addresses or a local friend list). But this can be Phase 2; it’s not critical to basic forum function.

* **`cgInstance.navigate(url)` → **Cross-Community Navigation****: In Common Ground, this triggers the parent app to navigate to a different community or page. In standalone, there is no parent app controlling navigation. For a **drop-in replacement**, we can implement `navigate(url)` such that:

  * It could simply open the URL in a **new tab or window** (using `window.open(url)`), if the URL is an external link (e.g. a CG link).
  * If in the future we have our own multi-community aggregator, we might handle it differently, but initially this is rarely used except when the user explicitly clicks something meant to open CG. It’s safe to provide a minimal implementation (or even a no-op with a console warning) to avoid errors.

* **Common Ground Event Hooks:** (Not a specific API method, but worth noting.) The CG library likely uses postMessage under the hood to handle these calls. Curia’s code doesn’t directly use `window.postMessage`, because `CgPluginLib` abstracts it. In our standalone version, we will implement our own **iframe messaging** for things like resizing and config, but it’s separate from the `cgInstance` interface.

By replicating these APIs, we ensure the Curia app “doesn’t know” it’s outside Common Ground – all its calls succeed and return expected data structures. Next, we plan how to implement this.

## 3. Goal: A Standalone Drop-In Replacement for Common Ground

Our aim is to **embed Curia on any website** via an iframe, *without requiring a Common Ground community*. This means users can deploy a forum by simply inserting a snippet, rather than signing up on Common Ground. To achieve this, we must:

* **Provide the same interface as Common Ground’s `CgPluginLib`** in standalone mode. In practice, we’ll create a **compatibility layer** (mock `cgInstance`) that implements all the methods described above (`getUserInfo`, `getCommunityInfo`, etc.) but interacts with our standalone backend or local data instead of Common Ground. This minimizes changes – much of Curia’s code can remain as is, using `useCgLib()` and calling `cgInstance.method()` just like before.

* **Implement a custom iframe communication protocol** between the parent website and the embedded Curia iframe. In Common Ground, the CG platform and plugin communicate behind the scenes (passing data like user info, navigation commands, etc.). For our standalone solution, we’ll set up our own messaging:

  * The **iframe URL** will include configuration parameters (community identifier, theme, etc.) to inform the Curia app what context it’s in.
  * We’ll also use **window\.postMessage** for dynamic interactions: e.g., the child frame can notify the parent to adjust height or send out events; the parent can send auth tokens or commands to the iframe.
  * Our goal is to *replace CG’s iframe communication with our own*, seamlessly.

* **Maintain dual compatibility:** We must ensure that these changes do **not break the existing Common Ground plugin functionality**. During the transition, Curia should support both modes. We can use a feature flag or environment variable to switch between **CG mode** and **Standalone mode**. For example, `process.env.NEXT_PUBLIC_STANDALONE_MODE` or a special URL param can indicate that our iframe is running standalone. In CG mode, we continue to use `CgPluginLib` as before; in standalone mode, we load our mock implementation. This dual-mode approach is crucial for a smooth migration and testing (we can compare behavior to ensure feature parity).

* **Leverage existing Web3 integrations for auth:** Since outside CG we won’t have CG’s user management, we plan to allow **direct user authentication** via methods like **ENS (Ethereum wallets)** and **LUKSO Universal Profiles**, which are already integrated in Curia. We’ll extend these to serve as primary login mechanisms in standalone mode. The JWT-based session system will remain (users still get a Curia JWT token after signing in, for API auth), but the difference is how we obtain the user’s identity (from wallet or email signup, instead of from CG).

* **Allow community configuration outside CG:** In CG, communities are created on the CG platform and Curia just reads the info. For standalone, we eventually need our **own concept of communities** (forums) that can be created and managed independently. Initially, we might support a default community or require a preset community ID in the embed code. Over time, we’ll implement features for users to create communities and manage roles without CG (see Phase 2 in the plan). In the interim, if necessary, we could even allow embedding of an existing CG community by using its shortId (as a temporary measure), but the long-term goal is to not depend on CG’s data at all.

Now, with the high-level plan clear, let’s dive into implementation steps for the core pieces: the mock CG interface, the iframe embed script, and the standalone auth handling.

## 4. Implementing the Mock `CgPluginLib` Interface (Standalone Mode)

We will create a module (for example, `src/lib/mock-cglib.ts`) that exports an object or class mimicking the Common Ground plugin library interface. This “mock” library will be used when running outside Common Ground, providing a `cgInstance` with the methods Curia expects. Key implementation notes:

* **Initialization Stub:** In Common Ground, you call `await CgPluginLib.initialize(iframeUid, signUrl, publicKey)` and get back an instance. We can define a similar static method in our mock, e.g. `MockCgLib.initialize(iframeUid: string): Promise<MockCgLibInstance>`. Our implementation doesn’t need to do any handshake; it can simply create and return a new `MockCgLibInstance` (resolving immediately or after any async setup we need). We still accept the same parameters for signature compatibility, but we might ignore or log them. For example:

  ```typescript
  // pseudo-code for Mock CgPluginLib
  class MockCgPluginLib {
    static async initialize(iframeUid: string, signEndpoint: string, publicKey: string) {
      console.log("Standalone mode: initializing MockCgPluginLib with iframeUid", iframeUid);
      return new MockCgPluginLib(iframeUid);
    }
    constructor(private iframeUid: string) {
      /* possibly store iframeUid or other config */
    }
    // ... define methods below ...
  }
  ```

  We should ensure that this **returns the same type of object** that `CgPluginLib.initialize` would, i.e. with all required methods.

* **`getUserInfo()` Implementation:** This should return a Promise that resolves to an object with a `.data` field containing user info (or `.error` on failure). In standalone mode, the logic could be:

  * If the user is **already authenticated** in Curia (e.g. we have a JWT/token in our AuthContext or local storage), then fetch the user’s profile from our backend (`/api/me`) or use stored context to build the object. We need to construct an object with all the fields Curia expects. We can map our AuthContext `user` data to the same structure Common Ground provided. For example, Curia’s AuthenticationService expects fields like `userId, name, profilePictureUrl, roles, communityRoles, communityId, communityShortId, pluginId,` etc. as input for login. We can produce these from our own user/session data.
  * If the user is **not authenticated** yet (e.g. first load, no login done), we might return `{ data: null }` or `{ error: "Not logged in" }`. This will signal the app that no user is present. In the current CG flow, if `getUserInfo` returns an error or missing data, the app would probably treat the user as logged out and show login options (in CG, this situation normally doesn’t happen because CG ensures a logged-in user launches the plugin; in standalone we will handle guest state).

  For initial simplicity, `MockCgPluginLib.getUserInfo()` could check something like a global `auth.token` or call a function in our AuthContext to get current user data. If available, format it; if not, return empty. **Important:** match the interface. For example, we might do:

  ```typescript
  async getUserInfo() {
    if (!AuthContext.isAuthenticated()) {
      return { data: null }; // or { error: "Unauthenticated" }
    }
    const user = AuthContext.getUser();  // our own stored user info
    return { data: {
        id: user.userId,
        name: user.name,
        imageUrl: user.picture,
        email: user.email,
        premium: user.premium,
        roles: user.roles || [],
        // include social links if any (user.twitter, user.lukso, etc.)
        twitter: user.twitter ? { username: user.twitter } : undefined,
        lukso: user.lukso ? { username: user.lukso.username, address: user.lukso.address } : undefined,
        farcaster: user.farcaster ? { displayName: user.farcaster.displayName, username: user.farcaster.username, fid: user.farcaster.fid } : undefined,
        ethereum: user.ethereum ? { address: user.ethereum.address } : undefined
      }
    };
  }
  ```

  This mirrors the structure that CG provided (see the debug example of `CompleteUserInfoResponse` in docs). By doing this, when the rest of Curia code calls `cgInstance.getUserInfo()`, it will receive user data as if it came from Common Ground. For instance, the AppInitializer will get `userInfoResponse.data.id` etc. without caring that it was our code.

* **`getCommunityInfo()` Implementation:** This needs to provide the forum community context. Likely we’ll configure the **community identifier via the embed URL** (e.g. `?community=shortName`). The `MockCgPluginLib` should know which community it’s representing – possibly passed in via the iframe URL or a global config that the parent page or URL provides. For now, assume we get a `communityShortId` (slug) and we can fetch or have stored the community’s info:

  * Community ID: In CG this is a UUID; in our system it could be a numeric ID or UUID in our database. We should have some unique ID.
  * Community title/name.
  * Community shortId (slug) – likely the same as what was passed in.
  * Community roles: In CG, `getCommunityInfo().data.roles` gives an array of role definitions (each with id, title, permissions). If we have our own roles system, we can include similar data. Initially, we might include an admin role or member role definition if needed. If not ready, we could return an empty array or some default.
  * Community logo URL if available (or null).

  Example pseudo-code:

  ```typescript
  async getCommunityInfo() {
    const shortId = this.communitySlug; // assume we stored it from URL params
    // Fetch from our API or config:
    const communityData = await fetch(`/api/communities/${shortId}`).then(r=>r.json());
    if (!communityData) {
      return { error: "Community not found" };
    }
    return { data: {
        id: communityData.id,
        title: communityData.name,
        url: communityData.slug,         // short identifier
        roles: communityData.roles || [],// roles array
        smallLogoUrl: communityData.logoUrl || null
      }
    };
  }
  ```

  If we haven’t built a `/api/communities` endpoint yet, we might hard-code community info for a prototype. The key is to return the data shape with `id`, `title`, `url` (slug) so that elsewhere in Curia, when they do `communityInfo.data.title` or `.url` it works.

* **`getContextData()` Implementation:** We can return a context object with at least a `pluginId`. Since outside CG there is no real pluginId, you can define one in config (e.g. an environment variable for Curia’s plugin ID if it has one from CG, or a fixed string). For example:

  ```typescript
  getContextData() {
    return { pluginId: process.env.NEXT_PUBLIC_CURIA_PLUGIN_ID || "curia-standalone" };
  }
  ```

  If Curia’s CG plugin ID is known (maybe a GUID from CG), using it or a placeholder doesn’t matter much as long as it’s consistent. This is used when building cross-community navigation URLs and included in the login payload, so it’s safest to supply *something*. You could also include `assignableRoleIds: []` if needed (Curia might not specifically use it yet, but it’s part of context in CG).

* **`getUserFriends(limit, offset)` Implementation:** If we want to support friend lists in standalone, we’d need our own friend/follow system. If that’s not yet implemented, we have two approaches:

  * **Return no friends:** e.g. always `{ data: { friends: [] } }`. The AuthContext will see no friends and just not sync any (and potentially try fallback to database which will find none). This is a safe default.
  * **Disable the method:** We could omit this function or have it throw `Unsupported`. In the friend sync code, they do check if `typeof cgInstance.getUserFriends === 'function'` before attempting friend fetch. If we do not implement it, the app will log “method not available” and skip syncing. That might be acceptable.

  As a future improvement, once standalone social features are ready, we would implement this to return friends from our system (maybe pulling a list of followed users, etc.).

* **`navigate(url)` Implementation:** To maintain compatibility, implement this as an async function that perhaps opens a link. For example:

  ```typescript
  async navigate(targetUrl: string) {
    console.log("Standalone navigate called to:", targetUrl);
    // In CG this would ask parent to navigate; here we handle it:
    try {
      if (targetUrl.startsWith('http')) {
        window.open(targetUrl, '_blank');
      } else {
        // If given a relative path or something, attempt to navigate this window
        window.location.href = targetUrl;
      }
      return true;
    } catch (e) {
      console.error("Navigation failed:", e);
      return false;
    }
  }
  ```

  This ensures that if any part of Curia calls `cgInstance.navigate(...)`, it won’t throw an error. For instance, the cross-community navigation hook builds a URL and calls `cgInstance.navigate(url)` – in our case it will just open a new tab to the CG site or do nothing if not applicable. (In the standalone context, you might decide cross-community navigation isn’t supported or just link out to a public page.)

**Wiring it up:** We have our `MockCgPluginLib` – how do we use it? We need to modify the initialization logic in `CgLibContext`. Specifically:

* When running in **standalone mode**, **avoid redirecting away** due to missing `iframeUid`. We likely will **pass a fake `iframeUid`** in the embed URL to satisfy the check. For example, our embed script can generate a random GUID and append `?iframeUid=<GUID>` to the iframe src. This way `uidFromParams` is present and the redirect logic in `CgLibContext` is bypassed. (Alternatively, we can set an environment flag to skip the redirect code entirely when building for standalone.)

* Decide on a flag to indicate standalone mode. This could be:

  * A special query param like `mode=standalone` or `cg=0` in the URL.
  * An environment variable `NEXT_PUBLIC_STANDALONE_MODE=true`.
  * Or simply, if `window.top === window.self` and no Common Ground context, assume standalone.

  A robust approach is using an explicit mode flag to avoid any ambiguity with being in an iframe on a non-CG site. For example, if `process.env.NEXT_PUBLIC_STANDALONE_MODE` is true, we know to use our mock. (The migration plan suggests using feature flags/env vars for mode switching.)

* In the effect that currently calls `CgPluginLib.initialize`, branch logic:

  ```typescript
  if (standaloneMode) {
    // Use our mock library
    MockCgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
      .then(instance => { setCgInstance(instance); setIsInitializing(false); })
      .catch(error => { console.error("Standalone CG init failed:", error); setInitError(error); setIsInitializing(false); });
  } else {
    // Existing CG initialization
    CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
      .then(instance => { ... })
      .catch(error => { ... });
  }
  ```

  In essence, replace or wrap the call to the real CG SDK with our own when in standalone. This gives us a `cgInstance` in context that is actually an instance of `MockCgPluginLib` but with the same shape as the real one.

* Double-check **type compatibility**: Our `MockCgPluginLib` class should ideally implement the same TypeScript interface as `CgPluginLib` so that the rest of the code using `cgInstance` doesn’t type error. We might not have the CG library’s type definitions, but we can approximate them (e.g., define a TypeScript interface for the methods we use). In the code, they often treat `cgInstance as any` when calling CG methods, so it’s forgiving. But for clarity, we can define a minimal interface:

  ```typescript
  interface CgLibLike {
    getUserInfo: () => Promise<{ data?: any; error?: string }>;
    getCommunityInfo: () => Promise<{ data?: any; error?: string }>;
    getContextData: () => any;
    getUserFriends?: (limit:number, offset:number) => Promise<{ data?: any; error?: string }>;
    navigate?: (url: string) => Promise<boolean>;
  }
  ```

  Our `MockCgPluginLib` implements this, and the context can type `cgInstance` as this `CgLibLike`. This is more for our sanity; the app was originally using the actual types from `@common-ground-dao/cg-plugin-lib` but in standalone we control the interface.

* **Testing the mock:** Once implemented, test the app in standalone mode:

  * It should no longer redirect on load (since we provide an `iframeUid` and/or disabled redirect).
  * It should call `MockCgPluginLib.initialize` and succeed.
  * On initial load, the AuthContext/AppInitializer will call `cgInstance.getUserInfo()` and `.getCommunityInfo()`. With our mock, if the user is not yet authenticated, those might return empty data. The AppInitializer’s logic needs to handle that gracefully (it currently logs error if `.data` is missing). We might adjust it: in standalone mode, perhaps don’t treat missing user info as an error – instead, it means “no user logged in” and we simply don’t call `auth.login` automatically.
  * Ensure no uncaught exceptions: if our `getUserInfo` returns `{ data: null }`, the code uses `if (!userInfoResponse?.data)` to detect failure. We may need to adjust that logic in standalone to not treat it as a fatal error but rather continue with user = null. Possibly, we add an additional condition: if standalone mode and no data, skip auto-login (the user will see a login prompt).

  The key is to integrate our changes so that the app either logs in automatically (if parent provided a token or if a previous session is cached) or stays logged out awaiting user action, but **doesn’t crash or loop**.

By completing the above, we have replaced the backend of Curia’s CG integration with our own. Next, we address how the parent website and the iframe coordinate (passing in configuration and handling user interactions).

## 5. Iframe Embedding & Communication Protocol

With a standalone-compatible Curia app, we need a convenient way for third parties (or us) to embed it. We will create an **embeddable widget script** that generates the iframe and handles communication, as well as define the **URL/query parameters** the iframe will accept for configuration.

### 5.1 Embeddable Iframe Script (Widget)

Following best practices for widgets, we can offer a small **JavaScript snippet** that website owners copy-paste. This script’s job is to inject an `<iframe>` pointing to our app, with the proper configuration. Key responsibilities:

* **Construct the iframe URL:** This URL should point to the Curia web app deployment (e.g. `https://curia.app/` or a specific path if needed). Include query parameters for at least:

  * `iframeUid`: a unique identifier for the session. The script can generate a random UUID or timestamp-based ID each time. This ensures each embed instance has an ID (satisfying Curia’s expectation). For example:

    ```js
    const iframeUid = 'curia-' + Math.random().toString(36).substr(2, 9);
    ```

    Then append `?iframeUid=${iframeUid}` to the URL.
  * `community`: an identifier for which community or forum to load. This could be a slug or ID. E.g. `community=devsupport` or `communityId=12345`. The Curia app will read this via `useSearchParams()` and use it in `MockCgPluginLib` to fetch the community data.

    * If no community is specified, the app could default to a “global” or default community, but it’s better to require it so each embed is distinct. The embedding guide should instruct the user to supply their community name or ID.
  * **Optional**: `theme` or styling parameters. We might allow `theme=dark` or `primaryColor=#123456` to let the iframe match the host site’s style. The Curia app can read these and adjust CSS (we’d have to implement theme support inside Curia if not already). At minimum, support a light/dark mode toggle. E.g. `?theme=dark`.
  * **Optional**: `token` for authentication. If we want to allow SSO-ish behavior – say the host site already has an auth token for Curia’s user – they could include `token=<JWT>` in the URL. However, putting sensitive tokens in plain query params is not ideal (it could be logged or leaked). A safer approach is to handle tokens via postMessage after the iframe loads (discussed below). We can skip token in URL for now or use it only for non-secret info (like a public identity).

  **Example iframe URL:**

  ```
  https://curia.app/?iframeUid=abc123&community=myforum&theme=light
  ```

  The script will programmatically create this URL string.

* **Insert the `<iframe>` element:** The script should create an iframe element with:

  * `src` set to the URL constructed above.
  * Appropriate attributes for sizing and permissions. For instance, `width="100%" height="600"` (or dynamic height if we plan to auto-resize), `style="border:none; overflow:hidden;"` for seamless embed. We might later adjust height via messaging.
  * We should also consider `allow-same-origin` and `allow-scripts` in the iframe if needed (since our app will load scripts and possibly need access to its own cookies/localStorage). Usually, a third-party embed uses `<iframe sandbox="allow-scripts allow-same-origin allow-popups">` to restrict some things but allow the essentials (like our scripts and any popup for auth). For example, if using Web3 wallets, Metamask’s injection might require certain contexts – by allowing same-origin (which actually means the iframe can maintain its origin context) and scripts, we permit our app to function normally within the iframe.

  The script can either set a fixed height or initially small height that will expand. A common approach is to have the iframe height adjust after content loads (since forum posts can vary in length).

* **Responsive design:** We should ensure the Curia app is mobile-friendly inside the iframe (likely it is already responsive). Our embed code can make the iframe container responsive (e.g. width 100% so it shrinks on mobile, and maybe a min-height). This was noted in the plan as well.

* **Example snippet (for illustration):** We might provide:

  ```html
  <div id="curia-forum"></div>
  <script src="https://curia.app/embed.js" data-community="myforum" data-theme="dark"></script>
  ```

  Where `embed.js` is a small script that reads `data-community` and others, then does:

  ```js
  (function(){
     const container = document.getElementById('curia-forum');
     const community = container.getAttribute('data-community') || 'default';
     const theme = container.getAttribute('data-theme') || 'light';
     const iframeUid = 'curia-' + Math.random().toString(36).slice(2);
     const src = `https://curia.app?iframeUid=${iframeUid}&community=${community}&theme=${theme}&mode=standalone`;
     const iframe = document.createElement('iframe');
     iframe.src = src;
     iframe.width = "100%";
     iframe.height = "600";  // initial height, will adjust
     iframe.style.border = "none";
     iframe.allow = "clipboard-write; clipboard-read;";  // if needed for copy-paste features
     // (If using sandbox: iframe.sandbox = "allow-scripts allow-same-origin allow-popups";)
     container.appendChild(iframe);
  })();
  ```

  This is just an illustrative approach. The actual implementation might differ, but the core idea is to dynamically embed the iframe with needed params. The website owner only needs to include this script.

### 5.2 Parent-Child Messaging

Once the iframe is embedded, we want it to communicate with its parent (the host page) for certain functionalities:

* **Dynamic Height Adjustment:** The iframe content height will change as the user navigates the forum (different threads, etc.). We don’t want scrollbars inside the iframe if possible. We can implement a simple postMessage protocol:

  * Inside Curia (the iframe), whenever content is rendered or updated, send a message to the parent with the new document height. For example, use `window.parent.postMessage({ type: 'curiaHeight', height: document.body.scrollHeight }, '*')`. This could be triggered on initial load, on route changes, or on expand/collapse of elements.
  * The parent script (embed.js) will add a listener: `window.addEventListener('message', (event) => {...})`. When it receives a message of type `curiaHeight` from our app’s origin, it sets `iframe.style.height = height + 'px'`. This automatically resizes the iframe to fit content.
  * This ensures a seamless appearance on the host page. We should throttle or debounce height messages if content changes rapidly, to avoid jank.
* **Auth Token Exchange:** If the host website *already knows the user* (for instance, imagine the host site has its own login and it can determine an associated Curia user), it might want to log the user into Curia without them manually doing so. We can support a message like:

  * Parent to Child: `{ type: 'curiaAuth', token: '<JWT or session token>' }`. The parent (if it has obtained a Curia token for the user through some out-of-band means, or a predefined API key) sends it down.
  * Child (Curia iframe) listens for `curiaAuth`. On receiving it, it could verify and set the token in AuthContext, effectively logging the user in. For example, call `AuthService.login()` or a refresh with that token. If the token is a JWT for Curia, we can decode it and populate the user state directly.
  * This mechanism is optional and for advanced integrations (it requires the host site to have access to Curia’s auth system – which might only be possible if there’s a prior arrangement or SSO). For now, we can design the protocol and leave hooks for it. The plan explicitly mentions handling auth tokens passed from parent.
* **Other messages:** We might define other events (e.g., if the user performs some action in the forum and the host page wants to know about it – like new post created, or user count, etc.). Initially, height and auth are the main ones.

**Implementation in code:**

* In the Curia app (child side), we’ll add a module (e.g. `iframe-communication.ts`) as suggested. On mount, if `window.parent !== window` (inside iframe) and maybe `standaloneMode` is true, set up:

  ```js
  window.parent.postMessage({ type: 'curiaReady' }, '*');
  // and add listener for messages from parent
  window.addEventListener('message', event => {
    if (event.data?.type === 'curiaAuth') {
       const token = event.data.token;
       // TODO: validate origin if needed
       if (token) AuthService.loginWithToken(token);
    }
  });
  ```

  Also, use an effect or callback after each page render to send height:

  ```js
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'curiaHeight', height }, '*');
  ```

  (We may need to handle cases like if the parent is in a different domain, `'*'` wildcard is fine for broadcast but parent should check the origin.)

* In the parent embed script, listen for messages:

  ```js
  window.addEventListener('message', event => {
    // filter messages from the Curia iframe by origin if possible:
    if (!event.origin.includes("curia.app")) return;
    const data = event.data;
    if (data.type === 'curiaHeight') {
      const iframe = document.querySelector('#curia-forum iframe');
      if (iframe) iframe.style.height = data.height + 'px';
    }
    // If we want, when we get 'curiaReady', we could immediately send an auth token if available:
    if (data.type === 'curiaReady' && myCuriaToken) {
      event.source.postMessage({ type: 'curiaAuth', token: myCuriaToken }, event.origin);
    }
  });
  ```

  This shows how the parent could react.

**Security considerations:** Ensure that we validate the message origins and don’t allow malicious scripts to manipulate the iframe or parent. For height, it’s low risk. For auth, only accept messages from expected origins. We might restrict the parent to send tokens only via a secure context.

### 5.3 Standalone Authentication Flow

When running standalone, if the user is not already authenticated via a parent token, Curia needs to handle login on its own:

* We will expose **login options in the UI**: e.g., “Sign in with Ethereum” (using WalletConnect/Metamask), “Sign in with Universal Profile”, or possibly traditional email/password if supported. The code already includes ENS/LUKSO integration points, which suggests there are components for connecting a wallet (`EthereumConnectionWidget.tsx`, `LUKSOVerificationSlot.tsx`, etc.).
* On login via these methods, our AuthContext will create a user and issue a JWT just like the CG-based login did, but using a different pathway. For example, an Ethereum login might require the user to sign a message proving ownership of an address, then our backend creates/looks up a user with that address and returns a token. This would happen through a dedicated API (not the CG /api/sign flow, but perhaps a new `/api/auth/eth-login`, etc.).
* We should implement a **StandaloneAuthService** module (as mentioned in the plan) that handles these flows and produces the same `LoginCredentials` structure to feed into `AuthenticationService.login` or a similar function. We want to reuse the JWT session mechanism. For instance:

  * If user logs in with ENS, get their address and ENS name, then call `AuthService.login({ userId: <address>, name: <ensName>, ...iframeUid, communityId, communityShortId, pluginId, ... })`. We might treat the blockchain address as the `userId` or use a different system-generated ID. The idea is to fill the LoginCredentials structure with our data. Some fields like `iframeUid`, `communityId` we have from context; others like roles we might determine (e.g. default roles).
  * AuthenticationService will then issue a token via `/api/auth/session` and we proceed as usual (setting the token in context, etc.).
* In summary, **replace `cgInstance.getUserInfo()` calls (which were automatic) with either**:

  * If parent passed a token: use it to log in directly (bypassing user interaction).
  * Else: prompt the user to sign in using integrated methods. Once they do, generate the payload and call login.

**Guest access:** We should also consider that users might browse the forum without logging in (read-only). Our standalone mode should allow read-only access if not authenticated, which means:

* The app should not force redirect to login; it should show content (if the community is public) and allow viewing posts. Only when trying to post or like, it should ask to log in.
* The CG plugin version likely assumed a logged-in user always. In standalone, we have to handle “no user” state gracefully (the UI should probably show a “Log in to participate” message). We might need minor tweaks in UI to account for `user == null` state (if not already handled).

Now, because the question focuses on building the embedding system rather than deep internals of auth, we will keep the details at a high level. The key is: **we have to implement an authentication translation layer that no longer depends on CG**. This includes:

* Using ENS/UP for identity (already partially in code).
* Managing our own user accounts (backend changes to store users that aren’t tied to CG IDs).
* Still using JWT for session management (so frontend AuthContext and backend still work with tokens).
* Possibly providing a registration flow for new users (if someone with no wallet or no CG account wants to sign up, maybe an email registration – if that exists or we implement one).

## 6. Preserving Features and Notable Differences in Standalone Mode

When implementing the above, keep these points in mind to ensure feature parity and a smooth user experience:

* **Roles and Permissions:** In CG mode, community roles and user roles come from CG. In standalone, once we manage communities ourselves, we must handle roles (admin, moderator, etc.) in our system. Initially, if not implemented, you might treat all users as regular members and designate a default admin if needed. Over time, implement role management in the Curia backend so that `communityRoles` and user `roles` are populated in `getCommunityInfo` and `getUserInfo` respectively (so that admin UIs and permissions continue working). For now, possibly return the CG roles if using a CG community, or stub with generic roles.

* **Friends & Social Graph:** As noted, the friend list might not be available outside CG until we build an alternative. This means features like “Friends online” or friend mentions might be limited. The plan is to integrate with blockchain social connections (following ENS profiles, etc.). We can safely skip deep integration initially; just ensure nothing crashes. For example, the friends sync is non-critical – it runs in background during login and errors are caught. We already plan to have `getUserFriends` either no-op or empty, so that should be fine.

* **Notifications and Presence:** If Curia had any features relying on CG’s presence or notification system (e.g., CG might broadcast events or had APIs for notifications), those would need replacement. Check if `cgInstance` had something like `onNotification` or similar – from the code, not obvious, but Curia might be using its own notification system. In any case, be aware of anything missing. The plan’s archives mention “enhanced notifications” and multi-community presence; those likely rely on CG. We might have to skip or implement a simplified version later.

* **Data Migration:** If you plan to migrate existing CG community data to standalone, ensure the IDs align or are mapped. For instance, if embedding an existing CG community via its slug, you might still be using CG’s data indirectly. However, fully standalone implies migrating or starting fresh communities on our side. That’s a backend task (Phase 4 in plan) beyond the scope of the iframe, but keep it in mind. Initially, you could run Curia in standalone mode but pointed to a specific CG community’s data via API – though that would still depend on CG’s API, which is not ideal. Instead, likely we’ll import the data or just start new communities.

* **Dual Operation Testing:** Continuously verify that when `NEXT_PUBLIC_STANDALONE_MODE` is false (or when running inside CG with `iframeUid` present from CG), the original integration still works **exactly as before**. We shouldn’t break the CG plugin path. Use feature flags or conditional code to isolate any standalone-only behavior (e.g., only initialize `MockCgPluginLib` when needed, only skip redirect when needed). This way we can deploy the app supporting both until we fully cut over.

* **Developer Tools & Debugging:** It could help to include a debug panel or console logs that indicate which mode the app is in (CG vs standalone) for easier troubleshooting. The code already logs various CG init stages; add logs for standalone init too. This will be useful when working with the coding agent to trace issues.

## 7. Example Workflow in Standalone Mode (Putting It Together)

To illustrate the complete picture, here’s how things will work once the standalone embedding is implemented:

1. **Website Owner Embeds Curia:** They include our embed script and a container. For example:

   ```html
   <div id="curia-forum" data-community="myforum" data-theme="light"></div>
   <script src="https://curia.app/embed.js" defer></script>
   ```

   The embed script runs, generates an `iframe` with src `https://curia.app?iframeUid=XYZ123&community=myforum&theme=light` and inserts it into the `#curia-forum` container.

2. **Curia App Loads (Standalone Mode):** On loading, Curia sees `?iframeUid=XYZ123&community=myforum`. It does **not** detect a Common Ground environment (we might explicitly set `mode=standalone` too). The `CgLibContext` uses `MockCgPluginLib.initialize` instead of the real one, creating a `cgInstance` that is our mock. No redirect occurs, and initialization completes successfully with our object.

3. **Curia Initialization Without CG:** The AppInitializer runs. It attempts to fetch user and community info via `cgInstance`. Our `MockCgPluginLib.getCommunityInfo()` uses the `community=myforum` param to fetch details from Curia’s database (say “My Forum” with some ID). It returns `{ data: { id: "...", title: "My Forum", url: "myforum", roles: [...] } }`. Our `getUserInfo()` sees no user (first-time visitor), so it returns `{ data: null }` (or perhaps an error). The AppInitializer code finds no user data; in CG mode it logged an error, but we might adjust it to simply not call `auth.login` when `userInfo.data` is empty. Thus, the app does **not log in** a user automatically. It proceeds with `auth.isAuthenticated = false`. The forum UI renders showing posts from "My Forum" community (since community context is set), and likely a prompt to log in or a disabled comment box.

4. **User Browses and Decides to Log In:** The user clicks a “Log in” or “Connect Wallet” button in the Curia UI. Thanks to our standalone auth integration, this triggers a wallet connection (for ENS/Ethereum) or a popup for other methods. Suppose the user connects their Ethereum wallet:

   * Curia obtains the wallet address (and maybe ENS name if applicable).
   * We send a request to our backend (perhaps `/api/auth/ens-login`) with a signature to prove ownership. The backend finds or creates a user with that address, assigns them a user ID (maybe the address itself or an internal ID), and responds with a JWT token (and the user profile info).
   * Curia’s frontend then calls `AuthenticationService.login(credentials)` with the returned data (or a specialized function for wallet login that ultimately populates AuthContext with user info and token).
   * Now `AuthContext.user` is set (with id, name, etc.), `isAuthenticated = true`. If we want, we can also update our `MockCgPluginLib` internal state to hold this user (so that subsequent `getUserInfo()` calls would return it). This might not be strictly necessary if we always refer to AuthContext for user data, but it could be done for completeness.
   * The UI now shows the user as logged in. They can post, comment, etc.

5. **Curia Functionality Continues:** The user posts a new topic. The app functions normally, using the JWT for API calls to Curia’s backend. If the app internally tries to call any `cgInstance` method again, it will get appropriate responses:

   * For instance, maybe after posting, Curia might call `cgInstance.getUserInfo()` to refresh profile (not sure if it does, but if it did, our mock returns the now logged-in user’s data).
   * Friend list fetch might be attempted at login; our mock returned none, so that’s done. No errors.
   * Everything else (like file uploads, voting) that doesn’t involve `cgInstance` is unchanged.

6. **Iframe Messaging in Action:** The forum initially might have loaded just a list of posts and the height was, say, 800px. Our script in Curia posted that height, and the parent adjusted the iframe. When the user navigates to a long thread, Curia sends a new height (e.g. 1500px) and parent grows the iframe accordingly. If the user then collapses a panel or goes back to a shorter page, height shrinks. This provides a smooth experience embedded in the page.

7. **Parent-Initiated Actions (if any):** If the embedding website has some integration, say it knows when their user logs into the main site and has a token for Curia, it could send `curiaAuth` message. Upon receiving, if our Curia iframe is currently showing a guest, it could log them in immediately with that token (bypassing the manual wallet connect). This scenario might be used if the site and Curia share an auth system or if the site stores the Curia JWT in a cookie that it passes. It’s optional but shows the flexibility of our system.

8. **Maintaining CG Compatibility:** At any point, if we load Curia **inside Common Ground** (with a valid `iframeUid` from CG and CG’s `CgPluginLib` present), our code will detect CG mode (standalone flag off, or CG-specific checks) and use the original integration. The app will behave exactly as it did before for CG users. We have essentially wrapped the CG calls with a condition. So we can continue to serve CG plugin users until we fully migrate them.

By following this guide, the coding agent can implement the above step by step:

* Create the `MockCgPluginLib` interface with methods (`getUserInfo`, `getCommunityInfo`, etc.).
* Adjust `CgLibContext` to use it based on a mode flag.
* Build the `iframe-communication.ts` for postMessage handling (both in parent embed script and inside Curia).
* Modify or extend authentication flows to support wallet login (using existing ENS/UP hooks) and to call `AuthService.login` with standalone credentials.
* Test thoroughly in both standalone and CG mode.

With these changes, Curia will have its **own embeddable iframe system**. Anyone can host a Curia forum on their site by including the provided snippet, without needing to go through Common Ground. From Curia’s perspective, it’s still interacting with a `cgInstance`, but it’s our fake one providing the needed info – a true drop-in replacement for the CG environment. This unlocks a much wider use case for Curia while retaining backward compatibility with the Common Ground platform during the transition.
