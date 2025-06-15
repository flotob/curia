<div align='center'>
    <h1>CG Sample Plugin</h1>
</div>

This sample plugin demonstrates the core capabilities of the [Common Ground Plugin Library](https://github.com/Common-Ground-DAO/CGPluginLib). It provides a practical example of integrating the plugin library, showcasing essential frontend-backend interactions, real-time features, and common use cases.

**Key Features:**
- 🔐 **Secure Board-Level Permissions**: Role-based access control for community boards
- ⚡ **Real-Time Updates**: Live voting, comments, typing indicators, and user presence via Socket.IO
- 🏗️ **Custom Server Architecture**: Next.js + Socket.IO with JWT authentication
- 🚀 **Production Ready**: Railway-compatible deployment with proper build pipeline

Use this as a reference implementation to understand how to leverage the full feature set of CG plugins in your own applications.

## Database Migrations

This project uses `node-pg-migrate` to manage PostgreSQL database schema changes. Migrations are written in TypeScript and then compiled to JavaScript before being executed.

### Workflow for Adding a New Migration

1.  **Create a New Migration File:**
    Use the following yarn script to generate a new migration file. Replace `<migration_name>` with a descriptive name for your migration (e.g., `add-posts-table`, `add-status-to-users`).
    ```bash
    yarn migrate:create <migration_name>
    ```
    This command will create a new TypeScript file in the `migrations/` directory, prefixed with a timestamp (e.g., `migrations/1748449754626_add-posts-table.ts`).

2.  **Edit the Migration File:**
    Open the newly created `.ts` file in the `migrations/` directory. You will see `up` and `down` functions.
    *   **`up(pgm: MigrationBuilder): Promise<void>`:** Write your schema changes here (e.g., creating tables, adding columns). Use the `pgm` object provided by `node-pg-migrate` for schema operations.
    *   **`down(pgm: MigrationBuilder): Promise<void>`:** Write the reverse operations here to roll back the changes made in the `up` function (e.g., dropping tables, removing columns).

    ```typescript
    // Example: migrations/<timestamp>_your-migration-name.ts
    import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

    export const shorthands: ColumnDefinitions | undefined = undefined;

    export async function up(pgm: MigrationBuilder): Promise<void> {
      // pgm.createTable(...);
      // pgm.addColumn(...);
    }

    export async function down(pgm: MigrationBuilder): Promise<void> {
      // pgm.dropTable(...);
      // pgm.removeColumn(...);
    }
    ```

3.  **Apply the Migration:**
    Once you have defined your `up` and `down` functions, run the following command to apply the migration (and any other pending migrations):
    ```bash
    yarn migrate:up
    ```
    This command does two things:
    *   First, it automatically runs `yarn migrate:compile` (due to the `premigrate:up` script in `package.json`). This compiles all TypeScript files from the `migrations/` directory into JavaScript files in the `dist/migrations/` directory, using `tsconfig.migrations.json` for configuration.
    *   Then, it executes `node-pg-migrate up`, telling it to use the compiled JavaScript migrations from the `dist/migrations/` directory.

### Rolling Back Migrations

To roll back the last applied migration, use:
```bash
yarn migrate:down
```
This will also automatically compile first and then run the `down` function of the last applied migration from the compiled files in `dist/migrations/`.

### Key Files and Configuration

*   **`migrations/`**: This directory contains the source TypeScript migration files that you create and edit.
*   **`dist/migrations/`**: This directory contains the JavaScript files compiled from `migrations/`. It is automatically generated and should be added to `.gitignore` (already done).
*   **`tsconfig.migrations.json`**: A dedicated TypeScript configuration file used solely for compiling the migration files. It extends the main `tsconfig.json` but overrides settings like `module`, `outDir`, `noEmit`, and `incremental` to ensure migrations are compiled correctly to CommonJS JavaScript.
*   **`.env` file**: Must contain the `DATABASE_URL` environment variable pointing to your PostgreSQL instance (e.g., `DATABASE_URL=postgres://plugin_user:plugin_password@localhost:5434/plugin_db`). `node-pg-migrate` uses this to connect to the database. The `dotenv` package is included to help load this file.
*   **`package.json` (scripts section)**:
    *   `migrate:create`: Generates new TypeScript migration templates.
    *   `migrate:compile`: Compiles TypeScript migrations to `dist/migrations/`. Cleans `dist/migrations` before compiling.
    *   `premigrate:up`: Automatically runs `migrate:compile` before `migrate:up`.
    *   `migrate:up`: Applies pending migrations from `dist/migrations/`.
    *   `premigrate:down`: Automatically runs `migrate:compile` before `migrate:down`.
    *   `migrate:down`: Rolls back the last migration from `dist/migrations/`.

This setup ensures that you can write your migrations in TypeScript with full type safety and modern features, while `node-pg-migrate` executes reliable JavaScript code against your database.

## Authentication & Protected API Routes

This boilerplate implements a plugin-specific JWT-based authentication system to secure its backend API routes. This allows the plugin to have its own authenticated sessions independent of, but initialized by, the Common Ground platform's user context.

### Core Flow

1.  **Initial Context from Common Ground:** When the plugin loads in an iframe, the frontend (`src/app/myInfo.tsx` or a similar entry component) initializes `CgPluginLib` using the `iframeUid` and your plugin's public/private keys (via `/api/sign`). It then fetches user information (`cgUserInfo`) and community information (`communityInfo`) from `CgPluginLib`.
2.  **Determine Admin Status:** Based on `cgUserInfo.roles`, `communityInfo.roles`, and the `NEXT_PUBLIC_ADMIN_ROLE_IDS` environment variable, the frontend determines if the current user has administrative privileges within the plugin's context.
3.  **Request Plugin JWT:** The frontend then calls the `login()` function from `AuthContext` (`src/contexts/AuthContext.tsx`). This function sends a `POST` request to the plugin's backend endpoint `/api/auth/session` with the user's ID, name, profile picture URL (if available), and the determined admin status.
4.  **Issue Plugin JWT:** The `/api/auth/session/route.ts` endpoint receives this information, validates it, and if successful, mints a new JWT. This JWT is signed with your plugin's `JWT_SECRET` (from `.env`) and includes claims such as:
    *   `sub`: The user's Common Ground ID.
    *   `name`: The user's name.
    *   `picture`: The user's profile picture URL.
    *   `adm`: A boolean indicating if the user is an admin for this plugin.
    *   It also includes standard JWT claims like `iat` (issued at) and `exp` (expiry time, controlled by `JWT_EXPIRES_IN_SECONDS` in `.env`).
5.  **Store JWT on Client:** The `AuthContext` receives this JWT from `/api/auth/session` and stores it in its state. It also decodes the JWT to populate a `user` object in the context and optionally persists the token to `localStorage` to attempt session resumption on subsequent loads (with expiry checks).
6.  **Authenticated API Calls:** For subsequent calls to the plugin's backend API routes:
    *   The frontend uses the `authFetchJson` utility (`src/utils/authFetch.ts`).
    *   This utility retrieves the stored plugin JWT from `AuthContext` (via the `useAuth` hook) and includes it in the `Authorization: Bearer <token>` header of the request.
7.  **Protect API Routes with `withAuth` Middleware:**
    *   Backend API routes that require authentication are wrapped with the `withAuth` higher-order function (`src/lib/withAuth.ts`).
    *   `withAuth` verifies the incoming JWT. If valid, it decodes the claims and attaches them to the `req.user` object.
    *   **User Profile Sync:** On every successful JWT verification, `withAuth` also performs an `UPSERT` operation into the `users` table in your PostgreSQL database. This syncs the `user_id`, `name`, and `profile_picture_url` from the JWT claims, ensuring your local user profile data is kept up-to-date.
    *   `withAuth` can also enforce admin-only access to a route.

### Key Files for Authentication

*   **`src/contexts/AuthContext.tsx`:** Manages client-side authentication state (JWT, user info, loading/error states), provides `login` and `logout` functions, and handles `localStorage` persistence of the token.
*   **`src/app/api/auth/session/route.ts`:** Server-side Next.js API route that issues the plugin-specific JWTs.
*   **`src/lib/withAuth.ts`:** Server-side middleware (higher-order function) to protect API routes by verifying JWTs and performing user profile sync to the database.
*   **`src/utils/authFetch.ts`:** Client-side utility for making `fetch` requests that automatically include the plugin JWT in the `Authorization` header.
*   **`src/app/myInfo.tsx` (Example Usage):** Demonstrates initializing `CgPluginLib`, determining admin status, calling `auth.login()`, and then making an authenticated API call to a protected route (`/api/me`).
*   **`src/app/api/me/route.ts` (Example Protected Route):** A simple GET route protected by `withAuth` that returns information from the authenticated user's JWT.
*   **`.env` (and `.env.example`):** Contains crucial secrets and configurations:
    *   `JWT_SECRET`: For signing and verifying plugin JWTs.
    *   `JWT_EXPIRES_IN_SECONDS`: Defines the lifetime of the plugin JWTs.
    *   `NEXT_PUBLIC_ADMIN_ROLE_IDS`: Comma-separated list of role *titles* from Common Ground that grant admin privileges in this plugin.

### Creating a New Protected API Route

1.  Create your API route file (e.g., `src/app/api/my-data/route.ts`).
2.  Import `withAuth` and `AuthenticatedRequest` (if you need to access `req.user`) from `src/lib/withAuth.ts`.
3.  Define your handler function(s) (e.g., `async function GET(req: AuthenticatedRequest) { ... }`).
4.  Wrap your handler with `withAuth`. For admin-only routes, pass `true` as the second argument to `withAuth`.

    ```typescript
    // src/app/api/my-data/route.ts
    import { NextResponse } from 'next/server';
    import { withAuth, AuthenticatedRequest, JwtPayload } from '@/lib/withAuth';

    async function myDataHandler(req: AuthenticatedRequest) {
      // Access claims from the verified JWT via req.user
      const userId = req.user?.sub;
      const isAdmin = req.user?.adm;

      if (!userId) {
        return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
      }

      // Your logic here...
      const data = { message: `Hello user ${userId}! Your admin status is: ${isAdmin}` };
      return NextResponse.json(data);
    }

    // Protect the GET method for this route. 
    // Set second arg to `true` if it should be admin-only: export const GET = withAuth(myDataHandler, true);
    export const GET = withAuth(myDataHandler, false);
    ```

### Important Security Considerations

*   **`JWT_SECRET`:** Keep this secret secure and ensure it's a strong, random string. Do not commit it to version control (it should only be in your `.env` file, which is gitignored).
*   **HTTPS:** Always use HTTPS in production environments to protect JWTs transmitted in headers.
*   **Token Expiry:** Use reasonably short expiry times for your JWTs (e.g., 15 minutes to a few hours, configured by `JWT_EXPIRES_IN_SECONDS`) and implement a token refresh strategy if longer-lived sessions are required (currently not implemented in this boilerplate).
*   **Input Validation:** Always validate any data received in API route handlers, even for protected routes.
*   **Admin Logic:** The current admin determination relies on matching role *titles* defined in `NEXT_PUBLIC_ADMIN_ROLE_IDS`. Ensure these titles are accurate and consistently managed in your Common Ground community settings.

## Real-Time Features with Socket.IO

This plugin implements comprehensive real-time functionality using Socket.IO, providing live updates for voting, comments, typing indicators, and user presence. The implementation maintains the same security model as the REST API, ensuring users can only access real-time updates from boards they have permission to view.

### Architecture Overview

The plugin uses a **custom server architecture** that combines Next.js with Socket.IO:

- **`server.ts`**: Custom HTTP server that serves Next.js app and Socket.IO WebSocket server
- **JWT Authentication**: WebSocket connections use the same JWT tokens as API routes
- **Permission-Aware Rooms**: Users join board-specific rooms based on their access permissions
- **Broadcast Utilities**: API routes can broadcast real-time events to connected clients

### Custom Server Setup

Unlike standard Next.js applications, this plugin runs a custom server to enable Socket.IO:

```typescript
// server.ts - Custom server with Next.js + Socket.IO
const app = next({ dev });
const httpServer = createServer((req, res) => handle(req, res));
const io = new SocketIOServer(httpServer, { /* CORS config */ });

// Share Socket.IO instance with API routes
setSocketIO(io);
```

**Development vs Production:**
- **Development**: `yarn dev` runs `tsx watch server.ts` for auto-reload
- **Production**: `yarn build` compiles Next.js + TypeScript server, then `yarn start` runs `node server.js`

### WebSocket Authentication

Socket.IO connections use the same JWT authentication as API routes:

```javascript
// Client-side connection with JWT
const socket = io({
  auth: {
    token: userJwtToken
  }
});
```

The server validates JWTs and automatically joins users to their community room:

```typescript
// Server-side JWT verification
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  const decoded = jwt.verify(token, JWT_SECRET);
  socket.data.user = decoded;
  socket.join(`community:${decoded.cid}`);
  next();
});
```

### Permission-Aware Room System

The plugin implements a hierarchical room system that respects board permissions:

- **`community:{id}`**: All authenticated users auto-join their community room
- **`board:{id}`**: Users must explicitly join board rooms with permission checks

**Board Room Joining Process:**
1. Client requests to join a board room: `socket.emit('joinBoard', boardId)`
2. Server validates board exists and belongs to user's community
3. Server checks board permissions using existing `canUserAccessBoard()` logic
4. If authorized, user joins room and receives confirmation
5. Other users in the room are notified of the new presence

### Real-Time Events

#### Core Socket Events

**Client → Server:**
- `joinBoard(boardId)`: Request to join a board room with permission validation
- `leaveBoard(boardId)`: Leave a board room
- `typing({ boardId, postId?, isTyping })`: Broadcast typing indicators

**Server → Client:**
- `boardJoined({ boardId })`: Confirmation of successful board room join
- `userJoinedBoard({ userId, userName, boardId })`: Another user joined the board
- `userLeftBoard({ userId, boardId })`: User left the board
- `userTyping({ userId, userName, boardId, postId?, isTyping })`: Typing indicators
- `error({ message })`: Permission denied or other errors

#### API Route Broadcasts

API routes can broadcast real-time updates using the shared Socket.IO instance:

```typescript
// Example: Broadcasting a new post from API route
import { socketEvents } from '@/lib/socket';

export async function POST(req: AuthenticatedRequest) {
  // ... create post logic ...
  
  // Broadcast to all users in the board room
  socketEvents.broadcastNewPost(boardId, {
    id: newPost.id,
    title: newPost.title,
    author: newPost.author_user_id,
    // ... other post data
  });
  
  return NextResponse.json(newPost);
}
```

**Available Broadcast Functions:**
- `broadcastNewPost(boardId, postData)`: New post created
- `broadcastVoteUpdate(boardId, postId, newCount, userId)`: Vote count changed
- `broadcastNewComment(boardId, postId, commentData)`: New comment added
- `broadcastPostDeleted(boardId, postId)`: Post deleted (admin action)
- `broadcastBoardSettingsChanged(boardId, settings)`: Board permissions updated

### Security Model

Real-time features maintain the same security guarantees as REST API:

1. **JWT Authentication**: All WebSocket connections must provide valid JWTs
2. **Board Permission Checks**: Users can only join rooms for boards they can access
3. **Community Isolation**: Users can only join boards in their own community
4. **Admin Controls**: Board settings changes broadcast to affected users
5. **Automatic Cleanup**: User presence is removed when they disconnect

### Frontend Integration

The frontend can connect to Socket.IO and handle real-time events:

```typescript
// Connect with authentication
const socket = io({
  auth: { token: userJwtToken }
});

// Join a board room
socket.emit('joinBoard', boardId);

// Listen for real-time updates
socket.on('newPost', (postData) => {
  // Update UI with new post
});

socket.on('voteUpdate', ({ postId, newCount }) => {
  // Update vote count in UI
});

socket.on('userTyping', ({ userId, userName, isTyping }) => {
  // Show/hide typing indicator
});
```

### Development Setup

**Install Dependencies:**
```bash
yarn install
```

**Environment Variables:**
Ensure `.env` includes Socket.IO configuration:
```
# Standard plugin config
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://...

# Optional: CORS configuration for Socket.IO
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com
```

**Development Server:**
```bash
yarn dev  # Runs: tsx watch server.ts
```

The development server uses `tsx` instead of `ts-node-dev` to handle TypeScript + ESM imports properly.

### Production Deployment

**Build Process:**
```bash
yarn build  # Runs: next build && npx tsc -p tsconfig.server.json
```

This creates:
- `.next/` - Compiled Next.js application
- `server.js` - Compiled custom server for production

**Railway Deployment:**
The custom server architecture works seamlessly with Railway:
- Railway auto-detects the Node.js project
- Runs `yarn build` during deployment
- Starts with `yarn start` (which runs `node server.js`)
- Socket.IO WebSocket connections work on Railway's infrastructure

**Production Environment Variables:**
```
NODE_ENV=production
PORT=3000  # Usually set automatically by Railway
ALLOWED_ORIGINS=https://your-production-domain.com
```

### File Structure for Real-Time Features

```
server.ts                           # Custom server with Next.js + Socket.IO
tsconfig.server.json               # TypeScript config for server compilation
src/
├── lib/
│   ├── socket.ts                  # Socket.IO instance sharing & broadcast utilities
│   ├── boardPermissions.ts       # Permission checking functions
│   └── withAuth.ts               # JWT authentication (used by both REST & WebSocket)
├── app/api/
│   ├── posts/route.ts            # Uses socketEvents.broadcastNewPost()
│   ├── posts/[postId]/votes/route.ts  # Uses socketEvents.broadcastVoteUpdate()
│   └── ...                       # Other API routes with real-time broadcasts
└── ...
```

### Performance Considerations

- **Room-Based Broadcasting**: Events only sent to users in relevant board rooms
- **Efficient Reconnection**: JWT tokens allow seamless reconnection without re-authentication
- **Automatic Cleanup**: User presence automatically cleaned up on disconnect
- **Selective Events**: Only broadcast events that UI components actually need

### Troubleshooting

**Common Issues:**

1. **"Cannot find module" errors during development:**
   - Solution: Use `tsx watch server.ts` instead of `ts-node-dev`
   - Reason: Better ESM + TypeScript support

2. **CORS issues with Socket.IO:**
   - Solution: Configure `ALLOWED_ORIGINS` environment variable
   - Development: Set to allow localhost

3. **WebSocket connection fails:**
   - Check JWT token validity
   - Ensure `JWT_SECRET` matches between client and server
   - Verify user has community access

4. **Real-time events not received:**
   - Confirm user successfully joined board room (`boardJoined` event)
   - Check board permissions with `canUserAccessBoard()`
   - Verify API routes are calling broadcast functions

## Board-Level Security & Permissions

This plugin implements a comprehensive security model that goes beyond community-level access to provide fine-grained, board-level permissions. This ensures users can only access content they're authorized to see, both in the REST API and real-time features.

### Security Architecture

The plugin uses a **hierarchical permission system**:

1. **Community Level**: Users must belong to the community (enforced by Common Ground)
2. **Board Level**: Users must have appropriate roles to access specific boards
3. **Content Level**: All posts, comments, and votes are tied to boards and inherit board permissions

### Board Permission Model

Each board has configurable access settings stored in the `boards.settings.permissions` JSON field:

```json
{
  "permissions": {
    "allowedRoles": ["member", "moderator", "admin"],
    "isPublic": false
  }
}
```

**Permission Checking Logic:**
- **Admin Override**: Community admins can access all boards regardless of settings
- **Public Boards**: If `isPublic: true`, all community members can access
- **Private Boards**: Only users with roles in `allowedRoles` array can access
- **Role Matching**: User's roles are checked against board's `allowedRoles`

### Key Security Functions

**`src/lib/boardPermissions.ts`** provides core permission checking:

```typescript
// Check if user can access a specific board
canUserAccessBoard(userRoles: string[], boardSettings: any, isAdmin: boolean): boolean

// Filter list of boards to only those user can access
filterAccessibleBoards(boards: Board[], userRoles: string[], isAdmin: boolean): Promise<Board[]>

// Get IDs of boards user can access (for SQL queries)
getAccessibleBoardIds(communityId: string, userRoles: string[], isAdmin: boolean): Promise<number[]>
```

### API Security Implementation

All API endpoints that serve content implement board-level security:

**Posts API (`/api/posts`):**
```typescript
// Get accessible board IDs for the user
const accessibleBoardIds = await getAccessibleBoardIds(user.cid, user.roles, user.adm);

// Only return posts from boards the user can access
const query = `
  SELECT p.*, b.name as board_name 
  FROM posts p 
  JOIN boards b ON p.board_id = b.id 
  WHERE p.board_id = ANY($1)
  ORDER BY p.created_at DESC
`;
const result = await query(query, [accessibleBoardIds]);
```

**Comments API (`/api/posts/[postId]/comments`):**
- Verifies post exists and user can access its board before serving comments
- Prevents unauthorized users from even knowing restricted posts exist

**Votes API (`/api/posts/[postId]/votes`):**
- Checks board permissions before allowing votes
- Prevents voting on restricted content

**Boards API (`/api/communities/[communityId]/boards`):**
- Filters board list to only show accessible boards
- Prevents enumeration of restricted boards

### Real-Time Security

Socket.IO events maintain the same security model:

**Room Access Control:**
- Users can only join board rooms they have permission to access
- `joinBoard` event performs full permission validation
- Failed permission checks return error events, not silent failures

**Event Broadcasting:**
- Real-time events are only sent to users in the relevant board room
- Automatic cleanup ensures no permission leaks on disconnection

### Security Vulnerabilities Fixed

During development, several critical security issues were identified and resolved:

1. **Home Feed Exposure**: The home page was showing posts from ALL boards, regardless of user permissions
   - **Fix**: Modified posts API to filter by accessible board IDs

2. **Board Enumeration**: Boards API returned all boards without permission filtering
   - **Fix**: Added `filterAccessibleBoards()` to boards API

3. **Comment Access**: Comments API didn't verify board permissions before serving comments
   - **Fix**: Added board permission check before returning comments

4. **Vote Manipulation**: Votes API allowed voting on posts from restricted boards
   - **Fix**: Added board permission validation to votes endpoints

5. **Real-Time Leaks**: Without proper room management, real-time events could leak across board boundaries
   - **Fix**: Implemented permission-aware room joining and automatic cleanup

### Permission Testing

The plugin includes comprehensive permission checking throughout:

**Development Testing:**
```typescript
// Test board access for different user roles
const canAccess = canUserAccessBoard(['member'], boardSettings, false);
console.log('Can member access board:', canAccess);

// Test filtered board lists
const accessibleBoards = await filterAccessibleBoards(allBoards, userRoles, isAdmin);
console.log('User can access', accessibleBoards.length, 'of', allBoards.length, 'boards');
```

**UI State Management:**
- Board settings form properly syncs state when switching between boards
- Permission changes immediately affect UI visibility
- Real-time updates respect current user's permissions

### Security Best Practices

**Server-Side Validation:**
- Never trust client-side permission checks
- Always validate permissions on the server for every request
- Use database-level filtering with `WHERE board_id IN (accessible_ids)`

**Principle of Least Privilege:**
- Users only see content they're explicitly allowed to access
- Failed permission checks don't reveal information about restricted content
- Board enumeration only shows accessible boards

**Defense in Depth:**
- Multiple layers of permission checking (JWT + board-level + content-level)
- Real-time and REST API use identical permission logic
- Automatic cleanup prevents permission state inconsistencies

**Audit Trail:**
- All permission checks are logged for debugging
- Database queries are logged with performance metrics
- Real-time events include user context for monitoring

## Getting Started

### Prerequisites
- Node.js 20+ and Yarn
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation
Install the dependencies:
```bash
yarn install
```

### Database Setup
Run the database migrations:
```bash
yarn migrate:up
```

### Development Server
Start the development server:
```bash
yarn dev  # Runs custom server with Next.js + Socket.IO
```

The project will start running on [http://localhost:3000](http://localhost:3000) with both the web interface and WebSocket server ready.

**Development Features:**
- 🔄 **Auto-reload**: `tsx watch` provides fast TypeScript compilation and restart
- 🔐 **Full Authentication**: JWT-based auth with board-level permissions
- ⚡ **Real-Time Events**: Socket.IO WebSocket connections for live updates
- 🐛 **Debug Logging**: Comprehensive logging for API requests and WebSocket events

### Production Build
Build for production:
```bash
yarn build  # Compiles Next.js + TypeScript server
yarn start  # Runs production server
```

### Testing the Plugin
Unfortunately, there's not a lot of use for running this project locally since, as a plugin, it requests all its data from Common Ground when running through an iframe.

To use this plugin, you have three options:

1. Use a reverse proxy (such as ngrok):
   - [Install ngrok](https://ngrok.com/docs/getting-started/)
   - Start your local dev server: `yarn dev` 
   - In a new terminal, start ngrok: `ngrok http 5000`
   - Copy the ngrok HTTPS URL (e.g. https://abc123.ngrok.io)
   - Register this URL as your plugin on Common Ground
   - Test the plugin functionality within Common Ground's interface

   Note: Only use ngrok for development/testing. Running a production plugin through ngrok could be a security risk.


2. Deploy and test it live:
   - Host this project on a server with a public URL (e.g. using Vercel, Netlify, etc.)
   - Register it as a plugin on Common Ground using your public URL
   - Test the plugin functionality within Common Ground's interface

3. Use it as a reference implementation:
   - Use it as a starting point for building your own custom plugin
   - Adapt the functionality to match your specific use case

## Gating System Architecture

This plugin implements a sophisticated **dual-system gating architecture** that combines powerful pre-verification workflow with beautiful, prominent UI displays. Understanding this architecture is crucial for maintaining and extending the gating functionality.

### System Overview: Slots vs Renderers

The gating system uses **two complementary systems** that serve different purposes:

1. **Slot System** (`GatingRequirementsPanel` + verification slots)
   - **Purpose**: Pre-verification workflow for commenters
   - **When**: Users prove requirements BEFORE commenting
   - **Features**: Database storage, 30-min expiry, signature collection
   - **UI**: Beautiful, prominent requirements display

2. **Renderer System** (`MultiCategoryConnection` + renderers)  
   - **Purpose**: Real-time connection UI and requirement display
   - **When**: Live feedback during wallet connection
   - **Features**: Dynamic status updates, wallet integration
   - **UI**: Used for certain display contexts

### The Slot System: Pre-Verification Workflow

**Core Philosophy**: Solve the "signature at submission time" UX problem by allowing users to verify gating requirements in advance.

#### Flow Diagram
```
Post Creation → Gating Config → Comment Attempt → Pre-Verification → Comment Success
     ↓              ↓              ↓               ↓                ↓
  [Poster Side] [Requirements] [Slot System] [Database Storage] [Bypassed Gating]
```

#### Database Schema
```sql
-- Pre-verification storage with expiry
CREATE TABLE pre_verifications (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  user_id TEXT NOT NULL,
  category_type TEXT NOT NULL, -- 'universal_profile', 'ethereum_profile'
  verification_data JSONB,     -- Signed challenges and proofs
  expires_at TIMESTAMP,        -- 30-minute expiry
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Verification States
- **`not_started`**: User hasn't attempted verification
- **`pending`**: User connected wallet, working on requirements  
- **`verified`**: Requirements met, signed challenge stored
- **`expired`**: Verification older than 30 minutes

### Component Architecture

#### 1. GatingRequirementsPanel (Orchestrator)
**Location**: `src/components/gating/GatingRequirementsPanel.tsx`

**Responsibilities**:
- Detects gating categories from post settings
- Routes to appropriate verification slots
- Manages overall verification state
- Handles post settings format conversion

**Key Methods**:
```typescript
// Determines which categories need verification
const gatingCategories = SettingsUtils.getGatingCategories(postSettings);

// Routes to verification slots
{gatingCategories.map(category => (
  category.type === 'universal_profile' ? 
    <LUKSOVerificationSlot key={category.id} {...category} /> :
    <EthereumVerificationSlot key={category.id} {...category} />
))}
```

#### 2. LUKSOVerificationSlot (Universal Profile Verification)
**Location**: `src/components/gating/LUKSOVerificationSlot.tsx`

**Integration with RichRequirementsDisplay**:
```typescript
// Maps slot state to rich component props
const extendedUserStatus: ExtendedVerificationStatus = {
  connected: isConnected && isCorrectChain,
  verified: currentStatus === 'verified',
  address: upAddress,
  mockBalances: {
    lyx: lyxBalance ? ethers.utils.parseEther(lyxBalance).toString() : undefined,
    tokens: {} // Real-time token balances
  }
};

// Beautiful UI with slot workflow
<RichRequirementsDisplay
  requirements={upRequirements}
  userStatus={extendedUserStatus}
  metadata={upMetadata}
  onConnect={handleRichConnect}
  className="border-0"
/>
```

**Verification Process**:
1. **Connection**: User connects Universal Profile wallet
2. **Requirements Check**: Real-time validation of LYX, tokens, followers
3. **Challenge Generation**: Server creates signed challenge
4. **Signature Collection**: User signs challenge with UP
5. **Database Storage**: Verification stored with 30-min expiry

#### 3. RichRequirementsDisplay (Beautiful UI Component)
**Location**: `src/components/gating/RichRequirementsDisplay.tsx`

**Key Features**:
- **Gradient backgrounds** based on verification status
- **Profile pictures** for follower requirements (10x10 with fallbacks)
- **Token icons** fetched from IPFS metadata
- **Real-time balance updates** with loading states
- **Detailed comparisons** ("Required vs You have")
- **Status-aware styling** with dynamic colors

**Visual States**:
```typescript
// Green gradient for verified requirements
className="bg-gradient-to-r from-green-50 to-green-100 border-green-200"

// Red gradient for failed requirements  
className="bg-gradient-to-r from-red-50 to-red-100 border-red-200"

// Amber gradient for pending verification
className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200"
```

### API Integration

#### Pre-Verification Endpoints
```typescript
// Generate challenge for verification
POST /api/posts/[postId]/challenge
// Input: { upAddress }
// Output: { challenge, message }

// Submit verified challenge  
POST /api/posts/[postId]/pre-verify/universal_profile
// Input: { challenge: signedChallenge }
// Output: { success: boolean }

// Check verification status
GET /api/posts/[postId]/verification-status  
// Output: { universal_profile: 'verified' | 'expired' | 'not_started' }
```

#### Comment Submission Flow
```typescript
// When user submits comment
POST /api/posts/[postId]/comments
// 1. Check for valid pre-verification
// 2. If verified: Allow comment without re-gating
// 3. If not verified: Return gating requirements error
// 4. Frontend shows GatingRequirementsPanel
```

### Legacy Compatibility

The system maintains **backward compatibility** with existing posts:

```typescript
// SettingsUtils.getGatingCategories() handles both formats
const hasLegacyUPGating = postSettings.responsePermissions?.upGating?.enabled;
const hasNewMultiCategory = postSettings.gatingCategories?.length > 0;

if (hasLegacyUPGating) {
  // Convert legacy format to new category format
  return [{
    id: 'universal_profile',
    type: 'universal_profile', 
    requirements: postSettings.responsePermissions.upGating.requirements
  }];
}
```

### Security Model

**Multi-Layer Verification**:
1. **Client-Side**: Beautiful UI feedback and wallet integration
2. **Server-Side**: Cryptographic challenge verification
3. **Database**: Tamper-proof storage with expiry
4. **Comment API**: Final verification check before allowing comments

**Challenge Structure**:
```typescript
interface VerificationChallenge {
  userId: string;
  postId: number; 
  timestamp: number;
  requirements: UPGatingRequirements;
  signature?: string; // Added after user signs
}
```

### Configuration

**Environment Variables**:
```bash
# Pre-verification expiry (seconds)
PRE_VERIFICATION_EXPIRY=1800  # 30 minutes

# LUKSO network configuration  
LUKSO_RPC_URL=https://rpc.mainnet.lukso.network
LUKSO_CHAIN_ID=42

# Universal Profile features
UP_IPFS_GATEWAY=https://ipfs.lukso.network/ipfs/
```

### Error Handling

**Graceful Degradation**:
- Network errors: Show retry options with exponential backoff
- Wallet errors: Clear error messages with connection help
- Expired verifications: Auto-prompt for re-verification
- Invalid signatures: Security error with fresh challenge generation

### Performance Optimizations

**Real-Time Updates**:
- Debounced balance checking (500ms)
- Cached profile picture fetching
- Lazy-loaded token icon resolution
- WebSocket connections for live verification status

**Database Efficiency**:
```sql
-- Optimized verification lookup
CREATE INDEX idx_pre_verifications_lookup 
ON pre_verifications(post_id, user_id, category_type, expires_at);

-- Automatic cleanup of expired verifications
DELETE FROM pre_verifications WHERE expires_at < NOW();
```

### Debugging

**Development Tools**:
```typescript
// Enable gating debug logging
localStorage.setItem('DEBUG_GATING', 'true');

// Check verification state
console.log('Verification Status:', await fetchVerificationStatus(postId));

// Inspect challenge generation
console.log('Challenge:', await generateChallenge(postId, upAddress));
```

**Common Issues**:
- **"Still seeing old UI"**: Check if post uses legacy vs new gating format
- **"Verification not persisting"**: Verify database connection and expiry times
- **"Rich UI not showing"**: Confirm slot system is routing to verification slots
- **"Balance not updating"**: Check LUKSO RPC connection and rate limiting

## Architecture

This plugin demonstrates a comprehensive full-stack architecture with real-time capabilities:

![diagram](https://github.com/user-attachments/assets/37a77777-160f-4e88-bd6b-63038e7285cc)

### Technology Stack

**Frontend:**
- Next.js 15 with App Router
- TypeScript with strict type checking
- Tailwind CSS + shadcn/ui components
- TanStack Query for data fetching
- Socket.IO client for real-time events

**Backend:**
- Custom Node.js server (Next.js + Socket.IO)
- JWT authentication with role-based permissions
- PostgreSQL with TypeScript migrations
- Real-time WebSocket connections
- RESTful API with comprehensive security

**Infrastructure:**
- Railway deployment (production)
- Docker Compose (local development)
- Environment-based configuration
- Automated build pipeline

### Key Architectural Decisions

1. **Custom Server Architecture**: Uses a custom Node.js server instead of standard Next.js to enable Socket.IO WebSocket functionality while maintaining all Next.js features.

2. **Permission-First Security**: Implements board-level permissions that are checked consistently across REST API, WebSocket events, and UI components.

3. **Real-Time Integration**: Socket.IO is integrated at the server level with JWT authentication, allowing API routes to broadcast events directly to connected clients.

4. **Type Safety**: Comprehensive TypeScript coverage from database schemas to WebSocket event types, ensuring runtime safety and developer experience.

5. **Scalable Deployment**: Architecture supports both development (auto-reload) and production (compiled) environments with the same codebase.


## Next steps

For details on how the Plugin Library works and more, be sure to check [the repo for the Plugin Library](https://github.com/Common-Ground-DAO/CGPluginLib)

## LUKSO RPC quirks

### Why we disable JSON-RPC batching

The `erc725.js` library makes two back-to-back `eth_call`s (`supportsInterface` + `getData`) whenever we load profile metadata.  When those calls are executed through an **ethers.js** `JsonRpcProvider` the provider will, by default, bundle them into a single JSON-RPC *batch* request.

Unfortunately the public LUKSO RPC (`https://rpc.mainnet.lukso.network`) rejects batched calls that contain an `eth_call` targeting a Universal-Profile **EOA** or proxy. The response looks like this:

```jsonc
{"error": {"code": -32600, "message": "invalid request"}}
```

Because of this, profile loading failed with *"LSP3Profile fetch failed … invalid request"* even though manual single-call `eth_call` invocations worked fine.

**Fix:** we disable batching globally for the provider used by `UPProfileFetcher`:

```ts
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
// LUKSO doesn't like batched eth_call, so force single requests
(provider as any)._maxBatchSize = 1;
```

This keeps everything 100 % standards-compliant, avoids private properties of the provider in production code elsewhere, and has zero performance impact for our modest request volume.
