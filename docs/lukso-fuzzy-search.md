Universal Profile Name-First Search on LUKSO Network

1. Official LUKSO Indexer and GraphQL Services

LUKSO’s roadmap has promised an official indexing/search API, but as of mid-2025 there is no publicly available GraphQL endpoint (e.g. no graph.lukso.network) released for open use. The LUKSO team has indicated that a “Universal Dev Platform” will include SaaS APIs for Universal Profile search and indexing, streamlining profile discovery ￼. Indeed, LUKSO’s docs reference an “Indexer API” for querying Universal Profile data ￼, but this appears to be in development/closed beta rather than a live public service. In short, LUKSO itself does not yet provide a ready-to-use GraphQL search for profile names.

Query Capabilities: Without an official indexer, direct RPC calls can only fetch profile metadata by known address, not by name. There is no native RPC method to search partial names – the LSP3 profile name is stored off-chain (in IPFS JSON) or in contract storage, which is not indexed for text search. The official LUKSO profile browser dApp (formerly universalprofile.cloud, now universaleverything.io) actually uses a GraphQL indexer under the hood for advanced queries ￼. This indexer allows features not possible via raw RPC (like text search and fast filtering) ￼. By default the dApp runs in “Graph” mode, indicating LUKSO has an internal indexing service, but it isn’t exposed as a public GraphQL API to developers at this time. There are no known official endpoints like indexer.lukso.network for public queries.

Name-First Search Feasibility: Yes, it is possible to implement name-based search, but not by querying the blockchain directly – you will need an off-chain index. In summary, Universal Profile name search is achievable only via an indexing layer, not via on-chain calls alone. We now explore third-party indexers and approaches to achieve this.

2. Third-Party Universal Profile Indexers & APIs

Several community and third-party services have stepped up to provide indexing for LUKSO Universal Profiles:
	•	UniversalProfiles.Cloud / UniversalEverything.io: The official LUKSO profile explorer (open-sourced as universalprofile.cloud) had an integrated indexer. That site was archived in Dec 2024 and replaced by universaleverything.io, which similarly lets users search ~30k profiles by name ￼. The code confirms it supports GraphQL-backed search (Graph mode) for fast discovery ￼. However, this is a front-end dApp; LUKSO hasn’t exposed its backend for external API calls. There’s no documented public API, so one cannot directly query universaleverything.io for names (it’s not an open service, just a web UI).
	•	DROPPS Indexing API (GraphQL): The startup DROPPS has open-sourced and deployed a GraphQL indexer for LUKSO. They provide public GraphQL endpoints for mainnet and testnet: https://indexing.mainnet.dropps.io/graphql ￼. This indexer ingests LUKSO on-chain data into PostgreSQL, enabling rich queries. You can use it to search Universal Profile metadata by partial name. For example, you could query for profiles where the name contains "Vitalik" and retrieve their addresses, profile images, descriptions, etc. (DROPPS likely supports a filter such as name_contains or similar in its GraphQL schema). This service is community-run but has been publicly advertised, making it a strong candidate for name-first search. No API key is required for basic queries. Using the DROPPS API, you can achieve an ENS-like experience – the user types a name, your front-end sends a GraphQL query to indexing.mainnet.dropps.io, and the response will list matching profile addresses and metadata. This approach meets the requirements (sub-second query, likely CORS-enabled since it’s meant for web apps). Keep in mind that as a third-party service, its uptime and rate limits are not guaranteed by LUKSO (though DROPPS runs it for their own app, so it should be reasonably stable).
	•	Envio HyperIndex: Envio is a blockchain indexing provider that added support for LUKSO in early 2024 ￼ ￼. Envio isn’t a public dataset API; rather it’s a platform where developers can configure and host their own indexers with a GraphQL API ￼. For example, the open-source LukUp project (an AI-driven LUKSO dApp) uses Envio’s indexer to power its profile search ￼. In LukUp’s README, “Data Fetching: GraphQL via the LUKSO Envio indexer” is listed ￼, and the app features searching profiles by name/username ￼. This suggests the LukUp developers set up an Envio indexer that tracks Universal Profiles. If you’re willing to go through Envio, you could similarly create an indexer instance: you’d write an indexer config to capture the LSP3Profile data for all ERC725Account contracts on LUKSO, then deploy it on Envio’s service. Envio would give you a GraphQL endpoint and API key to query the indexed data. This is a more involved solution (requires writing indexing logic or using their contract import feature to ingest the UP contracts), but it’s production-grade. Envio boasts “hyper-performant” queries and can sync LUKSO data very fast ￼ ￼. The downside is you’d be essentially running your own indexer in their cloud (which might have costs or maintenance overhead), rather than simply calling a ready API.
	•	The Graph / Subgraphs: As of now, The Graph Protocol’s hosted service does not natively support LUKSO (LUKSO is its own L1, not on Ethereum mainnet). However, it is technically possible to run a Graph node or use the decentralized Graph Network to index LUKSO if someone integrates it. In fact, some projects have created subgraphs for LUKSO by self-hosting. For example, the LUKSO community mentions a “Universal Swaps API” at universalswaps.io/subgraphs/... ￼ – indicating at least one instance of a subgraph indexing LUKSO DEX data. But for Universal Profiles specifically, no public subgraph is known. SubQuery, an indexing solution similar to The Graph, has announced full support for LUKSO ￼. Developers can use SubQuery’s framework to index LUKSO data and deploy it on SubQuery’s decentralized network or managed service. Again, this is a roll-your-own solution: you’d define a schema and mappings (e.g., listen for profile creation events or data writes) in a SubQuery project. Unless a community member has already published a Universal Profile SubQuery, you’d need to build it. In summary, neither The Graph nor SubQuery offer a plug-and-play UP name search API out-of-the-box, but they are viable if you’re open to writing an indexer.
	•	Other Ecosystem APIs: To date, there isn’t an official “Universal Profile search” REST API by any major explorer or wallet. The LUKSO Block Explorer (a modified Blockscout) does display profile names/avatars for addresses (it pulls LSP3 metadata for addresses you lookup) ￼, but it does not support searching by name – its search bar expects an address or transaction hash. Some wallet apps or the UP Browser Extension might show a directory of notable profiles, but they don’t expose a general search API. We also haven’t seen any other third-party like Covalent, Morales, Alchemy, etc., offering LUKSO-specific name query APIs yet, likely because LUKSO is still a niche network.

UniversalProfile.cloud Decommissioning: You specifically asked about universalprofile.cloud’s fate. That site was the official LUKSO profile explorer dApp, which was archived in December 2024 ￼. It has since been superseded by Universal Everything (universaleverything.io), which continues the functionality with a new UI. So, universalprofile.cloud as an API source is no longer available. The alternative is to use the new site (which is purely a frontend) or leverage the third-party indexers above (DROPPS, Envio) which essentially replicate and open up that functionality.

3. On-Chain Crawling vs. Off-Chain Indexing

Because Universal Profile data lives in contract storage and IPFS, direct on-chain search by name is infeasible for a live app. Let’s break down why:
	•	Profile Name Storage: When a UP is created, its LSP3Profile metadata (including the name) is usually stored as a JSON file on IPFS, referenced by a hash in the UP contract’s ERC725Y storage. The name itself isn’t an Ethereum event or a simple on-chain field that can be filtered without reading the IPFS content. Even if some profiles store the name directly on-chain, you’d have to iterate over tens of thousands of contracts to read those keys, which an RPC node cannot do efficiently on demand.
	•	Enumerating All Profiles: There is no single registry contract that lists all Universal Profile addresses. Universal Profiles are essentially any contract that implements the ERC725Account (LSP0) interface. Discovering them means scanning the entire chain for contracts of that type. As of now, there are on the order of 30,000+ Universal Profile contracts on LUKSO mainnet ￼. In theory you could crawl the chain: e.g., go through all contract creation logs or maintain a list of addresses that have the LSP0 interface ID. This is a heavy task: you’d need to run a full node or use a blockchain scanner, then for each candidate address, fetch its LSP3 profile data (which involves an IPFS call). Doing this client-side in a browser is utterly impractical (it would be slow and likely exceed RPC rate limits). Even server-side, a one-off full scan would take considerable time and infrastructure.
	•	Events for Creation/Updates: Does LUKSO emit events that could help index profiles? Possibly:
	•	If profiles are often created via the official LSPFactory contract, that factory might emit an event when a new UP is deployed. One could listen to that (if LSPFactory was widely used – not sure it’s universal).
	•	Each Universal Profile (ERC725Y) emits DataChanged events when its data keys are set or updated. Notably, when a profile’s LSP3 metadata is set (or updated to point to a new JSON), a DataChanged(bytes32 key, bytes value) event fires on that contract. By filtering for the specific LSP3 metadata key, you could catch new or changed profiles. However, you’d have to monitor events from all profile contracts, which again presupposes you know the addresses or you filter by topic (contract address won’t be fixed). Realistically, you’d need an indexing service to aggregate these events network-wide.
	•	There isn’t a known central registry contract that tracks all profiles (the LSP26 registry tracks follows, not the existence of profiles themselves).
	•	Technical Limitations: Without an index, trying to scan the chain on the fly will fail the performance requirements. Even if you had a list of all profile addresses, doing 30k RPC calls to retrieve each name and checking for matches would be way over 2 seconds (and likely hit rate limits). Thus, a pre-built index or third-party service is mandatory for a production-grade name search.

In summary, direct on-chain search is not feasible for this use-case. The recommended approach is to rely on an off-chain indexed dataset (GraphQL API or similar) that’s kept in sync with the chain.

4. Using LSP26 Social Graph for Discovery

The LSP26 Follower System is a network-wide social graph standard on LUKSO that might assist indirectly in profile discovery. LSP26 is essentially a global registry contract (deployed at address 0xf011...DDcA on mainnet) that stores two lists for each profile: which addresses it is following, and which addresses follow it ￼ ￼. Your application already integrates LSP26 to verify follower relationships, so you have access to this registry.

Can it help find profiles? – Partially, yes. The follower registry can be mined for popularity signals:
	•	You could query the LSP26 registry to find profiles with the most followers (i.e. the addresses that appear as “followed” by many others). Those would be “popular” profiles likely to be of interest. For example, if a user searches a common name like “Max”, you might rank a profile named “Max” with 500 followers above another “Max” with zero followers. This can improve result relevance.
	•	You might implement a “discover” or trending list using LSP26: e.g., show the top N profiles by follower count, or show who a given user’s follows are following (friends-of-friends suggestions). This is similar to how Twitter or Lens suggests accounts.

However, LSP26 is not a search index for names. It doesn’t store anything about profile names or metadata – it only links addresses. You would still need to resolve each address to its profile metadata via ERC725. So LSP26 can complement your search ranking or filtering (e.g. you could let users filter results to “verified” or popular profiles), but it cannot replace a name index.

One potential approach is:
	•	Periodically crawl the LSP26 registry contract (which itself might require using an indexer, since it’s a mapping of addresses to lists) to compute a list of top-followed profile addresses.
	•	Maintain an in-memory set or lightweight cache of these popular addresses and their names.
	•	When a user searches, you could prioritize results that are in the “popular profiles” set or show a highlighted section for them.

This can enhance UX but is not required for basic functionality. Discovery via followers is more of a nice-to-have layer on top of the fundamental name search index. It could help identify active profiles (which might correlate with “name in use” by real users vs. squatters or empty profiles).

In summary: Yes, the LSP26 social graph can be leveraged for discovery and ranking, but you’ll still need a primary name→address search mechanism. Use LSP26 to enrich the search results – for example, show follower counts for each result, or sort by them – to give users more context (e.g., “Vitalik (2000 followers)”). This registry is global and designed for exactly this kind of social feature integration ￼.

5. Alternative Data Sources & APIs

Beyond the dedicated indexers, you might consider a few other data sources or services for profile data:
	•	Official LUKSO RPC/Endpoints: Aside from the RPC node (which you already use for fetching profile details by address), LUKSO doesn’t offer additional specialized APIs. There is no official cloud database or caching layer exposed publicly yet. The RPC endpoint is mainly for raw chain data and cannot perform text queries.
	•	Block Explorers: The main LUKSO explorer (explorer.execution.mainnet.lukso.network) is a fork of Blockscout. While Blockscout has an API (for balances, transactions, etc.), it does not support searching by Universal Profile name. It doesn’t index IPFS profile data for search purposes. At best, an explorer could be scraped for known profiles, but that’s unreliable and against your performance goals. In short, block explorers are not useful for name-first lookup, except to double-check an address after you find it.
	•	Universal Profile Browser Extension: This is a user-facing tool to manage profiles. It does not provide a backend API. Any search in the extension (if it exists) would be local or using the same mechanisms we discuss (likely calling the universalprofile.cloud API when it was live). No help here for third-party integration.
	•	Caches or Community Databases: It’s worth noting that some community-maintained lists exist (for example, a list of known notable profiles – perhaps the LUKSO team or community has a JSON of known addresses to names for demo purposes). But such lists are static and incomplete. For comprehensive search across all profiles, an indexer is the only viable solution. If you truly cannot use any of the indexers and don’t want to run your own, the only (very limited) fallback would be to restrict search to a known subset of profiles (like those who have interacted with your app or those curated by the community). This is not ideal since it defeats the purpose of universal search.
	•	NOWNodes / Node Providers: Services like NOWNodes offer LUKSO full nodes via API ￼. These can ease RPC access but do not add indexing – you face the same RPC limitations, just hosted elsewhere. They are not relevant for name search (but could help scale your direct metadata fetch once you have an address).

In summary, no simple alternative API exists for name-based search in the LUKSO ecosystem yet. Your best bet is using the DROPPS GraphQL API or setting up an Envio/SubQuery indexer. These give you the partial-match, fast query, and metadata aggregation needed.

(Aside: In the future, LUKSO’s Universal Name Service (UNS) may provide a decentralized naming system ￼. UNS sounds analogous to ENS – unique short names that point to profiles. If UNS becomes available, searching by a username might become as straightforward as querying that registry. But UNS is not live yet, and it’s more about exact name resolution than substring search.)

6. Patterns from Similar Projects

It’s useful to compare how other blockchain identity systems handle name lookups, to inform our approach:
	•	ENS (Ethereum Name Service): ENS allows users to search names like vitalik.eth. ENS names are organized in a registry smart contract, but even ENS relies on indexing for partial matches. For example, if you type “vita” in an ENS app, it likely queries a subgraph or centralized search server to find names containing that substring. The direct on-chain ENS registry can only resolve exact names. So ENS’s approach for discovery is also to use an off-chain index (TheGraph hosts an ENS subgraph that indexes all ENS names and allows searching by name text).
	•	Lens Protocol (Polygon): Lens (a Web3 social network) has profile handles (e.g. alice.lens). They provide a GraphQL API for developers (Lens API) that supports search queries. Under the hood, they maintain an index of profiles and allow fuzzy matching on profile names/handles. This is very akin to what you need for LUKSO – a dedicated service that can query profile attributes by text. The key takeaway is that all Web3 social/identity systems use some indexing layer for search; none rely solely on smart contract calls for substring search. LUKSO is no different in this regard.
	•	IDX / Ceramic / 3Box: Some decentralized identity systems index user profiles off-chain in a distributed database. They often provide an API to look up profiles by an identifier or search by some metadata. Again, the heavy lifting is done off-chain.
	•	Traditional Web2 Patterns: Even though we are in Web3, searching profiles is conceptually similar to searching usernames in a database. The fastest solution is to use a database or search engine (ElasticSearch) containing all profiles. In blockchain terms, an indexer is exactly that: it mirrors on-chain data into a queryable database.
	•	Library Support: Since you asked about existing libraries/SDKs – aside from erc725.js (which you already use for fetching by address), there isn’t a client-side library to search profiles by name (because it’s not possible without a backend). Some projects might package their GraphQL queries into SDKs, but essentially it will still call an indexer. If LUKSO releases an official search API, they might also release a small SDK for it, but until then, using GraphQL directly (or REST if provided) is the way.

Key point: Your situation – wanting name-to-address resolution for user profiles – is analogous to ENS or Lens. Those systems solved it by running indexing services (TheGraph subgraphs or custom APIs). Following those patterns is the correct approach on LUKSO as well.

7. Implementation Roadmap & Recommendations

Bringing it all together, here’s a roadmap to achieve name-first Universal Profile search in your application:

Step 1: Choose an Indexer Solution – Given you prefer not to run your own indexer node, the two practical choices are:
a) Use the DROPPS GraphQL API (quickest path), or
b) Use Envio’s hosted indexer (more control, but requires setup and an API key).

Recommendation: Start with DROPPS to get up and running quickly. It’s already indexing mainnet and provides the data you need via simple GraphQL queries. This lets you implement search immediately and test the UX. Meanwhile, you can evaluate Envio or others for long-term robustness.

Step 2: Query Matching Profiles by Name – Using your chosen indexer, formulate a query for partial name matches. For DROPPS GraphQL, you’ll need to consult their schema. Based on typical designs, there will be an entity for profiles or accounts. For example, the query might look like:

query ProfileSearch($substr: String!) {
  universalProfiles(where: { name_contains: $substr }) {
    id    # or address
    name  # profile name
    description
    profileImageUrl  # likely the URL or IPFS hash of avatar
    # ...any other fields like background, tags if needed
  }
}

(The exact field names might differ. DROPPS might call the entity “erc725Accounts” or similar. You can introspect their GraphQL endpoint to get details.)

This query should return an array of profiles whose name contains the substring (case-insensitive usually). Fuzzy search (e.g. tolerance for typos) likely isn’t supported out of the box – it will probably be a simple substring or prefix match. You can implement your own fuzzy logic on the client side if needed (for instance, by retrieving all profiles with name contains “john” and then filtering/ranking by Levenshtein distance to the query “Jhon”), but that may not be necessary for most use-cases.

Step 3: Integrate into Frontend – Ensure your front-end can call the GraphQL API. The DROPPS endpoint is HTTPS and should allow cross-origin requests (it’s a public API endpoint). You can use fetch or a GraphQL client library to send the query. For example, in JavaScript:

const query = `query ProfileSearch($substr: String!) {
  universalProfiles(where: { name_contains: $substr }) {
    id, name, description, profileImage { url }
  }
}`;
const variables = { substr: searchInput };
const response = await fetch('https://indexing.mainnet.dropps.io/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables })
});
const result = await response.json();
const profiles = result.data.universalProfiles;

After getting the list, you can display the profile name, avatar (you might get an IPFS link – ensure you use the same IPFS gateway for consistency, or maybe DROPPS already provides an HTTP URL), and description.

Step 4: Fallback to Metadata Fetch (if needed) – If the indexer’s data is slightly stale or limited (e.g., it might cache an older profile image URL), you can on-click fetch live data for a selected profile via your existing ERC725.js method. For instance, when the user selects one of the search results, you could call ERC725.fetchData('LSP3Profile') on that address to make sure you have the latest info. In general, a good indexer will stay in sync, but being prepared for cache inconsistencies is wise. The LUKSO docs note that the RPC (live chain) is “more up-to-date” than indexer mode ￼, so if absolute freshness is required (say for rapidly changing profiles), consider a quick refresh of the data after selection. This is optional and can be balanced against performance.

Step 5: Implement Ranking & Filtering – If using LSP26 or other signals, incorporate them here. For example, if you have follower counts, you might sort results by number of followers desc by default. Or you can weight exact matches higher than partial matches. These tweaks will improve UX but aren’t strictly required for functionality.

Step 6: Production Considerations:
	•	Performance: The GraphQL query on an indexer is extremely fast – a well-indexed Postgres can return results in milliseconds even from tens of thousands of rows. The <2s goal is achievable; most of the time will be network latency. (Ensure your UI throttles queries as the user types, e.g., debounce the input to avoid spamming the API for every keystroke).
	•	Rate Limits: For DROPPS, no official rate limit is published, but you should assume some reasonable limits. Caching frequent queries and limiting rapid repeated searches from the same client will be good practice. If you expect very high query volume or want guaranteed SLA, you might lean towards running your own indexer (Envio or SubQuery) where you control the throughput.
	•	CORS: The DROPPS API appears to be designed for public use; in most cases, GraphQL endpoints allow cross-origin calls. If you encounter CORS issues, you might need to proxy the requests via your backend – but that is unlikely here. (Testing a sample query in a browser or Postman can confirm CORS headers.)
	•	Uptime: Relying on a third-party (DROPPS) means you are subject to their uptime. DROPPS is a live project, but as a precaution, you might implement a fallback. For example, if the GraphQL search fails (network error), you could present a message like “Search service is temporarily unavailable.” In the long run, if LUKSO launches the official indexer API, you should switch to that for guaranteed support.

Step 7: Optional – Build Your Own Indexer – If neither DROPPS nor staying with a third-party is acceptable long-term, plan for a custom solution:
	•	Envio approach: Use Envio’s CLI or dashboard to configure indexing of the ERC725Y DataChanged events or directly scrape the storage of each new profile. Envio can sync historical data very fast (100x faster than raw RPC per their docs) ￼. You’d then host a GraphQL that your app queries. This requires an Envio account and likely a subscription for their hosted service. The advantage is you can index exactly what you need (e.g., just the LSP3Profile JSON, parsed for name/image) and nothing extraneous, making queries super efficient. Envio’s GraphQL would be custom to your data model.
	•	Custom indexer (self-hosted): Since LUKSO is EVM, you could also adapt existing Ethereum indexing stacks. For instance, you could modify a TheGraph indexer to read LUKSO (point it at a LUKSO node) and use the standard ERC725 subgraph template (if one exists) to index profiles. The Graph’s tooling is free to use, but you’d run the indexer and a database on your servers – this is non-trivial operationally. Alternatively, the DROPPS indexer code is open-source ￼ under GPL; you could fork it and deploy your own instance if you wanted full control and perhaps a private API. This is probably overkill unless you have very specific needs.

Given your requirements (production-ready, high uptime), you might eventually gravitate to an official solution when available. Monitor LUKSO’s announcements for the release of their official Universal Profile search API – once that is live, integrating it would be ideal, as it would be maintained by LUKSO and likely scale with the network. The Genfinity article suggests this is on the horizon ￼.

⸻

Conclusion: Universal Profile name-first search is achievable on LUKSO mainnet, but only by leveraging an indexing service. There is no direct on-chain mechanism for partial name lookup. The most straightforward path is to use an existing indexer API (like DROPPS’s GraphQL endpoint) which can return { address, name, avatar, description } for profiles matching a query. If such external APIs didn’t exist, you’d have to build an indexer yourself (e.g. via Envio or The Graph). Fortunately, the ecosystem is maturing: third-party indexers are filling the gap, and LUKSO’s own index/search APIs are expected soon ￼.

By integrating one of these solutions, you can deliver ENS-like UX for LUKSO: the user types a name, and within a second or two you present a list of matching Universal Profiles with their addresses and profile pics. This will complete your multi-protocol profile search system for LUKSO. Good luck, and happy building!

Sources:
	•	LUKSO roadmap promises official profile search/index APIs ￼
	•	Official UP explorer uses GraphQL indexer (Graph mode) by default ￼
	•	DROPPS open-source GraphQL indexer for LUKSO (public endpoint) ￼
	•	LukUp project (uses Envio indexer; supports name and partial address search) ￼ ￼
	•	Envio indexing on LUKSO (GraphQL-based, high performance) ￼ ￼
	•	Universal Profiles count (~30k on LUKSO) for context of indexing scale ￼
	•	LSP26 follower registry announcement (global social graph for UPs) ￼