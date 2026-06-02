CREATE TYPE "public"."audit_actor" AS ENUM('user', 'system', 'admin');--> statement-breakpoint
CREATE TYPE "public"."evaluation_kind" AS ENUM('wallet_activity', 'governance', 'contribution', 'endorsement', 'sybil_check', 'full_recompute');--> statement-breakpoint
CREATE TYPE "public"."sybil_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."trust_category" AS ENUM('unverified', 'emerging', 'trusted', 'eminent');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor" "audit_actor" NOT NULL,
	"actor_id" text,
	"action" varchar(80) NOT NULL,
	"target" varchar(120),
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticator_userId_credentialID_pk" PRIMARY KEY("userId","credentialID"),
	CONSTRAINT "authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contribution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"source" varchar(32) NOT NULL,
	"reference_url" text,
	"title" varchar(240),
	"summary" text,
	"ai_quality" integer,
	"ai_explanation" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "endorsement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_profile" uuid NOT NULL,
	"to_profile" uuid NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"note" text,
	"onchain_tx_hash" varchar(80),
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" "evaluation_kind" NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"ai_model" varchar(80),
	"ai_explanation" text,
	"confidence" numeric(4, 3),
	"score_delta" integer DEFAULT 0 NOT NULL,
	"onchain_tx_hash" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "governance_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"dao_name" varchar(120) NOT NULL,
	"proposal_id" varchar(120) NOT NULL,
	"role" varchar(32) NOT NULL,
	"decision" varchar(32),
	"quality_score" integer,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nft_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"token_id" varchar(80),
	"name" varchar(120) NOT NULL,
	"description" text,
	"image_url" text,
	"metadata_url" text,
	"tier" varchar(32),
	"onchain_tx_hash" varchar(80),
	"minted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" varchar(64) NOT NULL,
	"chain" varchar(32) DEFAULT 'genlayer' NOT NULL,
	"display_name" varchar(80),
	"bio" text,
	"avatar_url" text,
	"score" integer DEFAULT 0 NOT NULL,
	"confidence" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"category" "trust_category" DEFAULT 'unverified' NOT NULL,
	"onchain_contract" varchar(64),
	"onchain_tx_hash" varchar(80),
	"last_evaluated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "score_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "score_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"profile_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"category" "trust_category" NOT NULL,
	"delta" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"breakdown" jsonb,
	"evaluation_id" uuid,
	"onchain_tx_hash" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sybil_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"severity" "sybil_severity" NOT NULL,
	"reason" text NOT NULL,
	"evidence" jsonb,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp with time zone,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"address" varchar(64) NOT NULL,
	"chain" varchar(32) DEFAULT 'genlayer' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "authenticator" ADD CONSTRAINT "authenticator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contribution" ADD CONSTRAINT "contribution_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endorsement" ADD CONSTRAINT "endorsement_from_profile_profile_id_fk" FOREIGN KEY ("from_profile") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endorsement" ADD CONSTRAINT "endorsement_to_profile_profile_id_fk" FOREIGN KEY ("to_profile") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "governance_record" ADD CONSTRAINT "governance_record_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nft_credential" ADD CONSTRAINT "nft_credential_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "score_history" ADD CONSTRAINT "score_history_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sybil_flag" ADD CONSTRAINT "sybil_flag_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "audit_log" USING btree ("actor","actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contribution_profile_idx" ON "contribution" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contribution_source_idx" ON "contribution" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endorsement_from_idx" ON "endorsement" USING btree ("from_profile");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endorsement_to_idx" ON "endorsement" USING btree ("to_profile");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "endorsement_pair_uidx" ON "endorsement" USING btree ("from_profile","to_profile");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evaluation_profile_idx" ON "evaluation" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evaluation_kind_idx" ON "evaluation" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gov_profile_idx" ON "governance_record" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gov_dao_idx" ON "governance_record" USING btree ("dao_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nft_profile_idx" ON "nft_credential" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profile_address_chain_uidx" ON "profile" USING btree ("address","chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_score_idx" ON "profile" USING btree ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_history_profile_idx" ON "score_history" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_history_created_idx" ON "score_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sybil_profile_idx" ON "sybil_flag" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sybil_severity_idx" ON "sybil_flag" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_address_chain_uidx" ON "wallet" USING btree ("address","chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_user_idx" ON "wallet" USING btree ("user_id");