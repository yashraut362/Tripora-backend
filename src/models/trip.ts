import { model, Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";

export interface TripFields {
  userId: string;
  destination: string;
  days: number;
  budget: number | null;
  activities: string[];
}

export type TripDoc = HydratedDocument<TripFields>;

const tripSchema = new Schema<TripFields>(
  {
    userId: { type: String, required: true, index: true },
    destination: { type: String, required: true, trim: true },
    days: { type: Number, required: true, min: 1, max: 30 },
    budget: { type: Number, default: null },
    activities: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const Trip = model("Trip", tripSchema);

export function serializeTrip(trip: TripDoc) {
  return {
    id: trip.id as string,
    destination: trip.destination,
    days: trip.days,
    budget: trip.budget,
    activities: trip.activities,
  };
}
