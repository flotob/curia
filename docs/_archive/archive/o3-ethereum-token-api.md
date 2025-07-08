Got it. I’ll research external APIs that allow Ethereum mainnet token and NFT collection search by name or symbol, with a focus on features like logo URLs, verified badges, autocomplete support, and rich metadata. I’ll include details for CoinGecko, Moralis, Alchemy, DefiLlama, 1inch, Uniswap Token Lists, OpenSea, and any other major providers.

I'll document search endpoints, rate limits, authentication requirements, example responses, and integration complexity. I’ll let you know as soon as I have everything compiled.


# Ethereum Token & NFT Search API Providers

Searching Ethereum **ERC-20 tokens** and **NFT collections** by name or symbol (instead of by contract address) is a common need for wallets and dApps. Below, we document major API providers that offer such search functionality, along with their endpoints, usage, and features. The focus is on Ethereum mainnet, highlighting whether each API supports token search, NFT collection search, auto-complete suggestions, rich metadata (logos, verification status, etc.), rate limits, and pricing.

## CoinGecko API

CoinGecko offers a widely-used free API for cryptocurrency data. It includes a **search endpoint** that can find coins (including Ethereum-based tokens) by name or symbol. The endpoint is `GET /api/v3/search` with a `query` parameter for the search term. For example, querying `"USDC"` or `"WETH"` will return matching coins sorted by market cap. Key details:

* **Search Results & Metadata:** The search response JSON contains multiple sections (e.g. `coins`, `exchanges`, `categories`, `nfts`). For coin results, each entry includes the CoinGecko **coin ID**, **name**, **symbol**, market cap rank, and image URLs (e.g. `thumb` for a small logo icon, `large` for a larger image). *Example:* A search for “SHIB” returns an entry with `"id": "shiba-inu", "name": "Shiba Inu", "symbol": "shib", ... "thumb": "<img_url>"`. (Note: The search result gives CoinGecko’s coin ID; to get contract address and decimals, you would use a follow-up call like `GET /api/v3/coins/{id}` or their contract-address lookup endpoints.)

* **NFT Collection Search:** CoinGecko’s search may also return NFT collections in the `nfts` array if the name matches a known collection (CoinGecko tracks some NFT collections). For example, a query for “CryptoPunks” might return a `nfts` entry with the collection name. However, this is a newer feature; CoinGecko primarily excels at fungible token search.

* **Auto-complete & Suggestions:** The `/search` endpoint supports partial queries, making it suitable for real-time suggestions as a user types. Results are ordered by market cap by default, so more popular tokens appear first, which is useful for auto-complete (they also provide a `/search/trending` endpoint for top trending searches).

* **Verification/Trust Indicators:** CoinGecko doesn’t explicitly mark tokens as “verified” in the search results. It generally lists any indexed token. However, the popularity ranking and the fact that CoinGecko manually adds coins can serve as an implicit trust indicator. (They also categorize some tokens by categories like DeFi, etc., but no badge system in the API.)

* **Rate Limits & Pricing:** CoinGecko’s **public API is free** and does not require an API key. The public usage is subject to IP-based rate limits of about **10-30 calls per minute** (CoinGecko recommends 1 call/second or less for free usage). They also offer a **free “Demo” API key** (with roughly 10,000 calls/month and up to \~30 calls/minute) and paid plans for higher needs. Paid plans (starting from Analyst tier) raise the rate limit (e.g. up to 500 calls/min) and provide more endpoints. The free tier is sufficient for moderate usage, but heavy real-time search might require caching or an API key.

* **Example Response:** Searching “USDC” might yield (abridged):

  ```json
  {
    "coins": [
      {
        "id": "usd-coin",
        "name": "USD Coin",
        "symbol": "usdc",
        "market_cap_rank": 6,
        "thumb": "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
        "large": "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389"
      },
      ... 
    ],
    "exchanges": [...],
    "categories": [...],
    "nfts": [...]
  }
  ```

  (This shows CoinGecko provides the token’s name, symbol, and images. The contract address and decimals would be obtained via a different endpoint using the `id`.)

## Moralis API

Moralis provides web3 developer APIs, including dedicated **token search** and NFT endpoints. Moralis’s **Token Search API** can search tokens by name, symbol, or even by contract address across multiple chains (including Ethereum). It is designed for **fast, cross-chain search** with rich metadata:

* **Token Search Endpoint:** Moralis’s token search is a **premium API endpoint** (available as an add-on to paid plans). The endpoint (in Moralis v2) is a GET request like `/erc20/search` or similar (exact path depends on version) with query parameters for the token name/symbol. For example, searching “SHIB” would return Shiba Inu’s token data. Moralis emphasizes **partial matches** (smart auto-complete), so queries like “Shi” will match “Shiba Inu”, etc..

* **Returned Data:** The response includes **token metadata** such as the contract address, name, symbol, **decimals**, total supply, and possibly market data (price, market cap) if available. It also provides a **verification status** flag for each token. For example, Moralis will indicate if a token is flagged as spam or a known scam token (they have advanced spam detection). This is useful for trust – you can filter out unverified or suspicious tokens.

* **NFT Collection Search:** In addition to ERC-20s, Moralis has an **NFT search** endpoint (`GET /nft/search`) that lets you search NFTs by metadata (name, etc.). However, this searches individual NFT metadata rather than collections specifically. You could search “Bored Ape” and get a list of NFT tokens whose metadata name matches “Bored Ape”, which would all be from Bored Ape Yacht Club’s contract if indexed. Moralis does not explicitly return a single collection entry with logo in the search; you’d get NFT items and from those you could derive the collection address. So Moralis is stronger for token search; NFT collection search is indirect (or you’d use their NFT APIs by contract once you know the name).

* **Auto-complete:** Moralis supports partial and fuzzy searches (they advertise “instant, partial matching” for names/symbols), so you can call the token search on each keystroke to get suggestions. The results can be sorted by relevance or even by market cap, liquidity, etc., using their parameters.

* **Rate Limits & Pricing:** Moralis requires an API key (even for free tier). The **free tier** offers limited calls (e.g. \~3,500 calls/day) and standard rate limits, while higher paid tiers increase that. **However, the token search endpoint is premium** – Moralis notes that you must have a special add-on or enterprise plan to use it (you can request a trial for testing). This implies that on the free/community plan, the token search may not be accessible. Paid plans vary; Moralis’s pricing page would detail call quotas. For regular (non-premium) endpoints, rate limits might be on the order of a few requests per second for free users. Since token search is intensive (cross-chain indexing), it’s kept behind a higher tier.

* **Example:** Moralis’s documentation indicates you can get **symbol, name, address, decimals, supply, and even current price and market cap** in one search response. For instance, searching “WETH” might return:

  ```json
  {
    "token": "WETH",
    "name": "Wrapped Ether",
    "address": "0xC02aa...6Cc2",
    "decimals": 18,
    "chain": "eth",
    "price": 1825.50,
    "market_cap": 21900000000,
    "verified": true
  }
  ```

  (Fields are illustrative; actual response may nest data differently. The key point is Moralis provides rich info and cross-chain results – e.g., if a name matches tokens on multiple chains, those can be listed.)

## Alchemy API

Alchemy is primarily a blockchain node/infra provider, but it offers enhanced APIs for token and NFT data which can assist with search functionality:

* **Token Metadata (by Address):** Alchemy has an endpoint `alchemy_getTokenMetadata` (available via their JSON-RPC or SDK) that returns metadata for a given ERC-20 contract address. This includes the token’s **name, symbol, decimals, and even a logo URL** if available. For example, calling this for the USDC contract yields `{ name: "USD Coin", symbol: "USDC", decimals: 6, logo: "<url>" }`. This is useful for getting rich metadata once you have a contract address (e.g. after using another service to resolve a name to address), but it **does not perform name search** by itself (you must supply the address).

* **NFT Collection Metadata & Search:** Alchemy’s NFT API includes a **Contract Metadata** endpoint and recently a **Search endpoint** for NFT collections. The `getContractMetadata` call returns an NFT collection’s details by contract address – including collection **name, symbol, total supply**, and **OpenSea metadata** if available (e.g. OpenSea’s collection description, image, and whether the collection is verified). Notably, Alchemy surfaces OpenSea’s `safelist_request_status` which indicates verification (e.g. “verified” for BAYC’s contract on OpenSea) and the collection’s image\_url and floor price via the OpenSea data if the collection is recognized.

  – **Search Contract Metadata:** Alchemy introduced a new endpoint `searchContractMetadata` that **allows searching NFT contract metadata by keyword**. This lets you search for collections by name. For example, querying “Bored Ape” via `searchContractMetadata` will return a list of matching NFT contracts (such as Bored Ape Yacht Club, Bored Ape Kennel Club, etc.) with their addresses and names. Each result includes the contract **address, name, symbol, and total supply**. (You would likely follow up with `getContractMetadata` or use the OpenSea data for logos after obtaining the address, because the search response itself returns basic fields — as shown by Alchemy’s example with placeholders for address, name, symbol, totalSupply.)

  – **Auto-complete:** The `searchContractMetadata` is designed for partial keywords across all indexed ERC-721/1155 contracts, enabling auto-complete suggestions for NFT collections. For tokens, Alchemy doesn’t have a similar name-search endpoint, so you’d need to rely on other services for token name suggestions, then use Alchemy for data on selection.

* **Spam/Trust Indicators:** Alchemy has a concept of **spam NFTs**. They maintain a feed of addresses flagged as spam contracts (e.g. airdropped scam NFTs). Endpoints like `isSpamContract` let you check if a collection is marked as spam. While this is not the same as “verified blue check”, it’s a useful trust signal (if an NFT contract is flagged as spam, you might hide it). For ERC-20 tokens, Alchemy doesn’t label scams – it’s mostly a data provider – so combining Alchemy with a token allowlist or CoinGecko data might be needed for verification.

* **Rate Limits & Pricing:** Alchemy’s APIs require an API key (free to sign up). The **free tier** (Growth plan) includes quite generous request volumes (e.g. 300,000 compute units per month) and up to 15 requests/sec in bursts for their enhanced APIs. The NFT API calls have a certain CU cost (for example, a `searchContractMetadata` call might count as a few compute units). For heavier usage, paid plans increase the monthly quota and throughput. In practice, Alchemy can handle real-time searches under free tier for development, but a production app with heavy search traffic might need a paid plan or caching. The response speed is generally fast (Alchemy’s infrastructure is optimized for low-latency queries across their distributed nodes).

* **Example:** Using Alchemy’s NFT search for “CryptoPunks” might return an array like:

  ```json
  [
    {
      "address": "0xb47e...3bbb", 
      "name": "CryptoPunks", 
      "symbol": "Ͼ", 
      "totalSupply": "10000"
    }
  ]
  ```

  Then `getContractMetadata` on that address could return:

  ```json
  {
    "name": "CryptoPunks",
    "symbol": "Ͼ",
    "totalSupply": "10000",
    "tokenType": "ERC721",
    "openSea": {
      "imageUrl": "https://openseauserdata.com/...",
      "safelistRequestStatus": "verified",
      "floorPrice": 50.2,
      "description": "CryptoPunks is a collection of 10,000 uniquely generated characters..."
    }
  }
  ```

  This shows how Alchemy can provide the collection image and verified status (from OpenSea data) after you have the contract from the search.

## DeFi Llama API

DeFi Llama (defillama) is known for DeFi analytics and also provides an **open API** for various data. It aggregates token information (especially prices and TVL) from multiple sources. While DeFi Llama does not have a dedicated “search by name” endpoint for tokens in the same way CoinGecko does, it maintains comprehensive token lists and data that can be used for search functionality:

* **Token Lists & Endpoints:** DeFi Llama’s API includes endpoints to query token prices by address or to retrieve lists of coins. For example, they have endpoints like `/coins/list` or price query endpoints for a given token address or CoinGecko ID. They cover thousands of Ethereum tokens (and tokens on other chains). A developer could fetch their entire token list and then perform local search by name or symbol. The token list entries usually include the token’s name, symbol, addresses on each chain, and a unique ID or slug. (DeFi Llama often maps tokens by using CoinGecko’s ID internally or their own slug, as they mention that most tokens are priced via CoinGecko’s API under the hood.)

* **Usage & Auto-complete:** Since there isn’t an official free-text search endpoint, using DeFi Llama for search might involve downloading their data and searching it. For instance, one could query `https://api.llama.fi/protocols` or similar endpoints to get a list of all projects/tokens and filter it. This is feasible for implementing an auto-complete (you’d load a list of tokens into memory and then match user input). However, this is more of a DIY approach. On the DeFi Llama website, the search bar allows searching assets and protocols (likely backed by their internal API or index), but the public API documentation doesn’t explicitly list a search query for tokens.

* **Metadata & Logos:** DeFi Llama’s data for tokens typically includes addresses and sometimes logos. They have an icon repository for protocols and possibly tokens. However, documentation on logo URLs is not as straightforward as CoinGecko’s. Some of their endpoints might return a logo or you might utilize a community token list for images.

* **Trust Indicators:** DeFi Llama doesn’t label token verification status. It is a data aggregator – it will list even small or scam tokens if they appear in DeFi contexts (like liquidity pools) as long as they track them. There isn’t a concept of “verified” vs “unverified” token in their API. It would be up to the developer to decide which token lists (e.g., only known lists or top N by market cap) to include for user searching to avoid obscure tokens.

* **Rate Limits & Pricing:** The DeFi Llama API is **free and open** (no API key required). They encourage reasonable use and even offer a \$300/month **Pro tier** for higher rate limits or support. For most use cases, the free API is sufficient and quite generous. Exact rate limits aren’t strictly published (since it’s open), but heavy requests might get throttled. The data is often cached and updated on a schedule (some endpoints update every few minutes). Response speed for individual calls (e.g., price lookup) is good (tens to low hundreds of milliseconds). If you choose to download large lists (like all coins list), that might be slower due to size.

* **Example:** DeFi Llama’s price API can take a query like `/prices/current/ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` (for USDC on Ethereum) and return JSON with the price and info. A hypothetical combined token list might include:

  ```json
  {
    "coins": {
       "ethereum:0xa0b8...6eb48": { "symbol": "USDC", "name": "USD Coin", "decimals": 6 },
       "ethereum:0xC02aa...6Cc2": { "symbol": "WETH", "name": "Wrapped Ether", "decimals": 18 },
       ...
    }
  }
  ```

  You could search within such data for “USD Coin” or “USDC” to retrieve the address. In summary, DeFi Llama can be part of a solution (especially for getting price and TVL data), but on its own it’s more of a data source than a full text search service.

## 1inch API

1inch, known for its DEX aggregator, provides a **Token API** that allows searching tokens by name, symbol, or address. This is a newer offering aimed at wallet and dApp developers, separate from the core swap API:

* **Token Search Endpoint:** The 1inch Token API has a unified search endpoint (available in their Developer Portal) where you can query any token by name/symbol/address. For example, searching “SHIB” would return the Shiba Inu token metadata. The API is multi-chain: you can search Ethereum tokens as well as tokens on BSC, Polygon, etc., all in one interface. It supports **over 5 million tokens across 11+ networks**, with very fast response times (1inch touts \~150ms responses).

* **Data and Response:** The token metadata returned by 1inch includes the **token’s name, symbol, contract address, decimals**, and a **logo URL**. 1inch likely uses the same data that powers its wallet app, meaning logos are available for many tokens. The data is reliable for “blue-chip” tokens and popular tokens (since 1inch integrates common token lists). It may also include an indicator if a token is ***1inch verified*** (for instance, 1inch and other aggregators often maintain an allowlist of tokens to show by default to avoid scams). The exact field for verification isn’t documented publicly, but being included in their default search implies a level of trust (scam tokens typically wouldn’t be in their dataset unless the user adds them manually).

* **Auto-complete:** The API is designed for search-as-you-type. You can call it with partial queries, and it will return matching tokens (likely ordered by some relevance, possibly volume or popularity). This means you can implement an auto-complete dropdown that hits 1inch’s endpoint and shows suggestions (“WETH”, “WETH (Polygon)”, etc. if you search “WET”). The performance (<150ms) is optimized for this use-case.

* **Rate Limits & Access:** 1inch’s Token API **requires an API key** from their developer portal. It is a commercial API (they may have a free tier or trial, but details would be in their docs). This is separate from the free **1inch Swap API**. The Swap API (for price quotes) is free and had endpoints like `GET /v5.0/1/tokens` for the list of tokens on Ethereum with metadata (which was publicly accessible without a key). For example, `https://api.1inch.io/v5.0/1/tokens` returns all Ethereum tokens supported by 1inch, including their symbols, names, addresses, and logos. This can be used without auth, but it’s a full list rather than a search. For real-time search, the dedicated Token API with a key is the intended solution. Rate limit information isn’t explicitly public; presumably the free tier might allow a few requests per second. Since it’s meant for instant UX, even the free tier likely can handle user keystroke queries (with maybe 50–100 queries/minute). They also mention an **enterprise endpoint** for higher performance needs.

* **Example Response:** A search query via 1inch might return data like:

  ```json
  {
    "address": "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    "name": "Shiba Inu",
    "symbol": "SHIB",
    "decimals": 18,
    "chain": "eth",
    "logoURI": "https://tokens.1inch.io/0x95aD...cCe.png"
  }
  ```

  If multiple matches, it could return an array. The `logoURI` gives an icon, and the data is ready to use. 1inch’s data is quite robust for Ethereum mainnet tokens – it’s the same set used to power 1inch’s own UI token lists.

## Uniswap Token Lists

Uniswap doesn’t have an active search API, but it pioneered the **Token Lists standard**: essentially JSON files that list tokens with metadata. These lists are used by Uniswap and many other wallets/dApps. They are a great resource to enable searching tokens by name/symbol locally:

* **Token List JSON:** The Uniswap **Default Token List** (and others like the CoinGecko list, Kleros list, etc.) are publicly hosted JSON files. For example, the Uniswap default list is at **`tokens.uniswap.org`** (resolving to an IPFS link). This JSON contains an array of token objects, each with the token’s **address, chainId, name, symbol, decimals, and a logo URI**. *Example entry:*

  ```json
  {
    "chainId": 1,
    "address": "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    "name": "Aave",
    "symbol": "AAVE",
    "decimals": 18,
    "logoURI": "https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png?1601374110"
  }
  ```

  . This shows all necessary info, including a link to an image (often hosted by CoinGecko or trustwallet assets).

* **Using Token Lists for Search:** To implement search, you would fetch these JSON lists (which can be done at app load or periodically, as they update) and then filter the in-memory list by name or symbol as the user types. Since these lists are in a standard format, you can combine multiple lists if needed (Uniswap’s default covers many popular tokens; there are also lists for specific niches). This approach is **client-side** and very fast once the list is loaded (search is just string matching in the array). It’s exactly what Uniswap’s interface does under the hood.

* **Verified Status:** Some token lists include **tags** or are curated to include only verified tokens. For example, Uniswap’s default list is curated by Uniswap and generally avoids malicious tokens (though inclusion doesn’t involve an official “verified” badge, it’s implicitly trusted if it’s on the list). Other lists (like the **CoinGecko token list** or **1inch list** or **Gemini exchange list**) might have their own criteria. The Token Lists schema allows tags like `"verified": true` or categories (e.g., “stablecoin”), but not all lists use these. If needed, one could choose a “verified tokens” list or cross-check a token against a reputable list to decide trust.

* **Auto-complete:** Because the data is local, auto-complete is straightforward and instantaneous after initial load. You can show suggestions as you match substrings in the token name or symbol. One downside is that truly new tokens (just deployed) won’t be in the list until it’s updated. For real-time new token search, an API like Moralis or 1inch might be needed. But for most well-known tokens, token lists are sufficient.

* **Rate Limits & Integration:** No API key or rate limiting – these are static files fetched via HTTP/IPFS. The main “cost” is the size of the list (a few hundred to few thousand tokens typically). The Uniswap default list has a few hundred tokens; extended lists can have thousands, but even the full CoinGecko token list (which covers all CoinGecko coins) is only a couple megabytes. Fetching that occasionally is fine for most apps.

* **Example:** A user typing “USDC” in your app could trigger filtering of the token list JSON array for `symbol == "USDC"` or `name` containing “USD Coin”. The result would immediately show “USD Coin – USDC” with its logo, and you’d have the contract address (`0xA0b869...`) ready to use. This approach is simple and reliable for Ethereum mainnet where token lists are well-maintained.

## OpenSea API

OpenSea provides an API for NFT data, focusing on NFT **collections and assets**. While the OpenSea API does not offer an open “search by name” endpoint for collections (the way a user can search on the website), it does allow retrieval of collection data if you know the collection identifier, and third-party solutions exist to search collections:

* **Collection Data Endpoints:** OpenSea’s official API (v1 and v2) has endpoints to get collection details by slug or to get lists of collections. For example, `GET /api/v1/collection/{slug}` returns the details of a collection. If you know the slug (e.g. `"boredapeyachtclub"`), you can retrieve data including the collection’s name, description, **image\_url (logo)**, floor price, and **verification status**. The verification status on OpenSea is indicated by the field `safelist_request_status` – a value of `"verified"` means the collection has the blue check on OpenSea. (Other possible values are `"not_requested"`, `"approved" (but not yet verified)`, etc. – but “verified” is the main one of interest.)

* **NFT Item Search vs Collection Search:** There is no public OpenSea endpoint that takes an arbitrary string like "Bored Apes" and returns matching collections directly. On OpenSea’s website, that functionality is powered by their internal search service. Some developers have resorted to **unofficial methods**: for example, using the OpenSea GraphQL endpoint (undocumented) or scraping, or using a community API. One such approach is using **Reservoir** or similar NFT data aggregators which have their own search, or as one Reddit user discovered, using an endpoint that some third-party site (e.g. *nft-stats.com*) exposes. However, using these unofficial routes can be brittle.

* **Alternative – Reservoir (and others):** Reservoir API (an NFT aggregator) provides a `search/collections` endpoint that *does* let you search by name and returns matching collection info (including contract address, name, image). For example, searching “bored” via Reservoir can yield BAYC, BAKC, etc. Reservoir is free to use (with an API key) up to certain limits, but it is slated to sunset in late 2025. Another alternative is **NFTPort** (covered below) which has a contract search. If staying strictly with OpenSea’s offerings, you might have to maintain your own mapping of common name to slug.

* **Rate Limits & API Key:** OpenSea’s API is **free** but **requires an API key** (which you request from OpenSea) for production use. They have strict rate limits to prevent abuse. While the exact numbers aren’t publicly stated in docs, historically it has been on the order of 4 or 5 calls per second for the default rate. Hitting the limit results in 429 errors. They consider increases for select partners. Because of this, you’d want to use the API efficiently (e.g., not spam search queries). If you were implementing a search-as-you-type for NFT collections using OpenSea, you might instead query a cached index or a third-party service to avoid those limits.

* **Usage in Practice:** A typical flow using OpenSea API for “search” is to have a **pre-built list** of popular collection slugs or use a service to resolve a name to a slug. For example, if a user types “CryptoPunks”, you might have a mapping that knows the slug is `"cryptopunks"`. Then you call `GET /collection/cryptopunks`. The response (v1 API) will include:

  ```json
  {
    "collection": {
      "name": "CryptoPunks",
      "slug": "cryptopunks",
      "image_url": "https://lh3.googleusercontent.com/...",
      "description": "...",
      "primary_asset_contracts": [
         {"address": "0xb47e...3bbb", "symbol": "PUNK", "total_supply": "10000", ...}
      ],
      "safelist_request_status": "verified",
      ...
    }
  }
  ```

  Here you get the **contract address** (`0xb47e...`), the logo `image_url`, and the verified status (`"verified"` in this case). You can also see the collection’s symbol if provided (though many NFT collections don’t have a meaningful ERC721 symbol, but OpenSea might show one like “PUNK”).

* **Auto-complete:** Without a direct OpenSea search API, real-time suggestions have to be powered by another mechanism (e.g., maintaining your own mini-database of top collections). For instance, you could periodically fetch the top 1000 collections from OpenSea (they have an endpoint for collections ranked by volume) and then search that list client-side for quick suggestions. For less common collections, you might rely on NFTPort’s search or simply require exact slug input.

In summary, OpenSea’s API is excellent for **detailed NFT collection info** once you know which collection to query (including **verified badges and images**), but it’s not user-friendly for name lookup. Many developers augment it with additional services for the search functionality.

## NFTPort API

NFTPort is an NFT-dedicated API that aggregates NFT data across chains and provides powerful search capabilities. It can serve our needs for searching NFT collections by name and retrieving their contract addresses and metadata:

* **Multi-chain NFT Collection Search:** NFTPort offers a **“multi-chain contract search”** endpoint (`GET /v0/search/contracts`) that searches NFT collections by text query. It looks at collection **name, description, and symbol** fields to find matches. This means if you search “Bored Ape”, it will return the Bored Ape Yacht Club collection (and any others with “Bored Ape” in the name or description). This is exactly what we need for NFT collection search by name.

* **Results and Metadata:** The search results include each matching collection’s **contract address**, the **name** of the collection, and possibly other metadata like the symbol and chain. NFTPort also provides the collection’s **image** (if they have it in their metadata index) and a short description. Essentially, NFTPort compiles data from NFT marketplaces and the NFT’s contract metadata. For instance, searching “CryptoPunks” could return:

  ```json
  {
    "contracts": [
      {
        "chain": "ethereum",
        "contract_address": "0xb47e...3bbb",
        "name": "CryptoPunks",
        "symbol": "Ͼ",
        "description": "10,000 unique collectible characters on Ethereum.",
        "metadata_url": "...", 
        "cached_image_url": "https://cdn.nftport.xyz/cryptopunks.png",
        "verified": true
      },
      ...
    ]
  }
  ```

  (This format is illustrative, but NFTPort does provide cached images and indicates verification if the collection is verified on major marketplaces. The `verified` field appears in some NFTPort responses when a collection is officially verified on OpenSea or other platforms.)

* **NFT Item Search:** NFTPort also has a `GET /v0/search` for individual NFT tokens by name/description. This is like a “Google search” over all NFTs. While that’s not directly needed for collection search, it’s a powerful feature (e.g., you could search “Bored Ape #500” and find that specific token and know it’s in the BAYC collection).

* **Auto-complete:** NFTPort’s contract search supports partial queries and is designed to be fast. Searching is akin to full-text search on their database, so you can call it on each keystroke. It will return collections in order of relevance (likely by some popularity metric as well). This makes it suitable for suggestions dropdowns. For instance, typing “bored” would yield Bored Ape Yacht Club, Bored Ape Kennel Club, etc., possibly along with less relevant matches.

* **Rich Metadata & Verification:** As mentioned, NFTPort often includes the **collection image URL** and whether the collection is verified. For Ethereum, “verified” usually corresponds to OpenSea verification status. NFTPort draws from OpenSea’s data (among others), so if a collection has a blue check on OpenSea, NFTPort will mark it appropriately. This fulfills the requirement of showing a verified badge in your UI. They also sometimes provide a **popularity score or volume rank** which you could use to sort suggestions (for example, BAYC would rank above an obscure collection with similar name).

* **Rate Limits & Pricing:** NFTPort requires an API key. It has a **Free tier** that allows up to **3 requests per second** and a monthly quota (the free tier includes around 50,000 NFT data requests per month). For higher usage, the Growth plan (\$49/mo) gives 150k requests/month and higher RPS, and the Scale plan allows up to 1,000,000 requests/month at 50 RPS. The search endpoints count towards these quotas. In practice, 3 RPS is enough for moderate search-as-type (e.g., user typing 5 characters triggers 5 queries in a short time – that’s fine). If your app has many concurrent users, you might need to cache results or upgrade. NFTPort’s response times are reasonable, on the order of a few hundred milliseconds for search queries (it’s doing full-text search across a lot of data, but still optimized).

* **Example:** Querying NFTPort’s contract search with `query="bored apes"` might return (pseudo-output):

  ```json
  {
    "contracts": [
      {
        "chain": "ethereum",
        "contract_address": "0xbc4c...f13d",
        "name": "Bored Ape Yacht Club",
        "symbol": "BAYC",
        "description": "The Bored Ape Yacht Club is a collection of 10,000 unique Bored Ape NFTs...",
        "cached_image_url": "https://nftport.xyz/ipfs/bayc-logo.png",
        "verified": true
      },
      {
        "chain": "ethereum",
        "contract_address": "0xba7f...954e",
        "name": "Bored Ape Kennel Club",
        "symbol": "BAKC",
        "description": "Companion dogs for the Bored Ape Yacht Club members.",
        "cached_image_url": "https://nftport.xyz/ipfs/bakc-logo.png",
        "verified": true
      },
      ... (other collections with "bored" maybe)
    ]
  }
  ```

  You could then display the name, image, and perhaps a verified checkmark for each. Selecting one gives you the contract address immediately. This demonstrates NFTPort’s strength in providing **all-in-one** data for NFT collection search.

## Other Notable Providers

In addition to the above, a few other services can be mentioned:

* **Covalent API:** Covalent is a blockchain data API that can return token metadata. It has a class of endpoints like `/v1/{chain_id}/tokens/address/{contract}/` which returns token info including name, symbol, logo, etc. Covalent also offers a **token “spotlight” endpoint** where you can query by ticker symbol or get all token tickers, but it’s not a straightforward search-by-name for arbitrary tokens. It’s more useful if you have the contract or want to list all tokens with market data. Covalent has a free tier (with API key) and paid plans. While powerful, for this specific use-case (search by name), Covalent would require downloading large lists or filtering their data, so it’s not the first choice.

* **Reservoir API:** Reservoir (until it sunsets in late 2025) has been a go-to for NFT data aggregation. It provided easy search for collections and tokens across marketplaces. If it were still in play, one could use `GET /search/collections/v1?name=<query>` which returns a list of collections matching the name query, along with their contract, name, image, and market stats. Reservoir also supported suggesting top collections. It required an API key (free with limits). Since Reservoir is being phased out (in favor of alternatives like Moralis’s NFT API), new projects may skip it, but it historically fulfilled a similar role to NFTPort’s search.

* **Etherscan & Explorer APIs:** Etherscan’s API does not support searching by token name – it only provides data given a contract address (or listing all tokens held by an address, etc.). The Etherscan website’s search box can resolve some token symbols/names to addresses (based on their internal directory), but that isn’t exposed via API. Similarly, The Graph/ENS etc., aren’t directly applicable here (ENS can resolve token symbols if someone set up a reverse record, but that’s uncommon and not standardized).

* **Dex & Aggregator Lists:** Beyond Uniswap’s lists, other DEXs and wallets publish token lists (e.g., **1inch token list**, **Sushi list**, **MetaMask default list**). These can be used just like the Uniswap list – fetch the JSON and search locally. They often include logos and sometimes a “verified” flag if curated (for example, the TrustWallet asset list has only vetted tokens).

* **DefiLlama (Trending & Popular):** While we covered DeFi Llama’s API, note that they also publish **trending tokens** (e.g., top gainers/losers, etc.) and “Popular” lists. Their website’s API might show which tokens are commonly searched or have high volume. Incorporating such data could allow showing popular suggestions (e.g., trending coins) even before the user types anything (a “popular searches” feature).

* **Response Speed Considerations:** In general, most of these providers are quite fast (100–300ms typical). The slowest part in a search-as-you-type might be network latency. For the best UX, you might combine approaches: use a local token list for instant suggestions of top tokens, and fallback to an API (like Moralis or 1inch) for lesser-known tokens or to resolve ambiguities. Similarly for NFTs, you might maintain a local cache of top few hundred collections and use NFTPort API for anything beyond that.

Each API has its integration nuances, but combining them can cover all requirements. For **Ethereum mainnet token search**, CoinGecko or 1inch (or Moralis if available) will give contract + decimals + logo easily. For **NFT collection search**, NFTPort (or an OpenSea-based solution) will provide contract + logo + verified status. All of the above have either free tiers or reasonable pricing for moderate use, so you can start without upfront cost and then scale as needed.

**Sources:**

* CoinGecko API Docs – Search endpoint and data fields; Rate limit info
* Moralis Docs/Blog – Token search features (cross-chain, partial match, verification); Premium endpoint note
* Alchemy Docs – Token metadata (logo support); NFT API endpoints including searchContractMetadata
* DeFi Llama – Open API (free) and Pro tier info
* 1inch Developer Portal – Token API search overview, multi-network support and speed
* Uniswap Default Token List – Example entry with name, symbol, address, logoURI
* OpenSea Docs/Issues – Verification status field (`safelist_request_status`) meaning “verified”; OpenSea API usage and rate limit considerations
* NFTPort Docs – Multi-chain contract search (search by name/description/symbol across Ethereum & Polygon); NFT text search usage; Rate limits (free tier \~3 rps)
