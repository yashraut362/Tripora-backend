import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { isValidObjectId } from "mongoose";
import { auth } from "../auth.js";
import { serializeTrip, Trip } from "../models/trip.js";

interface TripInput {
  destination: string;
  days: number;
  budget?: number | null;
  activities?: string[];
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.locals.userId = session.user.id;
  next();
}

export const tripsRouter = Router();

tripsRouter.use(requireAuth);

tripsRouter.get("/", async (_req, res) => {
  const trips = await Trip.find({ userId: res.locals.userId }).sort({
    createdAt: 1,
  });
  res.json(trips.map(serializeTrip));
});

tripsRouter.post("/", async (req, res) => {
  const {
    destination,
    days,
    budget = null,
    activities = [],
  } = req.body as TripInput;
  const trip = await Trip.create({
    destination,
    days,
    budget,
    activities,
    userId: res.locals.userId,
  });
  res.status(201).json(serializeTrip(trip));
});

tripsRouter.get("/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: res.locals.userId,
  });
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(serializeTrip(trip));
});

tripsRouter.put("/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const {
    destination,
    days,
    budget = null,
    activities = [],
  } = req.body as TripInput;
  const trip = await Trip.findOneAndUpdate(
    { _id: req.params.id, userId: res.locals.userId },
    { destination, days, budget, activities },
    { new: true, runValidators: true },
  );
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(serializeTrip(trip));
});

tripsRouter.delete("/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const trip = await Trip.findOneAndDelete({
    _id: req.params.id,
    userId: res.locals.userId,
  });
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.status(204).end();
});
