-- Adminer 5.2.1 PostgreSQL 17.5 dump

DROP FUNCTION IF EXISTS "armor";;
CREATE FUNCTION "armor" () RETURNS text LANGUAGE c AS 'pg_armor';

DROP FUNCTION IF EXISTS "armor";;
CREATE FUNCTION "armor" () RETURNS text LANGUAGE c AS 'pg_armor';

DROP FUNCTION IF EXISTS "crypt";;
CREATE FUNCTION "crypt" () RETURNS text LANGUAGE c AS 'pg_crypt';

DROP FUNCTION IF EXISTS "dearmor";;
CREATE FUNCTION "dearmor" () RETURNS bytea LANGUAGE c AS 'pg_dearmor';

DROP FUNCTION IF EXISTS "decrypt";;
CREATE FUNCTION "decrypt" () RETURNS bytea LANGUAGE c AS 'pg_decrypt';

DROP FUNCTION IF EXISTS "decrypt_iv";;
CREATE FUNCTION "decrypt_iv" () RETURNS bytea LANGUAGE c AS 'pg_decrypt_iv';

DROP FUNCTION IF EXISTS "digest";;
CREATE FUNCTION "digest" () RETURNS bytea LANGUAGE c AS 'pg_digest';

DROP FUNCTION IF EXISTS "digest";;
CREATE FUNCTION "digest" () RETURNS bytea LANGUAGE c AS 'pg_digest';

DROP FUNCTION IF EXISTS "encrypt";;
CREATE FUNCTION "encrypt" () RETURNS bytea LANGUAGE c AS 'pg_encrypt';

DROP FUNCTION IF EXISTS "encrypt_iv";;
CREATE FUNCTION "encrypt_iv" () RETURNS bytea LANGUAGE c AS 'pg_encrypt_iv';

DROP FUNCTION IF EXISTS "gen_random_bytes";;
CREATE FUNCTION "gen_random_bytes" () RETURNS bytea LANGUAGE c AS 'pg_random_bytes';

DROP FUNCTION IF EXISTS "gen_random_uuid";;
CREATE FUNCTION "gen_random_uuid" () RETURNS uuid LANGUAGE c AS 'pg_random_uuid';

DROP FUNCTION IF EXISTS "gen_salt";;
CREATE FUNCTION "gen_salt" () RETURNS text LANGUAGE c AS 'pg_gen_salt';

DROP FUNCTION IF EXISTS "gen_salt";;
CREATE FUNCTION "gen_salt" () RETURNS text LANGUAGE c AS 'pg_gen_salt_rounds';

DROP FUNCTION IF EXISTS "generate_lock_metadata";;
CREATE FUNCTION "generate_lock_metadata" (IN "config" jsonb, OUT "name" text, OUT "description" text) RETURNS record LANGUAGE plpgsql AS '
    DECLARE
      categories JSONB;
      category JSONB;
      category_type TEXT;
      requirements JSONB;
      name_parts TEXT[] := ARRAY[]::TEXT[];
      desc_parts TEXT[] := ARRAY[]::TEXT[];
      final_name TEXT;
      final_description TEXT;
      
      -- UP-specific variables
      min_lyx_balance TEXT;
      required_tokens JSONB;
      follower_requirements JSONB;
      token_count INTEGER;
      follower_count INTEGER;
      
      -- Ethereum-specific variables
      requires_ens BOOLEAN;
      min_eth_balance TEXT;
      efp_requirements JSONB;
      erc20_tokens JSONB;
      erc721_collections JSONB;
    BEGIN
      categories := config->''categories'';
      
      -- Process each category
      FOR category IN SELECT jsonb_array_elements(categories)
      LOOP
        category_type := category->>''type'';
        requirements := category->''requirements'';
        
        IF category_type = ''universal_profile'' THEN
          -- Handle Universal Profile requirements
          min_lyx_balance := requirements->>''minLyxBalance'';
          required_tokens := requirements->''requiredTokens'';
          follower_requirements := requirements->''followerRequirements'';
          
          -- LYX balance requirement
          IF min_lyx_balance IS NOT NULL AND min_lyx_balance != ''0'' THEN
            name_parts := name_parts || ARRAY[''LYX''];
            desc_parts := desc_parts || ARRAY[''Minimum LYX required''];
          END IF;
          
          -- Token requirements
          IF required_tokens IS NOT NULL THEN
            token_count := jsonb_array_length(required_tokens);
            IF token_count > 0 THEN
              name_parts := name_parts || ARRAY[''Token''];
              desc_parts := desc_parts || ARRAY[''LUKSO tokens required''];
            END IF;
          END IF;
          
          -- Follower requirements
          IF follower_requirements IS NOT NULL THEN
            follower_count := jsonb_array_length(follower_requirements);
            IF follower_count > 0 THEN
              name_parts := name_parts || ARRAY[''Social''];
              desc_parts := desc_parts || ARRAY[''Social requirements''];
            END IF;
          END IF;
          
        ELSIF category_type = ''ethereum_profile'' THEN
          -- Handle Ethereum Profile requirements
          requires_ens := (requirements->>''requiresENS'')::BOOLEAN;
          min_eth_balance := requirements->>''minimumETHBalance'';
          efp_requirements := requirements->''efpRequirements'';
          erc20_tokens := requirements->''requiredERC20Tokens'';
          erc721_collections := requirements->''requiredERC721Collections'';
          
          -- ENS requirement
          IF requires_ens THEN
            name_parts := name_parts || ARRAY[''ENS''];
            desc_parts := desc_parts || ARRAY[''ENS domain required''];
          END IF;
          
          -- ETH balance requirement
          IF min_eth_balance IS NOT NULL AND min_eth_balance != ''0'' THEN
            name_parts := name_parts || ARRAY[''ETH''];
            desc_parts := desc_parts || ARRAY[''Minimum ETH required''];
          END IF;
          
          -- ERC20 tokens
          IF erc20_tokens IS NOT NULL AND jsonb_array_length(erc20_tokens) > 0 THEN
            name_parts := name_parts || ARRAY[''Token''];
            desc_parts := desc_parts || ARRAY[''Ethereum tokens required''];
          END IF;
          
          -- NFT collections
          IF erc721_collections IS NOT NULL AND jsonb_array_length(erc721_collections) > 0 THEN
            name_parts := name_parts || ARRAY[''NFT''];
            desc_parts := desc_parts || ARRAY[''NFT ownership required''];
          END IF;
          
          -- EFP social requirements
          IF efp_requirements IS NOT NULL AND jsonb_array_length(efp_requirements) > 0 THEN
            name_parts := name_parts || ARRAY[''Social''];
            desc_parts := desc_parts || ARRAY[''EFP requirements''];
          END IF;
        END IF;
      END LOOP;
      
      -- Generate final name (keep it concise)
      IF array_length(name_parts, 1) = 0 THEN
        final_name := ''Custom Gate'';
      ELSIF array_length(name_parts, 1) = 1 THEN
        final_name := name_parts[1] || '' Gate'';
      ELSIF array_length(name_parts, 1) = 2 THEN
        final_name := array_to_string(name_parts, '' + '') || '' Gate'';
      ELSE
        final_name := name_parts[1] || '' + '' || name_parts[2] || '' +'' || (array_length(name_parts, 1) - 2) || '' Gate'';
      END IF;
      
      -- Generate final description
      IF array_length(desc_parts, 1) = 0 THEN
        final_description := ''Migrated gating configuration'';
      ELSE
        final_description := array_to_string(desc_parts, ''; '');
        IF length(final_description) > 250 THEN
          final_description := substring(final_description, 1, 247) || ''...'';
        END IF;
      END IF;
      
      -- Ensure name fits within VARCHAR(255) limit
      IF length(final_name) > 200 THEN
        final_name := substring(final_name, 1, 197) || ''...'';
      END IF;
      
      name := final_name;
      description := final_description;
      RETURN NEXT;
    END ';

DROP FUNCTION IF EXISTS "hmac";;
CREATE FUNCTION "hmac" () RETURNS bytea LANGUAGE c AS 'pg_hmac';

DROP FUNCTION IF EXISTS "hmac";;
CREATE FUNCTION "hmac" () RETURNS bytea LANGUAGE c AS 'pg_hmac';

DROP FUNCTION IF EXISTS "pgp_armor_headers";;
CREATE FUNCTION "pgp_armor_headers" (OUT "key" text, OUT "value" text) RETURNS record LANGUAGE c AS 'pgp_armor_headers';

DROP FUNCTION IF EXISTS "pgp_key_id";;
CREATE FUNCTION "pgp_key_id" () RETURNS text LANGUAGE c AS 'pgp_key_id_w';

DROP FUNCTION IF EXISTS "pgp_pub_decrypt";;
CREATE FUNCTION "pgp_pub_decrypt" () RETURNS text LANGUAGE c AS 'pgp_pub_decrypt_text';

DROP FUNCTION IF EXISTS "pgp_pub_decrypt";;
CREATE FUNCTION "pgp_pub_decrypt" () RETURNS text LANGUAGE c AS 'pgp_pub_decrypt_text';

DROP FUNCTION IF EXISTS "pgp_pub_decrypt";;
CREATE FUNCTION "pgp_pub_decrypt" () RETURNS text LANGUAGE c AS 'pgp_pub_decrypt_text';

DROP FUNCTION IF EXISTS "pgp_pub_decrypt_bytea";;
CREATE FUNCTION "pgp_pub_decrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_pub_decrypt_bytea';

DROP FUNCTION IF EXISTS "pgp_pub_decrypt_bytea";;
CREATE FUNCTION "pgp_pub_decrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_pub_decrypt_bytea';

DROP FUNCTION IF EXISTS "pgp_pub_decrypt_bytea";;
CREATE FUNCTION "pgp_pub_decrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_pub_decrypt_bytea';

DROP FUNCTION IF EXISTS "pgp_pub_encrypt";;
CREATE FUNCTION "pgp_pub_encrypt" () RETURNS bytea LANGUAGE c AS 'pgp_pub_encrypt_text';

DROP FUNCTION IF EXISTS "pgp_pub_encrypt";;
CREATE FUNCTION "pgp_pub_encrypt" () RETURNS bytea LANGUAGE c AS 'pgp_pub_encrypt_text';

DROP FUNCTION IF EXISTS "pgp_pub_encrypt_bytea";;
CREATE FUNCTION "pgp_pub_encrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_pub_encrypt_bytea';

DROP FUNCTION IF EXISTS "pgp_pub_encrypt_bytea";;
CREATE FUNCTION "pgp_pub_encrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_pub_encrypt_bytea';

DROP FUNCTION IF EXISTS "pgp_sym_decrypt";;
CREATE FUNCTION "pgp_sym_decrypt" () RETURNS text LANGUAGE c AS 'pgp_sym_decrypt_text';

DROP FUNCTION IF EXISTS "pgp_sym_decrypt";;
CREATE FUNCTION "pgp_sym_decrypt" () RETURNS text LANGUAGE c AS 'pgp_sym_decrypt_text';

DROP FUNCTION IF EXISTS "pgp_sym_decrypt_bytea";;
CREATE FUNCTION "pgp_sym_decrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_sym_decrypt_bytea';

DROP FUNCTION IF EXISTS "pgp_sym_decrypt_bytea";;
CREATE FUNCTION "pgp_sym_decrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_sym_decrypt_bytea';

DROP FUNCTION IF EXISTS "pgp_sym_encrypt";;
CREATE FUNCTION "pgp_sym_encrypt" () RETURNS bytea LANGUAGE c AS 'pgp_sym_encrypt_text';

DROP FUNCTION IF EXISTS "pgp_sym_encrypt";;
CREATE FUNCTION "pgp_sym_encrypt" () RETURNS bytea LANGUAGE c AS 'pgp_sym_encrypt_text';

DROP FUNCTION IF EXISTS "pgp_sym_encrypt_bytea";;
CREATE FUNCTION "pgp_sym_encrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_sym_encrypt_bytea';

DROP FUNCTION IF EXISTS "pgp_sym_encrypt_bytea";;
CREATE FUNCTION "pgp_sym_encrypt_bytea" () RETURNS bytea LANGUAGE c AS 'pgp_sym_encrypt_bytea';

DROP FUNCTION IF EXISTS "trigger_set_timestamp";;
CREATE FUNCTION "trigger_set_timestamp" () RETURNS trigger LANGUAGE plpgsql AS '
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    ';

DROP TABLE IF EXISTS "boards";
DROP SEQUENCE IF EXISTS boards_id_seq;
CREATE SEQUENCE boards_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."boards" (
    "id" integer DEFAULT nextval('boards_id_seq') NOT NULL,
    "community_id" text NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" text,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "settings" jsonb DEFAULT '{}' NOT NULL,
    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX boards_community_id_index ON public.boards USING btree (community_id);

CREATE UNIQUE INDEX boards_community_id_name_key ON public.boards USING btree (community_id, name);

CREATE INDEX boards_settings_index ON public.boards USING gin (settings);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_boards" BEFORE UPDATE ON "public"."boards" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "comments";
DROP SEQUENCE IF EXISTS comments_id_seq;
CREATE SEQUENCE comments_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."comments" (
    "id" integer DEFAULT nextval('comments_id_seq') NOT NULL,
    "post_id" integer NOT NULL,
    "author_user_id" text NOT NULL,
    "parent_comment_id" integer,
    "content" text NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX comments_post_id_index ON public.comments USING btree (post_id);

CREATE INDEX comments_author_user_id_index ON public.comments USING btree (author_user_id);

CREATE INDEX comments_parent_comment_id_index ON public.comments USING btree (parent_comment_id);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_comments" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "communities";
CREATE TABLE "public"."communities" (
    "id" text NOT NULL,
    "name" text NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "settings" jsonb DEFAULT '{}' NOT NULL,
    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX communities_settings_index ON public.communities USING gin (settings);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_communities" BEFORE UPDATE ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "links";
DROP SEQUENCE IF EXISTS links_id_seq;
CREATE SEQUENCE links_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."links" (
    "id" integer DEFAULT nextval('links_id_seq') NOT NULL,
    "slug" character varying(255) NOT NULL,
    "community_short_id" character varying(100) NOT NULL,
    "board_slug" character varying(255) NOT NULL,
    "post_id" integer NOT NULL,
    "board_id" integer NOT NULL,
    "plugin_id" character varying(255) NOT NULL,
    "share_token" character varying(255) NOT NULL,
    "shared_by_user_id" character varying(255),
    "share_source" character varying(100),
    "post_title" character varying(500) NOT NULL,
    "board_name" character varying(255) NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expires_at" timestamptz,
    "last_accessed_at" timestamptz,
    "access_count" integer DEFAULT '0' NOT NULL,
    "community_shortid_history" text[] DEFAULT '{}' NOT NULL,
    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

COMMENT ON COLUMN "public"."links"."slug" IS 'URL-safe post title slug (e.g., "introducing-new-governance-proposal")';

COMMENT ON COLUMN "public"."links"."community_short_id" IS 'Community identifier (e.g., "commonground")';

COMMENT ON COLUMN "public"."links"."board_slug" IS 'URL-safe board name slug (e.g., "general-discussion")';

COMMENT ON COLUMN "public"."links"."post_id" IS 'ID of the target post';

COMMENT ON COLUMN "public"."links"."board_id" IS 'ID of the target board';

COMMENT ON COLUMN "public"."links"."plugin_id" IS 'Full plugin UUID for Common Ground routing';

COMMENT ON COLUMN "public"."links"."share_token" IS 'Unique share token for this URL instance';

COMMENT ON COLUMN "public"."links"."shared_by_user_id" IS 'User who created this share URL';

COMMENT ON COLUMN "public"."links"."share_source" IS 'How the URL was shared (direct_share, social_media, email, etc.)';

COMMENT ON COLUMN "public"."links"."post_title" IS 'Original post title for regenerating URLs';

COMMENT ON COLUMN "public"."links"."board_name" IS 'Original board name for regenerating URLs';

COMMENT ON COLUMN "public"."links"."expires_at" IS 'Optional expiration date for the URL';

COMMENT ON COLUMN "public"."links"."last_accessed_at" IS 'When the URL was last accessed';

COMMENT ON COLUMN "public"."links"."access_count" IS 'Number of times the URL has been accessed';

COMMENT ON COLUMN "public"."links"."community_shortid_history" IS 'Array of all historical community short IDs for backward compatibility';

CREATE UNIQUE INDEX links_slug_key ON public.links USING btree (slug);

CREATE UNIQUE INDEX links_share_token_key ON public.links USING btree (share_token);

CREATE UNIQUE INDEX links_unique_path ON public.links USING btree (community_short_id, board_slug, slug);

CREATE INDEX links_post_id_idx ON public.links USING btree (post_id);

CREATE INDEX links_board_id_idx ON public.links USING btree (board_id);

CREATE INDEX links_community_idx ON public.links USING btree (community_short_id);

CREATE INDEX links_created_at_idx ON public.links USING btree (created_at);

CREATE INDEX links_expires_at_idx ON public.links USING btree (expires_at) WHERE (expires_at IS NOT NULL);

CREATE INDEX links_access_count_idx ON public.links USING btree (access_count);

CREATE INDEX links_community_shortid_history_idx ON public.links USING gin (community_shortid_history);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_links" BEFORE UPDATE ON "public"."links" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP VIEW IF EXISTS "lock_stats";
CREATE TABLE "lock_stats" ("id" integer, "name" character varying(255), "community_id" text, "creator_user_id" text, "is_template" boolean, "is_public" boolean, "usage_count" integer, "success_rate" real, "avg_verification_time" integer, "posts_using_lock" bigint, "created_at" timestamptz, "updated_at" timestamptz);


DROP TABLE IF EXISTS "locks";
CREATE TABLE "public"."locks" (
    "id" integer DEFAULT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" text,
    "icon" character varying(50),
    "color" character varying(20),
    "gating_config" jsonb NOT NULL,
    "creator_user_id" text NOT NULL,
    "community_id" text NOT NULL,
    "is_template" boolean DEFAULT false NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "tags" text[] DEFAULT '{}' NOT NULL,
    "usage_count" integer DEFAULT '0' NOT NULL,
    "success_rate" real DEFAULT '0' NOT NULL,
    "avg_verification_time" integer DEFAULT '0' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "locks_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

COMMENT ON COLUMN "public"."locks"."icon" IS 'Emoji or icon identifier for visual display';

COMMENT ON COLUMN "public"."locks"."color" IS 'Brand color hex code for UI theming';

COMMENT ON COLUMN "public"."locks"."gating_config" IS 'Complete gating configuration in same format as posts.settings.responsePermissions';

COMMENT ON COLUMN "public"."locks"."community_id" IS 'Scope locks to specific communities';

COMMENT ON COLUMN "public"."locks"."is_template" IS 'True for curated community templates';

COMMENT ON COLUMN "public"."locks"."is_public" IS 'True if shareable within community';

COMMENT ON COLUMN "public"."locks"."tags" IS 'Tags for categorization and search';

COMMENT ON COLUMN "public"."locks"."usage_count" IS 'Number of times this lock has been applied to posts';

COMMENT ON COLUMN "public"."locks"."success_rate" IS 'Percentage of users who successfully pass verification (0-1)';

COMMENT ON COLUMN "public"."locks"."avg_verification_time" IS 'Average time in seconds for users to complete verification';

CREATE INDEX idx_locks_community ON public.locks USING btree (community_id);

CREATE INDEX idx_locks_creator ON public.locks USING btree (creator_user_id);

CREATE INDEX idx_locks_public ON public.locks USING btree (is_public) WHERE (is_public = true);

CREATE INDEX idx_locks_templates ON public.locks USING btree (is_template) WHERE (is_template = true);

CREATE INDEX idx_locks_tags ON public.locks USING gin (tags);

CREATE INDEX idx_locks_gating_config ON public.locks USING gin (gating_config);

CREATE UNIQUE INDEX idx_locks_community_name ON public.locks USING btree (community_id, name);

CREATE INDEX idx_locks_popular ON public.locks USING btree (usage_count, created_at);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_locks" BEFORE UPDATE ON "public"."locks" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "pgmigrations";
DROP SEQUENCE IF EXISTS pgmigrations_id_seq;
CREATE SEQUENCE pgmigrations_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."pgmigrations" (
    "id" integer DEFAULT nextval('pgmigrations_id_seq') NOT NULL,
    "name" character varying(255) NOT NULL,
    "run_on" timestamp NOT NULL,
    CONSTRAINT "pgmigrations_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "posts";
DROP SEQUENCE IF EXISTS posts_id_seq;
CREATE SEQUENCE posts_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."posts" (
    "id" integer DEFAULT nextval('posts_id_seq') NOT NULL,
    "author_user_id" text NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" text NOT NULL,
    "tags" text[],
    "upvote_count" integer DEFAULT '0' NOT NULL,
    "comment_count" integer DEFAULT '0' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "board_id" integer NOT NULL,
    "settings" jsonb DEFAULT '{}' NOT NULL,
    "lock_id" integer,
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

COMMENT ON COLUMN "public"."posts"."lock_id" IS 'Optional reference to the lock used for this post gating';

CREATE INDEX posts_author_user_id_index ON public.posts USING btree (author_user_id);

CREATE INDEX posts_upvote_count_index ON public.posts USING btree (upvote_count);

CREATE INDEX posts_created_at_index ON public.posts USING btree (created_at);

CREATE INDEX posts_tags_index ON public.posts USING gin (tags);

CREATE INDEX posts_board_id_index ON public.posts USING btree (board_id);

CREATE INDEX posts_cursor_pagination_idx ON public.posts USING btree (upvote_count DESC, created_at DESC, id DESC);

CREATE INDEX posts_settings_index ON public.posts USING gin (settings);

CREATE INDEX idx_posts_lock_id ON public.posts USING btree (lock_id);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_posts" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "pre_verifications";
DROP SEQUENCE IF EXISTS pre_verifications_id_seq;
CREATE SEQUENCE pre_verifications_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."pre_verifications" (
    "id" integer DEFAULT nextval('pre_verifications_id_seq') NOT NULL,
    "user_id" text NOT NULL,
    "post_id" integer NOT NULL,
    "category_type" text NOT NULL,
    "verification_data" jsonb NOT NULL,
    "verification_status" text DEFAULT 'pending' NOT NULL,
    "verified_at" timestamptz,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pre_verifications_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

COMMENT ON TABLE "public"."pre_verifications" IS 'Stores pre-verification states for slot-based gating system';

COMMENT ON COLUMN "public"."pre_verifications"."category_type" IS 'Type of gating category: ethereum_profile, universal_profile, etc.';

COMMENT ON COLUMN "public"."pre_verifications"."verification_data" IS 'JSON containing signature, challenge, and verified requirement details';

COMMENT ON COLUMN "public"."pre_verifications"."verification_status" IS 'Status: pending (submitted), verified (backend confirmed), expired (timed out)';

COMMENT ON COLUMN "public"."pre_verifications"."expires_at" IS 'Verification expires 30 minutes after creation for security';

CREATE UNIQUE INDEX pre_verifications_unique_user_post_category ON public.pre_verifications USING btree (user_id, post_id, category_type);

CREATE INDEX pre_verifications_user_id_index ON public.pre_verifications USING btree (user_id);

CREATE INDEX pre_verifications_post_id_index ON public.pre_verifications USING btree (post_id);

CREATE INDEX pre_verifications_status_index ON public.pre_verifications USING btree (verification_status);

CREATE INDEX pre_verifications_expires_at_index ON public.pre_verifications USING btree (expires_at);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_pre_verifications" BEFORE UPDATE ON "public"."pre_verifications" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "telegram_groups";
DROP SEQUENCE IF EXISTS telegram_groups_id_seq;
CREATE SEQUENCE telegram_groups_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."telegram_groups" (
    "id" integer DEFAULT nextval('telegram_groups_id_seq') NOT NULL,
    "chat_id" bigint NOT NULL,
    "chat_title" text NOT NULL,
    "community_id" text NOT NULL,
    "registered_by_user_id" text NOT NULL,
    "notification_settings" jsonb DEFAULT '{}' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "bot_permissions" jsonb DEFAULT '{}' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "telegram_groups_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE UNIQUE INDEX telegram_groups_chat_id_key ON public.telegram_groups USING btree (chat_id);

CREATE INDEX telegram_groups_community_id_index ON public.telegram_groups USING btree (community_id);

CREATE INDEX telegram_groups_is_active_index ON public.telegram_groups USING btree (is_active) WHERE (is_active = true);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_telegram_groups" BEFORE UPDATE ON "public"."telegram_groups" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "telegram_notifications";
DROP SEQUENCE IF EXISTS telegram_notifications_id_seq;
CREATE SEQUENCE telegram_notifications_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."telegram_notifications" (
    "id" integer DEFAULT nextval('telegram_notifications_id_seq') NOT NULL,
    "telegram_group_id" integer NOT NULL,
    "notification_type" text NOT NULL,
    "source_post_id" integer,
    "source_comment_id" integer,
    "message_text" text NOT NULL,
    "telegram_message_id" integer,
    "delivery_status" text DEFAULT '''pending''' NOT NULL,
    "sent_at" timestamptz,
    "error_message" text,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "telegram_notifications_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX telegram_notifications_delivery_status_index ON public.telegram_notifications USING btree (delivery_status);

CREATE INDEX telegram_notifications_created_at_index ON public.telegram_notifications USING btree (created_at);

CREATE INDEX telegram_notifications_telegram_group_id_index ON public.telegram_notifications USING btree (telegram_group_id);


DROP TABLE IF EXISTS "users";
CREATE TABLE "public"."users" (
    "user_id" text NOT NULL,
    "name" text,
    "profile_picture_url" text,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
) WITH (oids = false);


DROP TABLE IF EXISTS "votes";
CREATE TABLE "public"."votes" (
    "user_id" text NOT NULL,
    "post_id" integer NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "votes_pkey" PRIMARY KEY ("user_id", "post_id")
) WITH (oids = false);


ALTER TABLE ONLY "public"."boards" ADD CONSTRAINT "boards_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."comments" ADD CONSTRAINT "comments_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."links" ADD CONSTRAINT "links_board_id_fkey" FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."links" ADD CONSTRAINT "links_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."links" ADD CONSTRAINT "links_shared_by_user_id_fkey" FOREIGN KEY (shared_by_user_id) REFERENCES users(user_id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."locks" ADD CONSTRAINT "locks_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."locks" ADD CONSTRAINT "locks_creator_user_id_fkey" FOREIGN KEY (creator_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_board_id_fkey" FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_lock_id_fkey" FOREIGN KEY (lock_id) REFERENCES locks(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."pre_verifications" ADD CONSTRAINT "pre_verifications_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."pre_verifications" ADD CONSTRAINT "pre_verifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."telegram_groups" ADD CONSTRAINT "telegram_groups_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_source_comment_id_fkey" FOREIGN KEY (source_comment_id) REFERENCES comments(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_source_post_id_fkey" FOREIGN KEY (source_post_id) REFERENCES posts(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_telegram_group_id_fkey" FOREIGN KEY (telegram_group_id) REFERENCES telegram_groups(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."votes" ADD CONSTRAINT "votes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

DROP TABLE IF EXISTS "lock_stats";
CREATE VIEW "lock_stats" AS SELECT l.id,
    l.name,
    l.community_id,
    l.creator_user_id,
    l.is_template,
    l.is_public,
    l.usage_count,
    l.success_rate,
    l.avg_verification_time,
    count(p.id) AS posts_using_lock,
    l.created_at,
    l.updated_at
   FROM (locks l
     LEFT JOIN posts p ON ((p.lock_id = l.id)))
  GROUP BY l.id;

-- 2025-06-15 07:27:25 UTC