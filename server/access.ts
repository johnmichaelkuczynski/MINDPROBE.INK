import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express } from "express";
import type { User } from "@shared/schema";
import { storage } from "./storage";
import pg from "pg";
import { randomUUID } from "crypto";

declare module "express-session" {
  interface SessionData {
    visitorUserId?: string;
    visitRecorded?: boolean;
  }
}

declare global {
  namespace Express {
    interface Request {
      visitorUser?: User;
    }
  }
}

export function setupAnonymousAccess(app: Express) {
  app.set("trust proxy", 1);

  const PgSession = connectPgSimple(session);
  const pool = new pg.Pool({
    connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  pool.on("error", (error) => {
    console.error("Anonymous session pool error:", error);
  });

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
        errorLog: console.error.bind(console, "Anonymous session store error:"),
      }),
      secret: process.env.SESSION_SECRET || "mindprobe-session-secret-dev-only",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction || !!process.env.REPLIT_DEV_DOMAIN,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use(async (req, _res, next) => {
    const needsVisitorIdentity = req.path === "/" || req.path.startsWith("/api/");
    if (!needsVisitorIdentity) {
      return next();
    }

    try {
      let visitor = req.session.visitorUserId
        ? await storage.getUserById(req.session.visitorUserId)
        : undefined;

      if (!visitor) {
        visitor = await storage.createAnonymousUser(`visitor_${randomUUID()}`);
        req.session.visitorUserId = visitor.id;
      }

      req.visitorUser = visitor;

      if (!req.session.visitRecorded) {
        await storage.recordVisit(visitor.id, null);
        req.session.visitRecorded = true;
      }

      next();
    } catch (error) {
      console.error("Anonymous visitor initialization failed:", error);
      next(error);
    }
  });

  app.get("/api/visitor-count", async (_req, res) => {
    try {
      res.json({ count: await storage.getVisitCount() });
    } catch (error) {
      console.error("Visitor count error:", error);
      res.status(500).json({ error: "Failed to load visitor count" });
    }
  });

  app.get("/api/admin/visits", async (_req, res) => {
    try {
      const now = Date.now();
      const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

      const [visitList, allTimestamps] = await Promise.all([
        storage.getVisits(500),
        storage.getVisitTimestampsSince(null),
      ]);

      const times = allTimestamps.map((timestamp) => new Date(timestamp).getTime());
      const stats = {
        allTime: times.length,
        last24Hours: times.filter((time) => time >= dayAgo.getTime()).length,
        lastMonth: times.filter((time) => time >= monthAgo.getTime()).length,
        lastYear: times.filter((time) => time >= yearAgo.getTime()).length,
      };

      const buildSeries = (
        start: number,
        bucketMs: number,
        buckets: number,
        labelFn: (date: Date) => string,
      ) => {
        const counts = new Array(buckets).fill(0);
        for (const time of times) {
          if (time >= start) {
            const index = Math.min(Math.floor((time - start) / bucketMs), buckets - 1);
            counts[index]++;
          }
        }
        return counts.map((count, index) => ({
          label: labelFn(new Date(start + index * bucketMs)),
          count,
        }));
      };

      const HOUR = 60 * 60 * 1000;
      const DAY = 24 * HOUR;
      const series = {
        last24Hours: buildSeries(now - 24 * HOUR, HOUR, 24, (date) =>
          date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })),
        lastMonth: buildSeries(now - 30 * DAY, DAY, 30, (date) =>
          date.toLocaleDateString("en-US", { month: "short", day: "numeric" })),
        lastYear: buildSeries(now - 365 * DAY, (365 / 12) * DAY, 12, (date) =>
          date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })),
        allTime: (() => {
          const earliest = times.length ? Math.min(...times) : now;
          const span = Math.max(now - earliest, DAY);
          const buckets = Math.min(24, Math.max(6, Math.ceil(span / (30 * DAY))));
          return buildSeries(earliest, span / buckets, buckets, (date) =>
            date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "2-digit",
            }));
        })(),
      };

      res.json({
        stats,
        series,
        visits: visitList.map((visit) => ({
          id: visit.id,
          email: visit.email,
          visitedAt: visit.visitedAt,
        })),
      });
    } catch (error) {
      console.error("Visitor analytics error:", error);
      res.status(500).json({ error: "Failed to load visitor data" });
    }
  });
}