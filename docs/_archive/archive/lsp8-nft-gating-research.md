# LSP8 NFT Gating Research & Implementation Plan

## 🎯 **Current LSP8 Issues Identified**

### **Issue 1: Metadata Extraction Failing**
- **Problem**: LSP8 tokens don't use ERC20-style `name()`/`symbol()` functions
- **Root Cause**: LSP8 stores metadata in **ERC725Y data keys** (LSP4 standard)
- **Error**: `call revert exception (method="name()"...)`

### **Issue 2: BigNumber Error on Balance Comparison**
- **Problem**: `tokenReq.minAmount` is `undefined` for LSP8, causing BigNumber.from(undefined)
- **Root Cause**: Current logic assumes all tokens use amount-based requirements
- **Error**: `invalid BigNumber value (argument="value", value=undefined...)`

### **Issue 3: Missing LSP8 Collection Ownership Logic**
- **Problem**: No support for "minimum NFTs owned from collection" requirements
- **Opportunity**: LSP8 should support tiered access like "own 3+ NFTs = VIP access"

---

## 🚀 **LSP8 Gating Requirements (Enhanced)**

### **1. Individual NFT Ownership**
```typescript
{
  tokenType: "LSP8",
  contractAddress: "0x...",
  tokenId: "0x123...", // Specific NFT ID
  // User must own this exact NFT
}
```

### **2. Collection Ownership (Any NFT)**
```typescript
{
  tokenType: "LSP8",
  contractAddress: "0x...",
  // tokenId: undefined (any NFT from collection)
  minAmount: "1", // Must own at least 1 NFT
}
```

### **3. Collection Ownership (Multiple NFTs) - NEW!**
```typescript
{
  tokenType: "LSP8",
  contractAddress: "0x...",
  minAmount: "3", // Must own at least 3 NFTs from this collection
  // Enables tiered access: Bronze(1), Silver(3), Gold(10)
}
```

---

## 🔧 **Technical Implementation Plan**

### **Phase 1: Fix Current LSP8 Issues**

#### **A. LSP8 Metadata Extraction (ERC725Y)**
```typescript
// Instead of contract.name() / contract.symbol()
import { ERC725YDataKeys } from '@lukso/lsp-smart-contracts';

const erc725Contract = new ethers.Contract(contractAddress, [
  'function getData(bytes32) view returns (bytes)'
], provider);

const nameKey = ERC725YDataKeys.LSP4.LSP4TokenName;
const symbolKey = ERC725YDataKeys.LSP4.LSP4TokenSymbol;

const [nameData, symbolData] = await Promise.all([
  erc725Contract.getData(nameKey),
  erc725Contract.getData(symbolKey)
]);

// Decode from bytes
const name = ethers.utils.toUtf8String(nameData);
const symbol = ethers.utils.toUtf8String(symbolData);
```

#### **B. LSP8 Balance Logic (Collection Counting)**
```typescript
// For LSP8 collections, count total NFTs owned
const lsp8Contract = new ethers.Contract(contractAddress, [
  'function balanceOf(address) view returns (uint256)', // Total NFTs owned by address
  'function tokenOwnerOf(bytes32) view returns (address)', // Owner of specific NFT
], provider);

if (tokenReq.tokenId) {
  // Specific NFT requirement
  const owner = await lsp8Contract.tokenOwnerOf(tokenReq.tokenId);
  const ownsSpecificNFT = owner.toLowerCase() === upAddress.toLowerCase();
} else {
  // Collection requirement - count total owned
  const totalOwned = await lsp8Contract.balanceOf(upAddress);
  const minRequired = ethers.BigNumber.from(tokenReq.minAmount || "1");
  const meetsRequirement = totalOwned.gte(minRequired);
}
```

#### **C. UI Updates for LSP8**
```typescript
// In PostGatingControls.tsx
{fetchedMetadata.tokenType === 'LSP8' ? (
  <div>
    <Label>NFT Requirement Type</Label>
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="radio"
          id="specific-nft"
          checked={requirementType === 'specific'}
          onChange={() => setRequirementType('specific')}
        />
        <Label htmlFor="specific-nft">Specific NFT ID:</Label>
        <Input placeholder="Token ID" />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="radio"
          id="collection-amount"
          checked={requirementType === 'collection'}
          onChange={() => setRequirementType('collection')}
        />
        <Label htmlFor="collection-amount">Minimum NFTs from collection:</Label>
        <Input type="number" placeholder="e.g., 3" />
      </div>
    </div>
  </div>
) : (
  // LSP7 amount input
)}
```

---

## 🎨 **UI/UX Enhancements for LSP8**

### **Post Creation Flow**
1. **User enters LSP8 contract** → Auto-detects as NFT collection
2. **Show two options**:
   - ✅ **Specific NFT**: "Must own NFT #123"
   - ✅ **Collection Amount**: "Must own 3+ NFTs from this collection"
3. **Visual feedback**: Show collection stats (total supply, user's owned count)

### **Comment Verification Flow**
1. **Connect Universal Profile**
2. **For specific NFT**: "✅ You own NFT #123" or "❌ You don't own NFT #123"
3. **For collection**: "✅ You own 5 NFTs (need 3)" or "❌ You own 1 NFT (need 3)"

### **Verification Display Examples**
```
🖼️ Bored Ape #1234 (LSP8)
   Requirement: Own this specific NFT
   Status: ✅ You own this NFT

🖼️ CryptoPunks Collection (LSP8)  
   Requirement: Own 3+ NFTs from collection
   Status: ✅ You own 7 NFTs (need 3)

🖼️ Cool Cats Collection (LSP8)
   Requirement: Own 5+ NFTs from collection  
   Status: ❌ You own 2 NFTs (need 5)
```

---

## 📊 **Use Cases & Benefits**

### **Tiered Access Control**
- **Bronze**: Own 1+ NFT from collection → Can comment
- **Silver**: Own 3+ NFTs → Can comment + access special channels  
- **Gold**: Own 10+ NFTs → Can comment + moderate + governance voting

### **Exclusive Content Gates**
- **Art Collections**: "Must own any Bored Ape to access alpha channel"
- **Gaming**: "Must own 5+ game items to access tournament"
- **DAOs**: "Must own 3+ governance NFTs to propose"

### **Community Building**
- **Collectors**: "True collectors (10+ NFTs) get exclusive access"
- **Traders**: "Active traders (bought/sold 5+ times) get insider info"
- **Holders**: "Diamond hands (held 1+ year) get founder benefits"

---

## 🔗 **LSP8 Technical Specifications**

### **LSP8 Standard Functions**
```solidity
// Balance functions
function balanceOf(address tokenOwner) external view returns (uint256);
function tokenOwnerOf(bytes32 tokenId) external view returns (address);
function tokenIdsOf(address tokenOwner) external view returns (bytes32[] memory);

// Metadata functions (ERC725Y)
function getData(bytes32 dataKey) external view returns (bytes memory);
function getDataBatch(bytes32[] memory dataKeys) external view returns (bytes[] memory);
```

### **LSP4 Metadata Keys**
```typescript
const LSP4_KEYS = {
  TokenName: '0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e',
  TokenSymbol: '0x2f0a68ab07768e01943a599e73362a0e17a63a72e94dd2e384d2c1d4db932756',
  TokenType: '0xe0261fa95db2eb3b5439bd033cda66d56b96f92f243a8228fd87550ed7bdffc5'
};
```

---

## 🚧 **Implementation Priority**

### **Phase 1: Critical Fixes (Immediate)**
1. ✅ Fix LSP8 metadata extraction (ERC725Y)
2. ✅ Fix BigNumber error (handle undefined minAmount)  
3. ✅ Implement LSP8 collection ownership counting

### **Phase 2: Enhanced Features (Next)**
1. ✅ UI for specific NFT vs collection requirements
2. ✅ Real-time NFT count display
3. ✅ Tiered access level indicators

### **Phase 3: Advanced Features (Future)**
1. ✅ NFT collection analytics integration
2. ✅ Dynamic requirement suggestions based on user's portfolio
3. ✅ Cross-collection requirements (own NFTs from multiple collections)

---

## 💡 **Open Questions for Discussion**

1. **Collection Counting**: Should we count via `balanceOf()` or enumerate `tokenIdsOf()`?
2. **Metadata Fallbacks**: If ERC725Y fails, should we try legacy `name()`/`symbol()`?
3. **UI Complexity**: How much LSP8 configuration should we expose to post authors?
4. **Performance**: For large collections (10k+ NFTs), how do we optimize ownership checks?
5. **Cross-Chain**: Should we support LSP8 NFTs on other chains (L2s)?

---

## 🎯 **Success Metrics**

- ✅ **Zero LSP8 metadata failures**
- ✅ **Zero BigNumber errors** 
- ✅ **Support both specific NFT and collection requirements**
- ✅ **Intuitive UI** for post authors setting NFT requirements
- ✅ **Clear verification status** for commenters checking their NFT ownership
- ✅ **Production-ready** for LUKSO mainnet NFT collections

---

**Next Steps**: Implement Phase 1 fixes, then gather feedback on Phase 2 UI/UX design. 