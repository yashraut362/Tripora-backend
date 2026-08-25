import { Router } from "express";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({ name: "Tripora API", version: 1 });
});

// Future routers mount here, e.g.:
// apiRouter.use("/trips", tripsRouter);
