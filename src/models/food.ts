import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface FoodPlace {
  name: string;
  kind: string;
  description: string;
  mustTry: string;
  mapsQuery: string;
  lat?: number;
  lng?: number;
  tags: string[];
  photoUrl?: string;
}

export interface FoodGuideFields {
  tripId: string;
  userId: string;
  places: FoodPlace[];
}

export type FoodGuideDoc = HydratedDocument<FoodGuideFields>;

const placeSchema = new Schema<FoodPlace>(
  {
    name: { type: String, required: true },
    kind: { type: String, required: true },
    description: { type: String, required: true },
    mustTry: { type: String, required: true },
    mapsQuery: { type: String, required: true },
    lat: Number,
    lng: Number,
    tags: { type: [String], default: [] },
    photoUrl: String,
  },
  { _id: false },
);

const foodGuideSchema = new Schema<FoodGuideFields>(
  {
    tripId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    places: { type: [placeSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const FoodGuide = model("FoodGuide", foodGuideSchema);
