Thanks for the detailed breakdown. I’ll dive into the root cause of the WalletConnect double initialization and identify a production-ready solution that preserves both systems. I’ll explore whether project IDs should be split, whether WalletConnect Core can be scoped or shared safely, and what changes to your provider architecture or configuration might eliminate the conflict.

I’ll let you know once I have the findings ready for your review.


# WalletConnect Core Double Initialization - Solution Research

## Root Cause Analysis

The warning **"WalletConnect Core is already initialized... Init() was called 2 times."** indicates that the WalletConnect **v2 Core client** is being initialized twice in the same app session. In our architecture, the root cause comes down to **both wallet connection systems independently initializing WalletConnect**:

* **Web3-Onboard (Universal Profile)** – When the LUKSO Universal Profile wallet context is set up (via `initOnboard()`), Web3-Onboard internally prepares WalletConnect support (even if only injected wallets are configured). It likely creates a WalletConnect **Core instance** using the provided Project ID behind the scenes.
* **RainbowKit/wagmi (Ethereum)** – RainbowKit’s `getDefaultConfig` registers a WalletConnect connector (for Ethereum) using the same Project ID. Wagmi may initialize the WalletConnect **SignClient** as soon as the config is created or when the RainbowKit provider mounts. In some wagmi versions, this can even happen **twice** (e.g., once on server-side render and once on client hydrate), compounding the issue.

Because both systems use **WalletConnect v2** and were configured with the **same Project ID**, the WalletConnect library detects the second initialization as a duplicate. WalletConnect’s core client is designed as a singleton (one per app), so the second call triggers the warning. In summary, **each wallet framework was unknowingly spinning up its own WalletConnect instance** – leading to the collision.

**Contributing factors:**

* *Shared Project ID:* Using one WalletConnect Project ID for both systems is generally fine, but here it means both instances try to connect to WalletConnect Cloud with the same credentials, making the duplication obvious.
* *Provider Nesting:* The current provider nesting (RainbowKitProvider wrapping UniversalProfileProvider) means both systems are active concurrently for some users. When a post requires both UP and Ethereum, **both providers mount**, and each calls `WalletConnect.init()` in their own way.
* *Wagmi Behavior:* A recent wagmi update (`v2.15.x`) introduced a bug where WalletConnect might initialize multiple times. This might exacerbate the double-init if SSR is enabled or if connectors re-mount. (Community reports suggest pinning wagmi to 2.14.x as a temporary fix.)

In essence, the **dual wallet setup** caused two separate WalletConnect Core instantiations. The warning is a safeguard to prevent unexpected behavior (like duplicated event listeners or multiple WebSocket connections) from having multiple WalletConnect instances in one app.

## Isolation Strategy

To resolve this, we need to **isolate the two wallet connection systems** such that WalletConnect Core is initialized only **once** (or at least, never simultaneously in conflict). Key strategies include:

* **Single WalletConnect Instance:** Ideally, configure the app to use one WalletConnect **provider/instance** for both Ethereum and LUKSO. This might mean sharing the WalletConnect connector or client between the two systems. For example, one could initialize WalletConnect externally and have both Web3-Onboard and wagmi use that reference. (This is not straightforward, but conceptually the cleanest approach to avoid duplicates.)

* **Conditional Loading:** Load each wallet system **only when needed**. If a user never interacts with Ethereum features, the RainbowKit/wagmi context should not initialize (and vice versa for UP). This can be achieved with dynamic imports or context gates:

  * *Lazy Mounting:* For example, wrap the Ethereum provider in a Next.js dynamic import (`dynamic(() => import('...'), { ssr: false })`) that only renders on the client when an Ethereum-related component is present. Similarly, ensure the UP provider isn’t mounted unless a UP-gated component is in use.
  * *User Trigger:* Delay WalletConnect initialization until the user actually initiates a connection. Web3-Onboard already does this (init happens on first usage), but RainbowKit by default sets up connectors on load. You can configure wagmi connectors to instantiate on demand rather than at first paint.

* **Separate Contexts:** Ensure the two providers don’t overlap in a way that automatically triggers both. For example, you might restructure the providers as siblings rather than nesting:

  ```tsx
  <QueryClientProvider>
    <WagmiProvider ...>{/* Ethereum context & RainbowKit */}</WagmiProvider>
    <UniversalProfileProvider ...>{/* LUKSO context */}</UniversalProfileProvider>
    {/* ...rest of app... */}
  </QueryClientProvider>
  ```

  Then, for a page that needs both, you could conditionally render both context providers. This separation might help prevent any internal interference or timing issues from nesting. It also makes it clearer that the systems are independent.

* **Distinct Project IDs (if necessary):** Generally, one WalletConnect Project ID can be used for multiple chains/sessions in an app. However, if sharing an ID continues to cause conflicts, you **could register a second Project ID** – one for LUKSO and one for Ethereum. This way, each system talks to WalletConnect Cloud with its own key. This is not typically required, but it might isolate the internal state. (Be aware that using two IDs means two separate sets of pairing sessions – not a big issue, but a user might have to approve two WalletConnect sessions if both are used.)

The goal is that **only one WalletConnect Core** is active at a time. Either we ensure one library’s WalletConnect functionality is disabled, or we orchestrate their loading so that a second init call is never made.

## Recommended Solution

**Solution: Use a Unified WalletConnect Connector for Both Systems**

The most robust, production-ready approach is to configure **one WalletConnect connector and share it** across the two wallet systems. Here’s how you can implement this step-by-step:

1. **Create a Single WalletConnect Connector Instance:** Instead of relying on RainbowKit’s internal walletconnect connector and Web3-Onboard’s internal handling, manually create a WalletConnect **universal provider** at a top level. For example, you can use the WalletConnect SDK directly or via wagmi’s connector:

   ```typescript
   import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';

   const walletConnectConnector = new WalletConnectConnector({
     options: {
       projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
       qrcode: false // We'll handle QR code via RainbowKit or Onboard UI
     }
   });
   ```

   This will instantiate the WalletConnect client once. You might place this in a module that both providers can import. Ensure this runs **client-side only** (use a check like `if (typeof window !== 'undefined')` around it, since WalletConnect needs browser environment).

2. **Configure RainbowKit/wagmi to Use the External Connector:** Instead of `getDefaultConfig`, create a custom wagmi config with only the connectors you want. For example:

   ```typescript
   const connectors = [
     walletConnectConnector,
     // ... other connectors like InjectedConnector, etc.
   ];
   const wagmiConfig = createConfig({
     autoConnect: true,
     connectors,
     publicClient: configureChains([mainnet], [publicProvider()]).publicClient
   });
   ```

   Provide this `wagmiConfig` to your `<WagmiConfig>` provider (note: `WagmiProvider` in your code likely wraps WagmiConfig). This way, RainbowKit will use the `walletConnectConnector` instance you supplied rather than creating its own. In RainbowKit’s `<RainbowKitProvider>`, ensure you pass the same connectors (it can derive from wagmi’s config automatically or accept a connectors prop).

3. **Configure Web3-Onboard to Disable Its WalletConnect:** Since you only use **injected()** wallets for LUKSO currently, Web3-Onboard might not be creating a WalletConnect instance at all. Double-check that you haven’t included WalletConnect in the Onboard init. If you did (via `@web3-onboard/walletconnect` module), **remove it**. If in the future you need WalletConnect for LUKSO (say a mobile wallet that supports LUKSO), you can still use the **same WalletConnect universal provider**:

   * Blocknative’s Web3-Onboard may not have an API to accept an external WalletConnect instance easily. In that case, if WalletConnect for LUKSO is needed, consider using wagmi for LUKSO too (wagmi can be configured with custom chains like LUKSO and use the same walletConnectConnector for it).
   * For now, ensure `init({ wallets: [injected()], ... })` has no WalletConnect module. This keeps Web3-Onboard purely using browser wallets (Metamask) which avoids any call to WalletConnect Core on the LUKSO side.

4. **Prevent SSR Initialization:** Make sure WalletConnect is not initialized during server-side rendering. In Next.js, wrap the providers in a check or use `dynamic()` to import them client-side. For example, you might define your RainbowKit provider in a component that is imported with `ssr: false`. This ensures `walletConnectConnector` (and RainbowKit) only run on the browser. You’ve already done something similar with the “client-only rendering” fix – continue to ensure that any WalletConnect code runs post-hydration. This avoids the double-init (server + client) scenario completely.

5. **Testing the Setup:**

   * Start the app and open the console to verify the warning is gone. The WalletConnect Core should initialize only once (e.g., when the user opens a RainbowKit modal or triggers a connect).
   * Test connecting each wallet independently: LUKSO (UP) via Metamask and Ethereum via various options (Metamask, WalletConnect QR, etc.). Both should work without conflict.
   * Test connecting both wallets in a multi-gated post. The sequence might be: connect UP first, then connect Ethereum (or vice versa). Ensure that the second connection doesn’t produce any warnings or errors and that both remain functional.
   * If using separate Project IDs for testing, try with a single shared Project ID as well. Typically, one Project ID should suffice for multiple connections, and it simplifies WalletConnect Cloud management.

By following these steps, **WalletConnect Core is only initialized once** via the shared connector. RainbowKit and wagmi use that instance, and Web3-Onboard avoids creating its own. This removes the warning and any underlying conflict, while preserving both systems’ functionality.

## Configuration Changes

To implement the above solution, consider the following concrete changes in the codebase:

* **Wagmi/RainbowKit Config (`wagmiConfig`):**
  Replace the `getDefaultConfig` usage with a manual configuration:

  ```diff
  - import { getDefaultConfig } from '@rainbow-me/rainbowkit';
  + import { createConfig, configureChains } from 'wagmi';
  + import { publicProvider } from 'wagmi/providers/public';
  + import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
  ...
  - const wagmiConfig = getDefaultConfig({
  -   appName: 'Curia',
  -   projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  -   chains: [mainnet],
  -   ssr: true
  - });
  + const { publicClient } = configureChains([mainnet], [publicProvider()]);
  + const wagmiConfig = createConfig({
  +   autoConnect: false, // or true if you want to auto-reconnect
  +   connectors: [
  +     new WalletConnectConnector({
  +       options: { projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, qrcode: true }
  +     }),
  +     // You can also add the InjectedConnector for Ethereum here if desired:
  +     // new InjectedConnector({ options: { name: 'Browser Wallet', shimDisconnect: true }})
  +   ],
  +   publicClient
  + });
  ```

  Note: We enable `qrcode: true` on the WalletConnectConnector so RainbowKit can display the QR modal when users choose WalletConnect. The `InjectedConnector` for Ethereum can be added so RainbowKit shows the MetaMask option (RainbowKit’s default config was adding it automatically). Also, set `ssr: false` by simply not using `getDefaultConfig` (which defaults to `ssr:true`). With `createConfig`, wagmi will not do any client actions on the server.

* **RainbowKit Provider Setup:**
  Ensure your `<RainbowKitProvider>` is using the same connectors from wagmi. If you use the `RainbowKitProvider` without specifying connectors, it will by default use wagmi’s configured connectors. For clarity, you can do:

  ```jsx
  <RainbowKitProvider chains={[mainnet]}>
    {/* ...children... */}
  </RainbowKitProvider>
  ```

  The chains array is required for RainbowKit UI (so it knows what networks to show). We pass `[mainnet]` for Ethereum. RainbowKit will automatically use the wagmi connectors we defined (including our custom WalletConnectConnector).

* **Web3-Onboard (Universal Profile) Config:**
  Verify in `ConditionalUniversalProfileProvider` (or wherever you call `initOnboard`) that the wallets array does **not** include any WalletConnect module. It should remain:

  ```typescript
  const wallets = [ injected() ];
  const chains = [ luksoMainnet ];
  const onboard = init({ wallets, chains, appMetadata: {/*...*/} });
  ```

  If there is any mention of `walletConnect()` from `@web3-onboard/walletconnect`, remove it. Since LUKSO users will connect via an injected wallet (e.g., MetaMask configured for chain 42 or a specialized browser wallet), this won’t remove any functionality. Should you need WalletConnect for LUKSO later, you might integrate it differently (for instance, by adding a wagmi connector for LUKSO as well, or carefully initializing it in Onboard only when needed).

* **Provider Nesting / Loading:**
  Adjust the provider composition if necessary. One approach:

  ```jsx
  // app/providers.tsx or similar
  <QueryClientProvider client={queryClient}>
    {/*
      Only render Wagmi + RainbowKit providers on the client (no SSR)
    */}
    {typeof window !== 'undefined' && (
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={[mainnet]}>
          {children} {/* which might include UP provider as needed */}
        </RainbowKitProvider>
      </WagmiConfig>
    )}
  </QueryClientProvider>
  ```

  You could still keep `ConditionalUniversalProfileProvider` wrapping `children` if it doesn’t interfere. The key part is ensuring RainbowKit/Wagmi (and its WalletConnect connector) only mount on the client. If your `ConditionalEthereumProvider` was handling this logic, make sure it uses a dynamic import or similar client-side check. Likewise, ensure the UP provider doesn’t invoke `initOnboard` until on the client (Web3-Onboard usually handles this internally by not doing heavy work until a wallet connect is actually attempted).

By applying these configuration changes, we effectively **use a single WalletConnect core** and avoid double-initialization. The RainbowKit and wagmi setup becomes more explicit and under our control, and the Universal Profile system remains untouched except for confirming it isn’t instantiating WalletConnect.

## Alternative Approaches

There are a few alternative solutions worth considering, each with pros and cons:

* **A. Use Separate WalletConnect Project IDs:**
  *Pros:* Quick isolation – by giving Web3-Onboard and RainbowKit different `projectId`s, their WalletConnect instances won’t clash at the WalletConnect Cloud level. This may prevent the core from thinking it’s a duplicate (though not guaranteed if the library still uses a global singleton). It’s easy to set up a second free Project ID.
  *Cons:* This doesn’t truly eliminate two instances running; it just makes them independent. The warning might still appear if the WalletConnect library itself enforces a single instance globally. Also, users connecting via WalletConnect would see two separate session approvals (one per ID) if they use both wallets. It adds complexity in managing two project IDs long-term.
  *Use case:* Consider this if sharing one ID absolutely causes conflicts and a quick fix is needed, but plan to unify the instances eventually.

* **B. Single Library for Both Chains:**
  Instead of two separate wallet frameworks, use one to handle both Ethereum and LUKSO:

  * *RainbowKit/Wagmi for LUKSO:* Wagmi is chain-agnostic and can be configured with custom chains. You could add LUKSO’s chain configuration (chain ID 42 with RPC, etc.) to wagmi’s chains. Then RainbowKit’s wallet modal could connect to LUKSO via MetaMask or WalletConnect. This would unify wallet management entirely under wagmi, with one WalletConnect context for both networks.
    *Pros:* Simplifies the architecture (one provider system). RainbowKit UI for both, and wagmi’s hooks for both networks. Only one WalletConnect core used.
    *Cons:* Web3-Onboard’s Universal Profile integration and features (if any) would be lost; you’d have to implement UP interactions with raw ethers/wagmi. Also, RainbowKit might not natively list LUKSO in its UI (you might need to provide custom text/icon for it). There’s some development overhead to replicate any specialized UP logic from the onboard library.
  * *Web3-Onboard for Ethereum:* Conversely, you could use Web3-Onboard for Ethereum as well, adding Ethereum mainnet to its chains and including WalletConnect and injected connectors for Ethereum. This would let Web3-Onboard manage both.
    *Pros:* Also simplifies to one system, and Web3-Onboard can handle multiple chains/connections at once (it supports multi-chain). You keep UP support and just extend onboard’s config.
    *Cons:* You’d lose RainbowKit’s polished UI and possibly some wagmi convenience. Web3-Onboard’s UI/UX might not be as sleek as RainbowKit for Ethereum users. Also, you’d still need to carefully manage WalletConnect modules (one instance for both chains within Onboard – which it is designed to handle, since Onboard can connect to multiple chains simultaneously through one modal).

  Both of these unification approaches remove the dual-core issue entirely by not having two separate WalletConnect initializations. However, they require more significant refactoring and testing. They might be worthwhile if maintaining two frameworks becomes too complex.

* **C. Upgrade/Downgrade Library Versions:**
  It’s worth noting that part of the double initialization issue may be due to a **bug in wagmi v2.15.x** and/or RainbowKit. The community has observed this and some pinned wagmi to v2.14.15 to avoid extra inits. Keep an eye on RainbowKit’s GitHub issue tracker (e.g., Issue #2372) for an official fix.
  *Pros:* If the warning is largely a wagmi bug, upgrading to a version with a fix (or temporarily downgrading) could alleviate it without architectural changes.
  *Cons:* This doesn’t address the fundamental scenario of two frameworks both potentially initializing WalletConnect – it might just hide the symptom. Also, relying on an older wagmi isn’t a long-term solution if you need new features or fixes.

* **D. Lazy Connect Buttons (No global providers):**
  A more radical alternative is not to initialize either WalletConnect core until a user explicitly clicks “Connect” on one of the wallets. In practice, this means not wrapping the app in providers that auto-init anything, but rather using hooks or modal triggers to initiate connections on demand. For instance, RainbowKit’s `ConnectButton` can be used without wrapping the whole app in `RainbowKitProvider` if you call `RainbowKitProvider` around that button only. Similarly, Web3-Onboard’s `connectWallet` function can be invoked without a permanent React context.
  *Pros:* Truly on-demand initialization — no WalletConnect core unless used. This could avoid any double init because you’d ensure one happens at a time (you could even detect if one wallet is already connected and reuse that session if possible).
  *Cons:* Loses the convenience of having global context providers (you’d manually manage connected state, or mount/unmount providers dynamically which is tricky). It could complicate state sharing across the app, since typically providers simplify that. This approach is generally not needed if we manage the providers correctly, but it's mentioned for completeness.

Among these alternatives, **unifying under one framework or one WalletConnect instance** is the most robust. Using separate project IDs (A) is more of a stop-gap if needed. Upgrading/downgrading (C) can be combined with the main solution to buy time, but the real fix is in architecture.

## Potential Risks and Considerations

When implementing the solution, keep in mind the following to avoid regressions or new issues:

* **Integration Bugs:** Combining connectors or customizing wagmi’s config means deviating from the “batteries-included” defaults. Be cautious about missing configuration – e.g., ensure you include **all necessary connectors** for a good UX. (RainbowKit’s default had MetaMask, WalletConnect, Coinbase Wallet, etc. If you only add WalletConnect, you might inadvertently drop MetaMask from the Ethereum options. Add an `InjectedConnector` for Ethereum to retain browser wallet support in RainbowKit.)
* **Session Persistence:** A single WalletConnect instance for both systems means that if a user connects via RainbowKit WalletConnect, that session might also be accessible to Web3-Onboard (if it were looking for it). Usually this is fine or even desirable, but test that disconnecting one doesn’t unexpectedly disconnect the other. Generally, WalletConnect v2 can manage multiple sessions or chain contexts in one core client. Just ensure your code handles disconnection events appropriately (e.g., if the user disconnects their WalletConnect in RainbowKit, the UP context should be aware if it was using the same session).
* **Multiple Wallet Connections:** Our multi-category scenario expects the user to possibly have two wallets connected (one for LUKSO, one for Ethereum). With the new setup, verify that having two active connections is handled gracefully. For instance, Web3-Onboard might store the LUKSO injected wallet connection and wagmi stores the Ethereum connection. They’re separate, which is good. If using one WalletConnect for both, ensure that doesn’t confuse either library’s state. In testing, connect with Wallet A on LUKSO and Wallet B on Ethereum via WalletConnect and confirm each context only uses its intended wallet.
* **Future Chain Support:** The solution should be future-proof for adding more chains. WalletConnect v2 is built for multi-chain, so leveraging one core for more networks is expected to work. If you plan to add another blockchain (say Polygon or another EVM chain), you can add it to wagmi connectors easily. If adding a non-EVM chain or something like a second Universal Profile network, consider how it fits in – ideally through the same wagmi multi-chain setup or a similarly isolated context. Stick to the pattern of **one WalletConnect Core** in the app.
* **Performance:** Initializing WalletConnect (especially with QR modal) can be slightly heavy. By lazy-loading and single-instancing it, we actually improve performance (no duplicate websockets, etc.). Just double-check that the initial load of the app isn’t significantly delayed by the inclusion of the wagmi RainbowKit (perhaps load it after user login or when needed). Next.js dynamic import can help keep initial bundle lighter by splitting the wallet code out until required.
* **Maintaining UP Functionality:** The Universal Profile system is special (LUKSO’s standards around profile and keys). Ensure that by not using WalletConnect in Web3-Onboard, you aren’t limiting some UP feature. If the UP library expects WalletConnect for something (it likely doesn’t unless you wanted to connect a mobile LUKSO wallet), then consider that. So far it appears the UP context is satisfied with injected wallets.

By addressing these considerations, you minimize the risk of breaking existing functionality. The end result will be a **clean separation of the two wallet systems with no shared singletons** stepping on each other, thereby eliminating the WalletConnect double-initialization warning and any related unpredictable behavior. This approach retains the full capability of both systems – users can connect their Universal Profile and their Ethereum wallet (via MetaMask, WalletConnect, etc.) as needed, even simultaneously, without conflicts.
