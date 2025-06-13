import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Starting fix for gating structure and adding required fields...');
  
  // Use a transaction to ensure atomicity
  await pgm.sql(`
    DO $$
    DECLARE
      post_record RECORD;
      updated_settings JSONB;
      fixed_categories JSONB;
      fixed_count INTEGER := 0;
      skipped_count INTEGER := 0;
      error_count INTEGER := 0;
    BEGIN
      -- Process posts that have the faulty gating structure
      FOR post_record IN 
        SELECT id, settings 
        FROM posts 
        WHERE settings->'responsePermissions'->'gating'->'categories' IS NOT NULL
      LOOP
        BEGIN
          -- Check if already in correct format (idempotent check)
          IF post_record.settings->'responsePermissions'->'categories' IS NOT NULL THEN
            RAISE WARNING 'Post ID % already has correct structure - skipping', post_record.id;
            skipped_count := skipped_count + 1;
            CONTINUE;
          END IF;
          
          updated_settings := post_record.settings;
          
          -- Extract categories from the faulty gating wrapper
          fixed_categories := post_record.settings->'responsePermissions'->'gating'->'categories';
          
          -- Add 'enabled: true' to each category if not already present
          SELECT jsonb_agg(
            CASE 
              WHEN category ? 'enabled' THEN category
              ELSE jsonb_set(category, '{enabled}', 'true'::jsonb)
            END
          ) INTO fixed_categories
          FROM jsonb_array_elements(fixed_categories) AS category;
          
          -- Move categories to correct location and add requireAny
          updated_settings := jsonb_set(
            updated_settings,
            '{responsePermissions,categories}',
            fixed_categories,
            true
          );
          
          -- Add requireAny if not already present
          IF NOT (updated_settings->'responsePermissions' ? 'requireAny') THEN
            updated_settings := jsonb_set(
              updated_settings,
              '{responsePermissions,requireAny}',
              'true'::jsonb,
              true
            );
          END IF;
          
          -- Remove the faulty gating wrapper
          updated_settings := updated_settings #- '{responsePermissions,gating}';
          
          -- Update the post
          UPDATE posts 
          SET settings = updated_settings, updated_at = NOW()
          WHERE id = post_record.id;
          
          fixed_count := fixed_count + 1;
          
        EXCEPTION WHEN OTHERS THEN
          -- Log the error but continue with other posts
          RAISE WARNING 'Failed to fix post ID %: %', post_record.id, SQLERRM;
          error_count := error_count + 1;
        END;
      END LOOP;
      
      -- Log the results
      RAISE NOTICE 'Migration completed: % posts fixed, % already correct, % errors', 
                   fixed_count, skipped_count, error_count;
      
      -- Fail the migration if there were any errors
      IF error_count > 0 THEN
        RAISE EXCEPTION 'Migration failed due to % fix errors', error_count;
      END IF;
    END $$;
  `);
  
  console.log('[Migration] Gating structure fix completed successfully');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Rolling back gating structure fix...');
  
  // Use a transaction to ensure atomicity
  await pgm.sql(`
    DO $$
    DECLARE
      post_record RECORD;
      updated_settings JSONB;
      reverted_count INTEGER := 0;
      error_count INTEGER := 0;
    BEGIN
      -- Process posts that have the correct structure (to revert to faulty structure)
      FOR post_record IN 
        SELECT id, settings 
        FROM posts 
        WHERE settings->'responsePermissions'->'categories' IS NOT NULL
          AND settings->'responsePermissions'->'gating' IS NULL
      LOOP
        BEGIN
          updated_settings := post_record.settings;
          
          -- Move categories back to gating wrapper structure
          updated_settings := jsonb_set(
            updated_settings,
            '{responsePermissions,gating}',
            jsonb_build_object(
              'categories', post_record.settings->'responsePermissions'->'categories'
            ),
            true
          );
          
          -- Remove the correct structure fields
          updated_settings := updated_settings #- '{responsePermissions,categories}';
          updated_settings := updated_settings #- '{responsePermissions,requireAny}';
          
          -- Update the post
          UPDATE posts 
          SET settings = updated_settings, updated_at = NOW()
          WHERE id = post_record.id;
          
          reverted_count := reverted_count + 1;
          
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
  
  console.log('[Migration] Gating structure rollback completed successfully');
}
