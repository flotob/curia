import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create bookmarks table
  pgm.createTable('bookmarks', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'varchar(255)',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    post_id: {
      type: 'integer',
      notNull: true,
      references: 'posts(id)',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Create indexes for performance
  pgm.createIndex('bookmarks', 'user_id');
  pgm.createIndex('bookmarks', 'post_id');
  pgm.createIndex('bookmarks', 'created_at');

  // Create unique constraint to prevent duplicate bookmarks
  pgm.createConstraint('bookmarks', 'unique_user_post_bookmark', {
    unique: ['user_id', 'post_id'],
  });

  console.log('✅ Created bookmarks table with indexes and constraints');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the bookmarks table (indexes and constraints will be dropped automatically)
  pgm.dropTable('bookmarks');
  
  console.log('✅ Dropped bookmarks table');
}