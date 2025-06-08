import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Starting conversion of gating settings to category format...');
  
  // Use a transaction to ensure atomicity
  await pgm.sql(`
    DO $$
    DECLARE
      post_record RECORD;
      updated_settings JSONB;
      converted_count INTEGER := 0;
      error_count INTEGER := 0;
    BEGIN
      -- Process all posts that have upGating settings
      FOR post_record IN 
        SELECT id, settings 
        FROM posts 
        WHERE settings->'responsePermissions'->'upGating' IS NOT NULL
      LOOP
        BEGIN
          -- Convert the old format to new category format
          updated_settings := post_record.settings;
          
          -- Create the new gating structure
          updated_settings := jsonb_set(
            updated_settings,
            '{responsePermissions,gating}',
            jsonb_build_object(
              'categories', 
              jsonb_build_array(
                jsonb_build_object(
                  'type', 'universal_profile',
                  'requirements', post_record.settings->'responsePermissions'->'upGating'->'requirements'
                )
              )
            ),
            true
          );
          
          -- Remove the old upGating field
          updated_settings := updated_settings #- '{responsePermissions,upGating}';
          
          -- Update the post with new settings
          UPDATE posts 
          SET settings = updated_settings, updated_at = NOW()
          WHERE id = post_record.id;
          
          converted_count := converted_count + 1;
          
        EXCEPTION WHEN OTHERS THEN
          -- Log the error but continue with other posts
          RAISE WARNING 'Failed to convert post ID %: %', post_record.id, SQLERRM;
          error_count := error_count + 1;
        END;
      END LOOP;
      
      -- Log the results
      RAISE NOTICE 'Migration completed: % posts converted, % errors', converted_count, error_count;
      
      -- Fail the migration if there were any errors
      IF error_count > 0 THEN
        RAISE EXCEPTION 'Migration failed due to % conversion errors', error_count;
      END IF;
    END $$;
  `);
  
  console.log('[Migration] Gating settings conversion completed successfully');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Rolling back gating settings to upGating format...');
  
  // Use a transaction to ensure atomicity
  await pgm.sql(`
    DO $$
    DECLARE
      post_record RECORD;
      updated_settings JSONB;
      up_category JSONB;
      reverted_count INTEGER := 0;
      error_count INTEGER := 0;
    BEGIN
      -- Process all posts that have the new category format
      FOR post_record IN 
        SELECT id, settings 
        FROM posts 
        WHERE settings->'responsePermissions'->'gating'->'categories' IS NOT NULL
      LOOP
        BEGIN
          -- Find the universal_profile category
          SELECT category INTO up_category
          FROM jsonb_array_elements(post_record.settings->'responsePermissions'->'gating'->'categories') AS category
          WHERE category->>'type' = 'universal_profile'
          LIMIT 1;
          
          -- Only proceed if we found a universal_profile category
          IF up_category IS NOT NULL THEN
            updated_settings := post_record.settings;
            
            -- Create the old upGating structure
            updated_settings := jsonb_set(
              updated_settings,
              '{responsePermissions,upGating}',
              jsonb_build_object(
                'requirements', up_category->'requirements'
              ),
              true
            );
            
            -- Remove the new gating field
            updated_settings := updated_settings #- '{responsePermissions,gating}';
            
            -- Update the post with reverted settings
            UPDATE posts 
            SET settings = updated_settings, updated_at = NOW()
            WHERE id = post_record.id;
            
            reverted_count := reverted_count + 1;
          ELSE
            -- Post has gating categories but no universal_profile - skip it
            RAISE WARNING 'Post ID % has gating categories but no universal_profile category - skipping', post_record.id;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          -- Log the error but continue with other posts
          RAISE WARNING 'Failed to revert post ID %: %', post_record.id, SQLERRM;
          error_count := error_count + 1;
        END;
      END LOOP;
      
      -- Log the results
      RAISE NOTICE 'Rollback completed: % posts reverted, % errors', reverted_count, error_count;
      
      -- Fail the rollback if there were any errors
      IF error_count > 0 THEN
        RAISE EXCEPTION 'Rollback failed due to % reversion errors', error_count;
      END IF;
    END $$;
  `);
  
  console.log('[Migration] Gating settings rollback completed successfully');
}
