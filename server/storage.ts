import { type User, type InsertUser, type UserVisit, type AnalysisResult, type InsertAnalysis, type DialogueMessage, type InsertDialogue, type ReferenceExample, type InsertReferenceExample, users, userVisits, analysisResults, dialogueMessages, referenceExamples } from "@shared/schema";
import { eq, desc, isNull, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL! });
const db = drizzle({ client: pool });

const PostgresSessionStore = connectPgSimple(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithGoogle(data: { username: string; googleId: string; email: string | null; displayName: string | null }): Promise<User>;
  updateUserGoogle(id: string, data: { googleId?: string; displayName?: string | null }): Promise<User>;
  addCreditsToUser(userId: string, credits: number): Promise<void>;

  recordVisit(userId: string, email: string | null): Promise<void>;
  getVisits(limit: number): Promise<UserVisit[]>;
  getVisitTimestampsSince(since: Date | null): Promise<string[]>;

  createAnalysis(analysis: InsertAnalysis & { userId?: string | null }): Promise<AnalysisResult>;
  getAnalysis(id: string): Promise<AnalysisResult | undefined>;
  updateAnalysisResults(id: string, results: any, status: string): Promise<void>;
  getUserAnalyses(userId: string): Promise<AnalysisResult[]>;

  createDialogueMessage(message: InsertDialogue): Promise<DialogueMessage>;
  getDialogueMessages(analysisId: string): Promise<DialogueMessage[]>;

  recordCreditPurchase(purchase: { userId: string; stripeSessionId: string; stripePaymentIntentId: string; amount: number; credits: number; status: string }): Promise<boolean>;
  getUserCreditPurchases(userId: string): Promise<any[]>;

  getReferenceExamples(analysisType?: string, exampleType?: string, questionId?: string): Promise<ReferenceExample[]>;
  addReferenceExample(example: InsertReferenceExample): Promise<ReferenceExample>;
  deleteReferenceExample(id: string): Promise<void>;
  listAllReferenceExamples(): Promise<ReferenceExample[]>;

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

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createUserWithGoogle(data: { username: string; googleId: string; email: string | null; displayName: string | null }): Promise<User> {
    const result = await db.insert(users).values({
      username: data.username,
      password: null,
      googleId: data.googleId,
      email: data.email,
      displayName: data.displayName,
    }).returning();
    return result[0];
  }

  async updateUserGoogle(id: string, data: { googleId?: string; displayName?: string | null }): Promise<User> {
    const result = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async addCreditsToUser(userId: string, credits: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      await db.update(users)
        .set({ credits: user.credits + credits })
        .where(eq(users.id, userId));
    }
  }

  async recordVisit(userId: string, email: string | null): Promise<void> {
    await db.insert(userVisits).values({ userId, email });
  }

  async getVisits(limit: number): Promise<UserVisit[]> {
    return await db.select().from(userVisits).orderBy(desc(userVisits.visitedAt)).limit(limit);
  }

  async getVisitTimestampsSince(since: Date | null): Promise<string[]> {
    const rows = since
      ? await db.select({ visitedAt: userVisits.visitedAt }).from(userVisits).where(gte(userVisits.visitedAt, since))
      : await db.select({ visitedAt: userVisits.visitedAt }).from(userVisits);
    return rows.map((r) => r.visitedAt?.toISOString() ?? new Date().toISOString());
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

  async getReferenceExamples(analysisType?: string, exampleType?: string, questionId?: string): Promise<ReferenceExample[]> {
    let query = db.select().from(referenceExamples).$dynamic();
    const conditions = [];
    if (analysisType) conditions.push(eq(referenceExamples.analysisType, analysisType));
    if (exampleType) conditions.push(eq(referenceExamples.exampleType, exampleType));
    if (questionId) conditions.push(eq(referenceExamples.questionId, questionId));
    if (conditions.length > 0) {
      const { and } = await import('drizzle-orm');
      query = query.where(and(...conditions) as any);
    }
    return await query.orderBy(referenceExamples.createdAt);
  }

  async addReferenceExample(example: InsertReferenceExample): Promise<ReferenceExample> {
    const result = await db.insert(referenceExamples).values(example).returning();
    return result[0];
  }

  async deleteReferenceExample(id: string): Promise<void> {
    await db.delete(referenceExamples).where(eq(referenceExamples.id, id));
  }

  async listAllReferenceExamples(): Promise<ReferenceExample[]> {
    return await db.select().from(referenceExamples).orderBy(desc(referenceExamples.createdAt));
  }

  async recordCreditPurchase(purchase: { userId: string; stripeSessionId: string; stripePaymentIntentId: string; amount: number; credits: number; status: string }): Promise<boolean> {
    const { creditPurchases } = await import("@shared/schema");

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
