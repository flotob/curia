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
  Activity
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
const DeviceCard = ({ device, isPrimary = false }: { device: DevicePresence; isPrimary?: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const navigateToBoard = (boardId: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('boardId', boardId.toString());
    router.push(`/?${params.toString()}`);
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
            onClick={() => navigateToBoard(device.currentBoardId!)}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer flex items-center group transition-colors hover:underline"
          >
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
const UserPresenceCard = ({ user }: { user: EnhancedUserPresence }) => {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleDevices = user.totalDevices > 1;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const navigateToBoard = (boardId: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('boardId', boardId.toString());
    router.push(`/?${params.toString()}`);
  };
  
  return (
    <Card className="transition-all duration-200 hover:shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl} alt={user.userName} />
              <AvatarFallback className="text-xs font-medium">
                {user.userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
              user.isOnline ? "bg-green-500" : "bg-gray-400"
            )} />
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
                {user.primaryDevice.currentBoardId && (
                  <button
                    onClick={() => navigateToBoard(user.primaryDevice.currentBoardId!)}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer hover:underline transition-colors"
                  >
                    📋 {user.primaryDevice.currentBoardName || `Board ${user.primaryDevice.currentBoardId}`}
                  </button>
                )}
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Activity size={10} />
                  <span>{formatTimeAgo(user.lastSeen)}</span>
                </div>
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

// Main enhanced sidebar component
export function EnhancedOnlineUsersSidebar() {
  const { enhancedUserPresence, isConnected } = useSocket();
  
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
  
  const totalUsers = enhancedUserPresence.length;
  const totalDevices = enhancedUserPresence.reduce((sum, user) => sum + user.totalDevices, 0);
  
  return (
    <div className="w-64 xl:w-72 p-4 space-y-4 max-h-screen overflow-y-auto">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <div>
                <div className="font-medium text-sm">Online</div>
                <div className="text-xs text-muted-foreground">
                  {totalUsers} users • {totalDevices} devices
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {totalUsers}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* User list */}
      {totalUsers === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No one else online</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {enhancedUserPresence.map((user) => (
            <UserPresenceCard key={user.userId} user={user} />
          ))}
        </div>
      )}
    </div>
  );
} 