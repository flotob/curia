Great, I’ll dig into how to directly connect to the Universal Profile browser extension using the latest tools like wagmi v2, and I’ll explore the exact JavaScript methods required for targeted extension selection. I’ll also look into whether connecting to the UP mobile app is feasible.

I’ll provide working detection and connection code, a breakdown of wagmi’s limitations here, and recommendations for the best architecture to support multiple wallets with UP integration.

I’ll let you know as soon as the findings are ready.


# Universal Profile Extension JavaScript API (Injection & Detection)

The LUKSO Universal Profile (UP) Browser Extension injects an **EIP-1193** provider into the page, similar to MetaMask. Importantly, it exposes a global `window.lukso` object for backward compatibility. If your dApp doesn’t implement the new multi-wallet standard, you can detect the extension simply by checking for `window.lukso`’s presence. The extension also supports **EIP-6963** (Multi-Injected Provider Discovery), meaning it will announce itself to dApps that listen for the `eip6963` events and possibly populate a list of providers. In practice, the extension *does not override* `window.ethereum` when another wallet is present – instead it provides its own object and participates in EIP-6963 events (so multiple wallets can coexist). The UP extension’s provider implements standard Ethereum provider methods (`request`, `on`, etc.) for JSON-RPC calls. It **supports** `eth_requestAccounts` for connection, emits `accountsChanged`/`chainChanged` events, and likely has an identifier flag (for example, it defines **`window.lukso`** and may set a property internally to identify itself, e.g. `provider.isLukso` or similar). In summary, **to detect** the UP extension in JavaScript, check for its injected object as shown below, or use EIP-6963 provider discovery if available:

```javascript
// Detecting the LUKSO Universal Profile extension
if (typeof window !== 'undefined' && window.lukso) {
  console.log('UP extension detected');
  // e.g. we could further check a flag: window.lukso.isUniversalProfile (if it exists)
}
```

> **Note:** LUKSO’s docs confirm that `window.lukso` can be used for detection when EIP-6963 isn’t implemented. With EIP-6963, the extension will also broadcast an `"eip6963:announceProvider"` event containing its provider and info (name `"Universal Profiles"`, icon, etc.), which advanced dApps can use to list all available wallets. However, a simple check of `window.lukso` is sufficient to know the extension is installed.

## Direct Connection Methods (How to Trigger UP Extension Connect)

To prompt the Universal Profile extension’s connection modal (i.e. the account access prompt), you use the **same EIP-1193 request flow as other wallets**. In practice, **calling `eth_requestAccounts` on the UP extension’s provider** will trigger its UI to ask the user for permission. There is no proprietary method needed – it adheres to the Ethereum provider standard. For example, if the extension is present, you can call:

```javascript
// Raw JavaScript to connect specifically to the UP extension
const connectToUP = async () => {
  if (!window.lukso) {
    console.warn('Universal Profile extension not installed');
    return;
  }
  try {
    const accounts = await window.lukso.request({ method: 'eth_requestAccounts' });
    console.log('Connected UP account:', accounts[0]);
    // accounts[0] will be the user's UP address if they approved
  } catch (err) {
    console.error('Failed to connect to UP extension:', err);
  }
};
```

This will explicitly target the UP extension’s provider and open its connect prompt (instead of inadvertently switching a different wallet). Under the hood, the extension handles `eth_requestAccounts` the same way MetaMask does (showing a popup to grant account access). If your dApp also needs to ensure the user’s network is correct (LUKSO vs Ethereum, etc.), you might follow up by checking `window.lukso.request({ method: 'eth_chainId' })` or calling a chain switch if needed – but the key step to **open the extension’s modal is the `eth_requestAccounts` call on `window.lukso`**. There are no special UP-specific RPC methods for connecting; use the standard EIP-1102 flow.

## Wagmi vs. Barebones Approach (Connecting to UP Specifically)

**Wagmi’s InjectedConnector** by default will attach to the first available injected provider – usually MetaMask – which is problematic if multiple wallets are installed. In a multi-wallet scenario, **the “first to inject window\.ethereum wins”**, so wagmi might end up using MetaMask’s provider (and simply switching its network to LUKSO) instead of opening the UP extension. This is why your current wagmi approach was failing – clicking “Connect Universal Profile” likely just switched the network on whichever wallet `window.ethereum` pointed to (MetaMask/Rabby), rather than invoking the UP extension UI. Even when you tried using wagmi’s `injected({ target: window.lukso })`, it may not have been configured correctly or the extension’s provider wasn’t picked up, causing a fallback to the default provider.

**Can wagmi target the UP extension?** Yes, but it requires configuring a custom target or connector. Wagmi v2 introduced support for **EIP-6963 multi-wallet discovery** via a `multiInjectedProviderDiscovery` flag in `createConfig`. When enabled, wagmi will listen for all injected providers and let you choose. Additionally, wagmi’s `injected()` connector accepts a **`target` option** where you can specify exactly which global provider to use. For example, you can provide a function that returns `{ id: 'lukso', name: 'Universal Profile', provider: window.lukso }` to explicitly select the UP extension’s provider object:

```typescript
// Wagmi InjectedConnector targeting the UP extension specifically
import { createConfig, configureChains } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { luksoChain } from './chains';  // your LUKSO chain definition

const { chains, publicClient } = configureChains(
  [luksoChain],  // e.g. LUKSO testnet/mainnet chain config
  [/* ... RPC provider ... */]
);

const upConnector = injected({
  // Only use the UP extension provider if available
  target() {
    if (typeof window !== 'undefined' && window.lukso) {
      return {
        id: 'universalProfiles', 
        name: 'Universal Profiles', 
        provider: window.lukso
      };
    }
    return undefined;
  },
  shimDisconnect: true
});

export const wagmiConfig = createConfig({
  connectors: [upConnector],
  publicClient,
  chains,
  // Enable multi-wallet discovery to support EIP-6963 (optional)
  multiInjectedProviderDiscovery: true
});
```

In the above, we define a custom injected connector that **targets `window.lukso`** if it exists. This ensures wagmi calls `window.lukso.request(...)` for connections, thereby opening the correct extension. If the extension isn’t present, `target()` returns undefined, and wagmi would fall back to other connectors (or you can include a standard MetaMask connector as a separate option).

**Why wagmi might still be tricky:** Wagmi doesn’t natively distinguish “UP extension” out of the box; you either have to rely on `multiInjectedProviderDiscovery` to enumerate all wallets or manually create a connector as above. Many developers report that using multiple injected wallets with wagmi is not straightforward without such customization. If speed and reliability are critical, you might consider bypassing wagmi’s abstractions for the UP extension and using the provider directly (or using a different library as discussed below). In summary, wagmi *can* handle the UP extension, but it requires careful setup. Your previous approach likely failed because wagmi was still using `window.ethereum` (MetaMask) instead of `window.lukso`, resulting in network switching on the wrong wallet rather than a proper connect prompt.

## Multi-Wallet Conflict Resolution (Selecting UP from Many)

When users have MetaMask, Rabby, **and** the UP extension all installed, you need to **disambiguate** and target the correct provider. The UP extension’s presence is unique in that it provides `window.lukso`. In a simple approach, you can prefer `window.lukso` over other providers if the user explicitly clicks “Connect Universal Profile.” For example:

```javascript
// Select the UP provider among multiple installed wallets
const selectUPProvider = () => {
  if (typeof window === 'undefined') return null;
  
  // If multiple providers array exists (EIP-6963 or Coinbase style):
  if (window.ethereum && Array.isArray(window.ethereum.providers)) {
    // Look for a provider that identifies as LUKSO/Universal Profile
    const upProv = window.ethereum.providers.find(p => 
      // Some wallets set custom flags; check known flags or window.lukso reference
      p === window.lukso || p.isLukso || p.isUniversalProfile
    );
    if (upProv) return upProv;
  }
  // Fallback: if the extension injects window.lukso separately
  if (window.lukso) return window.lukso;
  
  return null; // UP extension not found
};
```

In the above snippet, we first check if `window.ethereum.providers` exists – some wallet implementations (like Coinbase Wallet) populate this array with multiple providers when more than one extension is present. If so, we try to find an entry that matches the UP extension (it might be exactly `window.lukso` or have an `isLukso` flag – the exact flag depends on the extension’s implementation). If no such array or match is found but `window.lukso` is defined, we use that directly. Essentially, this ensures that if the user has multiple wallets, we **specifically grab the UP extension’s provider** instead of the default one.

> **EIP-6963 approach:** A more robust method is to leverage EIP-6963 events. You can dispatch `window.dispatchEvent(new Event('eip6963:requestProvider'))` and listen for `"eip6963:announceProvider"` events to get a list of all wallets (with details like name and an actual provider object). For example, when the UP extension is installed, it will emit an announce event with `event.detail.info.name === 'Universal Profiles'`. You could use that to identify its provider. The LUKSO team’s EIP-6963 demo dApp shows creating a list of detected providers and letting the user pick one, then calling `provider.request({ method: 'eth_requestAccounts' })` on the chosen provider. This standards-based approach avoids hard-coding global variables and works for any number of injected wallets. However, it’s a bit more involved to implement from scratch – hence using the quick `window.lukso` check as above is a reasonable shortcut if you only need to target the UP extension.

## Real-World Implementation Examples (Connecting to UP Extension)

**1. LUKSO’s Example dApps and Boilerplates:** The LUKSO team provides sample code that handles both the UP extension and other wallets. For instance, their **dApp boilerplate** uses a context that tries `const provider = window.lukso || window.ethereum` to get whichever provider is available. This means if the UP extension is installed, it prioritizes that. They also integrate with Blocknative’s **Web3-Onboard** library via a custom module for the UP extension. In the boilerplate, you’ll see they import `luksoModule` from `@lukso/web3-onboard-config` and include it as a custom wallet in the onboard configuration. The logic behind that module is to detect the UP extension and list it as "Universal Profiles" in the wallet selection UI (even offering a direct link to install it if not found). This is a clean solution in production – users can choose “Universal Profiles” from a wallet list and the library will handle calling `window.lukso` under the hood.

**2. Universal Profile Explorer (universaleverything.io):** While we don’t have their source code, it’s likely they followed LUKSO’s recommendations. Given LUKSO published the web3-onboard integration, many LUKSO dApps use it to support the UP extension alongside MetaMask. The pattern would be: use a multi-wallet connect modal (Onboard or similar) with **“Universal Profiles”** as an option. On selection, it attempts to connect via the UP extension’s provider. If you inspect such dApps, you’d see that clicking their “Connect UP” triggers `eth_requestAccounts` on the UP provider (which in turn opens the extension popup). In short, successful LUKSO dApps either use a library that supports multi-injected providers (Onboard, Wagmi with EIP-6963, etc.) or implement a custom detection as we’ve outlined.

**3. LUKSO’s EIP-6963 Demo:** On LUKSO’s GitHub, the **example-eip-6963-test-dapp** shows how to discover multiple wallets. It demonstrates that **the UP extension announces itself via EIP-6963** and how to handle it. The code maps each discovered provider to a button labeled with the wallet name and icon. When the user clicks the “Universal Profiles” button in that demo, it runs `provider.request({ method: 'eth_requestAccounts' })` for the UP extension’s provider. That exactly results in the UP extension’s connection modal appearing. This example confirms that using the standard connect call on the right provider object is the way to go.

In practice, **your dApp can mimic these approaches**: either integrate an off-the-shelf solution or implement the logic yourself. For a quick solution, using `window.lukso` directly (as shown earlier) is effective. For a more polished solution, consider using the **Web3-Onboard** library or RainbowKit with a custom connector, so that users can choose between MetaMask and UP extension smoothly.

## LUKSO’s Official Recommendations

LUKSO’s official documentation and tools suggest developers **support the UP extension via standard wallet libraries**. Notably, LUKSO provides `@lukso/web3-onboard-config`, which is a module to easily add the Universal Profile extension to Blocknative’s Web3-Onboard library. This module will: (a) detect if the UP extension is present, (b) label it as "Universal Profiles" in the connect UI, (c) use `window.ethereum` or `window.lukso` as needed to establish the connection, and (d) even redirect the user to install the extension if they don’t have it. In their example usage, they initialize the custom wallet module and include it in the injected wallets list, ensuring the UP extension shows up as a top option. They also specify LUKSO chains (L14 testnet, L16, or mainnet IDs) in the configuration so that the extension is operating on supported networks. The takeaway is that **LUKSO encourages using recognized patterns** (either multi-wallet standards or curated integrations) rather than writing a lot of ad-hoc code. This ensures future compatibility as the extension and standards evolve.

Additionally, Fabian Vogelsteller (LUKSO co-founder) has advocated for multi-wallet standards; the UP extension is built to be **a “good citizen” in the Ethereum wallet ecosystem** by not clobbering `window.ethereum`. Therefore, adopting **EIP-6963** in your dApp is a forward-looking move. If you use wagmi, enable `multiInjectedProviderDiscovery`. If you prefer a UI library, use the LUKSO Onboard config or similar. These approaches handle the complexities for you. LUKSO’s docs explicitly state that while you *can* use `window.lukso` directly for detection now, adding EIP-6963 support will “improve the user experience for multiple installed wallets”.

Finally, LUKSO has also released a **Universal Profiles mobile app** (currently in beta). That mobile wallet likely doesn’t inject a provider into the browser like an extension. Connecting to it would require WalletConnect or a deep link mechanism (separate from the browser extension logic). This is outside the scope of the browser extension, but keep in mind that a user on mobile might prefer using the mobile UP app – in which case integrating a wallet connector (WalletConnect) that supports LUKSO might be needed in the future.

## Putting It All Together – Recommended Solution

1. **Detect the UP Extension:** Use `if (window.lukso)` to determine if the extension is installed. This prevents falling back to MetaMask when the user specifically wants to use their Universal Profile.
2. **Connect on User Action:** When the user clicks “Connect Universal Profile”, call `await window.lukso.request({ method: 'eth_requestAccounts' })`. This opens the UP extension’s authorization modal for account access. Handle the Promise it returns to get the selected account.
3. **Handle Multiple Wallets:** If MetaMask or others are present simultaneously, ensure you select the correct provider. The simplest way is to *explicitly use* `window.lukso` (since MetaMask doesn’t provide that). If you want to be thorough, check `window.ethereum.providers` or use EIP-6963 events to identify the UP extension’s provider among many. This avoids the issue of the wrong wallet responding.
4. **State Management:** Once connected, you can store the returned account in your React state/context and mark the user as “connected with UP”. The UP extension will behave like any Ethereum provider – you can use it with web3 libraries (web3.js, ethers, etc.) by passing `window.lukso` as the provider (for example, `new Web3(window.lukso)` as seen in LUKSO’s examples).
5. **Wagmi Integration (optional):** If you prefer to stick with wagmi, implement a custom connector or use wagmi’s config to target the UP extension specifically. Ensure `multiInjectedProviderDiscovery` is on, so wagmi knows about multiple wallets. You might still provide a UI for the user to pick which wallet to connect (since wagmi by itself won’t automatically know the user wants the UP extension without input).
6. **Alternative Libraries:** Consider using **Web3-Onboard** with LUKSO’s module. This gives you a polished modal where “Universal Profiles” is one of the options, and it handles installation prompts and network switching gracefully. LUKSO’s official guide and boilerplate demonstrate how to set this up easily.

By implementing the above, clicking “Connect Universal Profile” will reliably open the correct extension instead of toggling another wallet. In summary, your wagmi approach failed due to multi-wallet conflicts, but by directly targeting `window.lukso` (or using a multi-wallet aware library), you can achieve the desired UX where the UP extension’s modal appears as expected. The solution is to **lock onto the UP provider** when needed and leverage standards (EIP-6963) or official tools to handle the edge cases. This approach has been validated by LUKSO’s own examples and community best practices.
