CREATE TYPE "public"."file_policy" AS ENUM('enforced', 'default');--> statement-breakpoint
CREATE TYPE "public"."instance_role" AS ENUM('owner', 'manager', 'member');--> statement-breakpoint
CREATE TYPE "public"."mod_loader" AS ENUM('vanilla', 'fabric', 'forge', 'neoforge', 'quilt');--> statement-breakpoint
CREATE TABLE "instance_audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"instance_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(40) NOT NULL,
	"detail" varchar(600) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instance_files" (
	"instance_id" uuid NOT NULL,
	"path" varchar(512) NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"size" bigint NOT NULL,
	"policy" "file_policy" DEFAULT 'enforced' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instance_files_instance_id_path_pk" PRIMARY KEY("instance_id","path")
);
--> statement-breakpoint
CREATE TABLE "instance_invites" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"instance_id" uuid NOT NULL,
	"role" "instance_role" DEFAULT 'member' NOT NULL,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instance_members" (
	"instance_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "instance_role" DEFAULT 'member' NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instance_members_instance_id_user_id_pk" PRIMARY KEY("instance_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "instance_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"manifest" text NOT NULL,
	"signature" text NOT NULL,
	"restart_required" boolean NOT NULL,
	"grace_minutes" integer DEFAULT 5 NOT NULL,
	"notes" varchar(500) DEFAULT '' NOT NULL,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "private_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(60) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"minecraft_version" varchar(32) NOT NULL,
	"loader" "mod_loader" DEFAULT 'fabric' NOT NULL,
	"loader_version" varchar(64),
	"server_address" varchar(255),
	"locked_dirs" text[] DEFAULT ARRAY['mods']::text[] NOT NULL,
	"current_version" integer DEFAULT 0 NOT NULL,
	"dirty" boolean DEFAULT false NOT NULL,
	"quota_bytes" bigint DEFAULT 4294967296 NOT NULL,
	"owner_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instance_audit" ADD CONSTRAINT "instance_audit_instance_id_private_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."private_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_audit" ADD CONSTRAINT "instance_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_files" ADD CONSTRAINT "instance_files_instance_id_private_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."private_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_invites" ADD CONSTRAINT "instance_invites_instance_id_private_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."private_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_invites" ADD CONSTRAINT "instance_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_members" ADD CONSTRAINT "instance_members_instance_id_private_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."private_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_members" ADD CONSTRAINT "instance_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_members" ADD CONSTRAINT "instance_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_releases" ADD CONSTRAINT "instance_releases_instance_id_private_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."private_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_releases" ADD CONSTRAINT "instance_releases_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_instances" ADD CONSTRAINT "private_instances_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instance_audit_instance_idx" ON "instance_audit" USING btree ("instance_id","created_at");--> statement-breakpoint
CREATE INDEX "instance_invites_instance_idx" ON "instance_invites" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "instance_members_user_idx" ON "instance_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instance_releases_version_idx" ON "instance_releases" USING btree ("instance_id","version");