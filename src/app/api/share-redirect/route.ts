import { NextRequest, NextResponse } from 'next/server';

// Server-side browser detection for share redirects
function detectBrowserFromUserAgent(userAgent: string): {
  isCrawler: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isSupported: boolean;
} {
  const ua = userAgent.toLowerCase();
  
  // Check for crawlers first
  const crawlerPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'facebookexternalhit',
    'twitterbot', 'linkedinbot', 'whatsapp', 'telegram', 'discord',
    'googlebot', 'bingbot', 'slackbot', 'applebot'
  ];
  
  const isCrawler = crawlerPatterns.some(pattern => ua.includes(pattern));
  
  if (isCrawler) {
    return { isCrawler: true, isSafari: false, isFirefox: false, isSupported: true };
  }

  // Browser detection
  const isSafari = ua.includes('safari') && !ua.includes('chrome');
  const isFirefox = ua.includes('firefox');
  const isChrome = ua.includes('chrome') && !ua.includes('edg');
  
  // Browsers that support auto-forward (iframe cookie access)
  const isSupported = isChrome || ua.includes('chromium') || ua.includes('edge') || ua.includes('opera');

  return {
    isCrawler: false,
    isSafari,
    isFirefox,
    isSupported
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const postId = searchParams.get('postId');
  const boardId = searchParams.get('boardId');
  const communityShortId = searchParams.get('communityShortId');
  const pluginId = searchParams.get('pluginId');

  if (!token || !postId || !boardId) {
    console.error('[share-redirect] Missing required parameters:', { token, postId, boardId });
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  // Detect browser type from user agent
  const userAgent = request.headers.get('user-agent') || '';
  const browser = detectBrowserFromUserAgent(userAgent);
  
  console.log(`[share-redirect] Processing share redirect for post ${postId} in board ${boardId} with token ${token}`);
  console.log(`[share-redirect] Browser detection:`, browser);
  console.log(`[share-redirect] Community context:`, { communityShortId, pluginId });
  
  // For Safari/Firefox users (limited browsers), redirect to enhanced preview page
  if (!browser.isCrawler && !browser.isSupported && (browser.isSafari || browser.isFirefox)) {
    console.log(`[share-redirect] Detected limited browser, redirecting to enhanced preview page`);
    
    // Construct enhanced preview URL with all necessary parameters
    const baseUrl = request.nextUrl.origin;
    const previewParams = new URLSearchParams({
      postId: postId,
      boardId: boardId,
      token: token,
      ...(communityShortId && { communityShortId }),
      ...(pluginId && { pluginId }),
      browser: browser.isSafari ? 'safari' : 'firefox'
    });
    
    const previewUrl = `${baseUrl}/shared-post-preview?${previewParams.toString()}`;
    console.log(`[share-redirect] Redirecting to enhanced preview: ${previewUrl}`);
    
    return NextResponse.redirect(previewUrl);
  }

  if (!communityShortId || !pluginId) {
    console.warn('[share-redirect] Missing community or plugin context, using fallback URL');
    
    // Fallback to basic Common Ground URL if context is missing
    const fallbackUrl = process.env.COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
    const response = NextResponse.redirect(fallbackUrl);
    
    // Still set cookies for post detection even with fallback
    const sharedContentToken = `${postId}-${boardId}-${Date.now()}`;
    const postData = JSON.stringify({ postId, boardId, token, timestamp: Date.now() });
    
    response.cookies.set('shared_content_token', sharedContentToken, {
      path: '/',
      sameSite: 'none',
      secure: true,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    response.cookies.set('shared_post_data', postData, {
      path: '/',
      sameSite: 'none', 
      secure: true,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    console.log(`[share-redirect] Fallback redirect to ${fallbackUrl} with cookies set`);
    return response;
  }

  // Create the shared content identifier 
  const sharedContentToken = `${postId}-${boardId}-${Date.now()}`;

  // Construct proper Common Ground plugin URL
  const commonGroundBaseUrl = process.env.COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
  const commonGroundUrl = `${commonGroundBaseUrl}/c/${communityShortId}/plugin/${pluginId}`;
  
  console.log(`[share-redirect] Constructed Common Ground URL: ${commonGroundUrl}`);
  
  // Create response with redirect to Common Ground plugin
  const response = NextResponse.redirect(commonGroundUrl);

  // Set the SameSite=None; Secure cookie for third-party context
  response.cookies.set('shared_content_token', sharedContentToken, {
    path: '/',
    sameSite: 'none',
    secure: true,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Also set the specific post data in a separate cookie
  const postData = JSON.stringify({ postId, boardId, token, timestamp: Date.now() });
  response.cookies.set('shared_post_data', postData, {
    path: '/',
    sameSite: 'none', 
    secure: true,
    httpOnly: false, // Allow JavaScript to read this one
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  console.log(`[share-redirect] Redirecting to ${commonGroundUrl} with cookies set`);

  return response;
} 