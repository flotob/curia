console.log('[Socket.IO src/lib/socket.ts] MODULE LOADED (Event Emitter Version). Timestamp:', new Date().toISOString());

// No longer need getSocketIO or direct io instance management here

// Helper function to access the global event emitter
function getProcessEventEmitter() {
  if (!process.customEventEmitter) {
    console.error('[Socket.IO src/lib/socket.ts] customEventEmitter NOT FOUND on process object! API route might have loaded before server.ts initialized it.');
    return null;
  }
  return process.customEventEmitter;
}

export const socketEvents = {
  broadcastNewPost: (boardId: number, postData: Record<string, unknown>) => {
    const emitter = getProcessEventEmitter();
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'newPost',
        payload: postData
      });
    } else {
      console.error('[Socket.IO broadcastNewPost via Emitter] FAILED: customEventEmitter not available on process.');
    }
  },

  broadcastVoteUpdate: (boardId: number, postId: number, newCount: number, userIdVoted: string) => {
    const emitter = getProcessEventEmitter();
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'voteUpdate',
        payload: { postId, newCount, userIdVoted }
      });
    } else {
      console.error('[Socket.IO broadcastVoteUpdate via Emitter] FAILED: customEventEmitter not available on process.');
    }
  },

  broadcastNewComment: (boardId: number, postId: number, commentPayload: { postId: number; comment: Record<string, unknown> }) => {
    const emitter = getProcessEventEmitter();
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'newComment',
        payload: commentPayload
      });
    } else {
      console.error('[Socket.IO broadcastNewComment via Emitter] FAILED: customEventEmitter not available on process.');
    }
  },

  broadcastPostDeleted: (boardId: number, postId: number) => {
    const emitter = getProcessEventEmitter();
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'postDeleted',
        payload: { postId }
      });
    } else {
      console.error('[Socket.IO broadcastPostDeleted via Emitter] FAILED: customEventEmitter not available.');
    }
  },

  broadcastBoardSettingsChanged: (boardId: number, settings: Record<string, unknown>) => {
    const emitter = getProcessEventEmitter();
    if (emitter) {
      emitter.emit('broadcastEvent', {
        room: `board:${boardId}`,
        eventName: 'boardSettingsChanged',
        payload: { boardId, settings }
      });
    } else {
      console.error('[Socket.IO broadcastBoardSettingsChanged via Emitter] FAILED: customEventEmitter not available.');
    }
  }
}; 