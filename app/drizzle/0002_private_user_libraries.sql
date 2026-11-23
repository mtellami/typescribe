DROP INDEX "videos_youtube_id_uq";--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "owner_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "videos_owner_youtube_id_uq" ON "videos" USING btree ("owner_id","youtube_id");