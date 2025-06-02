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

// Global Socket.IO instance
let io: SocketIOServer;

// Create a global event emitter instance
if (!(process as any).customEventEmitter) {
  (process as any).customEventEmitter = new EventEmitter();
  console.log('[Server] CustomEventEmitter initialized on process object');
}
const customEventEmitter = (process as any).customEventEmitter;

// ===== PHASE 1: GLOBAL PRESENCE SYSTEM =====

// User presence tracking interface
interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  currentBoardId?: number;
  connectedAt: Date;
  lastSeen: Date;
  socketId: string;
}

// Global presence tracking (in-memory for Phase 1)
const globalPresence = new Map<string, UserPresence>();

// Event broadcasting configuration
interface BroadcastConfig {
  globalRoom: boolean;          // Should broadcast to global room
  specificRooms: string[];      // Specific rooms to broadcast to
  invalidateForAllUsers: boolean; // Should trigger React Query invalidation for all users with access
}

// Event type definitions for type safety and documentation
interface BroadcastEvent {
  eventName: string;
  payload: any;
  config: BroadcastConfig;
}

// Enhanced socket interface with user data
interface AuthenticatedSocket extends Socket {
  data: {
    user: JwtPayload;
  };
}

/**
 * Enhanced broadcasting system that handles both real-time notifications
 * and React Query cache invalidation based on user access permissions
 */
function broadcastEvent(event: BroadcastEvent) {
  const { eventName, payload, config } = event;
  
  console.log(`[Socket.IO Enhanced Broadcast] Event: ${eventName}`, {
    globalRoom: config.globalRoom,
    specificRooms: config.specificRooms,
    invalidateForAllUsers: config.invalidateForAllUsers,
    payload
  });

  // Broadcast to global room if configured
  if (config.globalRoom) {
    io.to('global').emit(eventName, payload);
  }

  // Broadcast to specific rooms
  config.specificRooms.forEach(room => {
    io.to(room).emit(eventName, payload);
  });

  // For events that should trigger universal React Query invalidation,
  // we rely on the global room to reach all users. The client-side
  // SocketContext will handle access-based invalidation logic.
}

/**
 * Get current online users for presence sync
 */
function getOnlineUsers(): UserPresence[] {
  return Array.from(globalPresence.values());
}

/**
 * Update user presence and broadcast changes
 */
function updateUserPresence(userId: string, updates: Partial<UserPresence>) {
  const existing = globalPresence.get(userId);
  if (existing) {
    const updated = { ...existing, ...updates, lastSeen: new Date() };
    globalPresence.set(userId, updated);
    
    // Broadcast presence change to global room
    broadcastEvent({
      eventName: 'userPresenceUpdate',
      payload: { userId, updates },
      config: {
        globalRoom: true,
        specificRooms: [],
        invalidateForAllUsers: false
      }
    });
  }
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

  console.log('[Socket.IO] Server instance created with global presence system');

  // ===== ENHANCED EVENT SYSTEM =====
  
  // Setup listeners for events from API routes with enhanced broadcasting
  customEventEmitter.on('broadcastEvent', (eventDetails: { room: string; eventName: string; payload: any }) => {
    const { room, eventName, payload } = eventDetails;
    
    // Determine broadcasting strategy based on event type
    let config: BroadcastConfig;
    
    switch (eventName) {
      case 'newPost':
        config = {
          globalRoom: true,              // All users need this for home feed invalidation
          specificRooms: [room],         // Board-specific room for immediate notifications
          invalidateForAllUsers: true    // React Query invalidation for all users with board access
        };
        break;
        
      case 'voteUpdate':
        config = {
          globalRoom: true,              // Home feed sorting may change
          specificRooms: [room],         // Board users need immediate update
          invalidateForAllUsers: true    // All users with access should get fresh data
        };
        break;
        
      case 'newComment':
        config = {
          globalRoom: true,              // Comment counts affect home feed
          specificRooms: [room],         // Board users need immediate notification
          invalidateForAllUsers: true    // All users with access should get fresh data
        };
        break;
        
      case 'newBoard':
        config = {
          globalRoom: true,              // All users should see new boards
          specificRooms: [room],         // Community-specific room
          invalidateForAllUsers: true    // Board lists need invalidation
        };
        break;
        
      case 'boardSettingsChanged':
        config = {
          globalRoom: false,             // Only affects users with access to this board
          specificRooms: [room],         // Board-specific change
          invalidateForAllUsers: true    // Users with access need fresh permissions
        };
        break;
        
      default:
        // Default: broadcast only to specific room
        config = {
          globalRoom: false,
          specificRooms: [room],
          invalidateForAllUsers: false
        };
    }
    
    broadcastEvent({
      eventName,
      payload,
      config
    });
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

    // ===== PHASE 1: GLOBAL ROOM & PRESENCE SYSTEM =====
    
    // Auto-join user to global room AND community room
    socket.join('global');
    socket.join(`community:${user.cid}`);
    
    // Add user to global presence tracking
    const userPresence: UserPresence = {
      userId: user.sub,
      userName: user.name || 'Unknown',
      avatarUrl: user.picture || undefined,
      communityId: user.cid || 'unknown',
      currentBoardId: undefined,
      connectedAt: new Date(),
      lastSeen: new Date(),
      socketId: socket.id
    };
    
    globalPresence.set(user.sub, userPresence);
    
    // Broadcast user online to global room
    broadcastEvent({
      eventName: 'userOnline',
      payload: {
        userId: user.sub,
        userName: user.name || 'Unknown',
        avatarUrl: user.picture || undefined,
        communityId: user.cid || 'unknown'
      },
      config: {
        globalRoom: true,
        specificRooms: [],
        invalidateForAllUsers: false
      }
    });
    
    // Send initial presence sync to new user
    socket.emit('globalPresenceSync', getOnlineUsers());
    
    console.log(`[Socket.IO Global Presence] User ${user.sub} joined global room. Total online: ${globalPresence.size}`);

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
        
        // Update user presence with current board
        updateUserPresence(user.sub, { currentBoardId: boardIdNum });
        
        console.log(`[Socket.IO] User ${user.sub} joined board room: ${roomName}`);
        
        // Notify user of successful join
        socket.emit('boardJoined', { boardId: boardIdNum });
        
        // Broadcast user presence to others in the board room (NOT global)
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
      
      // Update user presence (remove current board)
      updateUserPresence(user.sub, { currentBoardId: undefined });
      
      console.log(`[Socket.IO] User ${user.sub} left board room: ${roomName}`);
      
      // Notify others in the room
      socket.to(roomName).emit('userLeftBoard', {
        userId: user.sub,
        boardId: boardIdNum
      });
    });

    // Handle typing indicators (board-specific, not global)
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

    // Handle disconnection with global presence cleanup
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] User disconnected: ${user.sub} (reason: ${reason})`);
      
      // Remove from global presence
      globalPresence.delete(user.sub);
      
      // Broadcast user offline to global room
      broadcastEvent({
        eventName: 'userOffline',
        payload: { userId: user.sub },
        config: {
          globalRoom: true,
          specificRooms: [],
          invalidateForAllUsers: false
        }
      });
      
      // Broadcast leave presence to all board rooms user was in
      for (const room of socket.rooms) {
        if (room.startsWith('board:')) {
          const boardId = room.split(':')[1];
          socket.to(room).emit('userLeftBoard', {
            userId: user.sub,
            boardId: parseInt(boardId, 10)
          });
        }
      }
      
      console.log(`[Socket.IO Global Presence] User ${user.sub} disconnected. Total online: ${globalPresence.size}`);
    });
  });

  // Periodic cleanup of stale connections (every 5 minutes)
  setInterval(() => {
    const staleThreshold = Date.now() - (5 * 60 * 1000); // 5 minutes
    let cleaned = 0;
    
    for (const [userId, presence] of globalPresence.entries()) {
      if (presence.lastSeen.getTime() < staleThreshold) {
        globalPresence.delete(userId);
        // Broadcast user offline
        broadcastEvent({
          eventName: 'userOffline',
          payload: { userId },
          config: {
            globalRoom: true,
            specificRooms: [],
            invalidateForAllUsers: false
          }
        });
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Socket.IO Cleanup] Removed ${cleaned} stale connections. Total online: ${globalPresence.size}`);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes

  // Start the HTTP server
  const port = parseInt(process.env.PORT || '3000', 10);
  httpServer.listen(port, () => {
    console.log(`[Server] Ready on http://localhost:${port}`);
    console.log(`[Socket.IO] WebSocket server ready with global presence system`);
  });
}

// Start the server
bootstrap().catch((err) => {
  console.error('[Server] Startup error:', err);
  process.exit(1);
}); 