-- Adminer 5.2.1 PostgreSQL 15.12 dump

DROP TABLE IF EXISTS "communities";
CREATE TABLE "public"."communities" (
    "id" text NOT NULL,
    "title" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "logo_url" text,
    "current_plan_id" integer,
    "stripe_customer_id" text,
    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE UNIQUE INDEX communities_stripe_customer_id_key ON public.communities USING btree (stripe_customer_id);


DROP TABLE IF EXISTS "generated_images";
CREATE TABLE "public"."generated_images" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "community_id" text NOT NULL,
    "storage_url" text NOT NULL,
    "prompt_structured" jsonb NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "generated_images_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE UNIQUE INDEX generated_images_storage_url_key ON public.generated_images USING btree (storage_url);

CREATE INDEX idx_generated_images_user_created ON public.generated_images USING btree (user_id, created_at DESC);

CREATE INDEX idx_generated_images_community_public ON public.generated_images USING btree (community_id, is_public, created_at DESC) WHERE (is_public = true);


DROP TABLE IF EXISTS "onboarding_steps";
CREATE TABLE "public"."onboarding_steps" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "wizard_id" uuid NOT NULL,
    "step_type_id" uuid NOT NULL,
    "step_order" integer NOT NULL,
    "config" jsonb DEFAULT '{}' NOT NULL,
    "target_role_id" text,
    "is_mandatory" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "onboarding_steps_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX onboarding_steps_wizard_id_step_order_index ON public.onboarding_steps USING btree (wizard_id, step_order);

CREATE UNIQUE INDEX uniq_step_order_per_wizard ON public.onboarding_steps USING btree (wizard_id, step_order);


DROP TABLE IF EXISTS "onboarding_wizards";
CREATE TABLE "public"."onboarding_wizards" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "community_id" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "required_role_id" text,
    "assign_roles_per_step" boolean DEFAULT false NOT NULL,
    "is_hero" boolean DEFAULT false NOT NULL,
    CONSTRAINT "onboarding_wizards_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE UNIQUE INDEX uniq_wizard_name_per_community ON public.onboarding_wizards USING btree (community_id, name);

CREATE INDEX onboarding_wizards_community_id_index ON public.onboarding_wizards USING btree (community_id);

CREATE UNIQUE INDEX only_one_hero_wizard_per_community ON public.onboarding_wizards USING btree (community_id, is_hero) WHERE (is_hero = true);


DROP TABLE IF EXISTS "pgmigrations";
DROP SEQUENCE IF EXISTS pgmigrations_id_seq;
CREATE SEQUENCE pgmigrations_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."pgmigrations" (
    "id" integer DEFAULT nextval('pgmigrations_id_seq') NOT NULL,
    "name" character varying(255) NOT NULL,
    "run_on" timestamp NOT NULL,
    CONSTRAINT "pgmigrations_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "plan_limits";
CREATE TABLE "public"."plan_limits" (
    "plan_id" integer NOT NULL,
    "feature" feature_enum NOT NULL,
    "time_window" interval NOT NULL,
    "hard_limit" bigint NOT NULL,
    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("plan_id", "feature", "time_window")
) WITH (oids = false);


DROP TABLE IF EXISTS "plans";
DROP SEQUENCE IF EXISTS plans_id_seq;
CREATE SEQUENCE plans_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."plans" (
    "id" integer DEFAULT nextval('plans_id_seq') NOT NULL,
    "code" text NOT NULL,
    "name" text NOT NULL,
    "price_cents" integer DEFAULT '0' NOT NULL,
    "stripe_price_id" text,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE UNIQUE INDEX plans_code_key ON public.plans USING btree (code);

CREATE UNIQUE INDEX plans_stripe_price_id_key ON public.plans USING btree (stripe_price_id);


DROP TABLE IF EXISTS "sidequests";
CREATE TABLE "public"."sidequests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "onboarding_step_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "image_url" text,
    "sidequest_type" text NOT NULL,
    "content_payload" text NOT NULL,
    "display_order" integer DEFAULT '0' NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "sidequests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sidequests_sidequest_type_check" CHECK ((sidequest_type = ANY (ARRAY['youtube'::text, 'link'::text, 'markdown'::text])))
) WITH (oids = false);

CREATE INDEX sidequests_onboarding_step_id_index ON public.sidequests USING btree (onboarding_step_id);

CREATE UNIQUE INDEX sidequests_onboarding_step_id_display_order_unique_index ON public.sidequests USING btree (onboarding_step_id, display_order);


DROP TABLE IF EXISTS "step_types";
CREATE TABLE "public"."step_types" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "requires_credentials" boolean DEFAULT false NOT NULL,
    "description" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "label" text,
    CONSTRAINT "step_types_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE UNIQUE INDEX step_types_name_key ON public.step_types USING btree (name);


DROP TABLE IF EXISTS "usage_events";
DROP SEQUENCE IF EXISTS usage_events_id_seq;
CREATE SEQUENCE usage_events_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

CREATE TABLE "public"."usage_events" (
    "id" integer DEFAULT nextval('usage_events_id_seq') NOT NULL,
    "community_id" text NOT NULL,
    "user_id" text NOT NULL,
    "feature" feature_enum NOT NULL,
    "occurred_at" timestamptz DEFAULT now() NOT NULL,
    "idempotency_key" text,
    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE UNIQUE INDEX usage_events_idempotency_key_key ON public.usage_events USING btree (idempotency_key);

CREATE INDEX idx_usage_events_community_feature_time ON public.usage_events USING btree (community_id, feature, occurred_at);


DROP TABLE IF EXISTS "user_linked_credentials";
CREATE TABLE "public"."user_linked_credentials" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "platform" platform_enum NOT NULL,
    "external_id" text NOT NULL,
    "username" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "user_linked_credentials_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE UNIQUE INDEX uniq_user_platform ON public.user_linked_credentials USING btree (user_id, platform);

CREATE UNIQUE INDEX uniq_platform_id ON public.user_linked_credentials USING btree (platform, external_id);

CREATE INDEX user_linked_credentials_user_id_index ON public.user_linked_credentials USING btree (user_id);

CREATE INDEX user_linked_credentials_platform_external_id_index ON public.user_linked_credentials USING btree (platform, external_id);


DROP TABLE IF EXISTS "user_profiles";
CREATE TABLE "public"."user_profiles" (
    "user_id" text NOT NULL,
    "username" text,
    "profile_picture_url" text,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
) WITH (oids = false);


DROP TABLE IF EXISTS "user_wizard_completions";
CREATE TABLE "public"."user_wizard_completions" (
    "user_id" text NOT NULL,
    "wizard_id" uuid NOT NULL,
    "completed_at" timestamptz DEFAULT now() NOT NULL,
    "version" integer DEFAULT '1' NOT NULL,
    CONSTRAINT "user_wizard_completions_pkey" PRIMARY KEY ("user_id", "wizard_id")
) WITH (oids = false);

CREATE INDEX user_wizard_completions_user_id_index ON public.user_wizard_completions USING btree (user_id);

CREATE INDEX user_wizard_completions_wizard_id_index ON public.user_wizard_completions USING btree (wizard_id);


DROP TABLE IF EXISTS "user_wizard_progress";
CREATE TABLE "public"."user_wizard_progress" (
    "user_id" text NOT NULL,
    "wizard_id" uuid NOT NULL,
    "step_id" uuid NOT NULL,
    "verified_data" jsonb,
    "completed_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "user_wizard_progress_pkey" PRIMARY KEY ("user_id", "wizard_id", "step_id")
) WITH (oids = false);

CREATE INDEX user_wizard_progress_user_id_wizard_id_index ON public.user_wizard_progress USING btree (user_id, wizard_id);


DROP TABLE IF EXISTS "user_wizard_sessions";
CREATE TABLE "public"."user_wizard_sessions" (
    "user_id" text NOT NULL,
    "wizard_id" uuid NOT NULL,
    "last_viewed_step_id" uuid NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "user_wizard_sessions_pkey" PRIMARY KEY ("user_id", "wizard_id")
) WITH (oids = false);

CREATE INDEX user_wizard_sessions_user_id_index ON public.user_wizard_sessions USING btree (user_id);

CREATE INDEX user_wizard_sessions_wizard_id_index ON public.user_wizard_sessions USING btree (wizard_id);

CREATE INDEX user_wizard_sessions_last_viewed_step_id_index ON public.user_wizard_sessions USING btree (last_viewed_step_id);


ALTER TABLE ONLY "public"."communities" ADD CONSTRAINT "fk_communities_plan" FOREIGN KEY (current_plan_id) REFERENCES plans(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."generated_images" ADD CONSTRAINT "generated_images_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."onboarding_steps" ADD CONSTRAINT "onboarding_steps_step_type_id_fkey" FOREIGN KEY (step_type_id) REFERENCES step_types(id) ON DELETE RESTRICT NOT DEFERRABLE;
ALTER TABLE ONLY "public"."onboarding_steps" ADD CONSTRAINT "onboarding_steps_wizard_id_fkey" FOREIGN KEY (wizard_id) REFERENCES onboarding_wizards(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."onboarding_wizards" ADD CONSTRAINT "onboarding_wizards_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."plan_limits" ADD CONSTRAINT "plan_limits_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."sidequests" ADD CONSTRAINT "sidequests_onboarding_step_id_fkey" FOREIGN KEY (onboarding_step_id) REFERENCES onboarding_steps(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_wizard_completions" ADD CONSTRAINT "user_wizard_completions_wizard_id_fkey" FOREIGN KEY (wizard_id) REFERENCES onboarding_wizards(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_wizard_progress" ADD CONSTRAINT "user_wizard_progress_step_id_fkey" FOREIGN KEY (step_id) REFERENCES onboarding_steps(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."user_wizard_progress" ADD CONSTRAINT "user_wizard_progress_wizard_id_fkey" FOREIGN KEY (wizard_id) REFERENCES onboarding_wizards(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_wizard_sessions" ADD CONSTRAINT "user_wizard_sessions_last_viewed_step_id_fkey" FOREIGN KEY (last_viewed_step_id) REFERENCES onboarding_steps(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."user_wizard_sessions" ADD CONSTRAINT "user_wizard_sessions_wizard_id_fkey" FOREIGN KEY (wizard_id) REFERENCES onboarding_wizards(id) ON DELETE CASCADE NOT DEFERRABLE;

-- 2025-05-10 10:24:26 UTC