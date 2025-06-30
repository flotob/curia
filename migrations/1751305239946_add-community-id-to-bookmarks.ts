import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add community_id column to bookmarks table for query optimization
  pgm.addColumn('bookmarks', {
    community_id: {
      type: 'text',
      notNull: false, // Initially nullable for backfill
      references: 'communities(id)',
      onDelete: 'CASCADE',
    },
  });

  // Backfill existing bookmarks with community_id from posts→boards→communities
  pgm.sql(`
    UPDATE bookmarks 
    SET community_id = boards.community_id
    FROM posts, boards 
    WHERE bookmarks.post_id = posts.id 
    AND posts.board_id = boards.id;
  `);

  // Now make community_id NOT NULL since all rows are backfilled
  pgm.alterColumn('bookmarks', 'community_id', {
    notNull: true,
  });

  // Add performance indexes
  pgm.createIndex('bookmarks', ['community_id'], { 
    name: 'bookmarks_community_id_index' 
  });
  
  // Composite index for common "user bookmarks in community" queries
  pgm.createIndex('bookmarks', ['user_id', 'community_id'], { 
    name: 'bookmarks_user_community_index' 
  });

  // Update unique constraint to include community_id for extra safety
  // (though technically redundant since post_id implies community)
  pgm.dropConstraint('bookmarks', 'bookmarks_user_post_unique');
  pgm.addConstraint('bookmarks', 'bookmarks_user_post_unique', {
    unique: ['user_id', 'post_id'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the community_id column and associated indexes
  pgm.dropIndex('bookmarks', ['community_id'], { 
    name: 'bookmarks_community_id_index' 
  });
  pgm.dropIndex('bookmarks', ['user_id', 'community_id'], { 
    name: 'bookmarks_user_community_index' 
  });
  pgm.dropColumn('bookmarks', 'community_id');
}
