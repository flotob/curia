### TL; DR for Cursor-AI

1. **Metri wallets are built on Cometh Connect (Safe + passkeys).**
2. **WebAuthn passkeys are *origin-bound* – the credential Metri stores for `app.metri.xyz` cannot sign from your plugin’s domain.** ([docs.cometh.io][1])
3. **Metri therefore does *not* expose an injected `window.ethereum` provider or WalletConnect endpoint today.** (No mention in the docs, no connector in the Connect-SDK repo, and the Cometh FAQ explicitly calls out the origin rule.) ([npm][2], [docs.cometh.io][1])
4. **You have two practical options:**

| Situation                   | What to do                                                                                                                                                                                   | UX cost                                                            | Dev cost                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Existing Metri users**    | Ask them to prove control **on-chain** (e.g. “send 0.0001 CRC or set a 1-hour trust link to `CuriaVerifier`”) inside Metri. Your backend watches Gnosis Chain; first matching tx = verified. | 1 click in Metri; no new wallet.                                   | Just an indexed event listener + a short REST endpoint.                                   |
| **New users / advanced UX** | Embed **Cometh Connect SDK** in the plugin and let users create/restore a *second* passkey Safe *on your domain*. You get the same “seed-less” magic, but credentials are usable in-place.   | Looks like Metri, but wallet lives under `curia.community` origin. | 1–2 days: include `@cometh/connect-sdk`, request an API-key, wrap it in your React hooks. |

---

## 1  Why Metri wallets can’t “just connect”

* **Metri = Safe smart-account + Cometh Connect passkey signer**.
* WebAuthn **passkeys are scoped to the origin they were created on**. The Cometh docs warn:

> “Passkeys are bound to domain… a signer created on *cometh.io* is not available on *battle.io*.” ([docs.cometh.io][1])

* No injected provider, no WalletConnect bridge is shipped in Metri 1.x. (GitHub & NPM packages: only SDKs for *embedding* Connect in *your* site.) ([npm][2])

So a browser tab open on `curia.community` cannot request a signature from the key stored for `app.metri.xyz`. That’s a WebAuthn rule, not a Circles rule.

---

## 2  Proving ownership **without** a wallet connector

### A. Challenge-transaction flow (works today)

1. **Backend generates a unique challenge** (nonce → `crc:0xYourBackend` memo or trust-limit = 7).
2. Show the challenge & a *“Open in Metri”* deep-link:

```
https://app.metri.xyz/transfer?to=0xCuriaVerifier&amount=0.0001&memo=nonce123
```

3. User taps → Metri opens → they approve.
4. Backend’s Gnosis-chain watcher sees `CuriaVerifier` receive either:

   * a token transfer **from that Safe** *or*
   * a `TrustChanged(Safe, CuriaVerifier, …)` event.
5. Record `safe → curiaUserId` in DB; challenge fulfilled.

*Pros*: zero extra wallet installation.
*Cons*: user must flip to Metri app; only proves once (no session key).

### B. Signature via Safe Transaction Service (optional)

If you want pure off-chain signing:

1. Generate a **Safe typed-data message** (`SAFE_MSG_TYPEHASH…`).
2. POST it to Gnosis Safe Transaction Service `/safes/<safe>/messages/` with status = `UNSIGNED`.
3. Show the SafeTxService link; Metri renders it under **“Messages”**; user signs it with passkey.
4. Poll `…/confirmations/` until the signature appears → verified.

This is UX-heavier (user has to find the “Messages” tab) but avoids any token movement. It still works on any Safe-compatible wallet, including Metri.

---

## 3  On-site passkey wallet for new users

Cometh Connect SDK gives you the exact same tech that Metri uses but **directly in your Next.js page**:

```ts
import { ComethWallet, ConnectAdaptor, SupportedNetworks }
        from '@cometh/connect-sdk';

const adaptor = new ConnectAdaptor({
  chainId: 100,           // Gnosis mainnet
  apiKey:   process.env.NEXT_PUBLIC_COMETH_KEY
});

const wallet = new ComethWallet({
  authAdapter: adaptor,
  apiKey:      process.env.NEXT_PUBLIC_COMETH_KEY,
  rpcUrl:      'https://rpc.gnosischain.com'
});

await wallet.connect();   // creates / restores a passkey Safe
```

* The first call asks the browser to create a WebAuthn credential scoped to **`curia.community`** (or your plugin’s sub-domain).
* Same Safe pattern as Metri; same CRC minting; but now the key *can* sign directly in the iframe because the origin matches.
* You can feed that signer to Circles-SDK via `new Sdk(new ComethAdapter(wallet), circlesConfig[100])` (see demo in Cometh repo). ([docs.cometh.io][3])

This path lets you keep one code-path (ethers-style signer) for MetaMask *and* passkey wallets.

---

## 4  Recommended integration roadmap

1. **Short term (≤1 week)**

   * Implement challenge-transaction verification for Metri users.
   * Keep current MetaMask/Ethers flow for power users.
2. **Mid term**

   * Add Cometh Connect SDK behind a “One-tap secure wallet” button for new joiners.
   * Detect if a user already verified a Metri Safe; if not, suggest creating the built-in passkey wallet instead of forcing MetaMask.
3. **Long term**

   * If/when Cometh launches a WalletConnect v2 bridge, swap the challenge flow for a proper “Connect Metri” QR.
   * Migrate to Circles-v2 SDK (Pathfinder 2.0, trust-proxy, etc.) once mainnet goes live (announced May 21 2025). ([Gnosis][4])

---

## 5  What to tell product & design

* **Metri users *can* play — but you’ll ask them for a quick on-chain handshake.**
* **Everyone else gets an even smoother UX** with passkeys right inside Curia, no extension needed.
* **Consistency with Circles ethos:** both flows keep the user in full control of a Safe; no custodial keys on Curia servers.

---

### Key sources

* Gnosis blog on Metri & passkeys ([Gnosis][4])
* Cometh FAQ on passkey origin binding ([docs.cometh.io][1])
* Connect-SDK NPM & docs snippets ([npm][2], [docs.cometh.io][3])

[1]: https://docs.cometh.io/connect/resources/faq?utm_source=chatgpt.com "FAQ | Connect"
[2]: https://www.npmjs.com/package/%40cometh%2Fconnect-sdk?utm_source=chatgpt.com "cometh/connect-sdk - NPM"
[3]: https://docs.cometh.io/connect/features/create-a-wallet?utm_source=chatgpt.com "Create a wallet | Connect"
[4]: https://www.gnosis.io/blog/self-custody-simplified-a-guide-to-metri-wallet?utm_source=chatgpt.com "Self-Custody Simplified: A Guide to Metri Wallet - Gnosis"
