import { Client } from 'pg';
import { EmbeddingService } from './services/EmbeddingService';

export interface EmbeddingWorkerConfig {
  databaseUrl: string;
  openaiApiKey: string;
  batchSize: number;
  rateLimitPerMinute: number;
}

// Updated interface to support both posts and comments
export interface EmbeddingEvent {
  type: 'post' | 'comment';
  id: number;
  operation: 'INSERT' | 'UPDATE';
  priority: 'high' | 'normal';
  timestamp?: number;
}

// Legacy interface for backward compatibility during transition
export interface LegacyEmbeddingEvent {
  postId: number;
  operation: 'INSERT' | 'UPDATE';
  priority: 'high' | 'normal';
  timestamp?: number;
}

interface WorkerMetrics {
  eventsProcessed: number;
  eventsSuccessful: number;
  eventsFailed: number;
  postsProcessed: number;
  commentsProcessed: number;
  startTime: Date;
  lastEventTime: Date | null;
  reconnectCount: number;
  averageProcessingTime: number;
}

export class EmbeddingWorker {
  private client: Client;
  private isRunning = false;
  private processingQueue = new Set<string>(); // Prevent duplicate processing (using "type:id" format)
  private config: EmbeddingWorkerConfig;
  private requestCount = 0;
  private lastResetTime = Date.now();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private metrics: WorkerMetrics;

  constructor(config: EmbeddingWorkerConfig) {
    this.config = config;
    this.client = new Client({
      connectionString: config.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    // Initialize metrics with new fields
    this.metrics = {
      eventsProcessed: 0,
      eventsSuccessful: 0,
      eventsFailed: 0,
      postsProcessed: 0,
      commentsProcessed: 0,
      startTime: new Date(),
      lastEventTime: null,
      reconnectCount: 0,
      averageProcessingTime: 0,
    };
  }

  async start(): Promise<void> {
    try {
      // Initialize EmbeddingService database connection
      await EmbeddingService.initializeDatabase(this.config.databaseUrl);
      
      // Connect to database for notifications
      await this.client.connect();
      console.log('[EmbeddingWorker] Connected to PostgreSQL');

      // Set up PostgreSQL LISTEN
      await this.client.query('LISTEN embedding_needed');
      console.log('[EmbeddingWorker] Listening for embedding events');

      // Handle notifications
      this.client.on('notification', async (msg) => {
        if (msg.channel === 'embedding_needed' && msg.payload) {
          try {
            const eventData = JSON.parse(msg.payload);
            
            // Handle both new and legacy event formats
            if (this.isLegacyEvent(eventData)) {
              // Convert legacy format to new format
              const legacyEvent = eventData as LegacyEmbeddingEvent;
              const modernEvent: EmbeddingEvent = {
                type: 'post',
                id: legacyEvent.postId,
                operation: legacyEvent.operation,
                priority: legacyEvent.priority,
                timestamp: legacyEvent.timestamp,
              };
              await this.processEmbeddingEvent(modernEvent);
            } else {
              // Process modern event format
              const modernEvent = eventData as EmbeddingEvent;
              await this.processEmbeddingEvent(modernEvent);
            }
          } catch (error) {
            console.error('[EmbeddingWorker] Failed to parse notification:', error);
            this.updateMetrics(false, 'unknown');
          }
        }
      });

      // Handle connection errors
      this.client.on('error', (error) => {
        console.error('[EmbeddingWorker] Database connection error:', error);
        this.scheduleReconnect();
      });

      // Handle unexpected disconnections
      this.client.on('end', () => {
        if (this.isRunning) {
          console.warn('[EmbeddingWorker] Database connection ended unexpectedly');
          this.scheduleReconnect();
        }
      });

      this.isRunning = true;
      this.reconnectAttempts = 0;

      // Process any backlog on startup
      await this.processBacklog();
      
      console.log('[EmbeddingWorker] Service started successfully');

    } catch (error) {
      console.error('[EmbeddingWorker] Failed to start:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('[EmbeddingWorker] Stopping worker...');
    this.isRunning = false;

    try {
      await this.client.query('UNLISTEN embedding_needed');
      await this.client.end();
      console.log('[EmbeddingWorker] Disconnected from PostgreSQL');
    } catch (error) {
      console.error('[EmbeddingWorker] Error during shutdown:', error);
    }
  }

  private isLegacyEvent(event: any): event is LegacyEmbeddingEvent {
    return event.postId !== undefined && event.type === undefined;
  }

  private async processEmbeddingEvent(event: EmbeddingEvent): Promise<void> {
    const { type, id, operation, priority } = event;
    const startTime = Date.now();
    const queueKey = `${type}:${id}`;

    // Skip if already processing this item
    if (this.processingQueue.has(queueKey)) {
      console.log(`[EmbeddingWorker] Skipping ${type} ${id} - already processing`);
      return;
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      console.log(`[EmbeddingWorker] Rate limit exceeded, queuing ${type} ${id} for later`);
      // TODO: Implement a retry queue for rate-limited requests
      return;
    }

    this.processingQueue.add(queueKey);

    try {
      console.log(`[EmbeddingWorker] Processing ${operation} for ${type} ${id} (${priority} priority)`);

      if (type === 'post') {
        await this.processPostEmbedding(id);
      } else if (type === 'comment') {
        await this.processCommentEmbedding(id);
      } else {
        throw new Error(`Unknown content type: ${type}`);
      }
      
      this.requestCount++;
      const processingTime = Date.now() - startTime;
      this.updateMetrics(true, type, processingTime);
      console.log(`[EmbeddingWorker] ✅ Generated embedding for ${type} ${id} in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, type, processingTime);
      console.error(`[EmbeddingWorker] ❌ Failed to process ${type} ${id} after ${processingTime}ms:`, error);
      
      // Log additional context for debugging
      if (error instanceof Error) {
        console.error(`[EmbeddingWorker] Error details:`, {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
          type,
          id,
          operation,
          priority
        });
      }
    } finally {
      this.processingQueue.delete(queueKey);
    }
  }

  private async processPostEmbedding(postId: number): Promise<void> {
    const post = await this.fetchPostData(postId);
    if (post && (post.title || post.content)) {
      await EmbeddingService.generateAndStorePostEmbedding(
        postId,
        post.title || '',
        post.content || '',
        this.config.openaiApiKey
      );
    } else {
      console.log(`[EmbeddingWorker] ⚠️ Post ${postId} not found or has no content`);
    }
  }

  private async processCommentEmbedding(commentId: number): Promise<void> {
    const comment = await this.fetchCommentData(commentId);
    if (comment && comment.content) {
      await EmbeddingService.generateAndStoreCommentEmbedding(
        commentId,
        comment.content,
        this.config.openaiApiKey
      );
    } else {
      console.log(`[EmbeddingWorker] ⚠️ Comment ${commentId} not found or has no content`);
    }
  }

  private async fetchPostData(postId: number): Promise<{ title: string; content: string } | null> {
    try {
      const result = await this.client.query(
        'SELECT title, content FROM posts WHERE id = $1',
        [postId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error(`[EmbeddingWorker] Failed to fetch post ${postId}:`, error);
      return null;
    }
  }

  private async fetchCommentData(commentId: number): Promise<{ content: string; post_id: number } | null> {
    try {
      const result = await this.client.query(
        'SELECT content, post_id FROM comments WHERE id = $1',
        [commentId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error(`[EmbeddingWorker] Failed to fetch comment ${commentId}:`, error);
      return null;
    }
  }

  private async processBacklog(): Promise<void> {
    try {
      console.log('[EmbeddingWorker] Checking for content needing embeddings...');
      
      // Process posts backlog
      const postsResult = await this.client.query(`
        SELECT id, title, content 
        FROM posts 
        WHERE embedding IS NULL 
        ORDER BY created_at DESC 
        LIMIT $1
      `, [Math.floor(this.config.batchSize / 2)]); // Split batch size between posts and comments

      if (postsResult.rows.length > 0) {
        console.log(`[EmbeddingWorker] Found ${postsResult.rows.length} posts needing embeddings`);
        
        for (const post of postsResult.rows) {
          await this.processEmbeddingEvent({
            type: 'post',
            id: post.id,
            operation: 'INSERT',
            priority: 'normal'
          });
          
          // Small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Process comments backlog
      const commentsResult = await this.client.query(`
        SELECT id, content, post_id 
        FROM comments 
        WHERE embedding IS NULL 
        ORDER BY created_at DESC 
        LIMIT $1
      `, [Math.floor(this.config.batchSize / 2)]);

      if (commentsResult.rows.length > 0) {
        console.log(`[EmbeddingWorker] Found ${commentsResult.rows.length} comments needing embeddings`);
        
        for (const comment of commentsResult.rows) {
          await this.processEmbeddingEvent({
            type: 'comment',
            id: comment.id,
            operation: 'INSERT',
            priority: 'normal'
          });
          
          // Small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const totalBacklog = postsResult.rows.length + commentsResult.rows.length;
      if (totalBacklog === 0) {
        console.log('[EmbeddingWorker] No backlog found - all content has embeddings');
      }
    } catch (error) {
      console.error('[EmbeddingWorker] Failed to process backlog:', error);
    }
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counter every minute
    if (timeSinceReset > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    return this.requestCount < this.config.rateLimitPerMinute;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.isRunning || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[EmbeddingWorker] Max reconnection attempts reached. Stopping service.');
        this.isRunning = false;
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Max 30s
    
    console.log(`[EmbeddingWorker] Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      await this.reconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect to the database
   */
  private async reconnect(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[EmbeddingWorker] Attempting to reconnect...');
    
    try {
      // Clean up existing connection
      try {
        await this.client.end();
      } catch (error) {
        // Ignore errors when closing
      }
      
      // Create new connection
      this.client = new Client({
        connectionString: this.config.databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      
      // Restart the service
      await this.start();
      this.metrics.reconnectCount++;
      console.log('[EmbeddingWorker] Reconnection successful');
      
    } catch (error) {
      console.error('[EmbeddingWorker] Reconnection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Update worker metrics
   */
  private updateMetrics(success: boolean, contentType: 'post' | 'comment' | 'unknown', processingTime?: number): void {
    this.metrics.eventsProcessed++;
    this.metrics.lastEventTime = new Date();
    
    if (success) {
      this.metrics.eventsSuccessful++;
      if (contentType === 'post') {
        this.metrics.postsProcessed++;
      } else if (contentType === 'comment') {
        this.metrics.commentsProcessed++;
      }
      
      if (processingTime) {
        const total = this.metrics.averageProcessingTime * (this.metrics.eventsSuccessful - 1) + processingTime;
        this.metrics.averageProcessingTime = total / this.metrics.eventsSuccessful;
      }
    } else {
      this.metrics.eventsFailed++;
    }
  }

  /**
   * Get current worker metrics
   */
  getMetrics(): WorkerMetrics & { embeddingService: ReturnType<typeof EmbeddingService.getMetrics> } {
    return {
      ...this.metrics,
      embeddingService: EmbeddingService.getMetrics(),
    };
  }

  /**
   * Get service health status
   */
  getHealth(): { status: 'healthy' | 'unhealthy'; uptime: number; lastProcessed: Date | null } {
    const uptime = Date.now() - this.metrics.startTime.getTime();
    const lastProcessedRecently = this.metrics.lastEventTime && 
      (Date.now() - this.metrics.lastEventTime.getTime()) < 300000; // 5 minutes
    
    const status = this.isRunning && (this.metrics.eventsProcessed === 0 || lastProcessedRecently) 
      ? 'healthy' 
      : 'unhealthy';
    
    return {
      status,
      uptime,
      lastProcessed: this.metrics.lastEventTime,
    };
  }
} 