import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getCollection } from "../../lib/raindrop-client";
import { shapeCollection } from "../../lib/response-shaper";
import type { FieldLevel } from "../../lib/types";

export const schema = {
  id: z.number().describe("The collection ID to fetch"),
  fields: z
    .enum(["minimal", "summary", "standard", "full"])
    .default("standard")
    .describe("Level of detail to return"),
};

export const metadata: ToolMetadata = {
  name: "get_collection",
  description:
    "Get details about a specific collection. " +
    "System collections: -1 (Unsorted), -99 (Trash), 0 (All raindrops).",
  annotations: {
    title: "Get Collection",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function getCollectionTool({
  id,
  fields,
}: InferSchema<typeof schema>) {
  const response = await getCollection(id);
  return shapeCollection(response.item, fields as FieldLevel);
}
