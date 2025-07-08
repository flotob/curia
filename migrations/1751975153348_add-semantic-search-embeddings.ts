import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Enable the pgvector extension for vector similarity search
  pgm.sql('CREATE EXTENSION IF NOT EXISTS vector;');

  // Add embedding column to posts table for storing OpenAI text-embedding-3-small vectors (1536 dimensions)
  pgm.addColumn('posts', {
    embedding: {
      type: 'vector(1536)',
      notNull: false, // Allow NULL during backfill process
      comment: 'OpenAI text-embedding-3-small vector for semantic search (1536 dimensions)'
    }
  });

  // Create HNSW index for fast approximate nearest neighbor search
  // Using cosine distance operator for OpenAI embeddings
  // Parameters tuned for ~10K posts with room to scale
  pgm.sql(`
    CREATE INDEX posts_embedding_hnsw_idx 
    ON posts 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  `);

  // Add GIN index for posts without embeddings to efficiently identify them during backfill
  pgm.sql(`
    CREATE INDEX posts_embedding_null_idx 
    ON posts (id) 
    WHERE embedding IS NULL;
  `);

  // Add updated_at trigger for embedding column to track when embeddings were last generated
  pgm.sql(`
    COMMENT ON COLUMN posts.embedding IS 
    'Semantic search vector from OpenAI text-embedding-3-small model. Generated from title + content. NULL indicates needs embedding generation.';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove indexes first (required before dropping column)
  pgm.sql('DROP INDEX IF EXISTS posts_embedding_null_idx;');
  pgm.sql('DROP INDEX IF EXISTS posts_embedding_hnsw_idx;');

  // Remove the embedding column
  pgm.dropColumn('posts', 'embedding');

  // Note: We don't drop the vector extension as other features might use it
  // If you want to completely remove vector support, manually run:
  // DROP EXTENSION IF EXISTS vector CASCADE;
}
