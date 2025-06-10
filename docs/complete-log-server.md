➜  curia2 git:(feature/ens) ✗ yarn dev
yarn run v1.22.22
$ NODE_ENV=development tsx watch server.ts
[TelegramService] Bot token not available in environment variables
[Server] dotenv.config attempt for .env: OK Parsed vars: [
  'NEXT_PUBLIC_PUBKEY',
  'NEXT_PRIVATE_PRIVKEY',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN_SECONDS',
  'NEXT_PUBLIC_ADMIN_ROLE_IDS',
  'NEXT_PUBLIC_IGNORED_ROLE_IDS',
  'NEXT_PUBLIC_SUPERADMIN_ID',
  'NEXT_PUBLIC_PLUGIN_INSTANCE_URL',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL',
  'NEXT_PUBLIC_LUKSO_MAINNET_CHAIN_ID',
  'NEXT_PUBLIC_LUKSO_TESTNET_RPC_URL',
  'NEXT_PUBLIC_LUKSO_TESTNET_CHAIN_ID',
  'NEXT_PUBLIC_LUKSO_IPFS_GATEWAY',
  'NEXT_PUBLIC_FORCE_SOCKET_POLLING_ON_UP',
  'TELEGRAM_BOT_API_TOKEN',
  'TELEGRAM_BOT_API_URL',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_CONNECT_SECRET',
  'TELEGRAM_BOT_NAME',
  'NEXT_PUBLIC_PLUGIN_BASE_URL',
  'NEXT_PUBLIC_COMMON_GROUND_BASE_URL'
]
[Server] dotenv.config attempt for .env.development (with override): OK Parsed vars: [ 'NEXT_PUBLIC_GNOSIS_RPC_URL' ]
[Server] Environment check: {
  NODE_ENV: 'development',
  hasJWT_SECRET: true,
  hasDATABASE_URL: true,
  PORT: '3000'
}
[Server] CustomEventEmitter initialized on process object
[Server] Preparing Next.js...
[Socket.IO] Initializing server...
[Socket.IO] Server instance created with global presence system
[Server] Ready on http://0.0.0.0:3000
[Socket.IO] WebSocket server ready with global presence system
 ○ Compiling / ...
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
[GatingCategories] Registering all category renderers...
[GatingRegistry] Registering category renderer: universal_profile
[GatingRegistry] Registering category renderer: ethereum_profile
[GatingCategories] Successfully registered 2 category renderers
Failed to generate cache key for https://rpc.mainnet.lukso.network
Failed to generate cache key for https://rpc.mainnet.lukso.network
 GET /?iframeUid=RBFBF7Z3QL&cg_theme=dark&cg_bg_color=%23161820 200 in 7728ms
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
 GET /favicon.ico 200 in 3023ms
 GET /?iframeUid=RBFBF7Z3QL&cg_theme=dark&cg_bg_color=%23161820 200 in 93ms
[GatingCategories] Registering all category renderers...
[GatingRegistry] Registering category renderer: universal_profile
[GatingRegistry] Registering category renderer: ethereum_profile
[GatingCategories] Successfully registered 2 category renderers
Failed to generate cache key for https://rpc.mainnet.lukso.network
Failed to generate cache key for https://rpc.mainnet.lukso.network
 GET /?iframeUid=4FZBPQNRDW&cg_theme=dark&cg_bg_color=%23161820 200 in 349ms
 GET /favicon.ico 200 in 9ms
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
 POST /api/sign 200 in 1276ms
 POST /api/sign 200 in 1277ms
[GatingCategories] Registering all category renderers...
[GatingRegistry] Registering category renderer: universal_profile
[GatingRegistry] Registering category renderer: ethereum_profile
[GatingCategories] Successfully registered 2 category renderers
Failed to generate cache key for https://rpc.mainnet.lukso.network
Failed to generate cache key for https://rpc.mainnet.lukso.network
 HEAD / 200 in 1441ms
 POST /api/sign 200 in 5ms
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
[/api/auth/session] Parsed request body object immediately after parse: {
  userId: '86326068-5e1f-41b4-ba39-213402bf3601',
  name: 'ada',
  profilePictureUrl: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/cd723a168b75060188a24308885bd6d2b9278e6a7f1438638bdeb0a352b70a92/20250610T100440Z/604800',
  roles: [
    'ecc34787-01a9-4738-8de3-1f8ea2b8842c',
    '13e22218-a84a-48e3-8473-f041b6500657',
    '6de3a592-c083-42b9-abc4-f0f293af0dad',
    '07c8e2c1-a4bc-4bac-9d5f-467d7e25037d',
    '2d853437-10da-4ff3-b3e1-88e2a07774f9',
    'a94bf56a-19c0-4e2c-93e6-35a8cc6ce98d'
  ],
  communityRoles: [
    {
      id: 'ecc34787-01a9-4738-8de3-1f8ea2b8842c',
      title: 'Member',
      type: 'PREDEFINED',
      permissions: [Array],
      assignmentRules: null
    },
    {
      id: '8e420cf8-d5b4-4543-9e93-8bac252bb5ee',
      title: 'Public',
      type: 'PREDEFINED',
      permissions: [],
      assignmentRules: null
    },
    {
      id: '91da67d8-0a9b-4c0d-a4b2-68bc4ba2e418',
      title: 'Moderator',
      type: 'CUSTOM_MANUAL_ASSIGN',
      permissions: [Array],
      assignmentRules: null
    },
    {
      id: '13e22218-a84a-48e3-8473-f041b6500657',
      title: 'Clan Member',
      type: 'CUSTOM_AUTO_ASSIGN',
      permissions: [Array],
      assignmentRules: [Object]
    },
    {
      id: '6de3a592-c083-42b9-abc4-f0f293af0dad',
      title: 'role_1',
      type: 'CUSTOM_MANUAL_ASSIGN',
      permissions: [],
      assignmentRules: null
    },
    {
      id: '07c8e2c1-a4bc-4bac-9d5f-467d7e25037d',
      title: 'role_2',
      type: 'CUSTOM_MANUAL_ASSIGN',
      permissions: [],
      assignmentRules: null
    },
    {
      id: '2d853437-10da-4ff3-b3e1-88e2a07774f9',
      title: 'role_3',
      type: 'CUSTOM_MANUAL_ASSIGN',
      permissions: [Array],
      assignmentRules: null
    },
    {
      id: 'a94bf56a-19c0-4e2c-93e6-35a8cc6ce98d',
      title: 'Admin',
      type: 'PREDEFINED',
      permissions: [Array],
      assignmentRules: null
    }
  ],
  iframeUid: '4FZBPQNRDW',
  communityId: '1e5fb703-1805-42e7-927e-be3f7855856c',
  communityName: 'E.V.I.L. Clan',
  communityShortId: 'evil',
  pluginId: '7c8fe4af-4ec0-496f-b5eb-705f2a32d0e9'
}
[/api/auth/session] Value of body.communityName immediately after parse: E.V.I.L. Clan
[/api/auth/session] Value of body.communityName right before community upsert: E.V.I.L. Clan
[DB] Creating database pool...
[DB] Using DATABASE_URL for connection
executed query {
  text: 'INSERT INTO communities (id, name, updated_at) VALUES ($1, $2, NOW())\n' +
    '           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();',
  duration: 16,
  rows: 1
}
[/api/auth/session] Upserted community: 1e5fb703-1805-42e7-927e-be3f7855856c with name parameter: E.V.I.L. Clan
executed query {
  text: 'INSERT INTO boards (community_id, name, description, updated_at)\n' +
    '           VALUES ($1, $2, $3, NOW())\n' +
    '           ON CONFLICT (community_id, name) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()\n' +
    '           RETURNING id;',
  duration: 2,
  rows: 1
}
[/api/auth/session] Upserted default board for community 1e5fb703-1805-42e7-927e-be3f7855856c. Board ID: 2
[/api/auth/session] User role titles derived: [ 'member', 'clan member', 'role_1', 'role_2', 'role_3', 'admin' ]
[/api/auth/session] Admin role titles from ENV: [ 'admin', 'moderator' ]
[/api/auth/session] Determined admin status based on role titles and env var: true
[/api/auth/session] Payload to sign (checking adm, uid, cid claims): {
  sub: '86326068-5e1f-41b4-ba39-213402bf3601',
  name: 'ada',
  picture: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/cd723a168b75060188a24308885bd6d2b9278e6a7f1438638bdeb0a352b70a92/20250610T100440Z/604800',
  adm: true,
  uid: '4FZBPQNRDW',
  cid: '1e5fb703-1805-42e7-927e-be3f7855856c',
  roles: [
    'ecc34787-01a9-4738-8de3-1f8ea2b8842c',
    '13e22218-a84a-48e3-8473-f041b6500657',
    '6de3a592-c083-42b9-abc4-f0f293af0dad',
    '07c8e2c1-a4bc-4bac-9d5f-467d7e25037d',
    '2d853437-10da-4ff3-b3e1-88e2a07774f9',
    'a94bf56a-19c0-4e2c-93e6-35a8cc6ce98d'
  ],
  communityShortId: 'evil',
  pluginId: '7c8fe4af-4ec0-496f-b5eb-705f2a32d0e9'
}
[/api/auth/session] JWT Sign Options: { expiresIn: 3600 }
 POST /api/auth/session 200 in 788ms
[Socket.IO Auth] Checking JWT. Secret available: true Value (first 5 chars): Aff_V
[Socket.IO] User authenticated: 86326068-5e1f-41b4-ba39-213402bf3601 (community: 1e5fb703-1805-42e7-927e-be3f7855856c)
[Socket.IO] User connected: 86326068-5e1f-41b4-ba39-213402bf3601 (ada)
[Socket.IO Enhanced Broadcast] Event: userOnline {
  globalRoom: true,
  specificRooms: [],
  invalidateForAllUsers: false,
  payload: {
    userPresence: {
      userId: '86326068-5e1f-41b4-ba39-213402bf3601',
      userName: 'ada',
      avatarUrl: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/cd723a168b75060188a24308885bd6d2b9278e6a7f1438638bdeb0a352b70a92/20250610T100440Z/604800',
      communityId: '1e5fb703-1805-42e7-927e-be3f7855856c',
      devices: [Array],
      totalDevices: 1,
      isOnline: true,
      primaryDevice: [Object],
      lastSeen: 2025-06-10T10:04:41.267Z
    }
  }
}
[Socket.IO Multi-Device Presence] User 86326068-5e1f-41b4-ba39-213402bf3601 connected with device 4FZBPQNRDW (desktop). Total devices: 1
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
[withAuth] Token verified successfully. Decoded exp: 1749553481 Current time: 1749549882
[DB] Creating database pool...
[DB] Using DATABASE_URL for connection
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 10,
  rows: 1
}
executed query {
  text: 'SELECT id, name, created_at, updated_at, settings FROM communities ORDER BY name ASC',
  duration: 2,
  rows: 1
}
 GET /api/communities 200 in 1291ms
[withAuth] Token verified successfully. Decoded exp: 1749553481 Current time: 1749549882
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 2,
  rows: 1
}
executed query {
  text: 'SELECT id, community_id, name, description, settings, created_at, updated_at FROM boards WHERE community_id = $1 ORDER BY name ASC',
  duration: 2,
  rows: 9
}
[API GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards] User 86326068-5e1f-41b4-ba39-213402bf3601 can access 9/9 boards
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards 200 in 1559ms
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
[withAuth] Token verified successfully. Decoded exp: 1749553481 Current time: 1749549883
[DB] Creating database pool...
[DB] Using DATABASE_URL for connection
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 10,
  rows: 1
}
[API] GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c called by user 86326068-5e1f-41b4-ba39-213402bf3601
executed query {
  text: '\n' +
    '      SELECT \n' +
    '        c.id, \n' +
    '        c.name, \n' +
    '        c.settings, \n' +
    '        c.created_at, \n' +
    '        c.updated_at,\n' +
    '        COALESCE(COUNT(tg.id), 0)::integer as telegram_groups_count\n' +
    '      FROM communities c\n' +
    '      LEFT JOIN telegram_groups tg ON c.id = tg.community_id AND tg.is_active = true\n' +
    '      WHERE c.id = $1\n' +
    '      GROUP BY c.id, c.name, c.settings, c.created_at, c.updated_at\n' +
    '    ',
  duration: 2,
  rows: 1
}
[API] Community 1e5fb703-1805-42e7-927e-be3f7855856c has 0 active Telegram groups
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c 200 in 937ms
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
 ⚠ ./node_modules/pino/lib/tools.js
Module not found: Can't resolve 'pino-pretty' in '/Users/florian/Git/curia2/node_modules/pino/lib'

Import trace for requested module:
./node_modules/pino/lib/tools.js
./node_modules/pino/pino.js
./node_modules/@walletconnect/logger/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/node_modules/@walletconnect/universal-provider/dist/index.es.js
./node_modules/@walletconnect/ethereum-provider/dist/index.es.js
./node_modules/@wagmi/connectors/dist/esm/walletConnect.js
./node_modules/@wagmi/connectors/dist/esm/exports/index.js
./node_modules/wagmi/dist/esm/exports/connectors.js
./node_modules/@rainbow-me/rainbowkit/dist/index.js
./src/app/providers.tsx
[TelegramService] Initialized with bot token
[withAuth] Token verified successfully. Decoded exp: 1749553481 Current time: 1749549885
[DB] Creating database pool...
[DB] Using DATABASE_URL for connection
[withAuth] Token verified successfully. Decoded exp: 1749553481 Current time: 1749549885
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 10,
  rows: 1
}
[API /api/telegram/groups] Fetching groups for community 1e5fb703-1805-42e7-927e-be3f7855856c by admin 86326068-5e1f-41b4-ba39-213402bf3601
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 12,
  rows: 1
}
executed query {
  text: '\n' +
    '        SELECT * FROM telegram_groups \n' +
    '        WHERE community_id = $1 AND is_active = true\n' +
    '        ORDER BY created_at DESC\n' +
    '      ',
  duration: 1,
  rows: 0
}
[API /api/telegram/groups] Returning 0 groups for community 1e5fb703-1805-42e7-927e-be3f7855856c
 GET /api/telegram/groups 200 in 1313ms
executed query {
  text: 'SELECT id, settings FROM boards WHERE community_id = $1',
  duration: 2,
  rows: 9
}
executed query {
  text: '\n' +
    '      SELECT\n' +
    '        p.id, p.author_user_id, p.title, p.content, p.tags, p.settings,\n' +
    '        p.upvote_count, p.comment_count, p.created_at, p.updated_at,\n' +
    '        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,\n' +
    '        b.id AS board_id, b.name AS board_name,\n' +
    '        COALESCE(share_stats.total_access_count, 0) as share_access_count,\n' +
    '        COALESCE(share_stats.share_count, 0) as share_count,\n' +
    '        share_stats.last_shared_at,\n' +
    '        share_stats.most_recent_access_at\n' +
    '        , CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      LEFT JOIN (\n' +
    '        SELECT \n' +
    '          post_id,\n' +
    '          SUM(access_count) as total_access_count,\n' +
    '          COUNT(*) as share_count,\n' +
    '          MAX(created_at) as last_shared_at,\n' +
    '          MAX(last_accessed_at) as most_recent_access_at\n' +
    '        FROM links \n' +
    '        WHERE expires_at IS NULL OR expires_at > NOW()\n' +
    '        GROUP BY post_id\n' +
    '      ) share_stats ON p.id = share_stats.post_id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '      WHERE b.community_id = $2 AND p.board_id IN ($3, $4, $5, $6, $7, $8, $9, $10, $11)\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC\n' +
    '      LIMIT $12;\n' +
    '    ',
  duration: 3,
  rows: 20
}
 GET /api/posts?limit=20 200 in 1317ms
yarn 