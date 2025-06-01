import { Server as SocketIOServer } from 'socket.io';

// Global Socket.IO instance for API routes to use
let io: SocketIOServer | null = null;

/**
 * Set the Socket.IO instance (called from custom server)
 */
export function setSocketIO(instance: SocketIOServer) {
  io = instance;
}

/**
 * Get the Socket.IO instance for broadcasting events
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Utility functions for broadcasting real-time events from API routes
 */
export const socketEvents = {
  // Broadcast new post to board room
  broadcastNewPost: (boardId: number, postData: Record<string, unknown>) => {
    if (io) {
      io.to(`board:${boardId}`).emit('newPost', postData);
      console.log(`[Socket.IO] Broadcasted new post to board:${boardId}`);
    }
  },

  // Broadcast post vote update
  broadcastVoteUpdate: (boardId: number, postId: number, newCount: number, userId: string) => {
    if (io) {
      io.to(`board:${boardId}`).emit('voteUpdate', {
        postId,
        newCount,
        userId
      });
      console.log(`[Socket.IO] Broadcasted vote update for post ${postId}`);
    }
  },

  // Broadcast new comment
  broadcastNewComment: (boardId: number, postId: number, commentData: Record<string, unknown>) => {
    if (io) {
      io.to(`board:${boardId}`).emit('newComment', {
        postId,
        comment: commentData
      });
      console.log(`[Socket.IO] Broadcasted new comment for post ${postId}`);
    }
  },

  // Broadcast post deletion (admin only)
  broadcastPostDeleted: (boardId: number, postId: number) => {
    if (io) {
      io.to(`board:${boardId}`).emit('postDeleted', { postId });
      console.log(`[Socket.IO] Broadcasted post deletion: ${postId}`);
    }
  },

  // Broadcast when board settings change (permission updates)
  broadcastBoardSettingsChanged: (boardId: number, settings: Record<string, unknown>) => {
    if (io) {
      io.to(`board:${boardId}`).emit('boardSettingsChanged', {
        boardId,
        settings
      });
      console.log(`[Socket.IO] Broadcasted board settings change for board ${boardId}`);
    }
  }
}; 