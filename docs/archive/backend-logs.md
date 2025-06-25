}
[API POST /api/posts/152/challenge] Generated challenge for UP 0x0a607f902CAa16a27AA3Aabd968892aa89ABDa92, nonce: 950f2ffbde8b9b6a411e4cc244e08693
 POST /api/posts/152/challenge 200 in 619ms
Closing database pool...
[withAuth] Token verified successfully. Decoded exp: 1749036520 Current time: 1749032974
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
  text: 'SELECT p.board_id, p.title as post_title, p.settings as post_settings, \n' +
    '              b.settings as board_settings, b.community_id, b.name as board_name\n' +
    '       FROM posts p \n' +
    '       JOIN boards b ON p.board_id = b.id \n' +
    '       WHERE p.id = $1',
  duration: 1,
  rows: 1
}
[API POST /api/posts/152/comments] Post has UP gating enabled, verifying challenge...
[verifyUPSignature] Error verifying signature: Error: could not detect network (event="noNetwork", code=NETWORK_ERROR, version=providers/5.8.0)
    at Generator.throw (<anonymous>) {
  reason: 'could not detect network',
  code: 'NETWORK_ERROR',
  event: 'noNetwork'
}
 POST /api/posts/152/comments 401 in 74ms
Closing database pool...
[withAuth] Token verified successfully. Decoded exp: 1749036520 Current time: 1749032996
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
  duration: 2,
  rows: 2
}
 GET /api/posts/152/comments 200 in 20ms
Closing database pool...
[withAuth] Token verified successfully. Decoded exp: 1749036520 Current time: 1749033042
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
 GET /api/posts/152/comments 200 in 20ms
Closing database pool...
[withAuth] Token verified successfully. Decoded exp: 1749036507 Current time: 1749033045
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
  duration: 0,
  rows: 2
}
 GET /api/posts/152/comments 200 in 8ms
Closing database pool...
[Socket.IO Cleanup] Removed 1 stale devices affecting 1 users. Total devices: 1, Users: 2
[Socket.IO Enhanced Broadcast] Event: userOffline {
  globalRoom: true,
  specificRooms: [],
  invalidateForAllUsers: false,
  payload: { userId: '62c3bebc-33a3-4926-b37d-47a1ba9f8e41' }
}
[Socket.IO Cleanup] Removed 1 stale devices affecting 1 users. Total devices: 0, Users: 1
[Socket.IO Enhanced Broadcast] Event: userOffline {
  globalRoom: true,
  specificRooms: [],
  invalidateForAllUsers: false,
  payload: { userId: '86326068-5e1f-41b4-ba39-213402bf3601' }
}
