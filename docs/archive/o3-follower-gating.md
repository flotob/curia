Great — I’ll investigate the LUKSO follower protocol to find out exactly how "following" is implemented (e.g., via an LSP standard or key in ERC725Y), and how to detect if a Universal Profile has a certain number of followers or is followed by a specific address.

I’ll return with:

* A summary of how following works on LUKSO (on-chain mechanics, relevant keys or contracts)
* TypeScript/ethers.js code for frontend detection
* `fetch`-based code for backend validation (suitable for Next.js)
* Recommendations based on LUKSO’s official tooling and best practices

I’ll get started now and let you know once everything is ready for your agent to implement.


# LUKSO Universal Profile Follower Gating – Implementation & Guide

## 1. 📚 **LSP26 Follower System – Overview**

The **LSP26 Follower System** is LUKSO’s decentralized social graph standard. It provides a **global smart contract registry** on LUKSO mainnet that tracks follow relationships between addresses. Any Universal Profile (or even a regular address) can follow another, and the registry stores two lists per address:

* **Following list:** addresses that a given profile is following.
* **Followers list:** addresses that are following the profile.

This follower registry is deployed once network-wide (not one per profile), making it easy for any dApp to query follow data. **The official follower registry contract address on LUKSO mainnet is `0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA`.** (Ensure you use this address for mainnet; test networks may have a different deployment if applicable.) The LSP26 registry exposes a standard interface to **follow/unfollow** other profiles and to **query follower info**. We’ll use these functions to implement gating rules based on followers.

## 2. 🔢 **Gating by Follower Count (Minimum *N* Followers)**

To restrict content access by the number of followers, you can leverage LSP26’s **`followerCount`** function. This is a view function that returns how many addresses are currently following a given profile. For example, to require that a user (viewer) has at least **N** followers:

* **On-chain query:** Call `followerCount(viewerAddress)` on the LSP26 registry contract. This will return a `uint256` count of the viewer’s followers.
* **Gating logic:** Check if this count is >= *N* (the threshold you require). If yes, the gating condition passes.

**Example (front-end, using Ethers.js):**

```ts
import { ethers } from 'ethers';

const LSP26_ADDRESS = "0xf01103E5a9909Fc0DBe8166dA7085e0285daDDcA"; // LUKSO mainnet follower registry
const LSP26_ABI = [
  "function followerCount(address addr) view returns (uint256)"
];
const provider = new ethers.providers.JsonRpcProvider("https://rpc.mainnet.lukso.network");
const followRegistry = new ethers.Contract(LSP26_ADDRESS, LSP26_ABI, provider);

const viewerAddr = "0x...the viewer's address...";  
const followersNum = await followRegistry.followerCount(viewerAddr);
// followersNum is a BigNumber (uint256). Convert to a number or BigInt for comparison:
if (followersNum.gte(N)) {
  // viewer has N or more followers – allow access
} else {
  // viewer does not meet the minimum followers requirement – deny access
}
```

This call is a read-only `eth_call` (no gas or signature needed from the user). The **LSP26 registry** keeps an up-to-date count of followers, so you don’t have to iterate or tally events – one call gives the exact number. Under the hood, whenever someone follows or unfollows a profile, the registry updates this count. Using `followerCount` is the recommended way to retrieve a profile’s follower count, as it’s efficient and provided by the standard.

**Note:** If a profile is new or not followed by anyone, `followerCount` will return 0. There is no additional setup needed for a profile to be “followable” – by default all Universal Profiles can have followers via LSP26. (Future enhancements like **private accounts** simply require follow requests to be approved, but the `followerCount` will still reflect only actual approved followers.)

## 3. 🔍 **Gating by Specific Follower (Followed by X)**

Another gating rule is to require that the user is **followed by a specific Universal Profile X** (for example, a VIP or a particular influencer). In other words, the viewer must have X in their followers list. LSP26 makes this check straightforward via the **`isFollowing(follower, addr)`** function:

* **`isFollowing(follower, addr)`** returns a boolean indicating if `follower` is currently following `addr`.

To apply this rule, call `isFollowing(X, viewerAddress)`. If it returns `true`, that means **profile X is indeed following the viewer** – thus the viewer is followed by X, satisfying the gate. If `false`, the viewer is not (or no longer) followed by X, and the gate fails.

**Example usage:**

```ts
const LSP26_ABI = [
  "function isFollowing(address follower, address addr) view returns (bool)"
];
const followRegistry = new ethers.Contract(LSP26_ADDRESS, LSP26_ABI, provider);

const targetProfile = "0x...address of required follower (X)...";
const viewerAddr    = "0x...the viewer's address...";
const followedByX = await followRegistry.isFollowing(targetProfile, viewerAddr);
if (followedByX) {
  // X is following the viewer – grant access
} else {
  // Viewer is NOT followed by X – deny access
}
```

The order of parameters is important: **`isFollowing(X, Y)` checks if X follows Y**. In our case, X is the specific profile that should be following the viewer (Y). The function returns a boolean, so you don’t need to manually fetch or loop through follower lists. This single call is the most efficient way to verify the relationship.

**Alternate checks:** If you ever needed to gate on the reverse (e.g. require that the viewer is following X), you could call `isFollowing(viewerAddr, X)` – that would return true if the viewer follows X. The LSP26 registry covers both directions (followers and followees) with the same function by swapping arguments.

## 4. 🖥️ **Front-End Integration (Ethers.js)**

Integrating these checks in the front-end is straightforward. You can reuse your existing provider (connected to LUKSO’s network) and create a contract instance for the follower registry. LUKSO’s official tools do not yet have a high-level JS helper specifically for the follower registry, so you’ll use a minimal ABI or the full ABI JSON for LSP26. The examples above demonstrate using a minimal ABI array for the needed functions.

**Steps in the front-end:**

1. **Set up the contract:**

   ```ts
   const followRegistry = new ethers.Contract(LSP26_ADDRESS, LSP26_ABI, provider);
   ```

   Here, `LSP26_ADDRESS` is the known registry address (`0xf011...DDcA` on mainnet), and `LSP26_ABI` includes at least the functions you plan to call (e.g. `followerCount`, `isFollowing`). You can include the whole LSP26 ABI if available, or just the pieces you need as shown.

2. **Call the view functions:** Use `followerCount(address)` to get a follower tally, or `isFollowing(addr1, addr2)` to check a follow relationship. These return a BigNumber and a boolean (respectively) when using ethers. No signer is required for these read calls – the default provider or a connected readonly provider is enough (e.g., Infura or Lukso RPC endpoint). Ensure your provider is connected to the correct network (LUKSO mainnet, chain ID 0x2A).

3. **Apply gating logic:** In your UI or gating logic, evaluate the conditions with the returned values. For example, if `followerCount >= N` or `isFollowing(X, viewer) === true`, then allow the content to be shown; otherwise, you might display a message that the user doesn’t meet the requirements.

Because these are on-chain calls, they may take a short moment to fetch. It’s good practice to handle the loading state in the UI (e.g. show a spinner or disable the gated content until the check completes). The response is real-time – if someone just gained a new follower or got followed by X, the next call will reflect that updated state immediately.

## 5. 🔒 **Back-End Verification (Server-Side)**

For security, you’ll likely perform the same checks on your server or backend (for example, if you are rendering gated content on a server or verifying access in an API). This ensures that a malicious user cannot bypass gating by tinkering with front-end code. The backend can query the LSP26 contract via JSON-RPC directly:

* **Using Ethers/Web3 in Node:** If your backend environment supports Ethers or Web3, you can reuse the same approach as the front-end – instantiate a provider (pointing to a LUKSO RPC endpoint) and call the contract’s view functions. This is straightforward in a Node script or Next.js API route. Just be mindful to **never expose private keys**; you only need a provider for reads. If Ethers.js isn’t working in your Next.js setup (for example, bundling issues), consider using it server-side only (not in client bundle), or use a lighter RPC method as below.

* **Using direct JSON-RPC calls:** You can perform an `eth_call` to the LUKSO RPC without a library. For example, using `fetch` in Node:

  1. Prepare the call data. You’ll need the function signature and parameters encoded in hex. For `followerCount(address)`, the function selector is the first 4 bytes of `keccak256("followerCount(address)")`. The encoded data would be `0x4d4f1470` (for example) plus the 32-byte address (left-padded). Likewise, `isFollowing(address,address)` has its own selector (e.g. `0x...`). (Tip: You can get these encodings via Ethers’s `Interface.encodeFunctionData` or other ABI utilities).
  2. Send a JSON-RPC POST to the LUKSO endpoint (e.g. `https://rpc.mainnet.lukso.network`) with the `eth_call` method, specifying `{ to: LSP26_ADDRESS, data: "<encoded_data>" }`.
  3. Parse the result. The RPC will return a hex string in the `result`. For `followerCount`, convert it from hex to a number (it’s a hex-encoded uint256). For `isFollowing`, the result will be `0x000...001` for true or all zeros for false (boolean encoded as uint256). Convert that to a boolean.

**Example (Node/Pseudocode):**

```js
const payload = {
  jsonrpc: "2.0",
  id: 1,
  method: "eth_call",
  params: [
    {
      to: LSP26_ADDRESS,
      data: "0x4d4f1470" + viewerAddressHexPadded  // followerCount(address) call data
    },
    "latest"
  ]
};
const res = await fetch(LUKSO_RPC_URL, { method: "POST", body: JSON.stringify(payload) });
const json = await res.json();
const hexResult = json.result; 
// e.g., hexResult = "0x0000000000000000000000000000000000000000000000000000000000000015" for 21 followers.
const followerCountNum = parseInt(hexResult, 16);
// Now check followerCountNum >= N.
```

*(In practice, use a proper ABI encoding library to avoid mistakes. The above illustrates the approach.)*

By verifying on the backend, you maintain a secure enforcement of the gating rules. Even if a user manipulates the front-end, they cannot fake the on-chain follower data when the server cross-checks it.

## 6. 💡 **Additional Tips & Best Practices**

* **Use the Official Registry:** Always query the known LSP26 registry contract (on mainnet it’s at **0xf011...DDcA**). This is the source of truth for follow relationships on LUKSO. Avoid trying to infer follower relationships from events or off-chain data; the contract’s state is canonical and up-to-date.

* **Leverage Provided Functions:** The LSP26 standard gives you high-level views like `followerCount` and `isFollowing`. Utilize them instead of manual iteration. For example, you could retrieve a full list of followers via `getFollowersByIndex(addr, start, end)` if needed, but for simply counting or checking a specific follower, the direct functions are more efficient and easier to use.

* **Performance Considerations:** Both `followerCount` and `isFollowing` are optimized, constant-time lookups. Even if a profile has thousands of followers, `followerCount` will return the number instantly, and `isFollowing` will check the membership in O(1) time (likely via a set or mapping internally). However, each call is a network request. If you need to check multiple conditions (say, token holdings *and* follower data), you might perform them in parallel or batch where possible to reduce latency.

* **Updates and Future Changes:** The follower system may evolve (e.g., LSP26 has proposals for private accounts, removing followers, blocking, etc., in future versions). These mostly **add new functions** but keep the core interface intact. The calls shown above will continue to work for standard follow checks. Just be aware that if a profile enabled “private mode”, a user might have sent a follow request that isn’t approved yet – such pending follows do **not** count in `followerCount` and `isFollowing` (which only reflect confirmed followers). In other words, our gating logic naturally respects those privacy features: only actual followers count.

* **Testing on LUKSO Testnet:** If you are developing on a LUKSO testnet (e.g., L16), check LUKSO documentation or community resources for the testnet deployment of LSP26 (if available). The concept and interface are the same, but the contract address could differ on testnet. You can often find this in LUKSO’s GitHub or ask in their developer community. On mainnet, you’re all set with the official address.

By incorporating the LSP26 follower checks both in your front-end gating logic and in your backend verification, you ensure a robust system. You can now support content that’s gated by a user’s social graph – for example, *“Only users with at least 100 followers can view this”* or *“Content exclusive to those followed by @PopularCreator”*. This adds a powerful social dimension to your Universal Profile-based application, fully using LUKSO’s Web3 social features. Enjoy building with LSP26! 🚀

**Sources:** The official LUKSO announcement of the LSP26 follower registry, and the LSP26 interface definitions for functions used in our implementation.
