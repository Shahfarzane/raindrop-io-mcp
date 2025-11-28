import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { bulkUpdateRaindrops, getCollection } from "../../lib/raindrop-client";

export const schema = {
  targetCollectionId: z
    .number()
    .describe("ID of the collection to move raindrops into"),
  tags: z
    .array(z.string())
    .min(1)
    .max(20)
    .describe("Tags to search for - raindrops with ANY of these tags will be moved"),
  sourceCollectionId: z
    .number()
    .default(0)
    .describe("Source collection to search in (0 for all collections)"),
};

export const metadata: ToolMetadata = {
  name: "bulk_move_by_tag",
  description:
    "Move all raindrops with specific tags to a target collection. " +
    "Useful for organizing bookmarks after auto-tagging. " +
    "Searches by tag and moves matching items to the specified collection.",
  annotations: {
    title: "Bulk Move by Tag",
    readOnlyHint: false,
    idempotentHint: false,
  },
};

export default async function bulkMoveByTag({
  targetCollectionId,
  tags,
  sourceCollectionId,
}: InferSchema<typeof schema>) {
  // Verify target collection exists
  const targetCollection = await getCollection(targetCollectionId);

  const results: Array<{
    tag: string;
    movedCount: number;
    error?: string;
  }> = [];

  let totalMoved = 0;

  for (const tag of tags) {
    try {
      // Search for raindrops with this tag and move them
      const moveRes = await bulkUpdateRaindrops(
        sourceCollectionId,
        { collection: { $id: targetCollectionId } },
        `#"${tag}"`
      );

      const movedCount = moveRes.modified || 0;
      totalMoved += movedCount;

      results.push({
        tag,
        movedCount,
      });
    } catch (err) {
      results.push({
        tag,
        movedCount: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    structuredContent: {
      targetCollection: {
        id: targetCollection.item._id,
        title: targetCollection.item.title,
      },
      summary: {
        tagsProcessed: tags.length,
        totalMoved,
        errors: results.filter((r) => r.error).length,
      },
      results,
    },
  };
}
