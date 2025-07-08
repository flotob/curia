# User Profile Tipping System - Research & Implementation Plan

*Research Document for Adding Tipping Functionality to User Profile Popovers*

## 🎯 **Project Overview**

**Goal**: Add a pink tipping button to user profile popovers that allows users to send crypto tips (LYX/LSP7/LSP8 tokens) to other users who have verified Universal Profile addresses.

**Key Requirements**:
1. **Conditional Activation**: Only show tipping option if recipient has verified UP address in database
2. **Sender Connection**: Reuse existing UP wagmi connection logic from gating system
3. **UI Transformation**: Transform popover into tip-sending interface 
4. **Asset Selection**: Allow sender to choose asset type and amount
5. **Transaction Execution**: Send crypto via Universal Profile

---

## 🗄️ **Database Infrastructure Analysis**

### **Current Verification System**
Our existing `pre_verifications` table already stores Universal Profile verification data:

```sql
TABLE pre_verifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_type TEXT NOT NULL, -- 'universal_profile'
  verification_data JSONB NOT NULL, -- Contains UP address & signature
  verification_status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  lock_id INTEGER NOT NULL
);
```

**Example verification_data payload**:
```json
{
  "type": "universal_profile",
  "nonce": "c7d03d8603f34129b10079501365aee3",
  "address": "0x0a607f902CAa16a27AA3Aabd968892aa89ABDa92",
  "chainId": 42,
  "upAddress": "0x0a607f902CAa16a27AA3Aabd968892aa89ABDa92",
  "signature": "0x7f54b2c4737123f...",
  "timestamp": 1750918961274
}
```

### **Tip Eligibility Query**
```sql
-- Check if user has verified UP address
SELECT DISTINCT 
  pv.user_id,
  pv.verification_data->>'upAddress' as up_address,
  pv.verification_data->>'address' as address
FROM pre_verifications pv 
WHERE pv.user_id = $recipientUserId 
  AND pv.category_type = 'universal_profile'
  AND pv.verification_status = 'verified'
  AND pv.expires_at > NOW()
ORDER BY pv.verified_at DESC 
LIMIT 1;
```

---

## 🔗 **Universal Profile Connection Infrastructure**

### **Current UP Wagmi Integration**
Our existing gating system has mature UP connection logic in:
- `src/contexts/UniversalProfileContext.tsx` - Main UP connection manager
- `src/contexts/ConditionalUniversalProfileProvider.tsx` - Context switcher  
- `src/components/universal-profile/UPConnectionButton.tsx` - Connection UI
- `src/lib/gating/renderers/UniversalProfileRenderer.tsx` - UP verification

**Key Implementation Pattern**:
```typescript
// Universal Profile connection via window.lukso
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.lukso);
await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();
const upAddress = await signer.getAddress();
```

**Connection State Management**:
- Automatic reconnection on page load
- Connection persistence across sessions  
- Real-time balance updates
- Extension detection and prompting

---

## 💰 **LUKSO Tipping Implementation Details**

### **1. Universal Profile Identity Format**
LUKSO users are identified as `@username#1234` where:
- `username` = Human-readable profile name
- `#1234` = 4-character hex identifier derived from UP address
- **Example**: `@charliebrown#0Dc0` tipping to `@Frozeman#9750`

### **2. Asset Enumeration (LSP5ReceivedAssets)**
```typescript
import ERC725 from '@erc725/erc725.js';
import LSP5Schema from '@erc725/erc725.js/schemas/LSP5ReceivedAssets.json';

// Fetch all assets owned by a Universal Profile
const erc725 = new ERC725(LSP5Schema, upAddress, providerUrl);
const assetAddresses = await erc725.fetchData('LSP5ReceivedAssets[]');

// Determine asset type via ERC-165 interface detection
const isLSP7 = await contract.supportsInterface('0x5fcaac27'); // LSP7 interface
const isLSP8 = await contract.supportsInterface('0x3a271706'); // LSP8 interface
```

### **3. UP Address Resolution Services**
Current LUKSO infrastructure provides multiple resolution options:

**A. universaleverything.io API** (Current active service)
- **URL**: `https://universaleverything.io/`
- **Features**: UP search, asset browsing, GraphQL + RPC modes
- **API Support**: Both GraphQL indexer and direct RPC calls

**B. LUKSO API Endpoints** (Official)
- **Metadata API**: Used by indexers for token contract metadata
- **UP Resolution**: Search profiles by name/partial address

**C. Community Indexers**
- **Envio Hypersync**: Fast indexing solution (100x faster than The Graph)
- **Custom LSP Token Indexers**: Index LSP7/LSP8 tokens with metadata

### **4. Transaction Execution Patterns**

**LYX (Native Token) Transfer**:
```typescript
const tx = await signer.sendTransaction({
  from: upAddress,
  to: recipientAddress,  
  value: ethers.parseEther('0.5'), // 0.5 LYX
});
```

**LSP7 Token Transfer**:
```typescript
import LSP7DigitalAsset from '@lukso/lsp-smart-contracts/artifacts/LSP7DigitalAsset.json';

const tokenContract = new ethers.Contract(tokenAddress, LSP7DigitalAsset.abi, signer);
const amount = ethers.parseUnits('15', 18); // 15 tokens with 18 decimals

await tokenContract.transfer(
  await signer.getAddress(), // from: sender UP address
  recipientAddress,          // to: recipient address
  amount,                    // amount: in smallest units
  true,                      // force: allow any recipient
  '0x'                       // data: optional payload
);
```

**LSP8 NFT Transfer**:
```typescript
import LSP8IdentifiableDigitalAsset from '@lukso/lsp-smart-contracts/artifacts/LSP8IdentifiableDigitalAsset.json';

const nftContract = new ethers.Contract(nftAddress, LSP8IdentifiableDigitalAsset.abi, signer);
const tokenId = ethers.toBeHex(319, 32); // Convert token number to 32-byte hex

await nftContract.transfer(
  await signer.getAddress(), // from: sender UP address  
  recipientAddress,          // to: recipient address
  tokenId,                   // tokenId: 32-byte identifier
  true,                      // force: allow any recipient
  '0x'                       // data: optional payload
);
```

---

## 🛠️ **Implementation Architecture**

### **Phase 1: Backend Integration**

**1. Recipient Eligibility API**
```typescript
// POST /api/users/[userId]/tip-eligibility
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const { userId } = params;
  
  // Query pre_verifications for valid UP address
  const eligibility = await db.query(`
    SELECT 
      pv.verification_data->>'upAddress' as up_address,
      pv.verification_data->>'address' as address,
      pv.verified_at
    FROM pre_verifications pv 
    WHERE pv.user_id = $1 
      AND pv.category_type = 'universal_profile'
      AND pv.verification_status = 'verified'
      AND pv.expires_at > NOW()
    ORDER BY pv.verified_at DESC 
    LIMIT 1
  `, [userId]);

  return Response.json({
    eligible: eligibility.rows.length > 0,
    upAddress: eligibility.rows[0]?.up_address || null
  });
}
```

**2. UP Profile Resolution API**
```typescript
// POST /api/universal-profile/resolve
export async function POST(request: Request) {
  const { handle } = await request.json(); // "@username#1234"
  
  // Extract username and identifier
  const [username, identifier] = handle.replace('@', '').split('#');
  
  // Query universaleverything.io API or local cache
  const profileData = await fetch(`https://universaleverything.io/api/profiles/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: username, addressSuffix: identifier })
  });
  
  const profile = await profileData.json();
  
  return Response.json({
    address: profile?.address || null,
    metadata: profile?.metadata || null
  });
}
```

### **Phase 2: Frontend Components**

**1. Enhanced UserProfilePopover**
```typescript
interface UserProfilePopoverProps {
  userId: string;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  userCommunityName?: string;
  isCurrentCommunity?: boolean;
}

const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  userId,
  // ... other props
}) => {
  const [tipEligibility, setTipEligibility] = useState<{eligible: boolean, upAddress?: string} | null>(null);
  const [showTipInterface, setShowTipInterface] = useState(false);
  
  // Check tip eligibility on popover open
  useEffect(() => {
    if (open && userId) {
      checkTipEligibility(userId);
    }
  }, [open, userId]);
  
  const checkTipEligibility = async (userId: string) => {
    const response = await fetch(`/api/users/${userId}/tip-eligibility`);
    const data = await response.json();
    setTipEligibility(data);
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" side="left" align="center" sideOffset={12}>
        {!showTipInterface ? (
          <>
            {/* Existing profile content */}
            
            {/* Tip button - only show if eligible */}
            {tipEligibility?.eligible && (
              <div className="p-4 border-t">
                <Button 
                  className="w-full bg-pink-500 hover:bg-pink-600"
                  onClick={() => setShowTipInterface(true)}
                >
                  💰 Send Tip
                </Button>
              </div>
            )}
          </>
        ) : (
          <TipInterface 
            recipientUserId={userId}
            recipientUsername={username}
            recipientUpAddress={tipEligibility.upAddress}
            onBack={() => setShowTipInterface(false)}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

**2. TipInterface Component**
```typescript
interface TipInterfaceProps {
  recipientUserId: string;
  recipientUsername: string;
  recipientUpAddress: string;
  onBack: () => void;
  onClose: () => void;
}

const TipInterface: React.FC<TipInterfaceProps> = ({
  recipientUserId,
  recipientUsername, 
  recipientUpAddress,
  onBack,
  onClose
}) => {
  const { universalProfile, connect, isConnected } = useUniversalProfile();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [amount, setAmount] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch sender's assets when connected
  useEffect(() => {
    if (isConnected && universalProfile?.address) {
      fetchUserAssets(universalProfile.address);
    }
  }, [isConnected, universalProfile?.address]);
  
  const fetchUserAssets = async (upAddress: string) => {
    setLoading(true);
    try {
      // Enumerate LSP5ReceivedAssets
      const erc725 = new ERC725(LSP5Schema, upAddress, 'https://rpc.lukso.network');
      const assetAddresses = await erc725.fetchData('LSP5ReceivedAssets[]');
      
      // Get LYX balance
      const provider = new ethers.BrowserProvider(window.lukso);
      const lyxBalance = await provider.getBalance(upAddress);
      
      const assetList: Asset[] = [{
        type: 'LYX',
        address: null,
        name: 'LYX',
        symbol: 'LYX',
        balance: ethers.formatEther(lyxBalance),
        decimals: 18
      }];
      
      // Process each asset address
      for (const assetAddress of assetAddresses.value || []) {
        const assetContract = new ethers.Contract(assetAddress, ['function supportsInterface(bytes4) view returns (bool)'], provider);
        
        const isLSP7 = await assetContract.supportsInterface('0x5fcaac27');
        const isLSP8 = await assetContract.supportsInterface('0x3a271706');
        
        if (isLSP7) {
          // Process LSP7 token
          const asset = await processLSP7Asset(assetAddress, upAddress);
          assetList.push(asset);
        } else if (isLSP8) {
          // Process LSP8 NFT
          const assets = await processLSP8Assets(assetAddress, upAddress);
          assetList.push(...assets);
        }
      }
      
      setAssets(assetList);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendTip = async () => {
    if (!selectedAsset || !amount || !universalProfile?.address) return;
    
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.lukso);
      const signer = await provider.getSigner();
      
      if (selectedAsset.type === 'LYX') {
        // Send LYX
        const tx = await signer.sendTransaction({
          from: universalProfile.address,
          to: recipientUpAddress,
          value: ethers.parseEther(amount)
        });
        await tx.wait();
      } else if (selectedAsset.type === 'LSP7') {
        // Send LSP7 token
        const tokenContract = new ethers.Contract(
          selectedAsset.address, 
          LSP7DigitalAsset.abi, 
          signer
        );
        const transferAmount = ethers.parseUnits(amount, selectedAsset.decimals);
        
        const tx = await tokenContract.transfer(
          universalProfile.address,
          recipientUpAddress,
          transferAmount,
          true,
          '0x'
        );
        await tx.wait();
      } else if (selectedAsset.type === 'LSP8') {
        // Send LSP8 NFT
        const nftContract = new ethers.Contract(
          selectedAsset.address,
          LSP8IdentifiableDigitalAsset.abi,
          signer
        );
        
        const tx = await nftContract.transfer(
          universalProfile.address,
          recipientUpAddress,
          selectedAsset.tokenId,
          true,
          '0x'
        );
        await tx.wait();
      }
      
      // Show success and close
      alert(`Successfully sent ${amount} ${selectedAsset.symbol} to ${recipientUsername}!`);
      onClose();
      
    } catch (error) {
      console.error('Tip transaction failed:', error);
      alert('Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h3 className="font-semibold">Send Tip</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>
      
      {/* Recipient Info */}
      <div className="mb-4 p-3 bg-pink-50 rounded-lg">
        <p className="text-sm font-medium">Sending to:</p>
        <p className="text-lg">@{recipientUsername}</p>
        <p className="text-xs text-gray-500 font-mono">{recipientUpAddress}</p>
      </div>
      
      {!isConnected ? (
        /* Connection Required */
        <div className="text-center py-8">
          <p className="mb-4">Connect your Universal Profile to send tips</p>
          <Button onClick={connect} className="bg-blue-500 hover:bg-blue-600">
            Connect Universal Profile
          </Button>
        </div>
      ) : (
        /* Tip Interface */
        <>
          {/* Asset Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Choose Asset:</label>
            {loading ? (
              <div className="text-center py-4">Loading assets...</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {assets.map((asset, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedAsset === asset ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-sm text-gray-500">
                        {asset.balance} {asset.symbol}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Amount Input */}
          {selectedAsset && selectedAsset.type !== 'LSP8' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter ${selectedAsset.symbol} amount`}
                className="w-full p-2 border rounded"
                max={selectedAsset.balance}
                step="0.000001"
              />
            </div>
          )}
          
          {/* Send Button */}
          <Button 
            className="w-full bg-pink-500 hover:bg-pink-600"
            onClick={handleSendTip}
            disabled={!selectedAsset || (!amount && selectedAsset.type !== 'LSP8') || loading}
          >
            {loading ? 'Sending...' : `Send ${selectedAsset?.type === 'LSP8' ? 'NFT' : amount + ' ' + selectedAsset?.symbol || 'Tip'}`}
          </Button>
        </>
      )}
    </div>
  );
};
```

### **Phase 3: Asset Processing Utilities**

```typescript
// src/lib/tipping/assetProcessor.ts

import ERC725 from '@erc725/erc725.js';
import LSP4Schema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';

export async function processLSP7Asset(contractAddress: string, userAddress: string): Promise<Asset> {
  const provider = new ethers.BrowserProvider(window.lukso);
  
  // Get token metadata
  const erc725 = new ERC725(LSP4Schema, contractAddress, provider);
  const metadata = await erc725.fetchData(['LSP4TokenName', 'LSP4TokenSymbol']);
  
  // Get balance and decimals
  const tokenContract = new ethers.Contract(contractAddress, [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ], provider);
  
  const balance = await tokenContract.balanceOf(userAddress);
  const decimals = await tokenContract.decimals();
  
  return {
    type: 'LSP7',
    address: contractAddress,
    name: metadata.value.LSP4TokenName || 'Unknown Token',
    symbol: metadata.value.LSP4TokenSymbol || 'TOKEN',
    balance: ethers.formatUnits(balance, decimals),
    decimals: decimals
  };
}

export async function processLSP8Assets(contractAddress: string, userAddress: string): Promise<Asset[]> {
  const provider = new ethers.BrowserProvider(window.lukso);
  
  // Get collection metadata
  const erc725 = new ERC725(LSP4Schema, contractAddress, provider);
  const metadata = await erc725.fetchData(['LSP4TokenName', 'LSP4TokenSymbol']);
  
  // Get owned token IDs
  const nftContract = new ethers.Contract(contractAddress, [
    'function tokenIdsOf(address) view returns (bytes32[])'
  ], provider);
  
  const tokenIds = await nftContract.tokenIdsOf(userAddress);
  
  return tokenIds.map((tokenId: string, index: number) => ({
    type: 'LSP8',
    address: contractAddress,
    name: `${metadata.value.LSP4TokenName || 'Unknown NFT'} #${index + 1}`,
    symbol: metadata.value.LSP4TokenSymbol || 'NFT',
    balance: '1',
    decimals: 0,
    tokenId: tokenId
  }));
}

interface Asset {
  type: 'LYX' | 'LSP7' | 'LSP8';
  address: string | null;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
  tokenId?: string; // For LSP8 NFTs
}
```

---

## 🚀 **Implementation Roadmap**

### **Sprint 1: Backend Foundation** (3-5 days)
1. ✅ **Eligibility API**: Check recipient UP verification status
2. ✅ **Profile Resolution**: Build UP address resolution service  
3. ✅ **Database Queries**: Optimize pre_verifications table access

### **Sprint 2: Frontend Integration** (5-7 days) 
1. ✅ **Popover Enhancement**: Add tip button conditionally
2. ✅ **UP Connection**: Integrate existing UP wagmi context
3. ✅ **Asset Enumeration**: Fetch user's LYX, LSP7, LSP8 assets
4. ✅ **Basic UI**: Asset selection and amount input

### **Sprint 3: Transaction Execution** (3-5 days)
1. ✅ **LYX Transfers**: Standard ETH-style transactions  
2. ✅ **LSP7 Transfers**: Token contract interactions
3. ✅ **LSP8 Transfers**: NFT contract interactions
4. ✅ **Error Handling**: Transaction failures and edge cases

### **Sprint 4: Polish & Testing** (2-3 days)
1. ✅ **UX Improvements**: Loading states, success feedback
2. ✅ **Error Messages**: User-friendly error handling
3. ✅ **Testing**: Cross-browser, wallet compatibility
4. ✅ **Documentation**: Developer handoff docs

---

## 🔒 **Security Considerations**

### **1. Wallet Security**
- ✅ **Non-custodial**: All transactions signed by user's UP Extension
- ✅ **No Private Keys**: Application never handles private keys
- ✅ **User Confirmation**: All transactions require explicit user approval

### **2. Recipient Verification**
- ✅ **Database Validation**: Only verified UP addresses are eligible
- ✅ **Signature Verification**: UP verification includes cryptographic proof
- ✅ **Expiration Checks**: Verification status must be current and valid

### **3. Amount Validation**
- ✅ **Balance Checks**: Frontend validates sufficient balance
- ✅ **Contract Validation**: Blockchain enforces actual balance limits
- ✅ **Input Sanitization**: Proper decimal handling and bounds checking

---

## 📊 **Success Metrics**

### **Technical Metrics**
- ✅ **Transaction Success Rate**: >95% successful tip transactions
- ✅ **Connection Reliability**: <5% UP connection failures  
- ✅ **Performance**: <3s asset enumeration, <10s transaction confirmation

### **User Experience Metrics**
- ✅ **Adoption Rate**: % of eligible users who receive tips
- ✅ **Feature Discovery**: % of users who find and use tip button
- ✅ **Error Rate**: <2% user-reported transaction errors

### **Business Metrics**
- ✅ **Engagement**: Increased user interaction with profile popovers
- ✅ **Network Effects**: Increased UP adoption for tip eligibility
- ✅ **Community Value**: Enhanced creator economy within platform

---

## 🎯 **Next Steps**

1. **✅ Stakeholder Approval**: Confirm technical approach and timeline
2. **✅ Sprint Planning**: Assign developers and set milestone dates  
3. **✅ Environment Setup**: Configure testnet for development/testing
4. **✅ Development Kickoff**: Begin Sprint 1 implementation
5. **✅ Testing Strategy**: Plan comprehensive testing across wallet types
6. **✅ Deployment Planning**: Staged rollout strategy (beta → full release)

---

## 📚 **Technical References**

- **LUKSO Documentation**: https://docs.lukso.tech/
- **LSP Standards**: https://github.com/lukso-network/LIPs
- **Universal Profile Browser Extension**: https://chromewebstore.google.com/detail/universal-profiles/
- **ERC725.js Library**: https://github.com/ERC725Alliance/erc725.js
- **LUKSO Smart Contracts**: https://github.com/lukso-network/lsp-smart-contracts
- **universaleverything.io**: https://universaleverything.io/ (Current UP browser)
- **LUKSO Grant Program**: https://lukso.network/developer-grants
- **Envio Hypersync**: https://envio.dev/ (Fast blockchain indexing)

---

**Status**: ✅ **Research Complete - Ready for Implementation**  
**Last Updated**: January 27, 2025  
**Document Version**: 2.0 (Comprehensive Technical Specification) 