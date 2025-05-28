/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('votes', {
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
      // Part of composite primary key, defined below
    },
    post_id: {
      type: 'integer',
      notNull: true,
      references: 'posts(id)',
      onDelete: 'CASCADE',
      // Part of composite primary key, defined below
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Composite primary key to ensure one vote per user per post
  pgm.addConstraint('votes', 'votes_pkey', {
    primaryKey: ['user_id', 'post_id'],
  });

  // Optional: Indexes can be useful if you query votes by user_id or post_id separately often,
  // though the composite primary key itself creates an index.
  // pgm.createIndex('votes', 'user_id');
  // pgm.createIndex('votes', 'post_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // No need to explicitly drop the primary key constraint if dropping the table
  pgm.dropTable('votes');
}
