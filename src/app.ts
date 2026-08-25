import express from "express";
import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import mongoose from "mongoose";
import { auth } from "./auth.js";
import { tripsRouter } from "./routes/trips.js";

export function createApp() {
  const app = express();

  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "Tripora API",
      endpoints: ["/health", "/api/auth", "/api/me", "/api/trips"],
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
  });

  app.get("/api/me", async (req, res) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    res.json(session);
  });

  app.use("/api/trips", tripsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
