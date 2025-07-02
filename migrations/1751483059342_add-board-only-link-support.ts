import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('Adding support for board-only links...');
  
  // 1. Drop the existing foreign key constraint for post_id
  pgm.dropConstraint('links', 'links_post_id_fkey');
  
  // 2. Make post_id nullable (for board-only links)
  pgm.alterColumn('links', 'post_id', {
    type: 'integer',
    notNull: false,
    comment: 'ID of the target post (null for board-only links)'
  });
  
  // 3. Add comment_id field for comment-specific links
  pgm.addColumn('links', {
    comment_id: {
      type: 'integer',
      references: 'comments(id)',
      onDelete: 'CASCADE',
      comment: 'ID of the target comment (null for post-only or board-only links)'
    }
  });
  
  // 4. Make post_title nullable (for board-only links)
  pgm.alterColumn('links', 'post_title', {
    type: 'varchar(500)',
    notNull: false,
    comment: 'Original post title for regenerating URLs (null for board-only links)'
  });
  
  // 4. Re-add the foreign key constraint with proper null handling
  pgm.addConstraint('links', 'links_post_id_fkey', {
    foreignKeys: {
      columns: 'post_id',
      references: 'posts(id)',
      onDelete: 'CASCADE'
    }
  });
  
  // 5. Update the unique constraint to handle board-only vs post-specific links
  // Drop the existing unique constraint
  pgm.dropConstraint('links', 'links_unique_path');
  
  // Create separate unique constraints:
  // - For post links: community_short_id + board_slug + slug (when post_id is not null)
  // - For board links: community_short_id + board_slug (when post_id is null and slug is 'board')
  
  // Unique constraint for post-specific links
  pgm.addIndex('links', ['community_short_id', 'board_slug', 'slug'], {
    unique: true,
    name: 'links_unique_post_path',
    where: 'post_id IS NOT NULL'
  });
  
  // Unique constraint for board-only links  
  pgm.addIndex('links', ['community_short_id', 'board_slug'], {
    unique: true,
    name: 'links_unique_board_path',
    where: 'post_id IS NULL'
  });
  
  console.log('Board-only link support added successfully');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('Removing board-only link support...');
  
  // 1. Drop the new unique constraints
  pgm.dropIndex('links', ['community_short_id', 'board_slug', 'slug'], {
    name: 'links_unique_post_path'
  });
  
  pgm.dropIndex('links', ['community_short_id', 'board_slug'], {
    name: 'links_unique_board_path'
  });
  
  // 2. Re-add the original unique constraint (this will fail if there are board-only links)
  pgm.addIndex('links', ['community_short_id', 'board_slug', 'slug'], {
    unique: true,
    name: 'links_unique_path'
  });
  
  // 3. Drop foreign key constraint
  pgm.dropConstraint('links', 'links_post_id_fkey');
  
  // 4. Drop comment_id field
  pgm.dropColumn('links', 'comment_id');
  
  // 5. Make post_title not null again
  pgm.alterColumn('links', 'post_title', {
    type: 'varchar(500)',
    notNull: true,
    comment: 'Original post title for regenerating URLs'
  });
  
  // 6. Make post_id not null again (this will fail if there are board-only links)
  pgm.alterColumn('links', 'post_id', {
    type: 'integer',
    notNull: true,
    comment: 'ID of the target post'
  });
  
  // 7. Re-add the foreign key constraint
  pgm.addConstraint('links', 'links_post_id_fkey', {
    foreignKeys: {
      columns: 'post_id',
      references: 'posts(id)',
      onDelete: 'CASCADE'
    }
  });
  
  console.log('Board-only link support removed');
}
