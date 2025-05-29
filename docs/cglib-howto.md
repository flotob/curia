Below is a “missing-manual” your Cursor AI agent can paste straight into its knowledge base or show to developers.
Everything is taken from the **CG Sample Plugin** and **CG Plugin Library (cglib)** sources, not from guess-work.

---

## 1 . Install the client library

```bash
npm i @common-ground-dao/cg-plugin-lib
```

This brings in **`CgPluginLib`** plus all TypeScript types you’ll need.

---

## 2 . Prerequisites the agent must supply at runtime

| What                  | Where it comes from                                                            | Why it matters                                           |
| --------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `iframeUid`           | Query-param added by Common Ground when it embeds your plugin (`?iframeUid=…`) | cglib uses it to route messages back to the right iframe |
| **Public PEM key**    | Shown once when you create the plugin                                          | Lets the parent verify every request                     |
| **`/api/sign`** route | Your backend, implemented with `@common-ground-dao/cg-plugin-lib-host`         | Signs each request before it’s sent to Common Ground     |

The values above are what you pass into `CgPluginLib.initialize(...)`. The README shows the exact call sequence.

---

## 3 . One-time bootstrap

```ts
import { CgPluginLib } from '@common-ground-dao/cg-plugin-lib';

const search = new URLSearchParams(window.location.search);
const iframeUid = search.get('iframeUid') ?? '';

const cg = await CgPluginLib.initialize(
  iframeUid,      // 1️⃣  iframeUid
  '/api/sign',    // 2️⃣  server route that returns a signed payload
  PUBLIC_KEY_PEM  // 3️⃣  your plugin’s public key
);
```

After this, you can grab the singleton anywhere with `CgPluginLib.getInstance()` (no extra params).

---

## 4 . Asking for community information

### 4-a . Minimal call

```ts
const { data: community } = await cg.getCommunityInfo();
```

That single line triggers an **action-typed request**:

```jsonc
{
  "type": "request",
  "data": { "type": "communityInfo" },
  "iframeUid": "<iframeUid>"
}
```

cglib wraps it in a signed envelope and posts it to the parent window; see the implementation at `clientLib/src/cgPluginLib.ts` → `getCommunityInfo()`.

### 4-b . TypeScript payload you get back

```ts
interface CommunityInfoResponsePayload {
  id: string;
  title: string;           // community name
  url: string;             // pretty URL on Common Ground
  smallLogoUrl: string;
  largeLogoUrl: string;
  headerImageUrl: string;
  official: boolean;
  premium: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  roles: CommunityRole[];
}

interface CommunityRole {
  id: string;
  title: string;
  type: 'PREDEFINED' | 'CUSTOM_MANUAL_ASSIGN' | 'CUSTOM_AUTO_ASSIGN';
  permissions: string[];
  assignmentRules:
    | { type: 'free' }
    | { type: 'token'; rules: object }
    | null;
}
```

cglib always wraps that in:

```ts
type CGPluginResponse<T> = {
  data: T;
  __rawResponse: string; // original signed JSON if you need to log/verify
};
```

So the fully-typed call is:

```ts
const { data } = await cg.getCommunityInfo(); // data is CommunityInfoResponsePayload
```

---

## 5 . Putting it all together (React example)

```tsx
'use client';

import {
  CgPluginLib,
  CommunityInfoResponsePayload,
} from '@common-ground-dao/cg-plugin-lib';

import { useEffect, useState } from 'react';

export default function CommunityCard() {
  const [community, setCommunity] = useState<CommunityInfoResponsePayload>();

  useEffect(() => {
    async function bootstrap() {
      // same three-argument init as before
      const cg = await CgPluginLib.initialize(
        new URLSearchParams(location.search).get('iframeUid') ?? '',
        '/api/sign',
        PUBLIC_KEY_PEM
      );

      const { data } = await cg.getCommunityInfo();
      setCommunity(data);
    }

    bootstrap().catch(console.error);
  }, []);

  if (!community) return <p>Loading…</p>;

  return (
    <div>
      <h2>{community.title}</h2>
      <img src={community.smallLogoUrl} alt="" />
      <p>Premium tier: {community.premium}</p>
      <h3>Roles you can assign</h3>
      <ul>
        {community.roles.map(r => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

The snippet mirrors the **`src/app/myInfo.tsx`** example in the sample plugin.

---

## 6 . Limits & errors the agent should expect

| Limit                                | Triggered where                       | Behaviour                                      |
| ------------------------------------ | ------------------------------------- | ---------------------------------------------- |
| **100 Requests / minute / iframe**   | `CgPluginLib.requestTimestampHistory` | Throws before sending                          |
| **Timeout** (default 2 s, 3 retries) | `__request` & `__safeRequest`         | Promise rejects with `"Request timed out"`     |
| **Signature failure**                | Parent returns bogus signature        | `__handleMessage` throws `"Invalid signature"` |

Handle these with `try/​catch` or expose them in the agent’s logs.

---

### TL;DR for the agent

1. Call `CgPluginLib.initialize(iframeUid, '/api/sign', PUBLIC_KEY)`.
2. Then `const { data } = await CgPluginLib.getInstance().getCommunityInfo();`.
3. `data` is a fully-typed `CommunityInfoResponsePayload`.

That’s it—now your Cursor AI knows exactly how to pull community info from any cglib instance.
