import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getTags } from "../../lib/raindrop-client";
import { shapeTags } from "../../lib/response-shaper";

export const schema = {
  collectionId: z
    .number()
    .optional()
    .describe("Scope to a specific collection. Omit for all tags across the library."),
};

export const metadata: ToolMetadata = {
  name: "list_tags",
  description:
    "List all tags with their usage counts. " +
    "Useful for understanding tag vocabulary and finding popular tags.",
  annotations: {
    title: "List Tags",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function listTags({
  collectionId,
}: InferSchema<typeof schema>) {
  const response = await getTags(collectionId);
  const tags = shapeTags(response.items).sort((a, b) => b.count - a.count);

  return {
    tags,
    total: tags.length,
    collectionId: collectionId ?? "all",
  };
}
