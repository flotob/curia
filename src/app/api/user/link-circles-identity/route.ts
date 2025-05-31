import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { isAddress, getAddress } from 'ethers';

// Request body type for linking Circles identity
interface LinkCirclesIdentityRequest {
  circlesSafeAddress: string;
}

// GET /api/user/link-circles-identity - Get the user's currently linked Circles Safe address
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getLinkedCirclesIdentityHandler(req: AuthenticatedRequest, _context: RouteContext) {
  const user = req.user;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    // Get the user's linked Circles Safe address
    const result = await query(
      'SELECT circles_safe_address FROM users WHERE user_id = $1',
      [user.sub]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const circlesSafeAddress = result.rows[0].circles_safe_address;

    return NextResponse.json({
      userId: user.sub,
      circlesSafeAddress: circlesSafeAddress || null,
      isLinked: !!circlesSafeAddress
    });

  } catch (error: unknown) {
    console.error('[getLinkedCirclesIdentity] Error getting linked Circles identity:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/user/link-circles-identity - Link a Circles Safe address to the current user
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function linkCirclesIdentityHandler(req: AuthenticatedRequest, _context: RouteContext) {
  const user = req.user;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    const body: LinkCirclesIdentityRequest = await req.json();
    const { circlesSafeAddress } = body;

    // Validate the request body
    if (!circlesSafeAddress) {
      return NextResponse.json(
        { error: 'circlesSafeAddress is required' }, 
        { status: 400 }
      );
    }

    // Validate that it's a proper Ethereum address
    if (!isAddress(circlesSafeAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Normalize to checksum format
    const checksumAddress = getAddress(circlesSafeAddress);

    // Check if this Circles Safe address is already linked to another user
    const existingLink = await query(
      'SELECT user_id FROM users WHERE circles_safe_address = $1',
      [checksumAddress]
    );

    if (existingLink.rows.length > 0 && existingLink.rows[0].user_id !== user.sub) {
      return NextResponse.json(
        { error: 'This Circles Safe address is already linked to another user' },
        { status: 409 }
      );
    }

    // Update the user's record with the Circles Safe address
    await query(
      'UPDATE users SET circles_safe_address = $1, updated_at = NOW() WHERE user_id = $2',
      [checksumAddress, user.sub]
    );

    return NextResponse.json({
      success: true,
      message: 'Circles Safe address linked successfully',
      circlesSafeAddress: checksumAddress,
      userId: user.sub
    });

  } catch (error: unknown) {
    console.error('[linkCirclesIdentity] Error linking Circles identity:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getLinkedCirclesIdentityHandler, false);
export const POST = withAuth(linkCirclesIdentityHandler, false); 