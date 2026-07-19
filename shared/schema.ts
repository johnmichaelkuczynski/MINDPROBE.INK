import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  credits: integer("credits").notNull().default(0),
  isUnlimited: boolean("is_unlimited").notNull().default(false),
});

export const analysisResults = pgTable("analysis_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  analysisType: text("analysis_type").notNull(),
  llmProvider: text("llm_provider").notNull(),
  inputText: text("input_text").notNull(),
  additionalContext: text("additional_context"),
  results: jsonb("results").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const dialogueMessages = pgTable("dialogue_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: varchar("analysis_id").references(() => analysisResults.id).notNull(),
  sender: text("sender").notNull(), // 'user' or 'system'
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripeSessionId: text("stripe_session_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  amount: integer("amount").notNull(),
  credits: integer("credits").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAnalysisSchema = createInsertSchema(analysisResults).pick({
  analysisType: true,
  llmProvider: true,
  inputText: true,
  additionalContext: true,
});

export const insertDialogueSchema = createInsertSchema(dialogueMessages).pick({
  analysisId: true,
  sender: true,
  message: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type DialogueMessage = typeof dialogueMessages.$inferSelect;
export type InsertDialogue = z.infer<typeof insertDialogueSchema>;
