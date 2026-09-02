import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { isValidObjectId } from "mongoose";
import { editItinerary, generateItinerary } from "../ai.js";
import { auth } from "../auth.js";
import { Itinerary } from "../models/itinerary.js";
import type { ItineraryDoc } from "../models/itinerary.js";
import { serializeTrip, Trip } from "../models/trip.js";
import type { TripDoc } from "../models/trip.js";
import { placePhotoUrl, withStopPhotos } from "../places.js";

interface TripInput {
  destination: string;
  days: number;
  budget?: number | null;
  activities?: string[];
  notes?: string;
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
    notes: trip.notes,
  })
    .then(async (generated) => {
      const days = await withStopPhotos(generated.days, trip.destination);
      return Itinerary.findOneAndUpdate(
        { tripId: trip.id as string },
        { userId: trip.userId, intro: generated.intro, days },
        { upsert: true },
      );
    })
    .catch((err: unknown) => {
      console.error(
        "Itinerary generation failed:",
        err instanceof Error ? err.message : err,
      );
    });
}

function storeTripImage(trip: TripDoc) {
  void placePhotoUrl(trip.destination)
    .then((imageUrl) => {
      if (imageUrl) return Trip.updateOne({ _id: trip.id }, { imageUrl });
    })
    .catch((err: unknown) => {
      console.error(
        "Trip image fetch failed:",
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
    notes = "",
  } = req.body as TripInput;
  const trip = await Trip.create({
    destination,
    days,
    budget,
    activities,
    notes,
    userId: res.locals.userId,
  });
  res.status(201).json(serializeTripDetail(trip, null));
  generateAndStore(trip);
  storeTripImage(trip);
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
    notes = "",
  } = req.body as TripInput;
  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: res.locals.userId,
  });
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const needsImage = destination !== trip.destination || !trip.imageUrl;
  trip.destination = destination;
  trip.days = days;
  trip.budget = budget;
  trip.activities = activities;
  trip.notes = notes;
  await trip.save();
  await Itinerary.deleteOne({ tripId: trip.id as string });
  res.json(serializeTripDetail(trip, null));
  generateAndStore(trip);
  if (needsImage) storeTripImage(trip);
});

tripsRouter.post("/:id/edit", async (req, res) => {
  const { message } = req.body as { message: string };
  const trip = await Trip.findOne({
    _id: req.params.id,
    userId: res.locals.userId,
  });
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const current = await Itinerary.findOne({ tripId: trip.id as string });
  const edited = await editItinerary(
    {
      destination: trip.destination,
      days: trip.days,
      budget: trip.budget,
      activities: trip.activities,
      notes: trip.notes,
    },
    { intro: current?.intro ?? "", days: current?.days ?? [] },
    message,
  );
  const days = await withStopPhotos(
    edited.days,
    trip.destination,
    current?.days ?? [],
  );
  const itinerary = await Itinerary.findOneAndUpdate(
    { tripId: trip.id as string },
    { userId: res.locals.userId, intro: edited.intro, days },
    { new: true, upsert: true },
  );
  res.json({ ...serializeTripDetail(trip, itinerary), note: edited.note });
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
