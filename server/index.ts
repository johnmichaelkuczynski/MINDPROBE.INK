import express, { type Request, Response, NextFunction } from "express";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

neonConfig.webSocketConstructor = ws;

const app = express();

// Stripe webhook needs raw body for signature verification - mount before JSON parser
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const SENSITIVE_KEYS = ["clientSecret", "client_secret", "paymentIntentId", "secret", "token"];
        const safeResponse = Object.fromEntries(
          Object.entries(capturedJsonResponse).map(([key, value]) =>
            SENSITIVE_KEYS.includes(key) ? [key, "[redacted]"] : [key, value]
          )
        );
        logLine += ` :: ${JSON.stringify(safeResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { seedReferenceExamples } = await import('./services/referenceStore');
  seedReferenceExamples().catch(e => console.error('[Startup] Reference seed failed:', e));

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Use the pre-built static frontend if it exists (production).
  // Fall back to Vite dev server only when there is no build (development).
  const builtFrontend = path.resolve(import.meta.dirname, "public", "index.html");
  if (fs.existsSync(builtFrontend)) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
