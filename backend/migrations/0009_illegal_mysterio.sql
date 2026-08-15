ALTER TABLE "orders" ADD COLUMN "courier_live_message_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "courier_live_started_at" timestamp with time zone;