import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Helper function to determine gating status and labels
function getGatingInfo(communityGated: boolean, boardGated: boolean, postGated: boolean) {
  const isGated = communityGated || boardGated || postGated;
  
  let gatingLabel = '';
  if (communityGated) gatingLabel = 'Community Access';
  else if (boardGated) gatingLabel = 'Board Access';
  else if (postGated) gatingLabel = 'UP Required';
  
  return { isGated, gatingLabel };
}

// Helper function to get requirement icons for display
function getRequirementIcons(
  lyxRequired?: string,
  tokenCount?: number,
  followerCount?: number,
  roleRequired?: string
): Array<{ icon: string; text: string }> {
  const icons: Array<{ icon: string; text: string }> = [];
  
  if (roleRequired) {
    icons.push({ icon: '👥', text: 'Role Required' });
  }
  
  if (lyxRequired) {
    icons.push({ icon: '💰', text: lyxRequired });
  }
  
  if (tokenCount && tokenCount > 0) {
    icons.push({ icon: '🪙', text: `${tokenCount} token${tokenCount !== 1 ? 's' : ''}` });
  }
  
  if (followerCount && followerCount > 0) {
    icons.push({ icon: '👥', text: 'Followers required' });
  }
  
  return icons;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract basic parameters
    const title = searchParams.get('title') || 'Forum Post';
    const author = searchParams.get('author') || 'Anonymous';
    const board = searchParams.get('board') || 'General';
    const id = searchParams.get('id') || '1';
    
    // Extract gating parameters
    const communityGated = searchParams.get('communityGated') === 'true';
    const boardGated = searchParams.get('boardGated') === 'true';
    const postGated = searchParams.get('postGated') === 'true';
    
    // Extract requirement details
    const lyxRequired = searchParams.get('lyxRequired') || undefined;
    const tokenCount = searchParams.get('tokenCount') ? parseInt(searchParams.get('tokenCount')!, 10) : undefined;
    const followerCount = searchParams.get('followerCount') ? parseInt(searchParams.get('followerCount')!, 10) : undefined;
    const roleRequired = searchParams.get('roleRequired') || undefined;

    // Determine gating status
    const { isGated, gatingLabel } = getGatingInfo(communityGated, boardGated, postGated);
    const isContentPrivate = communityGated || boardGated;
    
    // Get requirement icons
    const requirements = getRequirementIcons(lyxRequired, tokenCount, followerCount, roleRequired);

    // Truncate title if too long for image
    const displayTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '60px',
            fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
            position: 'relative',
          }}
        >
          {/* Privacy Indicator Overlay */}
          {isGated && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                backgroundColor: 'rgba(59, 130, 246, 0.9)',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                zIndex: 10,
              }}
            >
              🔒 {gatingLabel}
            </div>
          )}

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '12px',
                padding: '12px 24px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#667eea',
                  borderRadius: '8px',
                  marginRight: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'white',
                }}
              >
                C
              </div>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1a202c',
                }}
              >
                Curia
              </span>
            </div>
            
            {/* Post ID Badge */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              #{id}
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            {/* Board Tag */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px 16px',
                marginBottom: '24px',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'flex-start',
              }}
            >
              📋 {board}
            </div>

            {/* Requirements Section (if any) */}
            {requirements.length > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignSelf: 'flex-start',
                  maxWidth: '100%',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: '600',
                  }}
                >
                  Requirements:
                </div>
                {requirements.slice(0, 3).map((req, index) => (
                  <div
                    key={index}
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ marginRight: '6px' }}>{req.icon}</span>
                    <span>{req.text}</span>
                  </div>
                ))}
                {requirements.length > 3 && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontStyle: 'italic',
                    }}
                  >
                    +{requirements.length - 3} more requirements
                  </div>
                )}
              </div>
            )}

            {/* Title with privacy-aware styling */}
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '800',
                color: 'white',
                lineHeight: '1.1',
                margin: '0',
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                marginBottom: '32px',
                // Apply privacy blur for content-gated posts
                filter: isContentPrivate ? 'blur(1px)' : 'none',
                opacity: isContentPrivate ? 0.7 : 1,
              }}
            >
              {displayTitle}
            </h1>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '20px 32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#f7fafc',
                  borderRadius: '50%',
                  marginRight: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#4a5568',
                }}
              >
                {author.charAt(0).toUpperCase()}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  {author}
                </span>
                <span
                  style={{
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.8)',
                  }}
                >
                  Author
                </span>
              </div>
            </div>

            {/* Privacy-aware CTA */}
            <div
              style={{
                backgroundColor: isGated ? 'rgba(59, 130, 246, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                borderRadius: '12px',
                padding: '16px 24px',
                color: isGated ? 'white' : '#1a202c',
                fontSize: '18px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isGated ? '🔐 Join to Access' : '💬 Join Discussion'}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.error('Failed to generate OG image:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
} 