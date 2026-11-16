CREATE TYPE "public"."track_kind" AS ENUM('manual', 'auto');--> statement-breakpoint
CREATE TABLE "segments" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"idx" integer NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"lang" text NOT NULL,
	"kind" "track_kind" NOT NULL,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"youtube_id" text NOT NULL,
	"title" text NOT NULL,
	"channel" text,
	"thumbnail" text,
	"duration_seconds" integer NOT NULL,
	"source_lang" text NOT NULL,
	"featured_rank" integer,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_track_id_video_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."video_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_tracks" ADD CONSTRAINT "video_tracks_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "segments_track_idx_uq" ON "segments" USING btree ("track_id","idx");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_video_lang_kind_uq" ON "video_tracks" USING btree ("video_id","lang","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "videos_youtube_id_uq" ON "videos" USING btree ("youtube_id");--> statement-breakpoint
CREATE INDEX "videos_featured_rank_idx" ON "videos" USING btree ("featured_rank");