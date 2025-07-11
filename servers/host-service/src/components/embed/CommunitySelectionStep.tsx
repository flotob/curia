/**
 * CommunitySelectionStep - Community selection and joining
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Crown, Globe, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommunitySelectionStepProps } from '@/types/embed';
import { Community } from '@/types/embed';

export const CommunitySelectionStep: React.FC<CommunitySelectionStepProps> = ({ 
  onCommunitySelected, 
  config,
  sessionToken
}) => {
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [availableCommunities, setAvailableCommunities] = useState<Community[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch communities from database
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get session token from prop or localStorage as fallback
        const token = sessionToken || localStorage.getItem('curia_session_token');
        
        // Prepare headers with authentication if available
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('[CommunitySelectionStep] Using session token for authenticated request');
        }
        
        const response = await fetch('/api/communities', { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch communities: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Handle the new response structure
        setUserCommunities(data.userCommunities || []);
        setAvailableCommunities(data.availableCommunities || data.communities || []);
        setIsAuthenticated(data.isAuthenticated || false);
        
        console.log('[CommunitySelectionStep] Fetched communities:', {
          userCommunities: data.userCommunities?.length || 0,
          availableCommunities: data.availableCommunities?.length || data.communities?.length || 0,
          isAuthenticated: data.isAuthenticated || false
        });
      } catch (err) {
        console.error('[CommunitySelectionStep] Error fetching communities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load communities');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunities();
  }, [sessionToken]);

  const handleCommunitySelect = (communityId: string) => {
    setSelectedCommunity(communityId);
  };

  const handleJoinCommunity = async () => {
    if (!selectedCommunity) return;
    
    setIsJoining(true);
    
    try {
      // TODO: Join community API call
      console.log(`[Embed] Joining community: ${selectedCommunity}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Pass the selected community ID to the parent
      onCommunitySelected(selectedCommunity);
    } catch (error) {
      console.error('[Embed] Error joining community:', error);
      setIsJoining(false);
    }
  };

  // Check if selected community is from user's communities
  const selectedFromUser = userCommunities.find(c => c.id === selectedCommunity);

  return (
    <div className="embed-step">
      <Card className="embed-card embed-card--lg">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="embed-header-icon gradient-purple-pink">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl embed-gradient-text">
            Choose Your Community
          </CardTitle>
          <CardDescription className="text-base">
            Select a community to join the conversation
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading communities...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">⚠️ {error}</div>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="text-sm"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Communities Content */}
          {!isLoading && !error && (
            <>
              {/* No Communities Found */}
              {userCommunities.length === 0 && availableCommunities.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-muted-foreground mb-4">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No communities found</p>
                    <p className="text-sm">There are no public communities available at the moment.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                    className="mt-4"
                  >
                    Refresh
                  </Button>
                </div>
              )}

              {/* User's Communities Section */}
              {userCommunities.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-lg">Your Communities</h3>
                    <Badge variant="secondary" className="text-xs">
                      {userCommunities.length}
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {userCommunities.map((community: Community) => (
                      <Card 
                        key={community.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-lg community-card",
                          selectedCommunity === community.id 
                            ? "ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900" 
                            : "hover:border-green-300 dark:hover:border-green-700"
                        )}
                        onClick={() => handleCommunitySelect(community.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            {/* Community Icon */}
                            <div className={cn("community-icon", community.gradientClass)}>
                              <span className="text-xl">{community.icon}</span>
                            </div>
                            
                            {/* Community Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-foreground">
                                  {community.name}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {community.userRole}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <Globe className="w-3 h-3 mr-1" />
                                  Member
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{community.memberCount.toLocaleString()} members</span>
                                </div>
                              </div>
                            </div>

                            {/* Selection Indicator */}
                            <div className="flex items-center">
                              {selectedCommunity === community.id ? (
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Communities Section */}
              {availableCommunities.length > 0 && (
                <div className="mb-6">
                  {userCommunities.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">Explore Communities</h3>
                      <Badge variant="outline" className="text-xs">
                        {availableCommunities.length}
                      </Badge>
                    </div>
                  )}
                  <div className="grid gap-4">
                    {availableCommunities.map((community: Community) => (
                      <Card 
                        key={community.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-lg community-card",
                          selectedCommunity === community.id 
                            ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" 
                            : "hover:border-blue-300 dark:hover:border-blue-700"
                        )}
                        onClick={() => handleCommunitySelect(community.id)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center space-x-4">
                            {/* Community Icon */}
                            <div className={cn("community-icon", community.gradientClass)}>
                              <span className="text-2xl">{community.icon}</span>
                            </div>
                            
                            {/* Community Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground text-lg">
                                  {community.name}
                                </h3>
                                {community.isPublic ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <Globe className="w-3 h-3 mr-1" />
                                    Public
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    <Lock className="w-3 h-3 mr-1" />
                                    Private
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                {community.description}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{community.memberCount.toLocaleString()} members</span>
                                </div>
                              </div>
                            </div>

                            {/* Selection Indicator */}
                            <div className="flex items-center">
                              {selectedCommunity === community.id ? (
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                  <div className="w-3 h-3 rounded-full bg-white"></div>
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured Community Banner (if configured) */}
              {config.community && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h4 className="font-medium text-foreground">Recommended Community</h4>
                      <p className="text-sm text-muted-foreground">
                        Based on where you're visiting from
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button - Only show when communities are available */}
              {(userCommunities.length > 0 || availableCommunities.length > 0) && (
                <>
                  <div className="flex justify-center">
                    <Button
                      onClick={handleJoinCommunity}
                      disabled={!selectedCommunity || isJoining}
                      className={cn(
                        "btn-gradient-purple-pink min-w-[200px]",
                        (!selectedCommunity || isJoining) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isJoining ? (
                        <>
                          <div className="loading-spinner border-white mr-2" />
                          {selectedFromUser ? 'Entering...' : 'Joining...'}
                        </>
                      ) : (
                        <>
                          {selectedFromUser ? 'Continue to Community' : 'Join Community'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Help Text */}
                  <div className="text-center mt-4">
                    <p className="text-xs text-muted-foreground">
                      {selectedCommunity 
                        ? selectedFromUser 
                          ? "Ready to continue! Click the button above to enter your community." 
                          : "Ready to join! Click the button above to join this community."
                        : userCommunities.length > 0 
                          ? "Select a community above to continue or explore new ones." 
                          : "Select a community above to get started."
                      }
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 