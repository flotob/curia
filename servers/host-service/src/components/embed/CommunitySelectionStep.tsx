/**
 * CommunitySelectionStep - Community selection and joining
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Crown, Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommunitySelectionStepProps } from '@/types/embed';
import { getMockCommunities } from '@/lib/embed/mockData';

export const CommunitySelectionStep: React.FC<CommunitySelectionStepProps> = ({ 
  onCommunitySelected, 
  config 
}) => {
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  
  const communities = getMockCommunities();

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
      
      onCommunitySelected();
    } catch (error) {
      console.error('[Embed] Error joining community:', error);
      setIsJoining(false);
    }
  };

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
          {/* Communities Grid */}
          <div className="grid gap-4 mb-6">
            {communities.map((community) => (
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
                        {/* Add more stats here if needed */}
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

          {/* Action Button */}
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
                  Joining...
                </>
              ) : (
                <>
                  Join Community
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              {selectedCommunity 
                ? "Ready to join! Click the button above to continue." 
                : "Select a community above to get started."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 