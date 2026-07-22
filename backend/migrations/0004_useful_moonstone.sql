CREATE TABLE IF NOT EXISTS "saved_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"label" varchar(50) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"landmark_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_addresses" ADD CONSTRAINT "saved_addresses_user_id_users_telegram_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("telegram_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "home_latitude";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "home_longitude";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "home_landmark_address";