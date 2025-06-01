"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketEvents = void 0;
exports.setSocketIO = setSocketIO;
exports.getSocketIO = getSocketIO;
// Global Socket.IO instance for API routes to use
let io = null;
/**
 * Set the Socket.IO instance (called from custom server)
 */
function setSocketIO(instance) {
    io = instance;
}
/**
 * Get the Socket.IO instance for broadcasting events
 */
function getSocketIO() {
    return io;
}
/**
 * Utility functions for broadcasting real-time events from API routes
 */
exports.socketEvents = {
    // Broadcast new post to board room
    broadcastNewPost: (boardId, postData) => {
        if (io) {
            io.to(`board:${boardId}`).emit('newPost', postData);
            console.log(`[Socket.IO] Broadcasted new post to board:${boardId}`);
        }
    },
    // Broadcast post vote update
    broadcastVoteUpdate: (boardId, postId, newCount, userId) => {
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
    broadcastNewComment: (boardId, postId, commentData) => {
        if (io) {
            io.to(`board:${boardId}`).emit('newComment', {
                postId,
                comment: commentData
            });
            console.log(`[Socket.IO] Broadcasted new comment for post ${postId}`);
        }
    },
    // Broadcast post deletion (admin only)
    broadcastPostDeleted: (boardId, postId) => {
        if (io) {
            io.to(`board:${boardId}`).emit('postDeleted', { postId });
            console.log(`[Socket.IO] Broadcasted post deletion: ${postId}`);
        }
    },
    // Broadcast when board settings change (permission updates)
    broadcastBoardSettingsChanged: (boardId, settings) => {
        if (io) {
            io.to(`board:${boardId}`).emit('boardSettingsChanged', {
                boardId,
                settings
            });
            console.log(`[Socket.IO] Broadcasted board settings change for board ${boardId}`);
        }
    }
};
