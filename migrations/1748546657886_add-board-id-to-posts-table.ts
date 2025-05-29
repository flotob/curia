import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('posts', {
    board_id: {
      type: 'integer',
      notNull: true, // If you have existing posts, you might need to make this false initially, 
                     // backfill, then add a new migration to set notNull: true.
      references: 'boards(id)',
      onDelete: 'CASCADE', // Or 'SET NULL' or 'RESTRICT' depending on desired behavior
    },
  });

  pgm.createIndex('posts', 'board_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // If an index was created, it's good practice to drop it if pgm.dropColumn doesn't automatically do so
  // However, pgm.dropIndexIfExists might be safer or pgm.dropIndex if you are sure it exists.
  // For simplicity, node-pg-migrate often handles index cleanup with column drops if it created it implicitly via FKs sometimes.
  // Check documentation if specific index drop is needed before column drop for your version.
  // pgm.dropIndex('posts', 'board_id'); // Uncomment if needed
  
  pgm.dropColumn('posts', 'board_id');
}
