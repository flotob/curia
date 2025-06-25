# Universal Profile Gating Implementation

## Overview

This implementation enables LUKSO Universal Profile-based post gating for comment access control. Users must prove ownership of a Universal Profile and meet specific requirements (LYX balance, token ownership) to comment on gated posts.

## Architecture

### Core Components

1. **Challenge-Response Flow**: Secure nonce-based authentication
2. **ERC-1271 Signature Verification**: Contract-based signature validation
3. **Asset Verification**: LYX balance and token ownership checks
4. **Raw RPC Implementation**: Direct blockchain calls bypassing ethers.js limitations

## Technical Challenges & Solutions

### Challenge 1: Next.js + Ethers.js Compatibility

**Problem**: Ethers.js v5 sets HTTP headers (`referrer: "client"`) that cause runtime errors in Next.js serverless environments:
```
TypeError: Referrer "client" is not a valid URL
```

**Solution**: Implemented raw `fetch()` calls for all RPC operations, bypassing ethers.js HTTP stack while preserving utility functions.

### Challenge 2: LUKSO Network Detection

**Problem**: Ethers.js auto-detection fails for LUKSO mainnet (Chain ID 42) in serverless contexts:
```
Error: could not detect network (event="noNetwork", code=NETWORK_ERROR)
```

**Solution**: Used `StaticJsonRpcProvider` with explicit network configuration and eliminated `getNetwork()` calls.

### Challenge 3: Contract Call Encoding

**Problem**: `ethers.Contract` failed due to HTTP issues, requiring manual ABI encoding.

**Solution**: Hand-coded ABI encoding for `isValidSignature(bytes32,bytes)`:

```typescript
// Manual ERC-1271 call encoding
const functionSelector = '0x1626ba7e'; // isValidSignature(bytes32,bytes)
const hashParam = messageHash.slice(2).padStart(64, '0');
const signatureOffset = '0000000000000000000000000000000000000000000000000000000000000040';
const signatureLength = (signature.slice(2).length / 2).toString(16).padStart(64, '0');
const signatureData = signature.slice(2).padEnd(Math.ceil(signature.slice(2).length / 64) * 64, '0');
const callData = functionSelector + hashParam + signatureOffset + signatureLength + signatureData;
```

## Implementation Details

### Security Features

- **One-time Nonces**: Prevents replay attacks
- **5-minute Challenge Expiry**: Limits signature validity window
- **Challenge Binding**: Signatures tied to specific posts and profiles
- **Backend Verification**: All checks performed server-side

### Performance Optimizations

- **RPC Fallbacks**: Multiple LUKSO endpoints with automatic failover
- **Parallel Verification**: Balance and signature checks can run concurrently
- **Efficient Encoding**: Manual ABI encoding reduces overhead

### RPC Configuration

```typescript
const LUKSO_RPC_URLS = [
  'https://rpc.mainnet.lukso.network',    // Official LUKSO RPC
  'https://42.rpc.thirdweb.com'           // Thirdweb by Chain ID
];
```

## API Endpoints

### POST `/api/posts/[postId]/challenge`
Generates verification challenge for Universal Profile.

**Response**:
```json
{
  "challenge": {
    "nonce": "abc123...",
    "upAddress": "0x...",
    "postId": 123,
    "message": "LUKSO DApp Comment Challenge...",
    "expiresAt": "2025-06-04T12:05:00Z"
  }
}
```

### POST `/api/posts/[postId]/comments`
Creates comment with UP verification.

**Request**:
```json
{
  "content": "Comment text",
  "challenge": {
    "nonce": "abc123...",
    "upAddress": "0x...",
    "postId": 123,
    "signature": "0x..."
  }
}
```

## Verification Flow

1. **Challenge Generation**: Server creates unique nonce and challenge message
2. **User Signing**: Frontend prompts UP to sign challenge via browser extension
3. **Signature Verification**: Server validates signature using ERC-1271
4. **Asset Verification**: Server checks LYX balance requirements
5. **Comment Creation**: Successful verification allows comment posting

## Error Handling

### User-Friendly Messages

- **Invalid Signature**: "Signature verification failed - invalid signature for this Universal Profile"
- **Insufficient Balance**: "Insufficient LYX balance. Required: 1.0 LYX, Current: 0.5 LYX"
- **Network Issues**: "Network verification failed. Please check your connection and try again."

### Fallback Strategy

1. Try primary RPC endpoint
2. Automatic failover to backup endpoints
3. Clear error reporting for debugging

## Future Enhancements

### Phase 2: LSP7/LSP8 Token Support
- Fungible token (LSP7) balance verification
- NFT (LSP8) ownership checks
- LSP5-ReceivedAssets optimization

### Phase 3: Performance Optimizations
- Response caching (30-60 seconds)
- Multicall batching for multiple asset checks
- Background health monitoring

## Development Notes

### Testing
```bash
# Test RPC connectivity
curl -X POST https://rpc.mainnet.lukso.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

### Debugging
- Enable detailed logging with `[rawLuksoCall]` prefixes
- Monitor RPC response times
- Validate challenge format and nonce usage

### Deployment Considerations
- Ensure `runtime = 'nodejs'` in API route files
- Configure multiple RPC endpoints for redundancy
- Monitor LUKSO network status and RPC health

## References

- [LUKSO Documentation](https://docs.lukso.tech/)
- [Universal Profiles](https://docs.lukso.tech/learn/universal-profile/introduction/)
- [ERC-1271 Standard](https://eips.ethereum.org/EIPS/eip-1271)
- [LSP Standards](https://docs.lukso.tech/standards/introduction) 