/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('communities', {
    id: {
      type: 'text',
      primaryKey: true, // Common Ground Community ID
    },
    name: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create a trigger to automatically update updated_at on row update
  pgm.sql(`
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp_communities
    BEFORE UPDATE ON communities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TRIGGER IF EXISTS set_timestamp_communities ON communities;`);
  // Note: The trigger_set_timestamp function is re-used from the users table migration.
  // We only drop it if it's the last table using it, or manage it more globally.
  // For simplicity here, we won't drop the function itself in this down migration,
  // assuming the users table (or another table) might still be using it.
  // If this were the only table, you might add: pgm.sql(`DROP FUNCTION IF EXISTS trigger_set_timestamp();`);
  pgm.dropTable('communities');
}
