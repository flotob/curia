# Dual Compatibility Migration Guide

**Making Your Common Ground Plugin Compatible with Standalone Hosting**

This guide helps you migrate your existing Common Ground (CG) plugin to support both the original CG ecosystem and the new standalone hosting infrastructure, allowing your plugin to work in both environments seamlessly.

## Overview

The new `@curia_` libraries provide drop-in replacements for Common Ground's client and host libraries, enabling your plugin to run on independent host applications while maintaining full backward compatibility with the original CG system.

### Key Benefits
- **Dual Compatibility**: Same codebase works with both CG and standalone hosts
- **Zero Breaking Changes**: Existing CG functionality remains unchanged
- **Enhanced Distribution**: Reach users on multiple hosting platforms
- **Future-Proof**: Prepare for ecosystem evolution

## Architecture Approach

### Detection Strategy
The recommended approach uses URL parameters to detect the hosting environment:

```
# Common Ground hosting
https://your-plugin.com/?iframeUID=abc123

# Standalone hosting  
https://your-plugin.com/?iframeUID=abc123&mod=standalone
```

When `mod=standalone` is present, your plugin should use the new `@curia_` libraries. Otherwise, fall back to the original CG libraries.

## Package Installation

### 1. Install New Libraries

```bash
npm install @curia_/cg-plugin-lib @curia_/cg-plugin-lib-host
# or
yarn add @curia_/cg-plugin-lib @curia_/cg-plugin-lib-host
```

### 2. Keep Existing CG Dependencies

Don't remove your existing CG dependencies - you'll need both:

```json
{
  "dependencies": {
    "@commonground/plugin-lib": "^x.x.x",
    "@commonground/plugin-lib-host": "^x.x.x",
    "@curia_/cg-plugin-lib": "^1.0.0",
    "@curia_/cg-plugin-lib-host": "^1.0.0"
  }
}
```

## Code Implementation

### Client-Side Detection and Loading

Create a dynamic import system that chooses the appropriate library:

```typescript
// lib/pluginClient.ts
import { URLSearchParams } from 'url';

interface PluginClient {
  myInfo: () => Promise<any>;
  // ... other methods
}

class DualPluginClient {
  private client: PluginClient | null = null;
  private isStandalone: boolean;

  constructor() {
    // Detect hosting environment
    const urlParams = new URLSearchParams(window.location.search);
    this.isStandalone = urlParams.get('mod') === 'standalone';
  }

  async initialize(): Promise<PluginClient> {
    if (this.client) return this.client;

    if (this.isStandalone) {
      // Use new standalone libraries
      const { PluginClient } = await import('@curia_/cg-plugin-lib');
      this.client = new PluginClient();
    } else {
      // Use original CG libraries
      const { PluginClient } = await import('@commonground/plugin-lib');
      this.client = new PluginClient();
    }

    return this.client;
  }

  async myInfo() {
    const client = await this.initialize();
    return client.myInfo();
  }

  // Proxy other methods similarly...
}

export const pluginClient = new DualPluginClient();
```

### Server-Side Environment Detection

For Next.js API routes, detect the hosting mode and use appropriate signing:

```typescript
// pages/api/sign/route.ts or app/api/sign/route.ts
import { NextRequest, NextResponse } from 'next/server';

async function getHostLibrary(request: NextRequest) {
  // Check if this is a standalone hosting request
  const referer = request.headers.get('referer') || '';
  const isStandalone = referer.includes('mod=standalone');

  if (isStandalone) {
    const { signRequest } = await import('@curia_/cg-plugin-lib-host');
    return { signRequest, keyPrefix: 'STANDALONE_' };
  } else {
    const { signRequest } = await import('@commonground/plugin-lib-host');
    return { signRequest, keyPrefix: 'CG_' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { signRequest, keyPrefix } = await getHostLibrary(request);
    
    // Use environment variables with appropriate prefix
    const privateKey = process.env[`${keyPrefix}PRIVATE_KEY`];
    const keyId = process.env[`${keyPrefix}KEY_ID`];
    
    const body = await request.json();
    const result = await signRequest(body, { privateKey, keyId });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Signing failed' }, { status: 500 });
  }
}
```

## Environment Variable Management

### Dual Key Strategy

Since both libraries expect the same environment variable names, use prefixed variables:

```bash
# .env.local

# Common Ground keys
CG_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...your-cg-key...\n-----END PRIVATE KEY-----"
CG_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIj...your-cg-key...\n-----END PUBLIC KEY-----"
CG_KEY_ID="your-cg-key-id"

# Standalone keys  
STANDALONE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...your-standalone-key...\n-----END PRIVATE KEY-----"
STANDALONE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIj...your-standalone-key...\n-----END PUBLIC KEY-----"
STANDALONE_KEY_ID="your-standalone-key-id"
```

### Environment Configuration Helper

Create a utility to manage environment switching:

```typescript
// lib/config.ts
export function getEnvironmentConfig() {
  const urlParams = new URLSearchParams(window.location.search);
  const isStandalone = urlParams.get('mod') === 'standalone';
  
  return {
    isStandalone,
    keyPrefix: isStandalone ? 'STANDALONE_' : 'CG_',
    environment: isStandalone ? 'standalone' : 'common-ground'
  };
}

// Usage in API routes
export function getServerConfig(request: NextRequest) {
  const referer = request.headers.get('referer') || '';
  const isStandalone = referer.includes('mod=standalone');
  
  return {
    isStandalone,
    privateKey: process.env[isStandalone ? 'STANDALONE_PRIVATE_KEY' : 'CG_PRIVATE_KEY'],
    publicKey: process.env[isStandalone ? 'STANDALONE_PUBLIC_KEY' : 'CG_PUBLIC_KEY'],
    keyId: process.env[isStandalone ? 'STANDALONE_KEY_ID' : 'CG_KEY_ID'],
  };
}
```

## Host Application Considerations

### URL Parameter Injection

Host applications using the new libraries should inject the `mod=standalone` parameter:

```typescript
// Host app iframe setup
const iframeUrl = new URL(pluginUrl);
iframeUrl.searchParams.set('iframeUID', generateUID());
iframeUrl.searchParams.set('mod', 'standalone'); // Signal standalone mode

iframe.src = iframeUrl.toString();
```

### Key Management on Host Side

Host applications need to manage their own keypairs separately from CG:

```typescript
// Host app configuration
const hostConfig = {
  // These are YOUR standalone host keys, not CG keys
  privateKey: process.env.HOST_PRIVATE_KEY,
  publicKey: process.env.HOST_PUBLIC_KEY,
  keyId: process.env.HOST_KEY_ID,
  
  // Plugin verification keys (distributed to plugins)
  pluginVerificationKey: process.env.PLUGIN_VERIFICATION_KEY,
};
```

### Communication Protocol

The host should establish clear communication about the hosting mode:

```typescript
// Host app postMessage setup
const setupMessage = {
  type: 'HOSTING_MODE',
  mode: 'standalone',
  hostInfo: {
    name: 'Your Host Platform',
    version: '1.0.0',
    capabilities: ['signing', 'user-info', 'data-access']
  }
};

iframe.contentWindow?.postMessage(setupMessage, '*');
```

## Testing Strategy

### Local Development Setup

1. **Dual Environment Testing**:
   ```bash
   # Test with CG mode (default)
   npm run dev
   # Visit: http://localhost:3000
   
   # Test with standalone mode
   # Visit: http://localhost:3000?mod=standalone
   ```

2. **Key Validation**:
   ```typescript
   // Add debug endpoint to verify key loading
   // pages/api/debug/keys.ts
   export default function handler(req, res) {
     const { keyPrefix } = getServerConfig(req);
     res.json({
       hasPrivateKey: !!process.env[`${keyPrefix}PRIVATE_KEY`],
       hasPublicKey: !!process.env[`${keyPrefix}PUBLIC_KEY`],
       keyId: process.env[`${keyPrefix}KEY_ID`],
       environment: keyPrefix === 'STANDALONE_' ? 'standalone' : 'cg'
     });
   }
   ```

## Migration Checklist

- [ ] Install `@curia_` packages alongside existing CG dependencies
- [ ] Implement dynamic library loading based on `mod` parameter
- [ ] Set up dual environment variables with prefixes
- [ ] Create configuration utilities for environment detection
- [ ] Update API routes to support both signing methods
- [ ] Test plugin in both CG and standalone modes
- [ ] Verify postMessage communication works in both environments
- [ ] Document deployment requirements for both key sets

## Best Practices

### 1. Graceful Fallbacks
Always provide fallbacks for missing libraries or configurations:

```typescript
try {
  const client = await this.initialize();
  return await client.myInfo();
} catch (error) {
  console.warn('Primary library failed, attempting fallback:', error);
  // Fallback logic here
}
```

### 2. Clear Logging
Add environment detection logging for debugging:

```typescript
console.log(`Plugin initialized in ${isStandalone ? 'standalone' : 'CG'} mode`);
```

### 3. Feature Detection
Some features might only be available in one environment:

```typescript
const features = {
  advancedAuth: isStandalone,
  legacyData: !isStandalone,
  // ... other feature flags
};
```

## Troubleshooting

### Common Issues

1. **Wrong Keys Being Used**: Check URL parameters and environment variable prefixes
2. **Library Import Errors**: Ensure both library sets are properly installed
3. **Signing Failures**: Verify correct key format (PEM with headers)
4. **PostMessage Conflicts**: Use unique message types for each environment

### Debug Tools

```typescript
// Add to your plugin for debugging
window.pluginDebug = {
  mode: isStandalone ? 'standalone' : 'cg',
  hasKeys: !!process.env[`${keyPrefix}PRIVATE_KEY`],
  url: window.location.href,
  libraries: {
    cg: !!window.require?.resolve?.('@commonground/plugin-lib'),
    standalone: !!window.require?.resolve?.('@curia_/cg-plugin-lib')
  }
};
```

## Future Considerations

### Library Evolution
Both library ecosystems may evolve independently. Consider:
- Version pinning strategies
- Breaking change migration paths
- Feature parity maintenance

### Community Governance
As the standalone ecosystem grows:
- Establish plugin certification processes
- Create compatibility testing frameworks
- Build community feedback mechanisms

## Support

For issues related to:
- **CG Libraries**: Contact Common Ground support
- **Standalone Libraries**: Check [@curia_ organization on npm](https://www.npmjs.com/org/curia_)
- **Migration Questions**: Review this guide and test thoroughly

Remember: The goal is seamless dual compatibility - your users shouldn't know or care which hosting environment they're using. 