# Name-First Search Implementation Research
**Multi-Ecosystem Token & Profile Discovery**

## 🎯 Vision Statement

Transform the current contract-address-first search paradigm into an intuitive name-first discovery system that supports both Ethereum (ENS) and LUKSO (Universal Profiles) ecosystems. Users should be able to search by human-readable names and get intelligent, categorized results for profiles, tokens, and NFTs across both networks.

---

## 📊 Current State Analysis

### ❌ Current Limitations
- **Address-Only Search**: Users must manually enter contract addresses (0x...)
- **Silent Failures**: No user feedback when wrong contract types are entered
- **No Name Resolution**: Cannot search by ENS names or UP usernames
- **Network Silos**: Ethereum and LUKSO searches are completely separate
- **Poor Discoverability**: Users need to know specific contract addresses

### ✅ Current Infrastructure Assets
- Working LSP7/LSP8 contract validation
- Universal Profile metadata fetching via ERC725.js
- Toast notification system (Sonner)
- Ethereum token verification system
- ERC725.js integration with proper schemas

---

## 🏗️ Technical Architecture

### 1. Auto-Detection System
```typescript
enum InputType {
  ADDRESS = "address",           // 0x1234... (40 chars)
  ENS_NAME = "ens_name",        // vitalik.eth, domain.xyz
  PARTIAL_NAME = "partial_name", // vitalik, alice, compound
  AMBIGUOUS = "ambiguous"        // Could be multiple types
}

function detectInputType(input: string): InputType {
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) return InputType.ADDRESS;
  if (input.includes('.')) return InputType.ENS_NAME;
  return InputType.PARTIAL_NAME;
}
```

### 2. Multi-Source Search Engine
```typescript
interface SearchResult {
  id: string;
  type: 'profile' | 'lsp7_token' | 'lsp8_nft' | 'erc20_token' | 'erc721_nft';
  network: 'ethereum' | 'lukso';
  address: string;
  name: string;
  displayName: string;
  avatar?: string;
  description?: string;
  metadata: {
    symbol?: string;
    decimals?: number;
    verified?: boolean;
    followerCount?: number;
  };
  relevanceScore: number;
}

interface SearchEngine {
  searchENS(query: string): Promise<SearchResult[]>;
  searchUniversalProfiles(query: string): Promise<SearchResult[]>;
  searchEthereumTokens(query: string): Promise<SearchResult[]>;
  searchLuksoTokens(query: string): Promise<SearchResult[]>;
  resolveAddress(address: string): Promise<SearchResult | null>;
}
```

### 3. API Integration Points

#### **Ethereum Ecosystem**
```typescript
// ENS Resolution
const ensProvider = new ENSProvider('https://cloudflare-eth.com');
const address = await ensProvider.resolve('vitalik.eth');
const reverseRecord = await ensProvider.lookupAddress(address);

// ENS Metadata
const ensMetadata = await ensProvider.getResolver('vitalik.eth');
const avatar = await ensMetadata.getAvatar();
const description = await ensMetadata.getDescription();
```

#### **EFP Integration** (from provided docs)
```typescript
// EFP Profile Search
const efpApi = 'https://api.ethfollow.xyz/api/v1';
const searchResults = await fetch(`${efpApi}/search/users?query=${query}`);

// EFP Profile Details
const profileDetails = await fetch(`${efpApi}/users/${address}/details`);
const followers = await fetch(`${efpApi}/users/${address}/followers`);
```

#### **LUKSO Universal Profiles**
```typescript
// UP Profile Search (via registry scanning or indexing service)
const luksoProvider = new ethers.providers.JsonRpcProvider('https://rpc.mainnet.lukso.network');
const upRegistry = new ethers.Contract(UP_REGISTRY_ADDRESS, UP_REGISTRY_ABI, luksoProvider);

// LSP3 Metadata Fetching  
const erc725 = new ERC725(LSP3ProfileSchema, upAddress, luksoProvider);
const profileData = await erc725.fetchData(['LSP3Profile']);
```

---

## 🎨 User Experience Design

### 1. Explicit Search Interface
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search for tokens, NFTs, or profiles...             │
│                                                         │
│ [vitalik____________] [🔍 Search] [Search Types ▼]     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼ (Click Search)
┌─────────────────────────────────────────────────────────┐
│ 📍 Search in:                                          │
│ ☑️ Ethereum (ENS, ERC20/721)                          │
│ ☑️ LUKSO (Universal Profiles, LSP7/8)                 │
│ ☑️ Cross-chain suggestions                             │
└─────────────────────────────────────────────────────────┘
```

### 2. Rich Search Results (After Explicit Search)
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Results for "vitalik" (3 found)          [🔄 Loading]│
├─────────────────────────────────────────────────────────┤
│ 👤 vitalik.eth                                  [ETH]  │
│    Ethereum co-founder • 2.1M followers               │
│    0x1234...5678                               [Select] │
├─────────────────────────────────────────────────────────┤
│ 🪙 Vitalik Token (VITALIK)                     [LSP7] │
│    Community token • 18 decimals                       │
│    0xabcd...efgh                               [Select] │
├─────────────────────────────────────────────────────────┤
│ 🎨 Vitalik NFT Collection                      [LSP8] │
│    Limited edition • 1000 items                        │
│    0x9876...5432                               [Select] │
└─────────────────────────────────────────────────────────┘
```

### 3. Type Indicators & Actions
- **👤 Profile**: View profile, follow, check tokens
- **🪙 LSP7/ERC20**: Add to gating, check metadata, view holders  
- **🎨 LSP8/ERC721**: Add to gating, view collection, check ownership
- **⚠️ Ambiguous**: Show disambiguation options

---

## 🚀 Implementation Roadmap

### **Phase 1: ENS Integration Foundation** (Week 1-2)
**Scope**: Basic ENS name resolution for Ethereum ecosystem
- [ ] ENS resolution service (`vitalik.eth` → address)
- [ ] Reverse ENS lookup (address → `vitalik.eth`)
- [ ] ENS metadata fetching (avatar, description)
- [ ] Auto-detection: address vs ENS name
- [ ] Enhanced error messages for ENS failures

**Key Files**:
- `src/services/ENSService.ts`
- `src/hooks/useENSResolver.ts`
- Enhanced configurators with ENS search

### **Phase 2: Universal Profile Name Search** (Week 3-4)  
**Scope**: LUKSO Universal Profile discovery
- [ ] UP registry scanning for name search
- [ ] LSP3 metadata integration for UP search results
- [ ] UP name suggestion system
- [ ] Cross-reference UP addresses with LSP7/LSP8 contracts

**Key Files**:
- `src/services/UniversalProfileSearch.ts`
- Enhanced `src/lib/upProfile.ts`
- UP-specific search components

### **Phase 3: Multi-Result Dropdown System** (Week 5-6)
**Scope**: Rich search results interface
- [ ] SearchResults dropdown component
- [ ] Result type categorization and icons
- [ ] Relevance scoring algorithm
- [ ] Search result caching and performance optimization
- [ ] Keyboard navigation (arrow keys, enter, escape)

**Key Files**:
- `src/components/search/ExplicitSearchInput.tsx`
- `src/components/search/SearchResultsList.tsx`
- `src/components/search/SearchResultItem.tsx`

### **Phase 4: EFP Integration** (Week 7)
**Scope**: Enhanced profile search via EFP
- [ ] EFP API integration for profile search
- [ ] EFP follower/following data display
- [ ] Social graph suggestions ("People you follow also follow...")
- [ ] EFP verification badges

**API Endpoints** (from docs):
```typescript
// EFP User Search
GET /api/v1/search/users?query=${query}

// EFP Profile Details  
GET /api/v1/users/${address}/details
GET /api/v1/users/${address}/followers
GET /api/v1/users/${address}/following
```

### **Phase 5: Cross-Chain Intelligence** (Week 8)
**Scope**: Smart suggestions across networks
- [ ] ENS profiles holding LUKSO tokens
- [ ] Universal Profiles with ENS records
- [ ] Token bridging suggestions
- [ ] Cross-chain identity verification

### **Phase 6: Advanced Search Features** (Week 9-10)
**Scope**: Power user features
- [ ] Search filters (token type, network, verified only)
- [ ] Saved searches and favorites
- [ ] Recent search history
- [ ] Bulk import from CSV/JSON
- [ ] Search analytics and trending

---

## 🔧 Technical Implementation Details

### 1. Search Service Architecture
```typescript
// src/services/UniversalSearchService.ts
export class UniversalSearchService {
  private ensService: ENSService;
  private upService: UniversalProfileService;
  private efpService: EFPService;
  private cache: Map<string, SearchResult[]>;

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const inputType = this.detectInputType(query);
    const cacheKey = `${query}-${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const results = await Promise.allSettled([
      this.searchENS(query, options),
      this.searchUniversalProfiles(query, options), 
      this.searchEFPProfiles(query, options),
      this.searchTokens(query, options)
    ]);

    const combinedResults = this.combineAndRankResults(results);
    this.cache.set(cacheKey, combinedResults);
    
    return combinedResults;
  }
}
```

### 2. Enhanced Configurator Components
```typescript
// Enhanced LSP7TokenConfigurator with explicit search
export const LSP7TokenConfigurator: React.FC<Props> = ({ onSave, onCancel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const { search } = useUniversalSearch();

  const handleExplicitSearch = async () => {
    if (searchQuery.length < 2) {
      toast.warning("Search too short", {
        description: "Please enter at least 2 characters"
      });
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await search(searchQuery, {
        types: ['lsp7_token'],
        networks: ['lukso'],
        limit: 10
      });
      
      setSearchResults(results);
      
      if (results.length === 0) {
        toast.info("No results found", {
          description: `No LSP7 tokens found for "${searchQuery}". Try different keywords or check spelling.`
        });
      }
    } catch (error) {
      toast.error("Search failed", {
        description: "Unable to search at this time. Please try again."
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result);
    setSearchQuery(result.displayName);
    setSearchResults([]);
    
    // Auto-populate metadata
    setContractAddress(result.address);
    setTokenName(result.name);
    setTokenSymbol(result.metadata.symbol || '');
    
    toast.success("Token selected", {
      description: `Selected ${result.displayName} (${result.metadata.symbol})`
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExplicitSearch();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="space-y-4">
      <ExplicitSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleExplicitSearch}
        onKeyPress={handleKeyPress}
        placeholder="Search for LSP7 tokens by name or address..."
        isSearching={isSearching}
        disabled={disabled}
      />
      
      {searchResults.length > 0 && (
        <SearchResultsList
          results={searchResults}
          onSelectResult={handleSelectResult}
          onClear={() => setSearchResults([])}
        />
      )}
      
      {selectedResult && (
        <SelectedTokenPreview 
          result={selectedResult}
          onClear={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
};
```

### 3. Error Handling & Toast Integration
```typescript
// Enhanced error messages with name suggestions
const handleSearchError = (error: Error, query: string) => {
  if (error.message.includes('ENS name not found')) {
    toast.error("ENS Name Not Found", {
      description: `"${query}" doesn't exist. Try searching for similar names or check spelling.`,
      action: {
        label: "Search Similar",
        onClick: () => searchSimilar(query)
      }
    });
  } else if (error.message.includes('Universal Profile not found')) {
    toast.error("Universal Profile Not Found", {
      description: `No Universal Profile found for "${query}". Try searching by address or different keywords.`,
      action: {
        label: "Browse Profiles",
        onClick: () => openProfileBrowser()
      }
    });
  }
};
```

---

## 📈 Success Metrics

### User Experience Metrics
- **Search Success Rate**: % of searches resulting in successful selection
- **Time to Discovery**: Average time from search start to token/profile selection  
- **Error Reduction**: % decrease in "contract not found" errors
- **Cross-chain Adoption**: % of users discovering assets on both networks

### Technical Performance
- **Search Response Time**: <2s for comprehensive results across networks
- **Cache Hit Rate**: >70% for common searches  
- **API Response Times**: ENS <500ms, UP <1s, EFP <800ms
- **Error Rate**: <5% for valid names, <1% for addresses
- **User Feedback**: Toast notifications for all search states (loading, success, no results, errors)

---

## 🔒 Security Considerations

### Input Validation
- Sanitize all search inputs to prevent injection attacks
- Validate addresses using checksums
- Rate limit search requests to prevent abuse

### Data Privacy  
- Cache search results locally, not on servers
- Don't track personal search queries
- Respect user privacy in cross-chain suggestions

### Contract Safety
- Verify contract interfaces before suggesting tokens
- Warn users about unverified or suspicious contracts
- Implement reputation scoring for search results

---

## 🎛️ Configuration & Customization

### Network Configuration
```typescript
// src/config/networks.ts
export const NETWORK_CONFIG = {
  ethereum: {
    rpcUrl: 'https://cloudflare-eth.com',
    ensRegistry: '0x314159265dD8dbb310642f98f50C066173C1259b',
    enabledFeatures: ['ens', 'erc20', 'erc721', 'efp']
  },
  lukso: {
    rpcUrl: 'https://rpc.mainnet.lukso.network',
    upRegistry: '0x...',
    enabledFeatures: ['universal_profiles', 'lsp7', 'lsp8']
  }
};
```

### Search Customization
```typescript
// Configurable search behavior
export interface SearchConfig {
  maxResults: number;
  debounceMs: number;
  cacheTimeout: number;
  enabledNetworks: Network[];
  enabledTypes: AssetType[];
  requireVerification: boolean;
}
```

---

## 🚧 Migration Strategy

### Backward Compatibility
- Keep existing address-first search as fallback
- Gradually migrate configurators one by one
- Maintain API compatibility during transition

### Progressive Enhancement
1. **Week 1-2**: Add name search alongside address search
2. **Week 3-4**: Make name search primary, address secondary  
3. **Week 5-6**: Full multi-result interface
4. **Week 7+**: Advanced features and optimizations

### User Education
- Onboarding tooltips for new search features
- Help documentation with search examples
- Progressive disclosure of advanced features

---

## 📚 References & Resources

### Ethereum Ecosystem
- [ENS Documentation](https://docs.ens.domains/)
- [EFP API Documentation](https://ethidentitykit.com/docs/api)
- [ENS JavaScript SDK](https://github.com/ensdomains/ensjs-v3)

### LUKSO Ecosystem  
- [Universal Profile Standards](https://docs.lukso.tech/standards/universal-profile/introduction)
- [LSP3 Profile Metadata](https://docs.lukso.tech/standards/universal-profile/lsp3-profile-metadata)
- [ERC725.js Documentation](https://docs.lukso.tech/tools/erc725js/getting-started)

### UI/UX Libraries
- [Sonner Toast](https://sonner.emilkowal.ski/) - Already integrated
- [Lucide Icons](https://lucide.dev/) - For search result type indicators
- [Radix UI](https://radix-ui.com/) - For dropdown components

---

*Last Updated: January 2025*
*Status: Research & Planning Phase* 