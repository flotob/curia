import { NextRequest, NextResponse } from 'next/server';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '@/lib/db'; // For potential initial user data sync

const JWT_SECRET = process.env.JWT_SECRET;
// Use seconds for expiresIn to satisfy linter with current @types/jsonwebtoken
const JWT_EXPIRES_IN_SECONDS = parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '3600', 10); 

// Expected request body structure from the frontend
interface SessionRequestBody {
  userId: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  isAdmin?: boolean; // This would be determined by the frontend based on CG roles
  // communityId: string; // Could be added if needed later
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
    const body = (await req.json()) as SessionRequestBody;

    const { userId, name, profilePictureUrl, isAdmin } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // --- Optional: Initial User Profile UPSERT Logic on first session --- 
    // withAuth.ts will also do this on every authenticated request, so this might be redundant
    // but can be useful if you want the profile created/updated immediately upon session creation.
    // For now, we'll rely on withAuth.ts to handle the upsert.
    /*
    if (userId) {
      try {
        await query(
          `INSERT INTO users (user_id, name, profile_picture_url, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET
             name = EXCLUDED.name,
             profile_picture_url = EXCLUDED.profile_picture_url,
             updated_at = NOW();`,
          [userId, name ?? null, profilePictureUrl ?? null]
        );
      } catch (profileError) {
        console.error(
          'Error initially syncing user profile in session route (non-critical):',
          profileError
        );
      }
    }
    */
    // --- END Optional Initial UPSERT --- 

    const payloadToSign: TokenSignPayload = {
      sub: userId,
      name: name,
      picture: profilePictureUrl,
      adm: isAdmin || false, // Default to false if not provided
    };

    const secret = JWT_SECRET as string;

    const signOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN_SECONDS, 
    };

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