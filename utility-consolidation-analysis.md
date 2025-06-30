# Utility Function Consolidation Analysis

## Executive Summary

After examining utility functions across `src/lib/` and `src/utils/`, I found significant duplication and opportunities for consolidation. This analysis identifies 4 main categories of issues:

1. **Time/Date Formatting Functions** - 5+ different implementations of similar functionality
2. **Address & Currency Formatting** - Multiple duplicated formatters across components  
3. **Validation Logic** - Repeated validation patterns that could be centralized
4. **Configuration Objects** - Scattered ABIs and interface definitions

## 1. Time/Date Formatting Duplication

### 🔴 Issue: Multiple Time Formatting Implementations

**Locations with similar time formatting logic:**

1. **`src/utils/timeUtils.tsx`** - React hook with hydration-safe time formatting
2. **`src/utils/dateUtils.ts`** - Functions for user visit time formatting
3. **`src/utils/metadataUtils.ts`** - `formatRelativeTime()` function
4. **`src/components/gating/RichCategoryHeader.tsx`** - `formatRelativeTime()` and `formatTimeRemaining()`
5. **`src/components/presence/MultiCommunityPresenceSidebar.tsx`** - `formatTimeAgo()` function
6. **`src/components/presence/EnhancedOnlineUsersSidebar.tsx`** - Duplicate `formatTimeAgo()` function
7. **`src/components/boards/BoardAccessStatus.tsx`** - `formatTimeRemaining()` function

### 🔍 Analysis of Implementations:

```javascript
// timeUtils.tsx - Most comprehensive
const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
if (interval > 1) return Math.floor(interval) + " years ago";

// dateUtils.ts - Similar but different output format  
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
return `Last visit: ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

// metadataUtils.ts - Simplified version
if (diffInHours < 1) return 'just now';
else if (diffInHours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

// RichCategoryHeader.tsx - Yet another implementation
if (diffMins < 1) return 'just now';
if (diffMins < 60) return `${diffMins}m ago`;
```

### ✅ Consolidation Recommendation:

Create `src/utils/timeFormatting.ts` with:
- `formatRelativeTime(date: Date | string, style?: 'short' | 'long')` 
- `formatTimeRemaining(futureDate: Date | string)`
- `useHydrationSafeTime(date: string)` React hook

## 2. Address & Currency Formatting Duplication

### 🔴 Issue: Repeated Formatting Logic

**Address formatting appears in 7+ files:**

1. `src/components/gating/RichCategoryHeader.tsx` - `formatAddress()`
2. `src/components/gating/RichRequirementsDisplay.tsx` - `formatAddress()`
3. `src/components/comment/InlineUPConnection.tsx` - `formatAddress()`
4. `src/components/ethereum/EthereumRichRequirementsDisplay.tsx` - `formatAddress()`
5. `src/components/universal-profile/UPConnectionButton.tsx` - `formatAddress()`

**Currency formatting scattered across 10+ files:**

1. `formatETH()` in multiple components using `ethers.utils.formatEther()`
2. `formatLYX()` in multiple components using the same logic
3. `src/lib/requirements/conversions.ts` - Centralized but not used everywhere

### 🔍 Current Duplication:

```javascript
// Repeated in multiple files:
const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatETH = (weiAmount: string): string => {
  return formatEther(BigInt(weiAmount));
};

// But conversions.ts already has:
export const formatWeiToEth = (weiAmount: string): string => {
  return ethers.utils.formatEther(weiAmount);
};
```

### ✅ Consolidation Recommendation:

Extend `src/lib/requirements/conversions.ts` to include:
- `formatAddress(address: string, short?: boolean)`
- Ensure all components import from this central location
- Add display helpers like `formatDisplayAmount()` with locale-aware formatting

## 3. Validation Logic Duplication

### 🔴 Issue: Address Validation Scattered

**Multiple implementations of Ethereum address validation:**

1. **`src/lib/ensResolution.ts`** - `isValidEthereumAddress()`
2. **`src/lib/requirements/validation.ts`** - `isValidEthereumAddress()` 

```javascript
// ensResolution.ts
export const isValidEthereumAddress = (input: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
};

// requirements/validation.ts  
export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};
```

### ✅ Consolidation Recommendation:

- Centralize all validation in `src/lib/requirements/validation.ts`
- Remove duplicate from `ensResolution.ts` and import instead
- Add comprehensive validation utilities for all blockchain-related inputs

## 4. Configuration Objects Duplication

### 🔴 Issue: Scattered ABI Definitions

**Multiple ABI definitions for same contracts:**

1. **ERC20 ABI** appears in:
   - `src/components/locks/configurators/ERC20TokenConfigurator.tsx`
   - `src/lib/ethereum/verification.ts` 
   - `src/app/api/ethereum/get-balances/route.ts`

2. **ERC721 ABI** appears in:
   - `src/components/locks/configurators/ERC721NFTConfigurator.tsx`
   - `src/lib/ethereum/verification.ts`

3. **LSP26 ABI** appears in:
   - `src/lib/lsp26.ts`
   - `src/lib/verification/upVerification.ts`
   - `src/lib/lsp26/lsp26Registry.ts`

4. **Interface IDs** scattered across:
   - `src/lib/verification/tokenABIs.ts` - `LUKSO_INTERFACE_IDS`
   - `src/lib/requirements/validation.ts` - `LUKSO_INTERFACE_IDS` + `ERC_INTERFACE_IDS`

### 🔍 Current Issues:

```javascript
// Multiple ERC20 ABI definitions:
// In ERC20TokenConfigurator.tsx:
const ERC20_ABI = [
  { name: "balanceOf", ... },
  { name: "name", ... },
  { name: "symbol", ... },
  { name: "decimals", ... }
];

// In ethereum/verification.ts:  
const ERC20_ABI = [
  { name: "balanceOf", ... },
  { name: "name", ... }, 
  { name: "symbol", ... },
  { name: "decimals", ... }
];
```

### ✅ Consolidation Recommendation:

Create `src/lib/blockchain/abis.ts` with:
- All standard ABIs (ERC20, ERC721, ERC1155, LSP7, LSP8, LSP26)
- All interface IDs in one location
- Export as const assertions for type safety

## 5. Authentication Utilities

### 🔴 Minor Issue: Auth Pattern Usage

**Current state:** `src/utils/authFetch.ts` provides good centralized auth utilities, but some components still manually handle auth headers.

### ✅ Recommendation:
- Audit components to ensure consistent `authFetch`/`authFetchJson` usage
- Consider adding auth utilities to React Query hooks

## Proposed File Structure

```
src/
├── lib/
│   ├── blockchain/
│   │   ├── abis.ts           # 🆕 All contract ABIs
│   │   ├── interfaces.ts     # 🆕 All interface IDs  
│   │   └── constants.ts      # 🆕 Network configs, etc.
│   └── requirements/
│       ├── validation.ts     # ✅ Already exists, centralize more
│       └── conversions.ts    # ✅ Already exists, use everywhere
└── utils/
    ├── formatting/
    │   ├── time.ts          # 🆕 Centralized time formatting
    │   ├── addresses.ts     # 🆕 Address display utilities  
    │   └── currency.ts      # 🆕 Currency display utilities
    ├── authFetch.ts         # ✅ Already centralized
    └── ...existing files
```

## Implementation Priority

### Phase 1: High Impact (Address immediately)
1. **Time formatting consolidation** - Affects 7+ components, user-facing
2. **Address/currency formatting** - Affects 10+ components, consistency issues

### Phase 2: Medium Impact (Next sprint) 
3. **ABI consolidation** - Developer experience, maintainability
4. **Validation centralization** - Code quality, reduce bugs

### Phase 3: Low Impact (Technical debt)
5. **Auth pattern standardization** - Already mostly centralized

## Estimated Impact

- **Lines of code reduction:** ~200-300 lines
- **Maintenance burden reduction:** Significant (single source of truth)
- **Consistency improvement:** Major (standardized formatting across app)
- **Type safety improvement:** Better with centralized const assertions
- **Developer experience:** Much better with clear utility locations

## Breaking Changes

- Components importing duplicate utilities will need imports updated
- Some formatting outputs may change slightly (should be improvements)
- Recommend comprehensive testing of time formatting edge cases