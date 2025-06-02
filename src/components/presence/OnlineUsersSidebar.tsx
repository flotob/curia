'use client';

import React from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle } from 'lucide-react';

// ===== PHASE 1: BASIC ONLINE USERS SIDEBAR =====

export function OnlineUsersSidebar() {
  const { globalOnlineUsers, boardOnlineUsers, isConnected } = useSocket();

  if (!isConnected) {
    return (
      <div className="w-64 p-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Connecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-64 p-4 space-y-4">
      {/* Global Online Users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Online Globally
            </div>
            <Badge variant="secondary" className="text-xs">
              {globalOnlineUsers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {globalOnlineUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one online</p>
          ) : (
            globalOnlineUsers.map((user) => (
              <div key={user.userId} className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatarUrl} alt={user.userName} />
                  <AvatarFallback className="text-xs">
                    {user.userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.userName}</p>
                  {user.currentBoardId && (
                    <p className="text-xs text-muted-foreground">
                      Board {user.currentBoardId}
                    </p>
                  )}
                </div>
                <div className="h-2 w-2 bg-green-500 rounded-full" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Current Board Users */}
      {boardOnlineUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                In This Board
              </div>
              <Badge variant="secondary" className="text-xs">
                {boardOnlineUsers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {boardOnlineUsers.map((user) => (
              <div key={user.userId} className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatarUrl} alt={user.userName} />
                  <AvatarFallback className="text-xs">
                    {user.userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.userName}</p>
                  {user.isTyping && (
                    <p className="text-xs text-blue-500">typing...</p>
                  )}
                </div>
                <div className="h-2 w-2 bg-blue-500 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Phase 1 Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs text-muted-foreground">
              Debug Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Global: {globalOnlineUsers.length} users</p>
              <p>Board: {boardOnlineUsers.length} users</p>
              <p>Connected: {isConnected ? '✅' : '❌'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 