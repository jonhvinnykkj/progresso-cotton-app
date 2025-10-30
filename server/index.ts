import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { env } from "./env";
import helmet from "helmet";
import cors from "cors";

// Validate environment variables on startup
console.log("✅ Environment variables validated successfully");

const app = express();

// Trust proxy - Required for Railway and other reverse proxies
// This enables Express to trust X-Forwarded-* headers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com", // Google Fonts
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'", // unsafe-eval needed for Vite in dev
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:", // Allow all HTTPS images (for Leaflet tiles, etc)
        "blob:",
      ],
      connectSrc: [
        "'self'",
        "https://progresso-cottonv2-production.up.railway.app", // API in production
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com", // Google Fonts
        "https://r2cdn.perplexity.ai", // Perplexity fonts
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"], // For Service Workers
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for Leaflet maps
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

// Setup routes and static serving
let server: any = null;

async function setupApp() {
  if (!server) {
    server = await registerRoutes(app);
    
    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  }
  return server;
}

// Initialize the app
setupApp();

// Export the app for Vercel
export default app;

// Start the server for local development
(async () => {
  const server = await setupApp();
  
  // Use Railway's PORT or default to 5000
  const PORT = parseInt(process.env.PORT || '5000', 10);
  const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  
  server.listen(PORT, HOST, () => {
    log(`🚀 Server running on http://${HOST}:${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
      log(`📱 Client running on http://localhost:3000`);
    }
  });
})();
