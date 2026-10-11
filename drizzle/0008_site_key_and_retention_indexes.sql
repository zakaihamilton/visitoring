-- visitoring-migration: concurrent-index
CREATE INDEX CONCURRENTLY "site_events_created_at_idx" ON "site_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "sites_site_key_hash_unique" ON "sites" USING btree ("site_key_hash");
