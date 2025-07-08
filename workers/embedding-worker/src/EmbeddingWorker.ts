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
}

export class EmbeddingWorker {
  private client: Client;
  private isRunning = false;
  private processingQueue = new Set<number>(); // Prevent duplicate processing
  private config: EmbeddingWorkerConfig;
  private requestCount = 0;
  private lastResetTime = Date.now();

  constructor(config: EmbeddingWorkerConfig) {
    this.config = config;
    this.client = new Client({
      connectionString: config.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  async start(): Promise<void> {
    try {
      // Connect to database
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
          }
        }
      });

      // Handle connection errors
      this.client.on('error', (error) => {
        console.error('[EmbeddingWorker] Database connection error:', error);
        this.reconnect();
      });

      this.isRunning = true;

      // Process any backlog on startup
      await this.processBacklog();

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

    // Skip if already processing this post
    if (this.processingQueue.has(postId)) {
      console.log(`[EmbeddingWorker] Skipping post ${postId} - already processing`);
      return;
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      console.log(`[EmbeddingWorker] Rate limit exceeded, queuing post ${postId} for later`);
      // Could implement a retry queue here
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
        console.log(`[EmbeddingWorker] ✅ Generated embedding for post ${postId}`);
      } else {
        console.log(`[EmbeddingWorker] ⚠️ Post ${postId} not found or has no content`);
      }

    } catch (error) {
      console.error(`[EmbeddingWorker] ❌ Failed to process post ${postId}:`, error);
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

  private async reconnect(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[EmbeddingWorker] Attempting to reconnect...');
    
    try {
      await this.client.end();
      this.client = new Client({
        connectionString: this.config.databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      await this.start();
    } catch (error) {
      console.error('[EmbeddingWorker] Reconnection failed:', error);
      // Retry after delay
      setTimeout(() => this.reconnect(), 5000);
    }
  }
} 