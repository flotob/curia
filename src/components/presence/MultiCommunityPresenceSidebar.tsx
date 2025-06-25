'use client';

import React, { useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


import { 
  Users, 
  ChevronDown, 
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  Clock,
  Activity,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContextualNavigationCard } from './ContextualNavigationCard';
import { PartnerCommunitiesWidget } from '@/components/partnerships/PartnerCommunitiesWidget';
import { TypingIndicator } from './TypingIndicator';
import { useTypingContext } from '@/hooks/useTypingContext';
import { useCrossCommunityNavigation } from '@/hooks/useCrossCommunityNavigation';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { ApiPost } from '@/app/api/posts/route';

// Enhanced interfaces (Socket.IO serializes dates as strings)
interface DevicePresence {
  frameUID: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  currentBoardId?: number;
  currentBoardName?: string;
  connectedAt: Date | string;
  lastSeen: Date | string;
  socketId: string;
  isActive: boolean;
  
  // 🆕 Cross-community navigation metadata
  communityShortId?: string;
  pluginId?: string;
}

interface EnhancedUserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  devices: DevicePresence[];
  totalDevices: number;
  isOnline: boolean;
  primaryDevice: DevicePresence;
  lastSeen: Date | string;
}

interface CommunityPresenceGroup {
  communityId: string;
  communityName: string;
  users: EnhancedUserPresence[];
  totalUsers: number;
  totalDevices: number;
  isCurrentCommunity: boolean;
}

// Device icon mapping
const DeviceIcon = ({ deviceType, className }: { deviceType: 'desktop' | 'mobile' | 'tablet'; className?: string }) => {
  switch (deviceType) {
    case 'desktop':
      return <Monitor className={cn("h-3 w-3", className)} />;
    case 'mobile':
      return <Smartphone className={cn("h-3 w-3", className)} />;
    case 'tablet':
      return <Tablet className={cn("h-3 w-3", className)} />;
    default:
      return <Monitor className={cn("h-3 w-3", className)} />;
  }
};

// Time formatting utility
const formatTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diff = now.getTime() - targetDate.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return targetDate.toLocaleDateString();
};

// Individual device display component
const DeviceCard = ({ device, isPrimary = false, isCurrentCommunity = true }: { device: DevicePresence; isPrimary?: boolean; isCurrentCommunity?: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigateToPost } = useCrossCommunityNavigation();
  
  const navigateToBoard = async (targetDevice: DevicePresence) => {
    if (isCurrentCommunity) {
      // Same community - normal navigation  
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('boardId', targetDevice.currentBoardId!.toString());
      router.push(`/?${params.toString()}`);
    } else {
      // ✅ Cross-community navigation to board
      if (!targetDevice.communityShortId || !targetDevice.pluginId || !targetDevice.currentBoardId) {
        console.warn('Missing cross-community metadata for board navigation');
        return;
      }
      
      console.log(`[CrossCommunity] Navigating to board ${targetDevice.currentBoardName} in ${targetDevice.communityShortId}`);
      
      // Navigate to board home (no specific post)
      await navigateToPost(
        targetDevice.communityShortId,
        targetDevice.pluginId,
        -1, // No specific post - go to board home
        targetDevice.currentBoardId // Target this specific board
      );
    }
  };
  
  return (
    <div className={cn(
      "flex items-center space-x-3 p-2 rounded-md transition-colors",
      isPrimary && "bg-primary/5 border border-primary/20"
    )}>
      <div className="flex items-center space-x-1">
        <DeviceIcon deviceType={device.deviceType} />
        {device.isActive && (
          <div className="h-2 w-2 bg-green-500 rounded-full" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={cn(
            "text-sm font-medium capitalize",
            isPrimary && "text-primary"
          )}>
            {device.deviceType}
            {isPrimary && " (Primary)"}
          </span>
        </div>
        
        {device.currentBoardId && (
          <button
            onClick={() => navigateToBoard(device)}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer flex items-center group transition-colors hover:underline"
          >
            {!isCurrentCommunity && "🔗 "}
            📋 {device.currentBoardName || `Board ${device.currentBoardId}`}
            <ExternalLink size={8} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <Clock size={10} />
          <span>{formatTimeAgo(device.lastSeen)}</span>
        </div>
      </div>
    </div>
  );
};

// Individual user presence card component
const UserPresenceCard = ({ 
  user, 
  isCurrentCommunity = true 
}: { 
  user: EnhancedUserPresence; 
  isCurrentCommunity?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleDevices = user.totalDevices > 1;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigateToPost } = useCrossCommunityNavigation();
  
  // Get typing context for this user
  const typingContext = useTypingContext(user.userId);
  
  const navigateToBoard = async (device: DevicePresence) => {
    if (isCurrentCommunity) {
      // Same community - normal navigation  
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('boardId', device.currentBoardId!.toString());
      router.push(`/?${params.toString()}`);
    } else {
      // ✅ Cross-community navigation to board
      if (!device.communityShortId || !device.pluginId || !device.currentBoardId) {
        console.warn('Missing cross-community metadata for board navigation');
        return;
      }
      
      console.log(`[CrossCommunity] Navigating to board ${device.currentBoardName} in ${device.communityShortId}`);
      
      // Navigate to board home (no specific post)
      await navigateToPost(
        device.communityShortId,
        device.pluginId,
        -1, // No specific post - go to board home
        device.currentBoardId // Target this specific board
      );
    }
  };
  
  return (
    <Card className="transition-all duration-200 hover:shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className={cn(
              "h-8 w-8 transition-all duration-300",
              typingContext.isTyping && "ring-2 ring-amber-400 ring-opacity-50 animate-pulse"
            )}>
              <AvatarImage src={user.avatarUrl} alt={user.userName} />
              <AvatarFallback className="text-xs font-medium">
                {user.userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
              user.isOnline ? "bg-green-500" : "bg-gray-400"
            )} />
            {/* Community indicator */}
            {!isCurrentCommunity && (
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full border-2 border-background flex items-center justify-center">
                <Building2 size={8} className="text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium truncate">{user.userName}</span>
              
              {/* Multi-device indicator */}
              {hasMultipleDevices && (
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer h-5 px-1.5 flex items-center space-x-1 hover:bg-secondary/80 transition-colors"
                  onClick={() => setExpanded(!expanded)}
                  title="Click to see all devices"
                >
                  <span>{user.totalDevices}</span>
                  <div className="flex space-x-0.5">
                    {user.devices.slice(0, 3).map((device) => (
                      <DeviceIcon 
                        key={device.frameUID} 
                        deviceType={device.deviceType}
                        className="h-2.5 w-2.5"
                      />
                    ))}
                    {user.devices.length > 3 && (
                      <span className="text-xs">+</span>
                    )}
                  </div>
                </Badge>
              )}
              
              {/* Single device indicator */}
              {!hasMultipleDevices && (
                <DeviceIcon deviceType={user.primaryDevice.deviceType} />
              )}
            </div>
            
            {/* Primary activity (collapsed view) */}
            {!expanded && (
              <>
                {/* Show typing indicator if user is typing */}
                {typingContext.isTyping ? (
                  <TypingIndicator 
                    variant="dots"
                    context={typingContext.context || undefined}
                    postTitle={typingContext.postTitle}
                    size="sm"
                    showIcon={false}
                  />
                ) : (
                  <>
                    {user.primaryDevice.currentBoardId && (
                      <button
                        onClick={() => navigateToBoard(user.primaryDevice)}
                        className="text-xs hover:underline transition-colors text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title={isCurrentCommunity ? undefined : `Navigate to ${user.primaryDevice.currentBoardName} in other community`}
                      >
                        {!isCurrentCommunity && "🔗 "}
                        📋 {user.primaryDevice.currentBoardName || `Board ${user.primaryDevice.currentBoardId}`}
                      </button>
                    )}
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Activity size={10} />
                      <span>{formatTimeAgo(user.lastSeen)}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* Expand/collapse button for multi-device users */}
          {hasMultipleDevices && (
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
        
        {/* Expanded device list */}
        {expanded && hasMultipleDevices && (
          <div className="mt-3 space-y-1 pl-11">
            {user.devices.map((device, index) => (
              <DeviceCard 
                key={device.frameUID} 
                device={device} 
                isPrimary={index === 0}
                isCurrentCommunity={isCurrentCommunity}
              />
            ))}
            
            {/* Overall status */}
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  user.isOnline ? "bg-green-500" : "bg-gray-400"
                )} />
                <span>
                  Overall: {user.isOnline ? 'Active' : 'Away'} since {formatTimeAgo(user.lastSeen)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Community group component
const CommunityGroupSection = ({ group }: { group: CommunityPresenceGroup }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { navigateToPost } = useCrossCommunityNavigation();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Handle community name click for cross-community navigation
  const handleCommunityClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expand/collapse
    
    // Get a sample user from this community to extract metadata
    const sampleUser = group.users[0];
    if (!sampleUser?.primaryDevice?.communityShortId || !sampleUser?.primaryDevice?.pluginId) {
      console.warn('Missing cross-community navigation metadata for community:', group.communityName);
      return;
    }
    
    console.log(`[CommunityGroupSection] Navigating to community: ${group.communityName}`);
    setIsNavigating(true);
    
    // Navigate to community root (no specific post)
    await navigateToPost(
      sampleUser.primaryDevice.communityShortId,
      sampleUser.primaryDevice.pluginId,
      -1, // No specific post - go to community root
      -1  // No specific board - go to community root
    );
    
    setIsNavigating(false);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
        <div className="flex items-center space-x-2 flex-1">
          <Building2 size={14} className="text-muted-foreground" />
          
          {/* 🆕 Clickable community name for cross-community navigation */}
          <button
            onClick={handleCommunityClick}
            disabled={isNavigating}
            className="font-medium text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Navigate to ${group.communityName}`}
          >
            {isNavigating && "🔄 "}
            {group.communityName}
          </button>
          
          <Badge variant="outline" className="text-xs">
            {group.totalUsers}
          </Badge>
        </div>
        
        {/* Expand/collapse button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="space-y-2 mt-2">
          {group.users.map((user) => (
            <UserPresenceCard 
              key={user.userId} 
              user={user} 
              isCurrentCommunity={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Navigation context interface (reused from ContextualNavigationCard)
interface NavigationContext {
  type: 'home' | 'board' | 'post';
  boardId?: string | null;
  postId?: string | null;
  isPostDetail: boolean;
}

// Enhanced props interface
interface MultiCommunityPresenceSidebarProps {
  navigationContext?: NavigationContext;
  currentBoard?: ApiBoard;
  currentPost?: ApiPost;
}

// Main multi-community sidebar component
export function MultiCommunityPresenceSidebar({ 
  navigationContext,
  currentBoard,
  currentPost 
}: MultiCommunityPresenceSidebarProps = {}) {
  const { 
    isConnected, 
    currentCommunityUsers, 
    otherCommunityGroups,
    communityGroups 
  } = useSocket();
  
  if (!isConnected) {
    return (
      <div className="w-64 xl:w-72 p-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
              <div>
                <div className="font-medium text-sm">Connecting...</div>
                <div className="text-xs text-muted-foreground">Loading presence data</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const totalUsers = communityGroups.reduce((sum, group) => sum + group.totalUsers, 0);
  const totalDevices = communityGroups.reduce((sum, group) => sum + group.totalDevices, 0);
  const totalOtherUsers = otherCommunityGroups.reduce((sum, group) => sum + group.totalUsers, 0);
  
  return (
    <div className="w-64 xl:w-72 p-4 space-y-4 max-h-screen overflow-y-auto">
      {/* Navigation Context Card */}
      {navigationContext && (
        <ContextualNavigationCard 
          data={{
            navigationContext,
            currentBoard,
            currentPost,
            commentCount: currentPost?.comment_count
          }}
        />
      )}
      
      {/* Partner Communities Widget */}
      <PartnerCommunitiesWidget />
      
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <div>
                <div className="font-medium text-sm">Online</div>
                <div className="text-xs text-muted-foreground">
                  {currentCommunityUsers.length} local • {totalOtherUsers} partners • {totalDevices} devices
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {totalUsers}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Current Community Section */}
      {currentCommunityUsers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-semibold text-sm">Your Community</h3>
            <Badge className="text-xs">{currentCommunityUsers.length}</Badge>
          </div>
          <div className="space-y-2">
            {currentCommunityUsers.map((user) => (
              <UserPresenceCard 
                key={user.userId} 
                user={user} 
                isCurrentCommunity={true}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Partner Communities Section */}
      {otherCommunityGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Partner Communities</h3>
            <Badge variant="outline" className="text-xs">{totalOtherUsers}</Badge>
          </div>
          <div className="space-y-2">
            {otherCommunityGroups.map((group) => (
              <CommunityGroupSection key={group.communityId} group={group} />
            ))}
          </div>
        </div>
      )}
      
      {/* No users online */}
      {totalUsers === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No one else online</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 