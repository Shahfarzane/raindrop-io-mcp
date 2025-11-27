import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getFilters } from "../../lib/raindrop-client";

export const schema = {
  collectionId: z
    .number()
    .describe("Collection ID to get filters for (use 0 for all raindrops)"),
};

export const metadata: ToolMetadata = {
  name: "get_filters",
  description:
    "Get filter statistics for a collection. " +
    "Returns counts for: broken links, duplicates, important items, untagged items, " +
    "plus breakdown by tags and content types.",
  annotations: {
    title: "Get Filters",
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export default async function getFiltersTool({
  collectionId,
}: InferSchema<typeof schema>) {
  const response = await getFilters(collectionId);

  return {
    broken: response.broken.count,
    duplicates: response.duplicates.count,
    important: response.important.count,
    untagged: response.notag.count,
    byTag: response.tags.map((t) => ({
      name: t._id,
      count: t.count,
    })),
    byType: response.types.map((t) => ({
      type: t._id,
      count: t.count,
    })),
  };
}
