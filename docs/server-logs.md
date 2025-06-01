 profilePictureUrl: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/9bce35c91289d38760d31d45badaf73617265488063c00ae4934dada79cf6c41/20250601T121841Z/604800',
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
  iframeUid: 'EKFTM88BEQ',
  communityId: '1e5fb703-1805-42e7-927e-be3f7855856c',
  communityName: 'E.V.I.L. Clan'
}
[/api/auth/session] Value of body.communityName immediately after parse: E.V.I.L. Clan
[/api/auth/session] Value of body.communityName right before community upsert: E.V.I.L. Clan
executed query {
  text: 'INSERT INTO communities (id, name, updated_at) VALUES ($1, $2, NOW())\n' +
    '           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();',
  duration: 3,
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
  picture: 'https://app.cg/files/7dd3e956a817a82fd6b948ff99608c4b4dd7d48c12a5cef04cea5beedc0cd911/9bce35c91289d38760d31d45badaf73617265488063c00ae4934dada79cf6c41/20250601T121841Z/604800',
  adm: true,
  uid: 'EKFTM88BEQ',
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
 POST /api/auth/session 200 in 12ms
 ✓ Compiled /api/communities/[communityId] in 102ms (2078 modules)
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780322
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
  duration: 11,
  rows: 1
}
executed query {
  text: 'SELECT id, community_id, name, description, settings, created_at, updated_at FROM boards WHERE community_id = $1 ORDER BY name ASC',
  duration: 2,
  rows: 6
}
[API GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards] User 86326068-5e1f-41b4-ba39-213402bf3601 can access 6/6 boards
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards 200 in 19ms
[Socket.IO Auth] Checking JWT. Secret available: true Value (first 5 chars): Aff_V
[Socket.IO] User authenticated: 86326068-5e1f-41b4-ba39-213402bf3601 (community: 1e5fb703-1805-42e7-927e-be3f7855856c)
[Socket.IO] User connected: 86326068-5e1f-41b4-ba39-213402bf3601 (ada)
[withAuth] Token verified successfully. Decoded exp: 1748783920 Current time: 1748780322
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780322
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 3,
  rows: 1
}
[API] GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c called by user 62c3bebc-33a3-4926-b37d-47a1ba9f8e41
executed query {
  text: 'SELECT id, name, settings, created_at, updated_at FROM communities WHERE id = $1',
  duration: 2,
  rows: 1
}
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c 200 in 443ms
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
[API] GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c called by user 86326068-5e1f-41b4-ba39-213402bf3601
executed query {
  text: 'SELECT id, name, settings, created_at, updated_at FROM communities WHERE id = $1',
  duration: 1,
  rows: 1
}
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c 200 in 99ms
 ✓ Compiled /api/posts in 115ms (2081 modules)
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780322
[DB] Creating database pool...
[DB] Using DATABASE_URL for connection
[withAuth] Token verified successfully. Decoded exp: 1748783920 Current time: 1748780322
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
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 11,
  rows: 1
}
executed query {
  text: 'SELECT id, settings FROM boards WHERE community_id = $1',
  duration: 1,
  rows: 6
}
executed query {
  text: 'SELECT id, settings FROM boards WHERE community_id = $1',
  duration: 2,
  rows: 6
}
executed query {
  text: '\n' +
    '      SELECT\n' +
    '        p.id, p.author_user_id, p.title, p.content, p.tags,\n' +
    '        p.upvote_count, p.comment_count, p.created_at, p.updated_at,\n' +
    '        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,\n' +
    '        b.id AS board_id, b.name AS board_name\n' +
    '        , CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '      WHERE b.community_id = $2 AND p.board_id IN ($3, $4, $5, $6, $7, $8)\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC\n' +
    '      LIMIT $9;\n' +
    '    ',
  duration: 2,
  rows: 20
}
 GET /api/posts?limit=20 200 in 148ms
executed query {
  text: '\n' +
    '      SELECT\n' +
    '        p.id, p.author_user_id, p.title, p.content, p.tags,\n' +
    '        p.upvote_count, p.comment_count, p.created_at, p.updated_at,\n' +
    '        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,\n' +
    '        b.id AS board_id, b.name AS board_name\n' +
    '        , CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '      WHERE b.community_id = $2 AND p.board_id IN ($3, $4, $5, $6)\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC\n' +
    '      LIMIT $7;\n' +
    '    ',
  duration: 3,
  rows: 20
}
 GET /api/posts?limit=20 200 in 150ms
 GET /?iframeUid=8L76N9W7UC&cg_theme=dark&cg_bg_color=%23161820&communityId=1e5fb703-1805-42e7-927e-be3f7855856c&boardId=2 200 in 49ms
executed query {
  text: 'SELECT id, community_id, settings FROM boards WHERE id = $1',
  duration: 2,
  rows: 1
}
[Socket.IO] User 62c3bebc-33a3-4926-b37d-47a1ba9f8e41 joined board room: board:2
[withAuth] Token verified successfully. Decoded exp: 1748783920 Current time: 1748780325
[withAuth] Token verified successfully. Decoded exp: 1748783920 Current time: 1748780325
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 5,
  rows: 1
}
executed query {
  text: 'SELECT id, settings FROM boards WHERE community_id = $1',
  duration: 0,
  rows: 6
}
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
  text: 'SELECT id, community_id, name, description, settings, created_at, updated_at FROM boards WHERE community_id = $1 ORDER BY name ASC',
  duration: 1,
  rows: 6
}
[API GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards] User 62c3bebc-33a3-4926-b37d-47a1ba9f8e41 can access 4/6 boards
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards 200 in 11ms
executed query {
  text: '\n' +
    '      SELECT\n' +
    '        p.id, p.author_user_id, p.title, p.content, p.tags,\n' +
    '        p.upvote_count, p.comment_count, p.created_at, p.updated_at,\n' +
    '        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,\n' +
    '        b.id AS board_id, b.name AS board_name\n' +
    '        , CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '      WHERE b.community_id = $2 AND p.board_id = $3\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC\n' +
    '      LIMIT $4;\n' +
    '    ',
  duration: 1,
  rows: 11
}
 GET /api/posts?limit=20&boardId=2 200 in 14ms
 GET /?iframeUid=EKFTM88BEQ&cg_theme=dark&cg_bg_color=%23161820&communityId=1e5fb703-1805-42e7-927e-be3f7855856c&boardId=2 200 in 10ms
executed query {
  text: 'SELECT id, community_id, settings FROM boards WHERE id = $1',
  duration: 3,
  rows: 1
}
[Socket.IO] User 86326068-5e1f-41b4-ba39-213402bf3601 joined board room: board:2
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780327
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780327
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
  text: 'SELECT id, settings FROM boards WHERE community_id = $1',
  duration: 1,
  rows: 6
}
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
  text: 'SELECT id, community_id, name, description, settings, created_at, updated_at FROM boards WHERE community_id = $1 ORDER BY name ASC',
  duration: 1,
  rows: 6
}
[API GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards] User 86326068-5e1f-41b4-ba39-213402bf3601 can access 6/6 boards
 GET /api/communities/1e5fb703-1805-42e7-927e-be3f7855856c/boards 200 in 13ms
executed query {
  text: '\n' +
    '      SELECT\n' +
    '        p.id, p.author_user_id, p.title, p.content, p.tags,\n' +
    '        p.upvote_count, p.comment_count, p.created_at, p.updated_at,\n' +
    '        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,\n' +
    '        b.id AS board_id, b.name AS board_name\n' +
    '        , CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '      WHERE b.community_id = $2 AND p.board_id = $3\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC\n' +
    '      LIMIT $4;\n' +
    '    ',
  duration: 2,
  rows: 11
}
 GET /api/posts?limit=20&boardId=2 200 in 15ms
 ✓ Compiled /api/search/posts in 237ms (2083 modules)
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 15,
  rows: 5
}
 GET /api/search/posts?q=sdfsd 200 in 273ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 14,
  rows: 5
}
 GET /api/search/posts?q=sdfsdfsd 200 in 125ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 16,
  rows: 5
}
 GET /api/search/posts?q=sdfsdfs 200 in 135ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 18,
  rows: 5
}
 GET /api/search/posts?q=sdf 200 in 276ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 16,
  rows: 5
}
 GET /api/search/posts?q=sdfs 200 in 277ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 16,
  rows: 5
}
 GET /api/search/posts?q=sdfsdfsdf 200 in 42ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 18,
  rows: 5
}
 GET /api/search/posts?q=sdfsdf 200 in 207ms
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780339
executed query {
  text: 'INSERT INTO users (user_id, name, profile_picture_url, updated_at)\n' +
    '             VALUES ($1, $2, $3, NOW())\n' +
    '             ON CONFLICT (user_id)\n' +
    '             DO UPDATE SET\n' +
    '               name = EXCLUDED.name,\n' +
    '               profile_picture_url = EXCLUDED.profile_picture_url,\n' +
    '               updated_at = NOW();',
  duration: 3,
  rows: 1
}
executed query {
  text: 'SELECT id, settings FROM boards WHERE id = $1 AND community_id = $2',
  duration: 2,
  rows: 1
}
executed query {
  text: 'INSERT INTO posts (author_user_id, title, content, tags, board_id, upvote_count, comment_count) VALUES ($1, $2, $3, $4, $5, 0, 0) RETURNING *',
  duration: 3,
  rows: 1
}
[API] POST /api/posts called by user: 86326068-5e1f-41b4-ba39-213402bf3601 with body: {
  title: 'sdfsdfsdf',
  content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfasdfasdf"}]}]}',
  tags: [ 'sdsd' ],
  boardId: '2'
}
 POST /api/posts 201 in 35ms
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780339
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
  text: 'SELECT id, settings FROM boards WHERE community_id = $1',
  duration: 1,
  rows: 6
}
executed query {
  text: '\n' +
    '      SELECT\n' +
    '        p.id, p.author_user_id, p.title, p.content, p.tags,\n' +
    '        p.upvote_count, p.comment_count, p.created_at, p.updated_at,\n' +
    '        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,\n' +
    '        b.id AS board_id, b.name AS board_name\n' +
    '        , CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '      WHERE b.community_id = $2 AND p.board_id = $3\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC\n' +
    '      LIMIT $4;\n' +
    '    ',
  duration: 2,
  rows: 12
}
 GET /api/posts?limit=20&boardId=2 200 in 10ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 3,
  rows: 1
}
 GET /api/search/posts?q=was 200 in 11ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasd 200 in 6ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 3,
  rows: 0
}
 GET /api/search/posts?q=wasdf 200 in 6ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfa 200 in 8ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 3,
  rows: 0
}
 GET /api/search/posts?q=wasdfas 200 in 10ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdf 200 in 10ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfasd 200 in 11ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdfa 200 in 5ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdfas 200 in 6ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 3,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdfasd 200 in 6ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdfasdf 200 in 8ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdfasdfa 200 in 8ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 3,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdfasdfas 200 in 6ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdfasdfasd 200 in 6ms
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
    '        u.name AS author_name,\n' +
    '        u.profile_picture_url AS author_profile_picture_url,\n' +
    "        false AS user_has_upvoted -- Search results don't need user-specific vote status for suggestions\n" +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      WHERE p.title ILIKE $1 OR p.content ILIKE $1\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC -- Or by relevance if using FTS\n' +
    '      LIMIT $2',
  duration: 2,
  rows: 0
}
 GET /api/search/posts?q=wasdfasdfasdfasdf 200 in 9ms
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780356
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
  text: 'SELECT id, settings FROM boards WHERE id = $1 AND community_id = $2',
  duration: 0,
  rows: 1
}
executed query {
  text: 'INSERT INTO posts (author_user_id, title, content, tags, board_id, upvote_count, comment_count) VALUES ($1, $2, $3, $4, $5, 0, 0) RETURNING *',
  duration: 1,
  rows: 1
}
[API] POST /api/posts called by user: 86326068-5e1f-41b4-ba39-213402bf3601 with body: {
  title: 'wasdfasdfasdfasdf',
  content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',
  tags: [ '34' ],
  boardId: '2'
}
 POST /api/posts 201 in 13ms
[withAuth] Token verified successfully. Decoded exp: 1748783921 Current time: 1748780356
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
  text: 'SELECT id, settings FROM boards WHERE community_id = $1',
  duration: 2,
  rows: 6
}
executed query {
  text: '\n' +
    '      SELECT\n' +
    '        p.id, p.author_user_id, p.title, p.content, p.tags,\n' +
    '        p.upvote_count, p.comment_count, p.created_at, p.updated_at,\n' +
    '        u.name AS author_name, u.profile_picture_url AS author_profile_picture_url,\n' +
    '        b.id AS board_id, b.name AS board_name\n' +
    '        , CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted\n' +
    '      FROM posts p\n' +
    '      JOIN users u ON p.author_user_id = u.user_id\n' +
    '      JOIN boards b ON p.board_id = b.id\n' +
    '      LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1\n' +
    '      WHERE b.community_id = $2 AND p.board_id = $3\n' +
    '      ORDER BY p.upvote_count DESC, p.created_at DESC, p.id DESC\n' +
    '      LIMIT $4;\n' +
    '    ',
  duration: 2,
  rows: 13
}
 GET /api/posts?limit=20&boardId=2 200 in 22ms
