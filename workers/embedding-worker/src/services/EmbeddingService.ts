import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { Client } from 'pg';

export class EmbeddingService {
  private static client: Client | null = null;

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
    }
  }

  /**
   * Generate embedding for a text string using OpenAI
   */
  static async generateEmbedding(text: string, apiKey: string): Promise<number[]> {
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
        const { embedding } = await embed({
          model: openai.embedding('text-embedding-3-small'),
          value: preparedText,
        });
        
                 return embedding;
       } finally {
         // Restore original API key
         if (originalApiKey) {
           process.env.OPENAI_API_KEY = originalApiKey;
         } else {
           delete process.env.OPENAI_API_KEY;
         }
       }
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding and store it in the database
   */
  static async generateAndStoreEmbedding(
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
      const embedding = await this.generateEmbedding(textToEmbed, apiKey);
      
      // Store in database
      await this.storeEmbedding(postId, embedding);
      
      console.log(`[EmbeddingService] Successfully stored embedding for post ${postId}`);
    } catch (error) {
      console.error(`[EmbeddingService] Failed to generate and store embedding for post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Store embedding vector in the database
   */
  private static async storeEmbedding(postId: number, embedding: number[]): Promise<void> {
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
   * Close database connection
   */
  static async closeDatabase(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }
} 