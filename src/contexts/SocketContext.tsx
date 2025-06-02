'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinBoard: (boardId: number) => void;
  leaveBoard: (boardId: number) => void;
  sendTyping: (boardId: number, postId?: number, isTyping?: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated, user } = useAuth();
  const currentSocketRef = useRef<Socket | null>(null);

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
    console.log('[Socket] (Re-)Establishing connection due to auth state change or initial mount.');
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
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

    newSocket.on('newPost', (postData: { title: string; author_name?: string }) => {
      console.log('[Socket] New post received:', postData);
      toast.success(`New post: "${postData.title}" by ${postData.author_name || 'Unknown'}`);
    });

    newSocket.on('voteUpdate', ({ postId, newCount, userIdVoted }: { postId: number; newCount: number; userIdVoted: string }) => {
      console.log(`[Socket] Vote update for post ${postId}: ${newCount} votes by ${userIdVoted}`);
      if (userIdVoted !== user?.userId) {
        toast.info(`Post received ${newCount} vote${newCount !== 1 ? 's' : ''}`);
      }
    });

    newSocket.on('newComment', ({ postId, comment }: { postId: number; comment: { author_user_id: string; author_name?: string } }) => {
      console.log(`[Socket] New comment on post ${postId}:`, comment);
      if (comment.author_user_id !== user?.userId) {
        toast.info(`New comment by ${comment.author_name || 'Unknown'}`);
      }
    });

    newSocket.on('userJoinedBoard', ({ userId, userName, boardId }: { userId: string; userName?: string; boardId: number }) => {
      console.log(`[Socket] User ${userName || userId} joined board ${boardId}`);
      if (userId !== user?.userId) {
        toast.info(`${userName || 'Someone'} joined the discussion`);
      }
    });

    newSocket.on('userLeftBoard', ({ userId, boardId }: { userId: string; boardId: number }) => {
      console.log(`[Socket] User ${userId} left board ${boardId}`);
    });

    newSocket.on('userTyping', ({ userId, userName, boardId, isTyping }: { userId: string; userName?: string; boardId: number; isTyping: boolean}) => {
      console.log(`[Socket] User ${userName || userId} ${isTyping ? 'started' : 'stopped'} typing in board ${boardId}`);
    });

    newSocket.on('postDeleted', ({ postId }: { postId: number }) => {
      console.log(`[Socket] Post ${postId} was deleted`);
      toast.warning('A post was removed by moderators');
    });

    newSocket.on('boardSettingsChanged', ({ boardId, settings }: { boardId: number; settings: Record<string, unknown> }) => {
      console.log(`[Socket] Board ${boardId} settings changed:`, settings);
      toast.info('Board settings have been updated');
    });

    setSocket(newSocket);

    return () => {
      console.log('[Socket] useEffect cleanup: Disconnecting socket', newSocket.id);
      newSocket.disconnect();
      setIsConnected(false);
    };
  }, [isAuthenticated, token, user]);

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
    sendTyping
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