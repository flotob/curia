➜  curia2 git:(feature/gating-locks2) ✗ git status
On branch feature/gating-locks2
Your branch is up to date with 'origin/feature/gating-locks2'.

Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        deleted:    migrations/1749833906743_add-lock-id-to-posts.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        docs/migration-logs.md

no changes added to commit (use "git add" and/or "git commit -a")
➜  curia2 git:(feature/gating-locks2) ✗ DATABASE_URL=postgresql://postgres:NdsWCKWHJymjMDgSsaeZyNWqLmhMkYGO@crossover.proxy.rlwy.net:42592/railway yarn migrate:up
yarn run v1.22.22
$ yarn migrate:compile
$ rimraf dist/migrations && tsc -p tsconfig.migrations.json
$ node-pg-migrate up -m dist/migrations
> Migrating files:
> - 1749403741062_convert-gating-to-categories
> - 1749574119852_create-pre-verifications-table
> - 1749827915923_fix-gating-structure-and-add-required-fields
> - 1749832297873_create-locks-table
> - 1749833928574_create-lock-stats-view
> - 1749835459893_convert-existing-gating-to-locks
> - 1750089638772_add-board-lock-gating-support
> - 1750312589348_add-lock-id-to-board-verifications
[Migration] Starting conversion of gating settings to category format...
[Migration] Gating settings conversion completed successfully
### MIGRATION 1749403741062_convert-gating-to-categories (UP) ###

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
  ;
INSERT INTO "public"."pgmigrations" (name, run_on) VALUES ('1749403741062_convert-gating-to-categories', NOW());


[Migration] Creating pre_verifications table for slot-based verification system...
[Migration] pre_verifications table created successfully
### MIGRATION 1749574119852_create-pre-verifications-table (UP) ###
CREATE TABLE "pre_verifications" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL,
  "post_id" integer NOT NULL,
  "category_type" text NOT NULL,
  "verification_data" jsonb NOT NULL,
  "verification_status" text DEFAULT $pga$pending$pga$ NOT NULL,
  "verified_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);
COMMENT ON COLUMN "pre_verifications"."category_type" IS $pga$Type of gating category: ethereum_profile, universal_profile, etc.$pga$;
COMMENT ON COLUMN "pre_verifications"."verification_data" IS $pga$JSON containing signature, challenge, and verified requirement details$pga$;
COMMENT ON COLUMN "pre_verifications"."verification_status" IS $pga$Status: pending (submitted), verified (backend confirmed), expired (timed out)$pga$;
COMMENT ON COLUMN "pre_verifications"."expires_at" IS $pga$Verification expires 30 minutes after creation for security$pga$;
COMMENT ON TABLE "pre_verifications" IS $pga$Stores pre-verification states for slot-based gating system$pga$;
ALTER TABLE "pre_verifications"
  ADD CONSTRAINT "pre_verifications_unique_user_post_category" UNIQUE ("user_id", "post_id", "category_type");
ALTER TABLE "pre_verifications"
  ADD CONSTRAINT "pre_verifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE "pre_verifications"
  ADD CONSTRAINT "pre_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES users(user_id) ON DELETE CASCADE;
CREATE INDEX "pre_verifications_user_id_index" ON "pre_verifications" ("user_id");
CREATE INDEX "pre_verifications_post_id_index" ON "pre_verifications" ("post_id");
CREATE INDEX "pre_verifications_status_index" ON "pre_verifications" ("verification_status");
CREATE INDEX "pre_verifications_expires_at_index" ON "pre_verifications" ("expires_at");

    CREATE TRIGGER "set_timestamp_pre_verifications" 
      BEFORE UPDATE ON "pre_verifications" 
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  ;
INSERT INTO "public"."pgmigrations" (name, run_on) VALUES ('1749574119852_create-pre-verifications-table', NOW());


[Migration] Starting fix for gating structure and adding required fields...
[Migration] Gating structure fix completed successfully
### MIGRATION 1749827915923_fix-gating-structure-and-add-required-fields (UP) ###

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
  ;
INSERT INTO "public"."pgmigrations" (name, run_on) VALUES ('1749827915923_fix-gating-structure-and-add-required-fields', NOW());


[Migration] Creating locks table and related infrastructure...
[Migration] Locks table infrastructure created successfully
### MIGRATION 1749832297873_create-locks-table (UP) ###
CREATE TABLE "locks" (
  "id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  "name" varchar(255) NOT NULL,
  "description" text,
  "icon" varchar(50),
  "color" varchar(20),
  "gating_config" jsonb NOT NULL,
  "creator_user_id" text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  "community_id" text NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  "is_template" boolean DEFAULT false NOT NULL,
  "is_public" boolean DEFAULT false NOT NULL,
  "tags" text[] DEFAULT $pga${}$pga$ NOT NULL,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "success_rate" real DEFAULT 0 NOT NULL,
  "avg_verification_time" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);
COMMENT ON COLUMN "locks"."icon" IS $pga$Emoji or icon identifier for visual display$pga$;
COMMENT ON COLUMN "locks"."color" IS $pga$Brand color hex code for UI theming$pga$;
COMMENT ON COLUMN "locks"."gating_config" IS $pga$Complete gating configuration in same format as posts.settings.responsePermissions$pga$;
COMMENT ON COLUMN "locks"."community_id" IS $pga$Scope locks to specific communities$pga$;
COMMENT ON COLUMN "locks"."is_template" IS $pga$True for curated community templates$pga$;
COMMENT ON COLUMN "locks"."is_public" IS $pga$True if shareable within community$pga$;
COMMENT ON COLUMN "locks"."tags" IS $pga$Tags for categorization and search$pga$;
COMMENT ON COLUMN "locks"."usage_count" IS $pga$Number of times this lock has been applied to posts$pga$;
COMMENT ON COLUMN "locks"."success_rate" IS $pga$Percentage of users who successfully pass verification (0-1)$pga$;
COMMENT ON COLUMN "locks"."avg_verification_time" IS $pga$Average time in seconds for users to complete verification$pga$;
CREATE INDEX "idx_locks_community" ON "locks" ("community_id");
CREATE INDEX "idx_locks_creator" ON "locks" ("creator_user_id");
CREATE INDEX "idx_locks_public" ON "locks" ("is_public") WHERE is_public = true;
CREATE INDEX "idx_locks_templates" ON "locks" ("is_template") WHERE is_template = true;
CREATE INDEX "idx_locks_tags" ON "locks" USING gin ("tags");
CREATE INDEX "idx_locks_gating_config" ON "locks" USING gin ("gating_config");
CREATE UNIQUE INDEX "idx_locks_community_name" ON "locks" ("community_id", "name");
CREATE INDEX "idx_locks_popular" ON "locks" ("usage_count", "created_at");
ALTER TABLE "posts"
  ADD "lock_id" integer REFERENCES locks(id) ON DELETE SET NULL;
COMMENT ON COLUMN "posts"."lock_id" IS $pga$Optional reference to the lock used for this post gating$pga$;
CREATE INDEX "idx_posts_lock_id" ON "posts" ("lock_id");

    CREATE TRIGGER "set_timestamp_locks" 
    BEFORE UPDATE ON "public"."locks" 
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  ;
CREATE VIEW "lock_stats" AS 
    SELECT 
      l.id,
      l.name,
      l.community_id,
      l.creator_user_id,
      l.is_template,
      l.is_public,
      l.usage_count,
      l.success_rate,
      l.avg_verification_time,
      COUNT(p.id) as posts_using_lock,
      l.created_at,
      l.updated_at
    FROM locks l
    LEFT JOIN posts p ON p.lock_id = l.id
    GROUP BY l.id
  ;
INSERT INTO "public"."pgmigrations" (name, run_on) VALUES ('1749832297873_create-locks-table', NOW());


[Migration] Creating lock_stats view...
[Migration] Successfully created lock_stats view
### MIGRATION 1749833928574_create-lock-stats-view (UP) ###
CREATE VIEW "lock_stats" AS 
    SELECT 
      l.id,
      l.name,
      l.community_id,
      COUNT(p.id) as posts_using_lock,
      COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as posts_last_30_days,
      COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as posts_last_7_days,
      CASE 
        WHEN COUNT(p.id) = 0 THEN 0
        ELSE ROUND(COUNT(p.id)::numeric / NULLIF(l.usage_count, 0), 2)
      END as utilization_rate,
      MAX(p.created_at) as last_used_at,
      l.created_at as lock_created_at,
      l.updated_at as lock_updated_at
    FROM locks l
    LEFT JOIN posts p ON l.id = p.lock_id
    GROUP BY l.id, l.name, l.community_id, l.usage_count, l.created_at, l.updated_at
  ;
INSERT INTO "public"."pgmigrations" (name, run_on) VALUES ('1749833928574_create-lock-stats-view', NOW());


Error executing:
CREATE VIEW "lock_stats" AS 
    SELECT 
      l.id,
      l.name,
      l.community_id,
      COUNT(p.id) as posts_using_lock,
      COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as posts_last_30_days,
      COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as posts_last_7_days,
      CASE 
        WHEN COUNT(p.id) = 0 THEN 0
        ELSE ROUND(COUNT(p.id)::numeric / NULLIF(l.usage_count, 0), 2)
      END as utilization_rate,
      MAX(p.created_at) as last_used_at,
      l.created_at as lock_created_at,
      l.updated_at as lock_updated_at
    FROM locks l
    LEFT JOIN posts p ON l.id = p.lock_id
    GROUP BY l.id, l.name, l.community_id, l.usage_count, l.created_at, l.updated_at
  ;
error: relation "lock_stats" already exists

> Rolling back attempted migration ...
error: relation "lock_stats" already exists
    at /Users/florian/Git/curia2/node_modules/pg/lib/client.js:545:17
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Object.query (file:///Users/florian/Git/curia2/node_modules/node-pg-migrate/dist/index.js:3498:14)
    at async runner (file:///Users/florian/Git/curia2/node_modules/node-pg-migrate/dist/index.js:3805:9) {
  length: 104,
  severity: 'ERROR',
  code: '42P07',
  detail: undefined,
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'heap.c',
  line: '1149',
  routine: 'heap_create_with_catalog'
}
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
➜  curia2 git:(feature/gating-locks2) ✗ 