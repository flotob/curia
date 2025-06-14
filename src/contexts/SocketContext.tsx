'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetchJson } from '@/utils/authFetch';
import { ApiCommunity } from '@/app/api/communities/route';
import { useUPActivation } from './ConditionalUniversalProfileProvider';

// ===== ENHANCED SOCKET CONTEXT WITH MULTI-DEVICE PRESENCE =====

// Device-specific presence (Socket.IO serializes dates as strings)
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
}

// Enhanced user presence (Socket.IO serializes dates as strings)
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

// Legacy interface for backward compatibility
interface OnlineUser {
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  currentBoardId?: number;
  currentBoardName?: string;
  isTyping?: boolean;
}

// Community grouping interfaces
interface CommunityPresenceGroup {
  communityId: string;
  communityName: string;
  users: EnhancedUserPresence[];
  totalUsers: number;
  totalDevices: number;
  isCurrentCommunity: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinBoard: (boardId: number) => void;
  leaveBoard: (boardId: number) => void;
  sendTyping: (boardId: number, postId?: number, isTyping?: boolean) => void;
  // Legacy presence state (for backward compatibility)
  globalOnlineUsers: OnlineUser[];
  boardOnlineUsers: OnlineUser[];
  // Enhanced multi-device presence
  enhancedUserPresence: EnhancedUserPresence[];
  // Community-grouped presence
  communityGroups: CommunityPresenceGroup[];
  currentCommunityUsers: EnhancedUserPresence[];
  otherCommunityGroups: CommunityPresenceGroup[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated, user } = useAuth();
  const { hasUserTriggeredConnection } = useUPActivation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Legacy presence state (for backward compatibility)
  const [globalOnlineUsers, setGlobalOnlineUsers] = useState<OnlineUser[]>([]);
  const [boardOnlineUsers, setBoardOnlineUsers] = useState<OnlineUser[]>([]);
  
  // Enhanced multi-device presence state
  const [enhancedUserPresence, setEnhancedUserPresence] = useState<EnhancedUserPresence[]>([]);
  
  // Extract only the stable parts we need from user to avoid unnecessary reconnections
  const userId = user?.userId;
  const currentCommunityId = user?.cid;

  // Fetch all communities for name resolution
  const { data: allCommunities = [] } = useQuery<ApiCommunity[]>({
    queryKey: ['communities'],
    queryFn: async () => {
      if (!token) throw new Error('No auth token available');
      return authFetchJson<ApiCommunity[]>('/api/communities', { token });
    },
    enabled: !!isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Compute community-grouped presence data
  const communityPresenceData = useMemo(() => {
    if (!allCommunities.length || !enhancedUserPresence.length) {
      return {
        communityGroups: [],
        currentCommunityUsers: [],
        otherCommunityGroups: []
      };
    }

    // Create a map for fast community name lookup
    const communityNameMap = new Map(
      allCommunities.map(community => [community.id, community.name])
    );

    // Group users by community
    const groupedByCommunity = enhancedUserPresence.reduce((acc, user) => {
      if (!acc[user.communityId]) {
        acc[user.communityId] = [];
      }
      acc[user.communityId].push(user);
      return acc;
    }, {} as Record<string, EnhancedUserPresence[]>);

    // Create community groups
    const communityGroups: CommunityPresenceGroup[] = Object.entries(groupedByCommunity).map(([communityId, users]) => ({
      communityId,
      communityName: communityNameMap.get(communityId) || `Community ${communityId}`,
      users,
      totalUsers: users.length,
      totalDevices: users.reduce((sum, user) => sum + user.totalDevices, 0),
      isCurrentCommunity: communityId === currentCommunityId
    }));

    // Separate current and other community groups
    const currentCommunityUsers = groupedByCommunity[currentCommunityId || ''] || [];
    const otherCommunityGroups = communityGroups.filter(group => !group.isCurrentCommunity);

    return {
      communityGroups,
      currentCommunityUsers,
      otherCommunityGroups
    };
  }, [allCommunities, enhancedUserPresence, currentCommunityId]);

  // Helper function to build URLs while preserving current parameters
  const buildInternalUrl = useCallback((path: string, additionalParams: Record<string, string> = {}) => {
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
  }, [searchParams]);

  // Internal navigation functions
  const navigateToPost = useCallback((postId: number, boardId: number) => {
    const url = `/board/${boardId}/post/${postId}`;
    const urlWithParams = buildInternalUrl(url);
    console.log(`[Socket] Internal navigation to post ${postId} in board ${boardId}: ${urlWithParams}`);
    router.push(urlWithParams);
  }, [router, buildInternalUrl]);

  const navigateToBoard = useCallback((boardId: number) => {
    const url = buildInternalUrl('/', { boardId: boardId.toString() });
    console.log(`[Socket] Internal navigation to board ${boardId}: ${url}`);
    router.push(url);
  }, [router, buildInternalUrl]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        console.log('[Socket] Auth lost or token missing. Disconnecting existing socket:', socket.id);
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = process.env.NODE_ENV === 'production' ? undefined : undefined;
    
    // Always use polling when Web3-Onboard is active to avoid WebSocket conflicts
    const transports = hasUserTriggeredConnection
      ? ['polling']
      : ['websocket', 'polling'];
    
    console.log(`[Socket] Transport strategy: ${transports.join(', ')} (UP active: ${hasUserTriggeredConnection}, force polling: ${hasUserTriggeredConnection})`);
    
    const newSocket = io(socketUrl || '', {
      auth: { token },
      transports: transports,
      // Enhanced reconnection settings to handle any temporary disconnections
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected successfully:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason: Socket.DisconnectReason) => {
      console.log('[Socket] Disconnected from:', newSocket.id, 'Reason:', reason);
      setIsConnected(false);
      setSocket(prevSocket => (prevSocket === newSocket ? null : prevSocket));
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('[Socket] Connection error for:', newSocket.id, error);
      setIsConnected(false);
      setSocket(prevSocket => (prevSocket === newSocket ? null : prevSocket));
    });

    newSocket.on('boardJoined', ({ boardId }: { boardId: number }) => {
      console.log(`[Socket] Successfully joined board room: ${boardId}`);
    });

    newSocket.on('error', ({ message }: { message: string }) => {
      console.error('[Socket] Server error:', message);
      toast.error(`Connection error: ${message}`);
    });

    newSocket.on('newPost', (postData: { id: number; title: string; author_name?: string; author_user_id: string; board_id: number }) => {
      console.log('[Socket] New post received:', postData);
      if (postData.author_user_id !== userId) {
        toast.success(`New post: "${postData.title}" by ${postData.author_name || 'Unknown'}`, {
          action: {
            label: 'View Post',
            onClick: () => navigateToPost(postData.id, postData.board_id)
          }
        });
        console.log(`[RQ Invalidate] Invalidating posts for board: ${postData.board_id}`);
        queryClient.invalidateQueries({ queryKey: ['posts', postData.board_id?.toString()] });
        // Also invalidate home feed (aggregated view from all boards)
        console.log(`[RQ Invalidate] Invalidating home feed for new post`);
        queryClient.invalidateQueries({ queryKey: ['posts', null] });
      }
    });

    newSocket.on('voteUpdate', (voteData: { postId: number; newCount: number; userIdVoted: string; board_id: number; post_title: string; board_name: string }) => {
      console.log(`[Socket] Vote update for post "${voteData.post_title}": ${voteData.newCount} votes by ${voteData.userIdVoted}`);
      if (voteData.userIdVoted !== userId) {
        toast.info(`"${voteData.post_title}" received ${voteData.newCount} vote${voteData.newCount !== 1 ? 's' : ''}`, {
          action: {
            label: 'View Post',
            onClick: () => navigateToPost(voteData.postId, voteData.board_id)
          }
        });
        console.log(`[RQ Invalidate] Invalidating posts for board: ${voteData.board_id} due to vote.`);
        queryClient.invalidateQueries({ queryKey: ['posts', voteData.board_id?.toString()] });
        // Also invalidate home feed (vote count changes affect sorting order)
        console.log(`[RQ Invalidate] Invalidating home feed for vote update`);
        queryClient.invalidateQueries({ queryKey: ['posts', null] });
        // ALSO invalidate individual post query for detail views
        console.log(`[RQ Invalidate] Invalidating individual post query for post: ${voteData.postId}`);
        queryClient.invalidateQueries({ queryKey: ['post', voteData.postId] });
      }
    });

    newSocket.on('newComment', (commentData: { postId: number; post_title: string; board_id: number; board_name: string; comment: { author_user_id: string; author_name?: string; id: number; post_id: number; board_id: number; post_title: string; board_name: string; /* other comment props */ } }) => {
      console.log(`[Socket] New comment on post "${commentData.post_title}":`, commentData.comment);
      if (commentData.comment.author_user_id !== userId) {
        toast.info(`${commentData.comment.author_name || 'Unknown'} commented on "${commentData.post_title}"`, {
          action: {
            label: 'View Post',
            onClick: () => navigateToPost(commentData.postId, commentData.board_id)
          }
        });
        console.log(`[RQ Invalidate] Invalidating comments for post: ${commentData.postId}`);
        queryClient.invalidateQueries({ queryKey: ['comments', commentData.postId] });
        
        if (commentData.board_id) {
            console.log(`[RQ Invalidate] Invalidating posts for board: ${commentData.board_id} due to new comment.`);
            queryClient.invalidateQueries({ queryKey: ['posts', commentData.board_id.toString()] });
        } else {
            console.warn('[Socket newComment] board_id missing in comment payload, cannot invalidate specific post list for comment count.');
        }
        
        // Always invalidate home feed for new comments (comment count changes are visible there)
        console.log(`[RQ Invalidate] Invalidating home feed for new comment`);
        queryClient.invalidateQueries({ queryKey: ['posts', null] });
        // ALSO invalidate individual post query for detail views (comment count changes)
        console.log(`[RQ Invalidate] Invalidating individual post query for post: ${commentData.postId} due to new comment`);
        queryClient.invalidateQueries({ queryKey: ['post', commentData.postId] });
      }
    });

    newSocket.on('userJoinedBoard', ({ userId: joinedUserId, userName: joinedUserName, boardId }: { userId: string; userName?: string; boardId: number }) => {
      console.log(`[Socket] User ${joinedUserName || joinedUserId} joined board ${boardId}`);
      if (joinedUserId !== userId) {
        toast.info(`${joinedUserName || 'Someone'} joined the discussion`);
      }
      
      // Update board presence
      setBoardOnlineUsers(prev => {
        const filtered = prev.filter(u => u.userId !== joinedUserId);
        return [...filtered, {
          userId: joinedUserId,
          userName: joinedUserName || 'Unknown',
          communityId: 'unknown', // We don't have this in the payload, could be enhanced
          currentBoardId: boardId
        }];
      });
    });

    newSocket.on('userLeftBoard', ({ userId: leftUserId, boardId }: { userId: string; boardId: number }) => {
      console.log(`[Socket] User ${leftUserId} left board ${boardId}`);
      
      // Remove from board presence
      setBoardOnlineUsers(prev => prev.filter(u => u.userId !== leftUserId));
    });

    newSocket.on('userTyping', ({ userId, userName, boardId, isTyping }: { userId: string; userName?: string; boardId: number; isTyping: boolean}) => {
      console.log(`[Socket] User ${userName || userId} ${isTyping ? 'started' : 'stopped'} typing in board ${boardId}`);
      
      // Update typing status in board presence
      setBoardOnlineUsers(prev => 
        prev.map(user => 
          user.userId === userId 
            ? { ...user, isTyping: isTyping }
            : user
        )
      );
    });

    newSocket.on('postDeleted', ({ postId }: { postId: number }) => {
      console.log(`[Socket] Post ${postId} was deleted`);
      toast.warning('A post was removed by moderators');
    });

    newSocket.on('boardSettingsChanged', ({ boardId, settings }: { boardId: number; settings: Record<string, unknown> }) => {
      console.log(`[Socket] Board ${boardId} settings changed:`, settings);
      toast.info('Board settings have been updated');
    });

    newSocket.on('newBoard', (boardData: { board: { id: number; name: string; community_id: string }; author_user_id: string; community_id: string }) => {
      console.log('[Socket] New board created:', boardData);
      if (boardData.author_user_id !== userId) {
        toast.success(`New board created: "${boardData.board.name}"`, {
          action: {
            label: 'View Board',
            onClick: () => navigateToBoard(boardData.board.id)
          }
        });
      }
      
      // Invalidate board-related queries
      console.log(`[RQ Invalidate] Invalidating board queries for community: ${boardData.community_id}`);
      queryClient.invalidateQueries({ queryKey: ['boards', boardData.community_id] });
      queryClient.invalidateQueries({ queryKey: ['boards'] }); // For queries without community ID
      queryClient.invalidateQueries({ queryKey: ['accessibleBoards'] });
      queryClient.invalidateQueries({ queryKey: ['accessibleBoardsNewPost'] });
      queryClient.invalidateQueries({ queryKey: ['accessibleBoardsMove'] });
    });

    // ===== ENHANCED MULTI-DEVICE PRESENCE EVENT HANDLERS =====
    
    newSocket.on('userOnline', ({ userPresence }: { userPresence: EnhancedUserPresence }) => {
      console.log('[Socket] User came online (enhanced):', userPresence);
      
      // Update enhanced presence
      setEnhancedUserPresence(prev => {
        const filtered = prev.filter(u => u.userId !== userPresence.userId);
        return [...filtered, userPresence];
      });
      
      // Legacy support: Convert to OnlineUser format
      const legacyUser: OnlineUser = {
        userId: userPresence.userId,
        userName: userPresence.userName,
        avatarUrl: userPresence.avatarUrl,
        communityId: userPresence.communityId,
        currentBoardId: userPresence.primaryDevice.currentBoardId,
        currentBoardName: userPresence.primaryDevice.currentBoardName
      };
      
      setGlobalOnlineUsers(prev => {
        const filtered = prev.filter(u => u.userId !== userPresence.userId);
        return [...filtered, legacyUser];
      });
    });

    newSocket.on('userOffline', ({ userId: offlineUserId }: { userId: string }) => {
      console.log('[Socket] User went offline:', offlineUserId);
      
      // Remove from enhanced presence
      setEnhancedUserPresence(prev => prev.filter(u => u.userId !== offlineUserId));
      
      // Remove from legacy presence
      setGlobalOnlineUsers(prev => prev.filter(u => u.userId !== offlineUserId));
      setBoardOnlineUsers(prev => prev.filter(u => u.userId !== offlineUserId));
    });

    newSocket.on('userPresenceUpdate', ({ userPresence }: { userPresence: EnhancedUserPresence }) => {
      console.log('[Socket] User presence update (enhanced):', userPresence);
      
      // Update enhanced presence
      setEnhancedUserPresence(prev => 
        prev.map(user => 
          user.userId === userPresence.userId ? userPresence : user
        )
      );
      
      // Legacy support: Update OnlineUser format
      const legacyUser: OnlineUser = {
        userId: userPresence.userId,
        userName: userPresence.userName,
        avatarUrl: userPresence.avatarUrl,
        communityId: userPresence.communityId,
        currentBoardId: userPresence.primaryDevice.currentBoardId,
        currentBoardName: userPresence.primaryDevice.currentBoardName
      };
      
      setGlobalOnlineUsers(prev => 
        prev.map(user => 
          user.userId === userPresence.userId ? legacyUser : user
        )
      );
    });

    newSocket.on('globalPresenceSync', (users: EnhancedUserPresence[]) => {
      console.log('[Socket] Global presence sync received (enhanced):', users.length, 'users online');
      
      // Update enhanced presence
      setEnhancedUserPresence(users);
      
      // Legacy support: Convert to OnlineUser format
      const legacyUsers: OnlineUser[] = users.map(user => ({
        userId: user.userId,
        userName: user.userName,
        avatarUrl: user.avatarUrl,
        communityId: user.communityId,
        currentBoardId: user.primaryDevice.currentBoardId,
        currentBoardName: user.primaryDevice.currentBoardName
      }));
      
      setGlobalOnlineUsers(legacyUsers);
    });

    setSocket(newSocket);

    return () => {
      console.log('[Socket] useEffect cleanup: Disconnecting socket', newSocket.id);
      newSocket.disconnect();
      setIsConnected(false);
      // Reset presence state on disconnect
      setGlobalOnlineUsers([]);
      setBoardOnlineUsers([]);
      setEnhancedUserPresence([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, userId, hasUserTriggeredConnection, queryClient, navigateToPost, navigateToBoard]); // Added hasUserTriggeredConnection to trigger reconnect with new transport

  const joinBoard = useCallback((boardId: number) => {
    if (socket && isConnected) {
      console.log(`[Socket] Joining board room: ${boardId}`);
      socket.emit('joinBoard', boardId);
    }
  }, [socket, isConnected]);

  const leaveBoard = useCallback((boardId: number) => {
    if (socket && isConnected) {
      console.log(`[Socket] Leaving board room: ${boardId}`);
      socket.emit('leaveBoard', boardId);
    }
  }, [socket, isConnected]);

  const sendTyping = useCallback((boardId: number, postId?: number, isTyping: boolean = true) => {
    if (socket && isConnected) {
      socket.emit('typing', { boardId, postId, isTyping });
    }
  }, [socket, isConnected]);

  const value: SocketContextType = {
    socket,
    isConnected,
    joinBoard,
    leaveBoard,
    sendTyping,
    globalOnlineUsers,
    boardOnlineUsers,
    enhancedUserPresence,
    communityGroups: communityPresenceData.communityGroups,
    currentCommunityUsers: communityPresenceData.currentCommunityUsers,
    otherCommunityGroups: communityPresenceData.otherCommunityGroups
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
} 