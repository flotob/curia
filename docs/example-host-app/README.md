# Host Application

A complete **plugin hosting environment** that allows you to embed and test Common Ground plugins in a secure iframe-based sandbox. This application demonstrates how to integrate our drop-in replacement libraries and provides a full testing environment for plugin development.

## 🎯 Purpose

This host application serves as:

1. **Testing Environment**: Load and test Common Ground plugins locally
2. **Integration Demo**: See how to integrate the `@common-ground-dao/cg-plugin-lib` system
3. **Development Tool**: Debug plugin communication and API calls
4. **Reference Implementation**: Clean example of secure plugin hosting

## 🚀 Quick Start

### Prerequisites: Plugin Key Setup

**IMPORTANT**: Before testing with the sample plugin, you need to set up cryptographic keys.

#### Option 1: Generate Fresh Keys (Recommended)

```bash
# Navigate to the host library directory
cd packages/cg-plugin-lib-host

# Generate new keys
node -e "const { CgPluginLibHost } = require('./dist/index.js'); CgPluginLibHost.generateKeyPair().then(keys => { console.log('Copy these to docs/CGSamplePluginVanilla/.env:'); console.log(''); console.log('NEXT_PUBLIC_PUBKEY=' + keys.publicKey); console.log('NEXT_PRIVATE_PRIVKEY=' + keys.privateKey); });"
```

#### Option 2: Use Development Keys

Create `docs/CGSamplePluginVanilla/.env` with these development keys:

```bash
# Safe for local development and testing
NEXT_PUBLIC_PUBKEY=MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEQYMbIgMTgsT/BX501bq6xb2Xl0q3Q2+KII7H73cHOPbZrPs+fezrS8QDMfSeZCNjbvVHiGw2v3BriGA8UsMfJg==
NEXT_PRIVATE_PRIVKEY=MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgifqjuK1szsQ3I114L4aeIjW5rJqbYrDIuI/fY7grIL+hRANCAARBgxsiAxOCxP8FfnTVurrFvZeXSrdDb4ogjsfvdwc49tms+z597OtLxAMx9J5kI2Nu9UeIbDa/cGuIYDxSwx8m
```

#### Create the .env File

```bash
# Navigate to the sample plugin directory
cd docs/CGSamplePluginVanilla

# Create the .env file
touch .env

# Add the keys (copy-paste from above)
# NEXT_PUBLIC_PUBKEY=...
# NEXT_PRIVATE_PRIVKEY=...
```

**Why These Keys Are Needed:**
- **Public Key**: Host validates that plugin requests are authentic
- **Private Key**: Plugin signs its API requests cryptographically
- **Security**: Creates end-to-end security between plugin and host

### Development Server

```bash
# Install dependencies
yarn install

# Start the development server
yarn dev

# Open http://localhost:3000 in your browser
```

### Building for Production

```bash
# Build the application
yarn build

# Preview the build
yarn preview
```

## 🔧 Using the Host Application

### 1. Loading Plugins

1. **Open the application** at `http://localhost:3000`
2. **Select a plugin** from the dropdown:
   - "CG Sample Plugin (Local)" - loads from `http://localhost:5000`
   - "Custom URL" - allows you to enter any plugin URL
3. **Click "Load Plugin"** to embed the plugin in an iframe
4. **Interact with the plugin** and watch the communication logs

### 2. Testing Plugin APIs

Once a plugin is loaded, you can:

- **View Real-time Logs**: See all postMessage communication
- **Test API Calls**: Watch `getUserInfo()`, `getCommunityInfo()`, etc.
- **Inspect Responses**: See the mock data being returned
- **Debug Issues**: Identify communication or signing problems

### 3. Development Workflow

```bash
# Terminal 1: Start the host application
cd packages/host-app
yarn dev

# Terminal 2: Start a test plugin (e.g., the CG sample)
cd docs/CGSamplePluginVanilla
yarn dev

# Load the plugin in the host application UI
```

## 🏗️ Architecture

### Core Components

```
Host Application
├── PluginHost          # Manages iframe embedding and communication
├── MockDataProvider    # Provides realistic test data
├── UI Components       # React-based interface
└── Event Logging       # Real-time communication monitoring
```

### Communication Flow

```
Host Application UI
    ↓
PluginHost.loadPlugin()
    ↓
Create iframe with security sandbox
    ↓
Plugin loads and calls CgPluginLib.initialize()
    ↓
postMessage: plugin requests API data
    ↓
PluginHost validates signature & responds
    ↓
Plugin receives and displays data
```

## 🔌 Integration Guide

### Basic Plugin Hosting

```typescript
import { PluginHost } from './PluginHost';
import { MockDataProvider } from './MockDataProvider';

// Create data provider with mock data
const dataProvider = new MockDataProvider();

// Create plugin host
const pluginHost = new PluginHost(dataProvider);

// Load a plugin
await pluginHost.loadPlugin({
  url: 'https://your-plugin-url.com',
  width: '100%',
  height: '600px',
  allowedOrigins: ['https://your-plugin-url.com']
});

// Listen for events
pluginHost.on('plugin-loaded', (data) => {
  console.log('Plugin loaded:', data.url);
});

pluginHost.on('api-request', (data) => {
  console.log('API request:', data.method, data.params);
});

pluginHost.on('api-response', (data) => {
  console.log('API response:', data.method, data.response);
});
```

### Custom Data Provider

Replace `MockDataProvider` with your own data source:

```typescript
interface DataProvider {
  getUserInfo(): Promise<UserInfoResponsePayload>;
  getCommunityInfo(): Promise<CommunityInfoResponsePayload>;
  getUserFriends(limit: number, offset: number): Promise<UserFriendsResponsePayload>;
  giveRole(roleId: string, userId: string): Promise<void>;
}

class MyDataProvider implements DataProvider {
  async getUserInfo() {
    // Fetch from your database/API
    return await this.api.get('/user/current');
  }

  async getCommunityInfo() {
    // Fetch from your database/API
    return await this.api.get('/community/current');
  }

  // ... implement other methods
}

const dataProvider = new MyDataProvider();
const pluginHost = new PluginHost(dataProvider);
```

## 🔐 Security Configuration

### Iframe Sandboxing

The host application uses strict iframe sandboxing:

```html
<iframe 
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  src="https://plugin-url.com?iframeUid=unique-id"
>
```

### Origin Validation

Configure allowed origins for enhanced security:

```typescript
const config = {
  url: 'https://trusted-plugin.com',
  allowedOrigins: [
    'https://trusted-plugin.com',
    'https://staging-plugin.com'
  ],
  // Reject messages from any other origin
};
```

### Request Signature Validation

All plugin requests are cryptographically validated:

1. **Plugin Signs Request**: Using private key via `/api/sign` endpoint
2. **Host Validates Signature**: Using plugin's public key
3. **Request Processed**: Only if signature is valid
4. **Response Sent**: Back to plugin via postMessage

## 📊 Mock Data

### Available Test Data

The `MockDataProvider` includes realistic sample data:

**User Info:**
```typescript
{
  id: "user_12345",
  name: "Alice Johnson", 
  email: "alice@example.com",
  roles: ["member", "contributor"],
  twitter: { username: "alice_codes" },
  lukso: { username: "alice.lukso" },
  farcaster: { username: "alice-fc" }
}
```

**Community Info:**
```typescript
{
  id: "community_web3devs",
  title: "Web3 Developers",
  description: "A community for Web3 developers and enthusiasts",
  roles: [
    { id: "admin", title: "Administrator" },
    { id: "moderator", title: "Moderator" },
    { id: "contributor", title: "Contributor" },
    { id: "member", title: "Member" }
  ]
}
```

**Friends List:**
- 12 sample friends with names and DiceBear avatars
- Realistic pagination support
- Consistent friend data across requests

### Customizing Mock Data

```typescript
const dataProvider = new MockDataProvider();

// Add a custom friend
dataProvider.addFriend({
  id: 'user_custom',
  name: 'Custom User',
  imageUrl: 'https://example.com/avatar.png'
});

// Update user info
dataProvider.updateUser({
  name: 'Different Name',
  email: 'different@email.com'
});

// Add custom roles
dataProvider.addRole({
  id: 'custom_role',
  title: 'Custom Role',
  description: 'A custom role for testing'
});
```

## 🛠️ Development

### Project Structure

```
packages/host-app/
├── src/
│   ├── main.ts              # Application entry point
│   ├── PluginHost.ts        # Core plugin hosting logic
│   ├── MockDataProvider.ts  # Test data provider
│   └── types.ts             # TypeScript definitions
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies and scripts
```

### Scripts

```bash
# Development
yarn dev          # Start development server
yarn build        # Build for production
yarn preview      # Preview production build

# Development utilities
yarn dev --host   # Allow external connections
yarn dev --port 4000  # Use different port
```

### Environment Variables

```bash
# .env (optional)
VITE_DEFAULT_PLUGIN_URL=http://localhost:5000
VITE_LOG_LEVEL=debug
```

### Adding Custom Plugins

To test your own plugins:

1. **Add to Plugin List**: Edit the dropdown options in `main.ts`
2. **Configure Origins**: Add your plugin's origin to allowed list
3. **Test Locally**: Start your plugin on any port
4. **Load and Test**: Use the host application to load and test

```typescript
// Add your plugin to the dropdown
const pluginOptions = [
  { value: 'cg-sample', text: 'CG Sample Plugin (Local)', url: 'http://localhost:5000' },
  { value: 'my-plugin', text: 'My Custom Plugin', url: 'http://localhost:3001' },
  // ...
];
```

## 🐛 Debugging

### Communication Logs

The host application provides real-time logging of all plugin communication:

- **postMessage Events**: See all messages sent/received
- **API Requests**: Monitor plugin API calls
- **Signature Validation**: Check cryptographic validation
- **Error Messages**: Detailed error information

### Common Issues

**Plugin Not Loading:**
```
- Check that plugin URL is accessible
- Verify CORS headers if cross-origin
- Check console for iframe loading errors
```

**API Calls Failing:**
```
- Verify plugin has correct public/private keys
- Check that /api/sign endpoint is working
- Ensure signature validation is passing
```

**postMessage Errors:**
```
- Verify origin is in allowedOrigins list
- Check that plugin is calling CgPluginLib.initialize()
- Ensure iframe UID is being passed correctly
```

### Debugging Tools

Enable detailed logging:

```typescript
// In PluginHost.ts
const DEBUG = true;

if (DEBUG) {
  console.log('Message received:', event.data);
  console.log('Signature validation:', isValid);
  console.log('Response sent:', response);
}
```

## 🚀 Production Deployment

### Building for Production

```bash
# Create optimized build
yarn build

# The dist/ folder contains your deployable application
```

### Deployment Considerations

1. **HTTPS Required**: Plugins must be served over HTTPS in production
2. **CSP Headers**: Configure Content Security Policy for iframe sources
3. **CORS Setup**: Ensure proper CORS headers for plugin communication
4. **Origin Validation**: Use strict origin validation in production

### Example Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name your-host-app.com;
    
    # Serve the built application
    root /path/to/host-app/dist;
    index index.html;
    
    # CSP headers for iframe security
    add_header Content-Security-Policy "frame-src https://trusted-plugin-1.com https://trusted-plugin-2.com;";
    
    # CORS headers for plugin communication
    add_header Access-Control-Allow-Origin "https://trusted-plugin-1.com";
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 📈 Performance

### Optimization Features

- **Lazy Loading**: Plugins only load when requested
- **Event Cleanup**: Automatic cleanup of event listeners
- **Memory Management**: Proper cleanup when plugins are unloaded
- **Efficient Messaging**: Minimal postMessage overhead

### Performance Monitoring

```typescript
// Track plugin load times
const startTime = performance.now();
await pluginHost.loadPlugin(config);
const loadTime = performance.now() - startTime;
console.log(`Plugin loaded in ${loadTime}ms`);

// Monitor message frequency
let messageCount = 0;
pluginHost.on('message', () => {
  messageCount++;
});
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Plugin loads successfully
- [ ] `getUserInfo()` returns correct data
- [ ] `getCommunityInfo()` returns community data
- [ ] `getUserFriends()` returns friends list with pagination
- [ ] `giveRole()` completes without errors
- [ ] Real-time logs show all communication
- [ ] Error handling works for invalid requests

### Automated Testing

```bash
# Add to package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}

# Example test
import { PluginHost } from './PluginHost';
import { MockDataProvider } from './MockDataProvider';

test('should load plugin successfully', async () => {
  const dataProvider = new MockDataProvider();
  const pluginHost = new PluginHost(dataProvider);
  
  const result = await pluginHost.loadPlugin({
    url: 'http://localhost:5000',
    allowedOrigins: ['http://localhost:5000']
  });
  
  expect(result.success).toBe(true);
});
```

## 🤝 Contributing

This application is part of the standalone embed system. See the [root README](../../README.md) for contribution guidelines.

## 📄 License

MIT License - Feel free to use this as a foundation for your own plugin hosting systems.

---

## 🎉 Ready to Host Plugins!

Start the development server and begin testing Common Ground plugins:

```bash
yarn dev
```

Visit `http://localhost:3000` and load your first plugin! 