import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { updateRaindrop } from "../../lib/raindrop-client";

export const schema = {
  items: z
    .array(
      z.object({
        id: z.number().describe("Raindrop ID"),
        tags: z.array(z.string()).describe("Tags to apply to this raindrop"),
      })
    )
    .min(1)
    .max(50)
    .describe("Array of items with their tags to apply (max 50 items)"),
};

export const metadata: ToolMetadata = {
  name: "batch_apply_tags",
  description:
    "Apply tags to multiple raindrops in a single call. Each item can have different tags. " +
    "Use this after analyzing untagged items and generating tags for each. " +
    "This is more efficient than calling update_raindrop multiple times.",
  annotations: {
    title: "Batch Apply Tags",
    readOnlyHint: false,
    idempotentHint: false,
  },
};

export default async function batchApplyTags({
  items,
}: InferSchema<typeof schema>) {
  const results: Array<{
    id: number;
    success: boolean;
    tags?: string[];
    error?: string;
  }> = [];

  // Process items sequentially to avoid rate limiting
  for (const item of items) {
    try {
      await updateRaindrop(item.id, { tags: item.tags });
      results.push({
        id: item.id,
        success: true,
        tags: item.tags,
      });
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    structuredContent: {
      summary: {
        total: items.length,
        successful,
        failed,
      },
      results,
    },
  };
}
