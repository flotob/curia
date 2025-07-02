# Universal Profile Name Resolution Enhancement for Tipping

## Overview

This enhancement expands the tipping feature to support Universal Profile name resolution, allowing users with UP handles (like `feindura#WSu4`) to be eligible for tipping even if they haven't previously verified their UP address in our system.

## Problem Solved

**Before**: Users could only receive tips if they had a verified UP address stored in our database through either:
1. Common Ground profile settings (`users.settings.lukso.address`)
2. Legacy lock verification data (`pre_verifications` table)

**After**: Users can now receive tips if they have a UP handle that can be resolved to an address using LUKSO's Envio indexer, significantly expanding tipping eligibility.

## Implementation

### 1. UP Name Resolution Utility (`src/lib/upNameResolution.ts`)

A new utility library that provides:
- **Handle parsing**: Validates UP handles (e.g., `feindura#WSu4`)
- **Address resolution**: Uses UniversalEverything API to resolve handles to addresses
- **Profile fetching**: Gets complete UP profile data including metadata
- **Smart search**: Handles both UP handles and addresses

Key functions:
```typescript
parseUPHandle(handle: string): { name: string; suffix: string } | null
resolveUPHandleToAddress(handle: string): Promise<string | null>
getUPProfile(handle: string): Promise<UPProfile | null>
smartUPSearch(query: string): Promise<UPProfile | null>
```

### 2. Enhanced Tipping Eligibility API

The tipping eligibility check now includes a third method:

**Method 1**: Common Ground profile data (existing)
**Method 2**: Legacy lock verification data (existing)  
**Method 3**: UP name resolution (new)

The new method:
1. Checks if user has a UP username but no address in settings
2. Validates the username is a proper UP handle format (`name#suffix`)
3. Queries the UniversalEverything API for address resolution
4. Returns eligibility with `source: 'up_name_resolution'`
5. Optionally stores the resolved address for future use

### 3. Source Tracking

The `TippingEligibilityResponse` now includes a `source` field:
```typescript
interface TippingEligibilityResponse {
  userId: string;
  eligible: boolean;
  upAddress?: string;
  verifiedAt?: string;
  source?: 'common_ground_profile' | 'lock_verification' | 'up_name_resolution';
  reason?: string;
  timestamp: string;
}
```

## Security & Performance

### External API Usage
- Uses UniversalEverything's public API (backed by LUKSO Envio indexer)
- Protected by existing `withAuth` middleware - only authenticated users can trigger lookups
- Graceful error handling with fallbacks

### Caching Strategy
- Resolved addresses are optionally stored in `users.settings.lukso.address`
- Future requests use cached address (Method 1) instead of external lookup
- Reduces API calls while providing fresh data for new users

### Input Validation
- Strict UP handle format validation (`name#suffix` with 4-character alphanumeric suffix)
- Address format validation (0x + 40 hex characters)
- Only exact matches are performed - no fuzzy searches

## Usage Examples

### Successful Resolution
```typescript
// User has username "feindura#WSu4" but no stored address
// API resolves to "0x1234...5678" and returns:
{
  userId: "user123",
  eligible: true,
  upAddress: "0x1234...5678",
  verifiedAt: "2025-01-01T10:00:00Z",
  source: "up_name_resolution",
  timestamp: "2025-01-01T10:00:00Z"
}
```

### Resolution Failure
```typescript
// User has invalid handle or handle doesn't exist
// Falls back to existing behavior:
{
  userId: "user123", 
  eligible: false,
  reason: "No verified LUKSO Universal Profile address found",
  timestamp: "2025-01-01T10:00:00Z"
}
```

## Benefits

1. **Expanded Tipping Eligibility**: Users with UP handles become tip-eligible automatically
2. **Improved User Experience**: No manual verification required for users with public UP names
3. **Social Discovery**: Leverages LUKSO's ecosystem infrastructure for user identification
4. **Backward Compatibility**: Existing verification methods continue to work unchanged
5. **Performance Optimization**: Resolved addresses are cached for future use

## Frontend Impact

**No frontend changes required!** The existing `useTippingEligibility` hook and `UserProfilePopover` component automatically benefit from the enhanced backend logic. The tip button will now appear for many more users without any UI modifications.

## Integration Details

### API Endpoint
`GET /api/users/[userId]/tipping-eligibility`

### Dependencies
- `@/lib/upNameResolution` - New UP resolution utility
- UniversalEverything API (`https://universaleverything.io/api/profiles/search`)
- Existing authentication and database infrastructure

### Error Handling
- Network failures gracefully degrade to existing behavior
- Invalid handles are safely ignored
- Database update failures don't prevent tip eligibility
- Comprehensive logging for debugging

## Future Enhancements

1. **Direct Envio GraphQL**: Could bypass UniversalEverything and query LUKSO Envio directly
2. **Background Sync**: Periodically resolve handles for all users with UP usernames
3. **Handle Discovery**: Suggest UP handles based on user names during profile setup
4. **Rate Limiting**: Add request throttling for high-volume scenarios

This enhancement represents a significant improvement to the tipping system's accessibility while maintaining security and performance standards.