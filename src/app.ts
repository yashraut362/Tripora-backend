import express from "express";
import type { NextFunction, Request, Response } from "express";
import { dbState } from "./db.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "Tripora API",
      endpoints: ["/health", "/api"],
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), db: dbState() });
  });

  app.use("/api", apiRouter);

  // Fallthrough: unknown route
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Central error handler — keep the 4-arg signature so Express picks it up.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
