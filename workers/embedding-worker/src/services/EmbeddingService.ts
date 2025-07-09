import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { Client } from 'pg';

interface EmbeddingConfig {
  model: string;
  maxTextLength: number;
  retryAttempts: number;
  retryDelayMs: number;
}

interface EmbeddingMetrics {
  generated: number;
  errors: number;
  totalCost: number;
  averageLatency: number;
  postsProcessed: number;
  commentsProcessed: number;
}

export class EmbeddingService {
  private static client: Client | null = null;
  private static config: EmbeddingConfig = {
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    maxTextLength: parseInt(process.env.EMBEDDING_MAX_TEXT_LENGTH || '30000'),
    retryAttempts: parseInt(process.env.EMBEDDING_RETRY_ATTEMPTS || '3'),
    retryDelayMs: parseInt(process.env.EMBEDDING_RETRY_DELAY_MS || '1000'),
  };
  private static metrics: EmbeddingMetrics = {
    generated: 0,
    errors: 0,
    totalCost: 0,
    averageLatency: 0,
    postsProcessed: 0,
    commentsProcessed: 0,
  };

  /**
   * Initialize database connection for the service
   */
  static async initializeDatabase(databaseUrl: string): Promise<void> {
    if (!this.client) {
      this.client = new Client({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      await this.client.connect();
      console.log('[EmbeddingService] Database connection established');
    }
  }

    /**
   * Generate embedding for a text string using OpenAI with retry logic
   */
  static async generateEmbedding(text: string, apiKey: string): Promise<{ embedding: number[]; cost: number; tokens: number }> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Prepare text (combine title and content, trim if too long)
        const preparedText = this.prepareTextForEmbedding(text);
        
        if (!preparedText.trim()) {
          throw new Error('Empty text provided for embedding');
        }

        // Set OpenAI API key in environment for this request
        const originalApiKey = process.env.OPENAI_API_KEY;
        process.env.OPENAI_API_KEY = apiKey;

        try {
          // Generate embedding using AI SDK
          const { embedding, usage } = await embed({
            model: openai.embedding(this.config.model),
            value: preparedText,
          });
          
          // Calculate cost (text-embedding-3-small: $0.00002 per 1K tokens)
          const tokens = usage?.tokens || Math.ceil(preparedText.length / 4);
          const cost = (tokens / 1000) * 0.00002;
          
          // Update metrics
          const latency = Date.now() - startTime;
          this.updateMetrics(true, latency, cost);
          
          console.log(`[EmbeddingService] Generated embedding: ${tokens} tokens, $${cost.toFixed(6)}, ${latency}ms`);
          
          return { embedding, cost, tokens };
        } finally {
          // Restore original API key
          if (originalApiKey) {
            process.env.OPENAI_API_KEY = originalApiKey;
          } else {
            delete process.env.OPENAI_API_KEY;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`[EmbeddingService] Attempt ${attempt}/${this.config.retryAttempts} failed:`, lastError.message);
        
        // Don't retry on authentication errors
        if (lastError.message.includes('401') || lastError.message.includes('invalid_api_key')) {
          throw new Error(`OpenAI API authentication failed: ${lastError.message}`);
        }
        
        // Wait before retrying (exponential backoff with jitter)
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
          console.log(`[EmbeddingService] Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    this.updateMetrics(false, Date.now() - startTime, 0);
    throw new Error(`Embedding generation failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Generate embedding for a post and store it in the database
   */
  static async generateAndStorePostEmbedding(
    postId: number,
    title: string,
    content: string,
    apiKey: string
  ): Promise<void> {
    try {
      // Combine title and content for embedding
      const textToEmbed = this.combineTextFields(title, content);
      
      if (!textToEmbed.trim()) {
        console.log(`[EmbeddingService] Skipping post ${postId} - no content to embed`);
        return;
      }

      // Generate embedding
      const { embedding, cost, tokens } = await this.generateEmbedding(textToEmbed, apiKey);
      
      // Store in database
      await this.storePostEmbedding(postId, embedding);
      
      this.metrics.postsProcessed++;
      console.log(`[EmbeddingService] Successfully stored embedding for post ${postId} (${tokens} tokens, $${cost.toFixed(6)})`);
    } catch (error) {
      console.error(`[EmbeddingService] Failed to generate and store embedding for post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Generate embedding for a comment and store it in the database
   */
  static async generateAndStoreCommentEmbedding(
    commentId: number,
    content: string,
    apiKey: string
  ): Promise<void> {
    try {
      // Prepare comment content for embedding
      const textToEmbed = content.trim();
      
      if (!textToEmbed) {
        console.log(`[EmbeddingService] Skipping comment ${commentId} - no content to embed`);
        return;
      }

      // Generate embedding
      const { embedding, cost, tokens } = await this.generateEmbedding(textToEmbed, apiKey);
      
      // Store in database
      await this.storeCommentEmbedding(commentId, embedding);
      
      this.metrics.commentsProcessed++;
      console.log(`[EmbeddingService] Successfully stored embedding for comment ${commentId} (${tokens} tokens, $${cost.toFixed(6)})`);
    } catch (error) {
      console.error(`[EmbeddingService] Failed to generate and store embedding for comment ${commentId}:`, error);
      throw error;
    }
  }

  /**
   * Legacy method - Generate embedding and store it in the database (for backward compatibility)
   * @deprecated Use generateAndStorePostEmbedding instead
   */
  static async generateAndStoreEmbedding(
    postId: number,
    title: string,
    content: string,
    apiKey: string
  ): Promise<void> {
    console.warn('[EmbeddingService] generateAndStoreEmbedding is deprecated, use generateAndStorePostEmbedding instead');
    return this.generateAndStorePostEmbedding(postId, title, content, apiKey);
  }

  /**
   * Store post embedding vector in the database
   */
  private static async storePostEmbedding(postId: number, embedding: number[]): Promise<void> {
    if (!this.client) {
      throw new Error('Database not initialized. Call initializeDatabase() first.');
    }

    try {
      // Convert embedding array to PostgreSQL vector format
      const vectorString = `[${embedding.join(',')}]`;
      
      await this.client.query(
        'UPDATE posts SET embedding = $1::vector, updated_at = NOW() WHERE id = $2',
        [vectorString, postId]
      );
    } catch (error) {
      console.error(`[EmbeddingService] Failed to store embedding for post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Store comment embedding vector in the database
   */
  private static async storeCommentEmbedding(commentId: number, embedding: number[]): Promise<void> {
    if (!this.client) {
      throw new Error('Database not initialized. Call initializeDatabase() first.');
    }

    try {
      // Convert embedding array to PostgreSQL vector format
      const vectorString = `[${embedding.join(',')}]`;
      
      await this.client.query(
        'UPDATE comments SET embedding = $1::vector, updated_at = NOW() WHERE id = $2',
        [vectorString, commentId]
      );
    } catch (error) {
      console.error(`[EmbeddingService] Failed to store embedding for comment ${commentId}:`, error);
      throw error;
    }
  }

  /**
   * Legacy method - Store embedding vector in the database (for backward compatibility)
   * @deprecated Use storePostEmbedding instead
   */
  private static async storeEmbedding(postId: number, embedding: number[]): Promise<void> {
    return this.storePostEmbedding(postId, embedding);
  }

  /**
   * Combine title and content for embedding
   */
  private static combineTextFields(title: string, content: string): string {
    const cleanTitle = (title || '').trim();
    const cleanContent = (content || '').trim();
    
    if (!cleanTitle && !cleanContent) {
      return '';
    }
    
    if (!cleanTitle) {
      return cleanContent;
    }
    
    if (!cleanContent) {
      return cleanTitle;
    }
    
    return `${cleanTitle}\n\n${cleanContent}`;
  }

  /**
   * Prepare text for embedding (truncate if too long, clean up)
   */
  private static prepareTextForEmbedding(text: string): string {
    if (!text) return '';
    
    // Clean up the text
    let prepared = text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
    
    // OpenAI embedding models have a token limit
    // text-embedding-3-small supports up to 8191 tokens
    // Roughly 4 characters per token, so limit to ~30,000 characters to be safe
    const maxLength = 30000;
    
    if (prepared.length > maxLength) {
      prepared = prepared.substring(0, maxLength) + '...';
      console.log(`[EmbeddingService] Text truncated to ${maxLength} characters`);
    }
    
    return prepared;
  }

  /**
   * Get database client (for testing or advanced usage)
   */
  static getClient(): Client | null {
    return this.client;
  }

  /**
   * Update service metrics
   */
  private static updateMetrics(success: boolean, latency: number, cost: number): void {
    if (success) {
      this.metrics.generated++;
      this.metrics.totalCost += cost;
      this.metrics.averageLatency = (this.metrics.averageLatency * (this.metrics.generated - 1) + latency) / this.metrics.generated;
    } else {
      this.metrics.errors++;
    }
  }

  /**
   * Get current service metrics
   */
  static getMetrics(): EmbeddingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset service metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      generated: 0,
      errors: 0,
      totalCost: 0,
      averageLatency: 0,
      postsProcessed: 0,
      commentsProcessed: 0,
    };
  }

  /**
   * Close database connection
   */
  static async closeDatabase(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      console.log('[EmbeddingService] Database connection closed');
    }
  }
} 