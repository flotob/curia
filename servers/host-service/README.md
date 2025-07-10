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

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Yarn package manager
- PostgreSQL database (for production)

### Development Setup

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Visit http://localhost:3001
```

### Production Deployment

```bash
# Build for production
yarn build

# Start production server
yarn start
```

## 🏗️ Architecture

### Core Components

```
Host Service
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
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   └── lib/                   # Core libraries
│       ├── PluginHost.ts      # Plugin communication manager
│       └── DataProvider.ts    # Data access layer
├── package.json
├── next.config.js
├── tsconfig.json
├── railway.toml              # Railway deployment config
└── README.md
```

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

### Phase 2: Integration 🔄
- 🔄 Add @curia_ library integration
- 🔄 Real database connections
- 🔄 Authentication system

### Phase 3: Production 🔄
- 🔄 Admin dashboard
- 🔄 JavaScript snippet generation
- 🔄 Monitoring and logging
- 🔄 Security hardening

### Phase 4: Scale 🔄
- 🔄 Multi-tenant architecture
- 🔄 Performance optimization
- 🔄 Advanced analytics
- 🔄 Custom domains

---

**🚀 Curia Host Service - Democratizing forum technology for any website** 