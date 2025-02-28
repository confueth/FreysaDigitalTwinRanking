CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"mastodon_username" text NOT NULL,
	"score" integer NOT NULL,
	"prev_score" integer,
	"avatar_url" text,
	"city" text,
	"likes_count" integer,
	"followers_count" integer,
	"retweets_count" integer,
	"replies_count" integer,
	"rank" integer NOT NULL,
	"prev_rank" integer,
	"wallet_address" text,
	"wallet_balance" text,
	"mastodon_bio" text,
	"bio_updated_at" timestamp,
	"ubi_claimed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "tweets" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"retweets_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;