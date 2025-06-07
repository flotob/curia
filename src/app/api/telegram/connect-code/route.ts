import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { generateConnectCode, formatConnectCodeForDisplay, getBotName } from '@/lib/telegram/connectCode';

async function getConnectCodeHandler(req: AuthenticatedRequest) {
  try {
    const requestingUserId = req.user?.sub;
    const requestingUserCommunityId = req.user?.cid;

    console.log(`[Telegram] GET connect code for community ${requestingUserCommunityId} by user ${requestingUserId}`);

    if (!requestingUserCommunityId) {
      return NextResponse.json({ error: 'No community ID found' }, { status: 400 });
    }

    // Generate connect code for user's community (now async with COUNT-based nonce)
    const connectCode = await generateConnectCode(requestingUserCommunityId);
    const formattedConnectCode = formatConnectCodeForDisplay(connectCode);
    const botName = getBotName();
    
    return NextResponse.json({
      connectCode,
      formattedConnectCode,
      botName,
      botUsername: `${botName.replace(/\s+/g, '').toLowerCase()}_bot`
    });

  } catch (error) {
    console.error('[Telegram] Error generating connect code:', error);
    return NextResponse.json(
      { error: 'Failed to generate connect code' }, 
      { status: 500 }
    );
  }
}

export const GET = withAuth(getConnectCodeHandler, true); // Admin only 