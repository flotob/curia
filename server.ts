import dotenv from 'dotenv';

// Load environment variables for custom server (development only)
if (process.env.NODE_ENV === 'development') {
  // Load .env first
  const envResult = dotenv.config({ path: '.env' });
  console.log('[Server] dotenv.config attempt for .env:',
    envResult.error ? envResult.error.message : 'OK',
    'Parsed vars:', envResult.parsed ? Object.keys(envResult.parsed) : 'None'
  );

  // Then load .env.development, allowing it to override .env for development
  const envDevResult = dotenv.config({ path: '.env.development', override: true });
  console.log('[Server] dotenv.config attempt for .env.development (with override):',
    envDevResult.error ? envDevResult.error.message : 'OK',
    'Parsed vars:', envDevResult.parsed ? Object.keys(envDevResult.parsed) : 'None'
  );
}

import next from "next";
import { createServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from 'jsonwebtoken';
import { canUserAccessBoard } from './src/lib/boardPermissions';
import { query } from './src/lib/db';
import { JwtPayload } from './src/lib/withAuth';
import { EventEmitter } from 'events';

// Load environment variables for custom server (development only)
// if (process.env.NODE_ENV !== 'production' && !process.env.JWT_SECRET) {
//  require('dotenv').config();
//  console.log('[Server] Loaded .env file for development');
// }

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Debug environment variables loading
console.log('[Server] Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  hasJWT_SECRET: !!process.env.JWT_SECRET,
  hasDATABASE_URL: !!process.env.DATABASE_URL,
  PORT: process.env.PORT || '3000'
});

// Global Socket.IO instance that API routes can import - NO LONGER THE PRIMARY WAY
let io: SocketIOServer;

// Create a global event emitter instance
if (!(process as any).customEventEmitter) {
  (process as any).customEventEmitter = new EventEmitter();
  console.log('[Server] CustomEventEmitter initialized on process object');
}
const customEventEmitter = (process as any).customEventEmitter;

// Enhanced socket interface with user data
interface AuthenticatedSocket extends Socket {
  data: {
    user: JwtPayload;
  };
}

async function bootstrap() {
  console.log('[Server] Preparing Next.js...');
  await app.prepare();

  // Create HTTP server with Next.js handler
  const httpServer = createServer((req, res) => handle(req, res));

  // Initialize Socket.IO
  console.log('[Socket.IO] Initializing server...');
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : true, // Allow all origins in development
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // No longer setting io on globalThis for API routes to pick up directly
  // (globalThis as any).SocketIO_Instance_For_Curia = io;
  // console.log('[Socket.IO] Instance set on globalThis.SocketIO_Instance_For_Curia and ready for broadcasting');
  console.log('[Socket.IO] Server instance created.');

  // Setup listeners for events from API routes
  customEventEmitter.on('broadcastEvent', (eventDetails: { room: string; eventName: string; payload: any }) => {
    const { room, eventName, payload } = eventDetails;
    console.log(`[Socket.IO EventAggregator] Received event '${eventName}' for room '${room}'. Broadcasting...`, payload);
    io.to(room).emit(eventName, payload);
  });

  // JWT Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const currentJwtSecret = process.env.JWT_SECRET;
      console.log('[Socket.IO Auth] Checking JWT. Secret available:', !!currentJwtSecret, 'Value (first 5 chars):', currentJwtSecret?.substring(0,5));

      if (!currentJwtSecret) {
        console.error('[Socket.IO Auth] JWT_SECRET is not available at runtime!');
        return next(new Error('Server configuration error'));
      }

      const token = socket.handshake.auth?.token || 
                   socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT using same logic as API routes
      const decoded = jwt.verify(token, currentJwtSecret) as JwtPayload;
      
      // Attach user data to socket
      socket.data.user = decoded;
      
      console.log(`[Socket.IO] User authenticated: ${decoded.sub} (community: ${decoded.cid})`);
      
      // Auto-join user to their community room
      socket.join(`community:${decoded.cid}`);
      
      next();
    } catch (error) {
      console.error('[Socket.IO] Authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Socket connection handling
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    console.log(`[Socket.IO] User connected: ${user.sub} (${user.name || 'Unknown'})`);

    // Handle board room joining with permission checks
    socket.on('joinBoard', async (boardId: string | number) => {
      try {
        const boardIdNum = parseInt(boardId.toString(), 10);
        if (isNaN(boardIdNum)) {
          socket.emit('error', { message: 'Invalid board ID' });
          return;
        }

        // Fetch board data and verify permissions
        const boardResult = await query(
          'SELECT id, community_id, settings FROM boards WHERE id = $1',
          [boardIdNum]
        );

        if (boardResult.rows.length === 0) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        const board = boardResult.rows[0];
        
        // Verify board belongs to user's community
        if (board.community_id !== user.cid) {
          socket.emit('error', { message: 'Access denied: wrong community' });
          return;
        }

        // Check board permissions
        const boardSettings = typeof board.settings === 'string' 
          ? JSON.parse(board.settings) 
          : board.settings;

        const canAccess = canUserAccessBoard(user.roles, boardSettings, user.adm);
        
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

      } catch (error) {
        console.error('[Socket.IO] Error joining board:', error);
        socket.emit('error', { message: 'Failed to join board' });
      }
    });

    // Handle leaving board rooms
    socket.on('leaveBoard', (boardId: string | number) => {
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
    socket.on('typing', (data: { boardId: number; postId?: number; isTyping: boolean }) => {
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

// Start the server
bootstrap().catch((err) => {
  console.error('[Server] Startup error:', err);
  process.exit(1);
}); 