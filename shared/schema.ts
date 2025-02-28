import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (keeping this from the original template)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Snapshot schema to store leaderboard snapshots
export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  description: text("description"),
});

export const insertSnapshotSchema = createInsertSchema(snapshots).pick({
  description: true,
});

export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Snapshot = typeof snapshots.$inferSelect;

// Agent schema to store individual agent data
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  mastodonUsername: text("mastodon_username").notNull(),
  score: integer("score").notNull(),
  prevScore: integer("prev_score"),
  avatarUrl: text("avatar_url"),
  city: text("city"),
  likesCount: integer("likes_count"),
  followersCount: integer("followers_count"),
  retweetsCount: integer("retweets_count"),
  repliesCount: integer("replies_count"),
  rank: integer("rank").notNull(),
  prevRank: integer("prev_rank"),
  walletAddress: text("wallet_address"),
  walletBalance: text("wallet_balance"),
  mastodonBio: text("mastodon_bio"),
  bioUpdatedAt: timestamp("bio_updated_at"),
  ubiClaimedAt: timestamp("ubi_claimed_at"),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Schema for agent tweets
export const tweets = pgTable("tweets", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  likesCount: integer("likes_count").notNull().default(0),
  retweetsCount: integer("retweets_count").notNull().default(0),
});

export const insertTweetSchema = createInsertSchema(tweets).omit({
  id: true,
});

export type InsertTweet = z.infer<typeof insertTweetSchema>;
export type Tweet = typeof tweets.$inferSelect;

// API response types
export const leaderboardEntrySchema = z.object({
  mastodonUsername: z.string(),
  score: z.number(),
  avatarURL: z.string().optional(),
  city: z.string().optional(),
  likesCount: z.number().optional(),
  followersCount: z.number().optional(),
  retweetsCount: z.number().optional(),
});

export const agentDetailsSchema = z.object({
  mastodonUsername: z.string(),
  mastodonBio: z.string().optional(),
  walletAddress: z.string().optional(),
  likesCount: z.number().optional(),
  followersCount: z.number().optional(),
  retweetsCount: z.number().optional(),
  repliesCount: z.number().optional(),
  walletBalance: z.string().optional(),
  score: z.number(),
  city: z.string().optional(),
  ubiClaimedAt: z.string().optional(),
  bioUpdatedAt: z.string().optional(),
  tweets: z.array(
    z.object({
      content: z.string(),
      timestamp: z.string(),
      likesCount: z.number().optional(),
      retweetsCount: z.number().optional(),
    })
  ).optional(),
});

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type AgentDetails = z.infer<typeof agentDetailsSchema>;
