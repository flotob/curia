-- Adminer 5.2.1 PostgreSQL 17.5 dump

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

CREATE INDEX idx_boards_community_posts ON public.boards USING btree (community_id, id) INCLUDE (name, settings);


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
    "community_short_id" text,
    "plugin_id" text,
    "community_url" text,
    "logo_url" text,
    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

COMMENT ON COLUMN "public"."communities"."community_short_id" IS 'Community short ID/slug from CG lib (e.g., "commonground")';

COMMENT ON COLUMN "public"."communities"."plugin_id" IS 'Plugin ID from CG lib context for URL building';

COMMENT ON COLUMN "public"."communities"."community_url" IS 'Community URL field (for future use if needed)';

COMMENT ON COLUMN "public"."communities"."logo_url" IS 'URL to the community logo/avatar image';

CREATE INDEX communities_settings_index ON public.communities USING gin (settings);

CREATE INDEX idx_communities_short_id ON public.communities USING btree (community_short_id);

CREATE INDEX idx_communities_plugin_id ON public.communities USING btree (plugin_id);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_communities" BEFORE UPDATE ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "community_partnerships";
DROP SEQUENCE IF EXISTS community_partnerships_id_seq;
CREATE SEQUENCE community_partnerships_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."community_partnerships" (
    "id" integer DEFAULT nextval('community_partnerships_id_seq') NOT NULL,
    "source_community_id" text NOT NULL,
    "target_community_id" text NOT NULL,
    "status" character varying(20) DEFAULT 'pending' NOT NULL,
    "relationship_type" character varying(50) DEFAULT 'partner',
    "source_to_target_permissions" jsonb DEFAULT '{}',
    "target_to_source_permissions" jsonb DEFAULT '{}',
    "invited_by_user_id" text NOT NULL,
    "invited_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "responded_by_user_id" text,
    "responded_at" timestamptz,
    "partnership_started_at" timestamptz,
    "partnership_ended_at" timestamptz,
    "invite_message" text,
    "response_message" text,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_partnerships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "community_partnerships_status_check" CHECK ((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'suspended'::character varying])::text[])),
    CONSTRAINT "community_partnerships_relationship_type_check" CHECK ((relationship_type)::text = ANY ((ARRAY['partner'::character varying, 'ecosystem'::character varying])::text[])),
    CONSTRAINT "no_self_partnership" CHECK (source_community_id <> target_community_id)
) WITH (oids = false);

COMMENT ON COLUMN "public"."community_partnerships"."source_to_target_permissions" IS 'Permissions that source community grants to target community. Includes: allowPresenceSharing, allowCrossCommunitySearch, allowCrossCommunityNavigation, allowCrossCommunityNotifications, allowBoardSharing';

COMMENT ON COLUMN "public"."community_partnerships"."target_to_source_permissions" IS 'Permissions that target community grants to source community. Includes: allowPresenceSharing, allowCrossCommunitySearch, allowCrossCommunityNavigation, allowCrossCommunityNotifications, allowBoardSharing';

CREATE INDEX idx_community_partnerships_lookup ON public.community_partnerships USING btree (source_community_id, target_community_id, status);

CREATE UNIQUE INDEX unique_community_partnership ON public.community_partnerships USING btree (source_community_id, target_community_id);

CREATE INDEX idx_community_partnerships_source ON public.community_partnerships USING btree (source_community_id);

CREATE INDEX idx_community_partnerships_target ON public.community_partnerships USING btree (target_community_id);

CREATE INDEX idx_community_partnerships_status ON public.community_partnerships USING btree (status);

CREATE INDEX idx_community_partnerships_invited_at ON public.community_partnerships USING btree (invited_at);


DROP VIEW IF EXISTS "enriched_posts";
CREATE TABLE "enriched_posts" ("id" integer, "author_user_id" text, "title" character varying(255), "content" text, "tags" text[], "settings" jsonb, "lock_id" integer, "upvote_count" integer, "comment_count" integer, "created_at" timestamptz, "updated_at" timestamptz, "author_name" text, "author_profile_picture_url" text, "board_id" integer, "board_name" character varying(255), "board_description" text, "board_settings" jsonb, "community_id" text, "community_name" text, "community_short_id" text, "plugin_id" text, "community_logo_url" text, "community_settings" jsonb, "has_lock" boolean, "has_tags" boolean, "share_access_count" bigint, "share_count" bigint, "last_shared_at" timestamptz, "most_recent_access_at" timestamptz);


DROP TABLE IF EXISTS "imported_boards";
DROP SEQUENCE IF EXISTS imported_boards_id_seq;
CREATE SEQUENCE imported_boards_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."imported_boards" (
    "id" integer DEFAULT nextval('imported_boards_id_seq') NOT NULL,
    "source_board_id" integer NOT NULL,
    "source_community_id" text NOT NULL,
    "importing_community_id" text NOT NULL,
    "imported_by_user_id" text NOT NULL,
    "imported_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "imported_boards_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

COMMENT ON TABLE "public"."imported_boards" IS 'Tracks boards imported from partner communities via permission-based sharing';

COMMENT ON COLUMN "public"."imported_boards"."source_board_id" IS 'Board being imported from the source community';

COMMENT ON COLUMN "public"."imported_boards"."source_community_id" IS 'Community that owns the original board';

COMMENT ON COLUMN "public"."imported_boards"."importing_community_id" IS 'Community that is importing the board';

COMMENT ON COLUMN "public"."imported_boards"."imported_by_user_id" IS 'User who performed the import';

COMMENT ON COLUMN "public"."imported_boards"."imported_at" IS 'When the board was imported';

COMMENT ON COLUMN "public"."imported_boards"."is_active" IS 'Whether the import is currently active';

CREATE UNIQUE INDEX imported_boards_unique_import ON public.imported_boards USING btree (importing_community_id, source_board_id);

CREATE INDEX idx_imported_boards_importing_community ON public.imported_boards USING btree (importing_community_id);

CREATE INDEX idx_imported_boards_source_community ON public.imported_boards USING btree (source_community_id);

CREATE INDEX idx_imported_boards_source_board ON public.imported_boards USING btree (source_board_id);

CREATE INDEX idx_imported_boards_active_by_community ON public.imported_boards USING btree (importing_community_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_imported_boards_imported_at ON public.imported_boards USING btree (imported_at);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_imported_boards" BEFORE UPDATE ON "public"."imported_boards" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

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
    "shared_by_user_id" text,
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
CREATE TABLE "lock_stats" ("id" integer, "name" character varying(255), "community_id" text, "creator_user_id" text, "is_template" boolean, "is_public" boolean, "usage_count" integer, "success_rate" real, "avg_verification_time" integer, "posts_using_lock" bigint, "boards_using_lock" bigint, "total_usage" bigint, "created_at" timestamptz, "updated_at" timestamptz);


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

CREATE INDEX idx_posts_author_board_created ON public.posts USING btree (author_user_id, board_id, created_at DESC);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_posts" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "pre_verifications";
DROP SEQUENCE IF EXISTS pre_verifications_id_seq;
CREATE SEQUENCE pre_verifications_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."pre_verifications" (
    "id" integer DEFAULT nextval('pre_verifications_id_seq') NOT NULL,
    "user_id" text NOT NULL,
    "category_type" text NOT NULL,
    "verification_data" jsonb NOT NULL,
    "verification_status" text DEFAULT 'pending' NOT NULL,
    "verified_at" timestamptz,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lock_id" integer NOT NULL,
    CONSTRAINT "pre_verifications_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

COMMENT ON TABLE "public"."pre_verifications" IS 'Stores pre-verification states for both post and board gating systems';

COMMENT ON COLUMN "public"."pre_verifications"."category_type" IS 'Type of gating category: ethereum_profile, universal_profile, etc.';

COMMENT ON COLUMN "public"."pre_verifications"."verification_data" IS 'JSON containing signature, challenge, and verified requirement details';

COMMENT ON COLUMN "public"."pre_verifications"."verification_status" IS 'Status: pending (submitted), verified (backend confirmed), expired (timed out)';

COMMENT ON COLUMN "public"."pre_verifications"."expires_at" IS 'Verification expires after creation - 30 minutes for posts, configurable for boards';

CREATE INDEX pre_verifications_user_id_index ON public.pre_verifications USING btree (user_id);

CREATE INDEX pre_verifications_status_index ON public.pre_verifications USING btree (verification_status);

CREATE INDEX pre_verifications_expires_at_index ON public.pre_verifications USING btree (expires_at);

CREATE UNIQUE INDEX pre_verifications_unique_user_lock_category ON public.pre_verifications USING btree (user_id, lock_id, category_type);

CREATE INDEX idx_pre_verifications_lock_status_expiry ON public.pre_verifications USING btree (lock_id, verification_status, expires_at);

CREATE INDEX idx_pre_verifications_user_expiry ON public.pre_verifications USING btree (user_id, expires_at);

CREATE INDEX idx_pre_verifications_user_status_expiry_lock ON public.pre_verifications USING btree (user_id, verification_status, expires_at, lock_id) WHERE (verification_status = 'verified'::text);

CREATE INDEX idx_pre_verifications_lock_status_expiry_optimized ON public.pre_verifications USING btree (lock_id, verification_status, expires_at) WHERE (verification_status = 'verified'::text);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_pre_verifications" BEFORE UPDATE ON "public"."pre_verifications" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "reactions";
CREATE TABLE "public"."reactions" (
    "id" integer DEFAULT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "user_id" text NOT NULL,
    "post_id" integer,
    "comment_id" integer,
    "lock_id" integer,
    "emoji" character varying(10) NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reactions_content_check" CHECK (((post_id IS NOT NULL) AND (comment_id IS NULL) AND (lock_id IS NULL)) OR ((post_id IS NULL) AND (comment_id IS NOT NULL) AND (lock_id IS NULL)) OR ((post_id IS NULL) AND (comment_id IS NULL) AND (lock_id IS NOT NULL)))
) WITH (oids = false);

COMMENT ON TABLE "public"."reactions" IS 'Stores emoji reactions for posts, comments, and locks';

COMMENT ON COLUMN "public"."reactions"."id" IS 'Primary key for the reaction';

COMMENT ON COLUMN "public"."reactions"."user_id" IS 'User who created the reaction';

COMMENT ON COLUMN "public"."reactions"."post_id" IS 'Post being reacted to (nullable for comment/lock reactions)';

COMMENT ON COLUMN "public"."reactions"."comment_id" IS 'Comment being reacted to (nullable for post/lock reactions)';

COMMENT ON COLUMN "public"."reactions"."lock_id" IS 'Lock being reacted to (nullable for post/comment reactions)';

COMMENT ON COLUMN "public"."reactions"."emoji" IS 'Unicode emoji character (👍, ❤️, 😂, etc.)';

COMMENT ON COLUMN "public"."reactions"."created_at" IS 'When the reaction was created';

COMMENT ON COLUMN "public"."reactions"."updated_at" IS 'When the reaction was last updated';

CREATE UNIQUE INDEX reactions_user_post_emoji_key ON public.reactions USING btree (user_id, post_id, emoji) WHERE (post_id IS NOT NULL);

CREATE UNIQUE INDEX reactions_user_comment_emoji_key ON public.reactions USING btree (user_id, comment_id, emoji) WHERE (comment_id IS NOT NULL);

CREATE UNIQUE INDEX reactions_user_lock_emoji_key ON public.reactions USING btree (user_id, lock_id, emoji) WHERE (lock_id IS NOT NULL);

CREATE INDEX reactions_post_id_index ON public.reactions USING btree (post_id);

CREATE INDEX reactions_comment_id_index ON public.reactions USING btree (comment_id);

CREATE INDEX reactions_lock_id_index ON public.reactions USING btree (lock_id);

CREATE INDEX reactions_emoji_index ON public.reactions USING btree (emoji);

CREATE INDEX reactions_created_at_index ON public.reactions USING btree (created_at);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_reactions" BEFORE UPDATE ON "public"."reactions" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "shared_boards_backup";
CREATE TABLE "public"."shared_boards_backup" (
    "id" integer,
    "board_id" integer,
    "source_community_id" text,
    "target_community_id" text,
    "partnership_id" integer,
    "shared_by_user_id" text,
    "shared_at" timestamptz,
    "sharing_settings" jsonb,
    "created_at" timestamptz,
    "updated_at" timestamptz
) WITH (oids = false);

COMMENT ON TABLE "public"."shared_boards_backup" IS 'Backup of original shared_boards table before migration to imported_boards model';


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


DROP TABLE IF EXISTS "user_communities";
DROP SEQUENCE IF EXISTS user_communities_id_seq;
CREATE SEQUENCE user_communities_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."user_communities" (
    "id" integer DEFAULT nextval('user_communities_id_seq') NOT NULL,
    "user_id" text NOT NULL,
    "community_id" text NOT NULL,
    "first_visited_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_visited_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "visit_count" integer DEFAULT '1' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "user_communities_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

COMMENT ON COLUMN "public"."user_communities"."user_id" IS 'Common Ground user ID';

COMMENT ON COLUMN "public"."user_communities"."community_id" IS 'Community ID from Common Ground';

COMMENT ON COLUMN "public"."user_communities"."first_visited_at" IS 'When user first accessed this community';

COMMENT ON COLUMN "public"."user_communities"."last_visited_at" IS 'Last time user accessed this community (for cross-device What''s New)';

COMMENT ON COLUMN "public"."user_communities"."visit_count" IS 'Number of times user has visited this community';

CREATE UNIQUE INDEX user_communities_user_community_unique ON public.user_communities USING btree (user_id, community_id);

CREATE INDEX idx_user_communities_user_id ON public.user_communities USING btree (user_id);

CREATE INDEX idx_user_communities_community_id ON public.user_communities USING btree (community_id);

CREATE INDEX idx_user_communities_last_visited ON public.user_communities USING btree (last_visited_at);

CREATE INDEX idx_user_communities_user_last_visited ON public.user_communities USING btree (user_id, last_visited_at);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_user_communities" BEFORE UPDATE ON "public"."user_communities" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "user_friends";
DROP SEQUENCE IF EXISTS user_friends_id_seq;
CREATE SEQUENCE user_friends_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."user_friends" (
    "id" integer DEFAULT nextval('user_friends_id_seq') NOT NULL,
    "user_id" text NOT NULL,
    "friend_user_id" text NOT NULL,
    "friend_name" text NOT NULL,
    "friend_image_url" text,
    "friendship_status" text DEFAULT '''active''' NOT NULL,
    "synced_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "user_friends_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_friends_no_self_friendship" CHECK (user_id <> friend_user_id)
) WITH (oids = false);

COMMENT ON COLUMN "public"."user_friends"."user_id" IS 'User who has this friend';

COMMENT ON COLUMN "public"."user_friends"."friend_user_id" IS 'The friend''s Common Ground user ID';

COMMENT ON COLUMN "public"."user_friends"."friend_name" IS 'Friend''s display name from CG lib';

COMMENT ON COLUMN "public"."user_friends"."friend_image_url" IS 'Friend''s profile picture URL from CG lib';

COMMENT ON COLUMN "public"."user_friends"."friendship_status" IS 'Status: active, removed, blocked';

COMMENT ON COLUMN "public"."user_friends"."synced_at" IS 'When this friendship data was last synced from CG lib';

CREATE INDEX idx_user_friends_name_search ON public.user_friends USING gin (to_tsvector('english'::regconfig, friend_name)) WHERE (friendship_status = 'active'::text);

CREATE INDEX idx_user_friends_name_prefix ON public.user_friends USING btree (friend_name text_pattern_ops) WHERE (friendship_status = 'active'::text);

CREATE UNIQUE INDEX user_friends_unique_friendship ON public.user_friends USING btree (user_id, friend_user_id);

CREATE INDEX idx_user_friends_user_id ON public.user_friends USING btree (user_id);

CREATE INDEX idx_user_friends_friend_user_id ON public.user_friends USING btree (friend_user_id);

CREATE INDEX idx_user_friends_status ON public.user_friends USING btree (friendship_status) WHERE (friendship_status = 'active'::text);

CREATE INDEX idx_user_friends_synced ON public.user_friends USING btree (synced_at);

CREATE INDEX idx_user_friends_user_status ON public.user_friends USING btree (user_id, friendship_status) WHERE (friendship_status = 'active'::text);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_user_friends" BEFORE UPDATE ON "public"."user_friends" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

DELIMITER ;

DROP TABLE IF EXISTS "users";
CREATE TABLE "public"."users" (
    "user_id" text NOT NULL,
    "name" text,
    "profile_picture_url" text,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "settings" jsonb DEFAULT '{}' NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
) WITH (oids = false);

COMMENT ON COLUMN "public"."users"."settings" IS 'JSON field for storing additional user data from Common Ground (LUKSO address, social handles, premium status, etc.)';

CREATE INDEX idx_users_name_search ON public.users USING gin (to_tsvector('english'::regconfig, name)) WHERE (name IS NOT NULL);

CREATE INDEX idx_users_name_prefix ON public.users USING btree (name text_pattern_ops) WHERE (name IS NOT NULL);

CREATE INDEX idx_users_settings ON public.users USING gin (settings);


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

ALTER TABLE ONLY "public"."community_partnerships" ADD CONSTRAINT "community_partnerships_invited_by_fkey" FOREIGN KEY (invited_by_user_id) REFERENCES users(user_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."community_partnerships" ADD CONSTRAINT "community_partnerships_responded_by_fkey" FOREIGN KEY (responded_by_user_id) REFERENCES users(user_id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."community_partnerships" ADD CONSTRAINT "community_partnerships_source_community_id_fkey" FOREIGN KEY (source_community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."community_partnerships" ADD CONSTRAINT "community_partnerships_target_community_id_fkey" FOREIGN KEY (target_community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."imported_boards" ADD CONSTRAINT "imported_boards_imported_by_user_id_fkey" FOREIGN KEY (imported_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."imported_boards" ADD CONSTRAINT "imported_boards_importing_community_id_fkey" FOREIGN KEY (importing_community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."imported_boards" ADD CONSTRAINT "imported_boards_source_board_id_fkey" FOREIGN KEY (source_board_id) REFERENCES boards(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."imported_boards" ADD CONSTRAINT "imported_boards_source_community_id_fkey" FOREIGN KEY (source_community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."links" ADD CONSTRAINT "links_board_id_fkey" FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."links" ADD CONSTRAINT "links_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."links" ADD CONSTRAINT "links_shared_by_user_fkey" FOREIGN KEY (shared_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."links" ADD CONSTRAINT "links_shared_by_user_id_fkey" FOREIGN KEY (shared_by_user_id) REFERENCES users(user_id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."locks" ADD CONSTRAINT "locks_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."locks" ADD CONSTRAINT "locks_creator_user_id_fkey" FOREIGN KEY (creator_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_board_id_fkey" FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_lock_id_fkey" FOREIGN KEY (lock_id) REFERENCES locks(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."pre_verifications" ADD CONSTRAINT "pre_verifications_lock_id_fkey" FOREIGN KEY (lock_id) REFERENCES locks(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."pre_verifications" ADD CONSTRAINT "pre_verifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reactions" ADD CONSTRAINT "reactions_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."reactions" ADD CONSTRAINT "reactions_lock_id_fkey" FOREIGN KEY (lock_id) REFERENCES locks(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."reactions" ADD CONSTRAINT "reactions_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."telegram_groups" ADD CONSTRAINT "telegram_groups_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_groups" ADD CONSTRAINT "telegram_groups_registered_by_fkey" FOREIGN KEY (registered_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_source_comment_id_fkey" FOREIGN KEY (source_comment_id) REFERENCES comments(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_source_post_id_fkey" FOREIGN KEY (source_post_id) REFERENCES posts(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_telegram_group_id_fkey" FOREIGN KEY (telegram_group_id) REFERENCES telegram_groups(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_communities" ADD CONSTRAINT "user_communities_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."user_communities" ADD CONSTRAINT "user_communities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_friends" ADD CONSTRAINT "user_friends_friend_user_id_fkey" FOREIGN KEY (friend_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."user_friends" ADD CONSTRAINT "user_friends_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."votes" ADD CONSTRAINT "votes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

DROP TABLE IF EXISTS "enriched_posts";
CREATE VIEW "enriched_posts" AS SELECT p.id,
    p.author_user_id,
    p.title,
    p.content,
    p.tags,
    p.settings,
    p.lock_id,
    p.upvote_count,
    p.comment_count,
    p.created_at,
    p.updated_at,
    u.name AS author_name,
    u.profile_picture_url AS author_profile_picture_url,
    b.id AS board_id,
    b.name AS board_name,
    b.description AS board_description,
    b.settings AS board_settings,
    b.community_id,
    c.name AS community_name,
    c.community_short_id,
    c.plugin_id,
    c.logo_url AS community_logo_url,
    c.settings AS community_settings,
        CASE
            WHEN (p.lock_id IS NOT NULL) THEN true
            ELSE false
        END AS has_lock,
        CASE
            WHEN ((p.tags IS NOT NULL) AND (array_length(p.tags, 1) > 0)) THEN true
            ELSE false
        END AS has_tags,
    COALESCE(share_stats.total_access_count, (0)::bigint) AS share_access_count,
    COALESCE(share_stats.share_count, (0)::bigint) AS share_count,
    share_stats.last_shared_at,
    share_stats.most_recent_access_at
   FROM ((((posts p
     JOIN users u ON ((p.author_user_id = u.user_id)))
     JOIN boards b ON ((p.board_id = b.id)))
     JOIN communities c ON ((b.community_id = c.id)))
     LEFT JOIN ( SELECT links.post_id,
            sum(links.access_count) AS total_access_count,
            count(*) AS share_count,
            max(links.created_at) AS last_shared_at,
            max(links.last_accessed_at) AS most_recent_access_at
           FROM links
          WHERE ((links.expires_at IS NULL) OR (links.expires_at > now()))
          GROUP BY links.post_id) share_stats ON ((p.id = share_stats.post_id)));

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
    count(DISTINCT p.id) AS posts_using_lock,
    count(DISTINCT b.id) AS boards_using_lock,
    (count(DISTINCT p.id) + count(DISTINCT b.id)) AS total_usage,
    l.created_at,
    l.updated_at
   FROM ((locks l
     LEFT JOIN posts p ON ((p.lock_id = l.id)))
     LEFT JOIN boards b ON ((((((b.settings -> 'permissions'::text) -> 'locks'::text) ->> 'lockIds'::text) IS NOT NULL) AND (jsonb_typeof((((b.settings -> 'permissions'::text) -> 'locks'::text) -> 'lockIds'::text)) = 'array'::text) AND ((((b.settings -> 'permissions'::text) -> 'locks'::text) -> 'lockIds'::text) @> to_jsonb(l.id)))))
  GROUP BY l.id;

-- 2025-06-30 12:00:44 UTC