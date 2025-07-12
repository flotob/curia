# Curia Host Service

**Standalone forum hosting infrastructure for Curia**

This service provides the backend infrastructure to host Curia forums independently of Common Ground, allowing any website to embed sophisticated forum functionality via a simple JavaScript snippet.

## 🎯 Purpose

The Host Service is the backbone of the standalone Curia system. It:

- **Hosts Plugin APIs**: Provides all Common Ground API methods (getUserInfo, getCommunityInfo, etc.)
- **Manages Authentication**: Handles user sessions and community access
- **Signs Requests**: Cryptographically signs plugin requests for security
- **Serves Forums**: Hosts the Curia forum application in iframe contexts
- **Enables Embedding**: Generates JavaScript snippets for easy website integration

## 🚀 **MAJOR MILESTONE: PRODUCTION-READY EMBED SYSTEM** ✅

**🎯 PHASE 3 COMPLETE: Self-Contained Embed Script** - Revolutionary single-script-tag integration:
- **✅ Customer Integration**: Just `<script src="/embed.js">` - zero parent page logic required
- **✅ Complete Self-Containment**: Auth handling, iframe switching, API routing all internal
- **✅ Real Authentication**: Users like `ens:florianglatz.eth` authenticate through entire flow
- **✅ Database Integration**: Real PostgreSQL with complete data provider translation layer  
- **✅ Forum Functionality**: Full Curia forum loads and works without errors
- **✅ Production Architecture**: InternalPluginHost provides bulletproof customer experience

**Customer Deployment**: Literally just include one script tag and get a complete forum! 🚀

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Yarn package manager
- PostgreSQL database (for production)

### Development Setup

```bash
# Install dependencies
yarn install

# Build the embed script (creates public/embed.js)
yarn build:embed

# Start development server
yarn dev

# Visit http://localhost:3001
# Test customer integration at http://localhost:3001/demo
```

### Production Deployment

```bash
# Build for production
yarn build

# Start production server
yarn start
```

## 🎯 **Customer Embed Integration**

### **Production-Ready Single Script Tag**

Customers can embed a complete Curia forum with **just one line**:

```html
<div id="my-forum"></div>
<script 
  src="https://your-host.com/embed.js"
  data-container="my-forum"
  data-community="your-community" 
  data-theme="light"
  data-height="700px"
  async>
</script>
```

**That's it!** No imports, no ClientPluginHost, no PostMessage handling, no auth context management.

### **Embed Script Features**

- **🎯 Self-Contained**: All logic embedded in single 10KB script
- **🔐 Complete Auth Flow**: Handles user authentication and community selection internally
- **🔄 Automatic Iframe Switching**: Auth → Forum transition happens seamlessly
- **📡 API Routing**: All forum requests routed to host service database automatically
- **🛡️ Error Handling**: Robust error states and recovery mechanisms
- **📱 Responsive**: Works on desktop and mobile
- **🎨 Themeable**: Light/dark theme support via data attributes

### **Architecture Flow**

```
Customer Website
    ↓ Include Script Tag
Embed Script (10KB)
    ↓ Creates Auth Iframe
Host Service (/embed)
    ↓ User Authentication
PostMessage: auth-complete
    ↓ Internal Switching
Forum Iframe (Curia)
    ↓ API Requests via PostMessage
InternalPluginHost
    ↓ Database Queries
PostgreSQL → Response → Forum
```

### **Demo Pages**

- **`/demo`** - Real customer deployment simulation (minimal, production-like)
- **`/embed`** - Auth iframe endpoint for user authentication

### **Testing Your Integration**

1. **Local Testing**: Visit `http://localhost:3001/demo`
2. **Production Testing**: Deploy and test on your domain
3. **Debug Mode**: Check browser console for `[CuriaEmbed]` and `[InternalPluginHost]` logs

## 🏗️ Architecture

### Core Components

```
Host Service
├── 🎯 Embed System (NEW!)
│   ├── /embed.js      # Self-contained embed script (10KB)
│   ├── /embed         # Auth iframe endpoint  
│   ├── /demo          # Customer deployment simulation
│   └── InternalPluginHost # Complete self-contained logic
├── API Routes (/api/*)
│   ├── /sign          # Request signing
│   ├── /user          # User operations
│   └── /community     # Community operations
├── Plugin Host Logic
│   ├── PluginHost     # Request processing
│   └── DataProvider   # Data access layer
└── Frontend Pages
    ├── Admin Dashboard
    └── Status Pages
```

### Request Flow

```
Plugin (Curia Forum)
    ↓ API Request
Host Service (/api/*)
    ↓ Process & Validate
DataProvider
    ↓ Database Query
Response → Plugin
```

## 📡 API Endpoints

### Plugin Communication APIs

#### `POST /api/sign`
Signs plugin requests cryptographically.

**Request:**
```json
{
  "method": "getUserInfo",
  "communityId": "community_123",
  "userId": "user_456"
}
```

**Response:**
```json
{
  "method": "getUserInfo",
  "communityId": "community_123",
  "userId": "user_456",
  "signature": "...",
  "timestamp": 1234567890,
  "keyId": "..."
}
```

#### `POST /api/user`
Handles user-related operations.

**Supported Methods:**
- `getUserInfo` - Get user profile information
- `getUserFriends` - Get user's friend list with pagination
- `getContextData` - Get plugin context and assignable roles

#### `POST /api/community`
Handles community-related operations.

**Supported Methods:**
- `getCommunityInfo` - Get community details and roles
- `giveRole` - Assign roles to users

#### `GET /api/health`
Health check endpoint for Railway deployment monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "curia-host-service",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "api": "operational",
    "memory": "ok"
  }
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```bash
# Service Configuration
HOST_SERVICE_URL=http://localhost:3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/curia_host_service

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Cryptographic Keys
CURIA_PRIVATE_KEY=your-private-key-here
CURIA_PUBLIC_KEY=your-public-key-here
CURIA_KEY_ID=your-key-id-here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000

# Forum App URL
CURIA_FORUM_URL=http://localhost:3000
```

### Key Generation

Generate cryptographic keys for request signing:

```bash
# TODO: Add key generation script
# This will use @curia_/cg-plugin-lib-host to generate keypairs
```

## 🧪 Testing with Main Curia App

### Step 1: Update Main App
Modify the main Curia app to detect standalone mode:

```typescript
// In main Curia app
const isStandalone = new URLSearchParams(window.location.search).get('mod') === 'standalone';

if (isStandalone) {
  // Use @curia_/cg-plugin-lib
  const { PluginClient } = await import('@curia_/cg-plugin-lib');
} else {
  // Use original @common-ground-dao/cg-plugin-lib
  const { PluginClient } = await import('@common-ground-dao/cg-plugin-lib');
}
```

### Step 2: Test API Calls
1. Start the host service: `yarn dev` (port 3001)
2. Start the main Curia app with `?mod=standalone` parameter
3. Point Curia to host service URL: `http://localhost:3001`
4. Verify API calls in browser console

### Step 3: Validate Functionality
- ✅ User info loads correctly
- ✅ Community data displays
- ✅ Friend lists paginate
- ✅ Role assignments work
- ✅ Real-time features function

## 🛠️ Development

### Project Structure

```
servers/host-service/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── sign/          # Request signing
│   │   │   ├── user/          # User operations
│   │   │   └── community/     # Community operations
│   │   ├── demo/              # Customer deployment simulation
│   │   ├── embed/             # Auth iframe endpoint
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   └── lib/                   # Core libraries
│       ├── embed/             # 🎯 EMBED SYSTEM (NEW!)
│       │   ├── types/         # TypeScript interfaces
│       │   ├── core/          # Config & lifecycle
│       │   ├── ui/            # Container management
│       │   ├── plugin-host/   # InternalPluginHost
│       │   └── main.ts        # Build orchestration
│       ├── PluginHost.ts      # Plugin communication manager
│       └── DataProvider.ts    # Data access layer
├── scripts/
│   └── build-embed.ts         # Embed script build system
├── public/
│   └── embed.js               # Built embed script (10KB)
├── package.json
├── next.config.js
├── tsconfig.json
├── railway.toml              # Railway deployment config
└── README.md
```

### Embed Script Build System

The embed script is built from modular TypeScript components:

```bash
# Build embed script (TypeScript → Single JS file)
yarn build:embed

# Watch mode for development
yarn build:embed --watch
```

**Build Process:**
1. **TypeScript Modules** → Combined into single script
2. **Environment URLs** → Injected at build time  
3. **Minification** → Optional for production
4. **Output** → `public/embed.js` (served as static file)

**Key Components:**
- **EmbedConfig** → Parse script data attributes
- **ContainerManager** → DOM container creation
- **InternalPluginHost** → Complete self-contained logic (auth + API routing)
- **EmbedLifecycle** → Initialization and cleanup

### Adding New API Methods

1. **Update DataProvider interface:**
```typescript
// src/lib/DataProvider.ts
abstract newMethod(params: any): Promise<ApiResponse<any>>;
```

2. **Implement in DatabaseDataProvider:**
```typescript
async newMethod(params: any): Promise<ApiResponse<any>> {
  // Implementation here
}
```

3. **Add to PluginHost routing:**
```typescript
// src/lib/PluginHost.ts
case 'newMethod':
  responseData = await this.dataProvider.newMethod(request.params);
  break;
```

4. **Create API route (if needed):**
```typescript
// src/app/api/new-endpoint/route.ts
export async function POST(request: NextRequest) {
  // Handle new endpoint
}
```

## 🚀 Deployment

### Railway Deployment

1. **Connect Repository:**
   - Link GitHub repository to Railway
   - Select `servers/host-service` as root directory

2. **Set Environment Variables:**
   ```bash
   DATABASE_URL=postgresql://...
   JWT_SECRET=...
   CURIA_PRIVATE_KEY=...
   CURIA_PUBLIC_KEY=...
   CURIA_KEY_ID=...
   ```

3. **Deploy:**
   - Railway will automatically build and deploy
   - Monitor logs for any issues

### Manual Deployment

```bash
# Build the application
yarn build

# Start with PM2 or similar process manager
pm2 start "yarn start" --name curia-host-service
```

## 🐛 Embed System Debugging

### Critical Iframe Embedding Lessons Learned

The embed system (`/embed.js` → `/embed` iframe) has several gotchas that can cause silent failures. Here are the key lessons from debugging:

#### 1. **Iframe DOM Insertion Order** 🚨 **CRITICAL**
**Problem:** Iframe must be inserted into DOM **before** setting `src` attribute.

```javascript
// ❌ WRONG: iframe.src set before DOM insertion
iframe.src = 'http://localhost:3001/embed';
container.appendChild(iframe); // Too late! Loading never starts

// ✅ CORRECT: Insert into DOM first, then set src
container.appendChild(iframe);  // Insert first
iframe.src = 'http://localhost:3001/embed'; // Now loading starts
```

**Symptoms:** 
- Iframe shows loading forever
- No network requests in dev tools
- `iframe.onload` never fires
- 10-second timeout errors

#### 2. **Sandbox Permissions Required** 🛡️
Modern browsers heavily sandbox iframes by default. Must explicitly allow:

```javascript
iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
```

**Without sandbox permissions:**
- No JavaScript execution
- No network requests
- Complete iframe failure
- No error messages

#### 3. **Template Literal Syntax** 📝
**Problem:** Using single quotes instead of backticks in server-side generation.

```javascript
// ❌ WRONG: Single quotes don't interpolate
const script = 'const url = ${hostUrl}/embed';

// ✅ CORRECT: Backticks for template literals  
const script = `const url = ${hostUrl}/embed`;
```

#### 4. **Browser vs Server Environment** 🌍
**Problem:** `process.env` doesn't exist in browser JavaScript.

```javascript
// ❌ WRONG: Browser can't access process.env
const url = `${process.env.NEXT_PUBLIC_HOST_URL}/embed`;

// ✅ CORRECT: Resolve server-side, inject into client script
const hostUrl = process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3001';
const script = `const url = '${hostUrl}/embed';`;
```

#### 5. **X-Frame-Options Configuration** 🔒
**Problem:** `X-Frame-Options: SAMEORIGIN` blocks iframe embedding.

```javascript
// next.config.js - Allow embedding for /embed route
headers: async () => [
  {
    // Exclude /embed from X-Frame-Options restrictions
    source: '/((?!embed).*)', 
    headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]
  }
]
```

#### 6. **CSS Compilation Errors** 💄
**Problem:** Invalid Tailwind classes prevent page compilation.

```css
/* ❌ WRONG: border-border is not a valid Tailwind class */
@apply border-border;

/* ✅ CORRECT: Use actual CSS or valid Tailwind classes */
border-color: hsl(var(--border));
```

### Debugging Checklist

When iframe embedding fails:

1. **Check browser dev tools Network tab**
   - Is the iframe making ANY network requests?
   - If NO requests: DOM insertion order issue

2. **Inspect iframe element**
   - Does it have `sandbox` attributes?
   - Is `src` attribute set correctly?

3. **Check console for JavaScript errors**
   - Template literal syntax errors
   - `process is not defined` errors

4. **Test direct URL access**
   - Does `/embed?theme=light` work directly?
   - If YES: iframe issue. If NO: route/compilation issue

5. **Verify Next.js config**
   - Check `X-Frame-Options` headers
   - Ensure `/embed` route is excluded from restrictions

### Working Test Comparison

**✅ Working:** `/test` page loads `localhost:3000` via `ClientPluginHost`
- Uses proper DOM insertion order
- Includes sandbox permissions
- Sophisticated iframe management

**❌ Initially Broken:** `/demo` page loads `localhost:3001/embed` via embed script
- Wrong DOM insertion order
- Missing sandbox permissions  
- Basic iframe creation

The fix was making the embed script follow the same patterns as `ClientPluginHost`.

## 🔒 Security Considerations

### Request Validation
- All plugin requests must be cryptographically signed
- Timestamps prevent replay attacks (5-minute window)
- Origin validation for CORS protection

### Data Access
- Community-scoped data access
- Role-based permission checking
- SQL injection prevention via parameterized queries

### Production Hardening
- Use HTTPS in production
- Set secure environment variables
- Enable request rate limiting
- Regular security audits

## 📊 Monitoring

### Health Checks
- Service status: `GET /health` (Railway health check endpoint)
- API endpoint health: Monitor response times and error rates
- Database connectivity: Connection pooling and query performance (when implemented)
- Memory usage monitoring and alerts

### Logging
Development logs show:
- API request processing
- User and community operations
- Error conditions and debugging info

Production logging should include:
- Structured logging with correlation IDs
- Performance metrics
- Security events

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch:**
```bash
git checkout -b feature/new-api-method
```

2. **Make Changes:**
- Update DataProvider interface
- Implement in database provider
- Add API routes as needed
- Update documentation

3. **Test Changes:**
```bash
yarn dev
# Test with main Curia app
```

4. **Submit Pull Request:**
- Include tests and documentation
- Verify backward compatibility

### Code Style
- Use TypeScript for type safety
- Follow existing patterns in the codebase
- Add comprehensive JSDoc comments
- Include error handling and logging

## 📈 Roadmap

### Phase 1: Foundation ✅
- ✅ Basic API endpoints
- ✅ Plugin communication framework
- ✅ Development environment setup

### Phase 2: Integration ✅ **COMPLETED**
- ✅ @curia_ library integration
- ✅ Real database connections
- ✅ Authentication system
- ✅ **End-to-end embed system working with real users**

### Phase 3: Production-Ready Embed ✅ **COMPLETED!!!**
- ✅ **Self-contained embed script (single script tag integration)**
- ✅ **InternalPluginHost with complete client logic embedded**
- ✅ **Production-ready customer deployment (10KB script)**
- ✅ **Real user authentication and forum functionality**
- ✅ **Zero customer implementation required**
- 🔄 Admin dashboard  
- 🔄 Monitoring and logging
- 🔄 Security hardening

### Phase 4: Scale 🔄
- 🔄 Multi-tenant architecture
- 🔄 Performance optimization
- 🔄 Advanced analytics
- 🔄 Custom domains

---

**🚀 Curia Host Service - Production-Ready Forum Embedding for Any Website**

*Revolutionary single-script-tag integration. Zero implementation required. Just include `<script src="/embed.js">` and get a complete forum!* ✨ 