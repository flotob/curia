import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract parameters from URL
    const title = searchParams.get('title') || 'Forum Post';
    const author = searchParams.get('author') || 'Anonymous';
    const board = searchParams.get('board') || 'General';
    const id = searchParams.get('id') || '1';

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
          }}
        >
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
                backdropFilter: 'blur(10px)',
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
                width: 'fit-content',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              📋 {board}
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '800',
                color: 'white',
                lineHeight: '1.1',
                margin: '0',
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                marginBottom: '32px',
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
              backdropFilter: 'blur(10px)',
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

            {/* Join Discussion CTA */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '12px',
                padding: '16px 24px',
                color: '#1a202c',
                fontSize: '18px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              💬 Join Discussion
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