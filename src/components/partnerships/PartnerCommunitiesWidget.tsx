'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { useCrossCommunityNavigation } from '@/hooks/useCrossCommunityNavigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CommunityPartnership } from '@/types/partnerships';

interface PartnerCommunitiesSidebarProps {
  className?: string;
}

export function PartnerCommunitiesWidget({ 
  className = ''
}: PartnerCommunitiesSidebarProps) {
  const { token, user } = useAuth();
  const { navigateToPost } = useCrossCommunityNavigation();
  const [isNavigating, setIsNavigating] = React.useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Fetch partnerships for current community
  const { data: partnershipsData, isLoading } = useQuery({
    queryKey: ['partnerships', 'accepted'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return authFetchJson<{ success: boolean; data: CommunityPartnership[] }>(
        '/api/communities/partnerships?status=accepted', 
        { token }
      );
    },
    enabled: !!token,
    staleTime: 300000, // Cache for 5 minutes
  });

  const partnerships = partnershipsData?.data || [];
  
  // Get partner communities with their details
  const partnerCommunities = partnerships.map(partnership => {
    const isSource = partnership.sourceCommunityId === user?.cid;
    return {
      id: isSource ? partnership.targetCommunityId : partnership.sourceCommunityId,
      name: isSource ? partnership.targetCommunityName : partnership.sourceCommunityName,
      // Note: We'll need to fetch logo URLs from the communities API since partnerships don't include them
      partnership
    };
  }).filter((partner): partner is { id: string; name: string; partnership: CommunityPartnership } => 
    !!partner.id && !!partner.name
  );

  // Fetch community details including logo URLs and navigation metadata
  const { data: communitiesWithLogos } = useQuery({
    queryKey: ['partnerCommunitiesLogos', partnerCommunities.map(p => p.id)],
    queryFn: async () => {
      if (!token || partnerCommunities.length === 0) return [];
      
      // Fetch all communities to get logo URLs and navigation metadata
      const allCommunities = await authFetchJson<Array<{
        id: string;
        name: string;
        logoUrl?: string;
        communityShortId?: string;
        pluginId?: string;
      }>>('/api/communities', { token });
      
      // Match partner communities with their full metadata
      return partnerCommunities.map(partner => {
        const communityData = allCommunities.find(c => c.id === partner.id);
        return {
          ...partner,
          logoUrl: communityData?.logoUrl,
          communityShortId: communityData?.communityShortId,
          pluginId: communityData?.pluginId
        };
      });
    },
    enabled: !!token && partnerCommunities.length > 0,
    staleTime: 300000,
  });

  const partnersWithLogos = communitiesWithLogos || [];

  // Helper function to get community initials for avatar fallback
  const getCommunityInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCommunityClick = async (communityId: string) => {
    const partner = partnersWithLogos.find(p => p.id === communityId);
    if (!partner || !partner.communityShortId || !partner.pluginId) {
      console.error('Community navigation failed: Missing navigation metadata for', communityId);
      return;
    }

    setIsNavigating(communityId);
    try {
      // Navigate to partner community root (postId/boardId = -1 for community home)
      await navigateToPost(partner.communityShortId, partner.pluginId, -1, -1);
    } catch (error) {
      console.error('Community navigation failed:', error);
    } finally {
      setIsNavigating(null);
    }
  };

  // Don't show if loading or no partnerships
  if (isLoading || partnersWithLogos.length === 0) {
    return null;
  }

  const displayPartners = expanded ? partnersWithLogos : partnersWithLogos.slice(0, 4);
  const hasMore = partnersWithLogos.length > 4;

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-sm", className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium">Partner Communities</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {partnersWithLogos.length}
            </span>
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-6 w-6 p-0"
              >
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Partner Logos Grid */}
        <div className="grid grid-cols-4 gap-2">
          {displayPartners.map((partner) => {
            const navigatingThisCommunity = isNavigating === partner.id;
            
            return (
              <button
                key={partner.id}
                onClick={() => handleCommunityClick(partner.id)}
                disabled={navigatingThisCommunity}
                className={cn(
                  "relative group transition-all duration-200 hover:scale-105 focus:scale-105 focus:outline-none",
                  navigatingThisCommunity && "opacity-50 cursor-not-allowed"
                )}
                title={`${partner.name} • Partnership`}
              >
                <Avatar className="h-10 w-10 ring-1 ring-border hover:ring-2 hover:ring-emerald-400 transition-all shadow-sm hover:shadow-md">
                  {partner.logoUrl && (
                    <AvatarImage 
                      src={partner.logoUrl} 
                      alt={partner.name}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold">
                    {getCommunityInitials(partner.name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Loading indicator */}
                {navigatingThisCommunity && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                    <div className="h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Show more text when collapsed */}
        {!expanded && hasMore && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            +{partnersWithLogos.length - 4} more communities
          </button>
        )}
      </CardContent>
    </Card>
  );
}