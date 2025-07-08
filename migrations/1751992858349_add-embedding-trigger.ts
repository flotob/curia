import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create notification function for embedding events
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

  // Install trigger on posts table
  pgm.sql(`
    CREATE TRIGGER posts_embedding_trigger
      AFTER INSERT OR UPDATE ON posts
      FOR EACH ROW
      EXECUTE FUNCTION notify_embedding_needed();
  `);

  // Add comment for documentation
  pgm.sql(`
    COMMENT ON FUNCTION notify_embedding_needed() IS 
    'Triggers PostgreSQL NOTIFY events when posts need embedding generation. Used by embedding worker service.';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove trigger first
  pgm.sql('DROP TRIGGER IF EXISTS posts_embedding_trigger ON posts;');
  
  // Remove function
  pgm.sql('DROP FUNCTION IF EXISTS notify_embedding_needed();');
}
