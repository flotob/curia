import { Server as SocketIOServer } from 'socket.io'; // Keep for type, though not used for instance

console.log('[Socket.IO src/lib/socket.ts] MODULE LOADED (Event Emitter Version). Timestamp:', new Date().toISOString());

// No longer need getSocketIO or direct io instance management here

// Helper function to access the global event emitter
function getProcessEventEmitter() {
  if (!(process as any).customEventEmitter) {
    // This should ideally not happen if server.ts initializes it first.
    // But as a fallback, though it won't have server listeners if API routes load first.
    console.error('[Socket.IO src/lib/socket.ts] customEventEmitter NOT FOUND on process object! API route might have loaded before server.ts initialized it.');
    // Potentially initialize it here too, but it won't have the server-side listeners.
    // (process as any).customEventEmitter = new (require('events').EventEmitter)();
    return null; // Indicate failure or uninitialized state
  }
  return (process as any).customEventEmitter;
}

export const socketEvents = {
  broadcastNewPost: (boardId: number, postData: Record<string, unknown>) => {
    const emitter = getProcessEventEmitter();
    console.log(`[Socket.IO broadcastNewPost via Emitter] Attempting to emit 'broadcastEvent'. Emitter available:`, !!emitter);
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'newPost',
        payload: postData
      });
      console.log(`[Socket.IO broadcastNewPost via Emitter] Event emitted to process.customEventEmitter for board:${boardId}`);
    } else {
      console.error('[Socket.IO broadcastNewPost via Emitter] FAILED: customEventEmitter not available on process.');
    }
  },

  broadcastVoteUpdate: (boardId: number, postId: number, newCount: number, userId: string) => {
    const emitter = getProcessEventEmitter();
    console.log(`[Socket.IO broadcastVoteUpdate via Emitter] Attempting to emit. Emitter available:`, !!emitter);
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'voteUpdate',
        payload: { postId, newCount, userId }
      });
      console.log(`[Socket.IO broadcastVoteUpdate via Emitter] Event emitted for post ${postId}`);
    } else {
      console.error('[Socket.IO broadcastVoteUpdate via Emitter] FAILED: customEventEmitter not available on process.');
    }
  },

  broadcastNewComment: (boardId: number, postId: number, commentData: Record<string, unknown>) => {
    const emitter = getProcessEventEmitter();
    console.log(`[Socket.IO broadcastNewComment via Emitter] Attempting to emit. Emitter available:`, !!emitter);
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'newComment',
        payload: { postId, comment: commentData }
      });
      console.log(`[Socket.IO broadcastNewComment via Emitter] Event emitted for post ${postId}`);
    } else {
      console.error('[Socket.IO broadcastNewComment via Emitter] FAILED: customEventEmitter not available on process.');
    }
  },

  broadcastPostDeleted: (boardId: number, postId: number) => {
    const emitter = getProcessEventEmitter();
    console.log(`[Socket.IO broadcastPostDeleted via Emitter] Attempting to emit. Emitter available:`, !!emitter);
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'postDeleted',
        payload: { postId }
      });
      console.log(`[Socket.IO broadcastPostDeleted via Emitter] Event emitted for post ${postId}`);
    } else {
      console.error('[Socket.IO broadcastPostDeleted via Emitter] FAILED: customEventEmitter not available on process.');
    }
  },

  broadcastBoardSettingsChanged: (boardId: number, settings: Record<string, unknown>) => {
    const emitter = getProcessEventEmitter();
    console.log(`[Socket.IO broadcastBoardSettingsChanged via Emitter] Attempting to emit. Emitter available:`, !!emitter);
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'boardSettingsChanged',
        payload: { boardId, settings }
      });
      console.log(`[Socket.IO broadcastBoardSettingsChanged via Emitter] Event emitted for board ${boardId}`);
    } else {
      console.error('[Socket.IO broadcastBoardSettingsChanged via Emitter] FAILED: customEventEmitter not available on process.');
    }
  }
}; 