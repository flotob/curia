import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Update existing telegram_groups notification_settings to include board-specific settings
  // The existing structure is: { enabled: boolean, events: string[], quiet_hours?: {...} }
  // We're extending it to: { enabled: boolean, events: string[], quiet_hours?: {...}, boards?: { [boardId]: { enabled: boolean, events: string[] } } }
  
  // First, let's add a comment to document the new structure
  pgm.sql(`
    COMMENT ON COLUMN telegram_groups.notification_settings IS 
    'JSONB field containing notification preferences. Structure:
    {
      "enabled": boolean,
      "events": string[],
      "quiet_hours": { "start": string, "end": string, "timezone": string },
      "boards": {
        "[boardId]": {
          "enabled": boolean,
          "events": string[]
        }
      }
    }
    When boards field is present, board-specific settings override global settings for that board.
    If boards field is missing or a board is not specified, global settings apply.';
  `);

  // Update any existing records to ensure they have the proper structure
  // This is a data migration to ensure consistency
  pgm.sql(`
    UPDATE telegram_groups 
    SET notification_settings = jsonb_set(
      COALESCE(notification_settings, '{}'::jsonb),
      '{boards}',
      '{}'::jsonb,
      true
    )
    WHERE notification_settings IS NULL 
       OR NOT (notification_settings ? 'boards');
  `);

  // Add an index for performance when querying board-specific settings
  pgm.createIndex('telegram_groups', 'notification_settings', {
    method: 'gin',
    name: 'idx_telegram_groups_notification_settings_gin'
  });

  console.log('Migration completed: Added board-specific settings support to telegram_groups.notification_settings');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the GIN index
  pgm.dropIndex('telegram_groups', 'notification_settings', {
    name: 'idx_telegram_groups_notification_settings_gin'
  });

  // Remove the comment
  pgm.sql(`
    COMMENT ON COLUMN telegram_groups.notification_settings IS NULL;
  `);

  // Remove the boards field from all records (data migration rollback)
  pgm.sql(`
    UPDATE telegram_groups 
    SET notification_settings = notification_settings - 'boards'
    WHERE notification_settings ? 'boards';
  `);

  console.log('Migration rolled back: Removed board-specific settings from telegram_groups.notification_settings');
}
