'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { CommunityPartnership } from '@/types/partnerships';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Community {
  id: string;
  name: string;
  communityShortId?: string;
  pluginId?: string;
  logoUrl?: string;
  lastVisitedAt: string;
  visitCount: number;
  firstVisitedAt: string;
}

interface CommunitySelectorProps {
  currentCommunityId: string;
  onCommunityChange: (communityId: string) => void;
  className?: string;
}

export function CommunitySelector({ 
  currentCommunityId, 
  onCommunityChange, 
  className 
}: CommunitySelectorProps) {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch user's communities filtered by partnerships
  const { data: communitiesResponse, isLoading } = useQuery({
    queryKey: ['userCommunitiesForWhatsNew'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      
      // Get all user communities
      const allCommunitiesResponse = await authFetchJson<{ success: boolean; communities: Community[] }>('/api/me/communities', { token });
      const allCommunities = allCommunitiesResponse.communities || [];
      
      // Get partnerships for current community to filter communities
      const partnershipsResponse = await authFetchJson<{ success: boolean; data: CommunityPartnership[] }>('/api/communities/partnerships', { token });
      const partnerships = partnershipsResponse.data || [];
      
      // Create set of partner community IDs (both source and target)
      const partnerCommunityIds = new Set<string>();
      partnerships.forEach(partnership => {
        if (partnership.status === 'accepted') {
          partnerCommunityIds.add(partnership.sourceCommunityId);
          partnerCommunityIds.add(partnership.targetCommunityId);
        }
      });
      
      // Filter communities: current community + accepted partner communities only
      const filteredCommunities = allCommunities.filter(community => 
        community.id === currentCommunityId || partnerCommunityIds.has(community.id)
      );
      
      return { success: true, communities: filteredCommunities };
    },
    enabled: !!token && !!currentCommunityId,
    staleTime: 60000, // Cache for 1 minute
  });

  const communities = communitiesResponse?.communities || [];
  const currentCommunity = communities.find(c => c.id === currentCommunityId);

  // Helper function to get community initials for avatar
  const getCommunityInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to format last visited
  const formatLastVisited = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handleCommunitySelect = (communityId: string) => {
    onCommunityChange(communityId);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between h-auto p-3 min-w-[160px] sm:min-w-[240px] max-w-full",
            className
          )}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {currentCommunity?.logoUrl && (
                <AvatarImage src={currentCommunity.logoUrl} alt={currentCommunity.name} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                {currentCommunity ? getCommunityInitials(currentCommunity.name) : <Globe className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm">
                {currentCommunity?.name || 'Select Community'}
              </span>
              {currentCommunity && (
                <span className="text-xs text-muted-foreground">
                  {currentCommunity.visitCount} visits
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-[200px] sm:w-[280px] max-h-[400px] overflow-y-auto"
      >
        {communities.map((community) => {
          const isCurrentCommunity = community.id === currentCommunityId;
          const isPartnerCommunity = !isCurrentCommunity;
          
          return (
            <DropdownMenuItem
              key={community.id}
              onClick={() => handleCommunitySelect(community.id)}
              className="p-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {community.logoUrl && (
                    <AvatarImage src={community.logoUrl} alt={community.name} />
                  )}
                  <AvatarFallback className={cn(
                    "text-white text-sm font-semibold",
                    isCurrentCommunity 
                      ? "bg-gradient-to-br from-blue-500 to-purple-600"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  )}>
                    {getCommunityInitials(community.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {community.name}
                    </span>
                    {isCurrentCommunity && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    {isPartnerCommunity && (
                      <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-full flex-shrink-0">
                        Partner
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatLastVisited(community.lastVisitedAt)}</span>
                    <span>•</span>
                    <span>{community.visitCount} visits</span>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        
        {communities.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No partner communities</p>
            <p className="text-xs">Create partnerships with other communities to see them here</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 