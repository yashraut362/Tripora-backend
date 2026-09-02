import type { FoodPlace } from "../models/food.js";
import { generateJson } from "./client.js";
import type { TripInfo } from "./client.js";

const FOOD_SCHEMA = {
  type: "object",
  properties: {
    places: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          kind: {
            type: "string",
            enum: [
              "Restaurant",
              "Cafe",
              "Bar",
              "Street food",
              "Market",
              "Dessert",
            ],
          },
          description: { type: "string" },
          mustTry: { type: "string" },
          mapsQuery: { type: "string" },
          lat: { type: "number" },
          lng: { type: "number" },
          tags: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "Must try",
                "Locals' favourite",
                "Michelin star",
                "Top rated",
                "Hidden gem",
                "Budget friendly",
              ],
            },
          },
        },
        required: [
          "name",
          "kind",
          "description",
          "mustTry",
          "mapsQuery",
          "lat",
          "lng",
          "tags",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["places"],
  additionalProperties: false,
};

const FOOD_INSTRUCTIONS = [
  "You are the food curator for Tripora, a friendly trip planning app.",
  "Recommend 8 to 12 real, well-loved places to eat and drink in or near the destination: a mix of restaurants, cafes, bars, street food and markets.",
  "name is the place's actual name and description is one warm sentence on why it is special.",
  "mustTry names the specific dish or drink to order there.",
  "mapsQuery is a concise Google Maps search for the place; never include the destination itself, it gets appended automatically.",
  "lat and lng are the place's approximate latitude and longitude as decimal numbers.",
  "tags carries one to three fitting labels; only use Michelin star when the place genuinely holds one, and use Top rated for widely acclaimed spots.",
  "Respect the trip's total budget and weight picks toward travelerWishes and the chosen activities when they mention food.",
].join(" ");

const FOOD_EDIT_SCHEMA = {
  type: "object",
  properties: {
    ...FOOD_SCHEMA.properties,
    note: { type: "string" },
  },
  required: [...FOOD_SCHEMA.required, "note"],
  additionalProperties: false,
};

const FOOD_EDIT_INSTRUCTIONS = [
  "You are the food guide editor for Tripora, a friendly trip planning app.",
  "The user gives you their trip, the current food guide, and a change request; return the full updated list of places.",
  "Apply only what the request asks for and keep every other place, coordinate and wording exactly as it is.",
  "Follow the same place rules: real specific places, mapsQuery without the destination, lat and lng as decimal numbers, one to three fitting tags with Michelin star only when genuinely held.",
  "note is one friendly sentence telling the user what you changed.",
].join(" ");

export function generateFoodGuide(
  trip: TripInfo,
): Promise<{ places: FoodPlace[] }> {
  return generateJson("food_guide", FOOD_SCHEMA, FOOD_INSTRUCTIONS, {
    destination: trip.destination,
    totalBudgetUsd: trip.budget,
    chosenActivities: trip.activities,
    travelerWishes: trip.notes,
  });
}

export function editFoodGuide(
  trip: TripInfo,
  current: { places: FoodPlace[] },
  message: string,
): Promise<{ places: FoodPlace[]; note: string }> {
  return generateJson(
    "food_guide_edit",
    FOOD_EDIT_SCHEMA,
    FOOD_EDIT_INSTRUCTIONS,
    {
      destination: trip.destination,
      totalBudgetUsd: trip.budget,
      chosenActivities: trip.activities,
      travelerWishes: trip.notes,
      currentFoodGuide: current,
      request: message,
    },
  );
}
