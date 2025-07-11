'use client'

/**
 * Community Selection Component
 * 
 * Handles community context selection:
 * 1. If communityId provided in config, validate user access
 * 2. Otherwise, show existing communities or create new one
 * 3. Return community context to complete the setup
 */

import { useState, useEffect } from 'react';

// Types
interface IframeConfig {
  communityId?: string;
  communityName?: string;
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  allowAnonymous?: boolean;
  requireAuth?: boolean;
  returnUrl?: string;
  embedOrigin?: string;
}

interface UserSession {
  userId: string;
  identityType: 'legacy' | 'ens' | 'universal_profile' | 'anonymous';
  walletAddress?: string;
  ensName?: string;
  upAddress?: string;
  name?: string;
  profilePicture?: string;
  authToken: string;
  expiresAt: string;
}

interface CommunityContext {
  communityId: string;
  communityName: string;
  userRole: 'owner' | 'admin' | 'moderator' | 'member';
  permissions: string[];
}

interface Community {
  id: string;
  name: string;
  logo_url?: string;
  is_public: boolean;
  requires_approval: boolean;
  owner_user_id: string;
  member_count: number;
  userRole?: 'owner' | 'admin' | 'moderator' | 'member';
}

interface CommunitySelectionProps {
  config: IframeConfig;
  userSession: UserSession;
  onCommunitySelected: (community: CommunityContext) => void;
  onError: (error: string, details?: any) => void;
  setIsLoading: (loading: boolean) => void;
}

export function CommunitySelection({ 
  config, 
  userSession, 
  onCommunitySelected, 
  onError, 
  setIsLoading 
}: CommunitySelectionProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState(config.communityName || '');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const initializeCommunitySelection = async () => {
      setIsLoading(true);

      try {
        // If specific community requested, try to validate access
        if (config.communityId) {
          const community = await validateCommunityAccess(config.communityId);
          if (community) {
            onCommunitySelected(community);
            return;
          } else {
            onError(`You don't have access to community ${config.communityId}`);
            return;
          }
        }

        // Otherwise, load user's communities
        await loadUserCommunities();

      } catch (error) {
        console.error('[CommunitySelection] Error:', error);
        onError('Failed to load community information');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCommunitySelection();
  }, [config.communityId, userSession.authToken]);

  // Validate access to specific community
  const validateCommunityAccess = async (communityId: string): Promise<CommunityContext | null> => {
    try {
      const response = await fetch(`/api/communities/${communityId}/access`, {
        headers: {
          'Authorization': `Bearer ${userSession.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      return {
        communityId: data.community.id,
        communityName: data.community.name,
        userRole: data.userRole,
        permissions: data.permissions || []
      };

    } catch (error) {
      console.error('[validateCommunityAccess] Error:', error);
      return null;
    }
  };

  // Load user's existing communities
  const loadUserCommunities = async () => {
    try {
      const response = await fetch('/api/communities/user-communities', {
        headers: {
          'Authorization': `Bearer ${userSession.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load communities');
      }

      const data = await response.json();
      setCommunities(data.communities || []);

    } catch (error) {
      console.error('[loadUserCommunities] Error:', error);
      setCommunities([]);
    }
  };

  // Handle community selection
  const handleCommunitySelect = async (community: Community) => {
    setIsLoading(true);

    try {
      const communityContext: CommunityContext = {
        communityId: community.id,
        communityName: community.name,
        userRole: community.userRole || 'member',
        permissions: [] // TODO: Load actual permissions
      };

      onCommunitySelected(communityContext);

    } catch (error) {
      console.error('[handleCommunitySelect] Error:', error);
      onError('Failed to select community');
      setIsLoading(false);
    }
  };

  // Handle community creation
  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) {
      onError('Please enter a community name');
      return;
    }

    setIsCreating(true);
    setIsLoading(true);

    try {
      const response = await fetch('/api/communities/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userSession.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCommunityName.trim(),
          is_public: true,
          requires_approval: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create community');
      }

      const data = await response.json();
      
      const communityContext: CommunityContext = {
        communityId: data.community.id,
        communityName: data.community.name,
        userRole: 'owner',
        permissions: ['admin', 'moderate', 'write', 'read']
      };

      onCommunitySelected(communityContext);

    } catch (error) {
      console.error('[handleCreateCommunity] Error:', error);
      if (error instanceof Error) {
        onError(`Failed to create community: ${error.message}`);
      } else {
        onError('Failed to create community');
      }
    } finally {
      setIsCreating(false);
      setIsLoading(false);
    }
  };

  const themeStyles = {
    background: config.theme === 'dark' ? '#1f2937' : '#ffffff',
    color: config.theme === 'dark' ? '#ffffff' : '#000000',
    accentColor: config.primaryColor || '#3b82f6',
    cardBg: config.theme === 'dark' ? '#374151' : '#f8fafc',
    borderColor: config.theme === 'dark' ? '#4b5563' : '#e5e7eb'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      padding: '20px',
      ...themeStyles
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '8px' }}>
          Choose Your Community
        </h2>
        <p style={{ marginBottom: '32px', opacity: 0.8 }}>
          Join an existing community or create a new one
        </p>

        {!showCreateForm ? (
          <>
            {/* Existing Communities */}
            {communities.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>
                  Your Communities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {communities.map((community) => (
                    <button
                      key={community.id}
                      onClick={() => handleCommunitySelect(community)}
                      style={{
                        padding: '16px',
                        border: `2px solid ${themeStyles.borderColor}`,
                        borderRadius: '8px',
                        background: themeStyles.cardBg,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {community.logo_url ? (
                          <img 
                            src={community.logo_url} 
                            alt={community.name}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '6px',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '6px',
                            background: themeStyles.accentColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 'bold'
                          }}>
                            {community.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                            {community.name}
                          </div>
                          <div style={{ fontSize: '14px', opacity: 0.7 }}>
                            {community.member_count} members • {community.userRole || 'member'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Create New Community Button */}
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                width: '100%',
                padding: '16px',
                border: `2px dashed ${themeStyles.borderColor}`,
                borderRadius: '8px',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>+</span>
                Create New Community
              </div>
            </button>
          </>
        ) : (
          /* Create Community Form */
          <div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                textAlign: 'left'
              }}>
                Community Name
              </label>
              <input
                type="text"
                value={newCommunityName}
                onChange={(e) => setNewCommunityName(e.target.value)}
                placeholder="Enter community name..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${themeStyles.borderColor}`,
                  borderRadius: '6px',
                  background: themeStyles.cardBg,
                  color: themeStyles.color,
                  fontSize: '16px'
                }}
                autoFocus
                disabled={isCreating}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowCreateForm(false)}
                disabled={isCreating}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: `2px solid ${themeStyles.borderColor}`,
                  borderRadius: '6px',
                  background: 'transparent',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  opacity: isCreating ? 0.6 : 1
                }}
              >
                Back
              </button>
              <button
                onClick={handleCreateCommunity}
                disabled={isCreating || !newCommunityName.trim()}
                style={{
                  flex: 2,
                  padding: '12px 24px',
                  backgroundColor: (isCreating || !newCommunityName.trim()) ? '#9ca3af' : themeStyles.accentColor,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (isCreating || !newCommunityName.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {isCreating ? 'Creating...' : 'Create Community'}
              </button>
            </div>
          </div>
        )}

        <p style={{ 
          marginTop: '24px', 
          fontSize: '12px', 
          opacity: 0.6,
          lineHeight: '1.4'
        }}>
          Communities are spaces for discussions and content sharing.
          You can switch between communities anytime.
        </p>
      </div>
    </div>
  );
} 