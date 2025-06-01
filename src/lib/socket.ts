import { Server as SocketIOServer } from 'socket.io';

// Global Socket.IO instance for API routes to use
let io: SocketIOServer | null = null;

/**
 * Set the Socket.IO instance (called from custom server)
 */
export function setSocketIO(instance: SocketIOServer) {
  io = instance;
  console.log('[Socket.IO] Instance set and ready for broadcasting');
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
    console.log(`[Socket.IO] Attempting to broadcast new post to board:${boardId}. Socket available:`, !!io);
    if (io) {
      io.to(`board:${boardId}`).emit('newPost', postData);
      console.log(`[Socket.IO] ✅ Broadcasted new post to board:${boardId}`, { postTitle: postData.title });
    } else {
      console.error('[Socket.IO] ❌ Cannot broadcast new post - Socket.IO instance not available');
    }
  },

  // Broadcast post vote update
  broadcastVoteUpdate: (boardId: number, postId: number, newCount: number, userId: string) => {
    console.log(`[Socket.IO] Attempting to broadcast vote update. Socket available:`, !!io);
    if (io) {
      io.to(`board:${boardId}`).emit('voteUpdate', {
        postId,
        newCount,
        userId
      });
      console.log(`[Socket.IO] ✅ Broadcasted vote update for post ${postId} (${newCount} votes)`);
    } else {
      console.error('[Socket.IO] ❌ Cannot broadcast vote update - Socket.IO instance not available');
    }
  },

  // Broadcast new comment
  broadcastNewComment: (boardId: number, postId: number, commentData: Record<string, unknown>) => {
    console.log(`[Socket.IO] Attempting to broadcast new comment. Socket available:`, !!io);
    if (io) {
      io.to(`board:${boardId}`).emit('newComment', {
        postId,
        comment: commentData
      });
      console.log(`[Socket.IO] ✅ Broadcasted new comment for post ${postId}`);
    } else {
      console.error('[Socket.IO] ❌ Cannot broadcast new comment - Socket.IO instance not available');
    }
  },

  // Broadcast post deletion (admin only)
  broadcastPostDeleted: (boardId: number, postId: number) => {
    console.log(`[Socket.IO] Attempting to broadcast post deletion. Socket available:`, !!io);
    if (io) {
      io.to(`board:${boardId}`).emit('postDeleted', { postId });
      console.log(`[Socket.IO] ✅ Broadcasted post deletion: ${postId}`);
    } else {
      console.error('[Socket.IO] ❌ Cannot broadcast post deletion - Socket.IO instance not available');
    }
  },

  // Broadcast when board settings change (permission updates)
  broadcastBoardSettingsChanged: (boardId: number, settings: Record<string, unknown>) => {
    console.log(`[Socket.IO] Attempting to broadcast board settings change. Socket available:`, !!io);
    if (io) {
      io.to(`board:${boardId}`).emit('boardSettingsChanged', {
        boardId,
        settings
      });
      console.log(`[Socket.IO] ✅ Broadcasted board settings change for board ${boardId}`);
    } else {
      console.error('[Socket.IO] ❌ Cannot broadcast board settings change - Socket.IO instance not available');
    }
  }
}; 