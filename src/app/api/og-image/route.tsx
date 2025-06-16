import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Helper function to determine gating status and labels
function getGatingInfo(
  communityGated: boolean, 
  boardGated: boolean, 
  postGated: boolean,
  lockGated: boolean,
  lockName?: string,
  lockCategoryCount?: number,
  lockRequireAll?: boolean
) {
  const isGated = communityGated || boardGated || postGated || lockGated;
  
  let gatingLabel = '';
  if (communityGated) gatingLabel = 'Community Access';
  else if (boardGated) gatingLabel = 'Board Access';
  else if (lockGated && lockName) {
    if (lockCategoryCount && lockCategoryCount > 1) {
      const logic = lockRequireAll ? 'All' : 'Any';
      gatingLabel = `${logic} of ${lockCategoryCount}`;
    } else {
      gatingLabel = lockName.length > 20 ? lockName.substring(0, 17) + '...' : lockName;
    }
  }
  else if (postGated) gatingLabel = 'UP Required';
  
  return { isGated, gatingLabel };
}

// Helper function to get requirement icons for display
function getRequirementIcons(
  lyxRequired?: string,
  tokenCount?: number,
  followerCount?: number,
  roleRequired?: string,
  lockGated?: boolean,
  lockName?: string,
  lockCategoryCount?: number,
  lockRequireAll?: boolean,
  primaryCategory?: string
): Array<{ icon: string; text: string }> {
  const icons: Array<{ icon: string; text: string }> = [];
  
  if (roleRequired) {
    icons.push({ icon: '👥', text: 'Role Required' });
  }
  
  // NEW: Handle lock-based requirements
  if (lockGated && lockName) {
    if (lockCategoryCount && lockCategoryCount > 1) {
      const logic = lockRequireAll ? 'All' : 'Any';
      icons.push({ 
        icon: '🔐', 
        text: `${logic} of ${lockCategoryCount} requirements` 
      });
    } else if (primaryCategory) {
      // Show category-specific icon
      const categoryIcon = primaryCategory === 'universal_profile' ? '🆙' : 
                          primaryCategory === 'ethereum_profile' ? '⟠' : '🔐';
      icons.push({ 
        icon: categoryIcon, 
        text: lockName.length > 25 ? lockName.substring(0, 22) + '...' : lockName 
      });
    } else {
      icons.push({ 
        icon: '🔐', 
        text: lockName.length > 25 ? lockName.substring(0, 22) + '...' : lockName 
      });
    }
  }
  
  // Legacy: Handle direct post requirements
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
    const lockGated = searchParams.get('lockGated') === 'true';
    
    // Extract lock details
    const lockName = searchParams.get('lockName') || undefined;
    const lockCategoryCount = searchParams.get('lockCategoryCount') ? parseInt(searchParams.get('lockCategoryCount')!, 10) : undefined;
    const lockRequireAll = searchParams.get('lockRequireAll') === 'true';
    const primaryCategory = searchParams.get('primaryCategory') || undefined;
    
    // Extract requirement details
    const lyxRequired = searchParams.get('lyxRequired') || undefined;
    const tokenCount = searchParams.get('tokenCount') ? parseInt(searchParams.get('tokenCount')!, 10) : undefined;
    const followerCount = searchParams.get('followerCount') ? parseInt(searchParams.get('followerCount')!, 10) : undefined;
    const roleRequired = searchParams.get('roleRequired') || undefined;

    // Determine gating status
    const { isGated, gatingLabel } = getGatingInfo(
      communityGated, 
      boardGated, 
      postGated, 
      lockGated, 
      lockName, 
      lockCategoryCount, 
      lockRequireAll
    );
    const isContentPrivate = communityGated || boardGated;
    
    // Get requirement icons
    const requirements = getRequirementIcons(
      lyxRequired, 
      tokenCount, 
      followerCount, 
      roleRequired,
      lockGated,
      lockName,
      lockCategoryCount,
      lockRequireAll,
      primaryCategory
    );

    // Adjust title length based on requirements presence
    const maxTitleLength = requirements.length > 0 ? 65 : 80;
    const displayTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength - 3) + '...' : title;

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
            {/* Board + Title Combined Section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: requirements.length > 0 ? '32px' : '40px',
              }}
            >
              {/* Board Name - connected to title */}
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '22px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                📋 {board}
              </div>

              {/* Title with privacy-aware styling */}
              <h1
                style={{
                  fontSize: requirements.length > 0 ? '48px' : '56px',
                  fontWeight: '800',
                  color: 'white',
                  lineHeight: '1.1',
                  margin: '0',
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  // Apply privacy blur for content-gated posts
                  filter: isContentPrivate ? 'blur(1px)' : 'none',
                  opacity: isContentPrivate ? 0.7 : 1,
                }}
              >
                {displayTitle}
              </h1>
            </div>

            {/* Large, Prominent Requirements Badges */}
            {requirements.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                {requirements.slice(0, 3).map((req, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: '700',
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <span style={{ marginRight: '10px', fontSize: '24px' }}>{req.icon}</span>
                    <span>{req.text}</span>
                  </div>
                ))}
                {requirements.length > 3 && (
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      border: '2px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '18px',
                      fontWeight: '600',
                      fontStyle: 'italic',
                    }}
                  >
                    +{requirements.length - 3} more
                  </div>
                )}
              </div>
            )}
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