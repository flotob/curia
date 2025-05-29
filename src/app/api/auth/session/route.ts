import { NextRequest, NextResponse } from 'next/server';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '@/lib/db'; // For potential initial user data sync

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
    console.log('[/api/auth/session] Received raw request body text:', rawBodyText);
    const body = JSON.parse(rawBodyText) as SessionRequestBody; 
    console.log('[/api/auth/session] Parsed request body object:', body);

    const { userId, name, profilePictureUrl, roles: userRoleIds, communityRoles, iframeUid, communityId, communityName } = body;
    console.log('[/api/auth/session] Destructured user role IDs:', userRoleIds);
    console.log('[/api/auth/session] Destructured communityRoles:', communityRoles);
    console.log('[/api/auth/session] Destructured iframeUid:', iframeUid);
    console.log('[/api/auth/session] Destructured communityId:', communityId);
    console.log('[/api/auth/session] Destructured communityName:', communityName);

    // Make iframeUid and communityId required for session creation, along with userId
    if (!userId || !iframeUid || !communityId) { 
      return NextResponse.json(
        { error: 'User ID, iframeUid, and Community ID are required for session' },
        { status: 400 }
      );
    }

    // --- Community and Default Board Upsert Logic --- 
    if (communityId) {
      try {
        // 1. Upsert Community
        await query(
          `INSERT INTO communities (id, name, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();`,
          [communityId, communityName || communityId] // Use communityId as name if communityName is not provided
        );
        console.log(`[/api/auth/session] Upserted community: ${communityId}`);

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