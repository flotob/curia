import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add logo_url column to communities table
  pgm.addColumn('communities', {
    logo_url: {
      type: 'text',
      notNull: false,
      comment: 'URL to the community logo/avatar image'
    }
  });
  
  console.log('Added logo_url column to communities table');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove logo_url column from communities table
  pgm.dropColumn('communities', 'logo_url');
  
  console.log('Removed logo_url column from communities table');
}
