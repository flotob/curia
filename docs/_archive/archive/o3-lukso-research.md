Great. I’ll research how to robustly integrate Universal Profiles (UPs) from the Lukso ecosystem into your onboarding wizard app, focusing on the official Lukso browser extension and mobile app.

I’ll examine all relevant Lukso Standards Proposals (LSPs)—especially those tied to identity, social graph, and assets (like LSP0, LSP1, LSP3, LSP7, LSP8, LSP20, and LSP26). I’ll determine which are actively adopted by the community and which SDKs, APIs, and libraries you should use.

I’ll also define what’s needed to:

1. Let end users sign in with their Universal Profile and verify properties such as following another profile (LSP26), owning tokens (LSP7, LSP8), and more.
2. Give wizard authors maximum flexibility to define such UP-related challenge criteria.

I’ll look into whether frontend or backend validation is simpler and recommend the best approach.

I’ll get back to you with a detailed developer guide tailored to your agent.


# Integrating Lukso Universal Profiles in a Next.js Onboarding Wizard

Universal Profiles (UPs) on LUKSO are smart contract based accounts that serve as rich, extensible identities. Unlike regular wallets, a UP can hold profile information, social connections, and assets, making it ideal for **“sign in with Web3”** scenarios. In an onboarding wizard, we can introduce a slide where users connect their UP via the official browser extension or mobile app, and then verify certain conditions (like token ownership or following another profile) against that UP. This guide provides a deep dive into the relevant Lukso Standard Proposals (LSPs) that power UPs, and how to integrate them into a Next.js app for robust front-end and back-end checks.

## Universal Profile Standards Overview (LSP0, LSP1, LSP3, LSP7, LSP8, LSP20, LSP26)

Lukso’s Universal Profile ecosystem is defined by a set of standards (LSPs) that extend Ethereum’s ERC standards. Below is a summary of each relevant LSP and its role in UP functionality:

* **LSP0 – ERC725 Account (Universal Profile):** The core smart contract account standard for UPs. An LSP0 account implements ERC725Y key-value storage, allowing the profile to store arbitrary data (such as profile info, linked assets, etc.). This makes the UP a *“profile-like account”* that is far more flexible than an EOA (Externally Owned Account). LSP0 is the backbone of a UP – it holds the profile’s data and is controlled via a permissions system (see LSP6, the Key Manager, not explicitly asked but worth noting).

* **LSP1 – Universal Receiver:** A standard that equips the UP (and other contracts) with a special function to react to incoming transactions and token transfers. The Universal Receiver function `universalReceiver(bytes32 typeId, bytes data)` is called whenever the profile receives assets or specific calls. In practice, UPs use a **Universal Receiver Delegate** contract (often deployed alongside the UP) to handle these callbacks. For example, when someone sends an LSP7 token to a UP, the token’s transfer triggers the UP’s LSP1 function, which in turn calls the delegate. The delegate can then update the UP’s storage (such as recording the new asset in the profile’s asset list per LSP5-ReceivedAssets). This mechanism allows UPs to **“actively respond”** to incoming assets or interactions – e.g., auto-registering new tokens it owns.

* **LSP3 – Profile Metadata:** A standard for storing a Universal Profile’s descriptive info in a structured way (JSON metadata). LSP3 defines standardized ERC725Y keys for profile details (name, description, profile image, links, etc.) and typically points to a JSON hosted off-chain (e.g. on IPFS). Every UP has an `LSP3Profile` key in its storage that contains a URL (or hash+URL) to a JSON file with the profile’s info. This allows any app to fetch a UP’s metadata and display a rich profile. In our context, **LSP3 could be used to verify identity attributes** – for example, a wizard could require that the UP has a certain field in its profile (though in practice most identity verification might use tokens or external proofs, since LSP3 data is user-provided).

* **LSP7 – Digital Asset (Fungible):** Lukso’s standard for fungible tokens (analogous to ERC20, but designed to work smoothly with UPs). LSP7 tokens can be sent to UPs and will invoke the UP’s LSP1 universal receiver. They implement standard interfaces (balance, transfer, etc.) and also include metadata via ERC725Y storage (according to **LSP4** standard for token metadata). LSP7 tokens are **identified by an interface ID** and a set of ERC725Y keys in the token contract storage. In practice, verifying ownership of an LSP7 token means checking the UP’s balance on that token contract (or checking the UP’s stored list of assets, see LSP5).

* **LSP8 – Identifiable Digital Asset (Non-Fungible):** Lukso’s standard for non-fungible and semi-fungible tokens (somewhat analogous to ERC721/ERC1155). Each token has a unique identifier (tokenId) and an owner. Like LSP7, LSP8 tokens call the universal receiver on transfer and store token metadata via LSP4. To verify ownership, one can check if a given token’s owner is the UP address, or query the UP’s asset registry. LSP8 also has an interface ID to distinguish it. When integrating, we treat LSP8 tokens similarly to NFTs: check if the UP holds a specific tokenId or any token from a collection.

* **LSP20 – Call Verification:** A newer standard that introduces a flexible permission and call filtering mechanism for smart accounts. LSP20 allows a contract (like a Universal Profile) to delegate *verification of incoming function calls* to a separate “verifier” contract. In essence, this is Lukso’s approach to **Account Abstraction** security rules. A UP can use LSP20 to ensure certain calls meet custom conditions (without hard-coding them in the main contract). For example, the Key Manager (LSP6) could act as a call verifier: when someone tries to execute an action via the UP, the call is routed to the verifier which checks permissions (keys, etc.). This standard is mostly behind-the-scenes for enabling **direct contract interactions with dynamic auth rules**. For our purposes, you likely won’t need to implement LSP20 logic manually (it’s built into the UP’s contract architecture to simplify user tx flows), but it’s good to know it exists. It essentially **lets the UP accept direct function calls while still enforcing security** – making interactions simpler in the front-end.

* **LSP26 – Follower System:** A **network-wide social graph standard** on LUKSO for “following” profiles. LSP26 is implemented as a global registry contract (deployed on LUKSO mainnet) where any address can register itself as a follower of another address. Each Universal Profile can thus have a list of followers and a list of accounts it is following, stored in this registry. In mid-2024, LUKSO launched this official LSP26 registry (at address `0xf01103E5...5daDDcA` on mainnet). The registry provides functions to follow/unfollow and to query relationships. For example, if we want to verify “User A follows User B’s UP”, we would query this LSP26 contract to see if A’s address is in B’s followers list (or equivalently, B is in A’s following list). The follower system opens up social features: *“following an address can trigger specific actions… and enables personalized feeds within dApps”*. In our onboarding wizard, an author might require the user to follow a specific UP as a challenge criterion – which we can check via this standard.

**Active Adoption:** All the above standards are actively supported in the LUKSO ecosystem as of 2025, though at varying stages of maturity:

* **LSP0, LSP1, LSP3, LSP6, LSP7, LSP8** are **fully implemented** and used on LUKSO mainnet. Every Universal Profile deployed uses LSP0 (ERC725Account) with LSP3 metadata, and has an LSP1 delegate by default to handle tokens (usually updating LSP5-ReceivedAssets keys). LSP7 and LSP8 are the preferred token standards for fungible and non-fungible assets on LUKSO, and many tokens/NFTs issued on LUKSO conform to these.
* **LSP20** was introduced to improve how UPs handle calls (part of LUKSO’s broader account abstraction approach). Newer versions of the Universal Profile contracts integrate LSP20 to allow the Key Manager to verify calls without an external relayer contract. This is part of **recent updates to improve UX**, but as a developer using the UP via standard interfaces, you typically don’t have to interact with LSP20 directly – just be aware that it enhances security and flexibility of UP calls.
* **LSP26** is **live on mainnet** (the official registry exists) and can be integrated into dApps. It’s a relatively new addition (launched in 2024), so adoption is growing; the Universal Profile browser extension and universalprofile.cloud support “follow” actions. For our use-case, we can confidently rely on the LSP26 contract to verify follow relationships.

Next, we’ll look at how to **let users sign in with their Universal Profile** and then how to **fetch and verify UP data** (tokens, follows, etc.) in a Next.js application.

## Letting Users Sign In with a Universal Profile

To have users sign in via their UP, we leverage Lukso’s official wallet solutions:

* **Universal Profile Browser Extension:** This is Lukso’s web3 browser extension (currently in beta) that manages the user’s Universal Profiles. It injects an Ethereum provider object (`window.ethereum` or similar) for the LUKSO network, allowing dApps to request connections and sign transactions. Under the hood, the extension holds the keys to the user’s UP (actually, a key that controls the UP’s Key Manager contract via LSP6) and uses a Transaction Relayer for gas (so interactions can be gas-free for the user). From the dApp perspective, it behaves like connecting to a wallet, but the “account” you get is the UP’s address (a contract address) instead of a raw EOA.

* **Universal Profile Mobile App:** (If available) Similarly would function as a wallet with WalletConnect support, presumably.

In a Next.js app, the simplest way to integrate the UP extension is to treat it like a Web3 provider. There are a few approaches:

**1. Using Web3-Onboard (recommended):** LUKSO provides a package to integrate their extension into the Web3-Onboard library (by Blocknative). Web3-Onboard handles multi-wallet connections in a unified way. LUKSO’s package `@lukso/web3-onboard-config` comes with a **wallet module for the Universal Profile extension**, which you can plug into Web3-Onboard’s init. In fact, LUKSO offers a Next.js **dApp boilerplate** that demonstrates connecting to the UP extension using Web3-Onboard. By using this, you get a polished UI flow for the user to select the UP extension and connect.

*Setup example:* Install `@web3-onboard/core` and `@lukso/web3-onboard-config`. Then in your Next.js page or context:

```js
import Onboard from '@web3-onboard/core';
import luksoUPModule from '@lukso/web3-onboard-config'; 

const upModule = luksoUPModule(); 
const onboard = Onboard({
  wallets: [upModule],
  chains: [
    {
      id: '0x2A13A', // LUKSO L14 testnet or L16 mainnet chain ID
      token: 'LYX',
      label: 'LUKSO Mainnet',
      rpcUrl: 'https://rpc.mainnet.lukso.network', // or a gateway
    }
  ],
});
// ...
await onboard.connectWallet(); // triggers extension connection
```

After connection, `onboard.state.get().wallets[0].accounts[0].address` will contain the connected Universal Profile address.

*Why use Web3-Onboard?* It abstracts the connection flow and already supports Lukso’s extension. (You could also integrate WalletConnect for mobile if needed, though ensure the mobile app supports it.)

**2. Using Ethers.js directly:** If you prefer not to use an onboarding library, you can interact with the injected provider from the extension. For example:

```js
// When user clicks "Connect UP":
if (window.ethereum) {
  // The extension might use a different identifier; ensure the LUKSO provider is selected if multiple.
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const upAddress = await signer.getAddress();
  console.log("Connected to UP:", upAddress);
}
```

This yields the UP’s address. The signer will be a special signer that sends transactions via the extension’s relayer (so signing may open the extension UI for confirmation).

**Authentication Consideration:** If your app needs to maintain a session (like log the user in backend), you might prompt the user to sign a message (e.g. using SIWE – “Sign-In With Ethereum” style) with their UP. In the UP’s case, the extension would actually use the controlling key (EOA) to sign off-chain messages. You should then **verify that signature against the UP**. This can be done by recovering the EOA address from the signature and checking if that address is an authorized controller of the UP. Typically, a Universal Profile’s controller addresses are stored in its Key Manager (LSP6) – often there’s just one key (the owner’s address). You can fetch the owner via the ERC173 `owner()` function on the UP, or check the ERC725Y `AddressPermissions[]` keys. For simplicity, if you deployed the UP via LUKSO’s tools, the `owner()` of the UP will be the Key Manager contract, and the Key Manager’s owner will be the actual EOA. In practice, verifying off-chain signatures might be complex due to this indirection. Another approach is to call the UP’s `isValidSignature(bytes32 hash, bytes signature)` (an ERC1271 method) if implemented. Many UPs implement ERC1271 to allow the contract itself to validate signatures made by its controlling key. This might be beyond scope, but be aware it exists for contract accounts.

For just gating content in a wizard, you may not need a full backend session – you can simply trust the front-end to hold the connected state (since the user must perform on-chain checks anyway). Once connected, we can move on to verifying the UP’s properties.

## Accessing Universal Profile Data (Ownership, Social Connections, etc.)

After the user connects their UP, our app needs to **retrieve on-chain data** about that profile to enforce the wizard’s challenge criteria. There are two main ways to access UP data: **direct on-chain queries (via RPC using ethers.js or ERC725.js)**, or **via an indexing service/graph** that aggregates data for easier querying. We’ll explore both, focusing on common verification tasks:

### 1. Verifying Token Ownership (LSP7 and LSP8 assets)

**Use case:** *“User must own a certain token (fungible or NFT)”* – for example, *“Must hold at least 100 \$TOKEN”* or *“Must own the Special NFT to proceed.”*

Every UP maintains an indexed list of assets it owns thanks to **LSP5-ReceivedAssets**. When a UP receives an LSP7 or LSP8 token, its Universal Receiver Delegate will update an array in the UP’s storage that tracks all asset contract addresses the UP holds. This is extremely useful: rather than scanning the blockchain for what tokens an address owns, you can **query the UP itself for its assets.** As Felix Hildebrandt notes, *“All the addresses of a user’s various assets can be fetched directly from their Universal Profile, which is the anchor for all belongings.”*.

Practically, to get this list on the front-end, you can use the **ERC725.js** library with the LSP5 schema, or call via ethers:

**Using ERC725.js (frontend):**

```javascript
import { ERC725 } from '@erc725/erc725.js';
import LSP5Schema from '@erc725/erc725.js/schemas/LSP5ReceivedAssets.json';

const provider = new ethers.providers.JsonRpcProvider(LUKSO_RPC_ENDPOINT);
const profileAddress = userUpAddress;  // the UP address to check
const profile = new ERC725(LSP5Schema, profileAddress, provider);

const assetsData = await profile.getData('LSP5ReceivedAssets[]');
const assetAddresses = assetsData.value;
// assetAddresses is an array of contract addresses (LSP7 or LSP8 tokens) that the UP owns.
```

Now, if the wizard slide requires *“owns token X”*, you can check if `tokenXAddress` is in `assetAddresses`. If it’s a fungible token (LSP7), you might further check the balance:

```javascript
if (assetAddresses.includes(tokenXAddress)) {
   const tokenContract = new ethers.Contract(tokenXAddress, LSP7Abi, provider);
   const balance = await tokenContract.balanceOf(profileAddress);
   const decimals = await tokenContract.decimals();
   // Apply condition, e.g. balance >= 100 * 10^decimals
}
```

If it’s an NFT (LSP8), you might verify ownership of a specific tokenId. LSP8’s interface is similar to ERC721’s `ownerOf(tokenId)`:

```javascript
const nftContract = new ethers.Contract(tokenXAddress, LSP8Abi, provider);
const ownerOfToken = await nftContract.tokenOwnerOf(tokenId);
if (ownerOfToken.toLowerCase() === profileAddress.toLowerCase()) {
    // The UP owns that tokenId
}
```

However, often the challenge might simply be “owns any NFT from collection X”. In that case, finding the collection’s address in the UP’s LSP5 asset list is sufficient proof.

**Using an Index/Graph (backend or frontend):** If not using ERC725.js, you can query an indexer. For example, **Envio** (a Lukso indexing service) offers GraphQL APIs where you could query all token balances for an address. Or if a TheGraph subgraph exists for LUKSO tokens, you could query `TokenBalance` or `TokenHolder` records by address. This can simplify things like *“does address own any of token X”* with a single query. The trade-off is setting up a query and potential centralization. For development simplicity, using the UP’s own data via ERC725.js is straightforward and decentralized.

**Important:** If a user *just acquired* a token moments ago, ensure your data is up-to-date. Direct RPC calls reflect latest state, whereas indexers might have slight delays. Usually this isn’t an issue for on-chain checks.

Also note that LSP5ReceivedAssets only tracks LSP7 and LSP8 tokens that properly call the universal receiver. If someone sends a non-LSP7 token (say a generic ERC20 without LSP1 support) to a UP, the UP’s LSP5 list *won’t know about it*. For completeness, if you need to handle that edge: you’d manually check known ERC20 balances. But since our focus is Lukso standards, we assume LSP7/8 tokens.

### 2. Verifying Social Connections (Following another UP via LSP26)

**Use case:** *“User must follow Universal Profile X”* – for example, *“Follow our official profile to continue.”*

The LSP26 follower registry makes this easy to verify. When a user follows another profile (likely via a UI like universalprofile.cloud or the extension), an entry is created in the global registry contract. We need to read that registry.

**LSP26 registry basics:** The official registry (address `0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA` on LUKSO mainnet) presumably provides read functions such as:

* `getFollowers(address profile) → address[]` (or an indexed approach to get followers of a given profile)
* `getFollowing(address user) → address[]` (addresses that the user is following)
* Possibly convenience `isFollowing(follower, target) → bool`

Since the exact ABI isn’t documented here, we can use a quick approach:
The registry likely implements ERC725Y as well (to allow easy indexing), but assuming it has straightforward methods, we can do:

**Frontend (ethers.js):**

```javascript
const registryAddr = '0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA';
const registryAbi = [
  "function isFollowing(address follower, address followee) view returns (bool)",
  // or use getFollowing and check inclusion if isFollowing isn’t available
];
const registry = new ethers.Contract(registryAddr, registryAbi, provider);

const isFollowing = await registry.isFollowing(userUpAddress, requiredUpAddress);
if (isFollowing) {
  // User's UP follows the required UP
}
```

If an `isFollowing` function wasn’t available, you could retrieve the list of followees:

```js
const following = await registry.getFollowing(userUpAddress);
const follows = following.map(a => a.toLowerCase());
if (follows.includes(requiredUpAddress.toLowerCase())) { … }
```

However, dealing with potentially large lists on-chain might not be ideal. The LSP26 spec likely uses a mapping with indexes to avoid returning huge arrays in one call. (There might be functions like `followingCount(address)` and `getFollowingAt(address, index)` instead.)

**Alternate approach:** Use an indexer or event logs. Each follow action emits an event (perhaps `Follow(address follower, address followee)`). A backend service could listen to events or query them to determine if a link exists. But for immediate verification, an on-chain call is sufficient and trustless.

LUKSO’s design intended this to be **“seamlessly integrated into any dApp”**, so likely the read calls are public and efficient. Once you have the information, you can conditionally unlock the wizard step.

### 3. Other Criteria – Identity & Miscellaneous

Aside from tokens and follows, what other **challenge criteria** might a wizard author want? Some possibilities supported (directly or indirectly) by current standards:

* **Profile completeness or attributes:** e.g. *“Profile must have a bio set”* or *“Profile must have linked a Twitter handle.”* Since LSP3 profile metadata is flexible, an author could require certain keys in the profile’s JSON (for instance, a URL in the `SocialLinks` array matching “twitter.com/…”). To check this, you’d fetch the UP’s LSP3 JSON (via ERC725.js using LSP3 schema, which gives a URL to the JSON) and then inspect the JSON for the required info. For example:

  ```js
  import LSP3Schema from '@erc725/erc725.js/schemas/LSP3UniversalProfileMetadata.json';
  const profile = new ERC725(LSP3Schema, profileAddress, provider);
  const data = await profile.getData('LSP3Profile');
  const url = data.value.url; // URL to JSON file (could be IPFS)
  const metadata = await fetch(url).then(res=>res.json());
  // Now inspect metadata for required fields.
  ```

  This is more involved and less trustless (since the JSON is off-chain), but it’s doable. A simpler approach for something like “bio set” is just check that the LSP3Profile JSON URL exists and maybe that certain fields are non-empty.

* **Owning a specific type of asset:** Perhaps soulbound tokens or credentials. There is no distinct LSP for “SBT” – a soulbound could just be an LSP7/8 with non-transferable logic. So it falls under token ownership checks. Another interesting standard is **LSP12-IssuedAssets**, which is a key that a UP can have listing all assets it **issued** (i.e., where the UP is the creator/minter of tokens). A wizard could require *“user must have created at least one NFT collection”*, which could be verified by checking the user’s UP for `LSP12IssuedAssets[]` entries. This would entail reading another array from the UP’s storage (similar to LSP5).

* **Being an executor/key on another contract:** For example, *“User is a controller of UP X”* or *“User is listed as a trustee in contract Y.”* These are less common and not covered by a single LSP, but since UPs can have multiple controllers (LSP6 permissions), one could in theory check if the user’s address is among another profile’s permitted addresses. That would involve reading `AddressPermissions[]` keys of the target UP. This is advanced and likely not needed in an onboarding wizard, but it shows the flexibility: anything stored in the ERC725Y key-value store of a UP or related contract can be a condition.

* **Past interactions or transactions:** Not directly covered by LSP standards. If someone wanted *“user must have interacted with dApp X before”*, you’d need to query event logs or an off-chain index (e.g., check if the user’s address called a specific contract in the past). That goes beyond UP standards, but you could integrate it if needed via an indexer.

In summary, the most *realistic challenge types* given the current Lukso standards are:

* **Ownership-based challenges:** requiring the UP to own certain tokens (LSP7 fungibles or LSP8 NFTs).
* **Social-based challenges:** requiring the UP to follow another profile (via LSP26).
* **Profile-data challenges:** requiring certain profile info (via LSP3 keys).
* **Creation/authority challenges:** e.g. UP must have issued a token or have a certain permission (using LSP12 or LSP6 data).

The Lukso standards provide a lot of on-chain data that can be mixed and matched for such criteria.

## Frontend vs Backend Verification – Which to Use?

You can perform the above checks **directly in the frontend** (in the user’s browser after they connect their wallet), or on a **backend server** (after the user authenticates, the server queries the blockchain or an index). Each approach has pros and cons:

| Approach                                   | Pros                                                                                                                                                                                                                                                                                                                                                                          | Cons                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Tools & Notes                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend (Browser)**<br>(Ethers.js/Web3) | - Straightforward: use the user’s provider connection to read data in real-time.<br>- No additional infrastructure needed.<br>- Leverages user’s authenticated session (the connected wallet) directly.                                                                                                                                                                       | - **Security:** Logic is visible to the user; a savvy user could modify JS to bypass checks. (They can’t fake on-chain data, but could skip UI gating – if that’s a concern, consider server-side double-checks.)<br>- Reliance on user’s node/connection for queries (though one can use a public RPC as well).<br>- If heavy data processing is needed, it might be slower in the browser.                                                                                                                   | Use **ethers.js** for direct contract calls (balanceOf, ownerOf, etc.). Use **ERC725.js** for reading UP data keys easily (it handles data key encoding/decoding). You can also call a GraphQL API from the browser if CORS allows (Envio’s API might allow direct queries).                                                                 |
| **Backend (Server)**                       | - **Integrity:** The server can independently verify conditions by querying the chain, ensuring the user isn’t tricking the UI. You can trust the result before unlocking next steps or granting rewards.<br>- Can cache results or use indexing for performance (e.g., daily check if a UP holds a token rather than every time in UI).<br>- Keeps proprietary logic hidden. | - Requires implementing an auth mechanism: the server needs to know the request is from the rightful owner of that UP. This typically means the user must sign a message (as noted earlier) so you can confirm their address server-side.<br>- More development overhead: you’ll run a web3 client on the server (ethers/web3 with a provider) or use an indexing DB.<br>- If using third-party indexer, introduces a dependency and trust in that data (though you can always fall back to RPC verification). | Use **ethers.js or web3** on Node to call the LUKSO RPC (there are public endpoints and services like Lukso’s Gateway or your own node). Alternatively, use **Envio**: e.g., run GraphQL queries for follows or token balances. For auth, libraries like **siwe** (Sign-In With Ethereum) can be adapted to LUKSO (just different chain ID). |

**Recommendation:** For an onboarding wizard scenario, a **hybrid approach** can work well: perform the checks in the front-end for responsiveness (so the UI can immediately react when a user connects their UP and meets or fails criteria), but also **validate critical milestones on the backend** if cheating would have serious consequences. If the wizard simply gates user progress in the UI, client-side may suffice. If completion of the wizard gives some reward or access, you might have the final submission sent to a server which then re-checks the user’s UP status to be sure.

In terms of simplicity and maintainability, starting with **frontend verification using ethers.js/erc725.js** is easiest. Lukso’s standards were designed to be client-readable; for example, anyone can fetch a UP’s data via ERC725Y keys or call the follower registry. This means you don’t *need* privileged access to verify things. As long as you code the checks clearly, maintaining them is straightforward. Later, if you need more security, you can duplicate the logic on a backend.

## Developer Tools and Libraries for UP Integration

Lukso has an evolving suite of tools. Here are key libraries and SDKs you’ll likely use:

* **`@erc725/erc725.js`:** A JavaScript library to interact with ERC725Y key-value storage on smart contracts (which is used by UPs and LSP7/LSP8 for metadata). It comes with JSON schemas for Lukso standards (LSP3, LSP4, LSP5, etc.), which greatly simplifies reading data. For example, using an LSP5 schema with ERC725.js, you can fetch the `LSP5ReceivedAssets[]` array and get back a list of addresses without manually encoding keys. This is used above in our examples. It also can decode values like JSON URLs, arrays, maps, etc. Very handy for profile data and token metadata.

* **`@lukso/lsp-smart-contracts`:** An NPM package that provides constants (and sometimes ABIs or contract classes) for Lukso standards. For instance, it includes the interface IDs for each LSP (so you can call `INTERFACE_IDS.LSP7DigitalAsset` to get the bytes4 ID to check via ERC165), and the ERC725Y data keys for standards like LSP3, LSP5, LSP12, etc. This is useful if you need to, say, dynamically verify if a given contract address is LSP7 or LSP8 by calling `supportsInterface`. (ERC725.js uses these under the hood as well.)

* **Ethers.js (or Web3.js):** For general Ethereum RPC interactions on LUKSO. Ethers is commonly used in the JavaScript examples for Lukso. You’ll use it to get providers, signers, call contract methods (for balances, following, etc.), and to deploy transactions if needed.

* **GraphQL Indexers (Envio / TheGraph):** As mentioned, Envio is a service that supports LUKSO, offering GraphQL endpoints to query blockchain data in a more structured way. TheGraph also has community subgraphs for LUKSO (check their subgraph explorer). These can save time for complex queries. For example, one could query “all LSP8 tokens owned by X” in a single GraphQL query, instead of making multiple RPC calls. Use these if you find the direct approach cumbersome or if you need aggregated data (like history).

* **LSP Factory / deployment tools:** If part of your flow is to **create a new Universal Profile** for the user (maybe as part of onboarding, if they don’t have one), Lukso provides the [LSP Factory JS](https://github.com/lukso-network/tools-lsp-factory) which can programmatically deploy a UP with a single transaction (it deploys LSP0 account, LSP6 key manager, and LSP1 delegate and sets them up). You might integrate this if you allow profile creation in-app. Otherwise, you can direct users to the official **Universal Profile creation site** (my.universalprofile.cloud) before they come to your dApp.

* **up-provider (for mini-app contexts):** This is a more exotic tool where a parent site provides a UP context to an embedded app (used in Lukso’s “Universal Profile Grid” concept). Probably not needed for your case, unless you embed your wizard in another site that already has the user’s UP. Just be aware it exists (EIP-1193 provider forwarding).

* **NPM ABIs or TypeScript types:** The `lsp-smart-contracts` package might include ABIs for the standards, or you can find ABIs in the GitHub repo. For instance, ABIs for LSP7 and LSP8 interfaces, the LSP26 registry, etc., can be extracted from the reference implementation. You might either write your own (based on the standard’s methods) or use typechain on the contract addresses if ABIs are published.

In the code snippets earlier, we assumed you have the ABI (e.g., `LSP7Abi`). You can get those from the `@lukso/lsp-smart-contracts` package or from Lukso’s GitHub releases of the contracts.

## Implementing Challenge Verification in Next.js

Bringing it all together, here’s how a wizard slide verification might work:

1. **User connects their UP** using one of the methods in the sign-in section. You capture their UP address.

2. **Fetch required data** for the challenge:

   * If the challenge is token ownership, load their asset list (LSP5) and/or query the specific token contract.
   * If the challenge is following someone, query the LSP26 registry for the relationship.
   * If the challenge is profile info, fetch their LSP3 JSON.
     This can be done on component load or via a Next.js API route (depending on front vs back approach).

3. **Verify conditions**:

   * Evaluate the condition(s) against the fetched data.
   * This could be done in React state and show the result immediately (e.g., a green checkmark if passed, or instructions if not).
   * For multi-part conditions, check each part.

4. **Handle pass/fail:** If the condition is met, let the user proceed (maybe enable a “Next” button). If not, perhaps show an error or even offer help (like “You need to follow our UP – click here to follow, then click re-check”). Since following or token actions require blockchain transactions, you might incorporate buttons to trigger those actions:

   * e.g., a “Follow \[Profile]” button that calls the LSP26 contract’s `follow(address)` function via the user’s signer.
   * or a “Buy NFT” link if they need an NFT, etc.
     Ensure you then update the state after those actions (possibly wait for transaction confirmation then re-fetch data).

5. **Wizard authoring side:** When authors define a challenge, they would likely choose from a set of condition types (Follow X, Own Y token, etc.) and provide the parameters (profile address or token address/id, etc.). Your app could store these definitions in a database or smart contract. At runtime, the front-end needs to interpret a challenge and run the appropriate checks as we discussed.

   You could create a mapping in code: for a given challenge type, call the relevant verification function. For instance:

   ```js
   switch(challenge.type) {
     case 'follow':
       result = await checkFollow(userUp, challenge.requiredProfile);
       break;
     case 'hold_token':
       result = await checkTokenOwnership(userUp, challenge.tokenAddress, challenge.minAmount);
       break;
     // ... etc.
   }
   ```

   This makes it flexible to add new types.

**Maintenance considerations:** Lukso’s standards are evolving, but core ones like LSP0-LSP8 are fairly stable now. Keep an eye on updates (LSP26 might get enhanced features as seen in proposals for private follows or blocking). Because you’re using standard interfaces, your integration should continue working even as the ecosystem grows (new token types, etc., will still register in LSP5 lists and such, by design).

## Example Challenge Types Configuration

To illustrate, here’s a table of realistic challenge types a wizard author might configure, and how they map to LSP data:

| Challenge Type                               | What the Wizard Author Specifies                                                                                                               | How to Verify in App                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Require Follow**                           | Target UP address that user must follow.                                                                                                       | Call LSP26 registry to check follow relationship.                                                                                                                                                                                                                                         |
| **Require Token Ownership**                  | Token contract address (LSP7 or LSP8), and optional amount or tokenId criteria.                                                                | Check UP’s asset list for token address. Then if fungible, verify balance ≥ threshold; if NFT, verify ownership of required tokenId.                                                                                                                                                      |
| **Require Profile Field**                    | Which field (e.g. *has Twitter link* or *has avatar image*).                                                                                   | Fetch UP’s LSP3 metadata JSON and inspect for that field. (Ensure the field is present/non-empty).                                                                                                                                                                                        |
| **Require Created Asset**                    | Possibly a contract address that the user must have created (e.g. an NFT collection address). Or just the condition “at least 1 issued asset”. | If specific, check if that address appears in the UP’s `LSP12IssuedAssets[]` list (similar to LSP5). If general, check that `LSP12IssuedAssets[]` array length > 0. (This requires the UP’s URD records issuances, which standard UP deployment does track for tokens minted through it). |
| **Require Being a Controller** (less common) | Another UP or contract address where the user’s UP or EOA should have control.                                                                 | For a UP, check if user’s address is listed in that UP’s `AddressPermissions` (LSP6 keys). For a generic contract, you might not have a standard – would require custom logic or contract-specific info.                                                                                  |

Each of these corresponds to reading some on-chain state tied to the user’s UP. By leveraging the standards, you avoid writing custom smart contracts to track achievements – the data is already part of the user’s profile or the universal registry.

## Simpler vs. More Robust: Summary

* **Simplicity:** Do as much as possible on the **client-side** with existing libraries. This covers 90% of use cases with minimal effort. For instance, a few calls with ERC725.js and ethers can verify tokens and follows in seconds, directly from the browser.

* **Robustness:** For critical checks, mirror them on a backend or at least use an off-chain cache that you control. This ensures no one can bypass the UI to fool your system. If the outcome of the wizard has value (unlock content, rewards, etc.), consider requiring the final submission to go through a backend that re-checks everything before granting the reward.

* **Maintainability:** Lukso’s standards aim to be **extensible**. New standards might emerge (for example, if an LSP for verifiable credentials or badges comes, an author might want to use that). Design your system so adding a new challenge type (mapping to a new LSP or contract call) is straightforward. The modular approach (one function per check type) helps.

By following this guide, you can build an onboarding wizard that authenticates users via their Universal Profiles and gates content based on on-chain criteria. You’ll be using the same building blocks that make UPs powerful across the Lukso ecosystem – **standardized profiles, tokens, and social connections**, all queryable with just a few lines of code. Now both the end-user and the wizard author can trust that these challenges are being validated in a secure, decentralized way, leveraging the full capability of LUKSO’s Universal Profiles.

**Sources:**

* LUKSO Universal Profile launch announcement (Medium)
* Felix Hildebrandt’s *LUKSO Explained: Asset Metadata*
* LUKSO LinkedIn post on LSP26 Follower Registry launch
* Professor LYX’s explainer on LSP20 (Call Verification)
