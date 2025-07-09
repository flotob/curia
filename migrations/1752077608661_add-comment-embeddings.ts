/* eslint-disable camelcase */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add embedding column to comments table for storing OpenAI text-embedding-3-small vectors (1536 dimensions)
  pgm.addColumn('comments', {
    embedding: {
      type: 'vector(1536)',
      notNull: false, // Allow NULL during backfill process
      comment: 'OpenAI text-embedding-3-small vector for semantic search. Generated from comment content. NULL indicates needs embedding generation.'
    }
  });

  // Create HNSW index for fast approximate nearest neighbor search on comments
  // Using cosine distance operator for OpenAI embeddings
  // Parameters tuned for comment volume (typically 5x more comments than posts)
  pgm.sql(`
    CREATE INDEX comments_embedding_hnsw_idx 
    ON comments 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  `);

  // Add index for comments without embeddings to efficiently identify them during backfill
  pgm.sql(`
    CREATE INDEX comments_embedding_null_idx 
    ON comments (id) 
    WHERE embedding IS NULL;
  `);

  // Composite index for comment search with post context (performance optimization)
  pgm.sql(`
    CREATE INDEX comments_post_embedding_idx 
    ON comments (post_id, id)
    WHERE embedding IS NOT NULL;
  `);

  // Add documentation comment
  pgm.sql(`
    COMMENT ON COLUMN comments.embedding IS 
    'Semantic search vector from OpenAI text-embedding-3-small model. Generated from comment content. NULL indicates needs embedding generation.';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove indexes first
  pgm.sql('DROP INDEX IF EXISTS comments_embedding_hnsw_idx;');
  pgm.sql('DROP INDEX IF EXISTS comments_embedding_null_idx;');
  pgm.sql('DROP INDEX IF EXISTS comments_post_embedding_idx;');
  
  // Remove embedding column
  pgm.dropColumn('comments', 'embedding');
}
