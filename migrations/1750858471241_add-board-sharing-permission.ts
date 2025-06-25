import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add allowBoardSharing permission to all existing partnerships
  // Update source_to_target_permissions to include allowBoardSharing: false
  pgm.sql(`
    UPDATE community_partnerships 
    SET source_to_target_permissions = 
      COALESCE(source_to_target_permissions, '{}'::jsonb) || 
      '{"allowBoardSharing": false}'::jsonb
    WHERE source_to_target_permissions IS NULL 
       OR NOT source_to_target_permissions ? 'allowBoardSharing'
  `);

  // Update target_to_source_permissions to include allowBoardSharing: false  
  pgm.sql(`
    UPDATE community_partnerships 
    SET target_to_source_permissions = 
      COALESCE(target_to_source_permissions, '{}'::jsonb) || 
      '{"allowBoardSharing": false}'::jsonb
    WHERE target_to_source_permissions IS NULL 
       OR NOT target_to_source_permissions ? 'allowBoardSharing'
  `);

  // Add a comment to document the new permission
  pgm.sql(`
    COMMENT ON COLUMN community_partnerships.source_to_target_permissions IS 
    'Permissions that source community grants to target community. Includes: allowPresenceSharing, allowCrossCommunitySearch, allowCrossCommunityNavigation, allowCrossCommunityNotifications, allowBoardSharing'
  `);

  pgm.sql(`
    COMMENT ON COLUMN community_partnerships.target_to_source_permissions IS 
    'Permissions that target community grants to source community. Includes: allowPresenceSharing, allowCrossCommunitySearch, allowCrossCommunityNavigation, allowCrossCommunityNotifications, allowBoardSharing'
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove allowBoardSharing permission from source_to_target_permissions
  pgm.sql(`
    UPDATE community_partnerships 
    SET source_to_target_permissions = source_to_target_permissions - 'allowBoardSharing'
    WHERE source_to_target_permissions ? 'allowBoardSharing'
  `);

  // Remove allowBoardSharing permission from target_to_source_permissions
  pgm.sql(`
    UPDATE community_partnerships 
    SET target_to_source_permissions = target_to_source_permissions - 'allowBoardSharing'
    WHERE target_to_source_permissions ? 'allowBoardSharing'
  `);

  // Restore original comments
  pgm.sql(`
    COMMENT ON COLUMN community_partnerships.source_to_target_permissions IS 
    'Permissions that source community grants to target community'
  `);

  pgm.sql(`
    COMMENT ON COLUMN community_partnerships.target_to_source_permissions IS 
    'Permissions that target community grants to source community'
  `);
}
