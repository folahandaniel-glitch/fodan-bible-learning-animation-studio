CREATE TABLE "access_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"label" text NOT NULL,
	"purpose" text DEFAULT 'registration' NOT NULL,
	"role" text,
	"plan_id" uuid,
	"org_id" uuid,
	"class_level_slug" text,
	"grant_days" integer,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"ref_id" uuid NOT NULL,
	"title" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"due_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_marks" (
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "attendance_marks_session_id_student_id_pk" PRIMARY KEY("session_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"date" text NOT NULL,
	"taken_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_label" text,
	"actor_role" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"plane" text DEFAULT 'app' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"class_level_slug" text NOT NULL,
	"term_no" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort" integer NOT NULL,
	"stage" text NOT NULL,
	"age_band" text NOT NULL,
	"title" text NOT NULL,
	"overview" text NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"depth" text DEFAULT 'foundation' NOT NULL,
	"assessment_rubric" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parent_support" text DEFAULT '' NOT NULL,
	"teacher_prep" text DEFAULT '' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	CONSTRAINT "class_levels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"given_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"user_id" uuid,
	"kind" text NOT NULL,
	"credits" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "data_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" text NOT NULL,
	"template_key" text,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"status" text DEFAULT 'held' NOT NULL,
	"provider_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'event' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"location" text,
	"description" text DEFAULT '' NOT NULL,
	"registration_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer,
	"max_score" integer,
	"percent" integer,
	"needs_manual" boolean DEFAULT false NOT NULL,
	"auto_submitted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_responses" (
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer" jsonb,
	"flagged" boolean DEFAULT false NOT NULL,
	"correct" boolean,
	"marks" integer,
	"feedback" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_responses_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'practice' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"class_level_slug" text,
	"org_id" uuid,
	"group_id" uuid,
	"created_by" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"duration_min" integer DEFAULT 20 NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fixed_question_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shuffle_questions" boolean DEFAULT true NOT NULL,
	"shuffle_options" boolean DEFAULT true NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"release_results" text DEFAULT 'immediate' NOT NULL,
	"show_explanations" boolean DEFAULT true NOT NULL,
	"pass_mark" integer DEFAULT 50 NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"results_released" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_key" text NOT NULL,
	"class_level_slug" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"answered" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "group_students" (
	"group_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	CONSTRAINT "group_students_group_id_student_id_pk" PRIMARY KEY("group_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "group_teachers" (
	"group_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	CONSTRAINT "group_teachers_group_id_teacher_id_pk" PRIMARY KEY("group_id","teacher_id")
);
--> statement-breakpoint
CREATE TABLE "import_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"filename" text,
	"user_id" uuid,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"edited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid,
	"class_level_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"content_level" text DEFAULT 'framework' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_status" text DEFAULT 'unreviewed' NOT NULL,
	"origin" text DEFAULT 'authored' NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"publish_at" timestamp with time zone,
	"refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"memory_verse_ref" text,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"teacher_notes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"parent_notes" text DEFAULT '' NOT NULL,
	"prerequisite_id" uuid,
	"author_id" uuid,
	"reviewer_id" uuid,
	"editorial_notes" text DEFAULT '' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "logos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"collection" text DEFAULT 'CROP' NOT NULL,
	"ministry_slug" text,
	"kind" text NOT NULL,
	"variant" text DEFAULT 'light' NOT NULL,
	"mime" text NOT NULL,
	"svg" text,
	"asset_id" uuid,
	"builtin_path" text,
	"placements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_default_crop" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"mime" text NOT NULL,
	"filename" text NOT NULL,
	"data" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"source_url" text,
	"creator" text,
	"licence" text,
	"attribution" text,
	"permitted_use" text,
	"retrieved_at" timestamp with time zone,
	"generation_record" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"uploaded_by" uuid,
	"org_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ministry_wings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'wing' NOT NULL,
	"constituency" text DEFAULT '' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"vision" text DEFAULT '' NOT NULL,
	"mission" text DEFAULT '' NOT NULL,
	"activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audience" text DEFAULT '' NOT NULL,
	"logo_id" uuid,
	"image_asset_id" uuid,
	"contact_email" text,
	"registration_url" text,
	"accepts_registration" boolean DEFAULT false NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ministry_wings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'church' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"contact_email" text,
	"country" text,
	"logo_asset_id" uuid,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "page_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"type" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published" jsonb,
	"published_hidden" boolean,
	"published_sort" integer,
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'page' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"og_asset_id" uuid,
	"publish_at" timestamp with time zone,
	"show_in_nav" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "parent_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text DEFAULT 'reset' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"for_student_id" uuid,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_ref" text,
	"subscription_id" uuid,
	"verified_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"audience" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"interval_days" integer DEFAULT 30 NOT NULL,
	"period_label" text DEFAULT 'month' NOT NULL,
	"max_children" integer DEFAULT 1 NOT NULL,
	"max_seats" integer DEFAULT 1 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'mcq' NOT NULL,
	"text" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accepted_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rubric" text,
	"explanation" text DEFAULT '' NOT NULL,
	"ref" text,
	"class_level_slug" text,
	"class_min" integer,
	"class_max" integer,
	"topic" text,
	"lesson_id" uuid,
	"story_id" uuid,
	"difficulty" integer DEFAULT 2 NOT NULL,
	"objective" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"marks" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"image_asset_id" uuid,
	"source" text,
	"licence" text,
	"author_id" uuid,
	"reviewer_id" uuid,
	"org_id" uuid,
	"is_free" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"recent_auth_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mfa_ok" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"template_of_id" uuid,
	"testament" text DEFAULT 'OT' NOT NULL,
	"books" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"passage_ref" text NOT NULL,
	"class_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"genre" text DEFAULT 'narrative' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_status" text DEFAULT 'unreviewed' NOT NULL,
	"visibility" text DEFAULT 'members' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"scenes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"memory_verse_ref" text,
	"discussion" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"author_id" uuid,
	"org_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"cover_art" text,
	"cover_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "story_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"edited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"org_id" uuid,
	"plan_id" uuid,
	"plan_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"max_children" integer DEFAULT 1 NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payment_id" uuid,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"body" text NOT NULL,
	"consent_recorded" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"era" text NOT NULL,
	"sort" integer NOT NULL,
	"title" text NOT NULL,
	"ref" text NOT NULL,
	"summary" text NOT NULL,
	"people" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"places" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"date_label" text DEFAULT '' NOT NULL,
	"date_basis" text DEFAULT 'narrative' NOT NULL,
	"confidence" text DEFAULT '' NOT NULL,
	"theology" text DEFAULT '' NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lesson_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"art" text,
	"status" text DEFAULT 'published' NOT NULL,
	CONSTRAINT "timeline_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_level_id" uuid NOT NULL,
	"term_no" integer DEFAULT 1 NOT NULL,
	"sort" integer NOT NULL,
	"title" text NOT NULL,
	"primary_ref" text,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	CONSTRAINT "training_modules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "training_progress" (
	"user_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "training_progress_user_id_module_id_pk" PRIMARY KEY("user_id","module_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"username" text,
	"full_name" text NOT NULL,
	"display_name" text NOT NULL,
	"game_alias" text,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"org_id" uuid,
	"class_level_slug" text,
	"age_band" text,
	"phone" text,
	"relationship" text,
	"teaching_role" text,
	"link_code" text,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"deletion_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"scene" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"output_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid,
	"title" text NOT NULL,
	"stage" text DEFAULT 'script' NOT NULL,
	"script" text DEFAULT '' NOT NULL,
	"storyboard" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aspect" text DEFAULT '16:9' NOT NULL,
	"estimated_credits" integer DEFAULT 0 NOT NULL,
	"provider" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_key" text NOT NULL,
	"kind" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_keys" ADD CONSTRAINT "access_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_class_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_marks" ADD CONSTRAINT "attendance_marks_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_marks" ADD CONSTRAINT "attendance_marks_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_group_id_class_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_responses" ADD CONSTRAINT "exam_responses_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_responses" ADD CONSTRAINT "exam_responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_group_id_class_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teachers" ADD CONSTRAINT "group_teachers_group_id_class_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teachers" ADD CONSTRAINT "group_teachers_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_day_uq" ON "attendance_sessions" USING btree ("group_id","date");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cv_entity_idx" ON "content_versions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "attempts_user_idx" ON "exam_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_no_uq" ON "exam_attempts" USING btree ("exam_id","user_id","attempt_no");--> statement-breakpoint
CREATE INDEX "games_user_idx" ON "game_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "games_key_idx" ON "game_sessions" USING btree ("game_key");--> statement-breakpoint
CREATE INDEX "lessons_class_idx" ON "lessons" USING btree ("class_level_id");--> statement-breakpoint
CREATE INDEX "lessons_status_idx" ON "lessons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notif_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sections_page_idx" ON "page_sections" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parent_links_uq" ON "parent_links" USING btree ("parent_id","student_id");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "questions_class_idx" ON "questions" USING btree ("class_level_slug");--> statement-breakpoint
CREATE INDEX "questions_status_idx" ON "questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stories_status_idx" ON "stories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subs_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subs_org_idx" ON "subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "topics_class_idx" ON "topics" USING btree ("class_level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_linkcode_uq" ON "users" USING btree ("link_code");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_uq" ON "webhook_events" USING btree ("provider","event_key");