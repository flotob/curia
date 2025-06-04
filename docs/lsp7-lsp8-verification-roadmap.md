# LSP7/LSP8 Token Verification Implementation Roadmap

## 🎯 **Current Status**
- ✅ **LYX Balance Verification**: Working perfectly
- ✅ **Database Storage**: Token requirements stored correctly  
- ✅ **Challenge-Response Flow**: ERC-1271 signature verification working
- ✅ **UI Framework**: InlineUPConnection widget ready
- ❌ **LSP7/LSP8 Verification**: Shows "Token verification coming soon"

## 📝 **Test Case**
```json
{
  "responsePermissions": {
    "upGating": {
      "enabled": true,
      "requirements": {
        "requiredTokens": [
          {
            "name": "Lukso OG",
            "symbol": "LYXOG", 
            "minAmount": "1000000000000000000", // 1 token in wei
            "tokenType": "LSP7",
            "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"
          }
        ]
      }
    }
  }
}
```

---

## 🚀 **Phase 1: Backend Token Verification (2-3 hours)**

### **Step 1.1: Create LSP7/LSP8 ABIs**
- Add LSP7 and LSP8 contract ABIs to verification library
- Include standard functions: `balanceOf`, `supportsInterface`, `name`, `symbol`

### **Step 1.2: Implement Token Balance Checking**
- Create `verifyLSP7Balance()` function using raw RPC calls (like LYX)
- Create `verifyLSP8Ownership()` function for NFT verification
- Add parallel token verification to `verifyPostGatingRequirements()`

### **Step 1.3: Update Backend API**
- Modify `/api/posts/[postId]/comments` to call token verification
- Remove "Token verification not yet implemented" error
- Add proper error messages for insufficient token balances

---

## 🎨 **Phase 2: Frontend Token Display (1-2 hours)**

### **Step 2.1: Update InlineUPConnection**
- Remove "Token verification coming soon" placeholder
- Add token requirement display with name, symbol, amount
- Add loading states for token balance checks

### **Step 2.2: Add Token Balance Fetching**
- Extend `useConditionalUniversalProfile` with token balance methods
- Add frontend token verification for immediate UX feedback
- Show checkmarks/X marks for each token requirement

---

## 🔄 **Phase 3: Automatic Token Metadata Fetching (3-4 hours)**

### **Step 3.1: Create Token Metadata Service**
- Build service to automatically fetch token name, symbol, decimals
- Use `supportsInterface()` to detect LSP7 vs LSP8
- Handle edge cases (missing metadata, invalid contracts)

### **Step 3.2: Update Post Creation UI**
- When user enters contract address, auto-fetch metadata
- Pre-populate name, symbol fields
- Add validation for valid LSP7/LSP8 contracts
- Show loading states during metadata fetching

### **Step 3.3: UX Improvements**
- Contract address → automatic token detection
- Visual feedback for valid/invalid contracts  
- Error handling for non-existent or invalid contracts
- Option to override auto-fetched data if needed

---

## 📊 **Phase 4: Advanced Features (2-3 hours)**

### **Step 4.1: Multi-Token Support**
- Support multiple token requirements per post
- "AND" logic (must have ALL tokens)
- Efficient parallel verification

### **Step 4.2: LSP8 NFT Enhancements**
- Support specific NFT ID requirements
- Support "any NFT from collection" requirements
- Use LSP5-ReceivedAssets for efficient ownership checking

---

## 🧪 **Testing Plan**

### **Manual Testing**
1. Test with Lukso OG token (LSP7): `0xb2894bfdac8d21c2098196b2707c738f5533e0a8`
2. Test with popular LUKSO NFT collections (LSP8)
3. Test edge cases: insufficient balance, wrong network, invalid contracts

### **Validation Scenarios**
- User has exact minimum amount ✅
- User has more than minimum ✅  
- User has less than minimum ❌
- User doesn't have token at all ❌
- Invalid contract address ❌

---

## 📚 **Technical Implementation Notes**

### **LSP7 (Fungible Tokens) - Like ERC20**
```typescript
// Check balance
const balance = await rawLuksoCall('eth_call', [{
  to: contractAddress,
  data: '0x70a08231' + upAddress.slice(2).padStart(64, '0') // balanceOf(address)
}, 'latest']);
```

### **LSP8 (NFTs) - Like ERC721**  
```typescript
// Check ownership of specific NFT
const owner = await rawLuksoCall('eth_call', [{
  to: contractAddress, 
  data: '0x6352211e' + tokenId.padStart(64, '0') // ownerOf(bytes32)
}, 'latest']);
```

### **Interface Detection**
```typescript
// Detect LSP7 vs LSP8
const isLSP7 = await rawLuksoCall('eth_call', [{
  to: contractAddress,
  data: '0x01ffc9a7' + LSP7_INTERFACE_ID // supportsInterface(bytes4)
}, 'latest']);
```

---

## 🎯 **Priority Order**

1. **Phase 1**: Backend verification (critical for security)
2. **Phase 2**: Frontend display (improves UX immediately) 
3. **Phase 3**: Auto-metadata fetching (major UX improvement for post authors)
4. **Phase 4**: Advanced features (nice-to-have)

---

## 🔗 **LUKSO Standards Reference**

- **LSP7**: Fungible tokens (like ERC20 but better)
- **LSP8**: NFTs (like ERC721 but with bytes32 IDs)
- **Interface IDs**: For detecting contract types
- **Metadata**: Dynamic, updatable token information
- **balanceOf()**: Same signature for both LSP7/LSP8
- **supportsInterface()**: ERC165 standard for capability detection

---

## 📋 **TODOs for Enhanced UX**

### **🎨 Post Author Experience Improvements**
- [ ] **Auto-fetch token metadata**: Enter contract address → get name/symbol automatically
- [ ] **Contract validation**: Real-time validation of contract addresses
- [ ] **Token picker**: Browse popular LUKSO tokens with search/filter
- [ ] **Visual token cards**: Show token logos, descriptions, current price
- [ ] **Suggested amounts**: Show common amounts (1, 10, 100 tokens)
- [ ] **Amount validation**: Prevent impossible amounts (more than total supply)

### **Technical Implementation for Auto-Metadata**
```typescript
// Auto-fetch workflow:
// 1. User enters contract address
// 2. Call supportsInterface() to detect LSP7/LSP8
// 3. Call name(), symbol(), decimals() for LSP7
// 4. Call name(), symbol() for LSP8  
// 5. Populate form fields automatically
// 6. Allow manual override if needed
```

This prevents:
- ❌ Typos in token names/symbols
- ❌ Malicious misleading information  
- ❌ Wrong decimal places
- ❌ Invalid contract addresses
- ❌ Non-existent tokens

**Next Action**: Start with **Phase 1, Step 1.1** - Create LSP7/LSP8 ABIs 