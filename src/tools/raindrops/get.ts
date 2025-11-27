import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getRaindrop } from "../../lib/raindrop-client";
import { shapeRaindrop } from "../../lib/response-shaper";
import type { FieldLevel } from "../../lib/types";

export const schema = {
  id: z.number().describe("The raindrop ID to retrieve"),
  fields: z
    .enum(["summary", "standard", "full"])
    .default("standard")
    .describe("Level of detail: summary (basic), standard (+excerpt, tags), full (all including highlights, notes)"),
};

export const metadata: ToolMetadata = {
  name: "get_raindrop",
  description:
    "Get details of a single raindrop (bookmark) by ID. " +
    "Use 'full' fields to see highlights, notes, and all metadata.",
  annotations: {
    title: "Get Raindrop",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function getOneRaindrop({
  id,
  fields,
}: InferSchema<typeof schema>) {
  const response = await getRaindrop(id);
  const item = shapeRaindrop(response.item, fields as FieldLevel);

  return { item };
}
