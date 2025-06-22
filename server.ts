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
import { telegramEventHandler } from './src/lib/telegram/TelegramEventHandler';

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

// ===== ENHANCED MULTI-DEVICE PRESENCE SYSTEM =====

// Device-specific presence tracking
interface DevicePresence {
  frameUID: string;              // Unique device identifier from Common Ground
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  currentBoardId?: number;
  currentBoardName?: string;
  connectedAt: Date;
  lastSeen: Date;
  socketId: string;
  isActive: boolean;             // Active in last 30 seconds
  
  // NEW: Typing state tracking
  isTyping?: boolean;
  typingPostId?: number;
  typingBoardId?: number;
  typingContext?: 'post' | 'comment';
  typingTimestamp?: Date;
}

// User-aggregated presence for client consumption
interface EnhancedUserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  communityId: string;
  devices: DevicePresence[];
  totalDevices: number;
  isOnline: boolean;             // Any device active
  primaryDevice: DevicePresence; // Most recently active device
  lastSeen: Date;                // Most recent across all devices
}

// Multi-device presence tracking (in-memory for Phase 1)
const devicePresence = new Map<string, DevicePresence>();  // frameUID -> DevicePresence
const userPresence = new Map<string, EnhancedUserPresence>(); // userId -> EnhancedUserPresence

// Rate limiting for presence updates
const userEventLimits = new Map<string, { count: number; resetTime: number }>();
const userPresenceUpdates = new Map<string, NodeJS.Timeout>();

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
 * Device type detection based on user agent
 */
function detectDeviceType(userAgent?: string): 'desktop' | 'mobile' | 'tablet' {
  if (!userAgent) return 'desktop';
  
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|skyfire|maemo|windows phone|palm|iemobile|symbian|symbianos|fennec/.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Rate limiting check for user presence events
 */
function checkUserRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = userEventLimits.get(userId);
  
  if (!limit || now > limit.resetTime) {
    // Reset counter every minute
    userEventLimits.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (limit.count >= 30) { // Max 30 presence events per minute per user
    console.warn(`[Rate Limit] User ${userId} exceeded presence event limit`);
    return false;
  }
  
  limit.count++;
  return true;
}

/**
 * Aggregate device presence into user presence
 */
function aggregateUserPresence(userId: string): EnhancedUserPresence | null {
  const userDevices = Array.from(devicePresence.values())
    .filter(device => device.userId === userId);
  
  if (userDevices.length === 0) return null;
  
  // Sort devices by last activity (most recent first)
  userDevices.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  
  // Find primary device (most recently active)
  const primaryDevice = userDevices[0];
  
  return {
    userId,
    userName: primaryDevice.userName,
    avatarUrl: primaryDevice.avatarUrl,
    communityId: primaryDevice.communityId,
    devices: userDevices,
    totalDevices: userDevices.length,
    isOnline: userDevices.some(d => d.isActive),
    primaryDevice,
    lastSeen: new Date(Math.max(...userDevices.map(d => d.lastSeen.getTime())))
  };
}

/**
 * Get current online users for presence sync (enhanced)
 */
function getOnlineUsers(): EnhancedUserPresence[] {
  return Array.from(userPresence.values());
}

/**
 * Debounced user presence update to prevent event spam
 */
function debouncedPresenceUpdate(userId: string) {
  // Check rate limit
  if (!checkUserRateLimit(userId)) return;
  
  // Clear existing timeout
  if (userPresenceUpdates.has(userId)) {
    clearTimeout(userPresenceUpdates.get(userId));
  }
  
  // Set new timeout to batch updates
  const timeout = setTimeout(() => {
    const aggregatedUser = aggregateUserPresence(userId);
    if (aggregatedUser) {
      userPresence.set(userId, aggregatedUser);
      
      // Broadcast presence change to global room
      broadcastEvent({
        eventName: 'userPresenceUpdate',
        payload: { userPresence: aggregatedUser },
        config: {
          globalRoom: true,
          specificRooms: [],
          invalidateForAllUsers: false
        }
      });
    } else {
      // User has no devices, remove from user presence
      userPresence.delete(userId);
      
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
    }
    
    userPresenceUpdates.delete(userId);
  }, 500); // 500ms debounce window
  
  userPresenceUpdates.set(userId, timeout);
}

/**
 * Update device presence and trigger user aggregation
 */
function updateDevicePresence(frameUID: string, updates: Partial<DevicePresence>) {
  const existing = devicePresence.get(frameUID);
  if (existing) {
    const updated = { ...existing, ...updates, lastSeen: new Date() };
    devicePresence.set(frameUID, updated);
    
    // Trigger debounced user presence update
    debouncedPresenceUpdate(existing.userId);
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
        
      case 'reactionUpdate':
        config = {
          globalRoom: true,              // Enable global broadcast for home page users
          specificRooms: [room],         // Board users need immediate update
          invalidateForAllUsers: true    // All users with access should see updated reactions
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

  // ===== TELEGRAM NOTIFICATION SYSTEM =====
  
  // Setup parallel listener for Telegram notifications (NEW)
  customEventEmitter.on('broadcastEvent', async (eventDetails: { room: string; eventName: string; payload: any }) => {
    try {
      console.log(`[Telegram] Processing event: ${eventDetails.eventName} for room: ${eventDetails.room}`);
      await telegramEventHandler.handleBroadcastEvent(eventDetails);
    } catch (error) {
      // Log error but don't crash the main event system
      console.error('[Telegram] Event handling failed:', error);
    }
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
    
    // Extract frameUID from JWT for device identification
    const frameUID = user.uid || `fallback-${socket.id}`;
    const deviceType = detectDeviceType(socket.handshake.headers['user-agent']);
    
    // Add device to presence tracking
    const devicePresenceData: DevicePresence = {
      frameUID,
      userId: user.sub,
      userName: user.name || 'Unknown',
      avatarUrl: user.picture || undefined,
      communityId: user.cid || 'unknown',
      deviceType,
      currentBoardId: undefined,
      currentBoardName: undefined,
      connectedAt: new Date(),
      lastSeen: new Date(),
      socketId: socket.id,
      isActive: true
    };
    
    devicePresence.set(frameUID, devicePresenceData);
    
    // Aggregate and update user presence
    const aggregatedUser = aggregateUserPresence(user.sub);
    if (aggregatedUser) {
      userPresence.set(user.sub, aggregatedUser);
      
      // Broadcast user online to global room
      broadcastEvent({
        eventName: 'userOnline',
        payload: { userPresence: aggregatedUser },
        config: {
          globalRoom: true,
          specificRooms: [],
          invalidateForAllUsers: false
        }
      });
    }
    
    // Send initial presence sync to new user
    socket.emit('globalPresenceSync', getOnlineUsers());
    
    console.log(`[Socket.IO Multi-Device Presence] User ${user.sub} connected with device ${frameUID} (${deviceType}). Total devices: ${devicePresence.size}`);

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
          'SELECT id, community_id, settings, name FROM boards WHERE id = $1',
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
        
        // Update device presence with current board
        const frameUID = user.uid || `fallback-${socket.id}`;
        updateDevicePresence(frameUID, { 
          currentBoardId: boardIdNum, 
          currentBoardName: board.name,
          isActive: true 
        });
        
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
      
      // Update device presence (remove current board)
      const frameUID = user.uid || `fallback-${socket.id}`;
      updateDevicePresence(frameUID, { 
        currentBoardId: undefined, 
        currentBoardName: undefined,
        isActive: true 
      });
      
      console.log(`[Socket.IO] User ${user.sub} left board room: ${roomName}`);
      
      // Notify others in the room
      socket.to(roomName).emit('userLeftBoard', {
        userId: user.sub,
        boardId: boardIdNum
      });
    });

    // Enhanced typing indicators with post context and title resolution
    socket.on('typing', async (data: { 
      boardId: number; 
      postId?: number; 
      isTyping: boolean;
      context?: 'post' | 'comment';
    }) => {
      try {
        let postTitle: string | undefined;
        
        // Resolve post title if postId provided and user is starting to type
        if (data.postId && data.isTyping) {
          const postResult = await query(
            'SELECT title FROM posts WHERE id = $1 AND board_id = $2',
            [data.postId, data.boardId]
          );
          postTitle = postResult.rows[0]?.title;
        }
        
        // Update device presence with typing state
        const frameUID = user.uid || `fallback-${socket.id}`;
        updateDevicePresence(frameUID, {
          isTyping: data.isTyping,
          typingPostId: data.isTyping ? data.postId : undefined,
          typingBoardId: data.isTyping ? data.boardId : undefined,
          typingContext: data.isTyping ? data.context : undefined,
          typingTimestamp: data.isTyping ? new Date() : undefined,
          isActive: true
        });
        
        // Broadcast enhanced typing data to board room
        const roomName = `board:${data.boardId}`;
        socket.to(roomName).emit('userTyping', {
          userId: user.sub,
          userName: user.name,
          boardId: data.boardId,
          postId: data.postId,
          postTitle,
          isTyping: data.isTyping,
          context: data.context,
          timestamp: Date.now()
        });
        
        console.log(`[Socket.IO Enhanced Typing] User ${user.sub} ${data.isTyping ? 'started' : 'stopped'} typing${postTitle ? ` on "${postTitle}"` : ` in board ${data.boardId}`}`);
        
      } catch (error) {
        console.error('[Socket.IO] Error handling typing event:', error);
        // Still broadcast basic typing event if database lookup fails
        const roomName = `board:${data.boardId}`;
        socket.to(roomName).emit('userTyping', {
          userId: user.sub,
          userName: user.name,
          boardId: data.boardId,
          postId: data.postId,
          isTyping: data.isTyping,
          context: data.context,
          timestamp: Date.now()
        });
      }
    });

    // Handle disconnection with multi-device presence cleanup
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] User disconnected: ${user.sub} (reason: ${reason})`);
      
      const frameUID = user.uid || `fallback-${socket.id}`;
      const device = devicePresence.get(frameUID);
      
      // If user was typing, send stop typing event to clean up indicators
      if (device?.isTyping && device.typingBoardId) {
        const roomName = `board:${device.typingBoardId}`;
        socket.to(roomName).emit('userTyping', {
          userId: user.sub,
          userName: user.name,
          boardId: device.typingBoardId,
          postId: device.typingPostId,
          isTyping: false,
          context: device.typingContext,
          timestamp: Date.now()
        });
        console.log(`[Socket.IO Cleanup] Stopped typing indicator for disconnected user ${user.sub}`);
      }
      
      // Remove device from presence
      devicePresence.delete(frameUID);

      // Update user presence (may remove user if no devices left)
      debouncedPresenceUpdate(user.sub);
      
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
      
      console.log(`[Socket.IO Multi-Device Presence] Device ${frameUID} disconnected. Total devices: ${devicePresence.size}, Users: ${userPresence.size}`);
    });
  });

  // Enhanced periodic cleanup of stale devices and typing indicators
  setInterval(() => {
    const staleThreshold = Date.now() - (2 * 60 * 1000); // 2 minutes (shorter for better UX)
    const typingStaleThreshold = Date.now() - (15 * 1000); // 15 seconds for typing indicators
    const staleFrameUIDs: string[] = [];
    const staleTypingDevices: DevicePresence[] = [];
    let cleanedDevices = 0;
    let cleanedTyping = 0;
    
    // Find stale devices and stale typing indicators
    for (const [frameUID, device] of devicePresence.entries()) {
      // Check for stale devices
      if (device.lastSeen.getTime() < staleThreshold) {
        staleFrameUIDs.push(frameUID);
        cleanedDevices++;
      }
      // Check for stale typing indicators (separate from device staleness)
      else if (device.isTyping && 
               device.typingTimestamp && 
               device.typingTimestamp.getTime() < typingStaleThreshold) {
        staleTypingDevices.push(device);
        cleanedTyping++;
      }
    }
    
    // Clean up stale typing indicators
    staleTypingDevices.forEach(device => {
      if (device.typingBoardId) {
        // Broadcast stop typing event
        const roomName = `board:${device.typingBoardId}`;
        io.to(roomName).emit('userTyping', {
          userId: device.userId,
          userName: device.userName,
          boardId: device.typingBoardId,
          postId: device.typingPostId,
          isTyping: false,
          context: device.typingContext,
          timestamp: Date.now()
        });
        
        // Update device to remove typing state
        updateDevicePresence(device.frameUID, {
          isTyping: false,
          typingPostId: undefined,
          typingBoardId: undefined,
          typingContext: undefined,
          typingTimestamp: undefined
        });
      }
    });
    
    // Batch cleanup of stale devices and user presence updates
    const affectedUsers = new Set<string>();
    staleFrameUIDs.forEach(frameUID => {
      const device = devicePresence.get(frameUID);
      if (device) {
        // Send stop typing event if device was typing
        if (device.isTyping && device.typingBoardId) {
          const roomName = `board:${device.typingBoardId}`;
          io.to(roomName).emit('userTyping', {
            userId: device.userId,
            userName: device.userName,
            boardId: device.typingBoardId,
            postId: device.typingPostId,
            isTyping: false,
            context: device.typingContext,
            timestamp: Date.now()
          });
        }
        
        devicePresence.delete(frameUID);
        affectedUsers.add(device.userId);
      }
    });
    
    // Update affected users
    affectedUsers.forEach(userId => {
      debouncedPresenceUpdate(userId);
    });
    
    if (cleanedDevices > 0 || cleanedTyping > 0) {
      console.log(`[Socket.IO Cleanup] Removed ${cleanedDevices} stale devices, ${cleanedTyping} stale typing indicators affecting ${affectedUsers.size} users. Total devices: ${devicePresence.size}, Users: ${userPresence.size}`);
    }
  }, 30 * 1000); // Run every 30 seconds for better typing cleanup

  // Start the HTTP server
  const port = parseInt(process.env.PORT || '3000', 10);
  const hostname = '0.0.0.0'; // Recommended for containerized environments
  httpServer.listen(port, hostname, () => {
    console.log(`[Server] Ready on http://${hostname}:${port}`);
    console.log(`[Socket.IO] WebSocket server ready with global presence system`);
  });
}

// Start the server
bootstrap().catch((err) => {
  console.error('[Server] Startup error:', err);
  process.exit(1);
}); 