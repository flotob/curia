'use client';

import React from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle } from 'lucide-react';

// ===== PHASE 2: ENHANCED ONLINE USERS SIDEBAR =====

export function OnlineUsersSidebar() {
  const { globalOnlineUsers, boardOnlineUsers, isConnected } = useSocket();

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
                      <p className="text-xs text-muted-foreground">
                        📋 Board {user.currentBoardId}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Board Users */}
      {boardOnlineUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-2 text-blue-500" />
                <span>In This Room</span>
              </div>
              <Badge variant="default" className="text-xs font-mono bg-blue-500">
                {boardOnlineUsers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {boardOnlineUsers.map((user) => (
                <div key={user.userId} className="flex items-center space-x-3 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} alt={user.userName} />
                      <AvatarFallback className="text-xs font-medium bg-blue-100 dark:bg-blue-900">
                        {user.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-blue-500 rounded-full border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.userName}</p>
                    {user.isTyping && (
                      <div className="flex items-center space-x-1">
                        <div className="flex space-x-1">
                          <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="h-1 w-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">typing</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 