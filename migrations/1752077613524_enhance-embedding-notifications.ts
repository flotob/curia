/* eslint-disable camelcase */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Enhance existing function to handle both posts and comments
  pgm.sql(`
    CREATE OR REPLACE FUNCTION notify_embedding_needed()
    RETURNS trigger AS $$
    BEGIN
      -- Handle posts table
      IF TG_TABLE_NAME = 'posts' THEN
        IF (TG_OP = 'INSERT' AND NEW.embedding IS NULL) OR
           (TG_OP = 'UPDATE' AND (
             OLD.title IS DISTINCT FROM NEW.title OR 
             OLD.content IS DISTINCT FROM NEW.content OR 
             (OLD.embedding IS NOT NULL AND NEW.embedding IS NULL)
           )) THEN
          
          PERFORM pg_notify('embedding_needed', json_build_object(
            'type', 'post',
            'id', NEW.id,
            'operation', TG_OP,
            'priority', CASE WHEN NEW.embedding IS NULL THEN 'high' ELSE 'normal' END,
            'timestamp', extract(epoch from now())
          )::text);
        END IF;
      END IF;

      -- Handle comments table
      IF TG_TABLE_NAME = 'comments' THEN
        IF (TG_OP = 'INSERT' AND NEW.embedding IS NULL) OR
           (TG_OP = 'UPDATE' AND (
             OLD.content IS DISTINCT FROM NEW.content OR 
             (OLD.embedding IS NOT NULL AND NEW.embedding IS NULL)
           )) THEN
          
          PERFORM pg_notify('embedding_needed', json_build_object(
            'type', 'comment',
            'id', NEW.id,
            'operation', TG_OP,
            'priority', CASE WHEN NEW.embedding IS NULL THEN 'high' ELSE 'normal' END,
            'timestamp', extract(epoch from now())
          )::text);
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Install trigger on comments table
  pgm.sql(`
    CREATE TRIGGER comments_embedding_trigger
      AFTER INSERT OR UPDATE ON comments
      FOR EACH ROW
      EXECUTE FUNCTION notify_embedding_needed();
  `);

  // Update function description to reflect new capabilities
  pgm.sql(`
    COMMENT ON FUNCTION notify_embedding_needed() IS 
    'Triggers PostgreSQL NOTIFY events when posts or comments need embedding generation. Used by embedding worker service. Enhanced to handle both content types with unified event format.';
  `);

  // Add migration documentation
  pgm.sql(`
    COMMENT ON TRIGGER comments_embedding_trigger ON comments IS
    'Automatically triggers embedding generation events when comments are created or updated. Works alongside posts_embedding_trigger for unified content processing.';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove comment trigger first
  pgm.sql('DROP TRIGGER IF EXISTS comments_embedding_trigger ON comments;');
  
  // Revert function to posts-only behavior (restore original functionality)
  pgm.sql(`
    CREATE OR REPLACE FUNCTION notify_embedding_needed()
    RETURNS trigger AS $$
    BEGIN
      -- Only notify if content changed or embedding is missing
      IF (TG_OP = 'INSERT' AND NEW.embedding IS NULL) OR
         (TG_OP = 'UPDATE' AND (
           OLD.title IS DISTINCT FROM NEW.title OR 
           OLD.content IS DISTINCT FROM NEW.content OR 
           (OLD.embedding IS NOT NULL AND NEW.embedding IS NULL)
         )) THEN
        
        PERFORM pg_notify('embedding_needed', json_build_object(
          'postId', NEW.id,
          'operation', TG_OP,
          'priority', CASE WHEN NEW.embedding IS NULL THEN 'high' ELSE 'normal' END,
          'timestamp', extract(epoch from now())
        )::text);
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Restore original function description
  pgm.sql(`
    COMMENT ON FUNCTION notify_embedding_needed() IS 
    'Triggers PostgreSQL NOTIFY events when posts need embedding generation. Used by embedding worker service.';
  `);
}
