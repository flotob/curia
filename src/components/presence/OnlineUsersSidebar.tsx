'use client';

import React from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, ExternalLink } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// ===== PHASE 2: ENHANCED ONLINE USERS SIDEBAR =====

export function OnlineUsersSidebar() {
  const { globalOnlineUsers, isConnected } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper function to build URLs while preserving current parameters
  const buildInternalUrl = (path: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Add/override with new params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    return `${path}?${params.toString()}`;
  };

  // Handle navigation to board
  const handleBoardNavigation = (boardId: number) => {
    const url = buildInternalUrl('/', { boardId: boardId.toString() });
    console.log(`[OnlineUsersSidebar] Internal navigation to board ${boardId}: ${url}`);
    router.push(url);
  };

  if (!isConnected) {
    return (
      <div className="w-64 xl:w-72 p-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
              <p className="text-sm text-muted-foreground">Connecting...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-64 xl:w-72 p-4 space-y-4 max-h-screen overflow-y-auto">
      {/* Global Online Users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2" />
              <span>Online</span>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {globalOnlineUsers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {globalOnlineUsers.length === 0 ? (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No one else online</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {globalOnlineUsers.map((user) => (
                <div key={user.userId} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} alt={user.userName} />
                      <AvatarFallback className="text-xs font-medium">
                        {user.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.userName}</p>
                    {user.currentBoardId && (
                      <button
                        onClick={() => handleBoardNavigation(user.currentBoardId!)}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer flex items-center group transition-colors text-left"
                      >
                        📋 {user.currentBoardName || `Board ${user.currentBoardId}`}
                        <ExternalLink size={10} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
} 