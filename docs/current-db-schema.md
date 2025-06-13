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

INSERT INTO "posts" ("id", "author_user_id", "title", "content", "tags", "upvote_count", "comment_count", "created_at", "updated_at", "board_id", "settings") VALUES
(190,	'86326068-5e1f-41b4-ba39-213402bf3601',	'dual gated post #6',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{slurpy}',	0,	0,	'2025-06-13 05:39:28.931462+00',	'2025-06-13 05:39:28.931462+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "minimum_followers", "value": "3", "description": ""}, {"type": "must_be_followed_by", "value": "", "description": "caveman.eth (caveman.eth)"}], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(154,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lsp7 gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"let''s test this"}]}]}',	'{test}',	0,	0,	'2025-06-04 14:06:00.727558+00',	'2025-06-13 15:28:35.048814+00',	412,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"requiredTokens": [{"name": "Lukso OG", "symbol": "LYXOG", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"}]}}], "requireAny": true}}'),
(157,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lsp gated post #4',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdf"}]}]}',	'{}',	0,	1,	'2025-06-04 16:15:32.504959+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"requiredTokens": [{"name": "Unknown Token", "symbol": "UNK", "minAmount": "1", "tokenType": "LSP7", "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"}]}}], "requireAny": true}}'),
(158,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lsp and lyx gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"yoo"}]}]}',	'{asdf}',	0,	0,	'2025-06-04 16:16:59.041906+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "47000000000000000000", "requiredTokens": [{"name": "Unknown Token", "symbol": "UNK", "tokenId": "7728", "tokenType": "LSP8", "contractAddress": "0x86E817172b5c07f7036Bf8aA46e2db9063743A83"}]}}], "requireAny": true}}'),
(159,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lsp gated post #5',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{asdfasdf}',	0,	2,	'2025-06-04 16:18:07.546578+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "23000000000000000000", "requiredTokens": [{"name": "Unknown Token", "symbol": "UNK", "tokenType": "LSP8", "contractAddress": "0x2b2eb8848d04c003231e4b905d5db6ebc0c02fa4"}]}}], "requireAny": true}}'),
(160,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lsp gated post #6',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	1,	'2025-06-04 16:42:05.575872+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"requiredTokens": [{"name": "Just a Potato 🥔", "symbol": "POTATO", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0x80d898c5a3a0b118a0c8c8adcdbb260fc687f1ce"}]}}], "requireAny": true}}'),
(164,	'86326068-5e1f-41b4-ba39-213402bf3601',	'follower gated post #3',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"another one"}]}]}',	'{yooo}',	0,	1,	'2025-06-04 22:18:47.345683+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"followerRequirements": [{"type": "following", "value": "0x194FD32760Fa818ed2ee712B3354fCDa1121cfB4"}]}}], "requireAny": true}}'),
(165,	'86326068-5e1f-41b4-ba39-213402bf3601',	'follower gated post #4',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"another one"}]}]}',	'{asdfasdf}',	0,	0,	'2025-06-04 22:39:45.324149+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"followerRequirements": [{"type": "followed_by", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}]}}], "requireAny": true}}'),
(166,	'86326068-5e1f-41b4-ba39-213402bf3601',	'follower gated post #5',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{asdfasdfasdf}',	0,	0,	'2025-06-04 22:47:48.979945+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"followerRequirements": [{"type": "following", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}]}}], "requireAny": true}}'),
(162,	'86326068-5e1f-41b4-ba39-213402bf3601',	'follower gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"amazinger"}]}]}',	'{demo,"show off"}',	1,	0,	'2025-06-04 22:15:45.803946+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "1000000000000000000", "requiredTokens": [{"name": "LUKSO OG NFT", "symbol": "LYXOG", "minAmount": "1", "tokenType": "LSP7", "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"}], "followerRequirements": [{"type": "followed_by", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7", "description": "Only the chosen ones"}]}}], "requireAny": true}}'),
(167,	'86326068-5e1f-41b4-ba39-213402bf3601',	'fully gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"that one''s for the true fans"}]}]}',	'{exclusive}',	1,	1,	'2025-06-04 22:49:36.895383+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "42000000000000000000", "requiredTokens": [{"name": "LUKSO OG NFT", "symbol": "LYXOG", "minAmount": "1", "tokenType": "LSP7", "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"}], "followerRequirements": [{"type": "followed_by", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}, {"type": "following", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}]}}], "requireAny": true}}'),
(35,	'86326068-5e1f-41b4-ba39-213402bf3601',	'3453453453',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:33.90724+00',	'2025-05-30 00:42:33.90724+00',	62,	'{}'),
(36,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fdsdgsdfgsdfg"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:43.341217+00',	'2025-05-30 00:42:43.341217+00',	62,	'{}'),
(37,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg34',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgds"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:47.089696+00',	'2025-05-30 00:42:47.089696+00',	62,	'{}'),
(38,	'86326068-5e1f-41b4-ba39-213402bf3601',	'345gsdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgsdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:53.509431+00',	'2025-05-30 00:42:53.509431+00',	62,	'{}'),
(191,	'86326068-5e1f-41b4-ba39-213402bf3601',	'efp gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfasdfasdf"}]}]}',	'{asdf}',	0,	0,	'2025-06-13 08:11:44.146373+00',	'2025-06-13 08:11:44.146373+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "must_follow", "value": "", "description": "caveman.eth (caveman.eth)"}], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(17,	'86326068-5e1f-41b4-ba39-213402bf3601',	'this is a spicy post 🏤',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"only for robots"}]},{"type":"codeBlock","attrs":{"language":null},"content":[{"type":"text","text":"this is so cool"}]}]}',	'{}',	1,	0,	'2025-05-29 21:46:21.538492+00',	'2025-05-29 21:49:29.683099+00',	2,	'{}'),
(15,	'86326068-5e1f-41b4-ba39-213402bf3601',	'penis enlargement',	'{"type":"doc","content":[{"type":"image","attrs":{"src":"https://m.media-amazon.com/images/I/61GXR5CoawL._AC_UF894,1000_QL80_.jpg","alt":"Swedish-Made Penis Enlarger Pumps and Me Blank Notebook: 110 pages, 6x9  inches : Bou: Amazon.de: Bücher","title":null}}]}',	'{penis,pump}',	0,	0,	'2025-05-29 20:25:44.949984+00',	'2025-05-29 21:51:47.838564+00',	25,	'{}'),
(18,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{baaaa}',	0,	0,	'2025-05-29 22:53:09.959452+00',	'2025-05-29 22:53:09.959452+00',	29,	'{}'),
(19,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfdfdfd"}]}]}',	'{23223}',	0,	0,	'2025-05-29 22:54:06.595078+00',	'2025-05-29 22:54:06.595078+00',	44,	'{}'),
(21,	'86326068-5e1f-41b4-ba39-213402bf3601',	'pump it',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:27.246926+00',	'2025-05-30 00:42:27.246926+00',	62,	'{}'),
(22,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfsdfsdfs',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:31.287842+00',	'2025-05-30 00:42:31.287842+00',	62,	'{}'),
(23,	'86326068-5e1f-41b4-ba39-213402bf3601',	'3453453453',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:33.90724+00',	'2025-05-30 00:42:33.90724+00',	62,	'{}'),
(24,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fdsdgsdfgsdfg"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:43.341217+00',	'2025-05-30 00:42:43.341217+00',	62,	'{}'),
(25,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg34',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgds"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:47.089696+00',	'2025-05-30 00:42:47.089696+00',	62,	'{}'),
(26,	'86326068-5e1f-41b4-ba39-213402bf3601',	'345gsdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgsdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:53.509431+00',	'2025-05-30 00:42:53.509431+00',	62,	'{}'),
(27,	'86326068-5e1f-41b4-ba39-213402bf3601',	'45454545634',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:59.750653+00',	'2025-05-30 00:42:59.750653+00',	62,	'{}'),
(29,	'86326068-5e1f-41b4-ba39-213402bf3601',	'penis enlargement',	'{"type":"doc","content":[{"type":"image","attrs":{"src":"https://m.media-amazon.com/images/I/61GXR5CoawL._AC_UF894,1000_QL80_.jpg","alt":"Swedish-Made Penis Enlarger Pumps and Me Blank Notebook: 110 pages, 6x9  inches : Bou: Amazon.de: Bücher","title":null}}]}',	'{penis,pump}',	0,	0,	'2025-05-29 20:25:44.949984+00',	'2025-05-29 21:51:47.838564+00',	25,	'{}'),
(30,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{baaaa}',	0,	0,	'2025-05-29 22:53:09.959452+00',	'2025-05-29 22:53:09.959452+00',	29,	'{}'),
(31,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfdfdfd"}]}]}',	'{23223}',	0,	0,	'2025-05-29 22:54:06.595078+00',	'2025-05-29 22:54:06.595078+00',	44,	'{}'),
(33,	'86326068-5e1f-41b4-ba39-213402bf3601',	'pump it',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:27.246926+00',	'2025-05-30 00:42:27.246926+00',	62,	'{}'),
(34,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfsdfsdfs',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:31.287842+00',	'2025-05-30 00:42:31.287842+00',	62,	'{}'),
(32,	'86326068-5e1f-41b4-ba39-213402bf3601',	'secret post',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"so secret"}]}]}',	'{yea}',	2,	0,	'2025-05-29 23:46:39.275302+00',	'2025-06-02 14:28:10.663287+00',	60,	'{}'),
(20,	'86326068-5e1f-41b4-ba39-213402bf3601',	'secret post',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"so secret"}]}]}',	'{yea}',	1,	1,	'2025-05-29 23:46:39.275302+00',	'2025-06-06 20:42:03.990386+00',	60,	'{}'),
(28,	'86326068-5e1f-41b4-ba39-213402bf3601',	'this is a spicy post 🏤',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"only for robots"}]},{"type":"codeBlock","attrs":{"language":null},"content":[{"type":"text","text":"this is so cool"}]}]}',	'{}',	2,	1,	'2025-05-29 21:46:21.538492+00',	'2025-06-07 20:43:36.644607+00',	2,	'{}'),
(39,	'86326068-5e1f-41b4-ba39-213402bf3601',	'45454545634',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:59.750653+00',	'2025-05-30 00:42:59.750653+00',	62,	'{}'),
(40,	'86326068-5e1f-41b4-ba39-213402bf3601',	'3453453453',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:33.90724+00',	'2025-05-30 00:42:33.90724+00',	62,	'{}'),
(41,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fdsdgsdfgsdfg"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:43.341217+00',	'2025-05-30 00:42:43.341217+00',	62,	'{}'),
(42,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg34',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgds"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:47.089696+00',	'2025-05-30 00:42:47.089696+00',	62,	'{}'),
(43,	'86326068-5e1f-41b4-ba39-213402bf3601',	'345gsdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgsdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:53.509431+00',	'2025-05-30 00:42:53.509431+00',	62,	'{}'),
(44,	'86326068-5e1f-41b4-ba39-213402bf3601',	'this is a spicy post 🏤',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"only for robots"}]},{"type":"codeBlock","attrs":{"language":null},"content":[{"type":"text","text":"this is so cool"}]}]}',	'{}',	1,	0,	'2025-05-29 21:46:21.538492+00',	'2025-05-29 21:49:29.683099+00',	2,	'{}'),
(45,	'86326068-5e1f-41b4-ba39-213402bf3601',	'penis enlargement',	'{"type":"doc","content":[{"type":"image","attrs":{"src":"https://m.media-amazon.com/images/I/61GXR5CoawL._AC_UF894,1000_QL80_.jpg","alt":"Swedish-Made Penis Enlarger Pumps and Me Blank Notebook: 110 pages, 6x9  inches : Bou: Amazon.de: Bücher","title":null}}]}',	'{penis,pump}',	0,	0,	'2025-05-29 20:25:44.949984+00',	'2025-05-29 21:51:47.838564+00',	25,	'{}'),
(46,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{baaaa}',	0,	0,	'2025-05-29 22:53:09.959452+00',	'2025-05-29 22:53:09.959452+00',	29,	'{}'),
(47,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfdfdfd"}]}]}',	'{23223}',	0,	0,	'2025-05-29 22:54:06.595078+00',	'2025-05-29 22:54:06.595078+00',	44,	'{}'),
(48,	'86326068-5e1f-41b4-ba39-213402bf3601',	'secret post',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"so secret"}]}]}',	'{yea}',	1,	0,	'2025-05-29 23:46:39.275302+00',	'2025-05-29 23:57:09.618568+00',	60,	'{}'),
(49,	'86326068-5e1f-41b4-ba39-213402bf3601',	'pump it',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:27.246926+00',	'2025-05-30 00:42:27.246926+00',	62,	'{}'),
(50,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfsdfsdfs',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:31.287842+00',	'2025-05-30 00:42:31.287842+00',	62,	'{}'),
(51,	'86326068-5e1f-41b4-ba39-213402bf3601',	'3453453453',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:33.90724+00',	'2025-05-30 00:42:33.90724+00',	62,	'{}'),
(52,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fdsdgsdfgsdfg"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:43.341217+00',	'2025-05-30 00:42:43.341217+00',	62,	'{}'),
(53,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg34',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgds"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:47.089696+00',	'2025-05-30 00:42:47.089696+00',	62,	'{}'),
(54,	'86326068-5e1f-41b4-ba39-213402bf3601',	'345gsdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgsdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:53.509431+00',	'2025-05-30 00:42:53.509431+00',	62,	'{}'),
(55,	'86326068-5e1f-41b4-ba39-213402bf3601',	'45454545634',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:59.750653+00',	'2025-05-30 00:42:59.750653+00',	62,	'{}'),
(56,	'86326068-5e1f-41b4-ba39-213402bf3601',	'this is a spicy post 🏤',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"only for robots"}]},{"type":"codeBlock","attrs":{"language":null},"content":[{"type":"text","text":"this is so cool"}]}]}',	'{}',	1,	0,	'2025-05-29 21:46:21.538492+00',	'2025-05-29 21:49:29.683099+00',	2,	'{}'),
(57,	'86326068-5e1f-41b4-ba39-213402bf3601',	'penis enlargement',	'{"type":"doc","content":[{"type":"image","attrs":{"src":"https://m.media-amazon.com/images/I/61GXR5CoawL._AC_UF894,1000_QL80_.jpg","alt":"Swedish-Made Penis Enlarger Pumps and Me Blank Notebook: 110 pages, 6x9  inches : Bou: Amazon.de: Bücher","title":null}}]}',	'{penis,pump}',	0,	0,	'2025-05-29 20:25:44.949984+00',	'2025-05-29 21:51:47.838564+00',	25,	'{}'),
(58,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{baaaa}',	0,	0,	'2025-05-29 22:53:09.959452+00',	'2025-05-29 22:53:09.959452+00',	29,	'{}'),
(59,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfdfdfd"}]}]}',	'{23223}',	0,	0,	'2025-05-29 22:54:06.595078+00',	'2025-05-29 22:54:06.595078+00',	44,	'{}'),
(60,	'86326068-5e1f-41b4-ba39-213402bf3601',	'secret post',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"so secret"}]}]}',	'{yea}',	1,	0,	'2025-05-29 23:46:39.275302+00',	'2025-05-29 23:57:09.618568+00',	60,	'{}'),
(61,	'86326068-5e1f-41b4-ba39-213402bf3601',	'pump it',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:27.246926+00',	'2025-05-30 00:42:27.246926+00',	62,	'{}'),
(62,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfsdfsdfs',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:31.287842+00',	'2025-05-30 00:42:31.287842+00',	62,	'{}'),
(63,	'86326068-5e1f-41b4-ba39-213402bf3601',	'45454545634',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:59.750653+00',	'2025-05-30 00:42:59.750653+00',	62,	'{}'),
(64,	'86326068-5e1f-41b4-ba39-213402bf3601',	'3453453453',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:33.90724+00',	'2025-05-30 00:42:33.90724+00',	62,	'{}'),
(65,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fdsdgsdfgsdfg"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:43.341217+00',	'2025-05-30 00:42:43.341217+00',	62,	'{}'),
(66,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg34',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgds"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:47.089696+00',	'2025-05-30 00:42:47.089696+00',	62,	'{}'),
(67,	'86326068-5e1f-41b4-ba39-213402bf3601',	'345gsdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgsdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:53.509431+00',	'2025-05-30 00:42:53.509431+00',	62,	'{}'),
(100,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fdsdgsdfgsdfg"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:43.341217+00',	'2025-05-30 00:42:43.341217+00',	62,	'{}'),
(69,	'86326068-5e1f-41b4-ba39-213402bf3601',	'penis enlargement',	'{"type":"doc","content":[{"type":"image","attrs":{"src":"https://m.media-amazon.com/images/I/61GXR5CoawL._AC_UF894,1000_QL80_.jpg","alt":"Swedish-Made Penis Enlarger Pumps and Me Blank Notebook: 110 pages, 6x9  inches : Bou: Amazon.de: Bücher","title":null}}]}',	'{penis,pump}',	0,	0,	'2025-05-29 20:25:44.949984+00',	'2025-05-29 21:51:47.838564+00',	25,	'{}'),
(70,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{baaaa}',	0,	0,	'2025-05-29 22:53:09.959452+00',	'2025-05-29 22:53:09.959452+00',	29,	'{}'),
(71,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfdfdfd"}]}]}',	'{23223}',	0,	0,	'2025-05-29 22:54:06.595078+00',	'2025-05-29 22:54:06.595078+00',	44,	'{}'),
(73,	'86326068-5e1f-41b4-ba39-213402bf3601',	'pump it',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:27.246926+00',	'2025-05-30 00:42:27.246926+00',	62,	'{}'),
(74,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfsdfsdfs',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:31.287842+00',	'2025-05-30 00:42:31.287842+00',	62,	'{}'),
(75,	'86326068-5e1f-41b4-ba39-213402bf3601',	'3453453453',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:33.90724+00',	'2025-05-30 00:42:33.90724+00',	62,	'{}'),
(76,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fdsdgsdfgsdfg"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:43.341217+00',	'2025-05-30 00:42:43.341217+00',	62,	'{}'),
(77,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg34',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgds"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:47.089696+00',	'2025-05-30 00:42:47.089696+00',	62,	'{}'),
(78,	'86326068-5e1f-41b4-ba39-213402bf3601',	'345gsdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgsdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:53.509431+00',	'2025-05-30 00:42:53.509431+00',	62,	'{}'),
(79,	'86326068-5e1f-41b4-ba39-213402bf3601',	'45454545634',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:59.750653+00',	'2025-05-30 00:42:59.750653+00',	62,	'{}'),
(81,	'86326068-5e1f-41b4-ba39-213402bf3601',	'penis enlargement',	'{"type":"doc","content":[{"type":"image","attrs":{"src":"https://m.media-amazon.com/images/I/61GXR5CoawL._AC_UF894,1000_QL80_.jpg","alt":"Swedish-Made Penis Enlarger Pumps and Me Blank Notebook: 110 pages, 6x9  inches : Bou: Amazon.de: Bücher","title":null}}]}',	'{penis,pump}',	0,	0,	'2025-05-29 20:25:44.949984+00',	'2025-05-29 21:51:47.838564+00',	25,	'{}'),
(82,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{baaaa}',	0,	0,	'2025-05-29 22:53:09.959452+00',	'2025-05-29 22:53:09.959452+00',	29,	'{}'),
(83,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfdfdfd"}]}]}',	'{23223}',	0,	0,	'2025-05-29 22:54:06.595078+00',	'2025-05-29 22:54:06.595078+00',	44,	'{}'),
(84,	'86326068-5e1f-41b4-ba39-213402bf3601',	'secret post',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"so secret"}]}]}',	'{yea}',	1,	0,	'2025-05-29 23:46:39.275302+00',	'2025-05-29 23:57:09.618568+00',	60,	'{}'),
(85,	'86326068-5e1f-41b4-ba39-213402bf3601',	'pump it',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:27.246926+00',	'2025-05-30 00:42:27.246926+00',	62,	'{}'),
(86,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfsdfsdfs',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:31.287842+00',	'2025-05-30 00:42:31.287842+00',	62,	'{}'),
(87,	'86326068-5e1f-41b4-ba39-213402bf3601',	'45454545634',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:59.750653+00',	'2025-05-30 00:42:59.750653+00',	62,	'{}'),
(89,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fdsdgsdfgsdfg"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:43.341217+00',	'2025-05-30 00:42:43.341217+00',	62,	'{}'),
(90,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg34',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgds"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:47.089696+00',	'2025-05-30 00:42:47.089696+00',	62,	'{}'),
(91,	'86326068-5e1f-41b4-ba39-213402bf3601',	'345gsdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgsdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:53.509431+00',	'2025-05-30 00:42:53.509431+00',	62,	'{}'),
(93,	'86326068-5e1f-41b4-ba39-213402bf3601',	'penis enlargement',	'{"type":"doc","content":[{"type":"image","attrs":{"src":"https://m.media-amazon.com/images/I/61GXR5CoawL._AC_UF894,1000_QL80_.jpg","alt":"Swedish-Made Penis Enlarger Pumps and Me Blank Notebook: 110 pages, 6x9  inches : Bou: Amazon.de: Bücher","title":null}}]}',	'{penis,pump}',	0,	0,	'2025-05-29 20:25:44.949984+00',	'2025-05-29 21:51:47.838564+00',	25,	'{}'),
(94,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{baaaa}',	0,	0,	'2025-05-29 22:53:09.959452+00',	'2025-05-29 22:53:09.959452+00',	29,	'{}'),
(95,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfdfdfd"}]}]}',	'{23223}',	0,	0,	'2025-05-29 22:54:06.595078+00',	'2025-05-29 22:54:06.595078+00',	44,	'{}'),
(97,	'86326068-5e1f-41b4-ba39-213402bf3601',	'pump it',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:27.246926+00',	'2025-05-30 00:42:27.246926+00',	62,	'{}'),
(98,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfsdfsdfs',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:31.287842+00',	'2025-05-30 00:42:31.287842+00',	62,	'{}'),
(99,	'86326068-5e1f-41b4-ba39-213402bf3601',	'3453453453',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	1,	0,	'2025-05-30 00:42:33.90724+00',	'2025-05-30 00:46:55.7635+00',	62,	'{}'),
(96,	'86326068-5e1f-41b4-ba39-213402bf3601',	'secret post',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"so secret"}]}]}',	'{yea}',	2,	0,	'2025-05-29 23:46:39.275302+00',	'2025-06-06 19:39:11.406382+00',	60,	'{}'),
(80,	'86326068-5e1f-41b4-ba39-213402bf3601',	'this is a spicy post 🏤',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"only for robots"}]},{"type":"codeBlock","attrs":{"language":null},"content":[{"type":"text","text":"this is so cool"}]}]}',	'{}',	3,	0,	'2025-05-29 21:46:21.538492+00',	'2025-06-06 20:34:55.672762+00',	2,	'{}'),
(72,	'86326068-5e1f-41b4-ba39-213402bf3601',	'secret post',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"so secret"}]}]}',	'{yea}',	2,	1,	'2025-05-29 23:46:39.275302+00',	'2025-06-06 21:17:11.332271+00',	60,	'{}'),
(101,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfgsdfg34',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgds"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:47.089696+00',	'2025-05-30 00:42:47.089696+00',	62,	'{}'),
(102,	'86326068-5e1f-41b4-ba39-213402bf3601',	'345gsdfgsdfg',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfgsdfgsdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:53.509431+00',	'2025-05-30 00:42:53.509431+00',	62,	'{}'),
(103,	'86326068-5e1f-41b4-ba39-213402bf3601',	'45454545634',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:59.750653+00',	'2025-05-30 00:42:59.750653+00',	62,	'{}'),
(106,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{baaaa}',	0,	0,	'2025-05-29 22:53:09.959452+00',	'2025-05-29 22:53:09.959452+00',	29,	'{}'),
(107,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfdfdfd"}]}]}',	'{23223}',	0,	0,	'2025-05-29 22:54:06.595078+00',	'2025-05-29 22:54:06.595078+00',	44,	'{}'),
(109,	'86326068-5e1f-41b4-ba39-213402bf3601',	'pump it',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:27.246926+00',	'2025-05-30 00:42:27.246926+00',	62,	'{}'),
(110,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfsdfsdfs',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:31.287842+00',	'2025-05-30 00:42:31.287842+00',	62,	'{}'),
(111,	'86326068-5e1f-41b4-ba39-213402bf3601',	'45454545634',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-05-30 00:42:59.750653+00',	'2025-05-30 00:42:59.750653+00',	62,	'{}'),
(88,	'86326068-5e1f-41b4-ba39-213402bf3601',	'3453453453',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	1,	0,	'2025-05-30 00:42:33.90724+00',	'2025-05-30 00:46:53.873786+00',	62,	'{}'),
(108,	'86326068-5e1f-41b4-ba39-213402bf3601',	'secret post',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"so secret"}]}]}',	'{yea}',	2,	0,	'2025-05-29 23:46:39.275302+00',	'2025-05-30 00:47:08.14246+00',	60,	'{}'),
(105,	'86326068-5e1f-41b4-ba39-213402bf3601',	'penis enlargement',	'{"type":"doc","content":[{"type":"image","attrs":{"src":"https://m.media-amazon.com/images/I/61GXR5CoawL._AC_UF894,1000_QL80_.jpg","alt":"Swedish-Made Penis Enlarger Pumps and Me Blank Notebook: 110 pages, 6x9  inches : Bou: Amazon.de: Bücher","title":null}}]}',	'{penis,pump}',	1,	0,	'2025-05-29 20:25:44.949984+00',	'2025-05-30 15:49:13.570537+00',	25,	'{}'),
(114,	'86326068-5e1f-41b4-ba39-213402bf3601',	'ficken',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://www.youtube.com/live/FeQ17vUm_Ro?si=XU2vqnLLIMSWbwDw","target":"_blank","rel":"noopener noreferrer nofollow","class":null}}],"text":"https://www.youtube.com/live/FeQ17vUm_Ro?si=XU2vqnLLIMSWbwDw"},{"type":"text","text":" "}]}]}',	'{bug}',	1,	0,	'2025-05-30 16:02:27.046+00',	'2025-05-30 16:02:34.373238+00',	44,	'{}'),
(113,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	1,	0,	'2025-05-30 15:49:04.030086+00',	'2025-05-31 07:18:50.680672+00',	25,	'{}'),
(115,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'penis post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"rofl kartoffel"}]}]}',	'{blubb,sie}',	0,	0,	'2025-06-01 12:06:06.842776+00',	'2025-06-01 12:06:06.842776+00',	25,	'{}'),
(116,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'a new discussion',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"needs to be had"}]}]}',	'{yep}',	0,	0,	'2025-06-01 12:14:32.293208+00',	'2025-06-01 12:14:32.293208+00',	2,	'{}'),
(117,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfdf344sd',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfasdfasdf"}]}]}',	'{discussion}',	0,	0,	'2025-06-01 12:15:11.89358+00',	'2025-06-01 12:15:11.89358+00',	2,	'{}'),
(118,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'sdfsdfsdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{sd}',	0,	0,	'2025-06-01 12:15:51.386253+00',	'2025-06-01 12:15:51.386253+00',	2,	'{}'),
(119,	'86326068-5e1f-41b4-ba39-213402bf3601',	'sdfsdfsdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfasdfasdf"}]}]}',	'{sdsd}',	0,	0,	'2025-06-01 12:18:59.47651+00',	'2025-06-01 12:18:59.47651+00',	2,	'{}'),
(120,	'86326068-5e1f-41b4-ba39-213402bf3601',	'wasdfasdfasdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{34}',	0,	0,	'2025-06-01 12:19:16.697674+00',	'2025-06-01 12:19:16.697674+00',	2,	'{}'),
(121,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfasdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-06-01 14:18:59.927025+00',	'2025-06-01 14:18:59.927025+00',	62,	'{}'),
(122,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'schlumbi3000',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	0,	'2025-06-01 14:21:50.012986+00',	'2025-06-01 14:21:50.012986+00',	2,	'{}'),
(123,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'asdfasdfasdf24344',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sadfasdfasdf"}]}]}',	'{asdf4,3434sd}',	0,	0,	'2025-06-02 07:10:12.086145+00',	'2025-06-02 07:10:12.086145+00',	2,	'{}'),
(124,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'3489348923489weiuasdjk',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfihuasdfuhioasd"}]}]}',	'{234234}',	0,	0,	'2025-06-02 07:11:15.644227+00',	'2025-06-02 07:11:15.644227+00',	2,	'{}'),
(125,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'34590243902390sdjk',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{sd,sfgds}',	0,	0,	'2025-06-02 07:13:14.573805+00',	'2025-06-02 07:13:14.573805+00',	2,	'{}'),
(126,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'slurp3000',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fluffy"}]}]}',	'{23,ijsdijds}',	0,	0,	'2025-06-02 07:15:31.516907+00',	'2025-06-02 07:15:31.516907+00',	2,	'{}'),
(127,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'directionally',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"fluffy"}]}]}',	'{23}',	0,	0,	'2025-06-02 07:17:45.14419+00',	'2025-06-02 07:17:45.14419+00',	2,	'{}'),
(128,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'341345151432',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{sdsd}',	0,	0,	'2025-06-02 07:19:51.588188+00',	'2025-06-02 07:19:51.588188+00',	2,	'{}'),
(129,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'schlumpf penis',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hehehe"}]}]}',	'{rofl,kartoffel}',	0,	0,	'2025-06-02 07:44:27.196854+00',	'2025-06-02 07:44:27.196854+00',	2,	'{}'),
(130,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'rofl kartoffel',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"blubbsie"}]}]}',	'{123,456}',	0,	0,	'2025-06-02 07:46:29.308706+00',	'2025-06-02 07:46:29.308706+00',	2,	'{}'),
(112,	'86326068-5e1f-41b4-ba39-213402bf3601',	'was geht aaaab',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hehehehehe"}]}]}',	'{"rofl kartoffel"}',	1,	1,	'2025-05-30 07:54:13.737741+00',	'2025-06-06 20:41:46.665071+00',	44,	'{}'),
(192,	'86326068-5e1f-41b4-ba39-213402bf3601',	'efp gated post #2',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{dsf23}',	0,	0,	'2025-06-13 08:44:03.425979+00',	'2025-06-13 08:44:03.425979+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "must_follow", "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8", "description": "caveman.eth (caveman.eth)"}], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(132,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'asdfasdfasdf2323',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sfgasfdgasfgsfg"}]}]}',	'{asdf34,34sdf}',	0,	0,	'2025-06-02 07:52:31.331223+00',	'2025-06-02 07:52:31.331223+00',	2,	'{}'),
(142,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'and another one',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdff"}]}]}',	'{}',	1,	0,	'2025-06-02 16:32:45.540847+00',	'2025-06-02 16:32:52.937069+00',	44,	'{}'),
(143,	'86326068-5e1f-41b4-ba39-213402bf3601',	'spicy post 3233',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdasdfasdf"}]}]}',	'{}',	0,	0,	'2025-06-02 18:16:32.77445+00',	'2025-06-02 18:16:32.77445+00',	29,	'{}'),
(133,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'klassizismus3000',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hurensohn"}]}]}',	'{234}',	0,	3,	'2025-06-02 07:53:27.168074+00',	'2025-06-02 07:57:07.444864+00',	2,	'{}'),
(134,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpeter',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"klopefele"}]}]}',	'{bug,feature-request}',	0,	0,	'2025-06-02 10:43:47.699959+00',	'2025-06-02 10:43:47.699959+00',	2,	'{}'),
(135,	'86326068-5e1f-41b4-ba39-213402bf3601',	'schlumpf kadaver',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"rofl"}]}]}',	'{asdf}',	2,	0,	'2025-06-02 13:37:46.746614+00',	'2025-06-02 14:28:51.796553+00',	207,	'{}'),
(136,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'rofl kartoffel',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"wie gehts dir"}]}]}',	'{}',	2,	0,	'2025-06-02 15:01:48.641472+00',	'2025-06-02 15:02:17.930838+00',	207,	'{}'),
(148,	'86326068-5e1f-41b4-ba39-213402bf3601',	'hello',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{234234}',	0,	0,	'2025-06-03 10:19:55.24292+00',	'2025-06-03 10:19:55.24292+00',	62,	'{}'),
(144,	'86326068-5e1f-41b4-ba39-213402bf3601',	'kluftie',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"nörgel"}]}]}',	'{asdfasdf}',	0,	3,	'2025-06-02 18:27:49.303726+00',	'2025-06-02 18:28:38.296831+00',	29,	'{}'),
(145,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'asdfasdfasdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{3ertdg}',	0,	2,	'2025-06-02 18:55:02.661477+00',	'2025-06-02 18:55:52.048679+00',	44,	'{}'),
(147,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'dasdfasdfasd',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-06-02 21:50:28.456029+00',	'2025-06-02 21:50:28.456029+00',	2,	'{}'),
(131,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'penis ficken muschi mumu',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hahahahah rofl kasdofi"}]}]}',	'{flubs,pups}',	2,	0,	'2025-06-02 07:48:07.711116+00',	'2025-06-03 09:34:28.352432+00',	2,	'{}'),
(138,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'rumpfthema',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"klroasdof"}]}]}',	'{234}',	1,	1,	'2025-06-02 15:04:09.943115+00',	'2025-06-06 20:41:33.049156+00',	215,	'{}'),
(149,	'86326068-5e1f-41b4-ba39-213402bf3601',	'shloms',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdlkfjasldjfasdf"}]},{"type":"paragraph"},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"hello"}]},{"type":"paragraph"},{"type":"paragraph"}]}',	'{blubbs}',	0,	0,	'2025-06-03 19:33:59.167722+00',	'2025-06-03 19:33:59.167722+00',	62,	'{}'),
(150,	'86326068-5e1f-41b4-ba39-213402bf3601',	'serpent',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"mastery"}]}]}',	'{"is rare"}',	0,	0,	'2025-06-03 19:46:14.204959+00',	'2025-06-03 19:46:14.204959+00',	25,	'{}'),
(151,	'86326068-5e1f-41b4-ba39-213402bf3601',	'slurpy',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfsdf"}]}]}',	'{majorana}',	0,	0,	'2025-06-03 19:47:06.815153+00',	'2025-06-03 19:47:06.815153+00',	2,	'{}'),
(68,	'86326068-5e1f-41b4-ba39-213402bf3601',	'this is a spicy post 🏤',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"only for robots"}]},{"type":"codeBlock","attrs":{"language":null},"content":[{"type":"text","text":"this is so cool"}]}]}',	'{}',	2,	1,	'2025-05-29 21:46:21.538492+00',	'2025-06-04 21:30:13.590794+00',	2,	'{}'),
(169,	'86326068-5e1f-41b4-ba39-213402bf3601',	'Puffine',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Dhhehehe"}]}]}',	'{}',	0,	0,	'2025-06-05 06:20:34.126267+00',	'2025-06-05 06:20:34.126267+00',	62,	'{}'),
(104,	'86326068-5e1f-41b4-ba39-213402bf3601',	'this is a spicy post 🏤',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"only for robots"}]},{"type":"codeBlock","attrs":{"language":null},"content":[{"type":"text","text":"this is so cool"}]}]}',	'{}',	3,	15,	'2025-05-29 21:46:21.538492+00',	'2025-06-08 11:37:07.095856+00',	2,	'{}'),
(139,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'pussygalore',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfasdf"}]}]}',	'{}',	2,	3,	'2025-06-02 16:07:52.48501+00',	'2025-06-06 20:34:20.727002+00',	215,	'{}'),
(137,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'mörder teil',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"lelell"}]}]}',	'{asdasdf}',	2,	2,	'2025-06-02 15:02:34.503904+00',	'2025-06-06 20:43:33.800546+00',	207,	'{}'),
(141,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'new entry in this feed',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"for the lulz"}]}]}',	'{asdf}',	1,	1,	'2025-06-02 16:31:56.670722+00',	'2025-06-06 20:48:46.585302+00',	44,	'{}'),
(92,	'86326068-5e1f-41b4-ba39-213402bf3601',	'this is a spicy post 🏤',	'{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"only for robots"}]},{"type":"codeBlock","attrs":{"language":null},"content":[{"type":"text","text":"this is so cool"}]}]}',	'{}',	3,	1,	'2025-05-29 21:46:21.538492+00',	'2025-06-06 20:55:10.797044+00',	2,	'{}'),
(146,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'birb',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{34}',	2,	2,	'2025-06-02 18:56:06.661177+00',	'2025-06-08 05:44:27.359873+00',	29,	'{}'),
(193,	'86326068-5e1f-41b4-ba39-213402bf3601',	'efp gated post #3',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfasdfasdf"}]}]}',	'{asdfasdfasdf}',	0,	0,	'2025-06-13 08:51:56.075159+00',	'2025-06-13 08:51:56.075159+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "minimum_followers", "value": "2", "description": ""}], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(194,	'86326068-5e1f-41b4-ba39-213402bf3601',	'efp gated post #4',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	0,	'2025-06-13 08:52:44.976655+00',	'2025-06-13 08:52:44.976655+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "minimum_followers", "value": "2", "description": ""}, {"type": "must_follow", "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8", "description": "caveman.eth (caveman.eth)"}], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(155,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lsp8 gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"does it work?"}]}]}',	'{blubb}',	0,	0,	'2025-06-04 15:54:11.378971+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"requiredTokens": [{"name": "Unknown Token", "symbol": "UNK", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"}, {"name": "Unknown Token", "symbol": "UNK", "tokenType": "LSP8", "contractAddress": "0x86E817172b5c07f7036Bf8aA46e2db9063743A83"}]}}], "requireAny": true}}'),
(156,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lsp gated post #3',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"another one"}]}]}',	'{}',	0,	0,	'2025-06-04 16:14:23.455159+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"requiredTokens": [{"name": "Unknown Token", "symbol": "UNK", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"}]}}], "requireAny": true}}'),
(163,	'86326068-5e1f-41b4-ba39-213402bf3601',	'follower gated post #2',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"alright, testing even more"}]}]}',	'{asdf}',	0,	0,	'2025-06-04 22:17:31.319083+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"followerRequirements": [{"type": "following", "value": "0x8363cfe6c787218f0ada0a4abc289a8d9dfc2453"}]}}], "requireAny": true}}'),
(168,	'86326068-5e1f-41b4-ba39-213402bf3601',	'robotics',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{234234}',	1,	0,	'2025-06-05 06:18:05.693647+00',	'2025-06-06 20:42:28.623986+00',	62,	'{}'),
(140,	'62c3bebc-33a3-4926-b37d-47a1ba9f8e41',	'dostolobo',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	1,	'2025-06-02 16:09:27.987084+00',	'2025-06-05 18:34:12.873371+00',	29,	'{}'),
(170,	'86326068-5e1f-41b4-ba39-213402bf3601',	'identical post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdf"}]}]}',	'{asdf}',	0,	0,	'2025-06-06 10:49:36.649247+00',	'2025-06-06 10:49:36.649247+00',	44,	'{}'),
(171,	'86326068-5e1f-41b4-ba39-213402bf3601',	'identical post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{asdfasdf}',	0,	0,	'2025-06-06 10:49:46.69845+00',	'2025-06-06 10:49:46.69845+00',	44,	'{}'),
(195,	'86326068-5e1f-41b4-ba39-213402bf3601',	'efp gated post #5',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sdfasdfasdf"}]}]}',	'{}',	0,	1,	'2025-06-13 09:13:49.752648+00',	'2025-06-13 09:35:11.373573+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "minimum_followers", "value": "3", "description": ""}, {"type": "must_be_followed_by", "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8", "description": "caveman.eth (caveman.eth)"}], "minimumETHBalance": "7440000000000000", "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(173,	'86326068-5e1f-41b4-ba39-213402bf3601',	'rofl kartoffel',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"enis penis"}]}]}',	'{bug,feature,everything}',	1,	1,	'2025-06-06 19:38:22.594061+00',	'2025-06-06 19:39:02.26452+00',	62,	'{}'),
(172,	'86326068-5e1f-41b4-ba39-213402bf3601',	'bubonic plague',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"not happening is it"}]}]}',	'{amirite}',	1,	0,	'2025-06-06 19:19:41.797484+00',	'2025-06-06 20:42:17.658066+00',	62,	'{}'),
(153,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lyx-gated post - min 50',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"got 50 lyx?"}]}]}',	'{nope}',	1,	0,	'2025-06-04 13:13:56.007244+00',	'2025-06-13 15:28:35.048814+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "50000000000000000000"}}], "requireAny": true}}'),
(174,	'86326068-5e1f-41b4-ba39-213402bf3601',	'kluftie schruftie',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sadfasfs"}]}]}',	'{yaba,daba,du}',	0,	0,	'2025-06-06 20:49:25.604649+00',	'2025-06-06 20:49:25.604649+00',	62,	'{}'),
(175,	'86326068-5e1f-41b4-ba39-213402bf3601',	'new post test hehe',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{blubb}',	0,	0,	'2025-06-06 20:56:42.171523+00',	'2025-06-06 20:56:42.171523+00',	62,	'{}'),
(176,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdfsadf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://www.spiegel.de/ausland/neuseeland-jacinda-ardern-ueber-ihre-zeit-als-premierministerin-und-empathie-als-staerke-spiegel-gespraech-a-eaedf619-9695-42b7-a724-0ac0c95ca949","target":"_blank","rel":"noopener noreferrer nofollow","class":null}}],"text":"https://www.spiegel.de/ausland/neuseeland-jacinda-ardern-ueber-ihre-zeit-als-premierministerin-und-empathie-als-staerke-spiegel-gespraech-a-eaedf619-9695-42b7-a724-0ac0c95ca949"}]}]}',	'{}',	0,	0,	'2025-06-07 17:03:55.55668+00',	'2025-06-07 17:03:55.55668+00',	62,	'{}'),
(177,	'ebf9000e-a7bb-4213-8e33-f0098409e27e',	'hello there',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"was geht ab"}]}]}',	'{yooo}',	0,	1,	'2025-06-08 12:26:42.663945+00',	'2025-06-08 12:26:55.238755+00',	2,	'{}'),
(178,	'86326068-5e1f-41b4-ba39-213402bf3601',	'slurpy the second',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"lol"}]}]}',	'{rumpf}',	0,	0,	'2025-06-08 17:17:43.979636+00',	'2025-06-08 17:17:43.979636+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": true, "efpRequirements": [], "ensDomainPatterns": ["*.eth"], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(179,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lsp and eth gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{}',	0,	2,	'2025-06-10 05:43:43.272244+00',	'2025-06-10 13:55:58.264376+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "3000000000000000000", "requiredTokens": [], "followerRequirements": []}}, {"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": true, "efpRequirements": [], "ensDomainPatterns": ["*.eth"], "minimumETHBalance": "10000000000000000", "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(180,	'86326068-5e1f-41b4-ba39-213402bf3601',	'eth gated post #2',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"yooo"}]}]}',	'{}',	0,	1,	'2025-06-10 15:34:30.881749+00',	'2025-06-10 15:35:21.08076+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": true, "efpRequirements": [], "ensDomainPatterns": ["florian*.eth"], "minimumETHBalance": "74415500000000", "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}, {"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "4020000000000000000", "requiredTokens": [], "followerRequirements": []}}], "requireAny": true}}'),
(181,	'86326068-5e1f-41b4-ba39-213402bf3601',	'eth gated solo',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"sadfasdf"}]}]}',	'{}',	0,	1,	'2025-06-10 15:36:01.034904+00',	'2025-06-10 16:36:54.691925+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": true, "efpRequirements": [], "ensDomainPatterns": ["*.eth"], "minimumETHBalance": "74415500000000", "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(182,	'86326068-5e1f-41b4-ba39-213402bf3601',	'dual gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"that is crazy"}]}]}',	'{"showing off"}',	0,	5,	'2025-06-10 16:38:23.213127+00',	'2025-06-10 18:23:35.555995+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": true, "efpRequirements": [], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}, {"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "4020000000000000000", "requiredTokens": [], "followerRequirements": []}}], "requireAny": true}}'),
(152,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lyx-gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"gatest post test"}]}]}',	'{}',	0,	6,	'2025-06-04 07:43:48.124751+00',	'2025-06-13 15:28:35.048814+00',	2,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "40000000000000000000"}}], "requireAny": true}}'),
(183,	'86326068-5e1f-41b4-ba39-213402bf3601',	'dual gated post #2',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{test,feature}',	0,	1,	'2025-06-10 18:25:13.622539+00',	'2025-06-10 18:26:04.242809+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "42000000000000000000", "requiredTokens": [], "followerRequirements": []}}], "requireAny": true}}'),
(196,	'86326068-5e1f-41b4-ba39-213402bf3601',	'eftp gated post #6',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"multipass"}]}]}',	'{yes}',	0,	0,	'2025-06-13 09:49:49.409485+00',	'2025-06-13 09:49:49.409485+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "minimum_followers", "value": "3", "description": ""}, {"type": "must_follow", "value": "0x52ac12480565555257a77c9f79f5b7ac770cfa09", "description": "mmmm.eth (mmmm.eth)"}, {"type": "must_be_followed_by", "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8", "description": "caveman.eth (caveman.eth)"}], "minimumETHBalance": "-2000000000000000000", "requiredERC20Tokens": [{"name": "", "symbol": "SHIB", "minimum": "1234", "decimals": 18, "contractAddress": "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"}], "requiredERC1155Tokens": [], "requiredERC721Collections": [{"name": "Meebits", "symbol": "", "minimumCount": 1, "contractAddress": "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7"}]}}, {"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "42000000000000000000", "requiredTokens": [{"name": "Unknown Token", "symbol": "UNK", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0x13fe7655c1bef7864dfc206838a20d00e5ce60a1"}, {"name": "Unknown Token", "symbol": "UNK", "minAmount": "1", "tokenType": "LSP8", "contractAddress": "0x2b2eb8848d04c003231e4b905d5db6ebc0c02fa4"}], "followerRequirements": [{"type": "minimum_followers", "value": "100"}, {"type": "followed_by", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}, {"type": "following", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}]}}], "requireAny": true}}'),
(184,	'86326068-5e1f-41b4-ba39-213402bf3601',	'dual gated post #3',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdf"}]}]}',	'{asdfasdf3}',	0,	2,	'2025-06-10 19:01:53.035904+00',	'2025-06-10 20:05:38.229507+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": true, "efpRequirements": [], "ensDomainPatterns": ["*.eth"], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}, {"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "4000000000000000000", "requiredTokens": [{"name": "Unknown Token", "symbol": "UNK", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0x650e14f636295af421d9bb788636356aa7f5924c"}, {"name": "Unknown Token", "symbol": "UNK", "minAmount": "1", "tokenType": "LSP8", "contractAddress": "0x2b2eb8848d04c003231e4b905d5db6ebc0c02fa4"}], "followerRequirements": [{"type": "followed_by", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}]}}], "requireAny": true}}'),
(161,	'86326068-5e1f-41b4-ba39-213402bf3601',	'lyx and lsp gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"that''s pretty incredible"}]}]}',	'{"showing off"}',	1,	6,	'2025-06-04 16:45:26.999155+00',	'2025-06-13 15:42:34.10677+00',	2,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "42000000000000000000", "requiredTokens": [{"name": "Just a Potato 🥔", "symbol": "POTATO", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0x80d898c5a3a0b118a0c8c8adcdbb260fc687f1ce"}, {"name": "💎 Carbon Credits", "symbol": "CC", "minAmount": "1000000000000000000000", "tokenType": "LSP7", "contractAddress": "0x4c5f927e8abecac8fdcc3bd324ac3792d8266b16"}, {"name": "GM Beans", "symbol": "GMBEANS", "minAmount": "1", "tokenType": "LSP8", "contractAddress": "0x33517e5fedec388da59125fbabea6e2f6395c510"}]}}], "requireAny": true}}'),
(185,	'86326068-5e1f-41b4-ba39-213402bf3601',	'dual gated post #4',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfsdf"}]}]}',	'{23ewdfasdf}',	0,	5,	'2025-06-10 20:08:05.730062+00',	'2025-06-13 05:24:35.573216+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": true, "efpRequirements": [], "ensDomainPatterns": ["*.eth"], "minimumETHBalance": "7000000000000000", "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}, {"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "42000000000000000000", "requiredTokens": [{"name": "FABS", "symbol": "FABS", "minAmount": "10000000000000000000000", "tokenType": "LSP7", "contractAddress": "0x650e14f636295af421d9bb788636356aa7f5924c"}, {"name": "burntwhales", "symbol": "BW", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0x8bf5bf6c2f11643e75dc4199af2c7d39b1aefcd3"}], "followerRequirements": [{"type": "minimum_followers", "value": "100"}, {"type": "followed_by", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}, {"type": "following", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}]}}], "requireAny": true}}'),
(186,	'86326068-5e1f-41b4-ba39-213402bf3601',	'gated post asdf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdf"}]}]}',	'{sdf}',	0,	0,	'2025-06-10 20:59:48.781888+00',	'2025-06-10 20:59:48.781888+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "1020000000000000000", "requiredTokens": [], "followerRequirements": []}}], "requireAny": true}}'),
(187,	'86326068-5e1f-41b4-ba39-213402bf3601',	'asdkjfksadf',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfsdf"}]}]}',	'{sdf}',	0,	0,	'2025-06-10 21:00:52.218984+00',	'2025-06-10 21:00:52.218984+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"minLyxBalance": "3000000000000000000", "requiredTokens": [{"name": "burntwhales", "symbol": "BW", "minAmount": "1000000000000000000", "tokenType": "LSP7", "contractAddress": "0x8bf5bf6c2f11643e75dc4199af2c7d39b1aefcd3"}], "followerRequirements": [{"type": "following", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}]}}], "requireAny": true}}'),
(188,	'86326068-5e1f-41b4-ba39-213402bf3601',	'dual gated post #5',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdf"}]}]}',	'{}',	0,	0,	'2025-06-11 21:00:52.237436+00',	'2025-06-11 21:00:52.237436+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "must_be_followed_by", "value": "", "description": "caveman.eth (caveman.eth)"}], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(189,	'86326068-5e1f-41b4-ba39-213402bf3601',	'efp gated psot',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdf"}]}]}',	'{asdf}',	0,	0,	'2025-06-12 05:41:47.6795+00',	'2025-06-12 05:41:47.6795+00',	62,	'{"responsePermissions": {"categories": [{"type": "ethereum_profile", "enabled": true, "requirements": {"requiresENS": false, "efpRequirements": [{"type": "minimum_followers", "value": "3", "description": ""}], "requiredERC20Tokens": [], "requiredERC1155Tokens": [], "requiredERC721Collections": []}}], "requireAny": true}}'),
(197,	'86326068-5e1f-41b4-ba39-213402bf3601',	'new up gated post',	'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"asdfasdfasdf"}]}]}',	'{}',	0,	2,	'2025-06-13 13:58:28.529214+00',	'2025-06-13 14:03:06.402978+00',	62,	'{"responsePermissions": {"categories": [{"type": "universal_profile", "enabled": true, "requirements": {"requiredTokens": [], "followerRequirements": [{"type": "followed_by", "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"}]}}], "requireAny": true}}');

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

ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."posts" ADD CONSTRAINT "posts_board_id_fkey" FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."pre_verifications" ADD CONSTRAINT "pre_verifications_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."pre_verifications" ADD CONSTRAINT "pre_verifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."telegram_groups" ADD CONSTRAINT "telegram_groups_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_source_comment_id_fkey" FOREIGN KEY (source_comment_id) REFERENCES comments(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_source_post_id_fkey" FOREIGN KEY (source_post_id) REFERENCES posts(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."telegram_notifications" ADD CONSTRAINT "telegram_notifications_telegram_group_id_fkey" FOREIGN KEY (telegram_group_id) REFERENCES telegram_groups(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."votes" ADD CONSTRAINT "votes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT DEFERRABLE;

-- 2025-06-13 15:43:46 UTC