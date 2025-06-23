import { NextRequest, NextResponse } from 'next/server';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '@/lib/db'; // For potential initial user data sync

// Helper function for background friends sync
async function syncFriendsInBackground(
  userId: string, 
  friends: Array<{ id: string; name: string; image?: string }>
): Promise<void> {
  console.log(`[Friends Background Sync] Starting sync for ${userId} with ${friends.length} friends`);
  
  let syncedCount = 0;
  const errors: string[] = [];

  for (const friend of friends) {
    try {
      // Validate friend data
      if (!friend.id || !friend.name) {
        errors.push(`Invalid friend data: missing id or name`);
        continue;
      }

      // Ensure friend user exists in users table
      await query(
        `INSERT INTO users (user_id, name, profile_picture_url, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET 
           name = COALESCE(EXCLUDED.name, users.name),
           profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, users.profile_picture_url),
           updated_at = NOW();`,
        [friend.id, friend.name, friend.image || null]
      );

      // Upsert friendship record
      await query(
        `INSERT INTO user_friends (user_id, friend_user_id, friend_name, friend_image_url, friendship_status, synced_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', NOW(), NOW(), NOW())
         ON CONFLICT (user_id, friend_user_id) DO UPDATE SET
           friend_name = EXCLUDED.friend_name,
           friend_image_url = EXCLUDED.friend_image_url,
           friendship_status = 'active',
           synced_at = NOW(),
           updated_at = NOW();`,
        [userId, friend.id, friend.name, friend.image || null]
      );

      syncedCount++;
      
    } catch (dbError) {
      console.error(`[Friends Background Sync] Error syncing friend ${friend.id}:`, dbError);
      errors.push(`Failed to sync friend ${friend.name} (${friend.id}): ${dbError}`);
    }
  }

  console.log(`[Friends Background Sync] Completed for ${userId}. Synced: ${syncedCount}/${friends.length}${errors.length > 0 ? `, Errors: ${errors.length}` : ''}`);
  
  if (errors.length > 0) {
    console.warn(`[Friends Background Sync] Sync errors for ${userId}:`, errors);
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
// Use seconds for expiresIn to satisfy linter with current @types/jsonwebtoken
const JWT_EXPIRES_IN_SECONDS = parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '3600', 10); 

interface CommunityRole {
  id: string;
  title: string;
  // Add other properties from Community Info roles if needed by the backend
}

interface SessionRequestBody {
  userId: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  roles?: string[]; // User's role IDs
  communityRoles?: CommunityRole[]; // Full list of community role definitions
  iframeUid?: string | null;
  communityId?: string | null;
  communityName?: string | null; // Added for community upsert
  communityShortId?: string | null; // 🆕 Short ID for URL construction
  pluginId?: string | null;         // 🆕 Plugin ID from context
  friends?: Array<{             // 🆕 Friends data from CG lib
    id: string;
    name: string;
    image?: string;
  }>;
}

// This should match or be compatible with JwtPayload in withAuth.ts
// For consistency, we can import it if withAuth.ts exports it, 
// or redefine it if it's kept internal to withAuth.ts.
// For now, let's assume the key claims for signing are sub, name, picture, adm.
interface TokenSignPayload {
  sub: string;
  name?: string | null;
  picture?: string | null;
  adm?: boolean;
  uid?: string | null;
  cid?: string | null;
  roles?: string[]; // Add user roles to JWT
  communityShortId?: string; // 🆕 Short ID for URL construction
  pluginId?: string;         // 🆕 Plugin ID from context
  previousVisit?: string | null; // 🆕 ISO timestamp of user's last visit
}

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not configured for signing tokens.');
    return NextResponse.json(
      { error: 'Configuration error' },
      { status: 500 }
    );
  }

  try {
    const rawBodyText = await req.text(); 
    // console.log('[/api/auth/session] Received raw request body text:', rawBodyText); // Optional: keep if useful
    const body = JSON.parse(rawBodyText) as SessionRequestBody; 
    console.log('[/api/auth/session] Parsed request body object immediately after parse:', body);
    console.log('[/api/auth/session] Value of body.communityName immediately after parse:', body.communityName);

    const { userId, name, profilePictureUrl, roles: userRoleIds, communityRoles, iframeUid, communityId, communityShortId, pluginId /*, communityName - will access directly from body */ } = body;
    // console.log('[/api/auth/session] Destructured user role IDs:', userRoleIds);
    // console.log('[/api/auth/session] Destructured communityRoles:', communityRoles);
    // console.log('[/api/auth/session] Destructured iframeUid:', iframeUid);
    // console.log('[/api/auth/session] Destructured communityId:', communityId);
    // console.log('[/api/auth/session] Destructured communityName (from destructuring):', communityName); // This was showing undefined

    if (!userId || !iframeUid || !communityId) { 
      return NextResponse.json(
        { error: 'User ID, iframeUid, and Community ID are required for session' },
        { status: 400 }
      );
    }

    // 🆕 Declare previousVisit at function level for JWT payload
    let previousVisit: string | null = null;

    // --- Community and Default Board Upsert Logic --- 
    if (communityId) {
      try {
        const nameForCommunityUpsert = body.communityName; // Explicit access from body again
        console.log('[/api/auth/session] Value of body.communityName right before community upsert:', nameForCommunityUpsert);
        
        // 🆕 FIRST: Capture user's previous visit timestamp BEFORE updating anything
        try {
          const userResult = await query(
            `SELECT updated_at FROM users WHERE user_id = $1`,
            [userId]
          );
          
          if (userResult.rows.length > 0) {
            previousVisit = userResult.rows[0].updated_at;
            console.log(`[/api/auth/session] Captured previous visit for user ${userId}:`, previousVisit);
          } else {
            console.log(`[/api/auth/session] First-time user ${userId} - no previous visit`);
          }
        } catch (error) {
          console.error(`[/api/auth/session] Error capturing previous visit for user ${userId}:`, error);
          // Continue without previousVisit - non-critical for session creation
        }
        
        // 1. Upsert Community with CG lib metadata
        await query(
          `INSERT INTO communities (id, name, community_short_id, plugin_id, updated_at) 
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (id) DO UPDATE SET 
             name = EXCLUDED.name, 
             community_short_id = COALESCE(EXCLUDED.community_short_id, communities.community_short_id),
             plugin_id = COALESCE(EXCLUDED.plugin_id, communities.plugin_id),
             updated_at = NOW();`,
                     [communityId, nameForCommunityUpsert || communityId, communityShortId ?? null, pluginId ?? null]
        );
        console.log(`[/api/auth/session] Upserted community: ${communityId} with metadata (short_id: ${communityShortId}, plugin_id: ${pluginId})`);

        // 2. Upsert Default Board for this Community
        const defaultBoardName = 'General Discussion';
        const defaultBoardDescription = 'Main discussion board for the community.';
        const boardResult = await query(
          `INSERT INTO boards (community_id, name, description, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (community_id, name) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
           RETURNING id;`,
          [communityId, defaultBoardName, defaultBoardDescription]
        );
        console.log(`[/api/auth/session] Upserted default board for community ${communityId}. Board ID: ${boardResult.rows[0]?.id}`);

        // 3. Ensure user record exists before creating user-community relationship
        await query(
          `INSERT INTO users (user_id, name, profile_picture_url, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id) DO UPDATE SET 
             name = COALESCE(EXCLUDED.name, users.name),
             profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, users.profile_picture_url),
             updated_at = NOW();`,
          [userId, name ?? null, profilePictureUrl ?? null]
        );

        // 4. Track user-community relationship for cross-device "What's New"
        const userCommunityResult = await query(
          `INSERT INTO user_communities (user_id, community_id, first_visited_at, last_visited_at, visit_count, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW(), 1, NOW(), NOW())
           ON CONFLICT (user_id, community_id) DO UPDATE SET 
             last_visited_at = NOW(),
             visit_count = user_communities.visit_count + 1,
             updated_at = NOW()
           RETURNING visit_count, first_visited_at;`,
          [userId, communityId]
        );
        
        const visitInfo = userCommunityResult.rows[0];
        console.log(`[/api/auth/session] Updated user-community relationship for ${userId} in ${communityId}. Visit count: ${visitInfo?.visit_count}, First visit: ${visitInfo?.first_visited_at}`);

        // 5. Auto-sync friends if provided (non-blocking)
        if (body.friends && Array.isArray(body.friends) && body.friends.length > 0) {
          console.log(`[/api/auth/session] Starting automatic friends sync for ${userId} (${body.friends.length} friends)`);
          
          // Run friends sync in background (don't await to avoid blocking session creation)
          syncFriendsInBackground(userId, body.friends).catch((syncError: unknown) => {
            console.error(`[/api/auth/session] Background friends sync failed for ${userId}:`, syncError);
          });
        } else if (body.friends !== undefined) {
          console.log(`[/api/auth/session] No friends data provided for ${userId} (friends array empty or invalid)`);
        }

      } catch (dbError) {
        console.error(`[/api/auth/session] Error during community/board upsert for community ${communityId}:`, dbError);
        // Non-critical for session token generation, but log it. 
        // Depending on requirements, you might want to return an error here.
      }
    }
    // --- END Community and Default Board Upsert Logic --- 

    let isUserAdmin = false;
    const adminRoleTitleEnvVar = process.env.NEXT_PUBLIC_ADMIN_ROLE_IDS;

    if (adminRoleTitleEnvVar && userRoleIds && userRoleIds.length > 0 && communityRoles && communityRoles.length > 0) {
      const adminTitlesFromEnv = adminRoleTitleEnvVar.split(',').map(roleTitle => roleTitle.trim().toLowerCase());
      
      const userTitles = userRoleIds.map(roleId => {
        const matchingCommunityRole = communityRoles.find(cr => cr.id === roleId);
        return matchingCommunityRole ? matchingCommunityRole.title.trim().toLowerCase() : null;
      }).filter(title => title !== null) as string[];

      console.log('[/api/auth/session] User role titles derived:', userTitles);
      console.log('[/api/auth/session] Admin role titles from ENV:', adminTitlesFromEnv);

      isUserAdmin = userTitles.some(userRoleTitle => adminTitlesFromEnv.includes(userRoleTitle));
    }
    console.log(`[/api/auth/session] Determined admin status based on role titles and env var: ${isUserAdmin}`);

    const payloadToSign: TokenSignPayload = {
      sub: userId,
      name: name,
      picture: profilePictureUrl,
      adm: isUserAdmin, // Set adm based on role title check
      uid: iframeUid,
      cid: communityId,
      roles: userRoleIds,
      communityShortId: communityShortId ?? undefined, // 🆕 Short ID for URL construction
      pluginId: pluginId ?? undefined,                 // 🆕 Plugin ID from context
      previousVisit: previousVisit,                    // 🆕 User's last visit timestamp
    };
    console.log('[/api/auth/session] Payload to sign (checking adm, uid, cid claims):', payloadToSign);

    const secret = JWT_SECRET as string;

    const signOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN_SECONDS, 
    };
    console.log('[/api/auth/session] JWT Sign Options:', signOptions); // Log signOptions

    const token = jwt.sign(payloadToSign, secret, signOptions);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error creating session token:', error);
    if (error instanceof SyntaxError) { // Potential req.json() error
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 