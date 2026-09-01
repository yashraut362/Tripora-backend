import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface ItineraryStop {
  slot: "Morning" | "Afternoon" | "Evening";
  title: string;
  detail: string;
  mapsQuery: string;
  lat?: number;
  lng?: number;
  tips?: string;
}

export interface ItineraryDay {
  day: number;
  theme: string;
  stops: ItineraryStop[];
}

export interface ItineraryFields {
  tripId: string;
  userId: string;
  intro: string;
  days: ItineraryDay[];
}

export type ItineraryDoc = HydratedDocument<ItineraryFields>;

const stopSchema = new Schema<ItineraryStop>(
  {
    slot: {
      type: String,
      enum: ["Morning", "Afternoon", "Evening"],
      required: true,
    },
    title: { type: String, required: true },
    detail: { type: String, required: true },
    mapsQuery: { type: String, required: true },
    lat: Number,
    lng: Number,
    tips: String,
  },
  { _id: false },
);

const daySchema = new Schema<ItineraryDay>(
  {
    day: { type: Number, required: true },
    theme: { type: String, required: true },
    stops: { type: [stopSchema], default: [] },
  },
  { _id: false },
);

const itinerarySchema = new Schema<ItineraryFields>(
  {
    tripId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    intro: { type: String, default: "" },
    days: { type: [daySchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const Itinerary = model("Itinerary", itinerarySchema);
