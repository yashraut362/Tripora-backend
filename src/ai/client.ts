import OpenAI from "openai";

export interface TripInfo {
  destination: string;
  days: number;
  budget: number | null;
  activities: string[];
  notes: string;
}

const EDIT_TARGET_SCHEMA = {
  type: "object",
  properties: {
    target: { type: "string", enum: ["itinerary", "food"] },
  },
  required: ["target"],
  additionalProperties: false,
};

const EDIT_TARGET_INSTRUCTIONS = [
  "You route a traveler's change request to the right editor in Tripora, a trip planning app.",
  "itinerary covers the day-by-day plan: days, stops, sights, timing, pace and places to visit.",
  "food covers the food guide: restaurants, cafes, bars, street food, markets, dishes and drinks.",
  "Pick the single target the request is mostly about; when it is ambiguous, pick itinerary.",
].join(" ");

export async function editTarget(
  message: string,
): Promise<"itinerary" | "food"> {
  const result = await generateJson<{ target: "itinerary" | "food" }>(
    "edit_target",
    EDIT_TARGET_SCHEMA,
    EDIT_TARGET_INSTRUCTIONS,
    { request: message },
  );
  return result.target;
}

export async function generateJson<T>(
  name: string,
  schema: Record<string, unknown>,
  instructions: string,
  input: unknown,
): Promise<T> {
  const response = await new OpenAI().responses.create({
    model: "gpt-5-mini",
    instructions,
    input: JSON.stringify(input),
    text: {
      format: { type: "json_schema", name, strict: true, schema },
    },
  });
  return JSON.parse(response.output_text) as T;
}
