ALTER TABLE "orders" ADD COLUMN "status_message_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rated_at" timestamp with time zone;