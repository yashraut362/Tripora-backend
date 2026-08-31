import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { isValidObjectId } from "mongoose";
import { generateItinerary } from "../ai.js";
import { auth } from "../auth.js";
import { Itinerary } from "../models/itinerary.js";
import type { ItineraryDoc } from "../models/itinerary.js";
import { serializeTrip, Trip } from "../models/trip.js";
import type { TripDoc } from "../models/trip.js";

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

function generateAndStore(trip: TripDoc) {
  void generateItinerary({
    destination: trip.destination,
    days: trip.days,
    budget: trip.budget,
    activities: trip.activities,
  })
    .then((generated) =>
      Itinerary.findOneAndUpdate(
        { tripId: trip.id as string },
        { userId: trip.userId, intro: generated.intro, days: generated.days },
        { upsert: true },
      ),
    )
    .catch((err: unknown) => {
      console.error(
        "Itinerary generation failed:",
        err instanceof Error ? err.message : err,
      );
    });
}

function serializeTripDetail(trip: TripDoc, itinerary: ItineraryDoc | null) {
  return {
    ...serializeTrip(trip),
    intro: itinerary?.intro ?? "",
    itinerary: itinerary?.days ?? [],
  };
}

export const tripsRouter = Router();

tripsRouter.use(requireAuth);

tripsRouter.param("id", (_req, res, next, id) => {
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  next();
});

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
  res.status(201).json(serializeTripDetail(trip, null));
  generateAndStore(trip);
});

tripsRouter.get("/:id", async (req, res) => {
  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: res.locals.userId,
  });
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const itinerary = await Itinerary.findOne({ tripId: trip.id as string });
  res.json(serializeTripDetail(trip, itinerary));
});

tripsRouter.put("/:id", async (req, res) => {
  const {
    destination,
    days,
    budget = null,
    activities = [],
  } = req.body as TripInput;
  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: res.locals.userId,
  });
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  trip.destination = destination;
  trip.days = days;
  trip.budget = budget;
  trip.activities = activities;
  await trip.save();
  await Itinerary.deleteOne({ tripId: trip.id as string });
  res.json(serializeTripDetail(trip, null));
  generateAndStore(trip);
});

tripsRouter.delete("/:id", async (req, res) => {
  const trip = await Trip.findOneAndDelete({
    _id: req.params.id,
    userId: res.locals.userId,
  });
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  await Itinerary.deleteOne({ tripId: trip.id as string });
  res.status(204).end();
});
