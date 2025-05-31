Got it! I’ll prepare detailed instructions for your Cursor AI agent explaining Circles, how it works, the SDK capabilities, and how to build a plugin MVP for onboarding users via trust. I’ll include technical guidance, key integration steps, SDK dos and don’ts, and suggestions for how to structure the backend/frontend in your Next.js-based CG plugin architecture. I’ll let you know as soon as it’s ready.


# Circles Integration Guide for a Common Ground Plugin

## 1. What Is Circles and How Does It Work?

**Circles Overview:** Circles is a Web-of-Trust-based community currency system, originally conceived as a form of Universal Basic Income (UBI) on the blockchain. In Circles, each person issues their own personal cryptocurrency. This personal currency is continuously minted over time (UBI) and is unique to that individual. There is no central mint or reserve – **every user creates money for themselves** as a social promise. The key, however, is that this money only has value if others trust and accept it.

**Personal Currencies & Web of Trust:** When you join Circles, you get an account that mints a small amount of tokens (often called CRC) periodically (e.g. 8 CRC per hour). These tokens are **personal** – only you can mint your own CRC. To spend your CRC with others, you rely on **trust links**. A trust link is a mutual connection where one person agrees to honor (accept) the personal currency of another. If Alice *trusts* Bob on Circles, it means Alice is willing to accept Bob’s CRC tokens as payment. This forms a network of trust (a “web of trust”) among users instead of a single global currency. Transitive trust is also supported: if Alice trusts Bob and Bob trusts Carol, Alice can indirectly pay Carol using a chain of trust relationships (the Circles system will find a path for the payment). In essence, **value flows through paths of social trust** rather than through centralized exchanges.

**Trust Links and Onboarding:** Trust is not just a friend request – it’s a crucial *Sybil-resistance* mechanism. New users can’t simply create infinite fake accounts to mint unlimited money, because their currency will be worthless unless real people trust those accounts. In fact, in Circles’ initial design a new account needed to gain trust from \~3 existing members to be fully recognized in the network. This means onboarding typically happens via invitations: an existing Circles user vouches for a new user by trusting them. From the new user’s perspective, this is great because **they don’t need to buy crypto or have fiat money to join** – they get their personal UBI tokens and an initial social trust endorsement instead of a bank balance. From the network’s perspective, requiring trust protects against fake accounts: *only real social connections can bring someone into the economy*. This makes Circles especially useful for onboarding users who have no money or access to exchanges: as long as they know someone in the network who trusts them, they can start transacting without credit cards or bank accounts.

**Safes and Signers (Circles Accounts):** Under the hood, a Circles user’s account is implemented as a smart contract wallet (a **Gnosis Safe** contract). When a person signs up, a personal Safe is created to represent them on-chain. This Safe holds their funds and is the entity that mints their personal currency. It’s a multi-signature wallet, though in most cases it starts with just one signer (the user’s key) for a 1-of-1 setup. The benefit of using a Safe is that the user can later add other keys or devices as additional signers (or even friends as co-signers for recovery) – it adds flexibility and security. The Circles web app (Circles Garden) historically managed this Safe creation and key handling for the user. In our plugin context, if a user connects with MetaMask, their MetaMask account can be the initial Safe owner (the SDK will handle Safe deployment). **Signers** refer to the private keys controlling the Safe. For example, if Alice uses both her browser wallet and a passkey-based wallet, those could be two signers on Alice’s Safe. Transactions in Circles are then approved by the Safe’s signers. For simplicity, you can treat a user’s Circles address (their Safe contract) as their identity, and the signer (e.g. MetaMask) as the controller for that identity. The Safe architecture means users aren’t tied to a single private key: they can replace a lost key or add new ones, which is important for account recovery in a decentralized system.

**Why Circles for Easy Onboarding:** Circles’ design removes the typical barriers to entry in crypto. A new user doesn’t need to purchase any tokens to start – they begin by minting their own, and those tokens become spendable if someone trusts them. There’s no reliance on centralized exchanges or banks; value is created and validated through social relationships. This is perfect for a community platform like Common Ground, where trust and social connection are part of the environment. Users can bootstrap into a blockchain economy through their friends and communities rather than through money. Additionally, using a sidechain (Gnosis Chain, formerly xDai) with very low fees makes the process accessible – transactions cost a tiny fraction of a cent in xDAI. Overall, Circles provides a **peer-to-peer onboarding path**: new value is introduced to the network via people (trust), not via cash investment, aligning well with grassroots and community growth dynamics.

## 2. Circles SDK – Features and Setup

**Circles SDK Overview:** To integrate Circles into applications, the Circles team provides an SDK (JavaScript/TypeScript). This SDK wraps the complexity of the Circles protocol – including multiple smart contracts and an off-chain indexer – into convenient methods. Using the SDK, a developer can do all of the following with relatively simple calls: **create new Circles identities, establish trust relationships, send tokens (including finding transitive paths), query balances and trust data, and subscribe to events**. In other words, it’s a one-stop library to manage Circles “avatars” (accounts) and their interactions. The SDK is compatible with both Circles v1 (the current live system on Gnosis Chain) and the upcoming Circles v2, but for now we’ll focus on v1 since that’s what’s running on mainnet.

Some core capabilities of the SDK include:

* **Sign-Up (Identity Creation):** Register a new human user or organization on the Circles system. The SDK will deploy the necessary Safe contract and call the Circles Hub contract to register the new identity. (There are slightly different flows for personal vs. organizational accounts – personal ones mint UBI, orgs do not.)
* **Trust Management:** Easily trust or untrust other users. With a single method call, you can trust one or multiple addresses. Under the hood this invokes the Hub contract’s trust function for each link.
* **Token Transfers:** Send tokens from one user to another. The SDK takes care of finding a *path* through the trust network if the two users aren’t directly connected. You can also do direct ERC-20 style transfers if you specifically want to send along an existing trust link, but usually you’ll let the SDK figure it out (transitive transfer).
* **Balance Queries and History:** Fetch balances of various Circles currencies that an account holds (e.g. “Alice has 50 of her own CRC, 20 of Bob’s CRC, etc.”). Also query transaction history or trust relationships for an account. These read operations use an indexed RPC service for efficiency.
* **Event Subscription:** Subscribe to real-time events from the Circles network (like someone trusted someone, tokens were transferred, etc.). The SDK can connect to a special Circles **Nethermind indexer** node that watches the blockchain and provides updates. This is useful for updating UIs live as things change.

In short, the SDK abstracts the **Circles Hub contract**, the **personal token contracts**, the **trust graph logic (Pathfinder)**, and the **user’s Safe wallet** behind a clean API.

**SDK Setup and Installation:** The Circles SDK is distributed as a set of npm packages. For a Common Ground plugin (likely a Next.js app), you’ll need to install the core SDK and its peer dependencies:

```bash
npm install @circles-sdk/sdk @circles-sdk/data @circles-sdk/utils @circles-sdk/profiles @circles-sdk/adapter-ethers ethers
```

The packages serve different roles – `sdk` is the main one, `data` provides the data querying layer, `utils` has helper functions/types, `profiles` manages the profile/name registry, `adapter-ethers` is an adapter to connect the SDK with an **Ethers.js** provider (since the SDK doesn’t assume a specific Ethereum library, it works via adapters). We also install `ethers` (version 6) as the underlying provider library.

Before using Circles, ensure your environment is set up for Gnosis Chain. In practice, that means your users’ wallets (MetaMask, etc.) are connected to Gnosis Chain (chain ID 100 for mainnet). The SDK will default to mainnet config for Circles. It has the contract addresses and service endpoints baked in for you. For reference, the Circles Hub (v1) contract on Gnosis is at address **0x29b9...c543**, but you rarely need to hardcode that – the SDK knows it. Still, your users will need some xDAI (the native token for gas on Gnosis) to perform transactions. The official docs recommend having a bit of xDAI from a faucet (transactions are cheap, but not free).

**Initializing the SDK:** Once installed, setting up the SDK in your code is straightforward. Typically, you will do this during your app’s initialization (after ensuring the user’s Ethereum provider is available). For example:

```typescript
import { circlesConfig, Sdk } from '@circles-sdk/sdk';
import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';

// 1. Initialize an adapter for the user's Ethereum provider (e.g., MetaMask in browser)
const adapter = new BrowserProviderContractRunner();
await adapter.init();  // This will request access to the user's wallet if not already granted

// 2. Initialize the Circles SDK with the adapter and default config
const sdk = new Sdk(adapter, circlesConfig);
// Now `sdk` is ready to use Circles on Gnosis Chain (mainnet config).
```

In the above code, `BrowserProviderContractRunner` is a provided adapter that knows how to use a browser’s `window.ethereum`. Calling `adapter.init()` connects to the wallet and prepares a signer. Then we pass both the adapter and a configuration object to `new Sdk()`. We used the `circlesConfig` import which is a predefined config for production Gnosis Chain – it contains all the necessary contract addresses (Hub v1, Hub v2, registry, etc.) and service URLs (like the RPC indexer and Pathfinder) for the Circles network. You could also construct a config manually or use a testnet config, but for most cases the default is fine.

After this setup, the `sdk` object is your main interface. It exposes methods and properties to interact with Circles. For example, `sdk.signUp()`, `sdk.getAvatar(address)`, or event subscriptions via `sdk.data`. It also manages an internal connection to the Circles **RPC node** (hosted at `rpc.aboutcircles.com`) and **Pathfinder service**. Notably, when you call a function like transferring tokens, the SDK will behind the scenes call out to `pathfinder.aboutcircles.com` to find a trust route, then bundle the results into a blockchain transaction to the Hub contract.

**Auth and Providers:** The SDK’s adapter approach means you can plug in different signing methods. We used the provided Ethers adapter for MetaMask. If you wanted, you could implement a custom adapter (say, to sign via a backend or another wallet system), but that’s advanced usage. For a Next.js plugin, the BrowserProviderContractRunner + MetaMask is the simplest route. If your plugin uses the wagmi library or a similar Web3 hook system, you can still integrate – either by using the wagmi provider’s signer in a custom adapter or by simply letting the SDK create its own connection (since it ultimately just uses `window.ethereum` by default). The key point: **the user must have a private key to sign transactions** (unless you plan to custody keys on their behalf, which raises security issues). In most cases that means the user will use a wallet extension or an external wallet app.

**SDK Limitations and Things to Watch:**

* *Alpha Software:* The Circles SDK is currently in alpha (e.g., version 0.0.44 for v1 as of this writing). It’s under active development. Expect occasional breaking changes or unimplemented features. Be sure to pin the version and read release notes. The core functionality (trust, transfer, sign-up) is there, but some rough edges can exist (for instance, error messages might be sparse).
* *Wallet Availability:* Because the SDK runs in the context of your web app, it relies on a wallet being present (for `BrowserProviderContractRunner`). On Common Ground, users might not all have MetaMask installed. You should handle this gracefully – e.g., detect `window.ethereum` and prompt the user to install a wallet if not found. Alternatively, integrate a wallet connection modal (like wagmi’s connectors or web3modal) to support multiple wallet types. Without a wallet or some signing mechanism, the user cannot perform on-chain actions.
* *Gas and Transactions:* Every trust action or transfer is an on-chain Ethereum transaction on Gnosis Chain. The SDK will prepare and send these via the connected provider. If a user has no xDAI at all, transactions will fail due to insufficient gas. For an MVP, consider **funding the user’s first few transactions** (maybe the plugin’s backend or the inviting user can cover a small cost) or guide the user to a faucet. The good news is costs are extremely low on Gnosis (fractions of a penny), but the user experience of having to go get xDAI can be a hurdle if not addressed.
* *Safe Transaction Handling:* Circles uses Gnosis Safe contracts for accounts, but the user’s MetaMask is an Externally Owned Account (EOA). How does an EOA control a Safe? In Circles v1, the Safe is deployed such that the EOA is the sole owner, and crucially, the Safe’s **fallback handler allows the owner EOA to act as if it were the Safe for certain calls**. Specifically, when the user calls the Hub contract’s `trust` or `transferThrough` functions, they actually call them *from their EOA*, but the Hub contract recognizes and treats the EOA’s Safe as the source of truth. (This is done by mapping Safe addresses to owner addresses in the Hub’s logic.) This means users can sign transactions normally with MetaMask and still operate their Safe account without explicitly doing Safe multi-sig proposals, etc. The SDK hides these details, but just be aware: if a user ever adds additional signers or changes the Safe’s threshold, they would need to start using the Safe transaction flow (multiple signatures). For now, **Circles assumes 1-of-1 safes** for personal accounts, making it behave much like a regular wallet.
* *Passkeys and Key Management:* We’ll discuss passkeys more in the Auth section, but from an SDK perspective, there isn’t out-of-the-box WebAuthn support yet. If you plan to use passkeys (like Metri does), you might not use the SDK’s BrowserProvider directly – instead, you’d have to integrate with whatever signing flow the passkey provides. This could mean using a custom adapter or even bypassing the SDK for the sign-up step if you delegate that to an external app.
* *Profiles Service:* Circles has a profile service that the SDK can use (`sdk.profiles`). This service is essentially off-chain storage for user profile data (username, avatar image, metadata) associated with a Circles account, anchored by the on-chain NameRegistry contract. The current limitation is that interacting with profiles might require the user to have a DID or some authentication with the Circles backend. For an MVP, you might skip deep integration with profiles, but it’s good to know it’s there if you want to, say, display a user’s Circles username or profile pic in your plugin.

In summary, the SDK is your friend – it greatly simplifies working with Circles. Just pay attention to the points above to avoid common pitfalls during setup.

## 3. Using the Circles SDK to Build an MVP

Now let’s outline how to actually implement key features of a Circles-integrated plugin, step by step. We’ll assume you have the SDK set up in your Next.js Common Ground plugin and a backend on Railway for any server-side needs. The main features we want in an MVP are: **onboarding a new user via trust, implementing the trust mechanism (UI + smart contract), storing identities and trust data, showing balances & trust connections, token transfer capabilities, and integration with Common Ground’s plugin system**.

### **Onboarding New Users via Trust Links**

Onboarding in Circles will look a bit different from a typical app. Instead of a new user simply creating an account with a password, here they need to create a blockchain identity and then get *trusted* by an existing member to activate their currency.

**Flow:** A likely user flow is: an existing Common Ground user (already in Circles) invites a new user to Circles. Perhaps Alice (existing) sends Bob (new) an invite link or QR. Bob opens the plugin, goes through a sign-up flow to create his Circles identity, and then Alice confirms trust for Bob through the plugin.

**Implementation steps:**

1. **Circles Identity Creation:** When Bob (new user) starts the Circles plugin, detect that he has no Circles account yet (e.g., your plugin could check a database or simply ask Bob, “Do you have a Circles address?”). If not, you’ll initiate the sign-up. Using the SDK, this is as easy as calling: `await sdk.signUp()`. This call triggers the smart contract deployment and registration needed for a new user. Under the hood, it calls the Circles Hub’s `signup()` function, which registers the caller as a new personal avatar. The caller in this case is Bob’s wallet (EOA). The result is that Bob’s new Safe contract is deployed (the Hub uses a factory to deploy a minimal Gnosis Safe with Bob as owner) and Bob is officially on-chain as a Circles participant. This is an on-chain transaction, so Bob will have to confirm it in MetaMask and pay a small gas fee. After it succeeds, Bob now has his own currency (let’s call it BOB) that will start minting every hour.

   **Storing Bob’s identity:** After sign-up, the SDK can give you Bob’s Circles address. If `sdk.contractRunner.address` was Bob’s EOA, the actual Circles identity (the Safe) will have a different address. The SDK automatically knows it by waiting for an “avatarInfo”. You can retrieve the new avatar via `const avatar = await sdk.getAvatar(bobEOAAddress)`. The `avatar.address` property will be the Safe contract address for Bob. Store this in your backend or plugin state, linking it to Bob’s Common Ground user ID. This mapping is important so that later, when Bob comes online, you can load his Circles info, and so that other users (like Alice) can find Bob in the Circles context (more on that in a second).

2. **Trust Invitation:** Now Bob has an account but *no one trusts him yet*. If no one trusts him, Bob’s currency isn’t worth much to others. Typically, you’d want the inviter (Alice) to immediately trust Bob. There are a few ways to facilitate this:

   * **Out-of-band:** Bob could send Alice his Circles address (e.g., paste it in a chat or the Common Ground app could handle this by an invite link). Alice then opens the plugin and clicks “Trust Bob”.
   * **In-app invite:** Because Common Ground is a social platform, you might integrate an invitation system. For instance, Alice could click “Invite to Circles” on Bob’s profile *before* Bob even signs up. The plugin could generate a unique link that encodes Alice’s address. Bob uses that link to sign up, and the plugin backend knows to automatically prompt Alice to trust Bob (or even automatically create a trust transaction if Alice pre-approved it).

   For simplicity, let’s say Bob tells Alice “Hey, I joined Circles, my address is 0xABC…”. Alice would then use the plugin to trust him.

3. **Trust Execution (Alice trusts Bob):** In the plugin UI, Alice selects Bob’s profile and clicks a “Trust this user on Circles” button. The plugin should then use Alice’s SDK instance to perform the trust. Assuming Alice is logged in and her wallet is connected:

   ```typescript
   const aliceAvatar = await sdk.getAvatar(aliceAddress);
   await aliceAvatar.trust(bobCirclesAddress);
   ```

   This call will create an on-chain transaction from Alice’s account to the Hub contract. The SDK will set the trust **limit** to 100% by default (in the Hub, trust is stored as a percentage or relative limit – 100 means full trust). Alice confirms the transaction, and once it’s mined, Bob is officially trusted by Alice. In practical terms, Alice’s trust means Alice is willing to accept Bob’s BOB tokens up to some large amount (the default “100” is effectively unlimited relative to the daily mint rate). Now Bob can spend his tokens with Alice – for example, Bob could send Alice some BOB tokens and Alice’s wallet would treat them as valid value because she trusts them.

4. **Multiple Trusts (recommended):** You might encourage that more people trust Bob – perhaps Common Ground could facilitate community trust by suggesting other mutual contacts of Bob to trust him. The Circles whitepaper suggests at least three trust connections to ensure no single connection is a bottleneck. The SDK’s `trust` method can actually take an array of addresses, meaning Alice could trust several new users in one transaction if needed. But typically it’s one by one with user confirmation.

5. **Trust Confirmation and Feedback:** After Alice trusts Bob, both users should see this reflected. The plugin can now show Bob that “Alice trusted you! 🎉 You can now send Alice your Circles tokens.” Alice might see Bob listed in her “trusted accounts” list. You can query this via `aliceAvatar.getTrustRelations()` to update the UI. Also, because trust is mutual in terms of spending (Bob can spend to Alice, but Alice cannot spend her tokens to Bob unless Bob trusts her back), you might prompt Bob to return the favor if appropriate (though it’s not required unless Alice wants Bob’s currency, it’s a social consideration).

**Onboarding without Funds:** Notice that throughout this flow, Bob never needed to buy cryptocurrency or use a credit card. The only **small** catch is Bob did need a tiny bit of xDAI for gas to register (which could be provided by Alice or a faucet). But Bob did not need to purchase any Circles tokens – he literally *created* them by signing up – and he didn’t need an exchange to convert them because their utility comes from Alice trusting him. This trust-based onboarding is unique to Circles and very user-friendly in communities: you bootstrap economic value from human relationships instead of money.

### **Implementing the Trust Mechanism (UI to Smart Contract)**

From a development standpoint, handling trust links involves both **frontend UI/UX** and **smart contract transactions**:

* **UI Considerations:** Trust is an explicit action a user takes, likely by clicking a button. You should make sure users understand what it means. For example, when Alice clicks “Trust Bob”, you might pop up a confirmation: “By trusting Bob, you agree to accept Bob’s personal currency as valid payment. This can be changed later.” This maps to the social concept and also to the fact it’s an irreversible blockchain action (though you can “untrust”, the history remains). In UI, you can visually indicate trust relationships (like a list of people Alice trusts, and people who trust Alice).

* **Transaction Flow:** When Alice confirms trust in the UI, trigger the SDK call `avatar.trust(...)`. The SDK will prepare the transaction. If using MetaMask, it will open a signature prompt. Ensure your app waits for the transaction to be mined (the SDK’s `trust()` returns a `TransactionResponse` which you can `await` or `.wait()` on). Provide feedback like a loading spinner “Trusting Bob…”. On success, show a success message. On error (user rejected, or transaction failed), handle gracefully (e.g., “Transaction failed or was rejected. Please try again.”).

* **Batch vs Single:** If your UI allows trusting multiple people at once (maybe a bulk trust for a group of new users), the SDK can batch them. Internally, if you pass an array to `trust([addr1, addr2, ...])`, it uses an Ethereum batch transaction (the adapter’s `sendBatchTransaction`) if available. Otherwise, it falls back to sending multiple sequential tx. Keep things simple for MVP: one-click, one trust at a time, unless a bulk action is clearly needed.

* **Untrusting:** Provide a way to revoke trust as well (maybe a “Untrust” button next to each connection). The SDK offers `avatar.untrust(address)` which similarly sends a tx to set trust to 0. Use this if needed (for instance, if someone was trusted by mistake or a user wants to prune their connections).

* **Displaying Trust Data:** Use SDK’s queries to update UI:

  * `avatar.getTrustRelations()` gives you all addresses the user trusts (and perhaps the trust levels). This is “outgoing” trust.
  * To get who trusts the user (“incoming” trust), one way is to query each potential connection, or use the data index: `sdk.data.getAggregatedTrustRelations(userAddress, 1)` as seen in the code. This might return all trust links involving the user. You might also use `avatar.trusts(other)` and `avatar.isTrustedBy(other)` for point checks.
  * In a social platform, you might cross-reference trust with friendship or group membership, etc. (e.g., highlight if a friend is not yet trusted).

* **Smart Contract Details:** The Circles v1 Hub contract is where trust links are recorded. Each trust is effectively a mapping entry of the form `limits(truster, trustee) = 100` (or 0 when not trusted). “100” is a standardized full trust value (not 100 CRC, but an abstract limit – historically it represented 100% or an allowance relative to daily UBI). You generally don’t need to interact with the Hub contract directly (via ethers) because the SDK does it, but it’s good to know what’s happening: a call to `Hub.trust(address, 100)` is being made for each trust. If you ever needed to debug at low level, you could use the Hub’s `limits` getter (SDK’s `avatar.trusts(other)` uses that) to see if the value > 0.

### **Storing Circles Identities and Trust Relationships**

Your plugin will act as a bridge between Common Ground’s user system and the Circles network. This means you’ll maintain some data mapping and caching.

**Identity Storage:** For each Common Ground user who engages with the Circles plugin, you should store their Circles **identity address** (the Safe contract address) and perhaps their **EOA** (owner address). Common Ground likely has its own user IDs or usernames – map those to Circles addresses in a database table on your Railway backend. This way, if user *Florian* connects to Circles, you save something like `(commonGroundUserId: 12345) -> (circlesAddress: 0xabc123...)`. With this, your plugin can:

* Recognize when a logged-in user already has a Circles identity (and retrieve their data).
* Find a user’s Circles address by Common Ground username/ID (useful when one user wants to trust another by selecting them from the platform’s contacts).
* Potentially prevent duplicate sign-ups (don’t call `signUp()` if we already have an address on file).

**Secure Linking:** When storing these mappings, ensure it’s done securely. For example, only allow a user to link their own Common Ground account to a Circles address by proving control. If you rely on the fact that they executed `sdk.signUp()` while logged in, that’s usually proof enough. But if, say, a user wants to link an existing Circles account to their profile, you might ask them to sign a message with that account to prove it’s theirs.

**Trust Data Caching:** The trust graph can grow large, but each user’s local view (who they trust and who trusts them) is manageable. You might store a list of trust connections in your database for quick access (especially if you want to show aggregated stats or do searches, e.g., “find all users trusted by X”). However, **do note** that the source of truth is on-chain. Trust relationships can change without your backend knowing (if a user trusts/untrusts via another app or wallet outside your plugin). To stay updated, consider using the SDK’s event subscription or periodically refreshing from the RPC.

* The Circles indexer provides an API (via `sdk.data`) to query trust links quickly without scanning blocks. For example, `sdk.data.getTrustRelations(userAddress)` could return both incoming and outgoing trust in one call (depending on implementation). It’s wise to use these calls rather than low-level web3 calls, because the trust data might be spread across many events.
* If you have a backend, you could even use the **Pathfinder** for analysis: the Pathfinder service can output the network paths between any two users. It’s not exactly a trust list, but it indicates connectivity.

**Profiles and Names:** As mentioned, Circles has a profile system. Each Circles identity can have a name and metadata (like an avatar image URL) stored via the NameRegistry and an off-chain IPFS JSON. The SDK can fetch profiles via `sdk.profiles.getProfile(address)` if the profile service is enabled. This might return a `Profile` object with fields like name, image, etc., if the user has set them. If Common Ground already has usernames and avatars, you might not need this. But it could be interesting to **sync Common Ground profiles with Circles profiles**. For example, on sign-up, you could automatically register the user’s Common Ground username in Circles’ NameRegistry (ensuring uniqueness). This would be another transaction (the SDK’s `updateProfile` or `NameRegistry.register` call) and requires storing a small metadata file. It’s an optional enhancement for later; for MVP you can skip it or just use Common Ground’s identity system as the primary.

**Organizational Accounts:** Circles also allows creating “organizational” accounts (shared safes that do not mint UBI). If your use case involves a group or organization (say a community group on Common Ground) getting a Circles account, the SDK supports `sdk.signUpOrganization()`. The flow is similar, but the account won’t generate new tokens; it can only receive tokens that others send it. Trust to an org works the same way. For MVP, focus on personal accounts unless there’s a clear need for orgs.

### **Displaying Balances, Trust Graph, and Sending Tokens**

Once users are in and connected by trust, the next important part is enabling them to **see their balances and make payments**. This turns the Circles integration from just a social graph into an actual economy within Common Ground.

**Reading Balances:** Each user will have a balance in *their own* currency (which grows over time) and potentially balances in others’ currencies if they have received payments. However, showing a list of every currency could be overwhelming. A practical approach:

* Emphasize the user’s own currency balance (since that’s their UBI pot). This is effectively how much they *can* spend (subject to finding a path).
* Also show a single consolidated balance or spending power, if possible. In Circles, because not all currency is equal (Alice’s 10 CRC is not directly interchangeable with Bob’s 10 CRC unless trust connects them), it’s tricky to give one number. But one measure is **“max transferable amount to X”**. For instance, “You can send up to 5 CRC to Alice” which the SDK can compute via `getMaxTransferableAmount(alice)`. For simplicity, you might skip this at first and just list individual holdings.
* The SDK’s `avatar.getBalances()` returns an array of balances. Each balance entry (`TokenBalanceRow`) typically includes:

  * The token address (whose currency it is),
  * The balance in that token,
  * Possibly a label or owner reference (e.g., which user that token belongs to, since each person’s token in v1 is an ERC20 contract of its own).
* Using that, you can map token addresses to user names. For example, if Alice’s token contract is at 0xABC…, and you know 0xABC… corresponds to Alice (the SDK might provide that mapping via Avatar info or Profiles), you can display “Balance: 100 AliceCoin (ALICE)” etc.
* **Demurrage/Inflation:** One aspect to be aware of: Circles applies a demurrage (a gradual decay) to balances over long periods to encourage spending. It’s a 7% annual demurrage on personal currencies. This likely won’t noticeably affect short-term usage in an MVP, but if users hoard currency for months, the value decreases. Just a note if someone wonders why their balance changed without spending – it’s the demurrage. The SDK’s converters handle this when computing effective balances.

**Trust Graph Visualization:** Given the social nature, a cool feature is to visualize the trust network. For MVP, you might do something simple like:

* List of people the user trusts (outgoing) – essentially their “Circles contacts”.
* List of people who trust the user (incoming) – who considers this user trustworthy.
* Possibly a graph view using a library (if you have time, a force-directed graph of the connections can be neat).
* You can enrich this by highlighting mutual trust (when two users trust each other, which often implies closer relationships or potential strong trading partners).

The trust data can be fetched as described: `getTrustRelations()` for outgoing, and an aggregated query or iterating others for incoming. Since Common Ground is a community platform, you might combine this with the platform’s social graph: e.g., show trust links among people in the same group or channel.

**Transitive Transfer (Payments):** The hallmark of Circles is being able to pay someone you don’t directly trust by leveraging the network. The SDK’s transfer method makes this easy:

```typescript
await avatar.transfer(recipientAddress, amount);
```

If you leave out the token parameter, it will attempt a **transitive transfer**. What happens is:

* The SDK calls the Pathfinder service (`sdk.v1Pathfinder.getPath`) to find a route from sender to recipient through the trust graph.
* The path is essentially a sequence of who will pay whom. For example, if Alice wants to pay Carol but only knows/trusts Bob in common, the path might be: Alice pays Bob with Alice’s tokens, then Bob pays Carol with Bob’s tokens. All that is orchestrated in one contract call.
* The SDK then calls the Hub’s `transferThrough` function with the discovered path. This function takes arrays of token addresses and source/destination pairs for each hop, which the SDK prepares.
* If no path is found, the SDK throws an error indicating the payment can’t be made (you might catch this to show “Payment failed, no trust path available” to the user).
* If you *do* specify a token address in the transfer call, the SDK will skip pathfinding and just attempt a direct ERC-20 transfer of that specific token (which only works if the recipient trusts that token’s owner). Transitive is more powerful so you usually won’t specify a token unless you have a reason.

From a UX perspective, you would implement sending like:

* User chooses a recipient (maybe from their Common Ground contacts, many of whom might now have Circles addresses linked).
* User enters an amount (perhaps in their own currency units – e.g., “send 5 of my CRC to Carol”).
* The plugin triggers the `avatar.transfer(carolAddress, BigInt(5 * 1e18))` – note: Circles uses 18 decimal places like Ethereum, so 5 tokens is `5 * 10^18` in integer.
* User signs the transaction (MetaMask prompt).
* On success, update both users’ balances. The SDK’s event or the returned receipt can be used to confirm it went through. You might call `getBalances()` again to refresh.
* Perhaps display a transaction history entry like “You paid 5 to Carol (via Bob)” if the path involved Bob – such details might be obtainable from the transfer result. (The SDK’s `transferThrough` likely emits events you could decode for the path taken, but that might be advanced. Initially, just say “Paid Carol 5 CRC” and if Carol received, that’s what matters.)

**Optional: Group Transactions** – Circles v1 is mostly one-to-one payments. There’s no built-in multi-pay or request feature in the protocol (though you could build those at app level). For MVP, one-to-one send is enough.

**Handling Currency Units:** One challenge is that every personal token is technically separate. In UI, you might just refer to them all as “CRC” or “Circles”. For example, Alice’s balance could be shown as “100 Circles (Alice’s own)” and “50 Circles trusted from Bob”. The Circles community sometimes uses the convention that personal currencies are all “CRC” but only meaningful with a trust context. You might simplify and just call all of them “Circles tokens” to the user, highlighting who issued them when relevant.

**Integration with Common Ground (Iframe & Backend):**

Finally, consider how this plugin fits into the Common Ground platform:

* **Iframe Communication:** If the plugin runs in an isolated iframe within Common Ground, you may need to use `postMessage` or a provided JS SDK to communicate with the parent page. For example, Common Ground might have an API for opening user profiles, sending notifications, or retrieving the current user’s info (ID, name, etc.). Early on, ensure you can get the **logged-in user’s identity** from the host – perhaps the plugin is initialized with that. This is critical to map to their Circles data. If Common Ground passes something like a JWT or session token to the plugin (maybe via query params or a handshake message), your plugin should capture that and use it for backend calls.

* **Auth Propagation:** If your plugin backend on Railway needs to call Common Ground’s APIs (say to fetch a user’s profile or to verify a user’s identity), you’ll want to forward the user’s auth token from the frontend to your backend. Common Ground might use OAuth or JWTs – make sure your backend can accept a token via an Authorization header or so, and validate it (perhaps CG offers a public key to verify JWTs or an endpoint to introspect tokens). This ensures that actions taken on the backend (like storing “Bob’s Circles address is X” or initiating a trust invite) are properly authenticated as Bob or Alice and not a random request.

* **Linking Users:** Once a user has a Circles identity, you might update their Common Ground profile to indicate it. If Common Ground profiles are extensible, maybe add a field “Circles: Connected ✅” or even display their Circles username/balance on their profile. This helps discovery: others on the platform can see who’s in Circles and might decide to trust them if they know them. Conversely, within the Circles plugin UI, allow searching Common Ground users to find their Circles address. For instance, Alice wants to trust Bob – she could type “Bob” and your plugin can look up Bob’s user ID then find Bob’s Circles address from your stored mapping. Good integration means users don’t have to copy-paste addresses; it’s all linked by identity. (Of course, always be careful to **confirm with users before making on-chain actions**. If two Bob’s exist, Alice should verify she’s trusting the correct one – possibly by showing avatar pictures or having the user confirm the Common Ground username matches).

* **Backend Roles:** Your Railway backend can serve multiple roles:

  * **Data caching and API:** Serve the plugin with data like “list of Circles contacts for user X” or “Circles address for CG user Y”. This can be done by reading from your database that stores the mappings and maybe caching trust lists fetched via SDK. This is usually faster than hitting the chain from the frontend every time, and it lets you do access control (only return data that the requesting user should see).
  * **Relaying transactions (optional):** In some setups, a backend could help by relaying transactions (e.g., meta transactions) so that users with no gas can still do things. For MVP, probably skip this complexity, but it’s something to consider later (you could have the backend run a relayer service that pays gas for certain calls in exchange for later reimbursement or just as a faucet).
  * **Notification or Coordination:** If you want to notify a user in Common Ground that someone trusted them (which is a nice social touch), your backend could listen for Trust events (through the SDK or directly from the blockchain) and then send a message via Common Ground (if CG has a webhook or bot system). This might be outside MVP scope, but it’s an idea for tight integration: e.g., “🎉 Alice has trusted you on Circles! You can now transact with Alice using basic income tokens.” – delivered as a Common Ground notification.

* **UI Integration:** The plugin’s UI should feel like part of Common Ground. Likely, you’ll use Common Ground’s design system or at least a complementary style. Also consider navigation: is the plugin a single-page app within an iframe? If so, handle internal routing carefully (Next.js in an iframe should be fine). Perhaps the plugin is only activated when user clicks a “Circles” tab or menu item in Common Ground. When active, maybe it shows an overview (balance, recent transactions, trust suggestions, etc.). Think of it like a mini-wallet embedded in the platform.

* **Common Ground Auth to Circles:** One more thought – Common Ground might already have a user authentication system (email/password or social login). Circles, on the other hand, relies on cryptographic identity (the wallet). Bridging these means the user effectively has two logins: one to Common Ground, and one to their wallet. It’s worth making this as seamless as possible. If the Common Ground user already has a wallet address on file (maybe they connected a wallet for another plugin), you could use that. If not, the first step in Circles onboarding might be “Connect a Wallet” (or create one). If Common Ground has a custodial key system (for example, it could manage a wallet for users in the backend), you could theoretically use that – but that’s unlikely and generally not as good as user-owned wallets. So, anticipate needing a **“Connect Wallet” button** and educate the user on installing MetaMask or similar if they haven’t. Once connected, you can store the public address in Common Ground’s profile (with user permission) so that next time the plugin loads, you know which wallet to use.

In summary, integrating the Circles SDK in the Common Ground plugin involves coordinating user actions (trusting, signing up, sending payments) through a friendly UI, and ensuring data flows between the plugin and the Common Ground platform (and your backend). By storing the right mappings and using the SDK’s queries, you can present Circles functionality in a seamless, social way inside the app.

## 4. Authentication Strategies for User Identities

Authentication in this context has two facets: authenticating within Common Ground (which we covered, e.g., passing tokens to backend), and authenticating the user to the Circles blockchain (i.e., managing their keys). Here we focus on the latter – how users prove who they are on Circles and how they manage signing transactions – and the choices around it.

**Circles Identity Creation: SDK vs. Metri (External)**

As mentioned earlier, you have a choice between handling Circles sign-ups and logins natively in your plugin or delegating some of that to external apps like **Metri**.

* **Native (SDK-Based) Approach:** This means the plugin itself will create the Circles identity using the SDK and the user’s wallet (MetaMask, etc.). The flow is: user connects a wallet in the plugin UI, clicks “Sign Up”, signs the transaction, and now the plugin knows their Circles address and keeps using the wallet for actions. The advantage is a **unified experience** – the user stays within Common Ground’s interface the whole time. It also gives you full control: you can tailor the onboarding, perhaps combine steps (e.g., automatically prompt one of the user’s friends to trust them right after sign-up). The downside is it requires the user to have a browser wallet and understand signing. Some non-crypto-native users might find this confusing or might not have a wallet at all.

* **External (Metri) Approach:** Metri is a mobile wallet (currently alpha) designed for Circles that uses **passkeys (WebAuthn)** for authentication. In practice, Metri lets a user create a Circles account by just using a device biometric or PIN – no seed phrase management upfront. It’s a smoother ride for non-technical users. If you choose this path, the flow might be: user clicks “Create Circles Account”, and you show a QR code that, when scanned, initiates account creation in the Metri mobile app (or you redirect them to `app.metri.xyz` on mobile). After they complete it on Metri, they would come back with a Circles address. Your plugin could then ask them to input or confirm that address, and proceed to establish trust. This way, **Metri handles all the wallet complexity** – key generation, safe deployment, etc. The drawback is a fragmented UX (user leaves your app for another) and potential confusion if they don’t return. Also, as of now, Metri has a limitation: it doesn’t allow exporting keys unless the account was first made in Circles Garden. That means if someone only uses Metri and later wants to use the web plugin with MetaMask, it’s tricky (they’d have to go generate a seed phrase via the old app and import it).

In an MVP context, if your target users are somewhat crypto-savvy or willing to use MetaMask, the **SDK-native approach is simpler to implement**. Metri integration might be something to consider when polishing the user experience for broader audiences. Perhaps you can offer both: e.g., “Connect Wallet” or “Use Metri (mobile)” as two options.

**Working with Passkeys and Safe Signers:**

If you do want a more seamless login (no extensions), you might consider implementing a **WebAuthn-based key** yourself. For example, you could use the Web Authentication API in the browser to create a passkey credential. That gives you a public-private key pair tied to the device (often stored in secure hardware and unlocked by fingerprint/Face ID). However, Ethereum doesn’t natively support WebAuthn keys for transaction signing – there’s an evolving standard (like EIP-4521 for WebAuthn signatures), but it’s not widely adopted.

One strategy could be to use a **smart contract wallet (Safe) with a WebAuthn verifier contract**. Essentially, instead of (or in addition to) an EOA, you add a contract or mechanism that validates WebAuthn signatures as a Safe owner. This is complex to roll out in an MVP, but conceptually: when the user signs up, you’d create a Gnosis Safe with two owners – one is a normal Ethereum key (maybe a server-held key or a temporary key to do the registration), and the other is a “WebAuthn owner” (not a standard feature of Safe yet, would need custom contract). This path likely goes beyond scope – it’s basically reimplementing a lot of what Metri is doing internally.

A simpler partial solution: **add passkey as secondary**. Suppose user Alice signs up with MetaMask (so her Safe owner is her MetaMask EOA). You could then have a feature “Add passkey as backup”. This would trigger creation of a WebAuthn key, then call Safe’s `addOwner` function (via the SDK using Safe’s interface, which might require Safe transaction procedures) to add the new public key (as an address, if derivable) as an owner with a threshold still 1-of-2. If done, Alice could sign transactions with either MetaMask or with a passkey through a custom signer. This is uncharted territory a bit – the SDK does integrate Safe’s ProtocolKit which might allow proposals like adding an owner. But implementing the signing of Safe transactions in the UI is heavy.

For MVP, likely **stick to one signer (MetaMask or similar)** to avoid complexity. Recognize that passkeys are promising for user experience, and mention to your team that Metri’s approach might be something to incorporate later when it’s more mature or if they provide SDK hooks.

**Interop with Wagmi/Ethers.js:**

If your Common Ground plugin already uses **wagmi** (a popular React hooks library for Ethereum) or raw Ethers for other features, you can integrate those with Circles SDK. The Circles SDK doesn’t manage wallet connection UI – it expects an already available signer/provider (which the BrowserProviderContractRunner obtains from `window.ethereum`). You could instead use wagmi’s signer. For example:

```typescript
import { Web3ContractRunner } from '@circles-sdk/adapter-ethers';
// ...
const signer = wagmiClient.getSigner();  // assume wagmi is set up
const adapter = new Web3ContractRunner(signer.provider); 
// (Web3ContractRunner is hypothetical here for any Ethers provider, if not, could possibly use signer directly)
```

Actually, looking at the SDK code, `BrowserProviderContractRunner` is specific, but it likely can accept an Ethers Provider if needed. If not, another approach: since you have the user’s signer (from wagmi), you could manually call contract functions. For example, you could call the Hub contract’s `signup()` via ethers without the SDK. But then you’d miss the SDK’s coordination (like waiting for avatar indexing). Still, you could mix and match: use wagmi for wallet connect UI, then feed the raw provider to the SDK.

Also note that Circles uses **ethers v6** internally, which is slightly different from v5 in syntax. Wagmi as of early 2024 started supporting ethers v6 too. Just ensure version compatibility to avoid weirdness (e.g., BigNumber differences).

In summary, leveraging existing web3 infrastructure in your app is fine – just make sure whichever signer/provider you use is plugged into the Circles SDK or used consistently. The goal is that when the user is logged in (Common Ground auth) and connected (wallet auth), everything flows. If needed, you might have to do an initial handshake: e.g., user clicks “Connect Wallet” (wagmi connects), then you instantiate Circles SDK with that connection. This is not much different from using the SDK’s built-in adapter approach.

**Security Note:** If you ever consider a fully custodial approach (your plugin creates a wallet for the user behind the scenes and manages keys), be extremely cautious. Holding users’ private keys on a server (even if just to ease onboarding) makes you responsible for their funds. It’s generally better to push key management to the user (via MetaMask or passkeys) or to a specialized wallet app (Metri) rather than your server. If you did do something like generate a key in the browser for the user (as Circles Garden did with a mnemonic), at least encrypt it with a password and let the user download a backup. However, for our integration, sticking to well-known wallet solutions is recommended.

## 5. Dos and Don’ts for Building with Circles

Finally, let’s highlight some best practices and common pitfalls when integrating Circles into your application:

**Dos:**

* **Do use official SDK and services:** Build on the Circles SDK and its provided endpoints (RPC node, Pathfinder) rather than reinventing the wheel. The SDK ensures you’re using the correct contract calls and formats, and the hosted services handle the heavy graph algorithms for finding payment routes. This will save you time and prevent errors.
* **Do educate users within the app:** Circles introduces new concepts (personal money, trust requirements). Provide tooltips or a FAQ section in the plugin UI (e.g., “What is Circles?” or “Why do I need trust from others?”). This can be brief, but it will greatly improve UX if users understand *why* they must perform steps like trust. For instance, explain that trust links help confirm identities and give value to the currency, preventing abuse.
* **Do encourage meaningful trust relationships:** It’s best if users trust people they actually know or interact with. In your onboarding flow, encourage users to invite people they trust in real life or in the community. Perhaps integrate with Common Ground’s friend or contact list to find likely trust connections. Quality of trust is more important than quantity in the long run for Circles.
* **Do handle edge cases in flows:** e.g., What if a user tries to sign up but they already have a Circles account? (The Hub’s `signup()` will revert if the address is already registered.) You might catch this and instead do a `getAvatar` and proceed. Or if a user is not trusted by anyone, and they try to send money – catch that and inform them they need at least one trust link first. These checks will make the app feel more robust.
* **Do provide a way to get xDAI easily:** As noted, gas is needed. You could integrate a **faucet** request in-app (perhaps via an API call to a known faucet) or just link to one. There are community faucets for Gnosis Chain. Even better, if your plugin’s backend can maintain a small fund of xDAI, you could automatically send, say, 0.1 xDAI to a new user’s address when they sign up (that’s more than enough for many transactions). This removes a hurdle and costs you very little.
* **Do test on Chiado (testnet):** Gnosis Chain has a test network called **Chiado**. Circles v2 contracts are being tested there, but Circles v1 is also deployed on it (per the docs). The SDK can be pointed to Chiado (“sandbox” config often referred to as RINKS or RINGS in Circles context). Use this for development and testing so you don’t accidentally spam the real network or use real funds. It’s also a safe playground to simulate trust networks and payments.
* **Do keep scalability in mind:** If your plugin becomes popular and thousands of users join Circles, be mindful of how you query data. The Circles RPC and Pathfinder are there to help, but they may have rate limits. You might implement caching on your backend for frequently requested info (like caching a user’s trust list for 1 minute instead of hitting the API every time the UI opens). Also consider using websockets or subscriptions for updates instead of polling.
* **Do stay updated with Circles community:** Follow the official Circles channels for updates. Circles is evolving (especially with v2 on the horizon). Being in the loop means you can adjust your integration when new features or changes come (for example, migrating users to v2 when it launches, which the SDK is supposed to help with). Also, the community can provide support if you run into issues.

**Don’ts:**

* **Don’t try to bypass the trust requirement:** It might be tempting to “auto-trust” new users by some central account or have everyone trust everyone by default to make it easier. This **undermines the whole point** of Circles and will likely devalue the currency. Avoid any design that gives a new user unconditional acceptance everywhere without real social links (e.g., don’t have a bot that trusts every new user; that bot’s currency would become worthless and it could distort the network).
* **Don’t hard-code values that might change:** For example, don’t assume the trust limit is always 100 or the UBI rate is always 8 per hour. Use the SDK or config for such parameters. The Hub contract address, the token addresses, etc., should come from the config or environment, not magic constants in your code – this will ease upgrades (like moving to v2, or if the Hub address changes in an upgrade).
* **Don’t expose private keys or sensitive actions:** If you generate keys (like a mnemonic) for users in the browser, ensure it never touches your backend or any analytics. If you use localStorage to cache things, be aware of its security. Similarly, any admin capabilities (if you build them) should be carefully protected. Common sense, but worth stating: the trust and financial nature of this plugin means security is paramount.
* **Don’t neglect UX around pending transactions:** Blockchain transactions aren’t instant. If a user clicks “Send 10 tokens to Carol”, and nothing happens for a few seconds, they might click again – leading to duplicate sends. Always give feedback (e.g., “Transaction pending...”) and perhaps disable the button until it’s done. Handle the case of long pending times or stuck transactions (provide a cancel or at least advice like “if this is taking too long, check your wallet or the explorer”).
* **Don’t rely on off-chain data without verification:** If you use the profile service or any off-chain cache, remember that the source of truth for balances and trust is the blockchain. Off-chain data (like profile names or indexer query results) should be considered helpful but not gospel if you’re dealing with anything critical. For instance, if you ever implement a feature like “show me if I can pay 50 to X”, double-check via the pathfinder rather than assuming based on outdated trust data.
* **Don’t ignore demurrage and inflation:** If users keep the app open for a long time, their balance might slowly increase (they mint new tokens continuously) and also decay relative to others due to demurrage. The SDK’s indexer likely accounts for this in balance calculations, but ensure your UI refreshes balances periodically so the numbers don’t become obviously stale. It can be confusing if a user’s balance always shows “24.0” when in fact after an hour it should be “32.0” CRC. Even though these changes are small per minute, keeping it updated reinforces the UBI concept.

## 6. Further Resources

If you’re diving into development with Circles and Common Ground, here are some key resources and references to consult:

* **Circles Handbook (User & Dev Docs):** The Circles Handbook is the official documentation site. It contains explanations of Circles’ concepts, the whitepaper, and developer guides. The “What is Circles?” section is great for understanding the philosophy and mechanics of personal currencies and trust. The developer section (e.g., *Getting Started with the SDK*) provides code examples and deeper dives into the protocol (like the structure of the Hub contract, trust logic, etc.). You can find it at *handbook.joincircles.net* or via the CirclesUBI GitHub.

* **Circles SDK Repositories:** The source code for the Circles SDK is on GitHub at `aboutcircles/circles-sdk`. Browsing the repo can be enlightening – you can see how the SDK implements certain features (for example, the trust method we cited in `v1Avatar.ts` or the transfer logic). There’s also an NPM package page for quick info. Additionally, the Circles contracts v1 are in `circlesUBI/circles-contracts` (solidity code) if you ever need to verify how something works on-chain, and Circles v2 contracts in `aboutcircles/circles-contracts-v2`. The v2 docs (aboutcircles.github.io/circles-contracts-v2) can give you a preview of where things are heading, though v2 isn’t live on mainnet yet.

* **Community Support (Discord, Forums):** Circles has an active community and support channels. They have a **Discord server** where developers and users discuss issues, share project ideas, and help each other. It’s highly recommended to join – you can often get quick help from core team members there. (Look on the official docs or Circles website for an invite link – it’s usually mentioned under “Join the Technical Community”.) There might also be a Telegram or forum, but Discord is primary for technical Q\&A. Common Ground itself might have a community forum or channel for plugin developers, which could be useful if you have questions specific to the CG platform integration.

* **Common Ground Developer Docs:** Don’t forget resources provided by Common Ground for plugin development. This might include how to use the Common Ground SDK (if any), guidelines for iframes, messaging protocols between the host app and plugin, and any security considerations (e.g., content security policy, allowed domains). Since your plugin touches user authentication and data, make sure to adhere to Common Ground’s policies. If Common Ground has an official dev support channel or Slack/Discord, that’s worth joining as well.

* **Metri (Circles Wallet):** While optional for your implementation, keep an eye on **Metri** – the mobile Circles wallet ([https://metri.xyz](https://metri.xyz)). Their alpha release supports Circles with passkeys, which is a novel approach. They may release SDKs or APIs in the future. Even without that, understanding how Metri works (perhaps by reading any blog posts or asking in the Circles Discord) can guide you if you later want to incorporate similar functionality or ensure compatibility. For example, if a user created their account via Metri, you want to ensure your plugin can recognize that (which it will, since the SDK just sees a normal account). Metri’s constraint about key export is something to be mindful of if users switch between wallet apps.

* **Gnosis Chain Tools:** Since Circles runs on Gnosis Chain, general Gnosis Chain resources are handy. This includes:

  * **Block Explorers:** **GnosisScan** (formerly BlockScout) for mainnet, and BlockScout for Chiado testnet. You can look up transactions, addresses (like to see a user’s Safe and its internal tx), and events. For instance, the Hub contract at address `0x29b9...c543` on GnosisScan will let you inspect all trust events and transfers – useful for debugging.
  * **Faucets:** The official Gnosis Chain faucet (faucet.gnosischain.com) or community faucets to get free test xDAI.
  * **RPC Endpoints:** Aside from Circles’ own RPC, public Gnosis RPCs (like publicnode endpoints) or running your own node if needed.
  * **Libraries:** If you need lower-level interactions, ethers.js is your go-to (already in use). For contract ABIs, note that Circles v1 personal tokens are standard ERC20s (with some modifications for trust), and the Hub ABI is custom (available in the SDK or contract repo).

* **Example Projects:** The Circles team often open-sources example dApps or hackathon projects. For instance, the guide we saw references a SvelteKit demo app using the SDK. Exploring such examples can provide insight into best practices. They might show how to structure code for event listening or how to integrate UI components for trust graphs. Check the `aboutcircles` GitHub org for any demo repositories or the outcomes of events like DappCon hackathons.

By leveraging these resources, you’ll be well-equipped to build and refine the Circles plugin. Integrating a novel system like Circles can be challenging, but also rewarding – you’re effectively bringing a new economic model into Common Ground. Good luck, and enjoy building this bridge between social networking and decentralized currency!
