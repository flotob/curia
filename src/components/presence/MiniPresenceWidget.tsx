'use client';

import React from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

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

// Micro device icon (8px)
const MicroDeviceIcon = ({ deviceType }: { deviceType: 'desktop' | 'mobile' | 'tablet' }) => {
  const iconProps = { size: 8, className: "text-muted-foreground" };
  
  switch (deviceType) {
    case 'desktop':
      return <Monitor {...iconProps} />;
    case 'mobile':
      return <Smartphone {...iconProps} />;
    case 'tablet':
      return <Tablet {...iconProps} />;
    default:
      return <Monitor {...iconProps} />;
  }
};

// Activity indicator with emoji-style icons
const ActivityIndicator = ({ device }: { device: DevicePresence }) => {
  if (device.currentBoardId) {
    return (
      <span className="text-xs" title={`Viewing ${device.currentBoardName || `Board ${device.currentBoardId}`}`}>
        📋
      </span>
    );
  }
  
  if (device.isActive) {
    return (
      <span className="text-xs" title="Active">
        ⚡
      </span>
    );
  }
  
  return (
    <span className="text-xs opacity-50" title="Idle">
      👀
    </span>
  );
};

// Ultra-compact user card for mini mode
const MiniUserCard = ({ 
  user, 
  onUserClick, 
  isCurrentCommunity 
}: { 
  user: EnhancedUserPresence; 
  onUserClick: (user: EnhancedUserPresence, boardId?: number) => void;
  isCurrentCommunity: boolean;
}) => {
  const hasMultipleDevices = user.totalDevices > 1;
  const primaryBoard = user.primaryDevice.currentBoardId;
  
  return (
    <div 
      className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded cursor-pointer transition-colors group"
      onClick={() => onUserClick(user, primaryBoard)}
    >
      {/* Avatar with status */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-5 w-5 border border-border">
          <AvatarImage src={user.avatarUrl} alt={user.userName} />
          <AvatarFallback className="text-[8px] font-medium">
            {user.userName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background",
          user.isOnline ? "bg-green-500" : "bg-gray-400"
        )} />
        {/* Community indicator for foreign users */}
        {!isCurrentCommunity && (
          <div className="absolute -top-0.5 -left-0.5 h-2 w-2 bg-blue-500 rounded-full border border-background">
            <span className="sr-only">From other community</span>
          </div>
        )}
      </div>
      
      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1">
          <span className="text-xs font-medium truncate max-w-[100px]">
            {user.userName}
          </span>
          
          {/* Device indicators */}
          <div className="flex space-x-0.5">
            {hasMultipleDevices ? (
              <>
                <Badge variant="outline" className="h-3 px-1 text-[8px] font-normal">
                  {user.totalDevices}
                </Badge>
                {user.devices.slice(0, 2).map((device) => (
                  <MicroDeviceIcon key={device.frameUID} deviceType={device.deviceType} />
                ))}
              </>
            ) : (
              <MicroDeviceIcon deviceType={user.primaryDevice.deviceType} />
            )}
          </div>
        </div>
      </div>
      
      {/* Activity indicator */}
      <div className="flex-shrink-0">
        <ActivityIndicator device={user.primaryDevice} />
      </div>
      
      {/* External link hint on hover or foreign community indicator */}
      {primaryBoard && (
        <>
          {!isCurrentCommunity && (
            <span className="text-[8px] opacity-60">🔗</span>
          )}
          <ExternalLink size={8} className="opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
        </>
      )}
    </div>
  );
};

// Main mini presence widget component
export function MiniPresenceWidget({ onExpand }: { onExpand?: () => void }) {
  const { 
    enhancedUserPresence, 
    isConnected, 
    currentCommunityUsers, 
    otherCommunityGroups 
  } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleUserClick = (user: EnhancedUserPresence, boardId?: number) => {
    if (boardId) {
      // Only navigate if user is from current community
      const isCurrentCommunity = currentCommunityUsers.some(u => u.userId === user.userId);
      
      if (isCurrentCommunity) {
        // Navigate to the user's board and expand
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('boardId', boardId.toString());
        router.push(`/?${params.toString()}`);
      } else {
        // Foreign community - just expand for now
        console.log(`Would navigate to board ${boardId} in community ${user.communityId} (not implemented)`);
      }
    }
    
    // Trigger expand callback if provided
    onExpand?.();
  };
  
  const handleHeaderClick = () => {
    // Just expand without navigation
    onExpand?.();
  };
  
  const totalUsers = enhancedUserPresence.length;
  const totalDevices = enhancedUserPresence.reduce((sum, user) => sum + user.totalDevices, 0);
  const localUsers = currentCommunityUsers.length;
  const globalUsers = otherCommunityGroups.reduce((sum, group) => sum + group.totalUsers, 0);
  
  // Prioritize current community users in mini mode display
  const prioritizedUsers = [
    ...currentCommunityUsers,
    // Add top users from other communities (max 2-3 to fit in mini mode)
    ...otherCommunityGroups.flatMap(group => group.users).slice(0, 3)
  ];
  
  if (!isConnected) {
    return (
      <div className="w-full h-full flex flex-col bg-background border border-border rounded-lg overflow-hidden">
        {/* Connection status header */}
        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-border">
          <div className="flex items-center space-x-2">
            <WifiOff size={12} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
              Connecting...
            </span>
          </div>
        </div>
        
        {/* Loading animation */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse">
              <Users size={20} className="text-muted-foreground mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Loading</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mini-mode-container flex flex-col bg-background border border-border rounded-lg overflow-hidden">
      {/* Compact header */}
      <div 
        className="p-2 bg-primary/5 border-b border-border cursor-pointer hover:bg-primary/10 transition-colors flex-shrink-0"
        onClick={handleHeaderClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "h-2 w-2 rounded-full flex-shrink-0",
              isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <div className="flex items-center space-x-1">
              <span className="text-xs font-medium">
                {localUsers} Local
              </span>
              {globalUsers > 0 && (
                <span className="text-[8px] text-muted-foreground">
                  +{globalUsers} 🌐
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="h-4 px-1.5 text-[8px] font-mono">
              {totalDevices}
            </Badge>
            <Activity size={10} className="text-muted-foreground" />
          </div>
        </div>
      </div>
      
      {/* User list */}
      <div className="flex-1 overflow-y-auto mini-mode-scroll">
        {totalUsers === 0 ? (
          <div className="h-full flex items-center justify-center p-2">
            <div className="text-center">
              <Users size={16} className="text-muted-foreground mx-auto mb-1" />
              <div className="text-[10px] text-muted-foreground">
                No one online
              </div>
            </div>
          </div>
        ) : (
          <div className="p-1 space-y-0.5">
            {prioritizedUsers.map((user) => {
              const isCurrentCommunity = currentCommunityUsers.some(u => u.userId === user.userId);
              return (
                <MiniUserCard 
                  key={user.userId} 
                  user={user} 
                  onUserClick={handleUserClick}
                  isCurrentCommunity={isCurrentCommunity}
                />
              );
            })}
          </div>
        )}
      </div>
      
      {/* Connection indicator footer */}
      <div className="p-1 border-t border-border bg-muted/30 flex-shrink-0">
        <div className="flex items-center justify-center space-x-1">
          <Wifi size={8} className="text-green-500" />
          <span className="text-[8px] text-muted-foreground font-mono">
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
} 