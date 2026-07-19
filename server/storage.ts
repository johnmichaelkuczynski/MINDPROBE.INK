import { type User, type InsertUser, type AnalysisResult, type InsertAnalysis, type DialogueMessage, type InsertDialogue, users, analysisResults, dialogueMessages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle({ client: pool });

const PostgresSessionStore = connectPgSimple(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  addCreditsToUser(userId: string, credits: number): Promise<void>;
  
  createAnalysis(analysis: InsertAnalysis & { userId?: string | null }): Promise<AnalysisResult>;
  getAnalysis(id: string): Promise<AnalysisResult | undefined>;
  updateAnalysisResults(id: string, results: any, status: string): Promise<void>;
  getUserAnalyses(userId: string): Promise<AnalysisResult[]>;
  
  createDialogueMessage(message: InsertDialogue): Promise<DialogueMessage>;
  getDialogueMessages(analysisId: string): Promise<DialogueMessage[]>;
  
  recordCreditPurchase(purchase: { userId: string; stripeSessionId: string; stripePaymentIntentId: string; amount: number; credits: number; status: string }): Promise<boolean>;
  getUserCreditPurchases(userId: string): Promise<any[]>;
  
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createAnalysis(insertAnalysis: InsertAnalysis & { userId?: string | null }): Promise<AnalysisResult> {
    const result = await db.insert(analysisResults).values({
      ...insertAnalysis,
      userId: insertAnalysis.userId || null,
      results: {},
      status: "pending"
    }).returning();
    return result[0];
  }

  async getAnalysis(id: string): Promise<AnalysisResult | undefined> {
    const result = await db.select().from(analysisResults).where(eq(analysisResults.id, id)).limit(1);
    return result[0];
  }

  async updateAnalysisResults(id: string, results: any, status: string): Promise<void> {
    await db.update(analysisResults)
      .set({ 
        results, 
        status,
        completedAt: status === "completed" ? new Date() : undefined
      })
      .where(eq(analysisResults.id, id));
  }

  async getUserAnalyses(userId: string): Promise<AnalysisResult[]> {
    return await db.select().from(analysisResults).where(eq(analysisResults.userId, userId));
  }

  async createDialogueMessage(insertMessage: InsertDialogue): Promise<DialogueMessage> {
    const result = await db.insert(dialogueMessages).values(insertMessage).returning();
    return result[0];
  }

  async getDialogueMessages(analysisId: string): Promise<DialogueMessage[]> {
    return await db.select().from(dialogueMessages).where(eq(dialogueMessages.analysisId, analysisId));
  }

  async addCreditsToUser(userId: string, credits: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      await db.update(users)
        .set({ credits: user.credits + credits })
        .where(eq(users.id, userId));
    }
  }

  async recordCreditPurchase(purchase: { userId: string; stripeSessionId: string; stripePaymentIntentId: string; amount: number; credits: number; status: string }): Promise<boolean> {
    const { creditPurchases } = await import("@shared/schema");
    
    // Check if already processed (idempotency)
    const existing = await db.select().from(creditPurchases)
      .where(eq(creditPurchases.stripePaymentIntentId, purchase.stripePaymentIntentId))
      .limit(1);
    
    if (existing.length > 0) {
      console.log(`Payment ${purchase.stripePaymentIntentId} already processed, skipping`);
      return false;
    }

    await db.insert(creditPurchases).values({
      userId: purchase.userId,
      stripeSessionId: purchase.stripeSessionId,
      stripePaymentIntentId: purchase.stripePaymentIntentId,
      amount: purchase.amount,
      credits: purchase.credits,
      status: purchase.status
    });
    
    return true;
  }

  async getUserCreditPurchases(userId: string): Promise<any[]> {
    const { creditPurchases } = await import("@shared/schema");
    return await db.select().from(creditPurchases).where(eq(creditPurchases.userId, userId));
  }
}

export const storage = new DatabaseStorage();
