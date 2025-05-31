# Circles Integration Roadmap v2: Complete Community Economy

**Vision**: Transform Curia into a complete, extensionless Web3 community economy platform using Porto.sh wallets and Circles.Network, enabling seamless onboarding, trust coordination, and organizational structures entirely within Common Ground.

---

## Current Status: Phase 1 Complete ✅

### WP1.1: Basic Circles SDK Integration ✅
- MetaMask wallet connection via `@circles-sdk/adapter-ethers`
- Circles SDK initialization on Gnosis Chain
- Circles Safe address discovery via `sdk.getAvatar()`

### WP1.2: Identity Linking ✅  
- Database schema: `circles_safe_address` column in `users` table
- API endpoints: GET/POST `/api/user/link-circles-identity`
- UI: Link Circles Safe addresses to Curia user accounts
- Authentication integration with existing JWT system

**Achievement**: Foundation established - CG users can link their existing Circles identities to Curia accounts.

---

## Phase 2: Porto Wallet Integration (Extensionless Experience)

**Goal**: Replace MetaMask dependency with Porto.sh for in-browser, extensionless wallet creation.

### Implementation Overview

Based on Porto SDK documentation, the integration requires:
1. **Wagmi Setup** - Porto works best with Wagmi as the wallet connection layer
2. **Porto Initialization** - `Porto.create()` injects EIP-1193 provider via EIP-6963
3. **Unified Wallet Provider** - Support both MetaMask and Porto through Wagmi
4. **Gnosis Chain Configuration** - Ensure Porto wallets work on Gnosis Chain (ID 100)

### WP2.1: Wagmi + Porto Foundation Setup

**Current State**: We use ethers.js directly for wallet connections  
**Target State**: Wagmi + Porto for unified wallet management

#### Step 1: Install Dependencies
```bash
npm install wagmi porto @wagmi/core @wagmi/connectors viem
```

#### Step 2: Create Wagmi Configuration
**File**: `src/lib/wagmi-config.ts`
```typescript
import { http, createConfig, createStorage } from 'wagmi'
import { gnosis } from 'wagmi/chains'
import { metaMask, injected } from '@wagmi/connectors'
import { Porto } from 'porto'

// Initialize Porto - this injects the Porto provider via EIP-6963
Porto.create()

export const wagmiConfig = createConfig({
  chains: [gnosis],
  connectors: [
    metaMask(), // MetaMask connector
    injected(), // Generic injected connector (will pick up Porto)
  ],
  storage: createStorage({ 
    storage: localStorage,
    key: 'curia-wagmi-cache'
  }),
  transports: {
    [gnosis.id]: http(process.env.NEXT_PUBLIC_GNOSIS_RPC_URL || 'https://rpc.gnosischain.com'),
  },
})
```

#### Step 3: Wagmi Provider Setup
**File**: `src/contexts/WagmiContext.tsx`
```typescript
'use client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi-config'

const queryClient = new QueryClient()

export function WagmiContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

#### Step 4: Update Root Layout
**File**: `src/app/layout.tsx`
```typescript
// Wrap the app with WagmiContextProvider
import { WagmiContextProvider } from '@/contexts/WagmiContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <WagmiContextProvider>
          <CgLibProvider>
            <AuthProvider>
              {/* existing layout */}
            </AuthProvider>
          </CgLibProvider>
        </WagmiContextProvider>
      </body>
    </html>
  )
}
```

### WP2.2: Unified Wallet Connection Interface

#### Step 1: Create Wallet Provider Hook
**File**: `src/hooks/useWalletConnection.ts`
```typescript
import { useConnect, useDisconnect, useAccount, useConnectors } from 'wagmi'
import { Hooks } from 'porto/wagmi'
import { useCallback, useMemo } from 'react'

export type WalletType = 'metamask' | 'porto' | 'unknown'

export function useWalletConnection() {
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, isConnected, connector } = useAccount()
  const connectors = useConnectors()
  
  // Porto-specific hooks
  const portoConnect = Hooks.useConnect()
  const portoCreateAccount = Hooks.useCreateAccount()

  const availableWallets = useMemo(() => {
    const wallets: Array<{ type: WalletType, name: string, connector: any }> = []
    
    connectors.forEach(conn => {
      if (conn.name.toLowerCase().includes('metamask')) {
        wallets.push({ type: 'metamask', name: 'MetaMask', connector: conn })
      } else if (conn.name.toLowerCase().includes('porto')) {
        wallets.push({ type: 'porto', name: 'Porto (No Extension)', connector: conn })
      } else {
        wallets.push({ type: 'unknown', name: conn.name, connector: conn })
      }
    })
    
    return wallets
  }, [connectors])

  const connectWallet = useCallback(async (walletType: WalletType) => {
    const wallet = availableWallets.find(w => w.type === walletType)
    if (!wallet) throw new Error(`Wallet type ${walletType} not found`)

    if (walletType === 'porto') {
      // For Porto, might need to create account first if new user
      try {
        await portoConnect.mutateAsync({ connector: wallet.connector })
      } catch (error) {
        // If connection fails, try creating account first
        await portoCreateAccount.mutateAsync()
        await portoConnect.mutateAsync({ connector: wallet.connector })
      }
    } else {
      await connect({ connector: wallet.connector })
    }
  }, [availableWallets, connect, portoConnect, portoCreateAccount])

  const getWalletType = useCallback((): WalletType => {
    if (!connector) return 'unknown'
    const name = connector.name.toLowerCase()
    if (name.includes('metamask')) return 'metamask'
    if (name.includes('porto')) return 'porto'
    return 'unknown'
  }, [connector])

  return {
    // Connection state
    address,
    isConnected,
    walletType: getWalletType(),
    
    // Available options
    availableWallets,
    
    // Actions
    connectWallet,
    disconnect,
    
    // Porto-specific
    isPortoAvailable: availableWallets.some(w => w.type === 'porto'),
    isMetaMaskAvailable: availableWallets.some(w => w.type === 'metamask'),
  }
}
```

#### Step 2: Create Ethers Signer Bridge
**File**: `src/hooks/useEthersSigner.ts`
```typescript
import { useMemo } from 'react'
import { useWalletClient } from 'wagmi'
import { BrowserProvider, JsonRpcSigner } from 'ethers'

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient()

  return useMemo(() => {
    if (!walletClient) return null
    
    // Convert Wagmi's wallet client to ethers signer
    const provider = new BrowserProvider(walletClient)
    return provider.getSigner()
  }, [walletClient])
}
```

### WP2.3: Update Circles Test Page

#### Step 1: Replace Direct Wallet Connection
**File**: `src/app/circles-tests/page.tsx`
```typescript
'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Sdk, circlesConfig, type Avatar } from '@circles-sdk/sdk'
import { Button } from '@/components/ui/button'
import { isAddress, getAddress } from 'ethers'
import { useAuth } from '@/contexts/AuthContext'
import { useWalletConnection } from '@/hooks/useWalletConnection'
import { useEthersSigner } from '@/hooks/useEthersSigner'

// Type alias for Ethereum address format expected by Circles SDK
type EthereumAddress = `0x${string}`

const GNOSIS_CHAIN_ID = 100

export default function CirclesTestsPage() {
  const { token, isAuthenticated } = useAuth()
  const { 
    address: connectedAddress, 
    isConnected, 
    availableWallets,
    connectWallet,
    disconnect,
    walletType,
    isPortoAvailable,
    isMetaMaskAvailable 
  } = useWalletConnection()
  const signer = useEthersSigner()

  const [sdkInstance, setSdkInstance] = useState<Sdk | null>(null)
  const [userCirclesSafeAddress, setUserCirclesSafeAddress] = useState<string | null>(null)
  const [linkedCirclesSafeAddress, setLinkedCirclesSafeAddress] = useState<string | null>(null)
  const [isInitializingSdk, setIsInitializingSdk] = useState<boolean>(false)
  const [isFetchingSafe, setIsFetchingSafe] = useState<boolean>(false)
  const [isLinkingAddress, setIsLinkingAddress] = useState<boolean>(false)
  const [isCheckingLinkedAddress, setIsCheckingLinkedAddress] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Auto-initialize SDK when wallet connects
  useEffect(() => {
    if (isConnected && signer && !sdkInstance) {
      initializeCirclesSDK()
    }
  }, [isConnected, signer, sdkInstance])

  const initializeCirclesSDK = useCallback(async () => {
    if (!signer) {
      setError('No wallet signer available')
      return
    }

    setIsInitializingSdk(true)
    setError(null)
    setMessage(null)

    try {
      setMessage('Initializing Circles SDK...')
      
      const sdkConfig = circlesConfig[GNOSIS_CHAIN_ID]
      if (!sdkConfig) {
        throw new Error(`Circles configuration for Gnosis Chain (ID: ${GNOSIS_CHAIN_ID}) not found.`)
      }

      // Create SDK with ethers signer from Wagmi
      const sdk = new Sdk(signer, sdkConfig)
      setSdkInstance(sdk)
      setMessage('Circles SDK initialized successfully!')
      console.log('[CirclesTestsPage] Circles SDK initialized:', sdk)

    } catch (err: unknown) {
      console.error('[CirclesTestsPage] Error initializing SDK:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during initialization.'
      setError(errorMessage)
      setMessage(null)
    } finally {
      setIsInitializingSdk(false)
    }
  }, [signer])

  const handleConnectWallet = useCallback(async (type: 'metamask' | 'porto') => {
    try {
      setError(null)
      setMessage(`Connecting to ${type === 'porto' ? 'Porto' : 'MetaMask'} wallet...`)
      await connectWallet(type)
    } catch (err: unknown) {
      console.error('Wallet connection error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(errorMessage)
      setMessage(null)
    }
  }, [connectWallet])

  // ... rest of existing logic (checkLinkedCirclesAddress, handleLinkCirclesAddress, etc.)

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Circles Integration Tests - Porto Edition</h1>

      {/* Wallet Connection Section */}
      <section className="p-4 border rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-medium">Wallet Connection</h2>
        
        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Choose your wallet type:</p>
            
            {isPortoAvailable && (
              <Button 
                onClick={() => handleConnectWallet('porto')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                🌐 Connect with Porto (No Extension Required)
              </Button>
            )}
            
            {isMetaMaskAvailable && (
              <Button 
                onClick={() => handleConnectWallet('metamask')}
                variant="outline"
                className="w-full"
              >
                🦊 Connect with MetaMask
              </Button>
            )}
            
            {availableWallets.length === 0 && (
              <div className="p-3 border rounded bg-yellow-100 dark:bg-yellow-900/30">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  No wallet options detected. Please ensure MetaMask is installed or Porto is properly initialized.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 border rounded bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
              <p className="font-semibold text-green-700 dark:text-green-400">
                ✓ Connected via {walletType === 'porto' ? 'Porto' : 'MetaMask'}
              </p>
              <p className="text-sm text-green-600 dark:text-green-300 break-all">
                Address: {connectedAddress}
              </p>
            </div>
            
            <Button onClick={() => disconnect()} variant="outline" size="sm">
              Disconnect Wallet
            </Button>
          </div>
        )}

        {/* SDK Status */}
        {isConnected && (
          <div className="mt-4">
            {isInitializingSdk ? (
              <div className="p-3 border rounded bg-blue-100 dark:bg-blue-900/30">
                <p className="text-sm text-blue-600 dark:text-blue-300">Initializing Circles SDK...</p>
              </div>
            ) : sdkInstance ? (
              <div className="p-3 border rounded bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                <p className="font-semibold text-green-700 dark:text-green-400">✓ Circles SDK Ready</p>
                <p className="text-sm text-green-600 dark:text-green-300">Ready for Circles operations</p>
              </div>
            ) : (
              <Button onClick={initializeCirclesSDK} className="w-full">
                Initialize Circles SDK
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Rest of existing UI sections... */}
      {/* Authentication Status, WP1.2 sections remain the same */}
    </div>
  )
}
```

### WP2.4: Environment Configuration

#### Step 1: Update Environment Variables
**File**: `.env.local`
```bash
# Gnosis Chain RPC (for Wagmi)
NEXT_PUBLIC_GNOSIS_RPC_URL=https://rpc.gnosischain.com

# Alternative RPC endpoints
# NEXT_PUBLIC_GNOSIS_RPC_URL=https://gnosis-mainnet.public.blastapi.io
# NEXT_PUBLIC_GNOSIS_RPC_URL=https://gnosis.drpc.org
```

#### Step 2: Add Gnosis Chain to Wagmi Chains
**File**: `src/lib/chains.ts`
```typescript
import { defineChain } from 'viem'

export const gnosis = defineChain({
  id: 100,
  name: 'Gnosis',
  network: 'gnosis',
  nativeCurrency: {
    decimals: 18,
    name: 'xDAI',
    symbol: 'xDAI',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.gnosischain.com'],
    },
    public: {
      http: ['https://rpc.gnosischain.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Gnosis Scan', url: 'https://gnosisscan.io' },
  },
})
```

### WP2.5: Testing & Validation

#### Step 1: Manual Testing Checklist
- [ ] Porto wallet creation works without browser extension
- [ ] MetaMask connection still works (backward compatibility)
- [ ] Wallet switching between Porto and MetaMask
- [ ] Gnosis Chain connectivity for both wallet types
- [ ] Circles SDK initialization with both wallet types
- [ ] Existing identity linking functionality preserved

#### Step 2: Error Handling Scenarios
- [ ] No wallet available (neither MetaMask nor Porto)
- [ ] Porto account creation failure
- [ ] Network switching to Gnosis Chain
- [ ] Connection timeout handling
- [ ] Wallet disconnection cleanup

### WP2.6: Documentation & Migration

#### Step 1: Update Developer Documentation
**File**: `docs/wallet-integration.md`
- Document new Wagmi + Porto architecture
- Migration guide from direct ethers to Wagmi
- Troubleshooting common Porto integration issues

#### Step 2: User Guidance
**File**: `docs/user-wallet-guide.md`
- Explain difference between Porto and MetaMask options
- Step-by-step Porto wallet creation guide
- Security considerations for in-browser wallets

### Success Criteria for Phase 2

1. **✅ Zero Extension Experience**: Users can create wallets without installing browser extensions
2. **✅ Backward Compatibility**: Existing MetaMask users continue to work seamlessly  
3. **✅ Unified Interface**: Single hook (`useWalletConnection`) manages all wallet types
4. **✅ Gnosis Chain Support**: Both Porto and MetaMask wallets work on Gnosis Chain
5. **✅ Circles SDK Integration**: Seamless bridge from Wagmi to ethers for Circles SDK
6. **✅ Persistent Sessions**: Wallet connections persist across page refreshes
7. **✅ Error Resilience**: Graceful handling of connection failures and edge cases

### Next Phase Preparation

Once Phase 2 is complete, we'll have:
- **Extensionless wallet creation** via Porto
- **Unified wallet management** through Wagmi
- **Foundation for Phase 3**: In-plugin Circles signup using Porto wallets

This sets us up perfectly for Phase 3 where we'll implement full Circles onboarding (`sdk.registerHuman()`) using the Porto wallets created in this phase.

---

## Phase 3: Complete Circles Onboarding

**Goal**: Enable full Circles signup and avatar creation within the plugin.

### WP3.1: In-Plugin Circles Signup
- **Tasks**:
  - Implement `sdk.registerHuman()` for new user onboarding
  - Handle existing user detection (`sdk.getAvatarInfo()`)
  - Add Circles Safe deployment via Porto wallet signer
  - Update database to track signup status and avatar details
- **Deliverable**: New users can become Circles participants without leaving Curia

### WP3.2: Onboarding UX Design
- **Tasks**:
  - Design seamless onboarding flow: CG signup → Porto wallet → Circles avatar
  - Add progress indicators and explanation steps
  - Implement error handling for failed signups (insufficient gas, duplicates)
  - Create welcome experience for new Circles users
- **Deliverable**: Polished, guided onboarding experience

---

## Phase 4: Trust Coordination System

**Goal**: Create community-driven trust building to help new users integrate into the Circles economy.

### WP4.1: Trust Request Database Schema
- **Tasks**:
  - Create `circles_trust_requests` table
  - Fields: `user_id`, `circles_safe_address`, `community_id`, `notes`, `status`, `created_at`
  - Add indexes for efficient community-scoped queries
  - Implement status management (pending → fulfilled)
- **Deliverable**: Database foundation for trust coordination

### WP4.2: Trust Request UI Components
- **Tasks**:
  - "Seeking Trust" dashboard/widget showing new community members
  - Trust request cards with user info, join date, optional intro message
  - One-click "Trust This User" buttons
  - Trust status indicators and fulfillment tracking
- **Deliverable**: Community members can easily discover and trust newcomers

### WP4.3: Trust Action Implementation
- **Tasks**:
  - Implement `avatar.trust(targetSafeAddress)` via Porto wallet
  - Handle trust transaction confirmation and error states
  - Auto-update trust request status after successful trusts
  - Add reciprocal trust suggestions and workflows
- **Deliverable**: Seamless trust building within the community context

### WP4.4: Trust Network Visualization
- **Tasks**:
  - Display user's trust connections (who they trust / who trusts them)
  - Community trust graph overview for admins
  - Trust path discovery for understanding transitive connections
  - Integration with existing Curia user profiles
- **Deliverable**: Clear visibility into community trust relationships

---

## Phase 5: Organizational Structures

**Goal**: Enable communities to create and manage Circles organizations and groups.

### WP5.1: Community Organizations
- **Tasks**:
  - Database schema: `circles_organizations` table
  - Admin UI for creating community Circles organizations
  - Implement `sdk.registerOrganization()` via admin Porto wallet
  - Organization Safe management and multi-owner configuration
- **Deliverable**: Communities have official Circles organizational identities

### WP5.2: Groups and Sub-Communities  
- **Tasks**:
  - Database schema: `circles_groups` table linked to organizations
  - Group creation UI with custom names, symbols, descriptions
  - Implement `sdk.registerGroupV2()` with mint policies
  - Group membership management (trust-based or explicit)
- **Deliverable**: Communities can create project groups and specialized circles

### WP5.3: Treasury and Fee Management
- **Tasks**:
  - Organization Safe as community treasury
  - Configurable fee percentages for community funding
  - Transfer routing through organization for fee collection
  - Treasury balance tracking and spending transparency
- **Deliverable**: Sustainable community funding mechanisms

---

## Phase 6: Real-Time Data Layer

**Goal**: Provide smooth, real-time Circles experience through intelligent caching.

### WP6.1: Circles Data Caching
- **Tasks**:
  - Cache trust relationships in `circles_trust_relations` table
  - Balance caching system for users, orgs, groups
  - Event subscription or polling for Circles Hub events
  - Address-to-user mapping for UI display
- **Deliverable**: Fast, responsive UI with minimal blockchain queries

### WP6.2: Real-Time Updates
- **Tasks**:
  - WebSocket or Server-Sent Events for live updates
  - Trust action notifications and status changes
  - Balance update streaming
  - Activity feed for community Circles events
- **Deliverable**: Live, social experience of community economy

### WP6.3: Advanced UI Features
- **Tasks**:
  - Inline trust actions throughout Curia (posts, comments, profiles)
  - Organization/group hierarchy visualization
  - Member onboarding progress tracking
  - Community activity dashboard for admins
- **Deliverable**: Circles functionality seamlessly integrated throughout Curia

---

## Phase 7: Economic Features (Future)

**Goal**: Enable rich economic interactions within Curia discussions.

### WP7.1: Content Monetization
- **Tasks**:
  - Tip buttons on posts and comments
  - Bounty system for questions and issues
  - Content creator revenue sharing
  - Quality signal through micro-payments
- **Deliverable**: Economic incentives for valuable contributions

### WP7.2: Community Commerce
- **Tasks**:
  - Marketplace integration for community members
  - Service exchange using Circles currencies
  - Project funding through group tokens
  - Local business integration
- **Deliverable**: Complete community economy platform

---

## Technical Architecture Evolution

### Current (Phase 1)
```
Curia Frontend ← MetaMask → Circles SDK → Gnosis Chain
       ↓
   PostgreSQL (basic identity linking)
```

### Target (Phase 6+)
```
Curia Frontend ← Porto Wallet → Circles SDK → Gnosis Chain
       ↓                              ↑
   PostgreSQL ← Real-time sync ←─────────┘
   (complete Circles mirror)
       ↓
   WebSocket/SSE → Real-time UI updates
```

## Key Dependencies & Considerations

### External Dependencies
- **Porto SDK**: In-browser wallet creation and management
- **Circles SDK v0.27.3+**: Organization and group creation capabilities  
- **Gnosis Chain**: Target blockchain for all Circles operations
- **Common Ground**: Host platform integration and user identity

### Security Considerations
- Encrypted private key storage with user passwords
- Backup phrase generation and secure storage guidance
- Future WebAuthn/passkey integration readiness
- Safe multi-sig configurations for organizational accounts

### Performance Considerations
- Efficient Circles data caching to minimize RPC calls
- Indexed database queries for trust relationships
- WebSocket management for real-time features
- Lazy loading for complex trust graph visualizations

## Success Metrics

### Phase 2-3 (Foundation)
- % of users who successfully create Porto wallets
- Circles signup completion rate within plugin
- User satisfaction with extensionless experience

### Phase 4-5 (Community)
- Trust request fulfillment rate and time-to-trust
- Number of active trust relationships per community
- Organizational and group adoption rates

### Phase 6-7 (Economy)
- Transaction volume within community economies
- Content monetization engagement rates
- Community treasury growth and utilization

---

**Next Steps**: Begin Phase 2 by researching Porto SDK integration patterns and updating our current MetaMask-based wallet connection to support extensionless wallet creation. 