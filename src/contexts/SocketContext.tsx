'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if not authenticated
      if (socket) {
        console.log('[Socket] Disconnecting due to authentication loss');
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // For development, connect to the same origin (works with ngrok)
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? undefined  // Use same origin in production
      : undefined; // Use same origin in development (works with ngrok)
    
    // Create new socket connection with JWT auth
    console.log('[Socket] Connecting with authentication...', {
      socketUrl,
      hasToken: !!token,
      isAuthenticated,
      userInfo: user ? { userId: user.userId, name: user.name } : null
    });
    
    const newSocket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      // Add connection debugging
      forceNew: true,
      timeout: 20000,
      // Additional ngrok-friendly options
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[Socket] Connected successfully');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      setIsConnected(false);
    });

    // Board room event handlers
    newSocket.on('boardJoined', ({ boardId }) => {
      console.log(`[Socket] Successfully joined board room: ${boardId}`);
    });

    newSocket.on('error', ({ message }) => {
      console.error('[Socket] Server error:', message);
      toast.error(`Connection error: ${message}`);
    });

    // Real-time event handlers
    newSocket.on('newPost', (postData) => {
      console.log('[Socket] New post received:', postData);
      toast.success(`New post: "${postData.title}" by ${postData.author_name || 'Unknown'}`);
    });

    newSocket.on('voteUpdate', ({ postId, newCount, userId }) => {
      console.log(`[Socket] Vote update for post ${postId}: ${newCount} votes`);
      // Don't show toast for own votes
      if (userId !== user?.userId) {
        toast.info(`Post received ${newCount} vote${newCount !== 1 ? 's' : ''}`);
      }
    });

    newSocket.on('newComment', ({ postId, comment }) => {
      console.log(`[Socket] New comment on post ${postId}:`, comment);
      // Don't show toast for own comments
      if (comment.author_user_id !== user?.userId) {
        toast.info(`New comment by ${comment.author_name || 'Unknown'}`);
      }
    });

    newSocket.on('userJoinedBoard', ({ userId, userName, boardId }) => {
      console.log(`[Socket] User ${userName || userId} joined board ${boardId}`);
      // Optional: Show subtle presence notification
      // toast.info(`${userName || 'Someone'} joined the discussion`);
    });

    newSocket.on('userLeftBoard', ({ userId, boardId }) => {
      console.log(`[Socket] User ${userId} left board ${boardId}`);
    });

    newSocket.on('userTyping', ({ userId, userName, boardId, isTyping }) => {
      console.log(`[Socket] User ${userName || userId} ${isTyping ? 'started' : 'stopped'} typing in board ${boardId}`);
      // Handle typing indicators in UI components
    });

    newSocket.on('postDeleted', ({ postId }) => {
      console.log(`[Socket] Post ${postId} was deleted`);
      toast.warning('A post was removed by moderators');
    });

    newSocket.on('boardSettingsChanged', ({ boardId, settings }) => {
      console.log(`[Socket] Board ${boardId} settings changed:`, settings);
      toast.info('Board settings have been updated');
    });

    setSocket(newSocket);

    // Cleanup on unmount or auth change
    return () => {
      console.log('[Socket] Cleaning up connection');
      newSocket.disconnect();
    };
  }, [isAuthenticated, token, user?.userId]);

  // Join a board room
  const joinBoard = useCallback((boardId: number) => {
    if (socket && isConnected) {
      console.log(`[Socket] Joining board room: ${boardId}`);
      socket.emit('joinBoard', boardId);
    }
  }, [socket, isConnected]);

  // Leave a board room
  const leaveBoard = useCallback((boardId: number) => {
    if (socket && isConnected) {
      console.log(`[Socket] Leaving board room: ${boardId}`);
      socket.emit('leaveBoard', boardId);
    }
  }, [socket, isConnected]);

  // Send typing indicator
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