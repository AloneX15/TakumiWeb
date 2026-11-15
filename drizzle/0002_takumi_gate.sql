CREATE TABLE "instance_tickets" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"instance_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mc_uuid" varchar(32) NOT NULL,
	"mc_name" varchar(16) NOT NULL,
	"version" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "private_instances" ADD COLUMN "gate_key_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "private_instances" ADD COLUMN "gate_key_hint" varchar(8);--> statement-breakpoint
ALTER TABLE "instance_tickets" ADD CONSTRAINT "instance_tickets_instance_id_private_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."private_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_tickets" ADD CONSTRAINT "instance_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instance_tickets_expires_idx" ON "instance_tickets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "instance_tickets_user_idx" ON "instance_tickets" USING btree ("instance_id","user_id");--> statement-breakpoint
ALTER TABLE "private_instances" ADD CONSTRAINT "private_instances_gate_key_hash_unique" UNIQUE("gate_key_hash");