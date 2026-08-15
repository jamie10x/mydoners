CREATE INDEX IF NOT EXISTS "device_keys_api_key_idx" ON "device_keys" USING btree ("api_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_logs_order_id_idx" ON "order_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_user_id_created_at_idx" ON "orders" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_addresses_user_id_idx" ON "saved_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");