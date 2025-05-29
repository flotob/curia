import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('boards', {
    id: 'id', // SERIAL PRIMARY KEY
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text', notNull: false }, // Or true if a description is always required
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('boards', 'community_id');

  // Trigger for updated_at - assuming you have a trigger function like trigger_set_timestamp()
  // If not, you might need to create one or handle updated_at manually in your app
  pgm.sql(`
    CREATE TRIGGER set_timestamp_boards
    BEFORE UPDATE ON boards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // It's good practice to drop dependent objects first if any, or ensure CASCADE handles it.
  // Drop the trigger first
  pgm.sql('DROP TRIGGER IF EXISTS set_timestamp_boards ON boards;');
  // Drop the table (indexes are typically dropped with the table)
  pgm.dropTable('boards');
}
