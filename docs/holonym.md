Great. I’ll prepare a full integration guide for how to add Holonym ID as a gating option to Curia. This will include how users can issue and submit a proof-of-personhood credential, how it can be verified (off-chain), and how to integrate it into the existing lock system so that creators can include it as one of the gating conditions. I’ll also focus on Ethereum Mainnet but make sure the guide is flexible for future EVM chains Holonym supports.

I’ll review the Holonym developer documentation and Curia’s current gating and certification structure to ensure seamless integration. I’ll let you know once the guide is ready.


# Integrating Holonym Proof-of-Personhood Gating in Curia

**Curia** is a forum platform that uses *write gating locks* to restrict posting based on blockchain data (e.g. holding a token or NFT). In this guide, we integrate **Holonym ID** as a new proof-of-personhood gating option. Holonym provides unique user identification via **Soulbound Tokens (SBTs)** and zero-knowledge proofs, allowing users to prove they are unique humans without revealing personal data. We will cover how to add a Holonym lock, how users obtain a Holonym credential, how to verify it (on-chain or off-chain), issuing short-lived post certificates, and supporting multiple EVM chains for Holonym.

## Background: Curia’s Gating Locks and Holonym ID

Curia already supports many gating locks (e.g. token holdings, NFTs, etc.), and Holonym ID will be one more option in this system. A *gating lock* in Curia is a condition that a user’s blockchain identity must satisfy to post in a forum. For example, a lock might require owning a certain NFT. When a forum has a Holonym lock, it will require users to prove **unique personhood** via Holonym before they can write posts.

**Holonym ID Proof-of-Personhood:** Holonym is a privacy-preserving identity protocol offering *proof of uniqueness*. A user verifies their identity (e.g. government ID or phone) with Holonym and mints a **soulbound token (SBT)** to their wallet as proof. Each person can only mint **one** such SBT for a given context to prevent Sybil attacks (one person using multiple wallets). This uniqueness is enforced by Holonym’s system – by default, one real ID can only verify one address. Once a user holds the Holonym SBT, any app (like Curia) can check that the user is a *unique human*. Holonym provides both on-chain verification (via the SBT contract) and off-chain zero-knowledge proofs for integration.

## Step 1: Add Holonym as a New Lock Option in Curia

The first integration task is to update Curia’s configuration to include Holonym as a lock type. This involves:

* **Updating the Lock Definitions:** In the Curia codebase, define a new lock type (e.g. `"holonymProofOfPersonhood"`) alongside existing types. Give it a user-friendly name (e.g. “Holonym Proof of Personhood”) so that forum creators can select it. If lock types are enumerated or listed in a config, add Holonym there. This ensures the UI will display Holonym as an option when creating or editing a forum’s locks.

* **Lock Parameters:** The Holonym lock might not require many parameters beyond the type itself (unlike token locks which need a contract address, etc.). However, you may include a setting for **Holonym credential type** (for example, government ID vs phone) or the **network** to check. For simplicity, you can default to government ID uniqueness on the primary Holonym network (Optimism) initially. Ensure the lock data structure can store the chosen Holonym parameters (if any).

* **User Interface:** Add form elements so that an admin selecting “Holonym Proof of Personhood” as a gating option can, for instance, choose the credential type (`gov-id` vs `phone`) or network if needed. If you plan to support **multiple chains**, the lock creation UI might allow selecting which chain’s Holonym SBT to accept, or you can decide to accept *any* supported chain by checking them all (we will discuss multi-chain support later).

With the new lock type added, Curia forums can now be configured to include a Holonym gating requirement (alone or in combination with other locks). Next, we implement the user flow to obtain and verify Holonym credentials.

## Step 2: User Obtains a Holonym Proof-of-Personhood Credential

When a user wants to post in a forum gated by Holonym ID, they must first **prove their personhood via Holonym**. There are two ways to integrate this: (A) using on-chain SBT issuance, or (B) using Holonym’s off-chain proof mechanism. In both cases, the user will go through Holonym’s verification process (KYC or phone verification) and get a proof of uniqueness tied to their wallet.

**A. On-Chain SBT Method (Holonym SBT):**

1. **Redirect to Holonym for SBT Issuance:** Guide the user to Holonym’s SBT issuance flow. Holonym provides a hosted interface for this. For example, you can redirect the user to a URL like:

   ```
   https://silksecure.net/holonym/diff-wallet/gov-id/issuance/prereqs
   ```

   This URL (with `diff-wallet` for external wallets and `gov-id` for government ID verification) will take the user through Holonym’s **Human ID** verification and then mint the SBT to their address. If you want to allow phone verification as an alternative, the `credentialType` could be `phone` instead of `gov-id`. (Holonym also supports ePassport NFC verification as another variant.)

   * In the UI, you might present a “**Verify with Holonym**” button that opens this link in a new tab or popup. Explain to users that they will need to complete a one-time identity verification. They should use the **same wallet address** for Holonym as they use for Curia (since the SBT will be tied to their posting address).

2. **User Completes Verification:** The user follows Holonym’s steps (for example, uploading an ID and maybe a selfie, or providing a phone number). After successful KYC, Holonym will mint a **soulbound token** to the user’s address on the chosen network (e.g. Optimism). The SBT represents that this address belongs to a unique person. The user is essentially getting a “Proof of Uniqueness” credential on-chain.

3. **Return to Forum:** Once the SBT is minted, the user can return to Curia to continue posting. (Holonym’s on-chain flow might not automatically redirect back, so you may just instruct the user to come back and click “I have my Holonym ID” or refresh the page.)

   *Development tip:* You could implement a check or button for the user to **confirm SBT issuance**. For example, after the user says they completed Holonym verification, your front-end can trigger the verification step (Step 3 below) to see if the SBT is now present.

**B. Off-Chain Proof Method (Zero-Knowledge Proof, no on-chain token):**

Holonym also offers an **off-chain proof** flow which returns a cryptographic proof of uniqueness, instead of minting a token. This might be preferable if you want to avoid blockchain transactions for users or support networks beyond those where the SBT is deployed. The flow is:

1. **Redirect to Holonym for Proof Generation:** Instead of the SBT URL, send the user to Holonym’s off-chain proof endpoint with a callback URL. For example:

   ```
   https://app.holonym.id/prove/off-chain/uniqueness?callback=https://yourforum.com/holonym-callback
   ```

   Here, `proofType=uniqueness` requests a proof of unique personhood (government ID by default). You can also use `uniqueness-phone` for phone-based uniqueness or `us-residency` for a specific attribute. The `callback` parameter is a URL on your app that will receive the proof.

2. **User Verifies and Gets Redirected:** The user completes the Holonym verification (similar KYC steps). Instead of minting a token, Holonym generates a **zero-knowledge proof** that the user is unique. The user is then redirected back to your specified `callback` URL with the proof included as a query parameter (e.g. `?proof=<PROOF_DATA>` in the URL).

3. **Capture the Proof:** Your application should have a route or front-end logic at the callback URL to capture the `proof` parameter. Ensure you URL-decode it and probably store it temporarily for verification.

Next, we will verify the user’s proof-of-personhood (either by checking the on-chain SBT or by verifying the off-chain proof). This step corresponds to enforcing the lock logic on the Curia side.

## Step 3: Verifying the Holonym Credential in Curia

Whether the user obtained an on-chain SBT or an off-chain proof, Curia needs to **verify** that credential to allow posting. This verification will be integrated into Curia’s posting flow (similar to how other locks are verified). When the user attempts to create a post, the server (or client) should check the Holonym lock conditions:

**A. Verification via Holonym API (for On-Chain SBT):**

Holonym provides a simple API to check if a given address has a valid uniqueness proof (SBT) for a given action. The default *action ID* is `123456789` (Holonym uses action IDs to distinguish contexts, but for general proof-of-personhood you can use the default). Using the API is straightforward:

* **API Call:** Send a GET request to Holonym’s API, for example:

  ```
  https://api.holonym.io/sybil-resistance/gov-id/optimism?user=0xYourUserAddress&action-id=123456789
  ```

  Here, `credential-type` is `gov-id`, and `network` is `optimism` in this example. You should substitute the user’s address and use the network where the SBT was minted. The API will respond with a JSON indicating whether the address has proved uniqueness for that action ID.

  Example response:

  ```json
  { "result": true }
  ```

  if the user **has a valid uniqueness SBT**, or `false` if not.

* **Multi-Network Checking:** If Holonym issues credentials on multiple networks, you have a few options. One approach is to try the API on each supported network until one returns `true`. For instance, you could check `optimism` (the primary Holonym network), and also `polygon`, `ethereum`, etc., as needed. *(As of writing, Holonym’s main deployment for personhood SBTs is on Optimism Mainnet. Ensure to update network queries if Holonym expands to other chains.)* You may also allow the lock to specify a particular network to check; in that case, use that directly in the API call.

* **On-Chain Alternative:** As an alternative to the API, Curia could directly call the Holonym SBT contract on-chain (via web3/ethers.js) to verify the proof. Holonym’s contracts (e.g. `IAntiSybilStore` interface) have methods like `isUniqueForAction(address, actionId)`. However, using the API is much simpler and offloads the contract logic to Holonym’s backend. The Holonym team notes that directly calling the older contracts is deprecated in V3, so the API is recommended for simplicity.

Using this API check, integrate it into the Curia posting permission logic. For example, when a user without a valid **post certificate** (see next step) tries to post in a Holonym-gated forum, your server will call the Holonym API for that user’s address. If `result: true` (meaning the user has proven uniqueness), then the lock condition is satisfied. If `false`, the user is not allowed to post (and should be prompted to complete Holonym verification).

**B. Verification of Off-Chain Proof:**

If you implemented the off-chain proof approach, the verification is done by using Holonym’s **off-chain SDK** to check the proof data:

* **Install Holonym’s SDK:** Holonym provides an NPM package `@holonym-foundation/off-chain-sdk` to verify the ZK proofs. You would import a function such as `verifyUniquenessProof()` into your code.

* **Call Verification Function:** When the user is redirected back with the `proof` parameter (a JSON string), pass that into `verifyUniquenessProof()`. For example:

  ```js
  import { verifyUniquenessProof } from '@holonym-foundation/off-chain-sdk';
  // ...
  const proofObj = JSON.parse(proofString);
  const isUnique = await verifyUniquenessProof(proofObj);
  console.log(`User is unique: ${isUnique}`);
  ```

  This function will return `true` if the proof is valid and the user is indeed unique. (Under the hood, it checks the proof’s integrity and that it’s signed by Holonym’s issuer keys.)

* **Server vs Client Verification:** You can perform this verification either on the client side (if you trust the client and just want to enable UI) or on the server side for security. Ideally, perform it on the server to decisively gate posts. For instance, your server’s post submission endpoint can require the user to include the proof (or a token derived from it) and then use the SDK (in a Node environment) to verify before accepting the post.

Once the proof is verified as valid, the user is confirmed to be a unique person for the forum’s purposes.

## Step 4: Issuing and Using Short-Lived Post Certificates

Curia’s design uses **post certificates** – short-lived authorizations that prove a user met the lock conditions recently – to avoid re-checking heavy conditions for every post. We will extend this mechanism to Holonym locks:

* **Generate a Post Certificate:** After a user successfully passes the Holonym verification (either via API result or ZK proof), issue a signed token or certificate that marks the user as *eligible to post*. This could be a JWT or any signed payload containing:

  * The user’s wallet address (or user ID in your system).
  * The ID of the forum (or lock) that was verified.
  * A timestamp or expiry indicating how long the certificate is valid (e.g. valid for 10 minutes or 1 hour).
  * Perhaps a signature by the server or a secret so it cannot be forged.

  The certificate can be stored in the user’s session or sent to the client to store (e.g. in localStorage or a cookie). In practice, you might already have this implemented for other lock types – reuse the same format for consistency.

* **Validity Period:** We recommend keeping the certificate valid for a short time (a few minutes up to a couple of hours) for security. Short validity ensures that if a user’s status changes or a credential is revoked (or if an attacker somehow intercepts a token), the window for misuse is limited. Since Holonym’s proof-of-personhood doesn’t really “expire” in itself (the SBT is permanent), the short duration is mainly to prompt re-checks periodically and ensure the user’s wallet is still under their control.

* **Using the Certificate:** When the user attempts to post, your server should check for a valid certificate:

  * If present and not expired, and it indicates Holonym lock was satisfied, the post is allowed without a new Holonym API call.
  * If missing or expired, the server will require the user to go through verification again (i.e. Step 2 and 3). In practice, you can prompt the user to re-verify if their certificate lapsed (“Please verify your Holonym ID to continue posting.”).

* **Certificate Issuance Flow:** For example, when `isUnique === true` is confirmed (from API or proof), your backend could create a JWT like `JWT({ sub: userAddress, lock: "holonym", forumId: 123, exp: now+15min })` signed with a secret. The frontend receives this and stores it (or the server stores it in a session). Thereafter, each new post request can include this token for quick validation. This way, expensive calls (Holonym API or proof verification) are not needed for every single post.

Ensure to integrate this with existing certificate management in Curia. Likely, there is already a system for issuing tokens when a user proves ownership of an NFT or passes another gate – extend that to handle the Holonym case.

## Step 5: Supporting Multiple EVM Blockchains for Holonym

Holonym’s proof-of-personhood credentials may exist on several EVM chains. Initially, Holonym’s government-ID SBT has been focused on **Optimism** (L2) for low-cost transactions, and possibly testnets like Base Sepolia for trial. However, Holonym’s design is multi-chain, and the forum should be flexible to support any chain where Holonym issues credentials (Ethereum mainnet, Polygon, Arbitrum, Avalanche, etc., as they come online).

To support multiple chains in Curia’s Holonym lock:

* **Holonym Network List:** Identify the major networks Holonym supports. According to Holonym’s documentation and ecosystem info, these include Optimism (main), and planned or active support for Ethereum, Polygon, Arbitrum, Avalanche, and others. Check Holonym docs or repositories for a list of contract addresses per chain (Holonym provides a JSON of proof contract addresses for each network).

* **RPC/Provider Setup:** If verifying on-chain, you’ll need a way to read the Holonym contracts on those chains. This could mean configuring web3 providers for each supported chain (using Infura/Alchemy or the users’ wallet provider if done client-side). Ensure Curia’s backend can connect to Optimism’s RPC at minimum. If using the Holonym API, you do *not* need direct RPC access for those chains – the API call just needs the network name.

* **Dynamic Network Parameter:** Modify the Holonym lock verification logic to use the correct network:

  * If your lock config specifies a single network, use that (e.g. a forum might specifically require “Holonym on Ethereum mainnet” – though this is less likely if Holonym’s main deployment is elsewhere).
  * If the lock is generic, you can attempt the verification on multiple networks. For example, call Holonym API for each network in a priority list until one returns true. This ensures that if the user’s Holonym SBT is on any supported chain, they pass the gate.
  * Alternatively, you can ask the user which network their Holonym credential is on, but this adds friction. Better to automate the checks if possible.

* **Chain-Agnostic Proof (Off-chain method):** Note that if you use the off-chain ZK proof approach from Step 2B, it is inherently chain-agnostic. The proof itself attests to uniqueness regardless of chain, and you verify it with the SDK using Holonym’s public parameters. In that case, multi-chain support is easier: you don’t worry about chain at all, since no on-chain token is needed. This might be a compelling reason to use off-chain proofs – one proof can serve across all environments.

* **Updating UI:** If relevant, update any user-facing text to reflect that multiple chains are supported. For example, if the forum currently assumes Ethereum Mainnet for wallet connection, you may allow the user to connect an Optimism wallet. You might integrate a network switch or automatically detect the user’s Holonym credential network. (If using off-chain proof, just ensure the user uses the correct wallet address throughout.)

* **Testing on Testnets:** It’s wise to test the flow on a test network if available. Holonym docs mention a “Dry Runs” feature and a Base Sepolia test deployment. You could test on Base Sepolia or Optimism Goerli to ensure your integration works, without real KYC. Holonym’s **Dry Run** mode (in their docs) might allow generating test proofs without actual verification.

By broadening the network support, Curia will not be limited to Ethereum mainnet for identity checks. At the time of writing, **Ethereum Mainnet is supported in Curia’s architecture**, but Holonym’s personhood SBT is primarily on Optimism – so this multi-chain enhancement is crucial to make the Holonym lock functional.

## Step 6: Final Integration and User Experience

With all the above components in place, the Holonym gating integration can be finalized:

* **Combine with Other Locks:** Curia allows multiple gating locks, so ensure that the Holonym lock plays nicely with others. The user should satisfy *all* locks to post (presumably Curia uses an AND logic for locks). For example, a forum could require holding Token X *and* having Holonym verification. In such cases, the user needs both a token proof and a Holonym proof. Make sure the post certificate covers both conditions or use separate certificates for each lock.

* **User Messaging:** Clearly communicate to the user what is required. Since proof-of-personhood is a new concept, add an explanation like: *“This forum is gated by Holonym Proof of Personhood. You must verify your humanity (one-time KYC/phone verification) via Holonym to post.”* Provide the link or button to start the process, and inform them that this protects the forum from bots/Sybil attackers.

* **Privacy Assurance:** Emphasize that Holonym preserves privacy – the forum only learns that the user is unique, not any personal details. Holonym uses zero-knowledge proofs, so even though the user provides an ID to Holonym, your application never sees that data.

* **Error Handling:** Handle cases where verification fails or the user aborts. If the Holonym API returns `result: false` (user has no SBT), prompt them to complete the verification. If the off-chain proof verification returns false, treat it similarly. Also handle expired certificates by prompting re-authentication gracefully.

* **Maintenance:** Keep an eye on Holonym’s updates. They might roll out to new chains or change their API. For instance, if Holonym introduces **Human Passport (Gitcoin Passport)** integration or new credential types, you might extend the lock to those. Holonym was expanding features (e.g., residency proofs, etc.), which could become additional gating criteria in the future.

By following these steps, you integrate Holonym ID as a robust gating option in Curia. This enables forums to ensure that each contributor is a unique individual, enhancing community trust and preventing bot abuse. Holonym’s blockchain-based personhood proof, combined with Curia’s flexible lock system, provides a powerful tool for Sybil-resistant forums.

**Sources:**

* Holonym Developer Documentation – *Integrating Human ID*, *API Reference*, *Off-Chain Proofs* (Holonym/HumanID by Holonym Foundation)
* Curia Project (Flotob/curia) – Forum gating concept (2025)
* GetBlock Project Description – *Holonym Overview* (Holonym usage on Optimism for ZK SBT)
