"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const next_1 = __importDefault(require("next"));
const node_http_1 = require("node:http");
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const boardPermissions_1 = require("./src/lib/boardPermissions");
const db_1 = require("./src/lib/db");
const socket_1 = require("./src/lib/socket");
const dev = process.env.NODE_ENV !== "production";
const app = (0, next_1.default)({ dev });
const handle = app.getRequestHandler();
const JWT_SECRET = process.env.JWT_SECRET;
// Global Socket.IO instance that API routes can import
let io;
async function bootstrap() {
    console.log('[Server] Preparing Next.js...');
    await app.prepare();
    // Create HTTP server with Next.js handler
    const httpServer = (0, node_http_1.createServer)((req, res) => handle(req, res));
    // Initialize Socket.IO
    console.log('[Socket.IO] Initializing server...');
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? process.env.ALLOWED_ORIGINS?.split(',') || []
                : true, // Allow all origins in development
            methods: ['GET', 'POST'],
            credentials: true
        }
    });
    // Share the Socket.IO instance with API routes
    (0, socket_1.setSocketIO)(io);
    // JWT Authentication middleware
    io.use(async (socket, next) => {
        try {
            if (!JWT_SECRET) {
                return next(new Error('Server configuration error'));
            }
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            // Verify JWT using same logic as API routes
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            // Attach user data to socket
            socket.data.user = decoded;
            console.log(`[Socket.IO] User authenticated: ${decoded.sub} (community: ${decoded.cid})`);
            // Auto-join user to their community room
            socket.join(`community:${decoded.cid}`);
            next();
        }
        catch (error) {
            console.error('[Socket.IO] Authentication failed:', error);
            next(new Error('Authentication failed'));
        }
    });
    // Socket connection handling
    io.on('connection', (socket) => {
        const user = socket.data.user;
        console.log(`[Socket.IO] User connected: ${user.sub} (${user.name || 'Unknown'})`);
        // Handle board room joining with permission checks
        socket.on('joinBoard', async (boardId) => {
            try {
                const boardIdNum = parseInt(boardId.toString(), 10);
                if (isNaN(boardIdNum)) {
                    socket.emit('error', { message: 'Invalid board ID' });
                    return;
                }
                // Fetch board data and verify permissions
                const boardResult = await (0, db_1.query)('SELECT id, community_id, settings FROM boards WHERE id = $1', [boardIdNum]);
                if (boardResult.rows.length === 0) {
                    socket.emit('error', { message: 'Board not found' });
                    return;
                }
                const board = boardResult.rows[0];
                // Verify user can access this board (owned or imported)
                if (!user.cid) {
                    socket.emit('error', { message: 'Access denied: invalid user community' });
                    return;
                }
                
                const canAccessBoard = await (0, boardPermissions_1.isAccessibleBoard)(boardIdNum, user.cid);
                if (!canAccessBoard) {
                    socket.emit('error', { message: 'Access denied: board not accessible' });
                    return;
                }
                // Check board permissions
                const boardSettings = typeof board.settings === 'string'
                    ? JSON.parse(board.settings)
                    : board.settings;
                const canAccess = (0, boardPermissions_1.canUserAccessBoard)(user.roles, boardSettings, user.adm);
                if (!canAccess) {
                    socket.emit('error', { message: 'Access denied: insufficient permissions' });
                    return;
                }
                // Join the board room
                const roomName = `board:${boardIdNum}`;
                socket.join(roomName);
                console.log(`[Socket.IO] User ${user.sub} joined board room: ${roomName}`);
                // Notify user of successful join
                socket.emit('boardJoined', { boardId: boardIdNum });
                // Broadcast user presence to others in the room
                socket.to(roomName).emit('userJoinedBoard', {
                    userId: user.sub,
                    userName: user.name,
                    boardId: boardIdNum
                });
            }
            catch (error) {
                console.error('[Socket.IO] Error joining board:', error);
                socket.emit('error', { message: 'Failed to join board' });
            }
        });
        // Handle leaving board rooms
        socket.on('leaveBoard', (boardId) => {
            const boardIdNum = parseInt(boardId.toString(), 10);
            const roomName = `board:${boardIdNum}`;
            socket.leave(roomName);
            console.log(`[Socket.IO] User ${user.sub} left board room: ${roomName}`);
            // Notify others in the room
            socket.to(roomName).emit('userLeftBoard', {
                userId: user.sub,
                boardId: boardIdNum
            });
        });
        // Handle typing indicators
        socket.on('typing', (data) => {
            const roomName = `board:${data.boardId}`;
            socket.to(roomName).emit('userTyping', {
                userId: user.sub,
                userName: user.name,
                boardId: data.boardId,
                postId: data.postId,
                isTyping: data.isTyping
            });
        });
        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`[Socket.IO] User disconnected: ${user.sub} (reason: ${reason})`);
            // Broadcast leave presence to all rooms user was in
            for (const room of socket.rooms) {
                if (room.startsWith('board:')) {
                    const boardId = room.split(':')[1];
                    socket.to(room).emit('userLeftBoard', {
                        userId: user.sub,
                        boardId: parseInt(boardId, 10)
                    });
                }
            }
        });
    });
    // Start the HTTP server
    const port = parseInt(process.env.PORT || '3000', 10);
    httpServer.listen(port, () => {
        console.log(`[Server] Ready on http://localhost:${port}`);
        console.log(`[Socket.IO] WebSocket server ready`);
    });
}
// Socket.IO instance is now shared via setSocketIO()
// Start the server
bootstrap().catch((err) => {
    console.error('[Server] Startup error:', err);
    process.exit(1);
});
