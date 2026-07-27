ALTER TABLE "orders" ALTER COLUMN "cash_confirmation_code" SET DATA TYPE varchar(4);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" varchar(64);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key");