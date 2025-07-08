 curia git:(feature/post-gating) ✗ yarn dev
yarn run v1.22.22
$ NODE_ENV=development tsx watch server.ts
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
  'NEXT_PUBLIC_LUKSO_TESTNET_CHAIN_ID'
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
 ✓ Compiled / in 2.1s (4478 modules)
 ⨯ Error: Must call the provided initialization method`init` method before using hooks.
    at useConnectWallet (src/contexts/UniversalProfileContext.tsx:95:72)
  93 |
  94 | export const UniversalProfileProvider: React.FC<UniversalProfileProviderProps> = ({ children }) => {
> 95 |   const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
     |                                                                        ^
  96 |   const [{ connectedChain }, setChain] = useSetChain();
  97 |   
  98 |   const [connectionError, setConnectionError] = useState<string | null>(null); {
  digest: '2270016739'
}
 GET /?iframeUid=7SXTDSLC37&cg_theme=light&cg_bg_color=%23F1F1F1 200 in 2764ms
 ✓ Compiled /favicon.ico in 381ms (2420 modules)
 GET /favicon.ico 200 in 442ms
 ○ Compiling /api/sign ...
 ✓ Compiled /api/sign in 524ms (4498 modules)
 POST /api/sign 200 in 554ms
 POST /api/sign 200 in 554ms
 POST /api/sign 200 in 11ms
 POST /api/sign 200 in 8ms
 ⨯ Error: Must call the provided initialization method`init` method before using hooks.
    at useConnectWallet (src/contexts/UniversalProfileContext.tsx:95:72)
  93 |
  94 | export const UniversalProfileProvider: React.FC<UniversalProfileProviderProps> = ({ children }) => {
> 95 |   const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();
     |                                                                        ^
  96 |   const [{ connectedChain }, setChain] = useSetChain();
  97 |   
  98 |   const [connectionError, setConnectionError] = useState<string | null>(null); {
  digest: '2270016739'
}
 GET /?iframeUid=RKMG2Z3Z8C&cg_theme=light&cg_bg_color=%23F1F1F1 200 in 322ms
 GET /favicon.ico 200 in 12ms
 POST /api/sign 200 in 159ms
 POST /api/sign 200 in 164ms
 POST /api/sign 200 in 207ms
 ○ Compiling /api/auth/session ...
 ✓ Compiled /api/auth/session in 1955ms (4578 modules)
[/api/auth/session] Parsed request body object immediately after parse: {
  userId: '86326068-5e1f-41b4-ba39-213402bf3601',
  name: 'ada',
  profilePictureUrl: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/92fabfefa725a7d28e2d1456fec31281fa1f4bcbee824c76c2484f135f2f42d7/20250604T122630Z/604800',
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
  iframeUid: 'RKMG2Z3Z8C',
  communityId: '1e5fb703-1805-42e7-927e-be3f7855856c',
  communityName: 'E.V.I.L. Clan'
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
  picture: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/92fabfefa725a7d28e2d1456fec31281fa1f4bcbee824c76c2484f135f2f42d7/20250604T122630Z/604800',
  adm: true,
  uid: 'RKMG2Z3Z8C',
  cid: '1e5fb703-1805-42e7-927e-be3f7855856c',
  roles: [
    'ecc34787-01a9-4738-8de3-1f8ea2b8842c',
    '13e22218-a84a-48e3-8473-f041b6500657',
    '6de3a592-c083-42b9-abc4-f0f293af0dad',
    '07c8e2c1-a4bc-4bac-9d5f-467d7e25037d',
    '2d853437-10da-4ff3-b3e1-88e2a07774f9',
    'a94bf56a-19c0-4e2c-93e6-35a8cc6ce98d'
  ]
}
[/api/auth/session] JWT Sign Options: { expiresIn: 3600 }
 POST /api/auth/session 200 in 2128ms
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
      avatarUrl: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/92fabfefa725a7d28e2d1456fec31281fa1f4bcbee824c76c2484f135f2f42d7/20250604T122630Z/604800',
      communityId: '1e5fb703-1805-42e7-927e-be3f7855856c',
      devices: [Array],
      totalDevices: 1,
      isOnline: true,
      primaryDevice: [Object],
      lastSeen: 2025-06-04T12:26:33.779Z
    }
  }
}
[Socket.IO Multi-Device Presence] User 86326068-5e1f-41b4-ba39-213402bf3601 connected with device RKMG2Z3Z8C (desktop). Total devices: 1
 ○ Compiling /api/communities/[communityId]/boards ...
 ✓ Compiled /api/communities/[communityId]/boards in 526ms (4584 modules)
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749039994
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
  duration: 1,
  rows: 1
}
 GET /api/communities 200 in 577ms
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749039994
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
  rows: 8
}
[API GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards] User 86326068-5e1f-41b4-ba39-213402bf3601 can access 8/8 boards
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards 200 in 866ms
 ✓ Compiled /api/communities/[communityId] in 190ms (4586 modules)
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749039995
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
  text: 'SELECT id, name, settings, created_at, updated_at FROM communities WHERE id = $1',
  duration: 2,
  rows: 1
}
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c 200 in 517ms
 ✓ Compiled /api/posts in 198ms (4589 modules)
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749039995
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
  text: 'SELECT id, settings FROM boards WHERE community_id = $1',
  duration: 1,
  rows: 8
}
executed query {
  text: '\n' +
    '      SELECT\n' +
    '        p.id, p.author_user_id, p.title, p.content, p.tags, p.settings,\n' +
    '        p.upvote_count, p.comment_count, p.created_at, p.updated_at,\n' +
    '        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,\n' +
    '        b.id AS board_id, b.name AS board_name\n' +
    '        , CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '      WHERE b.community_id = $2 AND p.board_id IN ($3, $4, $5, $6, $7, $8, $9, $10)\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC\n' +
    '      LIMIT $11;\n' +
    '    ',
  duration: 3,
  rows: 20
}
 GET /api/posts?limit=20 200 in 233ms
 ✓ Compiled /api/search/posts in 426ms (4591 modules)
[DB] Creating database pool...
[DB] Using DATABASE_URL for connection
executed query {
  text: 'SELECT \n' +
    '        p.id,\n' +
    '        p.author_user_id,\n' +
    '        p.title,\n' +
    '        p.content,\n' +
    '        p.tags,\n' +
    '        p.upvote_count,\n' +
    '        p.comment_count,\n' +
    '        p.created_at,\n' +
    '        p.updated_at,\n' +
    '        p.board_id,\n' +
    '        b.name AS board_name,\n' +
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      WHERE (p.title ILIKE $1 OR p.content ILIKE $1)\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC\n' +
    '      LIMIT $2',
  duration: 12,
  rows: 1
}
 GET /api/search/posts?q=lyx 200 in 455ms
 ✓ Compiled /board/[boardId]/post/[postId] in 393ms (4600 modules)
 GET /board/2/post/152?iframeUid=RKMG2Z3Z8C&cg_theme=light&cg_bg_color=%23F1F1F1 200 in 880ms
[Socket.IO] User disconnected: 86326068-5e1f-41b4-ba39-213402bf3601 (reason: client namespace disconnect)
[Socket.IO Multi-Device Presence] Device RKMG2Z3Z8C disconnected. Total devices: 0, Users: 1
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
      avatarUrl: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/92fabfefa725a7d28e2d1456fec31281fa1f4bcbee824c76c2484f135f2f42d7/20250604T122630Z/604800',
      communityId: '1e5fb703-1805-42e7-927e-be3f7855856c',
      devices: [Array],
      totalDevices: 1,
      isOnline: true,
      primaryDevice: [Object],
      lastSeen: 2025-06-04T12:26:47.958Z
    }
  }
}
[Socket.IO Multi-Device Presence] User 86326068-5e1f-41b4-ba39-213402bf3601 connected with device RKMG2Z3Z8C (desktop). Total devices: 1
[DB] Creating database pool...
[DB] Using DATABASE_URL for connection
executed query {
  text: 'SELECT id, community_id, settings, name FROM boards WHERE id = $1',
  duration: 23,
  rows: 1
}
[Socket.IO] User 86326068-5e1f-41b4-ba39-213402bf3601 joined board room: board:2
 ○ Compiling /api/posts/[postId]/comments ...
[Socket.IO Enhanced Broadcast] Event: userPresenceUpdate {
  globalRoom: true,
  specificRooms: [],
  invalidateForAllUsers: false,
  payload: {
    userPresence: {
      userId: '86326068-5e1f-41b4-ba39-213402bf3601',
      userName: 'ada',
      avatarUrl: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/92fabfefa725a7d28e2d1456fec31281fa1f4bcbee824c76c2484f135f2f42d7/20250604T122630Z/604800',
      communityId: '1e5fb703-1805-42e7-927e-be3f7855856c',
      devices: [Array],
      totalDevices: 1,
      isOnline: true,
      primaryDevice: [Object],
      lastSeen: 2025-06-04T12:26:47.984Z
    }
  }
}
 ✓ Compiled /api/posts/[postId]/comments in 739ms (4750 modules)
[LUKSO RPC] Using primary RPC: https://rpc.mainnet.lukso.network
[LUKSO RPC] Available fallbacks: https://rpc.mainnet.lukso.network, https://rpc.mainnet.lukso.network, https://42.rpc.thirdweb.com
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749040009
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
[API] GET /api/posts/152 called by user 86326068-5e1f-41b4-ba39-213402bf3601
executed query {
  text: '\n' +
    '      SELECT \n' +
    '        p.id,\n' +
    '        p.author_user_id,\n' +
    '        p.title,\n' +
    '        p.content,\n' +
    '        p.tags,\n' +
    '        p.settings,\n' +
    '        p.upvote_count,\n' +
    '        p.comment_count,\n' +
    '        p.created_at,\n' +
    '        p.updated_at,\n' +
    '        p.board_id,\n' +
    '        b.name as board_name,\n' +
    '        b.settings as board_settings,\n' +
    '        b.community_id,\n' +
    '        u.name as author_name,\n' +
    '        u.profile_picture_url as author_profile_picture_url,\n' +
    '        CASE WHEN v.user_id IS NOT NULL THEN true ELSE false END as user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN boards b ON p.board_id = b.id  \n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $2\n' +
    '      WHERE p.id = $1\n' +
    '    ',
  duration: 3,
  rows: 1
}
[API] Successfully retrieved post 152 for user 86326068-5e1f-41b4-ba39-213402bf3601
 GET /api/posts/152 200 in 1181ms
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749040009
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
[API] GET /api/posts/152 called by user 86326068-5e1f-41b4-ba39-213402bf3601
executed query {
  text: '\n' +
    '      SELECT \n' +
    '        p.id,\n' +
    '        p.author_user_id,\n' +
    '        p.title,\n' +
    '        p.content,\n' +
    '        p.tags,\n' +
    '        p.settings,\n' +
    '        p.upvote_count,\n' +
    '        p.comment_count,\n' +
    '        p.created_at,\n' +
    '        p.updated_at,\n' +
    '        p.board_id,\n' +
    '        b.name as board_name,\n' +
    '        b.settings as board_settings,\n' +
    '        b.community_id,\n' +
    '        u.name as author_name,\n' +
    '        u.profile_picture_url as author_profile_picture_url,\n' +
    '        CASE WHEN v.user_id IS NOT NULL THEN true ELSE false END as user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN boards b ON p.board_id = b.id  \n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $2\n' +
    '      WHERE p.id = $1\n' +
    '    ',
  duration: 1,
  rows: 1
}
[API] Successfully retrieved post 152 for user 86326068-5e1f-41b4-ba39-213402bf3601
 GET /api/posts/152 200 in 8ms
[LUKSO RPC] Using primary RPC: https://rpc.mainnet.lukso.network
[LUKSO RPC] Available fallbacks: https://rpc.mainnet.lukso.network, https://rpc.mainnet.lukso.network, https://42.rpc.thirdweb.com
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749040009
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
  text: 'SELECT p.board_id, b.settings, b.community_id \n' +
    '       FROM posts p \n' +
    '       JOIN boards b ON p.board_id = b.id \n' +
    '       WHERE p.id = $1',
  duration: 2,
  rows: 1
}
executed query {
  text: 'SELECT \n' +
    '        c.id,\n' +
    '        c.post_id,\n' +
    '        c.author_user_id,\n' +
    '        c.parent_comment_id,\n' +
    '        c.content,\n' +
    '        c.created_at,\n' +
    '        c.updated_at,\n' +
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url\n' +
    '      FROM comments c\n' +
    '      JOIN users u ON c.author_user_id = u.user_id\n' +
    '      WHERE c.post_id = $1\n' +
    '      ORDER BY c.created_at ASC',
  duration: 3,
  rows: 2
}
 GET /api/posts/152/comments 200 in 1229ms
Closing database pool...
 GET /favicon.ico 200 in 8ms
 GET /favicon.ico 200 in 6ms
 GET /favicon.ico 200 in 7ms
 GET /favicon.ico 200 in 3ms
 GET /favicon.ico 200 in 3ms
 GET /favicon.ico 200 in 3ms
 ✓ Compiled /api/posts/[postId]/challenge in 457ms (4752 modules)
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749040043
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
  text: 'SELECT p.id, p.title, p.settings as post_settings, p.board_id,\n' +
    '              b.settings as board_settings, b.community_id\n' +
    '       FROM posts p \n' +
    '       JOIN boards b ON p.board_id = b.id \n' +
    '       WHERE p.id = $1',
  duration: 2,
  rows: 1
}
[API POST /api/posts/152/challenge] Generated challenge for UP 0x0a607f902CAa16a27AA3Aabd968892aa89ABDa92, nonce: 37c944788a7256f10417da2cc5f61144
 POST /api/posts/152/challenge 200 in 798ms
Closing database pool...
[LUKSO RPC] Using primary RPC: https://rpc.mainnet.lukso.network
[LUKSO RPC] Available fallbacks: https://rpc.mainnet.lukso.network, https://rpc.mainnet.lukso.network, https://42.rpc.thirdweb.com
[withAuth] Token verified successfully. Decoded exp: 1749042288 Current time: 1749040053
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 4,
  rows: 1
}
executed query {
  text: 'SELECT p.board_id, b.settings, b.community_id \n' +
    '       FROM posts p \n' +
    '       JOIN boards b ON p.board_id = b.id \n' +
    '       WHERE p.id = $1',
  duration: 1,
  rows: 1
}
executed query {
  text: 'SELECT \n' +
    '        c.id,\n' +
    '        c.post_id,\n' +
    '        c.author_user_id,\n' +
    '        c.parent_comment_id,\n' +
    '        c.content,\n' +
    '        c.created_at,\n' +
    '        c.updated_at,\n' +
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url\n' +
    '      FROM comments c\n' +
    '      JOIN users u ON c.author_user_id = u.user_id\n' +
    '      WHERE c.post_id = $1\n' +
    '      ORDER BY c.created_at ASC',
  duration: 1,
  rows: 2
}
 GET /api/posts/152/comments 200 in 64ms
[LUKSO RPC] Using primary RPC: https://rpc.mainnet.lukso.network
[LUKSO RPC] Available fallbacks: https://rpc.mainnet.lukso.network, https://rpc.mainnet.lukso.network, https://42.rpc.thirdweb.com
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749040054
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
  text: 'SELECT p.board_id, b.settings, b.community_id \n' +
    '       FROM posts p \n' +
    '       JOIN boards b ON p.board_id = b.id \n' +
    '       WHERE p.id = $1',
  duration: 1,
  rows: 1
}
executed query {
  text: 'SELECT \n' +
    '        c.id,\n' +
    '        c.post_id,\n' +
    '        c.author_user_id,\n' +
    '        c.parent_comment_id,\n' +
    '        c.content,\n' +
    '        c.created_at,\n' +
    '        c.updated_at,\n' +
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url\n' +
    '      FROM comments c\n' +
    '      JOIN users u ON c.author_user_id = u.user_id\n' +
    '      WHERE c.post_id = $1\n' +
    '      ORDER BY c.created_at ASC',
  duration: 1,
  rows: 2
}
 GET /api/posts/152/comments 200 in 14ms
Closing database pool...
[LUKSO RPC] Using primary RPC: https://rpc.mainnet.lukso.network
[LUKSO RPC] Available fallbacks: https://rpc.mainnet.lukso.network, https://rpc.mainnet.lukso.network, https://42.rpc.thirdweb.com
Closing database pool...
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749040099
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 17,
  rows: 1
}
executed query {
  text: 'SELECT p.board_id, b.settings, b.community_id \n' +
    '       FROM posts p \n' +
    '       JOIN boards b ON p.board_id = b.id \n' +
    '       WHERE p.id = $1',
  duration: 2,
  rows: 1
}
executed query {
  text: 'SELECT \n' +
    '        c.id,\n' +
    '        c.post_id,\n' +
    '        c.author_user_id,\n' +
    '        c.parent_comment_id,\n' +
    '        c.content,\n' +
    '        c.created_at,\n' +
    '        c.updated_at,\n' +
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url\n' +
    '      FROM comments c\n' +
    '      JOIN users u ON c.author_user_id = u.user_id\n' +
    '      WHERE c.post_id = $1\n' +
    '      ORDER BY c.created_at ASC',
  duration: 2,
  rows: 2
}
 GET /api/posts/152/comments 200 in 30ms
[LUKSO RPC] Using primary RPC: https://rpc.mainnet.lukso.network
[LUKSO RPC] Available fallbacks: https://rpc.mainnet.lukso.network, https://rpc.mainnet.lukso.network, https://42.rpc.thirdweb.com
Closing database pool...
[withAuth] Token verified successfully. Decoded exp: 1749042288 Current time: 1749040134
[withAuth] Token verified successfully. Decoded exp: 1749042288 Current time: 1749040134
[withAuth] Token verified successfully. Decoded exp: 1749042288 Current time: 1749040134
[withAuth] Token verified successfully. Decoded exp: 1749042288 Current time: 1749040134
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 27,
  rows: 1
}
[withAuth] Token verified successfully. Decoded exp: 1749042288 Current time: 1749040134
executed query {
  text: 'SELECT id, community_id, name, description, settings, created_at, updated_at FROM boards WHERE community_id = $1 ORDER BY name ASC',
  duration: 2,
  rows: 8
}
[API GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards] User 62c3bebc-33a3-4926-b37d-47a1ba9f8e41 can access 6/8 boards
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards 200 in 41ms
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 23,
  rows: 1
}
[API] GET /api/posts/152 called by user 62c3bebc-33a3-4926-b37d-47a1ba9f8e41
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 18,
  rows: 1
}
[API] GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c called by user 62c3bebc-33a3-4926-b37d-47a1ba9f8e41
executed query {
  text: 'SELECT id, name, settings, created_at, updated_at FROM communities WHERE id = $1',
  duration: 1,
  rows: 1
}
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c 200 in 44ms
executed query {
  text: '\n' +
    '      SELECT \n' +
    '        p.id,\n' +
    '        p.author_user_id,\n' +
    '        p.title,\n' +
    '        p.content,\n' +
    '        p.tags,\n' +
    '        p.settings,\n' +
    '        p.upvote_count,\n' +
    '        p.comment_count,\n' +
    '        p.created_at,\n' +
    '        p.updated_at,\n' +
    '        p.board_id,\n' +
    '        b.name as board_name,\n' +
    '        b.settings as board_settings,\n' +
    '        b.community_id,\n' +
    '        u.name as author_name,\n' +
    '        u.profile_picture_url as author_profile_picture_url,\n' +
    '        CASE WHEN v.user_id IS NOT NULL THEN true ELSE false END as user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN boards b ON p.board_id = b.id  \n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $2\n' +
    '      WHERE p.id = $1\n' +
    '    ',
  duration: 4,
  rows: 1
}
[API] Successfully retrieved post 152 for user 62c3bebc-33a3-4926-b37d-47a1ba9f8e41
 GET /api/posts/152 200 in 45ms
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 13,
  rows: 1
}
executed query {
  text: 'SELECT p.board_id, b.settings, b.community_id \n' +
    '       FROM posts p \n' +
    '       JOIN boards b ON p.board_id = b.id \n' +
    '       WHERE p.id = $1',
  duration: 1,
  rows: 1
}
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
[API] GET /api/posts/152 called by user 62c3bebc-33a3-4926-b37d-47a1ba9f8e41
executed query {
  text: 'SELECT \n' +
    '        c.id,\n' +
    '        c.post_id,\n' +
    '        c.author_user_id,\n' +
    '        c.parent_comment_id,\n' +
    '        c.content,\n' +
    '        c.created_at,\n' +
    '        c.updated_at,\n' +
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url\n' +
    '      FROM comments c\n' +
    '      JOIN users u ON c.author_user_id = u.user_id\n' +
    '      WHERE c.post_id = $1\n' +
    '      ORDER BY c.created_at ASC',
  duration: 0,
  rows: 2
}
 GET /api/posts/152/comments 200 in 24ms
executed query {
  text: '\n' +
    '      SELECT \n' +
    '        p.id,\n' +
    '        p.author_user_id,\n' +
    '        p.title,\n' +
    '        p.content,\n' +
    '        p.tags,\n' +
    '        p.settings,\n' +
    '        p.upvote_count,\n' +
    '        p.comment_count,\n' +
    '        p.created_at,\n' +
    '        p.updated_at,\n' +
    '        p.board_id,\n' +
    '        b.name as board_name,\n' +
    '        b.settings as board_settings,\n' +
    '        b.community_id,\n' +
    '        u.name as author_name,\n' +
    '        u.profile_picture_url as author_profile_picture_url,\n' +
    '        CASE WHEN v.user_id IS NOT NULL THEN true ELSE false END as user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN boards b ON p.board_id = b.id  \n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $2\n' +
    '      WHERE p.id = $1\n' +
    '    ',
  duration: 1,
  rows: 1
}
[API] Successfully retrieved post 152 for user 62c3bebc-33a3-4926-b37d-47a1ba9f8e41
 GET /api/posts/152 200 in 24ms
[LUKSO RPC] Using primary RPC: https://rpc.mainnet.lukso.network
[LUKSO RPC] Available fallbacks: https://rpc.mainnet.lukso.network, https://rpc.mainnet.lukso.network, https://42.rpc.thirdweb.com
Closing database pool...
[Socket.IO Cleanup] Removed 1 stale devices affecting 1 users. Total devices: 0, Users: 1
[Socket.IO Enhanced Broadcast] Event: userOffline {
  globalRoom: true,
  specificRooms: [],
  invalidateForAllUsers: false,
  payload: { userId: '86326068-5e1f-41b4-ba39-213402bf3601' }
}
[withAuth] Token verified successfully. Decoded exp: 1749043593 Current time: 1749040161
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 1,
  rows: 1
}
executed query {
  text: 'SELECT p.board_id, b.settings, b.community_id \n' +
    '       FROM posts p \n' +
    '       JOIN boards b ON p.board_id = b.id \n' +
    '       WHERE p.id = $1',
  duration: 1,
  rows: 1
}
executed query {
  text: 'SELECT \n' +
    '        c.id,\n' +
    '        c.post_id,\n' +
    '        c.author_user_id,\n' +
    '        c.parent_comment_id,\n' +
    '        c.content,\n' +
    '        c.created_at,\n' +
    '        c.updated_at,\n' +
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url\n' +
    '      FROM comments c\n' +
    '      JOIN users u ON c.author_user_id = u.user_id\n' +
    '      WHERE c.post_id = $1\n' +
    '      ORDER BY c.created_at ASC',
  duration: 1,
  rows: 2
}
 GET /api/posts/152/comments 200 in 10ms
[LUKSO RPC] Using primary RPC: https://rpc.mainnet.lukso.network
[LUKSO RPC] Available fallbacks: https://rpc.mainnet.lukso.network, https://rpc.mainnet.lukso.network, https://42.rpc.thirdweb.com
Closing database pool...
