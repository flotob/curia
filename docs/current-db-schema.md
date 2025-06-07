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
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX posts_author_user_id_index ON public.posts USING btree (author_user_id);

CREATE INDEX posts_upvote_count_index ON public.posts USING btree (upvote_count);

CREATE INDEX posts_created_at_index ON public.posts USING btree (created_at);

CREATE INDEX posts_tags_index ON public.posts USING gin (tags);

CREATE INDEX posts_board_id_index ON public.posts USING btree (board_id);

CREATE INDEX posts_cursor_pagination_idx ON public.posts USING btree (upvote_count DESC, created_at DESC, id DESC);

CREATE INDEX posts_settings_index ON public.posts USING gin (settings);


DELIMITER ;;

CREATE TRIGGER "set_timestamp_posts" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();;

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

ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_board_id_fkey" FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."telegram_groups" ADD CONSTRAINT "telegram_groups_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_source_comment_id_fkey" FOREIGN KEY (source_comment_id) REFERENCES comments(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_source_post_id_fkey" FOREIGN KEY (source_post_id) REFERENCES posts(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_telegram_group_id_fkey" FOREIGN KEY (telegram_group_id) REFERENCES telegram_groups(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."votes" ADD CONSTRAINT "votes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

-- 2025-06-07 19:58:06 UTC