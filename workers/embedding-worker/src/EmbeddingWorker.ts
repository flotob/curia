import { Client } from 'pg';
import { EmbeddingService } from './services/EmbeddingService';

export interface EmbeddingWorkerConfig {
  databaseUrl: string;
  openaiApiKey: string;
  batchSize: number;
  rateLimitPerMinute: number;
}

export interface EmbeddingEvent {
  postId: number;
  operation: 'INSERT' | 'UPDATE';
  priority: 'high' | 'normal';
  timestamp?: number;
}

interface WorkerMetrics {
  eventsProcessed: number;
  eventsSuccessful: number;
  eventsFailed: number;
  startTime: Date;
  lastEventTime: Date | null;
  reconnectCount: number;
  averageProcessingTime: number;
}

export class EmbeddingWorker {
  private client: Client;
  private isRunning = false;
  private processingQueue = new Set<number>(); // Prevent duplicate processing
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
    
    // Initialize metrics
    this.metrics = {
      eventsProcessed: 0,
      eventsSuccessful: 0,
      eventsFailed: 0,
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
            const eventData: EmbeddingEvent = JSON.parse(msg.payload);
            await this.processEmbeddingEvent(eventData);
          } catch (error) {
            console.error('[EmbeddingWorker] Failed to parse notification:', error);
            this.updateMetrics(false);
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

  private async processEmbeddingEvent(event: EmbeddingEvent): Promise<void> {
    const { postId, operation, priority } = event;
    const startTime = Date.now();

    // Skip if already processing this post
    if (this.processingQueue.has(postId)) {
      console.log(`[EmbeddingWorker] Skipping post ${postId} - already processing`);
      return;
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      console.log(`[EmbeddingWorker] Rate limit exceeded, queuing post ${postId} for later`);
      // TODO: Implement a retry queue for rate-limited requests
      return;
    }

    this.processingQueue.add(postId);

    try {
      console.log(`[EmbeddingWorker] Processing ${operation} for post ${postId} (${priority} priority)`);

      // Fetch post data and generate embedding
      const post = await this.fetchPostData(postId);
      if (post && (post.title || post.content)) {
        await EmbeddingService.generateAndStoreEmbedding(
          postId,
          post.title || '',
          post.content || '',
          this.config.openaiApiKey
        );
        
        this.requestCount++;
        const processingTime = Date.now() - startTime;
        this.updateMetrics(true, processingTime);
        console.log(`[EmbeddingWorker] ✅ Generated embedding for post ${postId} in ${processingTime}ms`);
      } else {
        console.log(`[EmbeddingWorker] ⚠️ Post ${postId} not found or has no content`);
        this.updateMetrics(true); // Still successful, just nothing to process
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);
      console.error(`[EmbeddingWorker] ❌ Failed to process post ${postId} after ${processingTime}ms:`, error);
      
      // Log additional context for debugging
      if (error instanceof Error) {
        console.error(`[EmbeddingWorker] Error details:`, {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
          postId,
          operation,
          priority
        });
      }
    } finally {
      this.processingQueue.delete(postId);
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

  private async processBacklog(): Promise<void> {
    try {
      console.log('[EmbeddingWorker] Checking for posts needing embeddings...');
      
      const result = await this.client.query(`
        SELECT id, title, content 
        FROM posts 
        WHERE embedding IS NULL 
        ORDER BY created_at DESC 
        LIMIT $1
      `, [this.config.batchSize]);

      if (result.rows.length > 0) {
        console.log(`[EmbeddingWorker] Found ${result.rows.length} posts needing embeddings`);
        
        for (const post of result.rows) {
          await this.processEmbeddingEvent({
            postId: post.id,
            operation: 'INSERT',
            priority: 'normal'
          });
          
          // Small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
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
  private updateMetrics(success: boolean, processingTime?: number): void {
    this.metrics.eventsProcessed++;
    this.metrics.lastEventTime = new Date();
    
    if (success) {
      this.metrics.eventsSuccessful++;
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