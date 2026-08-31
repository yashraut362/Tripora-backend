import OpenAI from "openai";
import type { ItineraryDay } from "./models/itinerary.js";

export interface GeneratedItinerary {
  intro: string;
  days: ItineraryDay[];
}

export interface TripInfo {
  destination: string;
  days: number;
  budget: number | null;
  activities: string[];
}

const ITINERARY_SCHEMA = {
  type: "object",
  properties: {
    intro: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "integer" },
          theme: { type: "string" },
          stops: {
            type: "array",
            items: {
              type: "object",
              properties: {
                slot: {
                  type: "string",
                  enum: ["Morning", "Afternoon", "Evening"],
                },
                title: { type: "string" },
                detail: { type: "string" },
                mapsQuery: { type: "string" },
                lat: { type: "number" },
                lng: { type: "number" },
              },
              required: ["slot", "title", "detail", "mapsQuery", "lat", "lng"],
              additionalProperties: false,
            },
          },
        },
        required: ["day", "theme", "stops"],
        additionalProperties: false,
      },
    },
  },
  required: ["intro", "days"],
  additionalProperties: false,
};

const INSTRUCTIONS = [
  "You are an expert travel planner for Tripora, a friendly trip planning app.",
  "Plan a day-by-day itinerary for the trip the user describes.",
  "Return exactly one entry per day, numbered from 1, each with a short punchy theme and exactly three stops: Morning, Afternoon, Evening.",
  "Recommend real, specific, well-known places in or near the destination.",
  "mapsQuery is a concise Google Maps search for the stop's place (name plus area if needed); never include the destination itself, it gets appended automatically.",
  "lat and lng are the place's approximate latitude and longitude as decimal numbers.",
  "detail is one or two warm, friendly sentences with a practical tip.",
  "Weight the plan toward the trip's chosen activities and keep suggestions realistic for the total budget.",
  "intro is one warm sentence describing the trip, under 20 words.",
].join(" ");

export async function generateItinerary(
  trip: TripInfo,
): Promise<GeneratedItinerary> {
  const response = await new OpenAI().responses.create({
    model: "gpt-5-mini",
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      destination: trip.destination,
      totalDays: trip.days,
      totalBudgetUsd: trip.budget,
      chosenActivities: trip.activities,
    }),
    text: {
      format: {
        type: "json_schema",
        name: "itinerary",
        strict: true,
        schema: ITINERARY_SCHEMA,
      },
    },
  });
  return JSON.parse(response.output_text) as GeneratedItinerary;
}
