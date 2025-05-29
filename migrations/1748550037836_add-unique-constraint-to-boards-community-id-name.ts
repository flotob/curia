import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

const CONSTRAINT_NAME = 'boards_community_id_name_key';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addConstraint('boards', CONSTRAINT_NAME, {
    unique: ['community_id', 'name'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('boards', CONSTRAINT_NAME);
}
